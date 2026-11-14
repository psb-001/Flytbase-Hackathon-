"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Ico } from "./icons";
import {
  ACCOUNTS,
  source as srcOf,
  DEALS,
  ROLES,
  acctName,
  coverage,
  deal,
  money,
  person,
  type Conf,
  type Deal,
  type Gap,
  type Lane,
  type Move,
  type Risk,
  type Role,
  type Signal,
  type Sev,
  type Stage,
  type Warmth,
} from "./data";

export interface Note {
  id: string;
  kind: string;
  attach: string;
  text: string;
  at: string;
  status?: string;
}

export interface AppApi {
  openSource: (id: string) => void;
  openComposer: (p?: { kind?: string; attach?: string; text?: string }) => void;
  openPalette: (q?: string) => void;
  go: (path: string, o?: { anchor?: string; deal?: string }) => void;
  copy: (t: string) => void;
  notes: Note[];
  addNote: (n: Omit<Note, "id" | "at">) => Promise<void>;
  read: Set<string>;
  markRead: (id: string) => void;
  countdown: number;
}

export const AppCtx = createContext<AppApi>(null as unknown as AppApi);
export const useApp = () => useContext(AppCtx);

/* ---------- primitives ---------- */
export function Cite({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  const { openSource } = useApp();
  return (
    <button type="button" title={`Source: ${id}`} onClick={(e) => { e.stopPropagation(); openSource(id); }}
      className={`inline cursor-pointer p-0 text-left text-inherit underline-offset-[3px] decoration-dotted decoration-brand hover:text-brand-dark hover:underline ${className}`}>
      {children}
    </button>
  );
}

export function Btn({ children, onClick, primary, disabled, title, small, icon, className = "" }: { icon?: string; children: ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; title?: string; small?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border ${small ? "h-[28px] px-2.5 text-[13px]" : "h-[34px] px-3.5 text-[14px]"} ${primary ? "border-brand bg-brand text-white hover:bg-[#3f84d6]" : "border-[#b9c0c8] bg-white text-ink hover:bg-panel"} disabled:border-line disabled:bg-bar disabled:text-faint disabled:hover:bg-bar ${className}`}>
      {icon && <Ico n={icon} size={small ? 14 : 16} />}{children}
    </button>
  );
}

export function Chip({ children, tone = "gray", dashed, className = "" }: { children: ReactNode; tone?: "gray" | "blue" | "green" | "amber" | "red"; dashed?: boolean; className?: string }) {
  const t = { gray: "border-line bg-panel text-ink2", blue: "border-brand-line bg-brand-tint text-brand-dark", green: "border-ok-line bg-ok-tint text-ok", amber: "border-warn-line bg-warn-tint text-warn", red: "border-bad-line bg-bad-tint text-bad" }[tone];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-[1px] text-[12px] ${dashed ? "border-dashed" : ""} ${t} ${className}`}>{children}</span>;
}

export const Label = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`text-[11.5px] font-medium tracking-[.08em] text-mute uppercase ${className}`}>{children}</div>;

export function Avatar({ name, size = 24, tone }: { name: string; size?: number; tone?: string }) {
  const ini = name === "You" ? "YO" : name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-white font-medium text-white" style={{ width: size, height: size, fontSize: size * 0.4, background: tone ?? "#8d97a2" }}>{ini}</span>;
}

export function Mono({ children }: { children: ReactNode }) { return <span className="font-mono text-[12px]">{children}</span>; }

/* ---------- friendly source chips (ids stay out of the way) ---------- */
export function sourceLabel(id: string) {
  const x = srcOf(id);
  const pl = x.payload as Record<string, unknown>;
  if (x.kind === "file" && typeof pl?.name === "string") return String(pl.name);
  if (x.kind === "signal") return "Signal · " + String(pl?.kind ?? "");
  if (x.kind === "person" || x.kind === "deal") return x.claim.split(/[.,]/)[0];
  const c = x.claim.replace(/\.$/, "");
  return c.length > 32 ? c.slice(0, 31) + "\u2026" : c;
}

