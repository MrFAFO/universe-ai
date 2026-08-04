import "server-only";

import type { ResponseInput } from "openai/resources/responses/responses";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { PlanningContextUnavailableError } from "@/lib/ai/ancestor-context";
import {
  PUBLIC_CHAT_STREAM_ERROR_MESSAGE,
  encodeNdjsonBytes,
} from "@/lib/ai/stream-protocol";
import { DatabaseError } from "@/lib/db/errors";
import type { DbMessage } from "@/types/db";

export const MAX_OUTPUT_TOKENS = 2048;

type ConsumerLifecycle = "writable" | "cancelled" | "closed";

export interface PlanningChatStreamRequest {
  conversationId: string;
  content: string;
  signal?: AbortSignal;
  prepareInputAfterUserInsert: () => Promise<ResponseInput>;
}

export interface PlanningChatStreamDeps {
  insertUserMessage(conversationId: string, content: string): Promise<DbMessage>;
  insertAssistantMessage(
    conversationId: string,
    content: string,
    aiRunId: string,
  ): Promise<DbMessage>;
  createAiRun(conversationId: string, model: string): Promise<{ id: string }>;
  completeAiRun(
    aiRunId: string,
    input: {
      openaiResponseId: string | null;
      inputTokens: number | null;
      outputTokens: number | null;
    },
  ): Promise<void>;
  failAiRun(aiRunId: string, errorSummary: string): Promise<void>;
  getModel(): string;
  createResponseStream(
    params: {
      model: string;
      input: ResponseInput;
      maxOutputTokens: number;
    },
    options: { signal?: AbortSignal },
  ): Promise<AsyncIterable<ResponseStreamEvent>>;
}

function isSafePrepareInputError(error: unknown): boolean {
  return (
    error instanceof DatabaseError ||
    error instanceof PlanningContextUnavailableError
  );
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function combineAbortSignals(
  externalSignal: AbortSignal | undefined,
  providerSignal: AbortSignal,
): AbortSignal {
  if (!externalSignal) {
    return providerSignal;
  }

  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([externalSignal, providerSignal]);
  }

  const combined = new AbortController();
  const abortCombined = () => {
    if (!combined.signal.aborted) {
      combined.abort();
    }
  };

  if (externalSignal.aborted) {
    abortCombined();
  } else {
    externalSignal.addEventListener("abort", abortCombined, { once: true });
  }

  if (providerSignal.aborted) {
    abortCombined();
  } else {
    providerSignal.addEventListener("abort", abortCombined, { once: true });
  }

  return combined.signal;
}

function createErrorOnlyStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encodeNdjsonBytes({
          type: "error",
          message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE,
        }),
      );
      controller.close();
    },
  });
}

