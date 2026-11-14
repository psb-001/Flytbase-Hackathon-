"use client";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ACCOUNTS, DEALS, PEOPLE, MOVES, RISKS, GAPS, TOTALS, OFFERS,
  SIGNALS, money,
  type Deal, type Person, type Move, type Risk, type Gap, type Signal, type Offer,
} from "./data";
import {
  Avatar, Tag, StageBadge, WarmthBadge, ValueBadge, SevBadge,
  Btn, EmptyState, Section, useApp,
} from "./ui";

/* ══════ PULL BUTTON ══════════════════════════════════════════════════ */

export function PullButton() {
  const triggerRefresh = useMutation(api.ingest.triggerRefresh);
  const ingestStatus   = useQuery(api.ingest.status);
  const [state, setState] = useState<"idle" | "queued" | "done">("idle");

  const isLive   = (ingestStatus?.running ?? 0) > 0;
  const hasQueue = (ingestStatus?.queued  ?? 0) > 0;

  const pull = async () => {
    setState("queued");
    await triggerRefresh({});
    // Reset after 4s — the pump runs every 20s, so it will pick it up fast
    setTimeout(() => setState("done"), 4000);
    setTimeout(() => setState("idle"), 8000);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* queue indicator */}
      {(hasQueue || isLive) && (
        <span className="tag tag-amber" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="spinner" style={{ width: 10, height: 10, borderTopColor: "#92400e", borderColor: "#fde68a" }} />
          {isLive ? "Pulling…" : `${ingestStatus?.queued} queued`}
        </span>
      )}

      <button
        onClick={pull}
        disabled={state === "queued" || isLive}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "7px 14px", borderRadius: 10,
          border: "1px solid var(--brand-mid)",
          background: state === "done" ? "var(--ok-tint)" : "var(--brand-tint)",
          color: state === "done" ? "#15803d" : "var(--brand-dark)",
          fontWeight: 600, fontSize: 13, cursor: state === "queued" ? "default" : "pointer",
          opacity: state === "queued" ? .7 : 1,
          transition: "all .2s",
        }}
      >
        {state === "queued" ? (
          <><span className="spinner" style={{ width: 12, height: 12 }} />Queuing…</>
        ) : state === "done" ? (
          <>✓ Queued — arrives in ~1 min</>
        ) : (
          <>↻ Pull latest data</>
        )}
      </button>
    </div>
  );
}

/* ══════ DEAL CARD ═══════════════════════════════════════════════════ */
export function DealCard({ d, compact = false }: { d: Deal; compact?: boolean }) {
  const { go, openComposer } = useApp();
  const contacts = PEOPLE.filter(p => d.roles && Object.values(d.roles).some(r => r?.person === p.id));

  return (
    <article
      className="card"
      onClick={() => go(`/d/${d.id}`)}
      style={{ padding: compact ? "14px 16px" : "18px 20px", cursor: "pointer", transition: "box-shadow .15s" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.07)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: compact ? 14 : 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {d.name}
          </div>
          {d.deadline && (
            <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 2 }}>📅 {d.deadline.label}</div>
          )}
          {d.owner && !compact && (
            <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 1 }}>Owner: {d.owner}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
          <StageBadge stage={d.stage} />
          <ValueBadge bucket={d.bucket} />
        </div>
      </div>

      {d.worth !== null && (
        <div style={{ fontSize: compact ? 18 : 22, fontWeight: 800, color: "var(--ink)", marginBottom: 10 }}>
          {money(d.worth, d.currency)}
        </div>
      )}

      {!compact && contacts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {contacts.map(p => (
            <span key={p.id} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 500,
              background: "var(--line2)", color: "var(--ink2)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: p.warmth === "ally" ? "#22c55e" : p.warmth === "warm" ? "#f59e0b" : p.warmth === "guarded" ? "#ef4444" : "#d1d5db",
              }} />
              {p.name}
            </span>
          ))}
        </div>
      )}

      {!compact && (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); openComposer({ attach: `d:${d.id}` }); }}
            style={{ fontSize: 12, color: "var(--mute)", background: "none", border: "none", cursor: "pointer" }}
          >
            + Add note
          </button>
        </div>
      )}
    </article>
  );
}

