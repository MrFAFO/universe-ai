import { NextResponse } from "next/server";
import { RootPlanningNotFoundError } from "@/lib/db/chat";
import {
  DatabaseError,
  PUBLIC_CHAT_ERROR_MESSAGE,
} from "@/lib/db/errors";
import {
  nodeIdParamSchema,
  sendMessageInputSchema,
  worldIdParamSchema,
} from "@/lib/validation/schemas";
import { createRootPlanningChatStream } from "@/server/chat/root-planning-chat";

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
    const stream = await createRootPlanningChatStream({
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
    if (error instanceof RootPlanningNotFoundError) {
      return NextResponse.json(
        { error: "Root planning conversation not found." },
        { status: 404 },
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
