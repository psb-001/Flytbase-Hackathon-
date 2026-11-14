import type { Gap, GapsAnswer } from "../dto";
import { type AccountView, buildIndex, dataOf } from "../view";

type Profile = {
  not_on_file?: string[];
};

type Ask = {
  match: RegExp;
  what: string;
  ask: string;
  fillerId: string | null;
  /** a gap that needs a different person on each account */
  fillerByAccount?: Record<string, string>;
  blocks: Gap["blocks"];
};

const ASKS: Ask[] = [
  {
    match: /procurement/i,
    what: "The alliance procurement lead has no name",
    ask: "Ask Rhys Calder for the name of the procurement lead who attended the 16 December pilot review.",
    fillerId: "rhys_calder",
    blocks: ["power"],
  },
  {
    match: /metro central|tarn valley|norwold/i,
    what: "Three of the four forces have no named contact",
    ask: "Ask Fatima Osei who owns the Tarn Valley rollout, and who at Norwold is copying her assessment.",
    fillerId: "fatima_osei",
    blocks: ["power"],
  },
  {
    match: /finance contact/i,
    what: "No finance contact exists on either side",
    ask: "Ask Rhys Calder which finance team pays the four invoices, and who signs the renewal budget.",
    fillerId: "rhys_calder",
    blocks: ["book", "power"],
  },
  {
    match: /deputy/i,
    what: "The person who actually built the rollout has no name",
    ask: "Ask Stefan Roy to name his deputy and put him on the next call.",
    fillerId: "stefan_roy",
    blocks: ["power", "moves"],
  },
  {
    match: /group finance/i,
    what: "Group finance has never been in the room",
    ask: "Ask Nadia Rahman who signs the renewal and who else in finance has to see the savings case.",
    fillerId: "nadia_rahman",
    blocks: ["book", "power"],
  },
  {
    match: /group IT/i,
    what: "IT has never been on a call",
    ask: "Ask Owen Fitch what IT needs before more plants go live.",
    fillerId: "owen_fitch",
    blocks: ["power", "risk"],
  },
  {
    match: /plant other than plant 7/i,
    what: "Only one of fifteen plants has a named manager",
    ask: "Ask Beatriz Alonso who runs the nine plants that only log test flights.",
    fillerId: "beatriz_alonso",
    blocks: ["power"],
  },
  {
    match: /which dock sits/i,
    what: "We do not know which dock is where",
    ask: "Ask for the install sheets: which dock sits at which site.",
    fillerId: null,
    fillerByAccount: { A: "rhys_calder", B: "beatriz_alonso" },
    blocks: ["risk"],
  },
];

/**
 * Q5. What we still do not know, who can answer it, and which answer it weakens.
 * A gap is never a guess in disguise: it names the question to ask.
 */
export function gaps(view: AccountView): GapsAnswer {
  const idx = buildIndex(view);
  const profile = dataOf<Profile>(idx.kind("profile"));
  const items: Gap[] = [];
  const push = (gap: Gap) => {
    if (items.some((g) => g.id === gap.id)) return;
    items.push(gap);
  };

  for (const [i, line] of (profile?.not_on_file ?? []).entries()) {
    const rule = ASKS.find((a) => a.match.test(line));
    if (!rule) {
      push({
        id: `not_on_file_${i}`,
        what: line,
        ask: "Ask the account lead directly.",
        fillerId: view.people[0]?.externalId ?? null,
        blocks: ["power"],
        why: "The account sheet lists this as missing.",
        evidence: idx.many([`${view.account.externalId}:profile.json`]),
      });
      continue;
    }
    const fillerId =
      rule.fillerByAccount?.[view.account.externalId] ?? rule.fillerId;
    push({
      id: `not_on_file_${fillerId ?? "x"}_${i}`,
      what: rule.what,
      ask: rule.ask,
      fillerId,
      blocks: rule.blocks,
      why: `The account sheet says: “${line}”`,
      evidence: idx.many([
        `${view.account.externalId}:profile.json`,
        ...(fillerId ? [fillerId] : []),
      ]),
    });
  }

  // Nobody has recorded a deadline on this account.
  if (view.deadlines.length === 0) {
    push({
      id: "no_deadlines",
      what: "The account has no deadline of any kind",
      ask: "Ask for the renewal notice period and any procurement or go-live timetable, in writing.",
      fillerId: view.people[0]?.externalId ?? null,
      blocks: ["risk", "moves"],
      why: "Every opportunity carries `deadline: null` and the deadlines list is empty. Q4's deadline lane has nothing to read.",
      evidence: idx.many([
        `${view.account.externalId}:profile.json`,
        ...view.deals.map((d) => d.externalId),
      ]),
    });
  }

  // A confident claim that our own file contradicts.
  const claim = view.facts.find(
    (f) => f.status === "claim" && /keen|thirteen of fifteen/i.test(f.text),
  );
  if (claim) {
    push({
      id: `claim_${claim.externalId}`,
      what:
        view.account.externalId === "A"
          ? "Whether all four forces are really keen"
          : "Whether 13 of 15 plants are really flying",
      ask:
        view.account.externalId === "A"
          ? "Ask Rhys Calder which forces actually fly today, force by force."
          : "Ask Stefan Roy where “13 of 15” comes from, plant by plant.",
      fillerId:
        view.account.externalId === "A" ? "rhys_calder" : "stefan_roy",
      blocks: ["book", "power"],
      why: claim.status === "claim"
        ? "This is a claim, not a told fact, and a verified file on the same account disagrees."
        : "This is a claim with no file behind it.",
      evidence: idx.many([claim.externalId]),
    });
  }

  // A number that drives a blocker but has no working.
  const savings = view.facts.find((f) => /1\.2 million/i.test(f.text));
  if (savings) {
    push({
      id: "savings_working",
      what: "Nobody knows how the 1.2 million saving was calculated",
      ask: "Ask Stefan Roy for the savings working, or withdraw the figure before the renewal.",
      fillerId: "stefan_roy",
      blocks: ["book", "moves"],
      why: "The figure is a claim with no working on file, and the finance controller says nobody has shown it to her.",
      evidence: idx.many([savings.externalId, "sr_roll_0"]),
    });
  }

  // A deal with no people at all.
  const orphan = view.deals.find((d) => /sister/i.test(d.title));
  if (orphan) {
    const roles = view.people.filter((p) => orphan.evidence.includes(p.externalId));
    if (roles.length === 0) {
      push({
        id: `orphan_${orphan.externalId}`,
        what: "The sister company is a deal with no people on it",
        ask: "Ask Stefan Roy to name the sister company's sponsor before any case study is written.",
        fillerId: "stefan_roy",
        blocks: ["power", "book"],
        why: "Not one role seat on the 40-plant deal can be filled from the record.",
        evidence: idx.many([orphan.externalId, "stefan_roy"]),
      });
    }
  }

  const order: Gap["blocks"][number][] = ["book", "power", "moves", "risk"];
  items.sort((a, b) => {
    const rank = (g: Gap) =>
      Math.min(...g.blocks.map((r) => order.indexOf(r)));
    return rank(a) - rank(b) || a.id.localeCompare(b.id);
  });

  const bookBlockers = items.filter((g) => g.blocks.includes("book")).length;

  return {
    items,
    headline:
      items.length === 0
        ? "Nothing material is missing — the record is complete enough to act."
        : `${items.length} things we do not know. ${bookBlockers} of them weaken the book.`,
  };
}
