import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { Evidence } from "./dto";

/** Everything we know about one account, already modelled into our own tables. */
export type AccountView = {
  account: Doc<"accounts">;
  people: Doc<"people">[];
  deals: Doc<"deals">[];
  facts: Doc<"facts">[];
  offers: Doc<"offers">[];
  deadlines: Doc<"deadlines">[];
  records: Doc<"records">[];
  signals: Doc<"signals">[];
  /** FlyBase colleagues, from get_flytbase_team. Owners of moves must be one of these. */
  team: { id: string; name: string; role: string }[];
  currency: string;
  asOf: string;
};

export type PortfolioView = {
  accounts: AccountView[];
  signals: Doc<"signals">[];
  asOf: string;
};

// ---------------------------------------------------------------------------
// Dates: everything is anchored to the export, never to wall-clock time, so
// the same payload always produces the same answer.
// ---------------------------------------------------------------------------

export const iso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Money: two accounts, two currencies. Never add them together.
// ---------------------------------------------------------------------------

export function formatMoney(amount: number | null, currency: string): string {
  if (amount === null) return "no number";
  return `${currency} ${amount
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export const money = (amount: number | null, currency: string) => ({
  amount,
  currency,
  display: formatMoney(amount, currency),
});

// ---------------------------------------------------------------------------
// Evidence index: every citation resolves to something real, or it is dropped.
// ---------------------------------------------------------------------------

export type EvidenceIndex = ReturnType<typeof buildIndex>;

export function buildIndex(view: AccountView) {
  const facts = new Map(view.facts.map((f) => [f.externalId, f]));
  const records = new Map(view.records.map((r) => [r.externalId, r]));
  const people = new Map(view.people.map((p) => [p.externalId, p]));
  const offers = new Map(view.offers.map((o) => [o.externalId, o]));
  const deals = new Map(view.deals.map((d) => [d.externalId, d]));
  const signals = new Map(view.signals.map((s) => [s.externalId, s]));

  const snippet = (text: string | undefined, max = 160) => {
    if (!text) return "";
    const line = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    if (!line) return "";
    return line.length > max ? `${line.slice(0, max - 1)}…` : line;
  };

  function record(id: string): Evidence | null {
    const row = records.get(id) ?? records.get(`file:${id}`);
    if (!row) return null;
    return {
      id: row.externalId.startsWith("file:") ? row.externalId.slice(5) : id,
      kind: row.kind === "file" ? "file" : "record",
      label: row.path,
      quote:
        row.kind === "file"
          ? snippet(
              row.text ??
                (typeof row.data === "object" && row.data
                  ? String((row.data as Record<string, unknown>).text ?? "")
                  : ""),
              120,
            ) || "file on record"
          : `${row.kind.replace(/_/g, " ")} on record`,
      path: row.path,
    };
  }

  /** Resolve any id we might cite. Unknown ids return null and are dropped. */
  function one(id: string): Evidence | null {
    const fact = facts.get(id);
    if (fact) {
      return {
        id: fact.externalId,
        kind: "fact",
        label: `${fact.saidBy} · ${fact.status}`,
        quote: fact.text,
        status: fact.status,
        saidBy: fact.saidBy,
        path: fact.verifiedBy,
      };
    }

    const signal = signals.get(id);
    if (signal) {
      return {
        id: signal.externalId,
        kind: "signal",
        label: `signal · ${signal.kind.replace(/_/g, " ")}`,
        quote: signal.summary,
        path: undefined,
      };
    }

    const person = people.get(id);
    if (person) {
      return {
        id: person.externalId,
        kind: "person",
        label: person.name,
        quote: `${person.role} · ${person.relationship}${
          person.available ? "" : " · unavailable"
        }`,
      };
    }

    const deal = deals.get(id);
    if (deal) {
      return {
        id: deal.externalId,
        kind: "deal",
        label: deal.title,
        quote: `${deal.stage}${
          deal.worthUpTo === null
            ? " · no value"
            : ` · ${formatMoney(deal.worthUpTo, view.currency)}`
        }`,
      };
    }

    const offer = offers.get(id);
    if (offer) {
      return {
        id: offer.externalId,
        kind: "offer",
        label: offer.title,
        quote: `${formatMoney(offer.value, view.currency)} · ${offer.status}${
          offer.pitchTo ? ` · pitched to ${offer.pitchTo}` : ""
        }`,
      };
    }

    return record(id);
  }

  function many(ids: string[]): Evidence[] {
    const seen = new Set<string>();
    const out: Evidence[] = [];
    for (const id of ids) {
      if (!id || seen.has(id)) continue;
      const found = one(id);
      if (!found) continue;
      seen.add(id);
      out.push(found);
    }
    return out;
  }

  /** The account-level paperwork we lean on. */
  function kind(kindName: string): Doc<"records"> | null {
    return (
      view.records.find((r) => r.kind === kindName && r.accountId === view.account.externalId) ??
      null
    );
  }

  return { facts, records, people, offers, deals, signals, one, many, kind, record };
}

/** Pull the typed body of a paperwork record. */
export function dataOf<T = Record<string, unknown>>(
  row: Doc<"records"> | null,
): T | null {
  if (!row || typeof row.data !== "object" || row.data === null) return null;
  return row.data as T;
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export async function loadPortfolio(ctx: QueryCtx): Promise<PortfolioView> {
  const accounts = await ctx.db.query("accounts").collect();
  accounts.sort((a, b) => a.externalId.localeCompare(b.externalId));

  const signals = await ctx.db.query("signals").collect();
  signals.sort((a, b) => a.at - b.at);

  const teamRow = await ctx.db
    .query("records")
    .withIndex("by_externalId", (q) => q.eq("externalId", "ref:team"))
    .first();
  const team =
    teamRow && typeof teamRow.data === "object" && teamRow.data !== null
      ? ((teamRow.data as { people?: { id: string; name: string; role: string }[] })
          .people ?? [])
      : [];

  const asOf =
    accounts[0]?.raw && typeof accounts[0].raw === "object"
      ? String(
          (accounts[0].raw as Record<string, unknown>).exported_at ??
            iso(new Date()),
        ).slice(0, 10)
      : iso(new Date());

  const views: AccountView[] = [];
  for (const account of accounts) {
    const id = account.externalId;
    const [people, deals, facts, offers, deadlines, records] = await Promise.all([
      ctx.db.query("people").withIndex("by_account", (q) => q.eq("accountId", id)).collect(),
      ctx.db.query("deals").withIndex("by_account", (q) => q.eq("accountId", id)).collect(),
      ctx.db.query("facts").withIndex("by_account", (q) => q.eq("accountId", id)).collect(),
      ctx.db.query("offers").withIndex("by_account", (q) => q.eq("accountId", id)).collect(),
      ctx.db.query("deadlines").withIndex("by_account", (q) => q.eq("accountId", id)).collect(),
      ctx.db.query("records").withIndex("by_account", (q) => q.eq("accountId", id)).collect(),
    ]);

    views.push({
      account,
      people,
      deals,
      facts,
      offers,
      deadlines,
      records,
      signals: signals.filter((s) => s.accountId === id),
      team,
      currency: account.currency ?? "GBP",
      asOf,
    });
  }

  return { accounts: views, signals, asOf };
}
