import { NextResponse } from "next/server";
import {
  PLANNING_CHAT_CONFLICT_CODE,
  PLANNING_CHAT_CONFLICT_MESSAGES,
} from "@/lib/chat/planning-chat-conflict";
import { RootPlanningNotFoundError } from "@/lib/db/chat";
import {
  DatabaseError,
  PUBLIC_CHAT_ERROR_MESSAGE,
} from "@/lib/db/errors";
import { PlanningRunInProgressError } from "@/lib/db/planning-chat-runs";
import {
  PlanningNodeTargetNotFoundError,
  loadPlanningNodeKind,
} from "@/lib/db/planning-node-target";
import { TopicPlanningNotFoundError } from "@/lib/db/topic-planning";
import {
  nodeIdParamSchema,
  sendMessageInputSchema,
  worldIdParamSchema,
} from "@/lib/validation/schemas";
import { createRootPlanningChatStream } from "@/server/chat/root-planning-chat";
import { createTopicPlanningChatStream } from "@/server/chat/topic-planning-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ worldId: string; nodeId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { worldId, nodeId } = await context.params;
  const parsedWorldId = worldIdParamSchema.safeParse(worldId);
  const parsedNodeId = nodeIdParamSchema.safeParse(nodeId);

  if (!parsedWorldId.success || !parsedNodeId.success) {
    return NextResponse.json(
      { error: "Invalid request parameters." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsedBody = sendMessageInputSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid message content." },
      { status: 400 },
    );
  }

  try {
    const kind = await loadPlanningNodeKind(
      parsedWorldId.data,
      parsedNodeId.data,
    );

    const stream =
      kind === "root"
        ? await createRootPlanningChatStream({
            worldId: parsedWorldId.data,
            nodeId: parsedNodeId.data,
            content: parsedBody.data.content,
            signal: request.signal,
          })
        : await createTopicPlanningChatStream({
            worldId: parsedWorldId.data,
            nodeId: parsedNodeId.data,
            content: parsedBody.data.content,
            signal: request.signal,
          });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    if (
      error instanceof RootPlanningNotFoundError ||
      error instanceof TopicPlanningNotFoundError ||
      error instanceof PlanningNodeTargetNotFoundError
    ) {
      return NextResponse.json(
        { error: "Planning conversation not found." },
        { status: 404 },
      );
    }

    if (error instanceof PlanningRunInProgressError) {
      return NextResponse.json(
        {
          error: PLANNING_CHAT_CONFLICT_MESSAGES.planning_run_in_progress,
          code: PLANNING_CHAT_CONFLICT_CODE,
        },
        { status: 409 },
      );
    }

    if (error instanceof DatabaseError) {
      return NextResponse.json(
        { error: PUBLIC_CHAT_ERROR_MESSAGE },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: PUBLIC_CHAT_ERROR_MESSAGE },
      { status: 500 },
    );
  }
}
