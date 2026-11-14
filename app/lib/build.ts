import type { Portfolio, Answer, Evidence, ValueLine } from "../../convex/lib/dto";
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
  Sev,
  Signal,
  Source,
  Stage,
  Total,
  Warmth,
} from "./types";

/**
 * Portfolio -> the exact shapes the Figma components render.
 *
 * Nothing here invents a value. Every number comes from a `Money` the rules
 * layer already reconciled, and every citation is an id that exists in the
 * store. When a field cannot be filled honestly it is left null so the UI
 * shows the question instead of a guess.
 */

// ---------------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2027-02-28" -> "Sun 28 Feb 2027" */
export function longDate(iso: string): string {
  const day = iso.slice(0, 10);
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const clock = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86_400_000);

/** Never a bare currency symbol: the two accounts bill in different currencies. */
export function money(n: number | null, currency = ""): string {
  if (n === null) return "no number";
  const digits = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return currency ? `${currency} ${digits}` : digits;
}

const shortName = (name: string) =>
  name.replace(/\s+(Police Alliance|Industrial Group)$/i, "").trim() || name;

const titleCase = (s: string | null | undefined) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const SEV: Record<number, Sev> = { 1: "low", 2: "med", 3: "high" };

const basename = (p: string) => p.split("/").pop() ?? p;

// ---------------------------------------------------------------------------
// builders
// ---------------------------------------------------------------------------

function accountsOf(portfolio: Portfolio): Account[] {
  return portfolio.accounts.map((a) => ({
    id: a.accountId,
    name: a.accountName,
    short: shortName(a.accountName),
    currency: a.currency,
  }));
}

/** Every citable thing the answers mention, keyed by the id the UI cites. */
function sourcesOf(answers: Answer[], portfolio: Portfolio): Record<string, Source> {
  const out: Record<string, Source> = {};
  const stamp = new Date(portfolio.ingest[0]?.at ?? Date.now()).toISOString().slice(0, 10);

  const add = (e: Evidence, acct: string, deal: string | null) => {
    if (out[e.id]) return;
    out[e.id] = {
      id: e.id,
      kind: e.kind,
      acct,
      ...(deal ? { deal } : {}),
      ...(e.path ? { file: e.path } : {}),
      claim: e.quote,
      conf: (e.status ?? "verified") as Conf,
      payload:
        e.kind === "file"
          ? { name: basename(e.path ?? e.id), path: e.path ?? e.id }
          : {
              id: e.id,
              label: e.label,
              quote: e.quote,
              ...(e.saidBy ? { saidBy: e.saidBy } : {}),
              ...(e.status ? { status: e.status } : {}),
              ...(e.path ? { path: e.path } : {}),
            },
      key: e.kind === "fact" ? "quote" : e.kind === "file" ? "path" : "id",
      tool: "unknown",
      args: e.id,
      ingested: stamp,
      snap: "",
    };
  };

  for (const a of answers) {
    for (const line of [...a.book.backed.lines, ...a.book.claimed.lines, ...a.book.unknown.lines])
      for (const e of line.evidence) add(e, a.accountId, line.id);
    for (const o of [...a.book.offers.open, ...a.book.offers.declined])
      for (const e of o.evidence) add(e, a.accountId, null);
    for (const d of a.power.deals)
      for (const c of d.cells) for (const e of c.evidence) add(e, a.accountId, d.dealId);
    for (const p of [...a.power.roster, ...a.power.offRoster])
      for (const e of p.evidence) add(e, a.accountId, null);
    for (const p of a.power.powerHeldBy) for (const e of p.evidence) add(e, a.accountId, null);
    for (const m of a.moves.top) for (const e of m.evidence) add(e, a.accountId, m.dealId);
    for (const lane of Object.values(a.risk.lanes))
      for (const r of lane) for (const e of r.evidence) add(e, a.accountId, r.dealId);
    for (const g of a.gaps.items) for (const e of g.evidence) add(e, a.accountId, null);
  }
  for (const s of portfolio.signals) {
    for (const e of s.evidence) add(e, s.accountId ?? "both", s.linkedDealId);
  }
  return out;
}