export function SourceChip({ id }: { id: string }) {
  const { openSource } = useApp();
  const k = srcOf(id).kind;
  return (
    <button type="button" title={id} onClick={(e) => { e.stopPropagation(); openSource(id); }}
      className="inline-flex max-w-[210px] items-center gap-1 rounded-full border border-line bg-white px-2 py-[2px] text-[11.5px] text-ink2 hover:border-brand-line hover:bg-brand-tint hover:text-brand-dark">
      <Ico n={k === "file" ? "file" : k === "signal" ? "signal" : k === "person" ? "user" : "quote"} size={12} /><span className="truncate">{sourceLabel(id)}</span>
    </button>
  );
}

export function Evidence({ ids, open: o = false }: { ids: string[]; open?: boolean }) {
  const [open, setOpen] = useState(o);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-[2px] text-[12px] ${open ? "border-brand-line bg-brand-tint text-brand-dark" : "border-line bg-panel text-ink2 hover:bg-bar"}`}>
        <Ico n="file" size={12} />{ids.length} sources<Ico n="down" size={12} className={open ? "rotate-180" : ""} />
      </button>
      {open && ids.map((i) => <SourceChip key={i} id={i} />)}
    </div>
  );
}

/* ---------- domain chips ---------- */
const WG: Record<Warmth, [string, "red" | "gray" | "amber" | "green"]> = { guarded: ["shield", "red"], neutral: ["dot", "gray"], warm: ["bolt", "amber"], ally: ["check", "green"] };

export function WarmthChip({ w }: { w: Warmth | null }) {
  if (!w) return <Chip dashed>warmth not set</Chip>;
  const [g, tone] = WG[w];
  return <Chip tone={tone}><Ico n={g} size={12} />{w}</Chip>;
}

const STAGES: Stage[] = ["identified", "qualified", "cleared", "agreed"];

export function StageChip({ stage }: { stage: Stage | null }) {
  if (!stage) return <Chip dashed>unknown</Chip>;
  const i = STAGES.indexOf(stage);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-[1px] text-[12px] text-ink">
      <span className="flex gap-[2px]" aria-hidden>{STAGES.map((s, k) => <i key={s} className={`h-[5px] w-[9px] rounded-full ${k <= i ? "bg-brand" : "bg-line"}`} />)}</span>{stage}
    </span>
  );
}

export function ConfidenceChip({ c, long }: { c: Conf; long?: boolean }) {
  if (c === "verified") return <Chip tone="green"><Ico n="check" size={12} />verified{long && " \u00b7 a file backs it"}</Chip>;
  if (c === "told") return <Chip tone="blue"><Ico n="quote" size={12} />told{long && " \u00b7 a person said it"}</Chip>;
  return <Chip dashed><Ico n="help" size={12} />claim{long && " \u00b7 unverified"}</Chip>;
}

export function IdChip({ id }: { id: string }) {
  const { openSource, copy } = useApp();
  const [c, setC] = useState(false);
  return (
    <span className="inline-flex items-center overflow-hidden rounded-full border border-line bg-white font-mono text-[11.5px]">
      <button type="button" title={`Open source ${id}`} onClick={(e) => { e.stopPropagation(); openSource(id); }} className="pl-2.5 pr-1.5 py-[2px] text-ink2 hover:bg-brand-tint hover:text-brand-dark">{id}</button>
      <button type="button" aria-label={`Copy ${id}`} onClick={(e) => { e.stopPropagation(); copy(id); setC(true); setTimeout(() => setC(false), 1300); }}
        className={`flex min-w-[26px] items-center justify-center border-l border-line px-1.5 py-[2px] ${c ? "bg-ok-tint text-ok" : "text-mute hover:bg-panel"}`}>{c ? <Ico n="check" size={12} /> : <Ico n="copy" size={12} />}</button>
    </span>
  );
}

export function Status({ kind, children }: { kind: "ok" | "watch" | "act" | "idle"; children: ReactNode }) {
  const m = { ok: ["bg-ok-tint", "check", "text-ok"], watch: ["bg-warn-tint", "alert", "text-warn"], act: ["bg-bad-tint", "alert", "text-bad"], idle: ["bg-bar", "dot", "text-mute"] }[kind];
  return <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${m[2]}`}><span className={`flex h-[20px] w-[20px] items-center justify-center rounded-full ${m[0]}`}><Ico n={m[1]} size={12} stroke={2.4} /></span>{children}</span>;
}

