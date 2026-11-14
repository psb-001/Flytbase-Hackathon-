import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { buildAnswer } from "./lib/answer";
import { loadPortfolio } from "./lib/view";
import type { Portfolio } from "./lib/dto";

/** Everything the dashboard renders, in one reactive read. */
export const portfolio = query({
  args: {},
  handler: async (ctx): Promise<Portfolio> => {
    const view = await loadPortfolio(ctx);
    const bucket = await ctx.db
      .query("bucket")
      .withIndex("by_key", (q) => q.eq("key", "mcp"))
      .first();
    const queued = await ctx.db
      .query("queue")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .collect();

    const snapshots = await ctx.db
      .query("snapshots")
      .withIndex("by_at")
      .order("desc")
      .take(20);

    const minute = view.accounts[0]?.account.minute ?? null;
    const worldClosed = view.accounts.every((a) => a.account.worldClosed);

    return {
      generatedAt: Date.now(),
      asOf: view.asOf,
      accounts: view.accounts.map(buildAnswer),
      signals: view.signals.map((signal) => ({
        id: signal.externalId,
        accountId: signal.accountId ?? null,
        dated: new Date(signal.at).toISOString().slice(0, 10),
        at: new Date(signal.at).toISOString(),
        title:
          (typeof signal.raw === "object" &&
          signal.raw !== null &&
          typeof (signal.raw as Record<string, unknown>).title === "string"
            ? String((signal.raw as Record<string, unknown>).title)
            : null) ??
          signal.summary.split(".")[0] ??
          signal.externalId,
        summary: signal.summary,
        kind: signal.kind,
        read: signal.read,
        linkedDealId: signal.linkedDealId ?? null,
        before: signal.before == null ? null : String(signal.before),
        after: signal.after == null ? null : String(signal.after),
        touches: signal.linkedDealId
          ? [`bears on ${signal.linkedDealId}`]
          : ["adds a gap"],
        evidence: [
          {
            id: signal.externalId,
            kind: "signal" as const,
            label: `signal · ${signal.kind.replace(/_/g, " ")}`,
            quote: signal.summary,
          },
        ],
      })),
      ingest: snapshots.map((s) => ({
        tool: s.tool,
        args: JSON.stringify(s.args ?? {}),
        at: s.at,
        ok: s.ok,
      })),
      liveness: {
        worldClosed,
        minute,
        queued: queued.length,
        lastCallAt: bucket?.lastCallAt ?? null,
        says: worldClosed
          ? `Discovery closed at minute ${minute ?? "?"}. The record is final; your own notes are the only thing that can still change.`
          : "Discovery is open — new signals can still land.",
      },
    };
  },
});

/**
 * The source drawer. Give it any id we cite and it returns the full record.
 * Unknown ids return null; the UI must not invent one.
 */
