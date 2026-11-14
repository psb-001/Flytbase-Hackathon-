import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { applyToolResult } from "./lib/apply";

/** The MCP allows one call per minute, writes included. */
export const MIN_CALL_GAP_MS = 55_000;
/** A call that never reports back is abandoned after this long. */
const STALE_RUNNING_MS = 90_000;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** FNV-1a — short, stable, collision-resistant enough for a dedupe key. */
export function argsHash(tool: string, args: unknown): string {
  const input = `${tool}:${stableStringify(args ?? {})}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export const getQueueItem = internalQuery({
  args: { queueId: v.id("queue") },
  handler: async (ctx, { queueId }) => ctx.db.get(queueId),
});

/**
 * Add a call to the queue. Re-planning is free: an identical (tool, args)
 * pair that is already queued, running or done is not enqueued twice.
 */
export const enqueue = internalMutation({
  args: {
    tool: v.string(),
    args: v.optional(v.any()),
    priority: v.optional(v.number()),
    label: v.optional(v.string()),
    /** Re-run even if this exact call already succeeded. */
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, { tool, args, priority, label, force }) => {
    const hash = argsHash(tool, args);

    const existing = await ctx.db
      .query("queue")
      .withIndex("by_hash", (q) => q.eq("argsHash", hash))
      .collect();

    if (existing.some((item) => item.status === "queued" || item.status === "running")) {
      return { enqueued: false, reason: "already in flight" };
    }
    if (!force && existing.some((item) => item.status === "done")) {
      return { enqueued: false, reason: "already done" };
    }

    await ctx.db.insert("queue", {
      tool,
      args: args ?? {},
      argsHash: hash,
      priority: priority ?? 3,
      status: "queued",
      attempts: 0,
      notBefore: 0,
      label,
    });
    return { enqueued: true };
  },
});

/** Cron target: spends at most one MCP call, then re-arms. */
export const pump = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Recover calls that were started but never reported back.
    const stale = await ctx.db
      .query("queue")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();
    for (const item of stale) {
      if (item.startedAt && now - item.startedAt > STALE_RUNNING_MS) {
        await ctx.db.patch(item._id, {
          status: "queued",
          lastError: "stale: no result recorded",
          notBefore: now + 5_000,
        });
      }
    }

    const bucket = await ctx.db
      .query("bucket")
      .withIndex("by_key", (q) => q.eq("key", "mcp"))
      .first();

    if (bucket && now - bucket.lastCallAt < MIN_CALL_GAP_MS) {
      return { ran: false, reason: "rate limited", waitMs: MIN_CALL_GAP_MS - (now - bucket.lastCallAt) };
    }

    const candidates = await ctx.db
      .query("queue")
      .withIndex("by_status_priority", (q) => q.eq("status", "queued"))
      .order("asc")
      .collect();

    const next = candidates.find((item) => item.notBefore <= now);
    if (!next) return { ran: false, reason: "queue empty" };

    await ctx.db.patch(next._id, {
      status: "running",
      startedAt: now,
      attempts: next.attempts + 1,
    });

    if (bucket) {
      await ctx.db.patch(bucket._id, { lastCallAt: now, calls: bucket.calls + 1 });
    } else {
      await ctx.db.insert("bucket", { key: "mcp", lastCallAt: now, calls: 1 });
    }

    await ctx.scheduler.runAfter(0, internal.mcp.callTool, { queueId: next._id });
    return { ran: true, tool: next.tool, priority: next.priority };
  },
});

/** A 429 or a transient failure: put it back with a delay. */
export const deferCall = internalMutation({
  args: { queueId: v.id("queue"), reason: v.string(), waitMs: v.number() },
  handler: async (ctx, { queueId, reason, waitMs }) => {
    await ctx.db.patch(queueId, {
      status: "queued",
      notBefore: Date.now() + waitMs,
      lastError: reason,
    });
  },
});

export const recordResult = internalMutation({
  args: {
    queueId: v.id("queue"),
    ok: v.boolean(),
    raw: v.optional(v.any()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, { queueId, ok, raw, error, durationMs }) => {
    const item = await ctx.db.get(queueId);
    if (!item) return;

    await ctx.db.insert("snapshots", {
      tool: item.tool,
      args: item.args,
      argsHash: item.argsHash,
      at: Date.now(),
      ok,
      error,
      raw: raw ?? null,
      durationMs,
    });

    if (ok) {
      await applyToolResult(ctx, item.tool, item.args, raw);
      await ctx.db.patch(queueId, { status: "done", lastError: undefined });

      // The only local row that a tool call can settle: our own note.
      const noteId = (item.args as { noteId?: string } | undefined)?.noteId;
      if (item.tool === "write_note" && noteId) {
        const note = await ctx.db.get(noteId as Id<"notes">);
        if (note) await ctx.db.patch(note._id, { status: "sent" });
      }
      return;
    }

    // Token and payload errors will not fix themselves; retry only transient ones.
    const terminal =
      /401|403|not set|JSON-RPC error|no result|MCP tool reported/i.test(error ?? "");
    await ctx.db.patch(queueId, {
      status: terminal ? "failed" : "queued",
      lastError: error,
      notBefore: terminal ? item.notBefore : Date.now() + 30_000 * Math.max(1, item.attempts),
    });
  },
});

/** Public helper for the dashboard / debugging. */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const bucket = await ctx.db
      .query("bucket")
      .withIndex("by_key", (q) => q.eq("key", "mcp"))
      .first();
    const queued = await ctx.db
      .query("queue")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();
    const running = await ctx.db
      .query("queue")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();
    const failed = await ctx.db
      .query("queue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();
    const signals = await ctx.db.query("signals").collect();

    return {
      bucket,
      queued: queued.length,
      running: running.length,
      failed: failed.map((f) => ({ tool: f.tool, error: f.lastError })),
      signals: signals.length,
      nextInMs: bucket ? Math.max(0, MIN_CALL_GAP_MS - (Date.now() - bucket.lastCallAt)) : 0,
    };
  },
});

/** Seed path for captured payloads — no MCP call spent. */
export const seedSnapshot = mutation({
  args: {
    key: v.string(),
    tool: v.string(),
    args: v.optional(v.any()),
    raw: v.any(),
  },
  handler: async (ctx, { key, tool, args, raw }) => {
    const expected = process.env.MCP_SEED_KEY;
    if (!expected || key !== expected) throw new Error("bad seed key");

    await ctx.db.insert("snapshots", {
      tool,
      args: args ?? {},
      argsHash: argsHash(tool, args),
      at: Date.now(),
      ok: true,
      raw,
    });
    await applyToolResult(ctx, tool, args ?? {}, raw);
    return { ok: true };
  },
});

export type QueueDoc = Doc<"queue">;
export type QueueId = Id<"queue">;