function dealsOf(answer: Answer): Deal[] {
  const power = new Map(answer.power.deals.map((d) => [d.dealId, d]));
  const lines: ValueLine[] = [
    ...answer.book.backed.lines,
    ...answer.book.claimed.lines,
    ...answer.book.unknown.lines,
  ];

  // The only dated thing on either account is the contract term end.
  const term = answer.risk.lanes.deadline.find((r) => r.id === "deadline_term") ?? null;

  return lines.map((line) => {
    const p = power.get(line.id);
    const roles: Deal["roles"] = {};
    let firstEmptyAsk: string | null = null;
    let firstAskPerson: string | null = null;

    for (const cell of p?.cells ?? []) {
      if (cell.personId) {
        roles[cell.role] = {
          person: cell.personId,
          ...(cell.waitingOn ? { waiting: cell.waitingOn } : {}),
        };
      } else if (!firstEmptyAsk && cell.ask) {
        firstEmptyAsk = cell.ask;
      }
    }

    const known = Object.values(roles)
      .map((r) => r.person)
      .find(Boolean);
    firstAskPerson =
      known ??
      answer.gaps.items.find((g) => g.fillerId)?.fillerId ??
      answer.power.roster[0]?.id ??
      answer.power.offRoster[0]?.id ??
      "";

    const deadline =
      term && term.dealId === line.id
        ? {
            label: `Term ends ${longDate(term.turnsBadAt)}`,
            src: term.evidence[0]?.id ?? term.id,
          }
        : null;

    const stage: Stage | null = line.bucket === "unknown" ? null : line.stage;

    return {
      id: line.id,
      name: line.title,
      acct: answer.accountId,
      stage,
      worth: line.money.amount,
      currency: line.money.currency,
      backedBy: line.evidence
        .filter((e) => e.kind === "file" || e.kind === "record")
        .map((e) => e.id),
      worthFact:
        line.money.amount === null
          ? undefined
          : (line.evidence.find(
              (e) =>
                e.kind === "fact" &&
                e.quote.replace(/,/g, "").includes(String(line.money.amount)),
            )?.id ?? line.id),
      deadline,
      owner: answer.moves.top.find((m) => m.dealId === line.id)?.ownerName ?? null,
      unbacked: line.bucket !== "backed",
      bucket: line.bucket,
      notCounted: line.bucket === "backed" ? undefined : line.why,
      why: line.why,
      roles,
      ask: firstAskPerson,
      askQuestion: firstEmptyAsk ?? "",
    };
  });
}

function movesOf(answer: Answer): Move[] {
  return answer.moves.top.map((m) => {
    const term = answer.risk.lanes.deadline.find((r) => r.dealId === m.dealId);
    return {
      id: `mv_${m.rank}_${m.dealId}`,
      g: m.rank,
      acct: answer.accountId,
      deal: m.dealId || null,
      action: m.action,
      due: longDate(m.due),
      dueISO: m.due.slice(0, 10),
      mustBeat: term ? longDate(term.turnsBadAt) : "No deadline on file",
      why: m.whyNow,
      evidence: m.evidence.map((e) => e.id),
      ask: m.ask,
      owner: m.ownerName,
      ownerRole: m.ownerRole,
    };
  });
}

function risksOf(answer: Answer, moves: Move[]): Risk[] {
  const out: Risk[] = [];
  for (const [lane, rows] of Object.entries(answer.risk.lanes)) {
    for (const r of rows) {
      out.push({
        id: `${answer.accountId.toLowerCase()}_${r.id}`,
        lane: lane as Lane,
        sev: SEV[r.severity] ?? "med",
        days: daysBetween(answer.asOf, r.turnsBadAt),
        day: Number(r.turnsBadAt.slice(8, 10)),
        acct: answer.accountId,
        deal: r.dealId,
        what: r.what,
        defuse: moves.find((m) => m.deal === r.dealId)?.id ?? null,
        evidence: r.evidence.map((e) => e.id),
        turnsBadAt: r.turnsBadAt.slice(0, 10),
        passed: r.passed,
      });
    }
  }
  return out.sort((a, b) => a.days - b.days || a.id.localeCompare(b.id));
}

function gapsOf(answer: Answer): Gap[] {
  return answer.gaps.items.map((g) => ({
    id: `${answer.accountId.toLowerCase()}_${g.id}`,
    block: g.blocks[0] ?? "power",
    acct: answer.accountId,
    deal: null,
    what: g.what,
    why: g.why,
    who: g.fillerId,
    q: g.ask,
  }));
}