export function PersonChip({ id, waiting, showWarmth = true }: { id: string; waiting?: string; showWarmth?: boolean }) {
  const p = person(id);
  if (!p.id) return <Chip dashed>no person on file</Chip>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Avatar name={p.name} />
      <Cite id={id} className="font-medium text-ink">{p.name}</Cite>
      {showWarmth && <WarmthChip w={p.warmth} />}
      {!p.met && <Chip dashed>never met</Chip>}
      {waiting && <span className="text-[12px] text-mute">waiting on {waiting}</span>}
    </span>
  );
}

/* ---------- RoleSlot ---------- */
export function RoleSlot({ role, d }: { role: Role; d: Deal }) {
  const f = d.roles[role];
  const asker = person(d.ask);
  return (
    <div className={`min-h-[92px] rounded-[16px] p-4 ${f ? "border border-line bg-white" : "border border-dashed border-faint bg-panel/60"}`}>
      <Label className="mb-1.5">{role}</Label>
      {f ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2"><Avatar name={person(f.person).name} /><Cite id={f.person} className="font-medium text-ink">{person(f.person).name}</Cite></div>
          <div className="flex flex-wrap items-center gap-1.5"><WarmthChip w={person(f.person).warmth} />{!person(f.person).met && <Chip dashed>never met</Chip>}</div>
          {f.waiting && <div className="text-[12px] text-mute">waiting on {f.waiting}</div>}
        </div>
      ) : (
        <div className="text-[13px] text-mute">Unknown <span aria-hidden>{"\u2192"}</span> ask {asker.id ? <Cite id={asker.id} className="text-ink2">{asker.name}</Cite> : <span className="text-ink2">no named person yet</span>}</div>
      )}
    </div>
  );
}

/* ---------- DealRow ---------- */
export function DealRow({ d, selected, onSelect, compact }: { d: Deal; selected?: boolean; onSelect?: () => void; compact?: boolean }) {
  const { go } = useApp();
  return (
    <tr onClick={onSelect} id={`row-${d.id}`}
      className={`border-b border-line2 ${selected ? "bg-brand-tint/70 shadow-[inset_3px_0_0_#4a90e2]" : d.unbacked ? "bg-panel/70" : "bg-white"} ${onSelect ? "cursor-pointer hover:bg-brand-tint/40" : ""}`}>
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {d.unbacked && <Chip tone="amber" dashed>{d.bucket === "unknown" ? "unknown" : "claimed"}</Chip>}
          <Cite id={d.id} className="font-medium text-ink">{d.name}</Cite>
        </div>
        {compact && <button type="button" onClick={(e) => { e.stopPropagation(); go(`/a/${d.acct}`); }} className="text-[12px] text-brand hover:underline">{acctName(d.acct)}</button>}
      </td>
      <td className="px-4 py-4"><StageChip stage={d.stage} /></td>
      <td className="px-4 py-4 tabular-nums">
        {d.worth != null && d.worthFact ? <Cite id={d.worthFact} className="font-medium">{money(d.worth, d.currency)}</Cite> : <span className="text-[12px] text-mute">{d.stage ? "none until qualified" : "no value"}</span>}
      </td>
      <td className="px-4 py-4"><div className="flex flex-wrap gap-1">{d.backedBy.length ? d.backedBy.map((f) => <SourceChip key={f} id={f} />) : <span className="text-[12px] text-mute">no file</span>}</div></td>
      {!compact && <td className="px-4 py-4">{d.deadline ? <Cite id={d.deadline.src}>{d.deadline.label}</Cite> : <span className="text-[12px] text-mute">none on file</span>}</td>}
      {!compact && <td className="px-4 py-4">{d.owner ? <span className="inline-flex items-center gap-1.5"><Avatar name={d.owner} size={20} />{d.owner}</span> : <span className="text-[12px] text-mute">unassigned</span>}</td>}
    </tr>
  );
}

