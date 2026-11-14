import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * The only write in the console.
 *
 * A note is stored here immediately, with status "queued", and a `write_note`
 * call is put in the same one-call-per-minute queue as everything else. When
 * that call comes back, `ingest.recordResult` flips the row to "sent". If it
 * never comes back the row stays queued and the UI says so — it is never
 * reported as written when it is not.
 */
export const addNote = mutation({
  args: {
    accountId: v.string(),
    dealId: v.optional(v.string()),
    kind: v.union(
      v.literal("note"),
      v.literal("task"),
      v.literal("risk"),
      v.literal("next_step"),
    ),
    text: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, dealId, kind, text, title }) => {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("A note needs text.");
    if (trimmed.length > 4000) throw new Error("The MCP accepts 4,000 characters.");

    const noteId = await ctx.db.insert("notes", {
      at: Date.now(),
      accountId,
      dealId,
      kind,
      text: trimmed,
      status: "queued",
    });

    const deal = dealId
      ? await ctx.db
          .query("deals")
          .withIndex("by_externalId", (q) => q.eq("externalId", dealId))
          .first()
      : null;

    const shortTitle = (title ?? (deal ? `${kind} · ${deal.title}` : `${kind} · ${accountId}`)).slice(
      0,
      120,
    );

    await ctx.runMutation(internal.ingest.enqueue, {
      tool: "write_note",
      args: {
        account: accountId,
        kind,
        title: shortTitle,
        text: trimmed,
        /** not sent to the MCP; used to flip the row when the call returns */
        noteId,
      },
      priority: 1,
      label: shortTitle,
    });

    return { noteId, status: "queued" as const };
  },
});
