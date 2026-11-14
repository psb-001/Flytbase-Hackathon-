/**
 * The module the Figma components import from.
 *
 * The original `data.ts` was a hard-coded fictional world. This one starts
 * empty and is filled by `hydrate()` from `queries.portfolio`, which is built
 * only from MCP payloads already stored in Convex. Nothing here is a literal
 * business fact — the only literals are the empty shapes and the fallbacks
 * that say "Unknown".
 *
 * Arrays are mutated in place so module imports stay live: the app shell
 * re-renders after hydrate, and every component reads the same references.
 */

import { money } from "./build";
import type {
  Account,
  Conf,
  Data,
  Deal,
  Gap,
  Lane,
  Move,
  Offer,
  Person,
  Risk,
  Role,
  Sev,
  Signal,
  Source,
  Stage,
  Warmth,
} from "./types";

export * from "./types";
export { money };

/** Filled from `portfolio.asOfLabel`; a live ESM binding. */
export let AS_OF = "—";

export const ACCOUNTS: Account[] = [];
export const OFFERS: Offer[] = [];
export const DEALS: Deal[] = [];
export const MOVES: Move[] = [];
export const RISKS: Risk[] = [];
export const GAPS: Gap[] = [];
export const PEOPLE: Person[] = [];
export const SIGNALS: Signal[] = [];
export const SOURCES: Record<string, Source> = {};
export const SNAPSHOTS: { id: string; time: string; age: number }[] = [];
export const CLEAR: string[] = [];
export const ASSUMPTIONS: Record<string, string[]> = {};
export const HEADLINE: Record<string, string> = {};
export const DETECTORS: Record<string, Record<Lane, string>> = {};
export const POWER_HEADLINE: Record<string, string> = {};
export const RISK_HEADLINE: Record<string, string> = {};
export const POWER_HELD: Record<string, { id: string; name: string; why: string; evidence: string[] }[]> = {};
export const GAP_HEADLINE: Record<string, string> = {};
/** Every MCP payload the store was built from, newest first. */
export const INGEST: { tool: string; args: string; at: number; ok: boolean }[] = [];
export const TOTALS: Record<string, { currency: string; backed: number; claimed: number; unknownCount: number; openOffers: number; offers: number }> = {};

export const ROLES: Role[] = ["decider", "payer", "user", "blocker"];

const reset = <T>(target: T[], next: T[]) => {
  target.length = 0;
  target.push(...next);
};

const resetRecord = <T>(target: Record<string, T>, next: Record<string, T>) => {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, next);
};

/** One call per portfolio update. Mutates in place so imports stay live. */
export function hydrate(data: Data): void {
  AS_OF = data.asOfLabel;
  reset(ACCOUNTS, data.accounts);
  reset(OFFERS, data.offers);
  reset(DEALS, data.deals);
  reset(MOVES, [...data.moves].sort((a, b) => a.g - b.g));
  reset(RISKS, data.risks);
  reset(GAPS, data.gaps);
  reset(PEOPLE, data.people);
  reset(SIGNALS, data.signals);
  reset(SNAPSHOTS, data.snapshots);
  reset(CLEAR, data.clear);
  resetRecord(SOURCES, data.sources);
  resetRecord(ASSUMPTIONS, data.assumptions);
  resetRecord(HEADLINE, data.headline);
  resetRecord(DETECTORS, data.detectors);
  resetRecord(POWER_HEADLINE, data.powerHeadline);
  resetRecord(RISK_HEADLINE, data.riskHeadline);
  resetRecord(POWER_HELD, data.powerHeld);
  resetRecord(GAP_HEADLINE, data.gapHeadline);
  reset(INGEST, data.ingest);
  resetRecord(
    TOTALS,
    Object.fromEntries(
      Object.entries(data.totals).map(([k, v]) => [k, v]),
    ),
  );
}

/** True once real data has landed; the shell shows a skeleton until then. */
export let READY = false;
let version = 0;
const listeners = new Set<() => void>();

export function markReady(): void {
  READY = true;
  version += 1;
  for (const l of listeners) l();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getVersion = () => version;

export const acctName = (id: string): string =>
  ACCOUNTS.find((a) => a.id === id)?.short ?? "Both accounts";

export const coverage = (d: Deal): number => ROLES.filter((r) => d.roles[r]).length;

/** Never returns undefined: an unknown id renders as Unknown, not a crash. */
export function deal(id: string): Deal {
  return (
    DEALS.find((d) => d.id === id) ?? {
      id: id || "unknown",
      name: "Unknown deal",
      acct: "both",
      stage: null,
      worth: null,
      currency: "",
      backedBy: [],
      deadline: null,
      owner: null,
      unbacked: true,
      bucket: "unknown",
      why: "No deal with this id is in the store.",
      roles: {},
      ask: "",
    }
  );
}

const UNKNOWN_PERSON: Person = {
  id: "",
  name: "Unknown",
  title: "no person on file",
  acct: "both",
  warmth: null,
  met: false,
  last: "No contact on record",
  lastFact: "",
  deals: [],
};

export const person = (id: string | null | undefined): Person =>
  (id ? PEOPLE.find((p) => p.id === id) : null) ?? UNKNOWN_PERSON;

export const source = (id: string): Source =>
  SOURCES[id] ?? {
    id,
    kind: "unknown",
    acct: "both",
    claim: `No record is held for ${id}.`,
    conf: "claim",
    payload: { id },
    key: "id",
    tool: "none",
    args: id,
    ingested: "—",
    snap: "",
  };

export type { Account, Conf, Data, Deal, Gap, Lane, Move, Offer, Person, Risk, Role, Sev, Signal, Source, Stage, Warmth };