export const source = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const fact = await ctx.db
      .query("facts")
      .withIndex("by_externalId", (q) => q.eq("externalId", id))
      .first();
    if (fact) {
      return {
        id,
        kind: "fact",
        title: fact.saidBy,
        meta: `${fact.status} · learned at minute ${fact.learnedAtMinute}${
          fact.verifiedBy ? ` · verified by ${fact.verifiedBy}` : ""
        }`,
        body: fact.text,
        accountId: fact.accountId,
        path: fact.verifiedBy ?? null,
      };
    }

    const fileAsRecord = await ctx.db
      .query("records")
      .withIndex("by_externalId", (q) => q.eq("externalId", id))
      .first();
    const fileRecord =
      fileAsRecord ??
      (await ctx.db
        .query("records")
        .withIndex("by_externalId", (q) => q.eq("externalId", `file:${id}`))
        .first());

    if (fileRecord) return recordView(fileRecord);

    const byPath = await ctx.db
      .query("records")
      .withIndex("by_path", (q) => q.eq("path", id))
      .first();
    if (byPath) return recordView(byPath);

    const person = await ctx.db
      .query("people")
      .withIndex("by_externalId", (q) => q.eq("externalId", id))
      .first();
    if (person) {
      return {
        id,
        kind: "person",
        title: person.name,
        meta: `${person.role} · ${person.relationship}${
          person.available ? "" : " · unavailable"
        }`,
        body: JSON.stringify(person.raw, null, 2),
        accountId: person.accountId,
        path: null,
      };
    }

    const deal = await ctx.db
      .query("deals")
      .withIndex("by_externalId", (q) => q.eq("externalId", id))
      .first();
    if (deal) {
      return {
        id,
        kind: "deal",
        title: deal.title,
        meta: `${deal.stage}${
          deal.worthUpTo === null ? " · no value" : ` · ${deal.worthUpTo}`
        }`,
        body: JSON.stringify(deal.raw, null, 2),
        accountId: deal.accountId,
        path: null,
      };
    }

    const offer = await ctx.db
      .query("offers")
      .withIndex("by_externalId", (q) => q.eq("externalId", id))
      .first();
    if (offer) {
      return {
        id,
        kind: "offer",
        title: offer.title,
        meta: `${offer.value} · ${offer.status}`,
        body: JSON.stringify(offer.raw, null, 2),
        accountId: offer.accountId,
        path: null,
      };
    }

    const signal = await ctx.db
      .query("signals")
      .withIndex("by_externalId", (q) => q.eq("externalId", id))
      .first();
    if (signal) {
      return {
        id,
        kind: "signal",
        title: signal.summary.split(".")[0] ?? id,
        meta: `${new Date(signal.at).toISOString().slice(0, 10)}${""}`,
        body: signal.summary,
        accountId: signal.accountId ?? null,
        path: null,
      };
    }

    const account = await ctx.db
      .query("accounts")
      .withIndex("by_externalId", (q) => q.eq("externalId", id))
      .first();
    if (account) {
      return {
        id,
        kind: "account",
        title: account.name,
        meta: account.officialStory ?? "",
        body: JSON.stringify(account.raw, null, 2),
        accountId: account.externalId,
        path: null,
      };
    }

    return null;
  },
});

function recordView(record: Doc<"records">) {
  const data = record.data;
  const body =
    record.text ??
    (data === undefined || data === null
      ? ""
      : typeof data === "string"
        ? data
        : JSON.stringify(data, null, 2));
  return {
    id: record.externalId,
    kind: record.kind === "file" ? "file" : "record",
    title: record.path,
    meta: `${record.kind}${record.accountId ? ` · account ${record.accountId}` : ""}`,
    body,
    accountId: record.accountId ?? null,
    path: record.path,
  };
}

/** Recent notes we queued through the one allowed write path. */
export const notes = query({
  args: { accountId: v.optional(v.string()) },
  handler: async (ctx, { accountId }) => {
    const rows = accountId
      ? await ctx.db
          .query("notes")
          .withIndex("by_account", (q) => q.eq("accountId", accountId))
          .collect()
      : await ctx.db.query("notes").collect();
    return rows.sort((a, b) => b.at - a.at);
  },
});

/** Reference corpora, for the "what changed under us" strip. */
export const reference = query({
  args: { kind: v.string() },
  handler: async (ctx, { kind }) => {
    const row = await ctx.db
      .query("records")
      .withIndex("by_externalId", (q) => q.eq("externalId", `ref:${kind}`))
      .first();
    return row?.data ?? null;
  },
});

/**
 * Everything the drawer shows for one id, in one read.
 *
 * Same resolution order as `source`, plus the raw payload and the exact MCP
 * call that brought the record in — found by asking which stored snapshot
 * contains the id. Nothing is synthesised: if no record matches, it returns
 * null and the UI says so rather than inventing a file.
 */
