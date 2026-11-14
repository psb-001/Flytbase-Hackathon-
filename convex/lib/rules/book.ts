import type { BookAnswer, Bucket, OfferLine, ValueLine } from "../dto";
import {
  type AccountView,
  buildIndex,
  dataOf,
  formatMoney,
  money,
} from "../view";

type Profile = {
  currency?: string;
  renewal?: { term_ends?: string; annual_value?: number };
  not_on_file?: string[];
};

type DealHistory = {
  on_file_as_open_at_handover?: {
    what: string;
    value: number | null;
    due?: string;
    basis?: string;
  }[];
};

const STOP = new Set([
  "the", "of", "and", "for", "up", "to", "a", "an", "at", "in", "on",
  "dock", "docks", "contract", "renew", "renewal", "new", "our",
]);

const tokens = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w)),
  );

const overlaps = (a: Set<string>, b: Set<string>) => {
  for (const token of a) if (b.has(token)) return true;
  return false;
};

/**
 * Q1. Three buckets, never one number.
 *
 * A value is *backed* only when the opportunity has reached `qualified` or
 * better — the export itself refuses to carry a value before that. A number we
 * can name but the stage does not support is *claimed*. An opportunity nobody
 * has ever put a number on is *unheard of*; it is never shown as zero.
 */
export function book(view: AccountView): BookAnswer {
  const idx = buildIndex(view);
  const currency = view.currency;
  const profileRow = idx.kind("profile");
  const profile = dataOf<Profile>(profileRow);
  const history = dataOf<DealHistory>(idx.kind("deal_history"));

  const lines: ValueLine[] = view.deals.map((deal) => {
    const isRenewal = /renew/i.test(deal.title);
    const contractValue = isRenewal
      ? profile?.renewal?.annual_value ?? null
      : null;
    const amount = deal.worthUpTo ?? contractValue;

    let bucket: Bucket;
    let why: string;
    if (deal.stage === "identified" && amount === null) {
      bucket = "unknown";
      why = "No number has ever been put on this opportunity.";
    } else if (deal.stage === "identified") {
      bucket = "claimed";
      why = `The contract is on file at ${formatMoney(
        amount,
        currency,
      )} a year, but the opportunity is still \`identified\` — labelled, not summed.`;
    } else {
      bucket = "backed";
      why = `Stage is \`${deal.stage}\`, so the export carries a value. ${
        deal.blocker?.status === "open"
          ? "The blocker is still open: backed, not safe."
          : "No open blocker."
      }`;
    }

    const evidenceIds = [...deal.evidence];
    if (isRenewal && profileRow) evidenceIds.push(profileRow.externalId);

    return {
      id: deal.externalId,
      title: deal.title,
      stage: deal.stage,
      bucket,
      money: money(amount, currency),
      why,
      blocker: deal.blocker ?? null,
      ownerId: null,
      evidence: idx.many(evidenceIds),
    };
  });

  const byAmount = (a: ValueLine, b: ValueLine) =>
    (b.money.amount ?? -1) - (a.money.amount ?? -1);

  const backedLines = lines.filter((l) => l.bucket === "backed").sort(byAmount);
  const claimedLines = lines.filter((l) => l.bucket === "claimed").sort(byAmount);
  const unknownLines = lines.filter((l) => l.bucket === "unknown");

  const sum = (ls: ValueLine[]) =>
    ls.reduce((total, line) => total + (line.money.amount ?? 0), 0);

  // Paperwork that names money but never became an opportunity.
  const dealTokens = view.deals.map((d) => tokens(d.title));
  const neverScoped = (history?.on_file_as_open_at_handover ?? [])
    .filter((entry) => entry.value === null)
    .filter((entry) => {
      const t = tokens(entry.what);
      return !dealTokens.some((d) => overlaps(d, t));
    })
    .map((entry) => `${entry.what} — ${entry.basis ?? "no value on file"}`);

  const offers: OfferLine[] = view.offers
    .map((offer) => ({
      id: offer.externalId,
      title: offer.title,
      status: offer.status,
      money: money(offer.value, currency),
      pitchTo: offer.pitchTo ?? null,
      evidence: idx.many([offer.externalId]),
    }))
    .sort((a, b) => (b.money.amount ?? 0) - (a.money.amount ?? 0));

  const openOffers = offers.filter((o) => o.status === "open");
  const declinedOffers = offers.filter((o) => o.status === "declined");

  const sheetTotal = profile?.renewal?.annual_value ?? null;
  const backedTotal = sum(backedLines);
  const claimedTotal = sum(claimedLines);

  const facts = view.facts;
  const savingsFact = facts.find((f) => /1\.2 million/i.test(f.text));

  const parts: string[] = [];
  if (backedLines.length)
    parts.push(`${formatMoney(backedTotal, currency)} backed`);
  if (claimedLines.length)
    parts.push(`${formatMoney(claimedTotal, currency)} claimed`);
  if (unknownLines.length)
    parts.push(
      `${unknownLines.length} opportunit${unknownLines.length === 1 ? "y" : "ies"} with no number`,
    );

  const noteBits: string[] = [];
  if (sheetTotal !== null) {
    noteBits.push(
      `The account sheet carries ${formatMoney(
        sheetTotal,
        currency,
      )} a year. We back ${formatMoney(backedTotal, currency)}${
        claimedTotal > 0
          ? ` and label ${formatMoney(claimedTotal, currency)} as claimed`
          : ""
      }.`,
    );
  }
  if (savingsFact) {
    noteBits.push(
      "The savings figure in the account's own story is not in the book: no working is on file and the person who pays has never seen it.",
    );
  }
  if (openOffers.length) {
    const total = openOffers.reduce((t, o) => t + (o.money.amount ?? 0), 0);
    noteBits.push(
      `${openOffers.length} open offer${openOffers.length === 1 ? "" : "s"} worth ${formatMoney(
        total,
        currency,
      )} ${openOffers.length === 1 ? "sits" : "sit"} outside the book — nobody has accepted ${
        openOffers.length === 1 ? "it" : "them"
      }.`,
    );
  }

  return {
    backed: { total: money(backedTotal, currency), lines: backedLines },
    claimed: { total: money(claimedTotal, currency), lines: claimedLines },
    unknown: {
      count: unknownLines.length,
      lines: unknownLines,
      neverScoped,
    },
    offers: {
      open: openOffers,
      declined: declinedOffers,
      openTotal: money(
        openOffers.reduce((t, o) => t + (o.money.amount ?? 0), 0),
        currency,
      ),
    },
    reconciliation: {
      sheetTotal: sheetTotal === null ? null : money(sheetTotal, currency),
      note: noteBits.join(" "),
    },
    headline: parts.length ? parts.join(" · ") : "No money has been named on this account.",
  };
}
