import { z } from "zod";

export const createWorldInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(""),
});

export type CreateWorldInput = z.infer<typeof createWorldInputSchema>;

export const worldIdParamSchema = z.uuid();

export type WorldIdParam = z.infer<typeof worldIdParamSchema>;

export const conversationIdParamSchema = z.uuid();

export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>;

export const nodeIdParamSchema = z.uuid();

export type NodeIdParam = z.infer<typeof nodeIdParamSchema>;

export const sendMessageInputSchema = z.object({
  content: z.string().trim().min(1).max(10_000),
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const approveSuggestionInputSchema = z.object({
  suggestionId: z.uuid(),
});

export type ApproveSuggestionInput = z.infer<typeof approveSuggestionInputSchema>;

export const createWorldWithRootResultSchema = z.object({
  world_id: z.uuid(),
  root_node_id: z.uuid(),
  conversation_id: z.uuid(),
});

export const approveBranchSuggestionResultSchema = z.object({
  suggestion_id: z.uuid(),
  status: z.literal("approved"),
  created_node_ids: z.array(z.uuid()),
  idempotent: z.boolean(),
});

export const dbBranchSuggestionRowSchema = z.object({
  id: z.uuid(),
  world_id: z.uuid(),
  conversation_id: z.uuid(),
  parent_node_id: z.uuid(),
  ai_run_id: z.uuid().nullable(),
  status: z.enum(["pending", "approved", "rejected", "superseded"]),
  schema_version: z.number().int(),
  payload: z.record(z.string(), z.unknown()),
  created_node_ids: z.array(z.uuid()).nullable(),
  created_at: z.string(),
  decided_at: z.string().nullable(),
});