/* ---------- MoveCard ---------- */
export function MoveCard({ m, rank, variant = "hero" }: { m: Move; rank: number; variant?: "hero" | "expanded" }) {
  const { go, copy, openComposer } = useApp();
  const [copied, setCopied] = useState(false);
  const d = m.deal ? deal(m.deal) : null;
  const exp = variant === "expanded";
  return (
    <article className={`flex flex-col overflow-hidden rounded-[20px] border bg-white ${rank === 1 ? "border-brand shadow-[0_2px_10px_rgba(74,144,226,.18)]" : "border-line"}`}>
      <div className="flex gap-3.5 p-5 pb-4">
        <span className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[17px] font-medium ${rank === 1 ? "bg-brand text-white" : "border border-brand-line bg-brand-tint text-brand-dark"}`}>{rank}</span>
        <div className="min-w-0 flex-1">
          <h3 className={`font-medium leading-snug text-ink ${exp || rank === 1 ? "text-[18px]" : "text-[16px]"}`}>{m.action}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {d && <Chip tone="blue"><Cite id={d.id}>{d.name}</Cite></Chip>}
            <span className="inline-flex items-center gap-1.5 text-[13px]"><Avatar name={m.owner} size={22} />{m.owner}</span>
            {m.ownerRole && <span className="text-[12px] text-mute">{m.ownerRole}</span>}
            <span className="text-[13px] text-mute">due <Cite id={m.id} className="font-medium text-ink">{m.due}</Cite></span>
          </div>
        </div>
      </div>
      <div title={m.why} className="line-clamp-1 px-5 pb-4 text-[13px] text-ink2"><Ico n="clock" size={14} className="mr-1.5 inline text-brand" />{m.why}</div>
      {exp && <div className="mx-4 mb-3 flex items-center gap-2 rounded-[12px] bg-warn-tint px-2.5 py-1.5 text-[13px] text-warn"><Ico n="flag" size={14} /><b>Must beat</b> {m.mustBeat}</div>}
      <div className="px-5 pb-4"><Evidence ids={m.evidence} /></div>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-line2 bg-panel px-5 py-3.5">
        {exp && <Btn primary small icon="check" onClick={() => openComposer({ kind: "Task", attach: m.deal ?? "Account", text: `Accepted move ${m.id}: ${m.action}` })}>Accept move</Btn>}
        {d && <Btn small icon="arrow" primary={!exp} onClick={() => go(`/d/${d.id}`)}>Open deal</Btn>}
        <Btn small icon={copied ? "check" : "copy"} onClick={() => { copy(m.ask); setCopied(true); setTimeout(() => setCopied(false), 1300); }}>{copied ? "Copied" : exp ? "Copy" : "Copy the ask"}</Btn>
      </div>
    </article>
  );
}

/* ---------- RiskRow ---------- */
export const LANES: Record<Lane, { label: string; glyph: string; tone: "red" | "blue" | "amber" | "gray" }> = {
  deadline: { label: "Deadline", glyph: "D", tone: "red" },
  warmth: { label: "Warmth", glyph: "W", tone: "blue" },
  stall: { label: "Stall", glyph: "S", tone: "amber" },
  signal: { label: "Signal", glyph: "N", tone: "gray" },
};

export const SEV: Record<Sev, { n: number; word: string; bar: string; text: string }> = {
  low: { n: 1, word: "low", bar: "bg-[#f5b942]", text: "text-warn" },
  med: { n: 2, word: "medium", bar: "bg-[#ee8a3a]", text: "text-[#b8561a]" },
  high: { n: 3, word: "high", bar: "bg-bad-line", text: "text-bad" },
};

const LANE_ICON: Record<Lane, string> = { deadline: "flag", warmth: "shield", stall: "pause", signal: "signal" };

export function RiskRow({ r }: { r: Risk }) {
  const { go } = useApp();
  const L = LANES[r.lane], S = SEV[r.sev];
  const d = r.deal ? deal(r.deal) : null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[96px_1fr] lg:grid-cols-[96px_96px_1fr_auto] items-center gap-5 border-b border-line2 bg-white px-5 py-5">
      <div>
        <div className="flex gap-[2px]" aria-hidden>{[1, 2, 3].map((k) => <i key={k} className={`h-[18px] w-[10px] rounded-full ${k <= S.n ? S.bar : "bg-line"}`} />)}</div>
        <div className={`mt-1 text-[12px] font-medium ${S.text}`}>{S.word} severity</div>
      </div>
      <div>
        <Chip tone={L.tone}><Ico n={LANE_ICON[r.lane]} size={12} />{L.label}</Chip>
        <div className="mt-1 text-[12px] text-mute">
          {r.passed
            ? <span className="text-bad">line crossed <Cite id={r.id} className="font-medium text-bad">{Math.abs(r.days)}d ago</Cite></span>
            : r.days === 0
              ? "triage today"
              : <>turns bad in <Cite id={r.id} className="font-medium text-ink">{r.days}d</Cite></>}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[14px] text-ink">{d ? <Cite id={d.id} className="font-medium">{d.name}</Cite> : <span className="font-medium">{acctName(r.acct)}</span>}</div>
        <div className="text-[13px] text-ink2">{r.what}</div>
        <div className="mt-1 flex flex-wrap gap-1"><Evidence ids={r.evidence} /></div>
      </div>
      {r.defuse
        ? <button type="button" onClick={() => go(`/m/${r.defuse}`)} className="justify-self-start whitespace-nowrap text-[13px] text-brand hover:underline sm:col-span-2 lg:col-span-1">Defuse this {"\u2192"}</button>
        : <span className="text-[12px] text-mute sm:col-span-2 lg:col-span-1">no move yet</span>}
    </div>
  );
}

/* ---------- GapRow ---------- */
const BLOCK = { book: "Blocks the book", power: "Blocks the power map", moves: "Blocks the moves", risk: "Blocks the risk radar" };
export { BLOCK };

export function GapRow({ g }: { g: Gap }) {
  const { copy, go } = useApp();
  const [c, setC] = useState(false);
  const p = person(g.who);
  return (
    <div className="rounded-[20px] border border-line bg-white p-5">
      <div className="flex items-start gap-2.5">
        <span className="mt-[1px] flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-warn-tint text-warn"><Ico n="help" size={15} /></span>
        <div className="text-[14px] leading-snug font-medium text-ink">{g.what}</div>
      </div>
      <div className="mt-3">{g.who ? <PersonChip id={g.who} /> : <Chip dashed>no person on file yet</Chip>}</div>
      <details className="group mt-3 rounded-[12px] bg-panel">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[12.5px] text-ink2"><span className="flex items-center gap-1.5"><Ico n="quote" size={13} />Question and why</span><Ico n="down" size={14} className="transition group-open:rotate-180" /></summary>
        <div className="space-y-2 px-3 pb-3 text-[13px]"><p className="italic text-ink">{"\u201C"}{g.q}{"\u201D"}</p><p className="text-mute">{g.why}</p></div>
      </details>
      <div className="mt-3 flex gap-2">
        <Btn small icon={c ? "check" : "copy"} onClick={() => { copy(g.q); setC(true); setTimeout(() => setC(false), 1300); }}>{c ? "Copied" : "Copy question"}</Btn>
        {p.id && <Btn small icon="user" onClick={() => go(`/p/${p.id}`)}>Open person</Btn>}
      </div>
    </div>
  );
}

/* ---------- SignalRow ---------- */
export function SignalRow({ s, unread = true, onRead, linkAction }: { s: Signal; unread?: boolean; onRead?: () => void; linkAction?: () => void }) {
  return (
    <div className={`border-b border-line2 px-5 py-5 ${unread ? "bg-white" : "bg-panel/70"}`}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <i className={`mt-[7px] h-[8px] w-[8px] shrink-0 rounded-full ${unread ? "bg-brand" : "bg-line"}`} aria-label={unread ? "unread" : "read"} />
        <div className="sm:w-[150px] shrink-0 text-[12.5px] text-mute"><Cite id={s.id}>{s.at}</Cite></div>
        <div className="shrink-0 sm:w-[110px]"><Chip tone="blue">{s.kind}</Chip></div>
        <div className="min-w-0 flex-1 basis-[240px]">
          <div className="text-[14px] font-medium text-ink">{s.text}</div>
          {s.deal && <div className="mt-1"><Chip tone="blue"><Cite id={s.deal}>{deal(s.deal).name}</Cite></Chip></div>}
          {s.diff && (
            <div className="mt-2 inline-grid max-w-full grid-cols-1 overflow-hidden rounded-[12px] border border-line text-[12.5px] sm:grid-cols-2">
              <div className="border-r border-line bg-bad-tint/50 px-2.5 py-1.5"><div className="text-[10.5px] tracking-wide text-mute uppercase">before {"\u00b7"} {s.diff.field}</div><span className="text-ink2 line-through decoration-faint">{s.diff.before}</span></div>
              <div className="bg-ok-tint/60 px-2.5 py-1.5"><div className="text-[10.5px] tracking-wide text-mute uppercase">after {"\u00b7"} {s.diff.field}</div><span className="font-medium text-ink">{s.diff.after}</span></div>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">{s.moves.map((m) => <Chip key={m} tone="gray">{m}</Chip>)}</div>
        </div>
        <div className="flex shrink-0 gap-2">
          {linkAction && <Btn small primary onClick={linkAction}>Link to deal</Btn>}
          {onRead && <Btn small onClick={onRead} disabled={!unread}>{unread ? "Mark read" : "Read"}</Btn>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Freshness / Empty / Skeleton ---------- */
export function FreshnessBadge({ state, text }: { state: "live" | "stale" | "offline"; text?: string }) {
  const m = { live: ["bg-[#78ad2f]", "live", "text-ok", true], stale: ["bg-[#f5b942]", "stale", "text-warn", false], offline: ["bg-faint", "offline", "text-mute", false] }[state];
  return <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium ${m[2]}`}><i className={`h-[9px] w-[9px] rounded-full ${m[0]}`} style={m[3] ? { animation: "pulse-dot 1.6s infinite" } : undefined} />{m[1]}{text && <span className="font-normal text-mute"> {"\u00b7"} {text}</span>}</span>;
}

