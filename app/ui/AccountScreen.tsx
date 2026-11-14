"use client";

import { type ReactNode } from "react";
import { longDate } from "../lib/build";
import {
  ACCOUNTS,
  DEALS,
  DETECTORS,
  GAP_HEADLINE,
  GAPS,
  HEADLINE,
  MOVES,
  OFFERS,
  PEOPLE,
  POWER_HEADLINE,
  POWER_HELD,
  RISK_HEADLINE,
  RISKS,
  TOTALS,
  ROLES,
  coverage,
  money,
  source,
  type Deal,
  type Gap,
  type Lane,
  type Offer,
} from "./data";
import { Ico } from "./icons";
import {
  Btn,
  Chip,
  Cite,
  EmptyState,
  Evidence,
  GapRow,
  Label,
  MoveCard,
  PersonChip,
  RiskRow,
  RoleSlot,
  SourceChip,
  StageChip,
  LANES,
  useApp,
} from "./ui";
import { Head, Panel } from "./screens";

const LANE_ORDER: Lane[] = ["deadline", "warmth", "stall", "signal"];
const LANE_ICON: Record<Lane, string> = {
  deadline: "flag",
  warmth: "shield",
  stall: "pause",
  signal: "signal",
};

/* ------------------------------------------------------------------ pieces */

function Jump({ id, n, label }: { id: string; n: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white px-3 py-1 text-[12.5px] text-ink2 hover:border-brand-line hover:bg-brand-tint hover:text-brand-dark"
    >
      <span className="font-mono text-[10.5px] font-semibold text-brand-dark">{n}</span>
      {label}
    </button>
  );
}

