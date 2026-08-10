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
  beginPlanningChatAiRun(input: {
    conversationId: string;
    model: string;
  }): Promise<{ id: string }>;
  insertUserMessage(conversationId: string, content: string): Promise<DbMessage>;
  completePlanningChatRun(input: {
    aiRunId: string;
    conversationId: string;
    content: string;
    openaiResponseId: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
  }): Promise<{ messageId: string }>;
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

function summarizeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message.slice(0, 500) : fallback;
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
  const model = deps.getModel();
  const aiRun = await deps.beginPlanningChatAiRun({
    conversationId: request.conversationId,
    model,
  });

  const failAcquiredRun = async (summary: string): Promise<void> => {
    try {
      await deps.failAiRun(aiRun.id, summary);
    } catch {
      // Best-effort cleanup for an acquired run.
    }
  };

  try {
    await deps.insertUserMessage(request.conversationId, request.content);
  } catch (error) {
    await failAcquiredRun(
      summarizeError(error, "Unable to persist user message."),
    );
    throw error;
  }

  let input: ResponseInput;

  try {
    input = await request.prepareInputAfterUserInsert();
  } catch (error) {
    const summary = summarizeError(error, "Unable to prepare planning input.");

    if (isSafePrepareInputError(error)) {
      await failAcquiredRun(summary);
      return createErrorOnlyStream();
    }

    await failAcquiredRun(summary);
    throw error;
  }

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

        let messageId: string;
        try {
          const result = await deps.completePlanningChatRun({
            aiRunId: aiRun.id,
            conversationId: request.conversationId,
            content: assistantText,
            openaiResponseId: completedResponseId,
            inputTokens,
            outputTokens,
          });
          messageId = result.messageId;
        } catch (error) {
          await finalizeFailure(
            summarizeError(error, "Unable to persist assistant response."),
            { notifyConsumer: true },
          );
          return;
        }

        if (runState.finalized || !isConsumerWritable()) {
          return;
        }

        runState.finalized = true;
        enqueueToConsumer(
          encodeNdjsonBytes({
            type: "done",
            messageId,
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
          summarizeError(error, "Unknown streaming failure."),
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