export function StaleBanner({ snap, time, age, onLive }: { snap: string; time: string; age: number; onLive: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warn-line bg-warn-tint px-4 py-2 sm:px-6 text-[13px] text-warn">
      <Ico n="alert" size={16} /><span><b>Snapshot</b> {"\u00b7"} <Cite id={snap}>{snap}</Cite> captured {time} {"\u00b7"} {age} min older than the newest</span>
      <button type="button" onClick={onLive} className="ml-auto rounded-[12px] border border-warn-line bg-white px-2.5 py-1 text-[12.5px] hover:bg-warn-tint">Go to newest</button>
    </div>
  );
}

export function EmptyState({ kind, countdown, onAction, detail }: { kind: "signals" | "gaps" | "risks" | "clear" | "notes"; countdown?: number; onAction?: () => void; detail?: string }) {
  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const c = {
    signals: ["Nothing yet.", `MCP is polled once a minute. Next poll in ${countdown ?? 43}s.`, "Nothing has changed since the last snapshot"],
    gaps: ["No open gaps.", "Every slot has a source.", "All questions answered"],
    risks: ["No risks in this lane.", "The detector ran and found nothing.", "Check ran, nothing found"],
    clear: ["All clear.", "Nothing open for this account.", "Nothing open"],
    notes: ["No notes written yet.", "Notes are the only write.", "Nothing written"],
  }[kind];
  return (
    <div className="rounded-[20px] border-2 border-dashed border-line bg-panel/60 px-6 py-8 text-center">
      <div className="mx-auto mb-3 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-white text-mute" aria-hidden>
        {kind === "signals" ? <i className="h-[9px] w-[9px] rounded-full bg-[#78ad2f]" style={{ animation: "pulse-dot 1.6s infinite" }} /> : <Ico n="check" size={18} />}
      </div>
      <div className="text-[17px] font-medium text-ink">{c[0]}</div>
      <div className="mx-auto mt-1 max-w-[460px] text-[13.5px] text-ink2">{detail ?? c[1]}</div>
      <div className="mt-3 text-[12px] text-mute">{c[2]}{kind === "signals" && countdown != null ? ` \u00b7 next poll ${mmss(countdown)}` : ""}</div>
      {onAction && <div className="mt-3"><Btn small onClick={onAction}>{kind === "notes" ? "Write a note" : "Clear filters"}</Btn></div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) { return <div className={`skel rounded-[12px] ${className}`} />; }

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-[40px] w-full" />
      <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[190px]" />)}</div>
      <Skeleton className="h-[60px] w-full" /><Skeleton className="h-[120px] w-full" /><Skeleton className="h-[200px] w-full" />
    </div>
  );
}

