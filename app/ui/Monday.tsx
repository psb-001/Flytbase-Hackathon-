"use client";

import { useMemo, useState } from "react";
import { longDate } from "../lib/build";
import {
  ACCOUNTS,
  CLEAR,
  DEALS,
  GAPS,
  INGEST,
  MOVES,
  PEOPLE,
  RISKS,
  SIGNALS,
  SOURCES,
  TOTALS,
  acctName,
  coverage,
  money,
  type Lane,
  type Source,
} from "./data";
import { Ico } from "./icons";
import {
  Btn,
  Chip,
  Cite,
  EmptyState,
  FreshnessBadge,
  Label,
  MoveCard,
  RiskRow,
  SignalRow,
  SourceChip,
  useApp,
  LANES,
} from "./ui";
import { Head, Panel } from "./screens";

const LANE_ORDER: Lane[] = ["deadline", "warmth", "stall", "signal"];
const LANE_ICON: Record<Lane, string> = {
  deadline: "flag",
  warmth: "shield",
  stall: "pause",
  signal: "signal",
};

/* ------------------------------------------------------------------ Monday */

function BucketLine({
  label,
  value,
  cite,
  tone,
}: {
  label: string;
  value: string;
  cite: string;
  tone: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-line2 py-2 last:border-b-0">
      <span className="text-[12.5px] text-mute">{label}</span>
      <Cite id={cite} className={`text-[14px] font-medium tabular-nums ${tone}`}>
        {value}
      </Cite>
    </div>
  );
}

