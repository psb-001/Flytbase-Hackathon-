import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Every MCP id is an external string. We never use it as a Convex `_id`,
 * because the MCP is the source of truth and ids must survive re-ingest.
 */
export default defineSchema({
  // Append-only record of every MCP call and its raw payload.
  snapshots: defineTable({
    tool: v.string(),
    args: v.any(),
    argsHash: v.string(),
    at: v.number(),
    ok: v.boolean(),
    error: v.optional(v.string()),
    raw: v.any(),
    durationMs: v.optional(v.number()),
  })
    .index("by_tool", ["tool"])
    .index("by_hash", ["argsHash"])
    .index("by_at", ["at"]),

  // Durable, deduped work queue drained at one call per minute.
  queue: defineTable({
    tool: v.string(),
    args: v.any(),
    argsHash: v.string(),
    /** 0 signals · 1 notes · 2 evidence · 3 backfill */
    priority: v.number(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
    ),
    attempts: v.number(),
    notBefore: v.number(),
    startedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    label: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_hash", ["argsHash"])
    .index("by_status_priority", ["status", "priority"]),

  // Single-row rate limiter for the MCP token.
  bucket: defineTable({
    key: v.string(),
    lastCallAt: v.number(),
    calls: v.number(),
  }).index("by_key", ["key"]),

  accounts: defineTable({
    externalId: v.string(),
    name: v.string(),
    /** From the account's profile file. Two accounts, two currencies — never summed. */
    currency: v.optional(v.string()),
    officialStory: v.optional(v.string()),
    minute: v.optional(v.number()),
    worldClosed: v.optional(v.boolean()),
    updatedAt: v.number(),
    raw: v.any(),
  }).index("by_externalId", ["externalId"]),

  people: defineTable({
    externalId: v.string(),
    accountId: v.string(),
    name: v.string(),
    role: v.string(),
    relationship: v.union(
      v.literal("guarded"),
      v.literal("neutral"),
      v.literal("warm"),
      v.literal("ally"),
    ),
    available: v.boolean(),
    raw: v.any(),
  })
    .index("by_account", ["accountId"])
    .index("by_externalId", ["externalId"]),

  deals: defineTable({
    externalId: v.string(),
    accountId: v.string(),
    title: v.string(),
    stage: v.union(
      v.literal("identified"),
      v.literal("qualified"),
      v.literal("cleared"),
      v.literal("agreed"),
    ),
    worthUpTo: v.union(v.number(), v.null()),
    size: v.optional(v.string()),
    blocker: v.optional(
      v.union(
        v.null(),
        v.object({ text: v.string(), status: v.string() }),
      ),
    ),
    evidence: v.array(v.string()),
    deadline: v.optional(
      v.union(v.null(), v.object({ text: v.string(), minute: v.number() })),
    ),
    raw: v.any(),
  })
    .index("by_account", ["accountId"])
    .index("by_externalId", ["externalId"]),

  facts: defineTable({
    externalId: v.string(),
    accountId: v.string(),
    text: v.string(),
    saidBy: v.string(),
    status: v.union(
      v.literal("claim"),
      v.literal("told"),
      v.literal("verified"),
    ),
    verifiedBy: v.optional(v.string()),
    learnedAtMinute: v.number(),
    raw: v.any(),
  })
    .index("by_account", ["accountId"])
    .index("by_externalId", ["externalId"]),

  offers: defineTable({
    externalId: v.string(),
    accountId: v.string(),
    title: v.string(),
    value: v.number(),
    pitchTo: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("won"),
      v.literal("declined"),
    ),
    raw: v.any(),
  })
    .index("by_account", ["accountId"])
    .index("by_externalId", ["externalId"]),

  deadlines: defineTable({
    accountId: v.string(),
    text: v.string(),
    minute: v.number(),
    passed: v.boolean(),
  }).index("by_account", ["accountId"]),

  // Paperwork and file bodies, keyed by path.
  records: defineTable({
    externalId: v.string(),
    accountId: v.union(v.string(), v.null()),
    path: v.string(),
    kind: v.string(),
    text: v.optional(v.string()),
    data: v.optional(v.any()),
    addedAt: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_path", ["path"])
    .index("by_externalId", ["externalId"]),

  signals: defineTable({
    externalId: v.string(),
    accountId: v.optional(v.string()),
    at: v.number(),
    kind: v.string(),
    summary: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    linkedDealId: v.optional(v.string()),
    read: v.boolean(),
    raw: v.any(),
  })
    .index("by_at", ["at"])
    .index("by_externalId", ["externalId"]),

  notes: defineTable({
    at: v.number(),
    accountId: v.optional(v.string()),
    dealId: v.optional(v.string()),
    kind: v.union(
      v.literal("note"),
      v.literal("task"),
      v.literal("risk"),
      v.literal("next_step"),
    ),
    text: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
  }).index("by_account", ["accountId"]),
});