/* ══════ CONTACT ROW ════════════════════════════════════════════════ */
export function ContactRow({ p }: { p: Person }) {
  const { go } = useApp();
  return (
    <div
      className="card"
      onClick={() => go(`/p/${p.id}`)}
      style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "box-shadow .15s" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}
    >
      <Avatar name={p.name} size={36} hue={p.acct === "A" ? "blue" : "purple"} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
        <div style={{ fontSize: 12, color: "var(--mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.title || "—"}
        </div>
      </div>
      <WarmthBadge warmth={p.warmth} />
      <div style={{ fontSize: 11, color: "var(--faint)", flexShrink: 0 }}>{p.last}</div>
      <span style={{ color: "var(--faint)" }}>›</span>
    </div>
  );
}

/* ══════ ACTION ROW ════════════════════════════════════════════════ */
export function ActionRow({ m, full = false }: { m: Move; full?: boolean }) {
  const { go } = useApp();
  const isUrgent = m.dueISO <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const acct = ACCOUNTS.find(a => a.id === m.acct);
  return (
    <div
      className="card"
      onClick={() => go(`/m/${m.id}`)}
      style={{
        padding: "13px 16px", cursor: "pointer",
        display: "flex", alignItems: "flex-start", gap: 12,
        borderLeft: `3px solid ${isUrgent ? "var(--bad)" : "var(--brand)"}`,
        transition: "box-shadow .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 11, flexShrink: 0,
        background: m.g === 1 ? "var(--brand)" : "var(--line2)",
        color: m.g === 1 ? "#fff" : "var(--mute)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, marginTop: 1,
      }}>{m.g}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{m.action}</div>
        {full && m.why && (
          <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4, lineHeight: 1.4 }}>{m.why}</div>
        )}
        <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
          {m.owner && <Tag tone="gray">👤 {m.owner}</Tag>}
          {acct && <Tag tone="blue">{acct.name}</Tag>}
        </div>
      </div>
      <div style={{
        flexShrink: 0, fontSize: 12, textAlign: "right",
        fontWeight: isUrgent ? 700 : 400,
        color: isUrgent ? "var(--bad)" : "var(--mute)",
      }}>{m.due}</div>
    </div>
  );
}

