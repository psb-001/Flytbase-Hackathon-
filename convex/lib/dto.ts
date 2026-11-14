/**
 * The only contract the UI knows.
 *
 * The UI never reads MCP field names and never computes a number. Everything
 * here is produced by convex/lib/rules/* from data already in our tables, and
 * every line carries the ids that back it.
 */

export type Stage = "identified" | "qualified" | "cleared" | "agreed";
export type Warmth = "guarded" | "neutral" | "warm" | "ally";
export type Bucket = "backed" | "claimed" | "unknown";
export type RoleName = "decider" | "payer" | "user" | "blocker";
export type RiskLane = "deadline" | "warmth" | "stall" | "signal";

/** One citable thing. `id` is always a real id from the payload. */
export type Evidence = {
  id: string;
  kind:
    | "fact"
    | "file"
    | "record"
    | "person"
    | "signal"
    | "offer"
    | "deal"
    | "account";
  label: string;
  quote: string;
  /** fact status, when this is a fact */
  status?: "claim" | "told" | "verified";
  saidBy?: string;
  /** where the drawer opens */
  path?: string;
};

export type Money = {
  amount: number | null;
  currency: string;
  /** pre-formatted for the UI, e.g. "GBP 200,000" or "no number" */
  display: string;
};

export type ValueLine = {
  id: string;
  title: string;
  stage: Stage;
  bucket: Bucket;
  money: Money;
  /** why it sits in this bucket, in one sentence */
  why: string;
  blocker: { text: string; status: string } | null;
  ownerId: string | null;
  evidence: Evidence[];
};

export type OfferLine = {
  id: string;
  title: string;
  status: "open" | "won" | "declined";
  money: Money;
  pitchTo: string | null;
  evidence: Evidence[];
};

export type BookAnswer = {
  /** never summed across accounts: the two accounts bill in different currencies */
  backed: { total: Money; lines: ValueLine[] };
  claimed: { total: Money; lines: ValueLine[] };
  unknown: { count: number; lines: ValueLine[]; neverScoped: string[] };
  offers: { open: OfferLine[]; declined: OfferLine[]; openTotal: Money };
  reconciliation: { sheetTotal: Money | null; note: string };
  headline: string;
};

export type RoleCell = {
  role: RoleName;
  /** null means we do not know — the UI must render the ask, never a name */
  personId: string | null;
  name: string | null;
  warmth: Warmth | null;
  /** what this person is waiting on from us */
  waitingOn: string | null;
  /** set only when personId is null */
  ask: string | null;
  why: string;
  evidence: Evidence[];
};

export type PowerDeal = {
  dealId: string;
  title: string;
  stage: Stage;
  money: Money;
  cells: RoleCell[];
};

export type PersonCard = {
  id: string;
  name: string;
  role: string;
  relationship: Warmth;
  available: boolean;
  /** deal ids this person appears against */
  deals: string[];
  lastContact: string | null;
  note: string | null;
  /** "roster" = on the account sheet; "fact" = spoke to us but is not on it */
  source: "roster" | "fact";
  evidence: Evidence[];
};

export type PowerAnswer = {
  deals: PowerDeal[];
  roster: PersonCard[];
  /** people we have heard from who are not on the account sheet */
  offRoster: PersonCard[];
  coverage: { filled: number; total: number; missing: number };
  headline: string;
  /** one line per person that matters, with the reason */
  powerHeldBy: { personId: string; name: string; why: string; evidence: Evidence[] }[];
};

export type MoveScore = {
  value: number;
  stage: number;
  blocker: number;
  urgency: number;
  total: number;
};

export type Move = {
  rank: number;
  action: string;
  dealId: string;
  dealTitle: string;
  ownerId: string;
  ownerName: string;
  /** the FlyBase role behind the owner id, from get_flytbase_team */
  ownerRole: string | null;
  /** ISO date */
  due: string;
  whyNow: string;
  /** the exact message to send, verbatim */
  ask: string;
  score: MoveScore;
  evidence: Evidence[];
};

export type MovesAnswer = {
  top: Move[];
  headline: string;
};

export type Risk = {
  id: string;
  lane: RiskLane;
  severity: 1 | 2 | 3;
  /** ISO date this stops being a warning and becomes a loss */
  turnsBadAt: string;
  /** true when that date is already behind us — the line has been crossed */
  passed: boolean;
  what: string;
  dealId: string | null;
  detector: string;
  evidence: Evidence[];
};

export type RiskAnswer = {
  lanes: Record<RiskLane, Risk[]>;
  count: number;
  headline: string;
  /** what each detector looked for and what it found — honesty about silence */
  detectorNotes: Record<RiskLane, string>;
};

export type Gap = {
  id: string;
  what: string;
  /** Q1..Q4 this gap weakens */
  blocks: ("book" | "power" | "moves" | "risk")[];
  /** the exact question to ask, in one sentence */
  ask: string;
  /** the real id that would fill it */
  fillerId: string | null;
  why: string;
  evidence: Evidence[];
};

export type GapsAnswer = {
  items: Gap[];
  headline: string;
};

export type Answer = {
  accountId: string;
  accountName: string;
  officialStory: string | null;
  currency: string;
  asOf: string;
  worldClosed: boolean;
  book: BookAnswer;
  power: PowerAnswer;
  moves: MovesAnswer;
  risk: RiskAnswer;
  gaps: GapsAnswer;
};

export type Portfolio = {
  generatedAt: number;
  asOf: string;
  accounts: Answer[];
  signals: {
    id: string;
    accountId: string | null;
    /** ISO date the event is dated, which can be ahead of asOf */
    dated: string;
    /** exact moment the signal landed, ISO */
    at: string;
    title: string;
    summary: string;
    kind: string;
    read: boolean;
    linkedDealId: string | null;
    /** the field that changed, when the signal is a diff */
    before: string | null;
    after: string | null;
    evidence: Evidence[];
    /** what the signal changes in the answers, in the rules' own words */
    touches: string[];
  }[];
  /** every MCP payload this store was built from, newest first */
  ingest: {
    tool: string;
    args: string;
    at: number;
    ok: boolean;
  }[];
  /** the honest answer to "is anything still moving?" */
  liveness: {
    worldClosed: boolean;
    minute: number | null;
    queued: number;
    lastCallAt: number | null;
    says: string;
  };
};
