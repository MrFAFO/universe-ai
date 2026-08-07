import { beforeEach, describe, expect, it, vi } from "vitest";
import { RootPlanningNotFoundError } from "@/lib/db/chat";
import { DatabaseError, PUBLIC_CHAT_ERROR_MESSAGE } from "@/lib/db/errors";
import { PlanningNodeTargetNotFoundError } from "@/lib/db/planning-node-target";
import {
  TopicPlanningNotFoundError,
  TopicPlanningProvisioningIntegrityError,
} from "@/lib/db/topic-planning";

const worldId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const nodeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const mocks = vi.hoisted(() => ({
  loadPlanningNodeKind: vi.fn(),
  createRootPlanningChatStream: vi.fn(),
  createTopicPlanningChatStream: vi.fn(),
}));

vi.mock("@/lib/db/planning-node-target", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/db/planning-node-target")
  >();
  return {
    ...actual,
    loadPlanningNodeKind: mocks.loadPlanningNodeKind,
  };
});

vi.mock("@/server/chat/root-planning-chat", () => ({
  createRootPlanningChatStream: mocks.createRootPlanningChatStream,
}));

vi.mock("@/server/chat/topic-planning-chat", () => ({
  createTopicPlanningChatStream: mocks.createTopicPlanningChatStream,
}));

import { POST } from "./route";

function makeRequest(
  content = "Hello",
  signal = new AbortController().signal,
): Request {
  return new Request(`http://localhost/api/worlds/${worldId}/nodes/${nodeId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
    signal,
  });
}

function makeRouteContext() {
  return {
    params: Promise.resolve({ worldId, nodeId }),
  };
}

function makeNdjsonStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode('{"type":"done","messageId":"m-1"}\n'),
      );
      controller.close();
    },
  });
}

describe("POST /api/worlds/[worldId]/nodes/[nodeId]/messages", () => {
  beforeEach(() => {
    mocks.loadPlanningNodeKind.mockReset();
    mocks.createRootPlanningChatStream.mockReset();
    mocks.createTopicPlanningChatStream.mockReset();
  });

  it("dispatches root nodes to createRootPlanningChatStream with validated values", async () => {
    const signal = new AbortController().signal;
    const request = makeRequest("Hello", signal);
    mocks.loadPlanningNodeKind.mockResolvedValue("root");
    mocks.createRootPlanningChatStream.mockResolvedValue(makeNdjsonStream());

    const response = await POST(request, makeRouteContext());

    expect(mocks.loadPlanningNodeKind).toHaveBeenCalledWith(worldId, nodeId);
    expect(mocks.createRootPlanningChatStream).toHaveBeenCalledTimes(1);
    expect(mocks.createRootPlanningChatStream).toHaveBeenCalledWith({
      worldId,
      nodeId,
      content: "Hello",
      signal: request.signal,
    });
    expect(mocks.createTopicPlanningChatStream).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/x-ndjson; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
  });

  it("dispatches topic nodes to createTopicPlanningChatStream with validated values", async () => {
    const signal = new AbortController().signal;
    const request = makeRequest("Hello", signal);
    mocks.loadPlanningNodeKind.mockResolvedValue("topic");
    mocks.createTopicPlanningChatStream.mockResolvedValue(makeNdjsonStream());

    const response = await POST(request, makeRouteContext());

    expect(mocks.loadPlanningNodeKind).toHaveBeenCalledWith(worldId, nodeId);
    expect(mocks.createTopicPlanningChatStream).toHaveBeenCalledTimes(1);
    expect(mocks.createTopicPlanningChatStream).toHaveBeenCalledWith({
      worldId,
      nodeId,
      content: "Hello",
      signal: request.signal,
    });
    expect(mocks.createRootPlanningChatStream).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/x-ndjson; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
  });

  it("returns safe 404 for PlanningNodeTargetNotFoundError", async () => {
    mocks.loadPlanningNodeKind.mockRejectedValue(
      new PlanningNodeTargetNotFoundError(),
    );

    const response = await POST(makeRequest(), makeRouteContext());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Planning conversation not found." });
    expect(mocks.createRootPlanningChatStream).not.toHaveBeenCalled();
    expect(mocks.createTopicPlanningChatStream).not.toHaveBeenCalled();
  });

  it("returns safe 404 for RootPlanningNotFoundError", async () => {
    mocks.loadPlanningNodeKind.mockResolvedValue("root");
    mocks.createRootPlanningChatStream.mockRejectedValue(
      new RootPlanningNotFoundError("conversation"),
    );

    const response = await POST(makeRequest(), makeRouteContext());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Planning conversation not found." });
  });

  it("returns safe 404 for TopicPlanningNotFoundError", async () => {
    mocks.loadPlanningNodeKind.mockResolvedValue("topic");
    mocks.createTopicPlanningChatStream.mockRejectedValue(
      new TopicPlanningNotFoundError("not_topic"),
    );

    const response = await POST(makeRequest(), makeRouteContext());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Planning conversation not found." });
  });

  it("returns safe 500 for TopicPlanningProvisioningIntegrityError", async () => {
    mocks.loadPlanningNodeKind.mockResolvedValue("topic");
    mocks.createTopicPlanningChatStream.mockRejectedValue(
      new TopicPlanningProvisioningIntegrityError(),
    );

    const response = await POST(makeRequest(), makeRouteContext());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: PUBLIC_CHAT_ERROR_MESSAGE });
  });

  it("returns safe 500 for ordinary DatabaseError", async () => {
    mocks.loadPlanningNodeKind.mockRejectedValue(
      new DatabaseError("database unavailable"),
    );

    const response = await POST(makeRequest(), makeRouteContext());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: PUBLIC_CHAT_ERROR_MESSAGE });
  });

  it("returns safe 500 for unexpected errors", async () => {
    mocks.loadPlanningNodeKind.mockResolvedValue("root");
    mocks.createRootPlanningChatStream.mockRejectedValue(
      new Error("unexpected failure"),
    );

    const response = await POST(makeRequest(), makeRouteContext());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: PUBLIC_CHAT_ERROR_MESSAGE });
  });
});
