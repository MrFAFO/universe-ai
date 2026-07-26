"use client";

import { ArrowLeft, Loader2, SendHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { BranchSuggestionDto } from "@/lib/ai/branch-suggestion-api";
import { parsePostBranchSuggestionResponse } from "@/lib/ai/branch-suggestion-api";
import {
  buildBranchSuggestionsApiUrl,
  readBranchSuggestionApiErrorMessage,
  SAFE_BRANCH_SUGGESTIONS_GENERATE_ERROR_MESSAGE,
  SAFE_BRANCH_SUGGESTIONS_RESPONSE_ERROR_MESSAGE,
} from "@/lib/ai/branch-suggestions-client";
import { PUBLIC_CHAT_STREAM_ERROR_MESSAGE } from "@/lib/ai/stream-protocol";
import { createNdjsonStreamParser } from "@/lib/ai/stream-parser";
import {
  appendRootPlanningMessageDeduped,
  type RootPlanningChatMessage,
} from "@/lib/chat/root-planning-messages";
import { buildRootPlanningTimeline } from "@/lib/chat/root-planning-timeline";
import { BranchSuggestionCard } from "@/components/chat/BranchSuggestionCard";

export type { RootPlanningChatMessage } from "@/lib/chat/root-planning-messages";

const MAX_MESSAGE_LENGTH = 10_000;
const SAFE_REQUEST_ERROR_MESSAGE =
  "Unable to send your message right now. Please try again.";

export interface RootPlanningChatProps {
  worldId: string;
  worldName: string;
  nodeId: string;
  nodeTitle: string;
  initialMessages: RootPlanningChatMessage[];
  initialSuggestion: BranchSuggestionDto | null;
}

function createTempId(prefix: "user" | "assistant"): string {
  return `temp-${prefix}-${crypto.randomUUID()}`;
}

export function RootPlanningChat({
  worldId,
  worldName,
  nodeId,
  nodeTitle,
  initialMessages,
  initialSuggestion,
}: RootPlanningChatProps) {
  const router = useRouter();
  const composerId = useId();
  const [messages, setMessages] =
    useState<RootPlanningChatMessage[]>(initialMessages);
  const [suggestion, setSuggestion] = useState(initialSuggestion);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const generateAbortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);
  const isGeneratingRef = useRef(false);
  const generateRequestIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const timeline = useMemo(
    () => buildRootPlanningTimeline(messages, suggestion),
    [messages, suggestion],
  );

  useEffect(() => {
    if (!isStreamingRef.current) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!isGeneratingRef.current) {
      setSuggestion(initialSuggestion);
    }
  }, [initialSuggestion]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline, isStreaming, isGenerating]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      generateAbortControllerRef.current?.abort();
      generateAbortControllerRef.current = null;
    };
  }, []);

  const handleStreamFailure = useCallback(
    (assistantTempId: string, errorMessage: string) => {
      setRequestError(errorMessage);
      setMessages((current) =>
        current
          .map((message) => {
            if (message.id !== assistantTempId) {
              return message;
            }

            if (!message.content.trim()) {
              return null;
            }

            return { ...message, status: "failed" as const };
          })
          .filter((message): message is RootPlanningChatMessage => message !== null),
      );
      router.refresh();
    },
    [router],
  );

  const handleGenerate = useCallback(async () => {
    if (isGeneratingRef.current || isStreamingRef.current) {
      return;
    }

    const requestId = ++generateRequestIdRef.current;
    const controller = new AbortController();
    const apiUrl = buildBranchSuggestionsApiUrl(worldId, nodeId);

    generateAbortControllerRef.current?.abort();
    generateAbortControllerRef.current = controller;
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        signal: controller.signal,
      });

      if (requestId !== generateRequestIdRef.current) {
        return;
      }

      if (!response.ok) {
        setGenerateError(
          await readBranchSuggestionApiErrorMessage(
            response,
            SAFE_BRANCH_SUGGESTIONS_GENERATE_ERROR_MESSAGE,
          ),
        );
        return;
      }

      const raw: unknown = await response.json();

      let parsed;
      try {
        parsed = parsePostBranchSuggestionResponse(raw);
      } catch {
        setGenerateError(SAFE_BRANCH_SUGGESTIONS_RESPONSE_ERROR_MESSAGE);
        return;
      }

      if (requestId !== generateRequestIdRef.current) {
        return;
      }

      if (parsed.outcome === "proposal") {
        setSuggestion(parsed.suggestion);
      } else {
        setMessages((current) =>
          appendRootPlanningMessageDeduped(current, {
            id: parsed.message.id,
            role: "assistant",
            content: parsed.message.content,
            status: "complete",
            createdAt: parsed.message.createdAt,
          }),
        );
      }

      router.refresh();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (requestId !== generateRequestIdRef.current) {
        return;
      }

      setGenerateError(SAFE_BRANCH_SUGGESTIONS_GENERATE_ERROR_MESSAGE);
    } finally {
      if (requestId === generateRequestIdRef.current) {
        isGeneratingRef.current = false;
        setIsGenerating(false);
      }

      if (generateAbortControllerRef.current === controller) {
        generateAbortControllerRef.current = null;
      }
    }
  }, [nodeId, router, worldId]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || isStreamingRef.current || isGeneratingRef.current) {
      return;
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      setRequestError(
        `Messages must be ${MAX_MESSAGE_LENGTH.toLocaleString()} characters or fewer.`,
      );
      return;
    }

    const now = new Date().toISOString();
    const userTempId = createTempId("user");
    const assistantTempId = createTempId("assistant");
    const abortController = new AbortController();

    abortControllerRef.current?.abort();
    abortControllerRef.current = abortController;
    isStreamingRef.current = true;
    setIsStreaming(true);
    setRequestError(null);
    setInput("");

    setMessages((current) => [
      ...current,
      {
        id: userTempId,
        role: "user",
        content,
        status: "complete",
        createdAt: now,
      },
      {
        id: assistantTempId,
        role: "assistant",
        content: "",
        status: "streaming",
        createdAt: now,
      },
    ]);

    let sawTerminalEvent = false;

    try {
      const response = await fetch(
        `/api/worlds/${worldId}/nodes/${nodeId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        setMessages((current) =>
          current.filter(
            (message) =>
              message.id !== assistantTempId && message.id !== userTempId,
          ),
        );
        setRequestError(SAFE_REQUEST_ERROR_MESSAGE);
        router.refresh();
        return;
      }

      if (!response.body) {
        handleStreamFailure(assistantTempId, SAFE_REQUEST_ERROR_MESSAGE);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createNdjsonStreamParser();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunkResult = parser.push(decoder.decode(value, { stream: true }));
        if (!chunkResult.ok) {
          handleStreamFailure(
            assistantTempId,
            PUBLIC_CHAT_STREAM_ERROR_MESSAGE,
          );
          return;
        }

        for (const event of chunkResult.events) {
          if (event.type === "delta") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantTempId
                  ? { ...message, content: message.content + event.text }
                  : message,
              ),
            );
            continue;
          }

          if (event.type === "error") {
            sawTerminalEvent = true;
            handleStreamFailure(
              assistantTempId,
              PUBLIC_CHAT_STREAM_ERROR_MESSAGE,
            );
            return;
          }

          if (event.type === "done") {
            sawTerminalEvent = true;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantTempId
                  ? { ...message, status: "complete" }
                  : message,
              ),
            );
            router.refresh();
            return;
          }
        }
      }

      const trailing = decoder.decode();
      if (trailing.length > 0) {
        const trailingResult = parser.push(trailing);
        if (!trailingResult.ok) {
          handleStreamFailure(
            assistantTempId,
            PUBLIC_CHAT_STREAM_ERROR_MESSAGE,
          );
          return;
        }

        for (const event of trailingResult.events) {
          if (event.type === "delta") {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantTempId
                  ? { ...message, content: message.content + event.text }
                  : message,
              ),
            );
            continue;
          }

          if (event.type === "error") {
            sawTerminalEvent = true;
            handleStreamFailure(
              assistantTempId,
              PUBLIC_CHAT_STREAM_ERROR_MESSAGE,
            );
            return;
          }

          if (event.type === "done") {
            sawTerminalEvent = true;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantTempId
                  ? { ...message, status: "complete" }
                  : message,
              ),
            );
            router.refresh();
            return;
          }
        }
      }

      const finishResult = parser.finish();
      if (!finishResult.ok || !sawTerminalEvent) {
        handleStreamFailure(assistantTempId, PUBLIC_CHAT_STREAM_ERROR_MESSAGE);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessages((current) =>
          current
            .map((message) => {
              if (message.id === assistantTempId && !message.content.trim()) {
                return null;
              }

              if (message.id === assistantTempId) {
                return { ...message, status: "failed" as const };
              }

              return message;
            })
            .filter(
              (message): message is RootPlanningChatMessage => message !== null,
            ),
        );
        return;
      }

      handleStreamFailure(assistantTempId, SAFE_REQUEST_ERROR_MESSAGE);
    } finally {
      isStreamingRef.current = false;
      setIsStreaming(false);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [handleStreamFailure, input, nodeId, router, worldId]);

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const canSend =
    input.trim().length > 0 &&
    input.trim().length <= MAX_MESSAGE_LENGTH &&
    !isStreaming &&
    !isGenerating;

  const canGenerate = !isStreaming && !isGenerating;
  const showEmptyState = timeline.length === 0;

  return (
    <div className="root-planning-chat">
      <header className="root-planning-chat__header">
        <div className="root-planning-chat__header-top">
          <Link href={`/worlds/${worldId}`} className="root-planning-chat__back">
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            Back to World Map
          </Link>

          <button
            type="button"
            className="root-planning-chat__generate"
            onClick={() => {
              void handleGenerate();
            }}
            disabled={!canGenerate}
            aria-busy={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Sparkles className="size-4" strokeWidth={1.75} />
            )}
            {suggestion ? "Regenerate Structure" : "Generate World Structure"}
          </button>
        </div>

        <div className="root-planning-chat__heading">
          <p className="root-planning-chat__eyebrow">{worldName}</p>
          <h1 className="root-planning-chat__title">{nodeTitle}</h1>
          <p className="root-planning-chat__subtitle">Root Planning</p>
        </div>

        {isGenerating ? (
          <p
            className="root-planning-chat__generation-status"
            aria-live="polite"
          >
            Generating world structure…
          </p>
        ) : null}

        {generateError ? (
          <p className="root-planning-chat__generation-error" role="alert">
            {generateError}
          </p>
        ) : null}
      </header>

      <div
        className="root-planning-chat__messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Planning conversation"
      >
        {showEmptyState ? (
          <p className="root-planning-chat__empty">
            Start the root planning conversation for this world.
          </p>
        ) : (
          timeline.map((item) => {
            if (item.type === "suggestion") {
              return (
                <div
                  key={`suggestion-${item.suggestion.id}`}
                  className="root-planning-chat__timeline-item root-planning-chat__timeline-item--suggestion"
                >
                  <BranchSuggestionCard suggestion={item.suggestion} />
                </div>
              );
            }

            return (
              <article
                key={item.id}
                className={`root-planning-chat__message root-planning-chat__message--${item.role}${
                  item.status === "failed"
                    ? " root-planning-chat__message--failed"
                    : ""
                }`}
              >
                <p className="root-planning-chat__message-label">
                  {item.role === "user" ? "You" : "Assistant"}
                </p>
                <div className="root-planning-chat__message-body">
                  {item.content.length > 0 ? (
                    <p className="root-planning-chat__message-text">
                      {item.content}
                    </p>
                  ) : item.status === "streaming" ? (
                    <p className="root-planning-chat__message-placeholder">
                      Composing response…
                    </p>
                  ) : null}
                </div>
                {item.status === "failed" ? (
                  <p className="root-planning-chat__message-error" role="alert">
                    Response incomplete. This answer was not saved.
                  </p>
                ) : null}
              </article>
            );
          })
        )}
        {isStreaming ? (
          <div className="root-planning-chat__streaming" aria-hidden="true">
            <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
            <span>Assistant is responding</span>
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="root-planning-chat__composer"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
      >
        {requestError ? (
          <p className="root-planning-chat__request-error" role="alert">
            {requestError}
          </p>
        ) : null}
        <label className="sr-only" htmlFor={composerId}>
          Message for root planning
        </label>
        <textarea
          id={composerId}
          className="root-planning-chat__textarea"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="Describe the world you want to plan…"
          rows={4}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={isStreaming || isGenerating}
          aria-describedby={`${composerId}-hint`}
        />
        <div className="root-planning-chat__composer-footer">
          <p
            id={`${composerId}-hint`}
            className="root-planning-chat__composer-hint"
          >
            Press Enter to send, Shift+Enter for a new line.
          </p>
          <button
            type="submit"
            className="root-planning-chat__send"
            disabled={!canSend}
            aria-label="Send message"
          >
            <SendHorizontal className="size-4" strokeWidth={1.75} />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
