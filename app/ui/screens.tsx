"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ACCOUNTS,
  DEALS,
  PEOPLE,
  MOVES,
  RISKS,
  GAPS,
  TOTALS,
  SIGNALS,
  money,
  coverage,
  deal as getDeal,
  acctName,
  type Deal,
  type Person,
  type Move,
  type Risk,
  type Gap,
  type Signal,
} from "./data";
import {
  Avatar,
  Btn,
  Chip,
  Cite,
  ConfidenceChip,
  EmptyState,
  Evidence,
  GapRow,
  IdChip,
  Label,
  MoveCard,
  PersonChip,
  RiskRow,
  RoleSlot,
  Section,
  SignalRow,
  SourceChip,
  StageChip,
  WarmthChip,
  useApp,
} from "./ui";
import { Ico } from "./icons";

/* ═════════════════════════════════════════════════════════════════════════
   SYNC / PULL BUTTON (Connected to MCP Queue)
   ═════════════════════════════════════════════════════════════════════════ */

export function SyncButton() {
  const triggerRefresh = useMutation(api.ingest.triggerRefresh);
  const ingestStatus = useQuery(api.ingest.status);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isLive = (ingestStatus?.running ?? 0) > 0;
  const queuedCount = ingestStatus?.queued ?? 0;
  const nextInSec = Math.ceil((ingestStatus?.nextInMs ?? 0) / 1000);

  const pull = async () => {
    try {
      setSyncing(true);
      const res = await triggerRefresh({});
      setFeedback(`Queued ${res.queued} MCP calls`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (e) {
      console.error(e);
      setFeedback("Failed to queue");
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setTimeout(() => setSyncing(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2.5">
      {/* Live queue indicator */}
      {queuedCount > 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warn-line bg-warn-tint px-2.5 py-1 text-[11.5px] font-semibold text-warn">
          <span className="spinner" style={{ width: 10, height: 10, borderTopColor: "#9a6410" }} />
          {queuedCount} in queue
        </span>
      ) : isLive ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-tint px-2.5 py-1 text-[11.5px] font-semibold text-brand-dark">
          <span className="spinner" style={{ width: 10, height: 10 }} />
          MCP calling…
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ok">
          <span className="h-2 w-2 rounded-full bg-ok" style={{ animation: "pulse-dot 1.8s infinite" }} />
          Live
        </span>
      )}

      {/* Sync Button */}
      <button
        type="button"
        onClick={pull}
        disabled={syncing || isLive}
        title={nextInSec > 0 ? `Next MCP call window in ${nextInSec}s` : "Pull latest accounts, paperwork, and signals"}
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-tint px-3 py-1 text-[12.5px] font-semibold text-brand-dark transition-all hover:bg-brand-line/40 hover:text-brand-dark disabled:opacity-60 shadow-xs"
      >
        <Ico n="refresh" size={13} className={syncing || isLive ? "animate-spin" : ""} />
        <span>{feedback ?? (syncing ? "Queueing…" : "↻ Sync MCP Data")}</span>
      </button>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   DASHBOARD
   ═════════════════════════════════════════════════════════════════════════ */

export function Dashboard() {
  const { go } = useApp();

  const totalDeals = DEALS.length;
  const highRisks = RISKS.filter((r) => r.sev === "high").length;
  const totalMoves = MOVES.length;

  return (
    <div className="space-y-8 max-w-[1100px] mx-auto">
      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: "Active Accounts", value: ACCOUNTS.length, icon: "users", tone: "blue" },
          { label: "Pipeline Deals", value: totalDeals, icon: "target", tone: "green" },
          { label: "Next Actions Due", value: totalMoves, icon: "clock", tone: "amber" },
          { label: "High Severity Risks", value: highRisks, icon: "alert", tone: "red" },
        ].map((k) => {
          const colors = {
            blue: "border-brand-line bg-brand-tint text-brand-dark",
            green: "border-ok-line bg-ok-tint text-ok",
            amber: "border-warn-line bg-warn-tint text-warn",
            red: "border-bad-line bg-bad-tint text-bad",
          }[k.tone];
          return (
            <div
              key={k.label}
              className={`rounded-[20px] border p-4.5 shadow-xs ${colors}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11.5px] font-bold uppercase tracking-wider opacity-80">
                  {k.label}
                </span>
                <Ico n={k.icon} size={16} />
              </div>
              <div className="text-[28px] font-black tracking-tight leading-none">
                {k.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Live Alerts & Signals ── */}
      {SIGNALS.length > 0 && (
        <div className="rounded-[22px] border border-bad-line bg-bad-tint/30 overflow-hidden shadow-xs">
          <div className="flex items-center justify-between border-b border-bad-line/50 bg-bad-tint/60 px-5 py-3">
            <div className="flex items-center gap-2 text-[13px] font-bold text-bad uppercase tracking-wider">
              <Ico n="signal" size={15} />
              Live Events & Signals ({SIGNALS.length})
            </div>
            <span className="text-[12px] text-mute font-medium">Real-time alerts</span>
          </div>
          <div>
            {SIGNALS.map((s) => (
              <SignalRow key={s.id} s={s} />
            ))}
          </div>
        </div>
      )}

      {/* ── Accounts Portfolio Grid ── */}
      <Section
        title="Accounts Portfolio"
        action={
          <button
            onClick={() => go("/accounts")}
            className="text-[12.5px] font-semibold text-brand hover:underline"
          >
            View all ({ACCOUNTS.length}) →
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ACCOUNTS.map((a) => {
            const t = TOTALS[a.id];
            const deals = DEALS.filter((d) => d.acct === a.id);
            const people = PEOPLE.filter((p) => p.acct === a.id);
            const moves = MOVES.filter((m) => m.acct === a.id);
            const hue = a.id === "A" ? "#2b6cb0" : a.id === "B" ? "#7c3aed" : "#059669";

            return (
              <article
                key={a.id}
                onClick={() => go(`/a/${a.id}`)}
                className="group flex flex-col justify-between overflow-hidden rounded-[22px] border border-line bg-white shadow-xs transition-all hover:border-brand-line hover:shadow-md cursor-pointer"
              >
                {/* Header */}
                <div className="border-b border-line2 bg-panel px-5 py-4 group-hover:bg-brand-tint/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={a.name} size={38} tone={hue} />
                      <div>
                        <h3 className="font-bold text-[15px] text-ink leading-tight group-hover:text-brand-dark transition-colors">
                          {a.name}
                        </h3>
                        <div className="text-[12px] text-mute mt-0.5">
                          Account {a.id} · {a.currency}
                        </div>
                      </div>
                    </div>
                    <Ico n="right" size={15} className="text-faint group-hover:text-brand transition-colors mt-1" />
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-5 space-y-2.5">
                  <div className="flex items-baseline justify-between border-b border-line2 pb-2 text-[13px]">
                    <span className="text-mute font-medium">Committed (Backed)</span>
                    <span className="font-bold text-ok tabular-nums">
                      {money(t?.backed ?? 0, t?.currency ?? a.currency)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-line2 pb-2 text-[13px]">
                    <span className="text-mute font-medium">Forecasted (Claimed)</span>
                    <span className="font-bold text-brand-dark tabular-nums">
                      {money(t?.claimed ?? 0, t?.currency ?? a.currency)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-mute font-medium">Unvalued Deals</span>
                    <span className="font-semibold text-warn">
                      {t?.unknownCount ?? 0} {t?.unknownCount === 1 ? "deal" : "deals"}
                    </span>
                  </div>
                </div>

                {/* Footer Badges */}
                <div className="border-t border-line2 bg-panel/60 px-5 py-3 flex items-center justify-between text-[12px] text-mute">
                  <span>{deals.length} deals · {people.length} contacts</span>
                  {moves.length > 0 && (
                    <span className="font-semibold text-brand">
                      {moves.length} {moves.length === 1 ? "action" : "actions"} due
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      {/* ── Top Priority Moves ── */}
      <Section
        title="Immediate Moves to Advance Pipeline"
        action={
          <button
            onClick={() => go("/actions")}
            className="text-[12.5px] font-semibold text-brand hover:underline"
          >
            All actions ({MOVES.length}) →
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOVES.slice(0, 4).map((m, i) => (
            <MoveCard key={m.id} m={m} rank={i + 1} />
          ))}
        </div>
      </Section>

      {/* ── Top Risks Radar ── */}
      {RISKS.length > 0 && (
        <Section
          title="Account Risk Radar"
          action={
            <button
              onClick={() => go("/risks")}
              className="text-[12.5px] font-semibold text-brand hover:underline"
            >
              All risks ({RISKS.length}) →
            </button>
          }
        >
          <div className="overflow-hidden rounded-[20px] border border-line bg-white shadow-xs">
            {RISKS.slice(0, 5).map((r) => (
              <RiskRow key={r.id} r={r} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   ACCOUNT DETAIL SCREEN (Supports A, B, K)
   ═════════════════════════════════════════════════════════════════════════ */

export function AccountDetail({ id }: { id: string }) {
  const { openComposer } = useApp();
  const [tab, setTab] = useState<"deals" | "people" | "moves" | "risks" | "gaps">("deals");

  const a = ACCOUNTS.find((x) => x.id === id);
  const t = TOTALS[id];
  const deals = DEALS.filter((d) => d.acct === id);
  const people = PEOPLE.filter((p) => p.acct === id);
  const moves = MOVES.filter((m) => m.acct === id);
  const risks = RISKS.filter((r) => r.acct === id);
  const gaps = GAPS.filter((g) => g.acct === id);
  const signals = SIGNALS.filter((s) => s.acct === id);

  if (!a) return <EmptyState title="Account not found" sub={`No record for ID ${id}`} />;

  const hue = id === "A" ? "#2b6cb0" : id === "B" ? "#7c3aed" : "#059669";

  const tabs = [
    { key: "deals", label: `Deals (${deals.length})`, icon: "target" },
    { key: "people", label: `Stakeholders (${people.length})`, icon: "user" },
    { key: "moves", label: `Actions (${moves.length})`, icon: "clock" },
    { key: "risks", label: `Risks (${risks.length})`, icon: "alert" },
    { key: "gaps", label: `Open Questions (${gaps.length})`, icon: "help" },
  ] as const;

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      {/* ── Account Hero Card ── */}
      <div className="rounded-[24px] border border-line bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={a.name} size={54} tone={hue} />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[22px] font-extrabold text-ink leading-tight">
                  {a.name}
                </h1>
                <Chip tone={id === "A" ? "blue" : id === "B" ? "gray" : "green"}>
                  {a.currency}
                </Chip>
              </div>
              <div className="text-[13px] text-mute mt-1">
                Account {a.id} · {deals.length} deals · {people.length} contacts on file
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Btn
              primary
              icon="note"
              onClick={() => openComposer({ attach: `acct:${id}` })}
            >
              Add Note
            </Btn>
          </div>
        </div>

        {/* Financial Highlights */}
        {t && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-line2">
            <div className="rounded-[14px] bg-ok-tint p-3 border border-ok-line/60">
              <div className="text-[10.5px] font-bold text-ok uppercase tracking-wider">
                Committed (Backed)
              </div>
              <div className="text-[19px] font-black text-ok mt-0.5">
                {money(t.backed, t.currency)}
              </div>
            </div>
            <div className="rounded-[14px] bg-brand-tint p-3 border border-brand-line/60">
              <div className="text-[10.5px] font-bold text-brand-dark uppercase tracking-wider">
                Forecasted (Claimed)
              </div>
              <div className="text-[19px] font-black text-brand-dark mt-0.5">
                {money(t.claimed, t.currency)}
              </div>
            </div>
            <div className="rounded-[14px] bg-panel p-3 border border-line">
              <div className="text-[10.5px] font-bold text-mute uppercase tracking-wider">
                Unvalued Deals
              </div>
              <div className="text-[19px] font-black text-ink mt-0.5">
                {t.unknownCount}
              </div>
            </div>
            <div className="rounded-[14px] bg-panel p-3 border border-line">
              <div className="text-[10.5px] font-bold text-mute uppercase tracking-wider">
                Open Offers
              </div>
              <div className="text-[19px] font-black text-ink mt-0.5">
                {money(t.openOffers, t.currency)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Active Signals ── */}
      {signals.length > 0 && (
        <div className="rounded-[18px] border border-bad-line bg-bad-tint/40 p-4">
          <div className="flex items-center gap-2 text-[12px] font-bold text-bad uppercase tracking-wider mb-2">
            <Ico n="signal" size={14} />
            Recent account signals ({signals.length})
          </div>
          <div className="space-y-1.5">
            {signals.map((s) => (
              <div key={s.id} className="text-[13px] text-ink font-medium">
                • {s.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabbed View ── */}
      <div className="rounded-[22px] border border-line bg-white shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-line bg-panel px-4 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold transition-all border-b-2 whitespace-nowrap ${
                tab === t.key
                  ? "border-brand text-brand bg-white"
                  : "border-transparent text-mute hover:text-ink"
              }`}
            >
              <Ico n={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {tab === "deals" && (
            <div className="space-y-4">
              {deals.length === 0 ? (
                <EmptyState title="No deals on file" sub="No opportunities recorded yet." />
              ) : (
                deals.map((d) => <DealCard key={d.id} d={d} />)
              )}
            </div>
          )}

          {tab === "people" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {people.length === 0 ? (
                <EmptyState title="No stakeholders" sub="No contacts identified yet." />
              ) : (
                people.map((p) => <ContactCard key={p.id} p={p} />)
              )}
            </div>
          )}

          {tab === "moves" && (
            <div className="space-y-3.5">
              {moves.length === 0 ? (
                <EmptyState title="No open actions" sub="All caught up." />
              ) : (
                moves.map((m, i) => <MoveCard key={m.id} m={m} rank={i + 1} variant="expanded" />)
              )}
            </div>
          )}

          {tab === "risks" && (
            <div className="overflow-hidden rounded-[16px] border border-line">
              {risks.length === 0 ? (
                <EmptyState title="No risks flagged" sub="No blockers on file." />
              ) : (
                risks.map((r) => <RiskRow key={r.id} r={r} />)
              )}
            </div>
          )}

          {tab === "gaps" && (
            <div className="space-y-3.5">
              {gaps.length === 0 ? (
                <EmptyState title="No open questions" sub="Information is complete." />
              ) : (
                gaps.map((g) => <GapRow key={g.id} g={g} />)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS (DealCard, ContactCard, Details)
   ═════════════════════════════════════════════════════════════════════════ */

export function DealCard({ d }: { d: Deal }) {
  const { go, openComposer } = useApp();
  return (
    <article
      onClick={() => go(`/d/${d.id}`)}
      className="rounded-[18px] border border-line bg-white p-5 shadow-xs hover:border-brand-line hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <StageChip stage={d.stage} />
            {d.bucket && (
              <Chip tone={d.bucket === "backed" ? "green" : d.bucket === "claimed" ? "amber" : "gray"}>
                {d.bucket === "backed" ? "Committed" : d.bucket === "claimed" ? "Forecasted" : "No value"}
              </Chip>
            )}
          </div>
          <h3 className="text-[16px] font-bold text-ink hover:text-brand-dark transition-colors">
            {d.name}
          </h3>
          {d.deadline && (
            <div className="text-[12.5px] text-warn font-medium mt-1 flex items-center gap-1">
              <Ico n="calendar" size={13} />
              {d.deadline.label}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-[20px] font-black text-ink tabular-nums">
            {d.worth !== null ? money(d.worth, d.currency) : "—"}
          </div>
          {d.owner && (
            <div className="text-[12px] text-mute mt-1">
              Owner: <span className="font-medium text-ink2">{d.owner}</span>
            </div>
          )}
        </div>
      </div>

      {/* Blocker / Status Pill */}
      {d.notCounted ? (
        <div className="mt-3.5 rounded-[12px] bg-bad-tint/50 border border-bad-line/50 p-2.5 text-[12.5px] text-bad flex items-start gap-2">
          <Ico n="alert" size={14} className="shrink-0 mt-0.5" />
          <span><b>Note:</b> {d.notCounted}</span>
        </div>
      ) : d.why ? (
        <div className="mt-3.5 text-[12.5px] text-mute line-clamp-1">
          {d.why}
        </div>
      ) : null}

      {/* Stakeholders grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-line2">
        {(["decider", "payer", "user", "blocker"] as const).map((r) => (
          <RoleSlot key={r} role={r} d={d} />
        ))}
      </div>
    </article>
  );
}

export function ContactCard({ p }: { p: Person }) {
  const { go } = useApp();
  return (
    <div
      onClick={() => go(`/p/${p.id}`)}
      className="flex items-center gap-3.5 rounded-[16px] border border-line bg-white p-4 shadow-xs hover:border-brand-line hover:shadow-sm transition-all cursor-pointer"
    >
      <Avatar name={p.name} size={40} tone={p.acct === "A" ? "#2b6cb0" : p.acct === "B" ? "#7c3aed" : "#059669"} />
      <div className="min-w-0 flex-1">
        <h4 className="font-bold text-[14.5px] text-ink leading-tight">{p.name}</h4>
        <div className="text-[12px] text-mute truncate mt-0.5">{p.title || "—"}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <WarmthChip w={p.warmth} />
          {!p.met && <Chip dashed>never met</Chip>}
        </div>
      </div>
      <Ico n="right" size={15} className="text-faint" />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   DEAL DETAIL SCREEN
   ═════════════════════════════════════════════════════════════════════════ */

export function DealDetail({ id }: { id: string }) {
  const { openComposer } = useApp();
  const d = DEALS.find((x) => x.id === id);
  if (!d) return <EmptyState title="Deal not found" />;

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StageChip stage={d.stage} />
            <Chip tone={d.bucket === "backed" ? "green" : "amber"}>{d.bucket}</Chip>
          </div>
          <h1 className="text-[24px] font-extrabold text-ink leading-tight">{d.name}</h1>
          <div className="text-[13px] text-mute mt-1">
            Account {d.acct} · {d.currency}
          </div>
        </div>
        <Btn primary icon="note" onClick={() => openComposer({ attach: `d:${id}` })}>
          Add Note
        </Btn>
      </div>

      {d.worth !== null && (
        <div className="rounded-[18px] border border-line bg-white p-5 shadow-xs">
          <Label className="mb-1">Deal Value</Label>
          <div className="text-[32px] font-black text-ink">{money(d.worth, d.currency)}</div>
        </div>
      )}

      {/* Stakeholders Matrix */}
      <div className="rounded-[18px] border border-line bg-white p-5 shadow-xs space-y-3">
        <Label>Stakeholder Coverage</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(["decider", "payer", "user", "blocker"] as const).map((r) => (
            <RoleSlot key={r} role={r} d={d} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   CONTACT DETAIL SCREEN
   ═════════════════════════════════════════════════════════════════════════ */

export function ContactDetail({ id }: { id: string }) {
  const { openComposer } = useApp();
  const p = PEOPLE.find((x) => x.id === id);
  if (!p) return <EmptyState title="Contact not found" />;

  const relatedDeals = DEALS.filter((d) => p.deals.includes(d.id));

  return (
    <div className="max-w-[680px] mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <Avatar name={p.name} size={60} tone={p.acct === "A" ? "#2b6cb0" : p.acct === "B" ? "#7c3aed" : "#059669"} />
        <div className="flex-1">
          <h1 className="text-[24px] font-extrabold text-ink">{p.name}</h1>
          <div className="text-[14px] text-mute mt-0.5">{p.title || "—"}</div>
          <div className="mt-2.5 flex items-center gap-2">
            <WarmthChip w={p.warmth} />
            {!p.met && <Chip dashed>never met</Chip>}
          </div>
        </div>
        <Btn primary icon="note" onClick={() => openComposer({ attach: `p:${id}` })}>
          Add Note
        </Btn>
      </div>

      <div className="rounded-[18px] border border-line bg-white p-5 shadow-xs">
        <Label className="mb-2">Last Contact Record</Label>
        <div className="text-[14px] text-ink font-medium">{p.last || "No recent contact on file."}</div>
      </div>

      {relatedDeals.length > 0 && (
        <div className="space-y-3">
          <Label>Associated Deals</Label>
          {relatedDeals.map((d) => (
            <DealCard key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   ACTION DETAIL SCREEN
   ═════════════════════════════════════════════════════════════════════════ */

export function ActionDetail({ id }: { id: string }) {
  const { openComposer } = useApp();
  const m = MOVES.find((x) => x.id === id);
  if (!m) return <EmptyState title="Action not found" />;

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[22px] font-extrabold text-ink leading-tight flex-1">
          {m.action}
        </h1>
        <Btn primary icon="note" onClick={() => openComposer({ attach: `d:${m.deal ?? ""}` })}>
          Add Note
        </Btn>
      </div>

      <div className="rounded-[18px] border border-line bg-white p-5 shadow-xs space-y-3">
        <div className="grid grid-cols-[100px_1fr] gap-2 text-[13.5px]">
          <span className="text-mute font-semibold">Due Date</span>
          <span className="font-bold text-ink">{m.due}</span>

          <span className="text-mute font-semibold">Owner</span>
          <span className="font-medium text-ink">{m.owner}</span>

          <span className="text-mute font-semibold">Account</span>
          <span className="font-medium text-ink">{acctName(m.acct)}</span>
        </div>
      </div>

      {m.why && (
        <div className="rounded-[18px] border border-line bg-white p-5 shadow-xs">
          <Label className="mb-2">Rationale & Impact</Label>
          <div className="text-[14px] text-ink2 leading-relaxed">{m.why}</div>
        </div>
      )}

      {m.ask && (
        <div className="rounded-[18px] border border-brand-line bg-brand-tint/60 p-5">
          <Label className="text-brand-dark mb-2">Recommended Talking Point / Email</Label>
          <div className="italic text-[13.5px] text-ink leading-relaxed">
            "{m.ask}"
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   ACCOUNTS LIST
   ═════════════════════════════════════════════════════════════════════════ */

export function AccountsList() {
  const { go } = useApp();
  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <h1 className="text-[24px] font-extrabold text-ink">Accounts ({ACCOUNTS.length})</h1>
      <div className="space-y-3.5">
        {ACCOUNTS.map((a) => {
          const t = TOTALS[a.id];
          const deals = DEALS.filter((d) => d.acct === a.id);
          const people = PEOPLE.filter((p) => p.acct === a.id);
          const hue = a.id === "A" ? "#2b6cb0" : a.id === "B" ? "#7c3aed" : "#059669";

          return (
            <div
              key={a.id}
              onClick={() => go(`/a/${a.id}`)}
              className="flex items-center gap-4 rounded-[20px] border border-line bg-white p-5 shadow-xs hover:border-brand-line hover:shadow-md transition-all cursor-pointer"
            >
              <Avatar name={a.name} size={48} tone={hue} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[16px] text-ink">{a.name}</h3>
                  <Chip tone={a.id === "A" ? "blue" : a.id === "B" ? "gray" : "green"}>{a.currency}</Chip>
                </div>
                <div className="text-[12.5px] text-mute mt-1">
                  {deals.length} deals · {people.length} contacts
                </div>
              </div>
              {t && (
                <div className="text-right">
                  <div className="text-[17px] font-black text-ok">{money(t.backed, t.currency)}</div>
                  <div className="text-[11px] text-mute uppercase font-semibold">Committed</div>
                </div>
              )}
              <Ico n="right" size={16} className="text-faint" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   ACTIONS LIST
   ═════════════════════════════════════════════════════════════════════════ */

export function ActionsList() {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? MOVES : MOVES.filter((m) => m.acct === filter);

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-extrabold text-ink">Next Actions ({filtered.length})</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[13px] text-ink outline-none"
        >
          <option value="all">All accounts</option>
          {ACCOUNTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filtered.map((m, i) => (
          <MoveCard key={m.id} m={m} rank={i + 1} variant="expanded" />
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   RISKS LIST
   ═════════════════════════════════════════════════════════════════════════ */

export function RisksList() {
  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <h1 className="text-[24px] font-extrabold text-ink">Risk Radar ({RISKS.length})</h1>
      <div className="overflow-hidden rounded-[20px] border border-line bg-white shadow-xs">
        {RISKS.map((r) => (
          <RiskRow key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   NOTES LIST
   ═════════════════════════════════════════════════════════════════════════ */

export function NotesList() {
  const { notes, openComposer } = useApp();

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-extrabold text-ink">Notes & Tasks ({notes.length})</h1>
        <Btn primary icon="plus" onClick={() => openComposer({})}>
          Add Note
        </Btn>
      </div>

      {notes.length === 0 ? (
        <EmptyState icon="note" title="No notes recorded yet" sub="Press '+ Add Note' to capture a note or task." />
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="rounded-[18px] border border-line bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="text-[14.5px] text-ink leading-relaxed">{n.text}</div>
                  <div className="flex items-center gap-2 pt-1 text-[11.5px] text-mute">
                    <Chip tone="gray">{n.kind}</Chip>
                    {n.attach && <span>Attached to: {n.attach}</span>}
                    <span>• {n.at}</span>
                  </div>
                </div>
                <span className="shrink-0">
                  <Chip tone={n.status === "sent" ? "green" : "amber"}>
                    {n.status ?? "queued"}
                  </Chip>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
