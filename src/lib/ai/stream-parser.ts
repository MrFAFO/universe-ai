import type { StreamEvent } from "@/lib/ai/stream-protocol";

export type StreamParserErrorCode =
  | "malformed_json"
  | "unknown_type"
  | "invalid_payload"
  | "incomplete_line";

export interface StreamParserError {
  code: StreamParserErrorCode;
}

export type StreamParserPushResult =
  | { ok: true; events: StreamEvent[] }
  | { ok: false; error: StreamParserError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readUuid(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return undefined;
  }

  return value;
}

function readNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

function validateStreamEvent(value: unknown): StreamEvent | StreamParserError {
  if (!isRecord(value) || typeof value.type !== "string") {
    return { code: "unknown_type" };
  }

  if (value.type === "delta") {
    if (typeof value.text !== "string") {
      return { code: "invalid_payload" };
    }

    return { type: "delta", text: value.text };
  }

  if (value.type === "done") {
    const messageId = readUuid(value.messageId);
    const aiRunId = readUuid(value.aiRunId);
    const openaiResponseId = readNullableString(value.openaiResponseId);

    if (!messageId || !aiRunId || openaiResponseId === undefined) {
      return { code: "invalid_payload" };
    }

    return {
      type: "done",
      messageId,
      aiRunId,
      openaiResponseId,
    };
  }

  if (value.type === "error") {
    if (typeof value.message !== "string") {
      return { code: "invalid_payload" };
    }

    return { type: "error", message: value.message };
  }

  return { code: "unknown_type" };
}

function parseLine(line: string): StreamEvent | StreamParserError | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { code: "malformed_json" };
  }

  return validateStreamEvent(parsed);
}

export function createNdjsonStreamParser() {
  let buffer = "";

  const push = (chunk: string): StreamParserPushResult => {
    buffer += chunk;
    const events: StreamEvent[] = [];

    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      const parsed = parseLine(line);
      if (parsed === null) {
        continue;
      }

      if ("code" in parsed) {
        return { ok: false, error: parsed };
      }

      events.push(parsed);
    }

    return { ok: true, events };
  };

  const finish = (): StreamParserPushResult => {
    if (buffer.trim().length > 0) {
      return { ok: false, error: { code: "incomplete_line" } };
    }

    return { ok: true, events: [] };
  };

  return { push, finish };
}
