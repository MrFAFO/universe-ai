import { z } from "zod";

export const PLANNING_CHAT_CONFLICT_CODE = "planning_run_in_progress" as const;

export const PLANNING_CHAT_CONFLICT_MESSAGES = {
  planning_run_in_progress:
    "This planning conversation is already generating a reply. Wait for it to finish, then try again.",
} as const satisfies Record<typeof PLANNING_CHAT_CONFLICT_CODE, string>;

export const planningChatConflictResponseSchema = z
  .object({
    error: z.string(),
    code: z.literal(PLANNING_CHAT_CONFLICT_CODE),
  })
  .strict();

export type PlanningChatConflictResponse = z.infer<
  typeof planningChatConflictResponseSchema
>;

export function parsePlanningChatConflictResponse(
  raw: unknown,
): PlanningChatConflictResponse | null {
  const parsed = planningChatConflictResponseSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function isPlanningChatConflictPayload(raw: unknown): boolean {
  return planningChatConflictResponseSchema.safeParse(raw).success;
}

export function extractPlanningChatConflictMessage(raw: unknown): string | null {
  const parsed = planningChatConflictResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  return PLANNING_CHAT_CONFLICT_MESSAGES[parsed.data.code];
}

export async function readPlanningChatConflictMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const raw: unknown = await response.json();
    return extractPlanningChatConflictMessage(raw) ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