/* ---------- NoteForm ---------- */
export type NoteState = "draft" | "queued" | "sending" | "written" | "failed";

export function NoteForm({ preset, force, onClose }: { preset?: { kind?: string; attach?: string; text?: string }; force?: NoteState; onClose: () => void }) {
  const { addNote } = useApp();
  const [kind, setKind] = useState(preset?.kind ?? "Note");
  const [attach, setAttach] = useState(preset?.attach ?? "");
  const [text, setText] = useState(preset?.text ?? "");
  const [st, setSt] = useState<NoteState>("draft");
  const state = force ?? st;
  const busy = state === "queued";
  const sel = "h-[34px] w-full rounded-[12px] border border-[#cfd5db] bg-white px-2 text-[14px] text-ink disabled:bg-bar disabled:text-mute";
  const submit = async () => {
    setSt("queued");
    try {
      await addNote({ kind, attach, text });
    } catch {
      setSt("failed");
    }
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block"><Label className="mb-1">Kind</Label>
          <select value={kind} disabled={busy} onChange={(e) => setKind(e.target.value)} className={sel}>{["Note", "Task", "Risk", "Next step"].map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="block"><Label className="mb-1">Attach to</Label>
          <select value={attach} disabled={busy} onChange={(e) => setAttach(e.target.value)} className={sel}>
            {ACCOUNTS.map((a) => <option key={a.id} value={`acct:${a.id}`}>Account {"\u00b7"} {a.short}</option>)}{DEALS.map((d) => <option key={d.id} value={`d:${d.id}`}>Deal {"\u00b7"} {d.name}</option>)}
          </select></label>
      </div>
      <label className="mt-3 block"><Label className="mb-1">Text</Label>
        <textarea value={text} disabled={busy} onChange={(e) => setText(e.target.value)} rows={4} placeholder="What should the next person know?" className="w-full resize-none rounded-[12px] border border-[#cfd5db] p-2.5 text-[14px] text-ink outline-none placeholder:text-faint focus:border-brand disabled:bg-bar disabled:text-mute" /></label>
      {(state as string) !== "draft" && (
        <div className="mt-3" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            {([["queued", "Queued"], ["sending", "Sent to MCP"], ["written", "Written back"]] as [NoteState, string][]).map(([k, l], i) => (
              <div key={k} className="flex flex-1 items-center gap-2">
                <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-medium ${state === "failed" && i === 1 ? "bg-bad text-white" : i === 0 ? "bg-[#78ad2f] text-white" : i === 1 ? "bg-brand text-white" : "bg-line text-mute"}`}>{state === "failed" && i === 1 ? "!" : i === 0 ? "\u2713" : i + 1}</span>
                <span className={`text-[13px] ${i === 1 ? "font-medium text-ink" : "text-mute"}`}>{state === "failed" && i === 1 ? "Write failed" : l}</span>
                {i < 2 && <i className={`h-px flex-1 ${i === 0 ? "bg-[#78ad2f]" : "bg-line"}`} />}
              </div>
            ))}
          </div>
          <div className={`mt-2 rounded-[12px] px-2.5 py-1.5 text-[13px] ${state === "failed" ? "bg-bad-tint text-bad" : state === "draft" ? "bg-brand-tint text-brand-dark" : "bg-ok-tint text-ok"}`}>
            {state === "queued" && "Stored here, queued behind the one-call-a-minute MCP limit. The status below updates when it is sent."}
            {state === "failed" && "The note could not be queued. Your text is kept."}
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>{state === "queued" ? "Close" : "Cancel"}</Btn>
        {state === "failed" ? <Btn primary onClick={submit}>Try again</Btn> : state === "draft" && <Btn primary disabled={!text.trim()} onClick={submit}>Queue note</Btn>}
      </div>
    </div>
  );
}

/* ---------- Section sentence ---------- */
export function Sentence({ children }: { children: ReactNode }) {
  return <p className="max-w-[720px] text-[20px] leading-[1.25] font-light sm:text-[24px] tracking-[-.01em] text-ink">{children}</p>;
}

export function CoverageBar({ d }: { d: Deal }) {
  const n = coverage(d);
  return <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-ink"><span className="flex gap-[2px]" aria-hidden>{ROLES.map((r, i) => <i key={r} className={`h-[8px] w-[14px] rounded-full ${i < n ? "bg-brand" : "bg-line"}`} />)}</span>{n}/4 roles known</span>;
}