export async function createPlanningChatStream(
  request: PlanningChatStreamRequest,
  deps: PlanningChatStreamDeps,
): Promise<ReadableStream<Uint8Array>> {
  await deps.insertUserMessage(request.conversationId, request.content);

  let input: ResponseInput;

  try {
    input = await request.prepareInputAfterUserInsert();
  } catch (error) {
    if (isSafePrepareInputError(error)) {
      return createErrorOnlyStream();
    }

    throw error;
  }

  const model = deps.getModel();
  const aiRun = await deps.createAiRun(request.conversationId, model);

  const runState = { finalized: false };
  const consumerState = { lifecycle: "writable" as ConsumerLifecycle };
  const providerAbortController = new AbortController();
  const providerSignal = combineAbortSignals(
    request.signal,
    providerAbortController.signal,
  );
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  let finalizePromise: Promise<void> | null = null;

  const isConsumerWritable = () => consumerState.lifecycle === "writable";

  const markConsumerClosed = () => {
    if (consumerState.lifecycle === "writable") {
      consumerState.lifecycle = "closed";
    }
  };

  const markConsumerCancelled = () => {
    if (consumerState.lifecycle === "writable") {
      consumerState.lifecycle = "cancelled";
    }
  };

  const enqueueToConsumer = (bytes: Uint8Array): boolean => {
    if (!isConsumerWritable() || !controllerRef) {
      return false;
    }

    try {
      controllerRef.enqueue(bytes);
      return true;
    } catch {
      markConsumerClosed();
      return false;
    }
  };

  const closeConsumer = () => {
    if (!isConsumerWritable() || !controllerRef) {
      return;
    }

    markConsumerClosed();
    try {
      controllerRef.close();
    } catch {
      // Consumer may already have cancelled or closed the stream.
    }
  };

  const emitConsumerError = () => {
    if (!isConsumerWritable()) {
      return;
    }

    enqueueToConsumer(
      encodeNdjsonBytes({
        type: "error",
        message: PUBLIC_CHAT_STREAM_ERROR_MESSAGE,
      }),
    );
    closeConsumer();
  };

  const finalizeFailure = (
    summary: string,
    options: { notifyConsumer: boolean },
  ): Promise<void> => {
    if (finalizePromise) {
      return finalizePromise;
    }

    finalizePromise = (async () => {
      if (runState.finalized) {
        return;
      }

      runState.finalized = true;

      try {
        await deps.failAiRun(aiRun.id, summary);
      } catch {
        if (options.notifyConsumer) {
          closeConsumer();
        }
        return;
      }

      if (options.notifyConsumer) {
        emitConsumerError();
      }
    })();

    return finalizePromise;
  };

  return new ReadableStream<Uint8Array>({
    start: async (controller) => {
      controllerRef = controller;
      let assistantText = "";
      let completedResponseId: string | null = null;
      let inputTokens: number | null = null;
      let outputTokens: number | null = null;
      let sawCompletedEvent = false;

      const safeComplete = async () => {
        if (runState.finalized || !isConsumerWritable()) {
          return;
        }

        let assistantMessage;
        try {
          assistantMessage = await deps.insertAssistantMessage(
            request.conversationId,
            assistantText,
            aiRun.id,
          );

          await deps.completeAiRun(aiRun.id, {
            openaiResponseId: completedResponseId,
            inputTokens,
            outputTokens,
          });
        } catch (error) {
          const summary =
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unable to persist assistant response.";
          await finalizeFailure(summary, { notifyConsumer: true });
          return;
        }

        if (runState.finalized || !isConsumerWritable()) {
          return;
        }

        runState.finalized = true;
        enqueueToConsumer(
          encodeNdjsonBytes({
            type: "done",
            messageId: assistantMessage.id,
            aiRunId: aiRun.id,
            openaiResponseId: completedResponseId,
          }),
        );
        closeConsumer();
      };

      try {
        if (providerSignal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        const stream = await deps.createResponseStream(
          {
            model,
            input,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          },
          { signal: providerSignal },
        );

        for await (const event of stream) {
          if (!isConsumerWritable() || providerSignal.aborted) {
            break;
          }

          if (event.type === "response.output_text.delta") {
            assistantText += event.delta;
            if (
              !enqueueToConsumer(
                encodeNdjsonBytes({ type: "delta", text: event.delta }),
              )
            ) {
              break;
            }
            continue;
          }

          if (event.type === "response.completed") {
            sawCompletedEvent = true;
            completedResponseId = event.response.id;
            inputTokens = event.response.usage?.input_tokens ?? null;
            outputTokens = event.response.usage?.output_tokens ?? null;
            if (event.response.output_text) {
              assistantText = event.response.output_text;
            }
            continue;
          }

          if (
            event.type === "response.failed" ||
            event.type === "response.incomplete"
          ) {
            throw new Error("OpenAI response did not complete successfully.");
          }
        }

        if (!isConsumerWritable()) {
          return;
        }

        if (providerSignal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        if (!sawCompletedEvent) {
          throw new Error("OpenAI response stream ended without completion.");
        }

        await safeComplete();
      } catch (error) {
        if (runState.finalized) {
          return;
        }

        if (isAbortError(error)) {
          await finalizeFailure("Request aborted.", { notifyConsumer: true });
          return;
        }

        await finalizeFailure(
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Unknown streaming failure.",
          { notifyConsumer: true },
        );
      }
    },
    cancel: () => {
      markConsumerCancelled();
      providerAbortController.abort();
      return finalizeFailure("Stream cancelled.", { notifyConsumer: false });
    },
  });
}
