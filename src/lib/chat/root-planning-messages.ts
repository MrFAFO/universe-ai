import type { DbMessage } from "@/types/db";

export type RootPlanningChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "failed" | "complete";
  createdAt: string;
};

export function appendRootPlanningMessageDeduped(
  messages: ReadonlyArray<RootPlanningChatMessage>,
  message: RootPlanningChatMessage,
): RootPlanningChatMessage[] {
  if (messages.some((existing) => existing.id === message.id)) {
    return [...messages];
  }

  return [...messages, message];
}

export function mapDbMessagesToRootPlanningChatMessages(
  messages: DbMessage[],
): RootPlanningChatMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      id: message.id,
      role: message.role as "user" | "assistant",
      content: message.content,
      status: "complete" as const,
      createdAt: message.created_at,
    }));
}
