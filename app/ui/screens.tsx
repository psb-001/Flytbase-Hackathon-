"use client";

import { useState, type ReactNode } from "react";
import {
  ACCOUNTS,
  ASSUMPTIONS,
  CLEAR,
  DEALS,
  GAPS,
  HEADLINE,
  MOVES,
  PEOPLE,
  RISKS,
  ROLES,
  SIGNALS,
  TOTALS,
  acctName,
  coverage,
  deal,
  money,
  person,
  source,
  type Lane,
} from "./data";
import { Ico } from "./icons";
import {
  Avatar,
  Btn,
  Chip,
  Cite,
  ConfidenceChip,
  CoverageBar,
  EmptyState,
  GapRow,
  Label,
  PersonChip,
  RiskRow,
  RoleSlot,
  SignalRow,
  SourceChip,
  StageChip,
  WarmthChip,
  useApp,
  LANES,
} from "./ui";

const STEPS = ["identified", "qualified", "cleared", "agreed"] as const;

export function Back({ to, label }: { to: string; label: string }) {
  const { go } = useApp();
  return (
    <button type="button" onClick={() => go(to)} className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-[13px] text-ink2 hover:bg-panel">
      <Ico n="arrow" size={14} className="rotate-180" />{label}
    </button>
  );
}

export function Head({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="min-w-0"><Label>{eyebrow}</Label><h1 className="mt-1 text-[22px] leading-tight font-light tracking-[-.02em] break-words sm:text-[28px] text-ink">{title}</h1></div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Panel({ title, icon, children, aside }: { title: string; icon: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line2 bg-panel px-4 py-4 sm:px-6">
        <span className="flex items-center gap-2.5 text-[15px] font-medium text-ink"><span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-brand-tint text-brand-dark"><Ico n={icon} size={14} /></span>{title}</span>{aside}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

const NotFound = ({ what }: { what: string }) => { const { go } = useApp(); return <div className="py-20 text-center"><h1 className="text-[26px] font-light">{what} not found</h1><Btn className="mt-4" onClick={() => go("/")}>Return to Monday</Btn></div>; };

function SignalCard({ s }: { s: (typeof SIGNALS)[number] }) {
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Chip tone="blue" className="px-3 py-1 text-[12.5px]">{s.kind}</Chip>
          <span className="flex items-center gap-1.5 text-[12.5px] text-mute"><Ico n="clock" size={14} /><Cite id={s.id}>{s.at}</Cite></span>
        </div>
        <div className="min-w-0 text-[17px] leading-[1.4] font-medium break-words text-ink">{s.text}</div>
        {s.diff && (
          <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden rounded-[16px] border border-line text-[13.5px]">
            <div className="min-w-0 bg-bad-tint/50 px-4 py-3.5"><div className="mb-1 text-[11px] font-medium tracking-wide text-mute uppercase">Before</div><div className="break-words text-ink2 line-through decoration-faint">{s.diff.before}</div></div>
            <div className="flex items-center bg-panel px-2 text-mute"><Ico n="arrow" size={16} /></div>
            <div className="min-w-0 bg-ok-tint/60 px-4 py-3.5"><div className="mb-1 text-[11px] font-medium tracking-wide text-mute uppercase">After</div><div className="break-words font-medium text-ink">{s.diff.after}</div></div>
          </div>
        )}
        <div className="flex min-w-0 flex-wrap gap-2">{s.moves.map((m) => <Chip key={m} className="px-3 py-1 text-[12.5px]">{m}</Chip>)}</div>
      </div>
      <div className="flex items-center justify-between border-t border-line2 bg-panel px-6 py-3.5 text-[13px]">
        <span className="text-mute">Where this came from</span>
        <Cite id={s.id} className="inline-flex items-center gap-1.5 font-medium text-brand"><Ico n="file" size={14} />View source</Cite>
      </div>
    </article>
  );
}

/* ---------- DEAL ---------- */
export function DealScreen({ id }: { id: string }) {
  const { go, openComposer } = useApp();
  const d = DEALS.find((x) => x.id === id);
  if (!d) return <NotFound what="Deal" />;
  const i = d.stage ? STEPS.indexOf(d.stage) : -1;
  const gaps = GAPS.filter((g) => g.acct === d.acct);
  const risks = RISKS.filter((r) => r.deal === d.id);
  const moves = MOVES.filter((m) => m.deal === d.id);
  const sigs = SIGNALS.filter((s) => s.deal === d.id);
  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="grid grid-cols-[88px_1fr] items-start gap-3 border-b border-line2 py-4 last:border-b-0">
      <dt className="pt-0.5 text-[11.5px] font-medium tracking-[.08em] text-mute uppercase">{label}</dt>
      <dd className="min-w-0 text-[14px] text-ink">{children}</dd>
    </div>
  );
  const none = (t: string) => <span className="inline-block rounded-full border border-dashed border-faint bg-panel px-3 py-1 text-[12.5px] text-mute">{t}</span>;
  return (
    <div>
      <Back to={`/a/${d.acct}`} label={acctName(d.acct)} />
      <Head eyebrow={`Deal \u00b7 ${acctName(d.acct)}`} title={<Cite id={d.id}>{d.name}</Cite>}>
        <Btn icon="note" primary onClick={() => openComposer({ kind: "Note", attach: d.id })}>Write a note</Btn>
      </Head>
      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <Panel title="Stage" icon="flag" aside={<StageChip stage={d.stage} />}>
            <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STEPS.map((st, k) => (
                <li key={st} className="min-w-0">
                  <div className={`h-[8px] rounded-full ${k <= i ? "bg-brand" : "bg-line"}`} />
                  <div className={`mt-2.5 flex items-center gap-1.5 text-[13px] ${k === i ? "font-medium text-ink" : k < i ? "text-ink2" : "text-mute"}`}>{k < i ? <Ico n="check" size={14} className="text-ok" /> : k === i ? <Ico n="dot" size={14} className="text-brand" /> : <span className="w-[14px]" />}{st}</div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[13px] text-ink2">{d.why}</p>
          </Panel>
          <Panel title="Power map" icon="map" aside={<CoverageBar d={d} />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{ROLES.map((r) => <RoleSlot key={r} role={r} d={d} />)}</div>
          </Panel>
          <Panel title="First moves" icon="target">
            {moves.length ? <ul className="space-y-3">{moves.map((m) => <li key={m.id}><button type="button" onClick={() => go(`/m/${m.id}`)} className="flex w-full items-center gap-3 rounded-[16px] border border-line p-4 text-left hover:bg-panel"><span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-dark">{m.g}</span><span className="min-w-0 flex-1 text-[14px] text-ink">{m.action}</span><Ico n="right" size={16} className="text-mute" /></button></li>)}</ul> : <EmptyState kind="clear" detail="No ranked move touches this deal yet." />}
          </Panel>
          <Panel title="Risks" icon="alert">
            {risks.length ? <div className="overflow-hidden rounded-[14px] border border-line">{risks.map((r) => <RiskRow key={r.id} r={r} />)}</div> : <EmptyState kind="risks" />}
          </Panel>
          <Panel title="Gaps on this account" icon="help">
            {gaps.length ? <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-stretch gap-4">{gaps.map((g) => <GapRow key={g.id} g={g} />)}</div> : <EmptyState kind="gaps" />}
          </Panel>
          <Panel title="Signals" icon="signal">
            {sigs.length ? <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-stretch gap-6">{sigs.map((s) => <SignalCard key={s.id} s={s} />)}</div> : <EmptyState kind="clear" detail="No signal points at this deal." />}
          </Panel>
        </div>
        <aside className="space-y-8 lg:sticky lg:top-[86px]">
          <Panel title="Key facts" icon="book">
            <dl className="-my-4">
              <Row label="Worth">{d.worth != null && d.worthFact ? <Cite id={d.worthFact} className="text-[26px] font-light tabular-nums">{money(d.worth, d.currency)}</Cite> : none(d.stage ? "None until qualified" : "No value")}</Row>
              <Row label="Deadline">{d.deadline ? <Cite id={d.deadline.src} className="inline-flex items-center gap-1.5 font-medium"><Ico n="calendar" size={15} className="text-brand" />{d.deadline.label}</Cite> : none("None on file")}</Row>
              <Row label="Owner">{d.owner ? <span className="inline-flex items-center gap-2"><Avatar name={d.owner} size={22} />{d.owner}</span> : none("Unassigned")}</Row>
              <Row label="Backed by"><div className="flex flex-wrap gap-1.5">{d.backedBy.length ? d.backedBy.map((f) => <SourceChip key={f} id={f} />) : none("No file")}</div></Row>
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

/* ---------- PERSON ---------- */
export function PersonScreen({ id }: { id: string }) {
  const { go, openComposer, copy } = useApp();
  const p = PEOPLE.find((x) => x.id === id);
  const [c, setC] = useState(false);
  if (!p) return <NotFound what="Person" />;
  const gaps = GAPS.filter((g) => g.who === p.id);
  return (
    <div className="space-y-10">
      <Back to={`/a/${p.acct}`} label={acctName(p.acct)} />
      <div className="flex flex-wrap items-center gap-5 border-b border-line pb-6">
        <Avatar name={p.name} size={64} />
        <div className="min-w-0 flex-1">
          <Label>Person · {acctName(p.acct)}</Label>
          <h1 className="mt-1 text-[28px] font-light tracking-[-.02em]"><Cite id={p.id}>{p.name}</Cite></h1>
          <div className="mt-1 text-[14px] text-ink2">{p.title}</div>
          <div className="mt-2 flex flex-wrap gap-2"><WarmthChip w={p.warmth} />{!p.met && <Chip dashed>never met</Chip>}{p.offRoster && <Chip tone="amber">not on the account sheet</Chip>}<Chip><Ico n="clock" size={12} />Last contact <Cite id={p.lastFact}>{p.last}</Cite></Chip></div>
        </div>
        <Btn primary icon="note" onClick={() => openComposer({ kind: "Note", attach: p.deals[0] ?? "Account", text: `Re ${p.name}: ` })}>Write a note</Btn>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <Panel title="Deals touched" icon="target" aside={<span className="text-[12.5px] text-mute">{p.deals.length} deals</span>}>
          {p.deals.length ? <ul className="space-y-3">{p.deals.map((did) => { const d = deal(did); const role = ROLES.find((r) => d.roles[r]?.person === p.id); return (
            <li key={did}><button type="button" onClick={() => go(`/d/${did}`)} className="flex w-full flex-wrap items-center gap-3 rounded-[16px] border border-line p-4 text-left hover:bg-panel">
              <span className="min-w-0 flex-1 text-[14px] font-medium text-ink">{d.name}</span>
              {role && <Chip tone="blue">{role}</Chip>}<StageChip stage={d.stage} /><Ico n="right" size={16} className="text-mute" /></button></li>); })}</ul> : <EmptyState kind="gaps" detail="No deal on file names this person." />}
        </Panel>
        <Panel title="Colleagues" icon="users">
          <ul className="space-y-3">{PEOPLE.filter((x) => x.acct === p.acct && x.id !== p.id).map((x) => <li key={x.id}><button type="button" onClick={() => go(`/p/${x.id}`)} className="flex w-full items-center justify-between gap-2 text-left"><PersonChip id={x.id} showWarmth={false} /><WarmthChip w={x.warmth} /></button></li>)}
            {PEOPLE.filter((x) => x.acct === p.acct && x.id !== p.id).length === 0 && <li className="rounded-[14px] border border-dashed border-faint bg-panel p-3 text-[13px] text-mute">Only person on file for this account</li>}</ul>
        </Panel>
      </div>
      <Panel title="Questions to ask" icon="chat" aside={<Btn small icon={c ? "check" : "copy"} onClick={() => { copy(gaps.map((g) => g.q).join("\n")); setC(true); setTimeout(() => setC(false), 1300); }}>{c ? "Copied" : "Copy all"}</Btn>}>
        {gaps.length ? <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-stretch gap-4">{gaps.map((g) => <GapRow key={g.id} g={g} />)}</div> : <EmptyState kind="gaps" />}
      </Panel>
    </div>
  );
}

/* ---------- RISKS ---------- */
export function RisksScreen({ lane }: { lane?: string }) {
  const { go } = useApp();
  const [acct, setAcct] = useState("all");
  const lanes: Lane[] = ["deadline", "warmth", "stall", "signal"];
  const cur = (lanes.includes(lane as Lane) ? lane : "all") as Lane | "all";
  const rs = RISKS.filter((r) => (cur === "all" || r.lane === cur) && (acct === "all" || r.acct === acct));
  return (
    <div className="space-y-10">
      <Back to="/" label="Monday" />
      <Head eyebrow="Q4 · risk radar, both accounts" title="All risks">
        <select aria-label="Account filter" value={acct} onChange={(e) => setAcct(e.target.value)} className="h-[34px] rounded-full border border-[#b9c0c8] bg-white px-3 text-[13px]"><option value="all">Both accounts</option>{ACCOUNTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      </Head>
      <div className="flex flex-wrap gap-2">
        {(["all", ...lanes] as const).map((x) => (
          <button key={x} type="button" onClick={() => go(x === "all" ? "/risks" : `/risks/${x}`)} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] ${cur === x ? "border-brand bg-brand text-white" : "border-line bg-white text-ink2 hover:bg-panel"}`}>
            {x !== "all" && <Ico n={({ deadline: "flag", warmth: "shield", stall: "pause", signal: "signal" } as Record<string, string>)[x]} size={14} />}{x === "all" ? "All lanes" : LANES[x].label}
            <span className={`rounded-full px-1.5 text-[11.5px] ${cur === x ? "bg-white/25" : "bg-bar"}`}>{RISKS.filter((r) => (x === "all" || r.lane === x) && (acct === "all" || r.acct === acct)).length}</span>
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-[20px] border border-line">{rs.length ? rs.map((r) => <RiskRow key={r.id} r={r} />) : <div className="p-6"><EmptyState kind="risks" onAction={() => { setAcct("all"); go("/risks"); }} /></div>}</div>
      <Panel title="Timeline, next 21 days" icon="calendar">
        <div className="overflow-x-auto"><div className="flex min-w-[560px] items-end justify-between gap-1">
          {Array.from({ length: 21 }, (_, k) => 14 + k).map((day) => { const hit = rs.filter((r) => r.day === day); return (
            <div key={day} className="group relative flex flex-1 flex-col items-center gap-1.5">
              <div className="flex min-h-[26px] flex-col justify-end gap-1">{hit.map((r) => <span key={r.id} className={`h-[12px] w-[12px] rounded-full ${r.passed ? "bg-faint" : r.sev === "high" ? "bg-bad-line" : r.sev === "med" ? "bg-[#ee8a3a]" : "bg-warn-line"}`} />)}</div>
              <span className="text-[11px] text-mute">{day}</span>
              {hit.length > 0 && <div className="invisible absolute bottom-full z-20 mb-1 w-[210px] rounded-[12px] border border-line bg-white p-2.5 text-[12px] shadow-md group-hover:visible">{hit.map((r) => <div key={r.id}>{r.deal ? deal(r.deal).name : acctName(r.acct)}</div>)}</div>}
            </div>); })}
        </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-mute"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-bad-line" />High</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#ee8a3a]" />Medium</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-warn-line" />Low</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-faint" />Already passed</span><span className="ml-auto">November</span></div>
      </Panel>
      <Panel title="Checked and clear" icon="shield"><div className="grid grid-cols-1 gap-2 md:grid-cols-2">{CLEAR.map((x) => <div key={x} className="flex items-start gap-2 rounded-[14px] bg-ok-tint/50 px-3 py-2 text-[13px] text-ok"><Ico n="check" size={14} className="mt-[2px]" />{x}</div>)}</div></Panel>
    </div>
  );
}

/* ---------- WHY THIS NUMBER ---------- */
export function WhyScreen({ acct }: { acct?: string }) {
  const { go } = useApp();
  const id = ACCOUNTS.find((a) => a.id === acct)?.id ?? ACCOUNTS[0]?.id ?? "A";
  const a = ACCOUNTS.find((x) => x.id === id);
  const t = TOTALS[id];
  const ds = DEALS.filter((d) => d.acct === id);
  return (
    <div className="space-y-10">
      <Back to={`/a/${id}`} label={a?.short ?? "Account"} />
      <Head eyebrow="Q1 · the book" title={`Why this number · ${a?.short ?? id}`}>
        <select aria-label="Account" value={id} onChange={(e) => go(`/why/${e.target.value}`)} className="h-[34px] rounded-full border border-[#b9c0c8] bg-white px-3 text-[13px]">
          {ACCOUNTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </Head>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { l: "Backed", v: money(t?.backed ?? 0, t?.currency), id: "fact_26", ic: "filecheck", c: "text-ok", h: "A file we hold, at a stage that carries it" },
          { l: "Claimed", v: money(t?.claimed ?? 0, t?.currency), id: "fact_25", ic: "chat", c: "text-brand-dark", h: "A person said it; no file backs it yet" },
          { l: "Unknown", v: `${t?.unknownCount ?? 0} deal${(t?.unknownCount ?? 0) === 1 ? "" : "s"}`, id: "fact_27", ic: "eyeoff", c: "text-warn", h: "Heard of, never numbered" },
        ].map((x) => (
          <div key={x.l} className={`rounded-[20px] border p-5 ${x.l === "Unknown" ? "border-warn-line bg-warn-tint" : "border-line bg-white"}`}>
            <Label className="flex items-center gap-1.5"><Ico n={x.ic} size={14} />{x.l}</Label>
            <Cite id={x.id} className={`mt-2 block text-[30px] font-light tabular-nums ${x.c}`}>{x.v}</Cite>
            <p className="mt-1 text-[12.5px] text-mute">{x.h}</p>
          </div>
        ))}
      </div>

      <Panel title="Every line, and where it sits" icon="book">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[13.5px]">
            <thead><tr className="border-b border-line text-[11.5px] tracking-[.08em] text-mute uppercase"><th className="py-2 pr-3">Deal</th><th className="py-2 pr-3">Stage</th><th className="py-2 pr-3">Bucket</th><th className="py-2 pr-3 text-right">Worth</th><th className="py-2">Sources</th></tr></thead>
            <tbody>{ds.map((d) => (
              <tr key={d.id} className="border-b border-line2">
                <td className="py-3 pr-3"><button type="button" onClick={() => go(`/d/${d.id}`)} className="text-left font-medium text-ink hover:text-brand">{d.name}</button></td>
                <td className="py-3 pr-3"><StageChip stage={d.stage} /></td>
                <td className="py-3 pr-3"><Chip tone={d.bucket === "backed" ? "green" : d.bucket === "claimed" ? "blue" : "amber"} dashed={d.bucket === "unknown"}>{d.bucket}</Chip></td>
                <td className="py-3 pr-3 text-right tabular-nums">{d.worth != null && d.worthFact ? <Cite id={d.worthFact}>{money(d.worth, d.currency)}</Cite> : <span className="text-mute">no number</span>}</td>
                <td className="py-3"><div className="flex flex-wrap gap-1">{d.backedBy.slice(0, 2).map((s) => <SourceChip key={s} id={s} />)}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>

      <Panel title="What the answer rests on" icon="help">
        <p className="text-[16px] leading-snug text-ink">{HEADLINE[id] ?? "No headline on file."}</p>
        <ul className="mt-4 space-y-2">{(ASSUMPTIONS[id] ?? []).map((x) => <li key={x} className="flex items-start gap-2 text-[13.5px] text-ink2"><Ico n="dot" size={14} className="mt-[3px] text-brand" />{x}</li>)}</ul>
      </Panel>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel title="Not counted" icon="eyeoff">
          <ul className="space-y-2">{[...DEALS.filter((d) => d.acct === id && d.worth === null)].map((d) => <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-[12px] bg-panel px-3 py-2 text-[13px]"><b className="text-ink">{d.name}</b><span className="text-mute">{d.why}</span></li>)}</ul>
        </Panel>
        <Panel title="Offers, outside the book" icon="target">
          <ul className="space-y-2">{DEALS.filter((d) => d.acct === id).length === 0 ? <li className="text-[13px] text-mute">No deal on file.</li> : <li className="text-[13px] text-mute">Open and declined offers are listed on the account screen — they are not counted in backed or claimed.</li>}</ul>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- MOVE ---------- */
export function MoveScreen({ id }: { id: string }) {
  const { go, copy, openComposer, openSource } = useApp();
  const [c, setC] = useState(false);
  const k = MOVES.findIndex((m) => m.id === id);
  if (k < 0) return <NotFound what="Move" />;
  const m = MOVES[k], d = m.deal ? deal(m.deal) : null;
  const risks = RISKS.filter((r) => r.defuse === m.id);
  return (
    <div className="space-y-10">
      <Back to="/" label="Monday" />
      <div className="flex flex-wrap items-start gap-4 border-b border-line pb-6">
        <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-brand text-[24px] font-medium text-white">{m.g}</span>
        <div className="min-w-0 flex-1"><Label>Move {m.g} of {MOVES.length} · {acctName(m.acct)}</Label><h1 className="mt-1 text-[26px] leading-tight font-light tracking-[-.02em] break-words">{m.action}</h1></div>
        <div className="flex flex-wrap gap-2">
          <Btn primary icon="check" onClick={() => openComposer({ kind: "Task", attach: m.deal ?? "Account", text: `Accepted move ${m.id}: ${m.action}` })}>Accept move</Btn>
          {d && <Btn icon="arrow" onClick={() => go(`/d/${d.id}`)}>Open deal</Btn>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-[22px] border border-line bg-white p-6"><Label>Owner</Label><div className="mt-2 flex items-center gap-2 text-[16px]"><Avatar name={m.owner} size={30} tone="#4a90e2" />{m.owner}</div>{m.ownerRole && <div className="mt-1 text-[12.5px] text-mute">{m.ownerRole}</div>}</div>
        <div className="rounded-[22px] border border-line bg-white p-6"><Label>Due</Label><Cite id={m.id} className="mt-2 flex items-center gap-2 text-[20px] font-light"><Ico n="calendar" size={18} className="text-brand" />{m.due}</Cite></div>
        <div className="rounded-[20px] border border-warn-line bg-warn-tint p-5"><Label>Must beat</Label><div className="mt-2 flex items-center gap-2 text-[20px] font-light text-warn"><Ico n="flag" size={18} />{m.mustBeat}</div></div>
      </div>
      <Panel title="The ask" icon="chat" aside={<Btn small icon={c ? "check" : "copy"} onClick={() => { copy(m.ask); setC(true); setTimeout(() => setC(false), 1300); }}>{c ? "Copied" : "Copy the ask"}</Btn>}>
        <p className="rounded-[14px] border-l-[4px] border-brand-line bg-panel px-4 py-3 text-[17px] leading-snug text-ink italic">{"\u201C"}{m.ask}{"\u201D"}</p>
        <p className="mt-4 text-[14px] text-ink2">{m.why}</p>
      </Panel>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Panel title="Evidence" icon="file"><div className="space-y-3">{m.evidence.map((e) => { const s = source(e); return <button key={e} type="button" onClick={() => openSource(e)} className="flex w-full items-center gap-3 rounded-[16px] border border-line p-4 text-left hover:bg-panel"><SourceChip id={e} /><span className="min-w-0 flex-1 truncate text-[13px] text-ink2">{s.claim}</span><ConfidenceChip c={s.conf} /></button>; })}</div></Panel>
        <Panel title="Risk this defuses" icon="alert">{risks.length ? <div className="overflow-hidden rounded-[14px] border border-line">{risks.map((r) => <RiskRow key={r.id} r={r} />)}</div> : <EmptyState kind="clear" detail="No risk detector points at this move." />}</Panel>
      </div>
      <div className="flex justify-between">
        <Btn icon="arrow" disabled={k === 0} onClick={() => go(`/m/${MOVES[k - 1].id}`)} className="[&_svg]:rotate-180">Previous move</Btn>
        <Btn disabled={k === MOVES.length - 1} onClick={() => go(`/m/${MOVES[k + 1].id}`)}>Next move<Ico n="arrow" size={16} /></Btn>
      </div>
    </div>
  );
}

/* ---------- LINK SIGNAL TO DEAL ---------- */
export function LinkScreen({ id }: { id: string }) {
  const { go, openComposer } = useApp();
  const s = SIGNALS.find((x) => x.id === id);
  const [pick, setPick] = useState<string | null>(null);
  if (!s) return <NotFound what="Signal" />;
  const list = [...DEALS].sort((a, b) => Number(b.acct === s.acct) - Number(a.acct === s.acct));
  return (
    <div className="space-y-10">
      <Back to="/signals" label="Signals" />
      <Head eyebrow="Unlinked signal" title="Link to a deal" />
      <SignalRow s={s} />
      <Panel title="Choose the deal this belongs to" icon="link" aside={<span className="text-[12.5px] text-mute">Same account first</span>}>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">{list.map((d) => (
          <li key={d.id}><button type="button" onClick={() => setPick(d.id)} aria-pressed={pick === d.id} className={`flex w-full items-center gap-3 rounded-[16px] border-2 p-4 text-left ${pick === d.id ? "border-brand bg-brand-tint/60" : "border-line bg-white hover:bg-panel"}`}>
            <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${pick === d.id ? "border-brand bg-brand text-white" : "border-faint"}`}>{pick === d.id && <Ico n="check" size={13} stroke={3} />}</span>
            <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium text-ink">{d.name}</span><span className="block text-[12px] text-mute">{acctName(d.acct)}</span></span><StageChip stage={d.stage} /></button></li>))}</ul>
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-line bg-panel px-5 py-4">
        <span className="text-[13px] text-ink2">Linking is recorded as a note. This console does not edit deals.</span>
        <div className="flex gap-2"><Btn onClick={() => go("/signals")}>Cancel</Btn><Btn primary icon="note" disabled={!pick} onClick={() => openComposer({ kind: "Next step", attach: pick!, text: `Link signal ${s.id} to ${deal(pick!).name}.` })}>Write link as a note</Btn></div>
      </div>
    </div>
  );
}

/* ---------- SIGNALS ---------- */
export function SignalsScreen() {
  const { go, markRead, read } = useApp();
  return (
    <div className="space-y-8">
      <Back to="/" label="Monday" />
      <Head eyebrow="Signals · since we took over" title="What changed">
        <span className="text-[12.5px] text-mute">The MCP drops new ones during the build</span>
      </Head>
      <div className="overflow-hidden rounded-[20px] border border-line">
        {SIGNALS.length ? SIGNALS.map((s) => (
          <SignalRow key={s.id} s={s} unread={!read.has(s.id)} onRead={() => markRead(s.id)} linkAction={s.deal ? undefined : () => go(`/signals/${s.id}`)} />
        )) : <div className="p-6"><EmptyState kind="signals" /></div>}
      </div>
    </div>
  );
}
