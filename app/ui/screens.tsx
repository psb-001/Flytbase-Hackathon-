"use client";
import { useState } from "react";
import {
  ACCOUNTS, DEALS, PEOPLE, MOVES, RISKS, SIGNALS, TOTALS, OFFERS, GAPS, money,
  type Deal, type Person, type Move, type Risk, type Signal, type Offer, type Gap,
} from "./data";
import {
  Avatar, Tag, Dot, StageBadge, WarmthBadge, ValueBadge, SevBadge, EmptyState, useApp,
} from "./ui";

/* ══════════════════════════════════════════════ DASHBOARD ══ */
export function Dashboard() {
  const { go } = useApp();

  const totalBacked = Object.values(TOTALS).reduce((s, t) => s + t.backed, 0);
  const totalDeals  = DEALS.length;
  const openActions = MOVES.length;
  const highRisks   = RISKS.filter(r => r.sev === "high").length;

  const urgentSignals = SIGNALS.filter(s => {
    const d = s.atISO ? new Date(s.atISO) : null;
    return d && d.getTime() - Date.now() < 7 * 86400000;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "Active Accounts", value: ACCOUNTS.length, icon: "🏢", tone: "blue" },
          { label: "Open Deals",      value: totalDeals,       icon: "🤝", tone: "green" },
          { label: "Open Actions",    value: openActions,      icon: "✅", tone: "amber" },
          { label: "High Risks",      value: highRisks,        icon: "⚠️", tone: "red" },
        ].map(s => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* alerts */}
      {urgentSignals.length > 0 && (
        <Section title="🔔 Alerts — Action Needed">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {urgentSignals.map(s => (
              <div key={s.id} className="card" style={{
                padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12,
                borderLeft: "3px solid var(--bad)",
              }}>
                <span style={{ fontSize: 18 }}>🚨</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.kind}</div>
                  <div style={{ fontSize: 13, color: "var(--mute)", marginTop: 2, lineHeight: 1.5 }}>{s.text}</div>
                  <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>{s.at}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* accounts overview */}
      <Section title="Accounts" action={<SmallBtn onClick={() => go("/accounts")}>View all →</SmallBtn>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {ACCOUNTS.map(a => {
            const t = TOTALS[a.id];
            const deals = DEALS.filter(d => d.acct === a.id);
            const contacts = PEOPLE.filter(p => p.acct === a.id);
            return (
              <div key={a.id} className="card" onClick={() => go(`/a/${a.id}`)}
                style={{ padding: "18px 20px", cursor: "pointer", transition: "box-shadow .15s" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,.08)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <Avatar name={a.name} size={40} color={a.id === "A" ? "blue" : "purple"} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "var(--mute)" }}>{deals.length} deals · {contacts.length} contacts · {a.currency}</div>
                  </div>
                </div>
                {t && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, background: "var(--ok-light)", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ok)", letterSpacing: ".06em", textTransform: "uppercase" }}>Committed</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ok)", marginTop: 2 }}>{money(t.backed, t.currency)}</div>
                    </div>
                    <div style={{ flex: 1, background: "var(--warn-light)", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--warn)", letterSpacing: ".06em", textTransform: "uppercase" }}>Forecasted</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--warn)", marginTop: 2 }}>{money(t.claimed, t.currency)}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* upcoming actions */}
      <Section title="Upcoming Actions" action={<SmallBtn onClick={() => go("/actions")}>View all →</SmallBtn>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MOVES.slice(0, 5).map(m => <ActionRow key={m.id} m={m} />)}
          {MOVES.length === 0 && <EmptyState icon="✅" title="No actions" />}
        </div>
      </Section>

      {/* high risks */}
      {RISKS.filter(r => r.sev === "high").length > 0 && (
        <Section title="Risks to Watch" action={<SmallBtn onClick={() => go("/risks")}>View all →</SmallBtn>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {RISKS.filter(r => r.sev === "high").slice(0, 4).map(r => <RiskRow key={r.id} r={r} />)}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════ ACCOUNT DETAIL ══ */
export function AccountDetail({ id }: { id: string }) {
  const { go, openComposer } = useApp();
  const [tab, setTab] = useState<"deals" | "contacts" | "actions" | "risks">("deals");

  const a    = ACCOUNTS.find(x => x.id === id);
  const t    = TOTALS[id];
  const deals    = DEALS.filter(d => d.acct === id);
  const contacts = PEOPLE.filter(p => p.acct === id);
  const actions  = MOVES.filter(m => m.acct === id).sort((a, b) => a.g - b.g);
  const risks    = RISKS.filter(r => r.acct === id).sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.sev] ?? 2) - ({ high: 0, med: 1, low: 2 }[b.sev] ?? 2));
  const signals  = SIGNALS.filter(s => s.acct === id);
  const gaps     = GAPS.filter(g => g.acct === id);
  const offers   = OFFERS.filter(o => {
    const deal = deals.find(d => d.acct === id);
    return true; // show all offers for this account currency
  }).filter(o => o.currency === a?.currency);

  if (!a) return <EmptyState icon="🏢" title="Account not found" />;

  const color = id === "A" ? "blue" : "purple";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <Avatar name={a.name} size={52} color={color} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{a.name}</h1>
          <div style={{ fontSize: 13, color: "var(--mute)", marginTop: 4 }}>
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
        <button onClick={() => openComposer({ attach: `acct:${id}` })}
          style={{ padding: "8px 16px", borderRadius: 8, background: "var(--brand)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          + Add Note
        </button>
      </div>

      {/* value strip */}
      {t && (
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <ValueCard label="Committed" value={money(t.backed, t.currency)} tone="green" />
          <ValueCard label="Forecasted" value={money(t.claimed, t.currency)} tone="amber" />
          {t.unknownCount > 0 && (
            <ValueCard label="No Value" value={`${t.unknownCount} deals`} tone="gray" />
          )}
        </div>
      )}

      {/* tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--line)", marginBottom: 20, gap: 0 }}>
        {([
          { key: "deals",    label: `Deals (${deals.length})` },
          { key: "contacts", label: `Contacts (${contacts.length})` },
          { key: "actions",  label: `Actions (${actions.length})` },
          { key: "risks",    label: `Risks (${risks.length})` },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "10px 18px", fontSize: 14, fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? "var(--brand)" : "var(--mute)",
            borderBottom: tab === t.key ? "2px solid var(--brand)" : "2px solid transparent",
            marginBottom: -2, background: "none", border: "none", borderBottomStyle: "solid",
            cursor: "pointer", transition: "color .15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* tab content */}
      {tab === "deals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {deals.length === 0
            ? <EmptyState icon="🤝" title="No deals yet" />
            : deals.map(d => <DealCard key={d.id} d={d} />)}
        </div>
      )}

      {tab === "contacts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {contacts.length === 0
            ? <EmptyState icon="👤" title="No contacts on file" />
            : contacts.map(p => <ContactRow key={p.id} p={p} />)}
        </div>
      )}

      {tab === "actions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {actions.length === 0
            ? <EmptyState icon="✅" title="No actions" />
            : actions.map(m => <ActionRow key={m.id} m={m} full />)}
        </div>
      )}

      {tab === "risks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {risks.length === 0
            ? <EmptyState icon="🛡️" title="No risks flagged" />
            : risks.map(r => <RiskRow key={r.id} r={r} full />)}
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

/* ══════════════════════════════════════════════ DEAL DETAIL ══ */
export function DealDetail({ id }: { id: string }) {
  const { go, openComposer } = useApp();
  const d = DEALS.find(x => x.id === id);
  if (!d) return <EmptyState icon="🤝" title="Deal not found" />;

  const contacts = PEOPLE.filter(p =>
    d.roles && Object.values(d.roles).some(r => r?.person === p.id)
  );
  const actions = MOVES.filter(m => m.deal === id);

  const roleLabel: Record<string, string> = {
    decider: "Decision Maker", payer: "Budget Owner",
    user: "End User", blocker: "Blocker",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <StageBadge stage={d.stage} />
            <ValueBadge bucket={d.bucket} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>{d.name}</h1>
          {d.deadline && (
            <div style={{ fontSize: 13, color: "var(--warn)", marginTop: 4 }}>📅 {d.deadline.label}</div>
          )}
          {d.owner && (
            <div style={{ fontSize: 13, color: "var(--mute)", marginTop: 2 }}>Owner: {d.owner}</div>
          )}
        </div>
        <button onClick={() => openComposer({ attach: `d:${id}` })}
          style={{ padding: "8px 16px", borderRadius: 8, background: "var(--brand)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          + Note
        </button>
      </div>

      {/* value */}
      {d.worth !== null && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Deal Value</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)" }}>{money(d.worth, d.currency)}</div>
        </div>
      )}

      {/* roles */}
      {Object.keys(d.roles ?? {}).length > 0 && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Stakeholders</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(d.roles ?? {}).map(([role, cell]) => {
              if (!cell) return null;
              const p = PEOPLE.find(x => x.id === cell.person);
              return (
                <div key={role} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 110, fontSize: 11, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".04em", paddingTop: 2, flexShrink: 0 }}>
                    {roleLabel[role] ?? role}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p?.name ?? cell.person}</div>
                    {p?.title && <div style={{ fontSize: 12, color: "var(--mute)" }}>{p.title}</div>}
                    {cell.waiting && (
                      <div style={{ marginTop: 4, padding: "6px 10px", borderRadius: 6, background: "var(--warn-light)", fontSize: 12, color: "var(--warn)", lineHeight: 1.4 }}>
                        ⏳ {cell.waiting.slice(0, 160)}{cell.waiting.length > 160 ? "…" : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* actions */}
      {actions.length > 0 && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {actions.map(m => <ActionRow key={m.id} m={m} full />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════ CONTACT DETAIL ══ */
export function ContactDetail({ id }: { id: string }) {
  const { openComposer } = useApp();
  const p = PEOPLE.find(x => x.id === id);
  if (!p) return <EmptyState icon="👤" title="Contact not found" />;
  const deals = DEALS.filter(d => p.deals.includes(d.id));
  const color = p.acct === "A" ? "blue" : "purple";
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <Avatar name={p.name} size={56} color={color} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>{p.name}</h1>
          <div style={{ fontSize: 14, color: "var(--mute)", marginTop: 2 }}>{p.title || "—"}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <WarmthBadge warmth={p.warmth} />
            {p.met && <Tag tone="blue">Met in person</Tag>}
          </div>
        </div>
        <button onClick={() => openComposer({ attach: `p:${id}` })}
          style={{ padding: "8px 16px", borderRadius: 8, background: "var(--brand)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          + Note
        </button>
      </div>

      <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px 16px", fontSize: 13 }}>
          <span style={{ color: "var(--mute)", fontWeight: 600 }}>Last contact</span>
          <span>{p.last}</span>
        </div>
      </div>

      {deals.length > 0 && (
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Involved In</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {deals.map(d => <DealCard key={d.id} d={d} compact />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════ ALL ACCOUNTS ══ */
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
              style={{ padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.07)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <Avatar name={a.name} size={44} color={a.id === "A" ? "blue" : "purple"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "var(--mute)" }}>{deals.length} deals · {contacts.length} contacts · {a.currency}</div>
              </div>
              {t && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ok)" }}>{money(t.backed, t.currency)}</div>
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

/* ══════════════════════════════════════════════ ALL ACTIONS ══ */
export function ActionsList() {
  const [acctFilter, setAcctFilter] = useState<string>("all");
  const filtered = acctFilter === "all" ? MOVES : MOVES.filter(m => m.acct === acctFilter);
  const sorted = [...filtered].sort((a, b) => a.dueISO.localeCompare(b.dueISO));
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Actions</h1>
        <select value={acctFilter} onChange={e => setAcctFilter(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, background: "var(--white)" }}>
          <option value="all">All accounts</option>
          {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.length === 0
          ? <EmptyState icon="✅" title="No actions" />
          : sorted.map(m => <ActionRow key={m.id} m={m} full />)}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════ ALL RISKS ══ */
export function RisksList() {
  const high = RISKS.filter(r => r.sev === "high");
  const med  = RISKS.filter(r => r.sev === "med");
  const low  = RISKS.filter(r => r.sev === "low");
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Risks</h1>
      {[
        { label: "🔴 High", items: high },
        { label: "🟡 Medium", items: med },
        { label: "⚪ Low", items: low },
      ].map(({ label, items }) => items.length > 0 && (
        <div key={label} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mute)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(r => <RiskRow key={r.id} r={r} full />)}
          </div>
        </div>
      ))}
      {RISKS.length === 0 && <EmptyState icon="🛡️" title="No risks flagged" />}
    </div>
  );
}

/* ══════════════════════════════════════════════ NOTES ══ */
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>{n.text}</div>
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="tag tag-gray">{n.kind}</span>
                      {n.attach && <span style={{ fontSize: 11, color: "var(--faint)" }}>{n.attach}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--faint)" }}>{n.at}</div>
                    <div style={{ marginTop: 4 }}>
                      {n.status === "queued"  && <span className="tag tag-amber">Queued</span>}
                      {n.status === "sending" && <span className="tag tag-blue">Sending…</span>}
                      {n.status === "sent"    && <span className="tag tag-green">Sent</span>}
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

/* ══════════════════════════════════════════════ SHARED ROWS ══ */

export function DealCard({ d, compact = false }: { d: Deal; compact?: boolean }) {
  const { go } = useApp();
  const people = PEOPLE.filter(p => d.roles && Object.values(d.roles).some(r => r?.person === p.id));
  return (
    <div className="card" onClick={() => go(`/d/${d.id}`)}
      style={{ padding: compact ? "12px 16px" : "16px 20px", cursor: "pointer", transition: "box-shadow .15s" }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.07)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: d.worth !== null ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: compact ? 13 : 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
          {d.deadline && <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 2 }}>📅 {d.deadline.label}</div>}
          {d.owner && !compact && <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 2 }}>Owner: {d.owner}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <StageBadge stage={d.stage} />
          <ValueBadge bucket={d.bucket} />
        </div>
      </div>
      {d.worth !== null && (
        <div style={{ fontSize: compact ? 16 : 20, fontWeight: 800, color: "var(--ink)" }}>{money(d.worth, d.currency)}</div>
      )}
      {!compact && people.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {people.map(p => (
            <span key={p.id} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 500,
              background: "var(--line2)", color: "var(--ink2)",
            }}>
              <Dot color={p.warmth === "ally" ? "green" : p.warmth === "warm" ? "amber" : p.warmth === "guarded" ? "red" : "gray"} />
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContactRow({ p }: { p: Person }) {
  const { go } = useApp();
  return (
    <div className="card" onClick={() => go(`/p/${p.id}`)}
      style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "box-shadow .15s" }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.07)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      <Avatar name={p.name} size={36} color={p.acct === "A" ? "blue" : "purple"} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
        <div style={{ fontSize: 12, color: "var(--mute)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title || "—"}</div>
      </div>
      <WarmthBadge warmth={p.warmth} />
      <div style={{ fontSize: 11, color: "var(--faint)", flexShrink: 0 }}>{p.last}</div>
      <span style={{ color: "var(--faint)", fontSize: 16 }}>›</span>
    </div>
  );
}

export function ActionRow({ m, full = false }: { m: Move; full?: boolean }) {
  const { go } = useApp();
  const isUrgent = m.dueISO <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const acct = ACCOUNTS.find(a => a.id === m.acct);
  return (
    <div className="card" onClick={() => go(`/m/${m.id}`)}
      style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12, transition: "box-shadow .15s",
        borderLeft: `3px solid ${isUrgent ? "var(--bad)" : "var(--brand)"}` }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.07)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 12, flexShrink: 0,
        background: m.g === 1 ? "var(--brand)" : "var(--line2)",
        color: m.g === 1 ? "#fff" : "var(--mute)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, marginTop: 1,
      }}>{m.g}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{m.action}</div>
        {full && m.why && <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4, lineHeight: 1.4 }}>{m.why}</div>}
        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {m.owner && <span className="tag tag-gray">👤 {m.owner}</span>}
          {acct && <span className="tag tag-blue">{acct.name}</span>}
        </div>
      </div>
      <div style={{ flexShrink: 0, fontSize: 12, fontWeight: isUrgent ? 700 : 400, color: isUrgent ? "var(--bad)" : "var(--mute)", textAlign: "right" }}>
        {m.due}
      </div>
    </div>
  );
}

export function RiskRow({ r, full = false }: { r: Risk; full?: boolean }) {
  const laneLabel: Record<string, string> = {
    deadline: "Deadline", warmth: "Relationship", stall: "Stalled", signal: "Alert",
  };
  const sevBorder: Record<string, string> = {
    high: "var(--bad)", med: "var(--warn)", low: "var(--faint)",
  };
  const acct = ACCOUNTS.find(a => a.id === r.acct);
  return (
    <div className="card" style={{ padding: "14px 16px", borderLeft: `3px solid ${sevBorder[r.sev] ?? sevBorder.low}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: "var(--ink)" }}>{r.what}</div>
          {full && r.what && <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4, lineHeight: 1.4 }}>{r.what}</div>}
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <SevBadge sev={r.sev} />
            <Tag tone="gray">{laneLabel[r.lane] ?? r.lane}</Tag>
            {acct && <Tag tone="blue">{acct.name}</Tag>}
          </div>
        </div>
        {r.turnsBadAt && (
          <div style={{ flexShrink: 0, fontSize: 11, color: r.sev === "high" ? "var(--bad)" : "var(--mute)", textAlign: "right" }}>
            By {r.turnsBadAt}
          </div>
        )}
      </div>
    </div>
  );
}

export function GapRow({ g }: { g: Gap }) {
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

/* ══════════════════════════════════════════════ ACTION DETAIL ══ */
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
        <button onClick={() => openComposer({ attach: `d:${m.deal ?? ""}` })}
          style={{ padding: "8px 16px", borderRadius: 8, background: "var(--brand)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>
          + Note
        </button>
      </div>
      <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px 16px", fontSize: 13 }}>
          {([ 
            ["Due", m.due],
            ["Owner", m.owner],
            ["Account", acct?.name ?? m.acct],
            ...(deal ? [["Deal", deal.name]] : []),
          ] as [string, string][]).map(([k, v]) => (
            <><span key={k} style={{ color: "var(--mute)", fontWeight: 600 }}>{k}</span><span>{v}</span></>
          ))}
        </div>
      </div>
      {m.why && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--mute)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Why This Matters</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink2)" }}>{m.why}</div>
        </div>
      )}
      {m.ask && (
        <div className="card" style={{ padding: "16px 20px", background: "var(--brand-light)", borderColor: "var(--brand-mid)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Suggested Message</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink2)", fontStyle: "italic" }}>"{m.ask}"</div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════ HELPERS ══ */

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: string }) {
  const bg: Record<string, string> = { blue: "var(--brand-light)", green: "var(--ok-light)", amber: "var(--warn-light)", red: "var(--bad-light)" };
  const fg: Record<string, string> = { blue: "var(--brand)", green: "var(--ok)", amber: "var(--warn)", red: "var(--bad)" };
  return (
    <div className="card" style={{ padding: "18px 20px", background: bg[tone] ?? "white", borderColor: "transparent" }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: fg[tone] ?? "var(--ink)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function ValueCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  const bg: Record<string, string> = { green: "var(--ok-light)", amber: "var(--warn-light)", gray: "var(--line2)" };
  const fg: Record<string, string> = { green: "var(--ok)", amber: "var(--warn)", gray: "var(--mute)" };
  return (
    <div style={{ background: bg[tone] ?? "white", borderRadius: 10, padding: "10px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: fg[tone], letterSpacing: ".07em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: fg[tone], marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--brand)", fontWeight: 600 }}>
      {children}
    </button>
  );
}

type ReactNode = import("react").ReactNode;
