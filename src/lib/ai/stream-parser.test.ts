import { describe, expect, it } from "vitest";
import { createNdjsonStreamParser } from "@/lib/ai/stream-parser";

const messageId = "11111111-1111-4111-8111-111111111111";
const aiRunId = "22222222-2222-4222-8222-222222222222";

describe("createNdjsonStreamParser", () => {
  it("parses one event split across multiple chunks", () => {
    const parser = createNdjsonStreamParser();

    expect(parser.push('{"type":"delta","tex')).toEqual({ ok: true, events: [] });
    expect(parser.push('t":"Hel')).toEqual({ ok: true, events: [] });
    expect(parser.push('lo"}\n')).toEqual({
      ok: true,
      events: [{ type: "delta", text: "Hello" }],
    });
    expect(parser.finish()).toEqual({ ok: true, events: [] });
  });

  it("parses multiple events in one chunk in order", () => {
    const parser = createNdjsonStreamParser();
    const chunk =
      '{"type":"delta","text":"A"}\n' +
      '{"type":"delta","text":"B"}\n' +
      `{"type":"done","messageId":"${messageId}","aiRunId":"${aiRunId}","openaiResponseId":"resp_1"}\n`;

    expect(parser.push(chunk)).toEqual({
      ok: true,
      events: [
        { type: "delta", text: "A" },
        { type: "delta", text: "B" },
        {
          type: "done",
          messageId,
          aiRunId,
          openaiResponseId: "resp_1",
        },
      ],
    });
  });

  it("ignores blank lines", () => {
    const parser = createNdjsonStreamParser();

    expect(parser.push('\n{"type":"delta","text":"Hi"}\n\n')).toEqual({
      ok: true,
      events: [{ type: "delta", text: "Hi" }],
    });
  });

  it("rejects malformed JSON", () => {
    const parser = createNdjsonStreamParser();

    expect(parser.push("{not-json}\n")).toEqual({
      ok: false,
      error: { code: "malformed_json" },
    });
  });

  it("rejects unknown event types", () => {
    const parser = createNdjsonStreamParser();

    expect(parser.push('{"type":"ping"}\n')).toEqual({
      ok: false,
      error: { code: "unknown_type" },
    });
  });

  it("rejects invalid delta payloads", () => {
    const parser = createNdjsonStreamParser();

    expect(parser.push('{"type":"delta","text":1}\n')).toEqual({
      ok: false,
      error: { code: "invalid_payload" },
    });
  });

  it("rejects an incomplete final line at stream completion", () => {
    const parser = createNdjsonStreamParser();

    expect(parser.push('{"type":"delta","text":"Part"')).toEqual({
      ok: true,
      events: [],
    });
    expect(parser.finish()).toEqual({
      ok: false,
      error: { code: "incomplete_line" },
    });
  });

  it("returns events in the order they were received", () => {
    const parser = createNdjsonStreamParser();

    expect(parser.push('{"type":"delta","text":"1"}\n')).toEqual({
      ok: true,
      events: [{ type: "delta", text: "1" }],
    });
    expect(parser.push('{"type":"delta","text":"2"}\n')).toEqual({
      ok: true,
      events: [{ type: "delta", text: "2" }],
    });
    expect(parser.finish()).toEqual({ ok: true, events: [] });
  });

  it("parses a valid done event with metadata", () => {
    const parser = createNdjsonStreamParser();

    expect(
      parser.push(
        `{"type":"done","messageId":"${messageId}","aiRunId":"${aiRunId}","openaiResponseId":"resp_123"}\n`,
      ),
    ).toEqual({
      ok: true,
      events: [
        {
          type: "done",
          messageId,
          aiRunId,
          openaiResponseId: "resp_123",
        },
      ],
    });
  });

  it("parses a valid done event with null openaiResponseId", () => {
    const parser = createNdjsonStreamParser();

    expect(
      parser.push(
        `{"type":"done","messageId":"${messageId}","aiRunId":"${aiRunId}","openaiResponseId":null}\n`,
      ),
    ).toEqual({
      ok: true,
      events: [
        {
          type: "done",
          messageId,
          aiRunId,
          openaiResponseId: null,
        },
      ],
    });
  });

  it("rejects done events with an invalid messageId type", () => {
    const parser = createNdjsonStreamParser();

    expect(
      parser.push(
        `{"type":"done","messageId":123,"aiRunId":"${aiRunId}","openaiResponseId":null}\n`,
      ),
    ).toEqual({
      ok: false,
      error: { code: "invalid_payload" },
    });
  });

  it("rejects done events with an invalid aiRunId type", () => {
    const parser = createNdjsonStreamParser();

    expect(
      parser.push(
        `{"type":"done","messageId":"${messageId}","aiRunId":false,"openaiResponseId":null}\n`,
      ),
    ).toEqual({
      ok: false,
      error: { code: "invalid_payload" },
    });
  });

  it("rejects done events with an invalid openaiResponseId type", () => {
    const parser = createNdjsonStreamParser();

    expect(
      parser.push(
        `{"type":"done","messageId":"${messageId}","aiRunId":"${aiRunId}","openaiResponseId":123}\n`,
      ),
    ).toEqual({
      ok: false,
      error: { code: "invalid_payload" },
    });
  });
});