function AccountCard({ id }: { id: string }) {
  const { go } = useApp();
  const a = ACCOUNTS.find((x) => x.id === id);
  const t = TOTALS[id];
  if (!a) return null;
  const deals = DEALS.filter((d) => d.acct === id);
  const moves = MOVES.filter((m) => m.acct === id);
  const risks = RISKS.filter((r) => r.acct === id);
  const filled = deals.reduce((n, d) => n + coverage(d), 0);
  const nextRisk = [...risks].sort((x, y) => x.turnsBadAt.localeCompare(y.turnsBadAt))[0];
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-line bg-white">
      <button
        type="button"
        onClick={() => go(`/a/${id}`)}
        className="flex min-w-0 items-start justify-between gap-3 border-b border-line2 bg-panel px-5 py-4 text-left hover:bg-brand-tint/50"
      >
        <span className="min-w-0">
          <span className="block text-[16px] font-medium text-ink">{a.name}</span>
          <span className="block text-[12px] text-mute">
            Account {id} · {deals.length} deals · {a.currency}
          </span>
        </span>
        <Ico n="right" size={16} className="mt-1 shrink-0 text-mute" />
      </button>
      <div className="flex-1 px-5 py-3">
        <BucketLine
          label="Backed"
          value={money(t?.backed ?? 0, t?.currency)}
          cite={`book_${id}`}
          tone="text-ok"
        />
        <BucketLine
          label="Claimed"
          value={money(t?.claimed ?? 0, t?.currency)}
          cite={`book_${id}`}
          tone="text-brand-dark"
        />
        <BucketLine
          label="Unknown"
          value={`${t?.unknownCount ?? 0} deal${(t?.unknownCount ?? 0) === 1 ? "" : "s"}`}
          cite={`book_${id}`}
          tone="text-warn"
        />
        <BucketLine
          label="Offers, excluded"
          value={money(t?.openOffers ?? 0, t?.currency)}
          cite={`book_${id}`}
          tone="text-ink2"
        />
      </div>
      <div className="space-y-1.5 border-t border-line2 bg-panel/70 px-5 py-3 text-[12.5px] text-ink2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-mute">Role seats</span>
          <Cite id={`power_${id}`} className="font-medium">
            {filled}/{deals.length * 4} named
          </Cite>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-mute">Next date</span>
          {nextRisk ? (
            <span className="inline-flex items-center gap-1 text-ink">
              <Ico n="calendar" size={13} className="text-brand" />
              {longDate(nextRisk.turnsBadAt)}
            </span>
          ) : (
            <span>none on file</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-mute">First move</span>
          <span className="truncate text-right text-ink">
            {moves[0] ? `${moves[0].owner} · ${moves[0].due}` : "no move"}
          </span>
        </div>
      </div>
    </article>
  );
}

function QuestionCard({
  n,
  q,
  value,
  note,
  href,
  icon,
}: {
  n: string;
  q: string;
  value: string;
  note: string;
  href: string;
  icon: string;
}) {
  const { go } = useApp();
  return (
    <button
      type="button"
      onClick={() => go(href)}
      className="group flex min-w-0 flex-col items-start gap-2 rounded-[20px] border border-line bg-white p-5 text-left hover:border-brand-line hover:bg-brand-tint/40"
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold tracking-[.08em] text-brand-dark">{n}</span>
        <Ico n={icon} size={15} className="text-mute group-hover:text-brand" />
      </span>
      <span className="text-[13.5px] font-medium leading-snug text-ink">{q}</span>
      <span className="text-[19px] leading-tight font-light tabular-nums text-ink">{value}</span>
      <span className="text-[12px] leading-snug text-mute">{note}</span>
    </button>
  );
}

export function Monday() {
  const { go, read, markRead, countdown } = useApp();
  const [acct, setAcct] = useState<string>("all");

  const deals = DEALS.filter((d) => acct === "all" || d.acct === acct);
  const moves = MOVES.filter((m) => acct === "all" || m.acct === acct);
  const risks = RISKS.filter((r) => acct === "all" || r.acct === acct);
  const signals = SIGNALS.filter((s) => acct === "all" || s.acct === acct || s.acct === "both");
  const gaps = GAPS.filter((g) => acct === "all" || g.acct === acct);

  const filled = deals.reduce((n, d) => n + coverage(d), 0);
  const seats = deals.length * 4;
  const passed = risks.filter((r) => r.passed);
  const unknown = deals.filter((d) => d.worth === null);
  const openSignals = signals.length;
  const firstMove = [...moves].sort((a, b) => a.dueISO.localeCompare(b.dueISO) || a.g - b.g)[0];
  const nearest = [...risks].sort((a, b) => a.turnsBadAt.localeCompare(b.turnsBadAt))[0];
  const neverMet = PEOPLE.filter((p) => !p.met && (acct === "all" || p.acct === acct));

  return (
    <div className="space-y-8">
      <Head eyebrow="Account Quest · Monday brief" title="Two accounts. Five questions.">
        <div className="flex flex-wrap gap-2">
          <Btn small onClick={() => go("/signals")} icon="signal">
            {openSignals} signals
          </Btn>
          <Btn small icon="alert" onClick={() => go("/risks")}>
            {risks.length} risks
          </Btn>
          <Btn small icon="file" onClick={() => go("/data")}>
            {Object.keys(SOURCES).length} citations
          </Btn>
        </div>
      </Head>

      <div className="flex flex-wrap items-center gap-3">
        <FreshnessBadge state="live" text="Convex subscription · no MCP call on page load" />
        <span className="text-[12px] text-mute">next poll in {countdown}s</span>
        <span className="h-3 w-px bg-line" aria-hidden />
        <span className="text-[12px] text-mute">
          {portfolioMeta()}
        </span>
        <div className="ml-auto flex gap-1 rounded-full border border-line bg-white p-1">
          {["all", ...ACCOUNTS.map((a) => a.id)].map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setAcct(x)}
              aria-pressed={acct === x}
              className={`rounded-full px-3 py-1 text-[12.5px] ${
                acct === x ? "bg-brand text-white" : "text-ink2 hover:bg-panel"
              }`}
            >
              {x === "all" ? "Both" : acctName(x)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ACCOUNTS.filter((a) => acct === "all" || a.id === acct).map((a) => (
          <AccountCard key={a.id} id={a.id} />
        ))}
      </div>

      <section className="space-y-3">
        <Label>The five answers</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <QuestionCard
            n="Q1"
            q="What is the book worth?"
            value={
              acct === "all"
                ? ACCOUNTS.map((a) => money(TOTALS[a.id]?.backed ?? 0, a.currency)).join(" · ")
                : money(TOTALS[acct]?.backed ?? 0, TOTALS[acct]?.currency ?? "")
            }
            note={
              acct === "all"
                ? "backed, two currencies, never summed"
                : "backed; claimed and unknown sit beside it"
            }
            href={acct === "all" ? "/a/A#q1" : `/a/${acct}#q1`}
            icon="book"
          />
          <QuestionCard
            n="Q2"
            q="Who holds the power?"
            value={`${filled}/${seats} seats`}
            note={`${neverMet.length} people never met · empty seats are questions`}
            href={acct === "all" ? "/a/A#q2" : `/a/${acct}#q2`}
            icon="map"
          />
          <QuestionCard
            n="Q3"
            q="What do we do first?"
            value={`${moves.length} ranked moves`}
            note={firstMove ? `first due ${firstMove.due} · ${firstMove.owner}` : "no move on file"}
            href={acct === "all" ? "/a/A#q3" : `/a/${acct}#q3`}
            icon="target"
          />
          <QuestionCard
            n="Q4"
            q="What is about to go wrong?"
            value={`${risks.length} dated risks`}
            note={
              nearest
                ? `nearest ${longDate(nearest.turnsBadAt)}${passed.length ? ` · ${passed.length} crossed` : ""}`
                : "no detector found anything"
            }
            href="/risks"
            icon="alert"
          />
          <QuestionCard
            n="Q5"
            q="What is still unknown?"
            value={`${gaps.length} open questions`}
            note={`${unknown.length} deals with no number · ${seats - filled} empty seats`}
            href={acct === "all" ? "/a/A#q5" : `/a/${acct}#q5`}
            icon="help"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <Label>Q3 · do first</Label>
              <h2 className="mt-1 text-[20px] font-light text-ink">Ranked across both books</h2>
            </div>
            <Btn small icon="right" onClick={() => go(acct === "all" ? "/a/A#q3" : `/a/${acct}#q3`)}>
              See all
            </Btn>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[...moves]
              .sort((a, b) => a.dueISO.localeCompare(b.dueISO) || a.g - b.g)
              .slice(0, 3)
              .map((m, i) => (
                <MoveCard key={m.id} m={m} rank={i + 1} />
              ))}
            {moves.length === 0 && <EmptyState kind="clear" detail="No move is ranked for this filter." />}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <Label>Q4 · the four lanes</Label>
            <h2 className="mt-1 text-[20px] font-light text-ink">Each with a date, not a colour</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {LANE_ORDER.map((lane) => {
              const rows = risks.filter((r) => r.lane === lane);
              const earliest = [...rows].sort((a, b) => a.turnsBadAt.localeCompare(b.turnsBadAt))[0];
              return (
                <button
                  key={lane}
                  type="button"
                  onClick={() => go(`/risks/${lane}`)}
                  className="flex min-w-0 flex-col items-start gap-1 rounded-[18px] border border-line bg-white p-4 text-left hover:border-brand-line hover:bg-brand-tint/40"
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
                      <Ico n={LANE_ICON[lane]} size={14} className="text-brand" />
                      {LANES[lane].label}
                    </span>
                    <span className="text-[12px] tabular-nums text-mute">{rows.length}</span>
                  </span>
                  <span className="text-[12px] leading-snug text-mute">
                    {earliest ? longDate(earliest.turnsBadAt) : "nothing dated"}
                  </span>
                  <span className="text-[11.5px] leading-snug text-faint">
                    {rows.filter((r) => r.passed).length
                      ? `${rows.filter((r) => r.passed).length} already crossed`
                      : "all ahead of us"}
                  </span>
                </button>
              );
            })}
          </div>

          <Panel
            title="Signals"
            icon="signal"
            aside={countdown != null ? <span className="text-[12px] text-mute">poll {countdown}s</span> : undefined}
          >
            {signals.length ? (
              <div className="overflow-hidden rounded-[14px] border border-line">
                {signals.slice(0, 3).map((s) => (
                  <SignalRow
                    key={s.id}
                    s={s}
                    unread={!read.has(s.id)}
                    onRead={() => markRead(s.id)}
                    linkAction={s.deal ? undefined : () => go(`/signals/${s.id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState kind="signals" countdown={countdown} />
            )}
          </Panel>
        </div>
      </div>

      <Panel title="What this page is allowed to say" icon="shield">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {CLEAR.map((x) => (
            <div key={x} className="flex items-start gap-2 rounded-[12px] bg-ok-tint/50 px-3 py-2 text-[12.5px] text-ok">
              <Ico n="check" size={14} className="mt-[2px]" />
              {x}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line2 pt-4">
          <span className="text-[12.5px] text-mute">
            Every number above opens the record behind it. The app reads Convex, never the MCP, on load.
          </span>
          <Btn small icon="file" onClick={() => go("/data")}>
            Open the source register
          </Btn>
        </div>
      </Panel>
    </div>
  );
}

function portfolioMeta() {
  const last = MOVES.length + DEALS.length + GAPS.length;
  return `${ACCOUNTS.length} accounts · ${DEALS.length} deals · ${last} cited lines`;
}

/* ------------------------------------------------------------------ Notes */

export function NotesScreen() {
  const { notes, openComposer } = useApp();
  return (
    <div className="space-y-8">
      <Head eyebrow="The only write" title="Notes">
        <Btn primary icon="note" onClick={() => openComposer({ kind: "Note" })}>
          Write a note
        </Btn>
      </Head>
      <p className="max-w-[760px] text-[15px] leading-snug text-ink2">
        A note is stored here immediately, then sent through the same one-call-a-minute queue as every
        read. Its status flips to <b>sent</b> only when the MCP confirms the write. Nothing is edited,
        deleted, assigned or emailed from this console.
      </p>
      {notes.length ? (
        <div className="overflow-hidden rounded-[20px] border border-line bg-white">
          {notes.map((n) => (
            <div key={n.id} className="border-b border-line2 px-5 py-4 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={n.status === "sent" ? "green" : n.status === "failed" ? "red" : "amber"} dashed={n.status !== "sent"}>
                  {n.status ?? "queued"}
                </Chip>
                <span className="text-[13px] font-medium text-ink">{n.kind}</span>
                <span className="text-[12.5px] text-mute">{n.attach}</span>
                <span className="ml-auto font-mono text-[11.5px] text-faint">{n.at}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-ink2">{n.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState kind="notes" onAction={() => openComposer({ kind: "Note" })} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- Data */

const KIND_ORDER = [
  "fact",
  "file",
  "record",
  "person",
  "deal",
  "offer",
  "signal",
  "account",
  "book",
  "power",
  "risk",
  "gap",
  "move",
  "snapshot",
  "unknown",
];

export function DataScreen() {
  const { openSource, go } = useApp();
  const ingest = INGEST;
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const all = Object.values(SOURCES);
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? all.filter(
          (s) =>
            s.id.toLowerCase().includes(needle) ||
            s.claim.toLowerCase().includes(needle) ||
            s.kind.toLowerCase().includes(needle),
        )
      : all;
    return filtered.sort(
      (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.id.localeCompare(b.id),
    );
  }, [q]);

  const kinds = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of Object.values(SOURCES)) out[s.kind] = (out[s.kind] ?? 0) + 1;
    return Object.entries(out).sort((a, b) => b[1] - a[1]);
  }, []);

  const ok = ingest.filter((i) => i.ok).length;

  return (
    <div className="space-y-8">
      <Head eyebrow="Provenance" title="Data & sources">
        <Btn small icon="right" onClick={() => go("/")}>
          Monday
        </Btn>
      </Head>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["MCP payloads", String(ingest.length)],
          ["Applied cleanly", `${ok}/${ingest.length}`],
          ["Citable ids", String(Object.keys(SOURCES).length)],
          ["On page load", "0 calls"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-[18px] border border-line bg-white p-4">
            <Label>{l}</Label>
            <div className="mt-1.5 text-[22px] font-light tabular-nums text-ink">{v}</div>
          </div>
        ))}
      </div>

      <Panel title="Every call this store was built from" icon="refresh" aside={<Chip tone="gray">newest first</Chip>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[.08em] text-mute uppercase">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Tool</th>
                <th className="py-2 pr-3">Arguments</th>
                <th className="py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {ingest.map((row, i) => (
                <tr key={`${row.tool}-${row.at}-${i}`} className="border-b border-line2 last:border-b-0">
                  <td className="py-2.5 pr-3 whitespace-nowrap text-mute">
                    {new Date(row.at).toISOString().slice(11, 16)}
                    <span className="ml-1 text-faint">{new Date(row.at).toISOString().slice(0, 10)}</span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="font-mono text-[11.5px] text-ink">{row.tool}</span>
                  </td>
                  <td className="max-w-[340px] truncate py-2.5 pr-3 font-mono text-[11.5px] text-mute">
                    {row.args}
                  </td>
                  <td className="py-2.5">
                    <Chip tone={row.ok ? "green" : "red"}>{row.ok ? "applied" : "failed"}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-mute">
          The MCP allows one call a minute. Cold ingest cost {ingest.length} calls; the browser never
          makes one. New signals are written by the scheduler and appear here through the subscription.
        </p>
      </Panel>

      <Panel
        title="Source register"
        icon="book"
        aside={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by id, kind or words…"
            aria-label="Filter sources"
            className="h-[30px] w-[240px] max-w-full rounded-full border border-line bg-white px-3 text-[12.5px] outline-none placeholder:text-faint focus:border-brand"
          />
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {kinds.map(([k, n]) => (
            <Chip key={k} tone="gray">
              {k} · {n}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {rows.map((s: Source) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openSource(s.id)}
              className="flex min-w-0 items-center gap-2 rounded-[10px] border border-line2 px-2.5 py-1.5 text-left hover:border-brand-line hover:bg-brand-tint/40"
            >
              <span className="w-[54px] shrink-0 font-mono text-[10.5px] uppercase tracking-wide text-brand-dark">
                {s.kind}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink">{s.id}</span>
              <span className="hidden min-w-0 max-w-[45%] flex-1 truncate text-[11.5px] text-mute sm:block">
                {s.claim}
              </span>
            </button>
          ))}
        </div>
        {rows.length === 0 && (
          <p className="py-6 text-center text-[13px] text-mute">No citation matches that filter.</p>
        )}
      </Panel>
    </div>
  );
}