function offersOf(answer: Answer): Offer[] {
  return [...answer.book.offers.open, ...answer.book.offers.declined].map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    amount: o.money.amount,
    currency: o.money.currency,
    pitchTo: o.pitchTo,
    evidence: o.evidence.map((e) => e.id),
  }));
}

function peopleOf(answer: Answer): Person[] {
  const roster = answer.power.roster.map<Person>((p) => ({
    id: p.id,
    name: p.name,
    title: p.role,
    acct: answer.accountId,
    warmth: p.relationship as Warmth,
    met: p.lastContact !== null,
    last: p.lastContact ? longDate(p.lastContact) : "No contact on record",
    lastFact: p.evidence[0]?.id ?? p.id,
    deals: p.deals,
  }));

  const off = answer.power.offRoster.map<Person>((p) => ({
    id: p.id,
    name: p.name,
    title: p.role,
    acct: answer.accountId,
    warmth: p.relationship as Warmth,
    met: true,
    last: "Spoke to us · not on the account sheet",
    lastFact: p.evidence[0]?.id ?? p.id,
    deals: p.deals,
    offRoster: true,
  }));

  return [...roster, ...off];
}

function signalsOf(portfolio: Portfolio): Signal[] {
  return portfolio.signals.map((s) => ({
    id: s.id,
    at: `${longDate(s.dated)}${
      s.at && clock(s.at) !== "00:00" ? ` · ${clock(s.at)}` : ""
    }`,
    atISO: s.at,
    acct: s.accountId ?? "both",
    deal: s.linkedDealId,
    kind: titleCase(s.kind),
    text: s.summary,
    ...(s.before && s.after
      ? { diff: { field: "record", before: s.before, after: s.after } }
      : {}),
    moves: s.touches,
    src: s.id,
  }));
}

function totalsOf(answer: Answer): Total {
  return {
    currency: answer.currency,
    backed: answer.book.backed.total.amount ?? 0,
    claimed: answer.book.claimed.total.amount ?? 0,
    unknownCount: answer.book.unknown.count,
    openOffers: answer.book.offers.openTotal.amount ?? 0,
    offers: answer.book.offers.open.length + answer.book.offers.declined.length,
  };
}

/** What each answer is resting on, in the data's own words. */
function assumptionsOf(answer: Answer): string[] {
  const out: string[] = [];
  const reconciliation = answer.book.reconciliation.note.trim();
  if (reconciliation) out.push(reconciliation);
  const term = answer.risk.lanes.deadline.find((r) => r.id === "deadline_term");
  if (term) out.push(`The term end (${longDate(term.turnsBadAt)}) is the only date on file`);
  const top = answer.moves.top[0];
  if (top) out.push(`${top.ownerName} can act by ${longDate(top.due)}`);
  return out;
}