function Q({
  id,
  n,
  title,
  sentence,
  children,
  aside,
}: {
  id: string;
  n: string;
  title: string;
  sentence?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[92px] border-t border-line pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Label>
            {n} · the question
          </Label>
          <h2 className="mt-1 text-[23px] leading-tight font-light tracking-[-.015em] text-ink sm:text-[26px]">
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">{aside}</div>
      </div>
      {sentence && (
        <p className="mt-3 max-w-[760px] text-[15px] leading-snug text-ink2">{sentence}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Bucket({
  label,
  value,
  hint,
  cite,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  cite: string;
  tone: "ok" | "blue" | "warn";
  icon: string;
}) {
  const skin = {
    ok: "border-line bg-white",
    blue: "border-line bg-white",
    warn: "border-warn-line bg-warn-tint",
  }[tone];
  const text = { ok: "text-ok", blue: "text-brand-dark", warn: "text-warn" }[tone];
  return (
    <div className={`rounded-[20px] border p-5 ${skin}`}>
      <Label className="flex items-center gap-1.5">
        <Ico n={icon} size={14} />
        {label}
      </Label>
      <Cite
        id={cite}
        className={`mt-2 block text-[27px] leading-none font-light tabular-nums tracking-[-.02em] ${text}`}
      >
        {value}
      </Cite>
      <p className="mt-2 text-[12.5px] leading-snug text-mute">{hint}</p>
    </div>
  );
}

function OfferRow({ o }: { o: Offer }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line2 py-3 last:border-b-0">
      <Cite id={o.id} className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">
        {o.title}
      </Cite>
      <Chip tone={o.status === "open" ? "blue" : "gray"}>
        {o.status}
        {o.pitchTo ? ` · ${o.pitchTo}` : ""}
      </Chip>
      <Cite id={o.id} className="text-[13.5px] tabular-nums text-ink">
        {money(o.amount, o.currency)}
      </Cite>
    </li>
  );
}

function SeatStrip({ d }: { d: Deal }) {
  const n = coverage(d);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-mute">
      <span className="inline-flex items-center gap-1.5 font-medium text-ink">
        <span className="flex gap-[2px]" aria-hidden>
          {ROLES.map((r, i) => (
            <i key={r} className={`h-[8px] w-[14px] rounded-full ${i < n ? "bg-brand" : "bg-line"}`} />
          ))}
        </span>
        {n}/4 known
      </span>
      {n < 4 && (
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-dashed border-faint bg-panel px-2.5 py-1">
          <Ico n="help" size={12} className="shrink-0 text-warn" />
          <span className="truncate">
            Ask {d.ask ? <Cite id={d.ask}>{sourcePersonName(d.ask)}</Cite> : "a named person"}
            {d.askQuestion ? `: ${d.askQuestion}` : ""}
          </span>
        </span>
      )}
    </div>
  );
}

function sourcePersonName(id: string) {
  return PEOPLE.find((p) => p.id === id)?.name ?? "someone on file";
}

/* ------------------------------------------------------------------ screen */

export function AccountScreen({ id }: { id: string }) {
  const { go, openComposer } = useApp();
  const a = ACCOUNTS.find((x) => x.id === id);

  if (!a) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-[26px] font-light">Account not found</h1>
        <Btn className="mt-4" onClick={() => go("/")}>
          Return to Monday
        </Btn>
      </div>
    );
  }

  const t = TOTALS[a.id];
  const deals = DEALS.filter((d) => d.acct === a.id);
  const moves = MOVES.filter((m) => m.acct === a.id);
  const risks = RISKS.filter((r) => r.acct === a.id);
  const gaps = GAPS.filter((g) => g.acct === a.id);
  const people = PEOPLE.filter((p) => p.acct === a.id);
  // Currencies are unique per account in this dataset, so this keeps the two
  // books apart without matching on an invented naming convention.
  const offers = OFFERS.filter((o) => o.currency === a.currency);
  const filled = deals.reduce((n, d) => n + coverage(d), 0);
  const totalSeats = deals.length * ROLES.length;
  const neverMet = people.filter((p) => !p.met);
  const unknownDeals = deals.filter((d) => d.worth === null);
  const passed = risks.filter((r) => r.passed);

  return (
    <div className="space-y-8">
      <Head
        eyebrow={`Account ${a.id} · ${a.currency} · ${a.short}`}
        title={a.name}
      >
        <Btn icon="note" primary onClick={() => openComposer({ kind: "Note", attach: `acct:${a.id}` })}>
          Write a note
        </Btn>
        <Btn icon="book" onClick={() => go(`/why/${a.id}`)}>
          Why this number
        </Btn>
      </Head>

      <p className="max-w-[820px] text-[18px] leading-snug font-light text-ink">
        {HEADLINE[a.id] ?? "No headline on file for this account."}
      </p>

      <div className="flex flex-wrap gap-2">
        <Jump id="q1" n="Q1" label="Book worth" />
        <Jump id="q2" n="Q2" label="Power" />
        <Jump id="q3" n="Q3" label="Do first" />
        <Jump id="q4" n="Q4" label="About to go wrong" />
        <Jump id="q5" n="Q5" label="Still unknown" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Bucket
          label="Backed"
          value={money(t?.backed ?? 0, t?.currency)}
          hint="A file we hold, at a stage that carries the value."
          cite={`book_${a.id}`}
          tone="ok"
          icon="filecheck"
        />
        <Bucket
          label="Claimed"
          value={money(t?.claimed ?? 0, t?.currency)}
          hint="A person said it. No file carries it yet, so it is not backed."
          cite={`book_${a.id}`}
          tone="blue"
          icon="chat"
        />
        <Bucket
          label="Unknown"
          value={`${t?.unknownCount ?? 0} deal${(t?.unknownCount ?? 0) === 1 ? "" : "s"}`}
          hint="Heard of, never numbered. No amount is invented."
          cite={`book_${a.id}`}
          tone="warn"
          icon="eyeoff"
        />
      </div>

      {/* ---------------------------------------------------------------- Q1 */}
      <Q
        id="q1"
        n="Q1"
        title="What is the book worth?"
        sentence={`Never one number: ${a.currency} only, and only at the stage that carries it.`}
        aside={
          <>
            <Chip tone="gray">
              <Ico n="target" size={12} />
              {offers.length} offers excluded
            </Chip>
            <Btn small icon="book" onClick={() => go(`/why/${a.id}`)}>
              Full working
            </Btn>
          </>
        }
      >
        <div className="overflow-x-auto rounded-[20px] border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-panel text-[11px] tracking-[.08em] text-mute uppercase">
                <th className="px-4 py-3">Deal</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Bucket</th>
                <th className="px-4 py-3 text-right">Worth</th>
                <th className="px-4 py-3">Why it sits there</th>
                <th className="px-4 py-3">Records</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-line2 last:border-b-0">
                  <td className="px-4 py-3">
                    <Cite id={d.id} className="font-medium text-ink">
                      {d.name}
                    </Cite>
                  </td>
                  <td className="px-4 py-3">
                    <StageChip stage={d.stage} />
                  </td>
                  <td className="px-4 py-3">
                    <Chip
                      tone={d.bucket === "backed" ? "green" : d.bucket === "claimed" ? "blue" : "amber"}
                      dashed={d.bucket === "unknown"}
                    >
                      {d.bucket}
                    </Chip>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {d.worth != null && d.worthFact ? (
                      <Cite id={d.worthFact} className="font-medium">
                        {money(d.worth, d.currency)}
                      </Cite>
                    ) : (
                      <span className="text-[12px] text-mute">no number</span>
                    )}
                  </td>
                  <td className="max-w-[320px] px-4 py-3 text-[12.5px] text-ink2">{d.why}</td>
                  <td className="px-4 py-3">
                    <Evidence ids={d.worthFact ? [d.worthFact, ...d.backedBy] : d.backedBy} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel
            title="Offers, outside the book"
            icon="target"
            aside={<span className="text-[12.5px] text-mute">not counted above</span>}
          >
            {offers.length ? (
              <ul>
                {offers.map((o) => (
                  <OfferRow key={o.id} o={o} />
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-mute">No offer is on file for this account.</p>
            )}
            <p className="mt-3 border-t border-line2 pt-3 text-[12.5px] text-mute">
              An offer is an ask, not committed value. It stays out of both backed and claimed.
            </p>
          </Panel>
          <Panel title="Reconciliation" icon="filecheck">
            <p className="text-[13.5px] leading-snug text-ink2">
              {source(`book_${a.id}`).claim}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SourceChip id={`book_${a.id}`} />
              <Chip tone="gray">currency {a.currency}</Chip>
            </div>
          </Panel>
        </div>
      </Q>

      {/* ---------------------------------------------------------------- Q2 */}
      <Q
        id="q2"
        n="Q2"
        title="Who holds the power?"
        sentence={POWER_HEADLINE[a.id] ?? "Four seats per deal. An empty seat is a question, not a guess."}
        aside={
          <Chip tone={filled === totalSeats ? "green" : "amber"} dashed={filled !== totalSeats}>
            {filled}/{totalSeats} seats named
          </Chip>
        }
      >
        <div className="space-y-4">
          {deals.map((d) => (
            <Panel
              key={d.id}
              title={d.name}
              icon="map"
              aside={
                <span className="flex flex-wrap items-center gap-2">
                  <StageChip stage={d.stage} />
                  <SeatStrip d={d} />
                </span>
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {ROLES.map((role: string) => (
                  <RoleSlot key={role} role={role as import("./data").Role} d={d} />
                ))}
              </div>
              {d.askQuestion && (
                <div className="mt-4 flex items-start gap-2 rounded-[14px] border border-dashed border-warn-line bg-warn-tint px-3.5 py-2.5 text-[13px] text-warn">
                  <Ico n="help" size={15} className="mt-[2px] shrink-0" />
                  <span>
                    <b>The question:</b> {d.askQuestion}
                  </span>
                </div>
              )}
            </Panel>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Power sits with" icon="bolt">
            {POWER_HELD[a.id]?.length ? (
              <ul className="space-y-3">
                {POWER_HELD[a.id].map((p) => (
                  <li key={p.id} className="rounded-[14px] border border-line px-3.5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <PersonChip id={p.id} />
                      <Evidence ids={p.evidence} open />
                    </div>
                    <p className="mt-2 text-[13px] text-ink2">{p.why}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-mute">No power argument is on file.</p>
            )}
          </Panel>
          <Panel
            title="Roster"
            icon="users"
            aside={<span className="text-[12.5px] text-mute">{people.length} people</span>}
          >
            <ul className="space-y-2">
              {people.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] px-1 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => go(`/p/${p.id}`)}
                    className="min-w-0 text-left hover:text-brand"
                  >
                    <PersonChip id={p.id} />
                  </button>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {p.title && <span className="text-[12px] text-mute">{p.title}</span>}
                    {p.offRoster && <Chip tone="amber">not on sheet</Chip>}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </Q>

      {/* ---------------------------------------------------------------- Q3 */}
      <Q
        id="q3"
        n="Q3"
        title="What do we do first?"
        sentence="Exactly three ranked moves. Each has a FlyBase owner, a date inside the deadline, and the message to send."
        aside={<Chip tone="blue">{moves.length} of 3</Chip>}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {moves.map((m) => (
            <MoveCard key={m.id} m={m} rank={m.g} variant="expanded" />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border border-line bg-panel px-4 py-3 text-[12.5px] text-ink2">
          <span className="inline-flex items-center gap-1.5 text-ok">
            <Ico n="check" size={14} />
            {new Set(moves.map((m) => m.owner)).size} named owners
          </span>
          <span className="inline-flex items-center gap-1.5 text-ok">
            <Ico n="check" size={14} />
            every move dated
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Ico n="flag" size={14} className="text-warn" />
            each must beat {moves[0]?.mustBeat ?? "the term end"}
          </span>
        </div>
      </Q>

      {/* ---------------------------------------------------------------- Q4 */}
      <Q
        id="q4"
        n="Q4"
        title="What is about to go wrong?"
        sentence={RISK_HEADLINE[a.id] ?? "Four detectors. Each risk carries the date it stops being a warning."}
        aside={
          <span className="flex flex-wrap gap-2">
            <Chip tone={passed.length ? "red" : "gray"}>{risks.length} dated</Chip>
            {passed.length > 0 && <Chip tone="red">{passed.length} already crossed</Chip>}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {LANE_ORDER.map((lane) => {
            const rows = risks.filter((r) => r.lane === lane);
            const earliest = rows
              .map((r) => r.turnsBadAt)
              .sort()
              .at(0);
            const note = DETECTORS[a.id]?.[lane] ?? "Detector note not on file.";
            return (
              <Panel
                key={lane}
                title={LANES[lane].label}
                icon={LANE_ICON[lane]}
                aside={
                  <span className="flex flex-wrap items-center gap-2">
                    <Chip tone={rows.length ? LANES[lane].tone : "gray"} dashed={!rows.length}>
                      {rows.length} found
                    </Chip>
                    <span className="text-[12px] text-mute">
                      {rows.length
                        ? `next ${longDate(earliest ?? rows[0].turnsBadAt)}`
                        : "nothing dated"}
                    </span>
                  </span>
                }
              >
                <p className="mb-3 rounded-[12px] bg-panel px-3 py-2 text-[12.5px] leading-snug text-mute">
                  <b className="text-ink2">Checked:</b> {note}
                </p>
                {rows.length ? (
                  <div className="overflow-hidden rounded-[14px] border border-line">
                    {rows.map((r) => (
                      <RiskRow key={r.id} r={r} />
                    ))}
                  </div>
                ) : (
                  <EmptyState kind="risks" detail={note} />
                )}
              </Panel>
            );
          })}
        </div>
      </Q>

      {/* ---------------------------------------------------------------- Q5 */}
      <Q
        id="q5"
        n="Q5"
        title="What is still unknown?"
        sentence={GAP_HEADLINE[a.id] ?? "Every gap below names the question and the person who can answer it."}
        aside={<Chip tone="amber" dashed>{gaps.length} open</Chip>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[18px] border border-line bg-white p-4">
            <Label>Deals with no number</Label>
            <div className="mt-1.5 text-[22px] font-light tabular-nums">{unknownDeals.length}</div>
            <ul className="mt-2 space-y-1 text-[12.5px] text-mute">
              {unknownDeals.map((d) => (
                <li key={d.id}>
                  <Cite id={d.id}>{d.name}</Cite>
                </li>
              ))}
              {unknownDeals.length === 0 && <li>None — both numbered lines are scoped.</li>}
            </ul>
          </div>
          <div className="rounded-[18px] border border-line bg-white p-4">
            <Label>Role seats with no name</Label>
            <div className="mt-1.5 text-[22px] font-light tabular-nums">
              <Cite id={`power_${a.id}`}>{totalSeats - filled}</Cite>
            </div>
            <p className="mt-2 text-[12.5px] text-mute">
              of {totalSeats} across {deals.length} deals. Each empty seat renders the question, never a
              placeholder name.
            </p>
          </div>
          <div className="rounded-[18px] border border-line bg-white p-4">
            <Label>People never met</Label>
            <div className="mt-1.5 text-[22px] font-light tabular-nums">{neverMet.length}</div>
            <ul className="mt-2 space-y-1 text-[12.5px] text-mute">
              {neverMet.map((p) => (
                <li key={p.id}>
                  <Cite id={p.id}>{p.name}</Cite> · {p.title}
                </li>
              ))}
              {neverMet.length === 0 && <li>Everyone on the sheet has been spoken to.</li>}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-stretch gap-4">
          {gaps.map((g: Gap) => (
            <GapRow key={g.id} g={g} />
          ))}
        </div>
      </Q>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <span className="text-[12.5px] text-mute">
          {a.currency} only. The other account bills in a different currency and is never added to this one.
        </span>
        <div className="flex gap-2">
          <Btn small icon="book" onClick={() => go(`/why/${a.id}`)}>
            Working for Q1
          </Btn>
          <Btn small icon="alert" onClick={() => go("/risks")}>
            All risks
          </Btn>
        </div>
      </div>
    </div>
  );
}
