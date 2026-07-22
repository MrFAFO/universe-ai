import type { EasyInputMessage, ResponseInput } from "openai/resources/responses/responses";
import type { DbMessage } from "@/types/db";

export const MAX_NON_SYSTEM_MESSAGES = 40;

export class ToolMessageNotSupportedError extends Error {
  constructor(messageId?: string) {
    super(
      messageId
        ? `Tool messages are not supported in Stage C chat (message ${messageId}).`
        : "Tool messages are not supported in Stage C chat.",
    );
    this.name = "ToolMessageNotSupportedError";
  }
}

export class SystemMessageCountError extends Error {
  constructor(count: number) {
    super(
      count === 0
        ? "Exactly one persisted system message is required, but none was found."
        : `Exactly one persisted system message is required, but ${count} were found.`,
    );
    this.name = "SystemMessageCountError";
  }
}

function sortMessagesByOrdinal(messages: DbMessage[]): DbMessage[] {
  return [...messages].sort((left, right) => left.ordinal - right.ordinal);
}

function selectMessagesForInput(messages: DbMessage[]): DbMessage[] {
  const sorted = sortMessagesByOrdinal(messages);

  for (const message of sorted) {
    if (message.role === "tool") {
      throw new ToolMessageNotSupportedError(message.id);
    }
  }

  const systemMessages = sorted.filter((message) => message.role === "system");
  if (systemMessages.length !== 1) {
    throw new SystemMessageCountError(systemMessages.length);
  }

  const nonSystemMessages = sorted.filter((message) => message.role !== "system");
  const retainedNonSystem =
    nonSystemMessages.length > MAX_NON_SYSTEM_MESSAGES
      ? nonSystemMessages.slice(-MAX_NON_SYSTEM_MESSAGES)
      : nonSystemMessages;
  const retainedNonSystemIds = new Set(retainedNonSystem.map((message) => message.id));

  return sorted.filter(
    (message) =>
      message.role === "system" || retainedNonSystemIds.has(message.id),
  );
}

function mapMessageToInputItem(message: DbMessage): EasyInputMessage {
  if (
    message.role === "system" ||
    message.role === "user" ||
    message.role === "assistant"
  ) {
    return {
      role: message.role,
      content: message.content,
    };
  }

  throw new ToolMessageNotSupportedError(message.id);
}

export function buildResponsesInput(messages: DbMessage[]): ResponseInput {
  return selectMessagesForInput(messages).map(mapMessageToInputItem);
}
