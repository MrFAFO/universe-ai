import { describe, expect, it } from "vitest";
import {
  encodeNdjsonBytes,
  encodeNdjsonLine,
  type StreamEvent,
} from "@/lib/ai/stream-protocol";

function parseNdjsonLines(input: string): StreamEvent[] {
  return input
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as StreamEvent);
}

describe("stream protocol encoding", () => {
  it("encodes one valid JSON object per line", () => {
    const delta = encodeNdjsonLine({ type: "delta", text: "Hello" });
    const done = encodeNdjsonLine({
      type: "done",
      messageId: "11111111-1111-4111-8111-111111111111",
      aiRunId: "22222222-2222-4222-8222-222222222222",
      openaiResponseId: "resp_123",
    });
    const error = encodeNdjsonLine({
      type: "error",
      message: "Unable to complete the assistant response. Please try again.",
    });

    expect(delta.endsWith("\n")).toBe(true);
    expect(done.endsWith("\n")).toBe(true);
    expect(error.endsWith("\n")).toBe(true);

    const events = parseNdjsonLines(`${delta}${done}${error}`);
    expect(events).toEqual([
      { type: "delta", text: "Hello" },
      {
        type: "done",
        messageId: "11111111-1111-4111-8111-111111111111",
        aiRunId: "22222222-2222-4222-8222-222222222222",
        openaiResponseId: "resp_123",
      },
      {
        type: "error",
        message: "Unable to complete the assistant response. Please try again.",
      },
    ]);
  });

  it("encodes bytes that decode to a single NDJSON line", () => {
    const bytes = encodeNdjsonBytes({ type: "delta", text: "chunk" });
    const decoded = new TextDecoder().decode(bytes);
    expect(JSON.parse(decoded.trimEnd())).toEqual({
      type: "delta",
      text: "chunk",
    });
  });
});
