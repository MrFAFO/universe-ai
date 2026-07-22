import { z } from "zod";

export const createWorldInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(""),
});

export type CreateWorldInput = z.infer<typeof createWorldInputSchema>;

export const worldIdParamSchema = z.uuid();

export type WorldIdParam = z.infer<typeof worldIdParamSchema>;

export const approveSuggestionInputSchema = z.object({
  suggestionId: z.uuid(),
});

export type ApproveSuggestionInput = z.infer<typeof approveSuggestionInputSchema>;

export const suggestedNodeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  goal: z.string().trim().max(5000),
});

export const branchSuggestionPayloadSchema = z.object({
  rationale: z.string().trim().max(5000).optional(),
  nodes: z.array(suggestedNodeSchema).min(1).max(6),
});

export type BranchSuggestionPayload = z.infer<typeof branchSuggestionPayloadSchema>;

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
