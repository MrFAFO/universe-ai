import type { EasyInputMessage } from "openai/resources/responses/responses";
import type { DbMessage } from "@/types/db";

export const MAX_NON_SYSTEM_MESSAGES = 40;

export class ToolMessageNotSupportedError extends Error {
  constructor(messageId?: string) {
    super(
      messageId
        ? `Tool messages are not supported in Root Planning model input (message ${messageId}).`
        : "Tool messages are not supported in Root Planning model input.",
    );
    this.name = "ToolMessageNotSupportedError";
  }
}

function sortMessagesByOrdinal(messages: DbMessage[]): DbMessage[] {
  return [...messages].sort((left, right) => left.ordinal - right.ordinal);
}

export function selectNonSystemMessagesForInput(
  messages: DbMessage[],
): DbMessage[] {
  const sorted = sortMessagesByOrdinal(messages);

  for (const message of sorted) {
    if (message.role === "tool") {
      throw new ToolMessageNotSupportedError(message.id);
    }
  }

  const nonSystemMessages = sorted.filter((message) => message.role !== "system");
  if (nonSystemMessages.length <= MAX_NON_SYSTEM_MESSAGES) {
    return nonSystemMessages;
  }

  return nonSystemMessages.slice(-MAX_NON_SYSTEM_MESSAGES);
}

export function mapMessageToInputItem(message: DbMessage): EasyInputMessage {
  if (message.role === "user" || message.role === "assistant") {
    return {
      role: message.role,
      content: message.content,
    };
  }

  throw new ToolMessageNotSupportedError(message.id);
}