export const sourceDetail = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    type Detail = {
      id: string;
      kind: string;
      acct: string | null;
      deal: string | null;
      file: string | null;
      title: string;
      meta: string;
      claim: string;
      conf: "verified" | "told" | "claim";
      payload: unknown;
      key: string;
      path: string | null;
    };

    let detail: Detail | null = null;

    const fact = await ctx.db
      .query("facts")
      .withIndex("by_externalId", (q) => q.eq("externalId", id))
      .first();
    if (fact) {
      detail = {
        id,
        kind: "fact",
        acct: fact.accountId,
        deal: null,
        file: fact.verifiedBy ?? null,
        title: fact.saidBy,
        meta: `${fact.status} · learned at minute ${fact.learnedAtMinute}`,
        claim: fact.text,
        conf: fact.status,
        payload: fact.raw,
        key: "text",
        path: fact.verifiedBy ?? null,
      };
    }

    if (!detail) {
      const all = await ctx.db.query("records").collect();
      const base = (p: string) => p.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") ?? p;
      const record =
        all.find((r) => r.externalId === id) ??
        all.find((r) => r.externalId === `file:${id}`) ??
        all.find((r) => r.path === id) ??
        all.find((r) => base(r.path) === id) ??
        all.find((r) => r.path.includes(id));
      if (record) {
        const body =
          record.data ??
          record.text ??
          { path: record.path, kind: record.kind };
        detail = {
          id,
          kind: record.path.startsWith("files/") ? "file" : record.kind,
          acct: record.accountId,
          deal: null,
          file: record.path,
          title: record.path.split("/").pop() ?? record.path,
          meta: `${record.kind} · ${record.path}`,
          claim:
            typeof body === "string"
              ? body.split("\n")[0].slice(0, 400)
              : `${record.path} — held on file.`,
          conf: "verified",
          payload: body,
          key: record.kind === "file" ? "path" : "text",
          path: record.path,
        };
      }
    }

    if (!detail) {
      const person = await ctx.db
        .query("people")
        .withIndex("by_externalId", (q) => q.eq("externalId", id))
        .first();
      if (person) {
        detail = {
          id,
          kind: "person",
          acct: person.accountId,
          deal: null,
          file: null,
          title: person.name,
          meta: `${person.role} · ${person.relationship}${person.available ? "" : " · unavailable"}`,
          claim: `${person.name}, ${person.role}. Relationship: ${person.relationship}.`,
          conf: "told",
          payload: person.raw,
          key: "relationship",
          path: null,
        };
      }
    }

    if (!detail) {
      const deal = await ctx.db
        .query("deals")
        .withIndex("by_externalId", (q) => q.eq("externalId", id))
        .first();
      if (deal) {
        detail = {
          id,
          kind: "deal",
          acct: deal.accountId,
          deal: deal.externalId,
          file: null,
          title: deal.title,
          meta: `${deal.stage}${deal.worthUpTo === null ? " · no value" : ` · ${deal.worthUpTo}`}`,
          claim: `${deal.title}. Stage: ${deal.stage}.`,
          conf: deal.worthUpTo === null ? "claim" : "verified",
          payload: deal.raw,
          key: "stage",
          path: null,
        };
      }
    }

    if (!detail) {
      const offer = await ctx.db
        .query("offers")
        .withIndex("by_externalId", (q) => q.eq("externalId", id))
        .first();
      if (offer) {
        detail = {
          id,
          kind: "offer",
          acct: offer.accountId,
          deal: null,
          file: null,
          title: offer.title,
          meta: `${offer.value} · ${offer.status}`,
          claim: offer.title,
          conf: "told",
          payload: offer.raw,
          key: "value",
          path: null,
        };
      }
    }

    if (!detail) {
      const signal = await ctx.db
        .query("signals")
        .withIndex("by_externalId", (q) => q.eq("externalId", id))
        .first();
      if (signal) {
        detail = {
          id,
          kind: "signal",
          acct: signal.accountId ?? null,
          deal: signal.linkedDealId ?? null,
          file: null,
          title: signal.summary.split(".")[0] ?? id,
          meta: `signal · ${signal.kind} · ${new Date(signal.at).toISOString().slice(0, 10)}`,
          claim: signal.summary,
          conf: "told",
          payload: signal.raw,
          key: "kind",
          path: null,
        };
      }
    }

    if (!detail) {
      const account = await ctx.db
        .query("accounts")
        .withIndex("by_externalId", (q) => q.eq("externalId", id))
        .first();
      if (account) {
        detail = {
          id,
          kind: "account",
          acct: account.externalId,
          deal: null,
          file: null,
          title: account.name,
          meta: account.officialStory ?? "",
          claim: account.officialStory ?? account.name,
          conf: "told",
          payload: account.raw,
          key: "name",
          path: null,
        };
      }
    }

    if (!detail) return null;

    const snaps = await ctx.db
      .query("snapshots")
      .withIndex("by_at")
      .order("desc")
      .take(20);
    const needle = `"${id}"`;
    const hit = snaps.find((s) => {
      try {
        return JSON.stringify(s.raw ?? "").includes(needle);
      } catch {
        return false;
      }
    });

    return {
      ...detail,
      tool: hit?.tool ?? "unknown",
      args: hit ? JSON.stringify(hit.args ?? {}) : "—",
      ingested: (hit ?? snaps[0])?.at ?? null,
      snapshot: snaps[0]?.at ?? null,
    };
  },
});