/* ══════ RISK ROW ══════════════════════════════════════════════════ */
export function RiskRow({ r, full = false }: { r: Risk; full?: boolean }) {
  const laneLabel: Record<string, string> = {
    deadline: "Deadline", warmth: "Relationship", stall: "Stalled", signal: "Alert",
  };
  const sevBorder = { high: "var(--bad)", med: "var(--warn)", low: "var(--faint)" }[r.sev] ?? "var(--faint)";
  const acct = ACCOUNTS.find(a => a.id === r.acct);
  return (
    <div className="card" style={{ padding: "14px 16px", borderLeft: `3px solid ${sevBorder}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{r.what}</div>
          <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
            <SevBadge sev={r.sev} />
            <Tag tone="gray">{laneLabel[r.lane] ?? r.lane}</Tag>
            {acct && <Tag tone="blue">{acct.name}</Tag>}
          </div>
        </div>
        {r.turnsBadAt && (
          <div style={{ flexShrink: 0, fontSize: 11, color: r.sev === "high" ? "var(--bad)" : "var(--mute)", textAlign: "right", paddingTop: 2 }}>
            By {r.turnsBadAt}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════ SIGNAL ROW ════════════════════════════════════════════════ */
function SignalRow({ s }: { s: Signal }) {
  return (
    <div className="card" style={{ padding: "14px 18px", borderLeft: "3px solid var(--bad)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>🚨 {s.kind}</div>
          <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 4, lineHeight: 1.5 }}>{s.text}</div>
        </div>
        <div style={{ flexShrink: 0, fontSize: 11, color: "var(--mute)", textAlign: "right" }}>{s.at}</div>
      </div>
    </div>
  );
}

/* ══════ DASHBOARD ═══════════════════════════════════════════════ */
export function Dashboard() {
  const { go } = useApp();

  const highRisks  = RISKS.filter(r => r.sev === "high").length;
  const openActions = MOVES.length;
  const urgent = SIGNALS.filter(s => {
    const d = s.atISO ? new Date(s.atISO) : null;
    return d && d.getTime() - Date.now() < 7 * 86400000;
  });

  return (
    <div>
      {/* stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Accounts",     value: ACCOUNTS.length, icon: "🏢", bg: "var(--brand-tint)",  fg: "var(--brand-dark)" },
          { label: "Open Deals",   value: DEALS.length,    icon: "🤝", bg: "var(--ok-tint)",     fg: "#15803d" },
          { label: "Actions Due",  value: openActions,     icon: "✅", bg: "var(--warn-tint)",   fg: "#92400e" },
          { label: "High Risks",   value: highRisks,       icon: "⚠️", bg: "var(--bad-tint)",    fg: "#991b1b" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "18px 20px", background: s.bg, borderColor: "transparent" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: s.fg, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: s.fg, opacity: .7, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* alerts */}
      {urgent.length > 0 && (
        <Section title="🔔 Alerts — Action Needed">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {urgent.map(s => <SignalRow key={s.id} s={s} />)}
          </div>
        </Section>
      )}

      {/* accounts */}
      <Section title="Accounts" action={<SmallLink onClick={() => go("/accounts")}>View all →</SmallLink>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {ACCOUNTS.map(a => {
            const t = TOTALS[a.id];
            const deals = DEALS.filter(d => d.acct === a.id);
            const people = PEOPLE.filter(p => p.acct === a.id);
            return (
              <div key={a.id} className="card" onClick={() => go(`/a/${a.id}`)}
                style={{ padding: "18px 20px", cursor: "pointer", transition: "box-shadow .15s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <Avatar name={a.name} size={40} hue={a.id === "A" ? "blue" : "purple"} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "var(--mute)" }}>
                      {deals.length} deals · {people.length} contacts · {a.currency}
                    </div>
                  </div>
                </div>
                {t && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, background: "var(--ok-tint)", borderRadius: 10, padding: "8px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", letterSpacing: ".07em", textTransform: "uppercase" }}>Committed</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#15803d", marginTop: 2 }}>{money(t.backed, t.currency)}</div>
                    </div>
                    <div style={{ flex: 1, background: "var(--warn-tint)", borderRadius: 10, padding: "8px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", letterSpacing: ".07em", textTransform: "uppercase" }}>Forecasted</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#92400e", marginTop: 2 }}>{money(t.claimed, t.currency)}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* upcoming actions */}
      <Section title="Upcoming Actions" action={<SmallLink onClick={() => go("/actions")}>View all →</SmallLink>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MOVES.slice(0, 4).map(m => <ActionRow key={m.id} m={m} />)}
          {MOVES.length === 0 && <EmptyState icon="✅" title="No actions" />}
        </div>
      </Section>

      {/* top risks */}
      {RISKS.filter(r => r.sev === "high").length > 0 && (
        <Section title="Top Risks" action={<SmallLink onClick={() => go("/risks")}>View all →</SmallLink>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {RISKS.filter(r => r.sev === "high").slice(0, 3).map(r => <RiskRow key={r.id} r={r} />)}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ══════ ACCOUNT DETAIL ══════════════════════════════════════════ */
export function AccountDetail({ id }: { id: string }) {
  const { go, openComposer } = useApp();
  const [tab, setTab] = useState<"deals" | "contacts" | "actions" | "risks">("deals");

  const a       = ACCOUNTS.find(x => x.id === id);
  const t       = TOTALS[id];
  const deals   = DEALS.filter(d => d.acct === id);
  const contacts= PEOPLE.filter(p => p.acct === id);
  const actions = MOVES.filter(m => m.acct === id).sort((a, b) => a.g - b.g);
  const risks   = RISKS.filter(r => r.acct === id)
    .sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.sev] ?? 2) - ({ high: 0, med: 1, low: 2 }[b.sev] ?? 2));
  const signals = SIGNALS.filter(s => s.acct === id);
  const gaps    = GAPS.filter(g => g.acct === id);

  if (!a) return <EmptyState icon="🏢" title="Account not found" />;

  const tabs = [
    { key: "deals",    label: `Deals (${deals.length})` },
    { key: "contacts", label: `Contacts (${contacts.length})` },
    { key: "actions",  label: `Actions (${actions.length})` },
    { key: "risks",    label: `Risks (${risks.length})` },
  ] as const;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <Avatar name={a.name} size={52} hue={id === "A" ? "blue" : "purple"} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{a.name}</h1>
          <div style={{ fontSize: 13, color: "var(--mute)", marginTop: 3 }}>
            {deals.length} deals · {contacts.length} contacts · {a.currency}
          </div>
          {signals.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {signals.map(s => (
                <span key={s.id} className="tag tag-red">🚨 {s.kind} · {s.at}</span>
              ))}
            </div>
          )}
        </div>
        <Btn primary onClick={() => openComposer({ attach: `acct:${id}` })}>+ Note</Btn>
      </div>

      {/* value strip */}
      {t && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Committed",  value: money(t.backed, t.currency),              bg: "var(--ok-tint)",   fg: "#15803d" },
            { label: "Forecasted", value: money(t.claimed, t.currency),             bg: "var(--warn-tint)", fg: "#92400e" },
            ...(t.unknownCount > 0 ? [{ label: "No Value Yet", value: `${t.unknownCount} deals`, bg: "var(--line2)", fg: "var(--mute)" }] : []),
          ].map(x => (
            <div key={x.label} style={{ background: x.bg, borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: x.fg, letterSpacing: ".07em", textTransform: "uppercase" }}>{x.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: x.fg, marginTop: 2 }}>{x.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--line)", marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "10px 18px", fontSize: 14,
            fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? "var(--brand)" : "var(--mute)",
            borderBottom: `2px solid ${tab === t.key ? "var(--brand)" : "transparent"}`,
            marginBottom: -2, background: "none", border: "none",
            borderBottomStyle: "solid", cursor: "pointer", transition: "color .15s",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "deals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {deals.length === 0 ? <EmptyState icon="🤝" title="No deals yet" /> : deals.map(d => <DealCard key={d.id} d={d} />)}
        </div>
      )}
      {tab === "contacts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {contacts.length === 0 ? <EmptyState icon="👤" title="No contacts" /> : contacts.map(p => <ContactRow key={p.id} p={p} />)}
        </div>
      )}
      {tab === "actions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {actions.length === 0 ? <EmptyState icon="✅" title="No actions" /> : actions.map(m => <ActionRow key={m.id} m={m} full />)}
        </div>
      )}
      {tab === "risks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {risks.length === 0 ? <EmptyState icon="🛡️" title="No risks flagged" /> : risks.map(r => <RiskRow key={r.id} r={r} full />)}
          {gaps.length > 0 && (
            <>
              <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".06em" }}>Open Questions</div>
              {gaps.map(g => <GapRow key={g.id} g={g} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════ DEAL DETAIL ═════════════════════════════════════════════ */
export function DealDetail({ id }: { id: string }) {
  const { openComposer } = useApp();
  const d = DEALS.find(x => x.id === id);
  if (!d) return <EmptyState icon="🤝" title="Deal not found" />;
  const contacts = PEOPLE.filter(p => d.roles && Object.values(d.roles).some(r => r?.person === p.id));
  const actions  = MOVES.filter(m => m.deal === id);
  const roleLabel: Record<string, string> = {
    decider: "Decision Maker", payer: "Budget Owner",
    user: "End User", blocker: "Blocker",
  };
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
            <StageBadge stage={d.stage} />
            <ValueBadge bucket={d.bucket} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>{d.name}</h1>
          {d.deadline && <div style={{ fontSize: 13, color: "var(--warn)", marginTop: 4 }}>📅 {d.deadline.label}</div>}
          {d.owner && <div style={{ fontSize: 13, color: "var(--mute)", marginTop: 2 }}>Owner: {d.owner}</div>}
        </div>
        <Btn primary onClick={() => openComposer({ attach: `d:${id}` })}>+ Note</Btn>
      </div>

      {d.worth !== null && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>Deal Value</div>
          <div style={{ fontSize: 30, fontWeight: 900 }}>{money(d.worth, d.currency)}</div>
        </div>
      )}

      {Object.keys(d.roles ?? {}).length > 0 && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Stakeholders</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(d.roles ?? {}).map(([role, cell]) => {
              if (!cell) return null;
              const p = PEOPLE.find(x => x.id === cell.person);
              return (
                <div key={role} style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 110, fontSize: 11, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".04em", paddingTop: 2, flexShrink: 0 }}>
                    {roleLabel[role] ?? role}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p?.name ?? cell.person}</div>
                    {p?.title && <div style={{ fontSize: 12, color: "var(--mute)" }}>{p.title}</div>}
                    {cell.waiting && (
                      <div style={{ marginTop: 5, padding: "6px 10px", borderRadius: 8, background: "var(--warn-tint)", fontSize: 12, color: "#92400e", lineHeight: 1.4 }}>
                        ⏳ {cell.waiting.slice(0, 180)}{cell.waiting.length > 180 ? "…" : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {actions.map(m => <ActionRow key={m.id} m={m} full />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════ CONTACT DETAIL ══════════════════════════════════════════ */
export function ContactDetail({ id }: { id: string }) {
  const { openComposer } = useApp();
  const p = PEOPLE.find(x => x.id === id);
  if (!p) return <EmptyState icon="👤" title="Contact not found" />;
  const deals = DEALS.filter(d => p.deals.includes(d.id));
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <Avatar name={p.name} size={56} hue={p.acct === "A" ? "blue" : "purple"} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>{p.name}</h1>
          <div style={{ fontSize: 14, color: "var(--mute)", marginTop: 2 }}>{p.title || "—"}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <WarmthBadge warmth={p.warmth} />
            {p.met && <Tag tone="blue">Met</Tag>}
          </div>
        </div>
        <Btn primary onClick={() => openComposer({ attach: `p:${id}` })}>+ Note</Btn>
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px 16px", fontSize: 13 }}>
          <span style={{ color: "var(--mute)", fontWeight: 600 }}>Last contact</span>
          <span>{p.last}</span>
        </div>
      </div>

      {deals.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>Deals</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {deals.map(d => <DealCard key={d.id} d={d} compact />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════ ACTION DETAIL ═══════════════════════════════════════════ */
export function ActionDetail({ id }: { id: string }) {
  const { openComposer } = useApp();
  const m = MOVES.find(x => x.id === id);
  if (!m) return <EmptyState icon="✅" title="Action not found" />;
  const deal = DEALS.find(d => d.id === m.deal);
  const acct = ACCOUNTS.find(a => a.id === m.acct);
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, flex: 1 }}>{m.action}</h1>
        <Btn primary onClick={() => openComposer({ attach: `d:${m.deal ?? ""}` })}>+ Note</Btn>
      </div>
      <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "10px 16px", fontSize: 13 }}>
          {([["Due", m.due], ["Owner", m.owner], ["Account", acct?.name ?? m.acct], ...(deal ? [["Deal", deal.name]] : [])] as [string, string][]).map(([k, v]) => (
            <><span key={k} style={{ color: "var(--mute)", fontWeight: 600 }}>{k}</span><span>{v}</span></>
          ))}
        </div>
      </div>
      {m.why && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Why This Matters</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink2)" }}>{m.why}</div>
        </div>
      )}
      {m.ask && (
        <div className="card" style={{ padding: "16px 20px", background: "var(--brand-tint)", borderColor: "var(--brand-mid)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-dark)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Suggested Message</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink2)", fontStyle: "italic" }}>"{m.ask}"</div>
        </div>
      )}
    </div>
  );
}

/* ══════ ALL ACCOUNTS ════════════════════════════════════════════ */
export function AccountsList() {
  const { go } = useApp();
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Accounts</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ACCOUNTS.map(a => {
          const t = TOTALS[a.id];
          const deals = DEALS.filter(d => d.acct === a.id);
          const contacts = PEOPLE.filter(p => p.acct === a.id);
          return (
            <div key={a.id} className="card" onClick={() => go(`/a/${a.id}`)}
              style={{ padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "box-shadow .15s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.07)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}
            >
              <Avatar name={a.name} size={44} hue={a.id === "A" ? "blue" : "purple"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "var(--mute)" }}>{deals.length} deals · {contacts.length} contacts · {a.currency}</div>
              </div>
              {t && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#15803d" }}>{money(t.backed, t.currency)}</div>
                  <div style={{ fontSize: 11, color: "var(--mute)" }}>committed</div>
                </div>
              )}
              <span style={{ color: "var(--faint)", fontSize: 18 }}>›</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════ ALL ACTIONS ═════════════════════════════════════════════ */
export function ActionsList() {
  const [acctFilter, setAcctFilter] = useState("all");
  const filtered = acctFilter === "all" ? MOVES : MOVES.filter(m => m.acct === acctFilter);
  const sorted = [...filtered].sort((a, b) => a.dueISO.localeCompare(b.dueISO));
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Actions</h1>
        <select value={acctFilter} onChange={e => setAcctFilter(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, background: "var(--white)" }}>
          <option value="all">All accounts</option>
          {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.length === 0 ? <EmptyState icon="✅" title="No actions" /> : sorted.map(m => <ActionRow key={m.id} m={m} full />)}
      </div>
    </div>
  );
}

/* ══════ ALL RISKS ═══════════════════════════════════════════════ */
export function RisksList() {
  const high = RISKS.filter(r => r.sev === "high");
  const med  = RISKS.filter(r => r.sev === "med");
  const low  = RISKS.filter(r => r.sev === "low");
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Risks</h1>
      {[{ label: "High", items: high }, { label: "Medium", items: med }, { label: "Low", items: low }].map(({ label, items }) =>
        items.length > 0 ? (
          <div key={label} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
              {label === "High" ? "🔴" : label === "Medium" ? "🟡" : "⚪"} {label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(r => <RiskRow key={r.id} r={r} full />)}
            </div>
          </div>
        ) : null
      )}
      {RISKS.length === 0 && <EmptyState icon="🛡️" title="No risks flagged" />}
    </div>
  );
}

/* ══════ NOTES ═══════════════════════════════════════════════════ */
export function NotesList() {
  const { notes } = useApp();
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Notes</h1>
      {notes.length === 0
        ? <EmptyState icon="📝" title="No notes yet" sub='Press "+" to add one' />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map(n => (
              <div key={n.id} className="card" style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{n.text}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <Tag tone="gray">{n.kind}</Tag>
                      {n.attach && <span style={{ fontSize: 11, color: "var(--faint)" }}>{n.attach}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--faint)" }}>{n.at}</div>
                    <div style={{ marginTop: 4 }}>
                      {n.status === "queued"  && <Tag tone="amber">Queued</Tag>}
                      {n.status === "sending" && <Tag tone="blue">Sending…</Tag>}
                      {n.status === "sent"    && <Tag tone="green">Sent ✓</Tag>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ══════ GAP ROW ════════════════════════════════════════════════ */
function GapRow({ g }: { g: Gap }) {
  return (
    <div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>❓</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{g.what}</div>
        {g.q && <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 3 }}>{g.q}</div>}
      </div>
    </div>
  );
}

function SmallLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--brand)", fontWeight: 600 }}>
      {children}
    </button>
  );
}
