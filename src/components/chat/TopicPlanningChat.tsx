"use client";

import { ArrowLeft, Loader2, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { PUBLIC_CHAT_STREAM_ERROR_MESSAGE } from "@/lib/ai/stream-protocol";
import { createNdjsonStreamParser } from "@/lib/ai/stream-parser";
import {
  type RootPlanningChatMessage,
} from "@/lib/chat/root-planning-messages";

const MAX_MESSAGE_LENGTH = 10_000;
const SAFE_REQUEST_ERROR_MESSAGE =
  "Unable to send your message right now. Please try again.";

export interface TopicPlanningChatProps {
  worldId: string;
  nodeId: string;
  worldName: string;
  topicTitle: string;
  topicGoal: string;
  breadcrumbTitles: string[];
  initialMessages: RootPlanningChatMessage[];
  planningBlocked: boolean;
  blockedMessage: string | null;
}

function createTempId(prefix: "user" | "assistant"): string {
  return `temp-${prefix}-${crypto.randomUUID()}`;
}

export function TopicPlanningChat({
  worldId,
  nodeId,
  worldName,
  topicTitle,
  topicGoal,
  breadcrumbTitles,
  initialMessages,
  planningBlocked,
  blockedMessage,
}: TopicPlanningChatProps) {
  const router = useRouter();
  const composerId = useId();
  const [messages, setMessages] =
    useState<RootPlanningChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStreamingRef.current) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const endStreamingGuard = useCallback(() => {
    isStreamingRef.current = false;
    setIsStreaming(false);
  }, []);

  const handleStreamFailure = useCallback(
    (assistantTempId: string, errorMessage: string) => {
      endStreamingGuard();
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
    [endStreamingGuard, router],
  );

  const finalizeDone = useCallback(
    (assistantTempId: string, messageId: string) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantTempId
            ? {
                ...message,
                id: messageId,
                status: "complete" as const,
              }
            : message,
        ),
      );
      endStreamingGuard();
      router.refresh();
    },
    [endStreamingGuard, router],
  );

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (
      !content ||
      isStreamingRef.current ||
      planningBlocked
    ) {
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
        endStreamingGuard();
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
            finalizeDone(assistantTempId, event.messageId);
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
            finalizeDone(assistantTempId, event.messageId);
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
  }, [endStreamingGuard, finalizeDone, handleStreamFailure, input, nodeId, planningBlocked, router, worldId]);

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const breadcrumbText =
    breadcrumbTitles.length > 0 ? breadcrumbTitles.join(" > ") : null;
  const canSend =
    input.trim().length > 0 &&
    input.trim().length <= MAX_MESSAGE_LENGTH &&
    !isStreaming &&
    !planningBlocked;
  const showEmptyState = messages.length === 0;

  return (
    <div className="root-planning-chat">
      <header className="root-planning-chat__header">
        <div className="root-planning-chat__header-top">
          <Link href={`/worlds/${worldId}`} className="root-planning-chat__back">
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            Back to World Map
          </Link>
        </div>

        <div className="root-planning-chat__heading">
          <p className="root-planning-chat__eyebrow">{worldName}</p>
          {breadcrumbText ? (
            <p className="root-planning-chat__generation-status">{breadcrumbText}</p>
          ) : null}
          <h1 className="root-planning-chat__title">{topicTitle}</h1>
          {topicGoal.length > 0 ? (
            <p className="root-planning-chat__generation-status">{topicGoal}</p>
          ) : null}
          <p className="root-planning-chat__subtitle">Topic Planning</p>
        </div>

        {planningBlocked && blockedMessage ? (
          <p className="root-planning-chat__generation-error" role="alert">
            {blockedMessage}
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
            Start the topic planning conversation for this node.
          </p>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={`root-planning-chat__message root-planning-chat__message--${message.role}${
                message.status === "failed"
                  ? " root-planning-chat__message--failed"
                  : ""
              }`}
            >
              <p className="root-planning-chat__message-label">
                {message.role === "user" ? "You" : "Assistant"}
              </p>
              <div className="root-planning-chat__message-body">
                {message.content.length > 0 ? (
                  <p className="root-planning-chat__message-text">
                    {message.content}
                  </p>
                ) : message.status === "streaming" ? (
                  <p className="root-planning-chat__message-placeholder">
                    Composing response...
                  </p>
                ) : null}
              </div>
              {message.status === "failed" ? (
                <p className="root-planning-chat__message-error" role="alert">
                  Response incomplete. This answer was not saved.
                </p>
              ) : null}
            </article>
          ))
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
          Message for topic planning
        </label>
        <textarea
          id={composerId}
          className="root-planning-chat__textarea"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="Describe what you want to plan for this topic..."
          rows={4}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={isStreaming || planningBlocked}
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
