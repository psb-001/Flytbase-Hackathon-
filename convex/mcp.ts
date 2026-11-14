import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const CALL_TIMEOUT_MS = 45_000;

/** Pull the JSON payload out of either a plain JSON body or an SSE stream. */
function extractPayload(body: string, contentType: string): unknown {
  if (contentType.includes("text/event-stream")) {
    const frames = body.split(/\r?\n\r?\n/);
    for (let i = frames.length - 1; i >= 0; i--) {
      const data = frames[i]
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("");
      if (!data) continue;
      try {
        return JSON.parse(data);
      } catch {
        // keep looking at earlier frames
      }
    }
    throw new Error("SSE stream contained no parseable JSON frame");
  }
  return JSON.parse(body);
}

/** MCP wraps tool output as content[0].text, usually a JSON string. */
function unwrapToolResult(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "error" in payload) {
    const err = (payload as { error: { message?: string } }).error;
    throw new Error(`JSON-RPC error: ${err?.message ?? "unknown"}`);
  }
  const result = (payload as { result?: { content?: unknown[]; isError?: boolean } })
    .result;
  if (!result) throw new Error("MCP response had no result");
  if (result.isError) throw new Error("MCP tool reported an error");

  const content = result.content ?? [];
  const textPart = content.find(
    (part): part is { type: string; text: string } =>
      typeof part === "object" &&
      part !== null &&
      (part as { type?: string }).type === "text" &&
      typeof (part as { text?: unknown }).text === "string",
  );
  if (!textPart) return result;

  try {
    return JSON.parse(textPart.text);
  } catch {
    return textPart.text;
  }
}

export const callTool = internalAction({
  args: { queueId: v.id("queue") },
  handler: async (ctx, { queueId }) => {
    const item = await ctx.runQuery(internal.ingest.getQueueItem, { queueId });
    if (!item || item.status !== "running") return;

    const url = process.env.MCP_URL;
    const token = process.env.QUESTIONATHON_TOKEN;
    if (!url) throw new Error("MCP_URL is not set");

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

    try {
      if (!token) throw new Error("QUESTIONATHON_TOKEN is not set");

      // `noteId` is our own bookkeeping; the MCP schema forbids extra fields.
      const { noteId: _noteId, ...wireArgs } = (item.args ?? {}) as Record<string, unknown>;
      void _noteId;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: item.tool, arguments: wireArgs },
        }),
        signal: controller.signal,
      });

      const body = await res.text();
      const contentType = res.headers.get("content-type") ?? "";

      if (res.status === 429) {
        await ctx.runMutation(internal.ingest.deferCall, {
          queueId,
          reason: "rate limited (429)",
          waitMs: 60_000,
        });
        return;
      }

      if (!res.ok) {
        await ctx.runMutation(internal.ingest.recordResult, {
          queueId,
          ok: false,
          error: `HTTP ${res.status}: ${body.slice(0, 400)}`,
          durationMs: Date.now() - startedAt,
        });
        return;
      }

      const payload = extractPayload(body, contentType);
      const raw = unwrapToolResult(payload);

      await ctx.runMutation(internal.ingest.recordResult, {
        queueId,
        ok: true,
        raw,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === "AbortError"
            ? `timed out after ${CALL_TIMEOUT_MS}ms`
            : error.message
          : String(error);

      await ctx.runMutation(internal.ingest.recordResult, {
        queueId,
        ok: false,
        error: message.slice(0, 400),
        durationMs: Date.now() - startedAt,
      });
    } finally {
      clearTimeout(timer);
    }
  },
});
