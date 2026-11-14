/**
 * Shapes the UI renders.
 *
 * These mirror Figma Make's `data.ts` one-for-one so `ui.tsx`, `screens.tsx` and
 * `overlays.tsx` need no changes. The difference is where the values come from:
 * `build.ts` fills them from `queries.portfolio`, never from literals.
 */

export type Warmth = "guarded" | "neutral" | "warm" | "ally";
export type Conf = "claim" | "told" | "verified";
export type Stage = "identified" | "qualified" | "cleared" | "agreed";
export type Role = "decider" | "payer" | "user" | "blocker";
/** The brief's four detectors. */
export type Lane = "deadline" | "warmth" | "stall" | "signal";
export type Sev = "low" | "med" | "high";
/** Backed / Claimed / Unknown. Never one total. */
export type Bucket = "backed" | "claimed" | "unknown";

export type Account = {
  id: string;
  name: string;
  short: string;
  currency: string;
};

export type Person = {
  id: string;
  name: string;
  title: string;
  acct: string;
  warmth: Warmth | null;
  met: boolean;
  last: string;
  lastFact: string;
  deals: string[];
  /** set when the only record of this person is something they told us */
  offRoster?: boolean;
};

export type RoleCell = {
  person: string;
  waiting?: string;
};

export type Deal = {
  id: string;
  name: string;
  acct: string;
  stage: Stage | null;
  worth: number | null;
  currency: string;
  backedBy: string[];
  worthFact?: string;
  deadline: { label: string; src: string } | null;
  owner: string | null;
  unbacked: boolean;
  bucket: Bucket;
  notCounted?: string;
  /** why it sits in this bucket, one sentence */
  why: string;
  roles: Partial<Record<Role, RoleCell>>;
  /** the person to ask about the emptiest seat, or "" */
  ask: string;
  /** the exact question for the emptiest seat, when the rules produced one */
  askQuestion?: string;
};

export type Move = {
  id: string;
  g: number;
  acct: string;
  deal: string | null;
  action: string;
  due: string;
  /** ISO date, for anything that needs to compare */
  dueISO: string;
  mustBeat: string;
  why: string;
  evidence: string[];
  ask: string;
  owner: string;
  ownerRole: string | null;
};

export type Risk = {
  id: string;
  lane: Lane;
  sev: Sev;
  days: number;
  day: number;
  acct: string;
  /** null for an account-level risk that is not attached to a deal */
  deal: string | null;
  what: string;
  defuse: string | null;
  evidence: string[];
  /** ISO date the line is crossed */
  turnsBadAt: string;
  /** true when that date is already behind us */
  passed: boolean;
};

export type Gap = {
  id: string;
  block: "book" | "power" | "moves" | "risk";
  acct: string;
  /** the deal this gap blocks, when the rule knows it */
  deal: string | null;
  what: string;
  why: string;
  who: string | null;
  q: string;
};

export type SignalDiff = { field: string; before: string; after: string };

export type Signal = {
  id: string;
  at: string;
  atISO: string;
  acct: string;
  deal: string | null;
  kind: string;
  text: string;
  diff?: SignalDiff;
  moves: string[];
  src: string;
};

export type Source = {
  id: string;
  kind: string;
  acct: string;
  deal?: string;
  file?: string;
  claim: string;
  conf: Conf;
  payload: unknown;
  key: string;
  tool: string;
  args: string;
  ingested: string;
  snap: string;
};

export type Snapshot = { id: string; time: string; age: number };

export type Total = {
  currency: string;
  backed: number;
  claimed: number;
  unknownCount: number;
  openOffers: number;
  offers: number;
};

export type Note = {
  id: string;
  kind: string;
  text: string;
  attach: string;
  at: string;
  status?: string;
};

export type Offer = {
  id: string;
  title: string;
  status: "open" | "won" | "declined";
  amount: number | null;
  currency: string;
  pitchTo: string | null;
  evidence: string[];
};

export type Data = {
  accounts: Account[];
  offers: Offer[];
  deals: Deal[];
  moves: Move[];
  risks: Risk[];
  gaps: Gap[];
  people: Person[];
  signals: Signal[];
  sources: Record<string, Source>;
  snapshots: Snapshot[];
  totals: Record<string, Total>;
  asOf: string;
  asOfLabel: string;
  worldClosed: boolean;
  minute: number | null;
  ingest: { tool: string; args: string; at: number; ok: boolean }[];
  clear: string[];
  assumptions: Record<string, string[]>;
  headline: Record<string, string>;
  /** what each Q4 detector looked for, per account */
  detectors: Record<string, Record<Lane, string>>;
  powerHeadline: Record<string, string>;
  riskHeadline: Record<string, string>;
  /** "power sits with" lines, already argued from records */
  powerHeld: Record<string, { id: string; name: string; why: string; evidence: string[] }[]>;
  gapHeadline: Record<string, string>;
};
