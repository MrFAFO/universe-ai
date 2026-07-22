export type StreamDeltaEvent = {
  type: "delta";
  text: string;
};

export type StreamDoneEvent = {
  type: "done";
  messageId: string;
  aiRunId: string;
  openaiResponseId: string | null;
};

export type StreamErrorEvent = {
  type: "error";
  message: string;
};

export type StreamEvent = StreamDeltaEvent | StreamDoneEvent | StreamErrorEvent;

export const PUBLIC_CHAT_STREAM_ERROR_MESSAGE =
  "Unable to complete the assistant response. Please try again.";

export function encodeNdjsonLine(event: StreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function encodeNdjsonBytes(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(encodeNdjsonLine(event));
}