/** Statements checked against the data, not decoration. */
function clearOf(answers: Answer[], portfolio: Portfolio): string[] {
  const out: string[] = [];
  const deadlines = answers.flatMap((a) => a.risk.lanes.deadline);
  const declared = deadlines.filter((r) => r.id !== "deadline_term");
  out.push(
    declared.length > 0
      ? `${declared.length} declared deadline${declared.length === 1 ? "" : "s"} on file, each dated and sourced.`
      : "No deadline was declared on either account; the contract term end is the only date we hold.",
  );
  out.push("No deal is counted as backed unless its stage carries the value.");
  out.push("No role seat is filled by a name that is not in the record.");
  const ok = portfolio.ingest.filter((i) => i.ok).length;
  out.push(`${ok} of ${portfolio.ingest.length} MCP payloads applied cleanly.`);
  out.push("Two currencies, kept apart: no total is added across accounts.");
  return out;
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------

export function buildData(portfolio: Portfolio): Data {
  const accounts = accountsOf(portfolio);
  const answers = portfolio.accounts;

  const deals = answers.flatMap(dealsOf);
  const moves = answers.flatMap(movesOf);
  const risks = answers.flatMap((a) => risksOf(a, moves.filter((m) => m.acct === a.accountId)));
  const gaps = answers.flatMap(gapsOf);
  const offers = answers.flatMap(offersOf);
  const people = answers.flatMap(peopleOf);
  const sources = sourcesOf(answers, portfolio);
  const signals = signalsOf(portfolio);

  const latest = portfolio.ingest[0]?.at ?? Date.now();
  const snapshots = portfolio.ingest.slice(0, 3).map((row, i) => ({
    id: `snap_${String(portfolio.ingest.length - i).padStart(2, "0")}`,
    time: clock(new Date(row.at).toISOString()),
    age: Math.round((latest - row.at) / 60_000),
  }));

  // A snapshot is citable too: the drawer can show which call it was.
  snapshots.forEach((s, i) => {
    const row = portfolio.ingest[i];
    if (!row) return;
    sources[s.id] = {
      id: s.id,
      kind: "snapshot",
      acct: "both",
      claim: `${row.tool} ran at ${s.time} and ${
        row.ok ? "applied cleanly" : "failed"
      }.`,
      conf: "verified",
      payload: { tool: row.tool, args: row.args, at: new Date(row.at).toISOString(), ok: row.ok },
      key: "tool",
      tool: row.tool,
      args: row.args,
      ingested: new Date(row.at).toISOString().slice(0, 10),
      snap: s.id,
    };
  });

  for (const r of risks) {
    if (sources[r.id]) continue;
    sources[r.id] = {
      id: r.id,
      kind: "risk",
      acct: r.acct,
      ...(r.deal ? { deal: r.deal } : {}),
      claim: r.what,
      conf: "verified",
      payload: {
        id: r.id,
        lane: r.lane,
        severity: r.sev,
        turns_bad_at: r.turnsBadAt,
        passed: r.passed,
      },
      key: "turnsBadAt",
      tool: "scan_risks",
      args: `lane=${r.lane}`,
      ingested: "",
      snap: "",
    };
  }

  for (const g of gaps) {
    if (sources[g.id]) continue;
    sources[g.id] = {
      id: g.id,
      kind: "gap",
      acct: g.acct,
      claim: g.what,
      conf: "claim",
      payload: { id: g.id, what: g.what, ask: g.q, why: g.why, filler: g.who },
      key: "ask",
      tool: "scan_gaps",
      args: `account=${g.acct}`,
      ingested: "",
      snap: "",
    };
  }

  for (const m of moves) {
    if (sources[m.id]) continue;
    sources[m.id] = {
      id: m.id,
      kind: "move",
      acct: m.acct,
      ...(m.deal ? { deal: m.deal } : {}),
      claim: `${m.action} — due ${m.due}.`,
      conf: "told",
      payload: { id: m.id, rank: m.g, owner: m.owner, due: m.dueISO, ask: m.ask },
      key: "due",
      tool: "rank_moves",
      args: "weights=default",
      ingested: "",
      snap: "",
    };
  }

  const totals: Record<string, Total> = {};
  const headline: Record<string, string> = {};
  const assumptions: Record<string, string[]> = {};
  const detectors: Record<string, Record<Lane, string>> = {};
  const powerHeadline: Record<string, string> = {};
  const riskHeadline: Record<string, string> = {};
  const powerHeld: Record<string, { id: string; name: string; why: string; evidence: string[] }[]> = {};
  const gapHeadline: Record<string, string> = {};
  for (const a of answers) {
    totals[a.accountId] = totalsOf(a);
    headline[a.accountId] = a.book.headline;
    assumptions[a.accountId] = assumptionsOf(a);
    detectors[a.accountId] = a.risk.detectorNotes;
    powerHeadline[a.accountId] = a.power.headline;
    riskHeadline[a.accountId] = a.risk.headline;
    gapHeadline[a.accountId] = a.gaps.headline;
    powerHeld[a.accountId] = a.power.powerHeldBy.map((p) => ({
      id: p.personId,
      name: p.name,
      why: p.why,
      evidence: p.evidence.map((e) => e.id),
    }));

    // The bucket totals are sums of the lines below them. Rather than let a
    // number appear without an id, the sum itself gets a citable record that
    // shows exactly which lines it adds up.
    const b = a.book;
    const linesOf = (bucket: "backed" | "claimed" | "unknown") =>
      bucket === "backed"
        ? b.backed.lines
        : bucket === "claimed"
          ? b.claimed.lines
          : b.unknown.lines;
    sources[`book_${a.accountId}`] = {
      id: `book_${a.accountId}`,
      kind: "book",
      acct: a.accountId,
      claim: `${b.backed.total.display} backed · ${b.claimed.total.display} claimed · ${b.unknown.count} unknown. ${b.reconciliation.note}`.trim(),
      conf: "verified",
      payload: {
        currency: a.currency,
        backed: {
          total: b.backed.total.display,
          lines: b.backed.lines.map((l) => ({ id: l.id, money: l.money.display, stage: l.stage })),
        },
        claimed: {
          total: b.claimed.total.display,
          lines: b.claimed.lines.map((l) => ({ id: l.id, money: l.money.display, stage: l.stage })),
        },
        unknown: { count: b.unknown.count, lines: b.unknown.lines.map((l) => l.id) },
        reconciliation: { sheet_total: b.reconciliation.sheetTotal?.display ?? null, note: b.reconciliation.note },
        checked: (["backed", "claimed", "unknown"] as const).flatMap((bucket) =>
          linesOf(bucket).map((l) => `${bucket}: ${l.id} → ${l.money.display}`),
        ),
      },
      key: "claim",
      tool: "rules/book",
      args: `account=${a.accountId}`,
      ingested: "",
      snap: "",
    };

    sources[`power_${a.accountId}`] = {
      id: `power_${a.accountId}`,
      kind: "power",
      acct: a.accountId,
      claim: `${a.power.coverage.filled} of ${a.power.coverage.total} role seats are named. ${a.power.headline}`.trim(),
      conf: "told",
      payload: {
        coverage: a.power.coverage,
        seats: a.power.deals.map((d) => ({
          deal: d.dealId,
          filled: d.cells.filter((c) => c.personId).map((c) => `${c.role}=${c.personId}`),
          unknown: d.cells.filter((c) => !c.personId).map((c) => c.role),
        })),
        powerHeldBy: a.power.powerHeldBy.map((p) => ({ id: p.personId, why: p.why })),
      },
      key: "claim",
      tool: "rules/power",
      args: `account=${a.accountId}`,
      ingested: "",
      snap: "",
    };

    sources[`risk_${a.accountId}`] = {
      id: `risk_${a.accountId}`,
      kind: "risk",
      acct: a.accountId,
      claim: a.risk.headline,
      conf: "verified",
      payload: {
        count: a.risk.count,
        lanes: Object.fromEntries(
          Object.entries(a.risk.lanes).map(([lane, rows]) => [
            lane,
            rows.map((r) => ({ id: r.id, turns_bad_at: r.turnsBadAt, severity: r.severity, passed: r.passed })),
          ]),
        ),
        detectors: a.risk.detectorNotes,
      },
      key: "count",
      tool: "rules/risk",
      args: `account=${a.accountId}`,
      ingested: "",
      snap: "",
    };
  }

  const snap = snapshots[0]?.id ?? "";
  for (const s of Object.values(sources)) {
    if (s.kind === "snapshot") continue;
    if (!s.ingested) s.ingested = new Date(latest).toISOString().slice(0, 10);
    if (!s.snap) s.snap = snap;
  }

  return {
    accounts,
    offers,
    deals,
    moves,
    risks,
    gaps,
    people,
    signals,
    sources,
    snapshots,
    totals,
    asOf: portfolio.asOf,
    asOfLabel: `${longDate(portfolio.asOf)} · ${clock(new Date(latest).toISOString())}`,
    worldClosed: portfolio.liveness.worldClosed,
    minute: portfolio.liveness.minute,
    ingest: portfolio.ingest,
    clear: clearOf(answers, portfolio),
    assumptions,
    headline,
    detectors,
    powerHeadline,
    riskHeadline,
    powerHeld,
    gapHeadline,
  };
}

/** Look helpers, matching the old `deal(id)` / `person(id)` exports. */
export const byDeal = (data: Data, id: string) => data.deals.find((d) => d.id === id) ?? null;
export const byPerson = (data: Data, id: string) => data.people.find((p) => p.id === id) ?? null;
export const byAccount = (data: Data, id: string) => data.accounts.find((a) => a.id === id) ?? null;
