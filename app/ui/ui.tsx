"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
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
}

export const AppCtx = createContext<AppApi>(null as unknown as AppApi);
export const useApp = () => useContext(AppCtx);

/* ── Citations & Source Drawers ── */
export function Cite({
  id,
  children,
  className = "",
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { openSource } = useApp();
  return (
    <button
      type="button"
      title={`Source: ${id}`}
      onClick={(e) => {
        e.stopPropagation();
        openSource(id);
      }}
      className={`inline cursor-pointer p-0 text-left text-inherit underline-offset-[3px] decoration-dotted decoration-brand hover:text-brand-dark hover:underline ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Buttons ── */
export function Btn({
  children,
  onClick,
  primary,
  disabled,
  title,
  small,
  icon,
  className = "",
}: {
  icon?: string;
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  title?: string;
  small?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border transition-all ${
        small ? "h-[28px] px-3 text-[12.5px]" : "h-[34px] px-3.5 text-[13.5px]"
      } ${
        primary
          ? "border-brand bg-brand text-white shadow-sm hover:bg-brand-dark"
          : "border-line bg-white text-ink shadow-xs hover:border-brand-line hover:bg-brand-tint/40"
      } disabled:border-line disabled:bg-bar disabled:text-faint disabled:hover:bg-bar ${className}`}
    >
      {icon && <Ico n={icon} size={small ? 13 : 15} />}
      {children}
    </button>
  );
}

/* ── Chips & Badges ── */
export function Chip({
  children,
  tone = "gray",
  dashed,
  className = "",
}: {
  children: ReactNode;
  tone?: "gray" | "blue" | "green" | "amber" | "red";
  dashed?: boolean;
  className?: string;
}) {
  const t = {
    gray: "border-line bg-panel text-ink2",
    blue: "border-brand-line bg-brand-tint text-brand-dark",
    green: "border-ok-line bg-ok-tint text-ok",
    amber: "border-warn-line bg-warn-tint text-warn",
    red: "border-bad-line bg-bad-tint text-bad",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-[2px] text-[11.5px] font-medium ${
        dashed ? "border-dashed" : ""
      } ${t} ${className}`}
    >
      {children}
    </span>
  );
}

export function IdChip({ id }: { id: string }) {
  const { openSource, copy } = useApp();
  const [c, setC] = useState(false);
  return (
    <span className="inline-flex items-center overflow-hidden rounded-full border border-line bg-white font-mono text-[11.5px]">
      <button
        type="button"
        title={`Open source ${id}`}
        onClick={(e) => {
          e.stopPropagation();
          openSource(id);
        }}
        className="pl-2.5 pr-1.5 py-[2px] text-ink2 hover:bg-brand-tint hover:text-brand-dark"
      >
        {id}
      </button>
      <button
        type="button"
        aria-label={`Copy ${id}`}
        onClick={(e) => {
          e.stopPropagation();
          copy(id);
          setC(true);
          setTimeout(() => setC(false), 1300);
        }}
        className={`flex min-w-[26px] items-center justify-center border-l border-line px-1.5 py-[2px] ${
          c ? "bg-ok-tint text-ok" : "text-mute hover:bg-panel"
        }`}
      >
        {c ? <Ico n="check" size={12} /> : <Ico n="copy" size={12} />}
      </button>
    </span>
  );
}

export const Label = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`text-[11px] font-semibold tracking-[.08em] text-mute uppercase ${className}`}
  >
    {children}
  </div>
);

/* ── Avatar ── */
export function Avatar({
  name,
  size = 28,
  tone,
}: {
  name: string;
  size?: number;
  tone?: string;
}) {
  const ini =
    name === "You"
      ? "YO"
      : name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-white font-semibold text-white shadow-xs"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: tone ?? "#4a90e2",
      }}
    >
      {ini}
    </span>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[12px]">{children}</span>;
}

/* ── Friendly source chips ── */
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
    <button
      type="button"
      title={id}
      onClick={(e) => {
        e.stopPropagation();
        openSource(id);
      }}
      className="inline-flex max-w-[210px] items-center gap-1 rounded-full border border-line bg-white px-2.5 py-[2px] text-[11px] font-medium text-ink2 transition-colors hover:border-brand-line hover:bg-brand-tint hover:text-brand-dark"
    >
      <Ico
        n={
          k === "file"
            ? "file"
            : k === "signal"
              ? "signal"
              : k === "person"
                ? "user"
                : "quote"
        }
        size={11}
      />
      <span className="truncate">{sourceLabel(id)}</span>
    </button>
  );
}

export function Evidence({
  ids,
  open: o = false,
}: {
  ids: string[];
  open?: boolean;
}) {
  const [open, setOpen] = useState(o);
  if (!ids || ids.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-[2px] text-[11.5px] font-medium transition-colors ${
          open
            ? "border-brand-line bg-brand-tint text-brand-dark"
            : "border-line bg-panel text-ink2 hover:bg-bar"
        }`}
      >
        <Ico n="file" size={11} />
        {ids.length} sources
        <Ico n="down" size={11} className={open ? "rotate-180" : ""} />
      </button>
      {open && ids.map((i) => <SourceChip key={i} id={i} />)}
    </div>
  );
}

/* ── Domain Badges ── */
const WG: Record<Warmth, [string, "red" | "gray" | "amber" | "green"]> = {
  guarded: ["shield", "red"],
  neutral: ["dot", "gray"],
  warm: ["bolt", "amber"],
  ally: ["check", "green"],
};

export function WarmthChip({ w }: { w: Warmth | null }) {
  if (!w) return <Chip dashed>warmth not set</Chip>;
  const [g, tone] = WG[w];
  return (
    <Chip tone={tone}>
      <Ico n={g} size={11} />
      {w}
    </Chip>
  );
}

const STAGES: Stage[] = ["identified", "qualified", "cleared", "agreed"];

export function StageChip({ stage }: { stage: Stage | null }) {
  if (!stage) return <Chip dashed>unknown</Chip>;
  const i = STAGES.indexOf(stage);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-[2px] text-[11.5px] font-medium text-ink">
      <span className="flex gap-[2px]" aria-hidden>
        {STAGES.map((s, k) => (
          <i
            key={s}
            className={`h-[5px] w-[8px] rounded-full ${
              k <= i ? "bg-brand" : "bg-line"
            }`}
          />
        ))}
      </span>
      {stage}
    </span>
  );
}

export function ConfidenceChip({ c, long }: { c: Conf; long?: boolean }) {
  if (c === "verified")
    return (
      <Chip tone="green">
        <Ico n="check" size={11} />
        verified{long && " · a file backs it"}
      </Chip>
    );
  if (c === "told")
    return (
      <Chip tone="blue">
        <Ico n="quote" size={11} />
        told{long && " · a person said it"}
      </Chip>
    );
  return (
    <Chip dashed>
      <Ico n="help" size={11} />
      claim{long && " · unverified"}
    </Chip>
  );
}

export function PersonChip({
  id,
  waiting,
  showWarmth = true,
}: {
  id: string;
  waiting?: string;
  showWarmth?: boolean;
}) {
  const p = person(id);
  if (!p.id) return <Chip dashed>no person on file</Chip>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Avatar name={p.name} size={22} />
      <Cite id={id} className="font-medium text-ink">
        {p.name}
      </Cite>
      {showWarmth && <WarmthChip w={p.warmth} />}
      {!p.met && <Chip dashed>never met</Chip>}
      {waiting && (
        <span className="text-[12px] text-mute">waiting on {waiting}</span>
      )}
    </span>
  );
}

/* ── RoleSlot ── */
export function RoleSlot({ role, d }: { role: Role; d: Deal }) {
  const f = d.roles[role];
  const asker = person(d.ask);
  return (
    <div
      className={`min-h-[88px] rounded-[16px] p-3.5 transition-all ${
        f
          ? "border border-line bg-white shadow-xs"
          : "border border-dashed border-line bg-panel/60"
      }`}
    >
      <Label className="mb-1">{role}</Label>
      {f ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Avatar name={person(f.person).name} size={22} />
            <Cite id={f.person} className="font-medium text-ink text-[13.5px]">
              {person(f.person).name}
            </Cite>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <WarmthChip w={person(f.person).warmth} />
            {!person(f.person).met && <Chip dashed>never met</Chip>}
          </div>
          {f.waiting && (
            <div className="text-[11.5px] text-mute line-clamp-1">
              waiting on {f.waiting}
            </div>
          )}
        </div>
      ) : (
        <div className="text-[12.5px] text-mute">
          Unknown <span aria-hidden>→</span> ask{" "}
          {asker.id ? (
            <Cite id={asker.id} className="text-ink2 font-medium">
              {asker.name}
            </Cite>
          ) : (
            <span className="text-ink2">unassigned</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── MoveCard ── */
export function MoveCard({
  m,
  rank,
  variant = "hero",
}: {
  m: Move;
  rank: number;
  variant?: "hero" | "expanded";
}) {
  const { go, copy, openComposer } = useApp();
  const [copied, setCopied] = useState(false);
  const d = m.deal ? deal(m.deal) : null;
  const exp = variant === "expanded";

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[20px] border bg-white transition-shadow ${
        rank === 1
          ? "border-brand shadow-[0_4px_16px_rgba(74,144,226,.15)]"
          : "border-line shadow-xs hover:shadow-md"
      }`}
    >
      <div className="flex gap-3.5 p-5 pb-4">
        <span
          className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
            rank === 1
              ? "bg-brand text-white"
              : "border border-brand-line bg-brand-tint text-brand-dark"
          }`}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={`font-semibold leading-snug text-ink ${
              exp || rank === 1 ? "text-[17px]" : "text-[15.5px]"
            }`}
          >
            {m.action}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {d && (
              <Chip tone="blue">
                <Cite id={d.id}>{d.name}</Cite>
              </Chip>
            )}
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink2">
              <Avatar name={m.owner} size={20} />
              {m.owner}
            </span>
            {m.ownerRole && (
              <span className="text-[12px] text-mute">{m.ownerRole}</span>
            )}
            <span className="text-[12.5px] text-mute">
              due{" "}
              <Cite id={m.id} className="font-semibold text-ink">
                {m.due}
              </Cite>
            </span>
          </div>
        </div>
      </div>

      <div
        title={m.why}
        className="line-clamp-2 px-5 pb-3 text-[13px] text-ink2 leading-relaxed"
      >
        <Ico n="clock" size={13} className="mr-1.5 inline text-brand" />
        {m.why}
      </div>

      {exp && m.mustBeat && (
        <div className="mx-5 mb-3 flex items-center gap-2 rounded-[12px] bg-warn-tint px-3 py-1.5 text-[12.5px] text-warn">
          <Ico n="flag" size={13} />
          <b>Must beat:</b> {m.mustBeat}
        </div>
      )}

      {m.evidence && m.evidence.length > 0 && (
        <div className="px-5 pb-4">
          <Evidence ids={m.evidence} />
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-line2 bg-panel px-5 py-3">
        {exp && (
          <Btn
            primary
            small
            icon="check"
            onClick={() =>
              openComposer({
                kind: "Task",
                attach: m.deal ?? "Account",
                text: `Accepted move ${m.id}: ${m.action}`,
              })
            }
          >
            Accept move
          </Btn>
        )}
        {d && (
          <Btn
            small
            icon="arrow"
            primary={!exp}
            onClick={() => go(`/d/${d.id}`)}
          >
            Open deal
          </Btn>
        )}
        <Btn
          small
          icon={copied ? "check" : "copy"}
          onClick={() => {
            copy(m.ask);
            setCopied(true);
            setTimeout(() => setCopied(false), 1300);
          }}
        >
          {copied ? "Copied" : exp ? "Copy" : "Copy the ask"}
        </Btn>
      </div>
    </article>
  );
}

/* ── RiskRow ── */
export const LANES: Record<
  Lane,
  { label: string; glyph: string; tone: "red" | "blue" | "amber" | "gray" }
> = {
  deadline: { label: "Deadline", glyph: "D", tone: "red" },
  warmth: { label: "Warmth", glyph: "W", tone: "blue" },
  stall: { label: "Stall", glyph: "S", tone: "amber" },
  signal: { label: "Signal", glyph: "N", tone: "gray" },
};

export const SEV: Record<
  Sev,
  { n: number; word: string; bar: string; text: string }
> = {
  low: { n: 1, word: "low", bar: "bg-[#f5b942]", text: "text-warn" },
  med: { n: 2, word: "medium", bar: "bg-[#ee8a3a]", text: "text-[#b8561a]" },
  high: { n: 3, word: "high", bar: "bg-bad", text: "text-bad" },
};

const LANE_ICON: Record<Lane, string> = {
  deadline: "flag",
  warmth: "shield",
  stall: "pause",
  signal: "signal",
};

export function RiskRow({ r }: { r: Risk }) {
  const { go } = useApp();
  const L = LANES[r.lane] ?? { label: r.lane, glyph: "R", tone: "gray" };
  const S = SEV[r.sev] ?? { n: 1, word: r.sev, bar: "bg-line", text: "text-mute" };
  const d = r.deal ? deal(r.deal) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[88px_110px_1fr_auto] items-center gap-4 border-b border-line2 bg-white px-5 py-4 transition-colors hover:bg-panel/50">
      <div>
        <div className="flex gap-[3px]" aria-hidden>
          {[1, 2, 3].map((k) => (
            <i
              key={k}
              className={`h-[16px] w-[8px] rounded-full ${
                k <= S.n ? S.bar : "bg-line"
              }`}
            />
          ))}
        </div>
        <div className={`mt-1 text-[11.5px] font-semibold ${S.text}`}>
          {S.word} severity
        </div>
      </div>
      <div>
        <Chip tone={L.tone}>
          <Ico n={LANE_ICON[r.lane] ?? "alert"} size={11} />
          {L.label}
        </Chip>
        <div className="mt-1 text-[11.5px] text-mute">
          {r.passed ? (
            <span className="text-bad font-medium">
              crossed{" "}
              <Cite id={r.id} className="text-bad font-semibold">
                {Math.abs(r.days)}d ago
              </Cite>
            </span>
          ) : r.days === 0 ? (
            <span className="text-bad font-semibold">triage today</span>
          ) : (
            <>
              turns bad in{" "}
              <Cite id={r.id} className="font-semibold text-ink">
                {r.days}d
              </Cite>
            </>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[13.5px] text-ink font-medium">
          {d ? (
            <Cite id={d.id} className="font-semibold text-brand-dark">
              {d.name}
            </Cite>
          ) : (
            <span className="font-semibold">{acctName(r.acct)}</span>
          )}
        </div>
        <div className="text-[13px] text-ink2 leading-relaxed mt-0.5">{r.what}</div>
        {r.evidence && r.evidence.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            <Evidence ids={r.evidence} />
          </div>
        )}
      </div>
      {r.defuse ? (
        <button
          type="button"
          onClick={() => go(`/m/${r.defuse}`)}
          className="whitespace-nowrap text-[12.5px] font-semibold text-brand hover:underline"
        >
          Defuse this →
        </button>
      ) : (
        <span className="text-[11.5px] text-faint">no move yet</span>
      )}
    </div>
  );
}

/* ── GapRow ── */
export function GapRow({ g }: { g: Gap }) {
  const { copy, go } = useApp();
  const [c, setC] = useState(false);
  const p = person(g.who);
  return (
    <div className="rounded-[18px] border border-line bg-white p-4.5 shadow-xs">
      <div className="flex items-start gap-2.5">
        <span className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-warn-tint text-warn">
          <Ico n="help" size={13} />
        </span>
        <div className="text-[13.5px] leading-snug font-medium text-ink">
          {g.what}
        </div>
      </div>
      <div className="mt-2.5">
        {g.who ? (
          <PersonChip id={g.who} />
        ) : (
          <Chip dashed>no person on file yet</Chip>
        )}
      </div>
      <div className="mt-2.5 rounded-[12px] bg-panel p-3 text-[12.5px]">
        <p className="italic text-ink">"{g.q}"</p>
        {g.why && <p className="text-mute mt-1.5">{g.why}</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <Btn
          small
          icon={c ? "check" : "copy"}
          onClick={() => {
            copy(g.q);
            setC(true);
            setTimeout(() => setC(false), 1300);
          }}
        >
          {c ? "Copied" : "Copy question"}
        </Btn>
        {p.id && (
          <Btn small icon="user" onClick={() => go(`/p/${p.id}`)}>
            Open person
          </Btn>
        )}
      </div>
    </div>
  );
}

/* ── SignalRow ── */
export function SignalRow({
  s,
  unread = true,
  onRead,
  linkAction,
}: {
  s: Signal;
  unread?: boolean;
  onRead?: () => void;
  linkAction?: () => void;
}) {
  return (
    <div
      className={`border-b border-line2 px-5 py-4 transition-colors ${
        unread ? "bg-white" : "bg-panel/70"
      }`}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <i
          className={`mt-[7px] h-[8px] w-[8px] shrink-0 rounded-full ${
            unread ? "bg-brand" : "bg-line"
          }`}
          aria-label={unread ? "unread" : "read"}
        />
        <div className="sm:w-[130px] shrink-0 text-[12px] text-mute">
          <Cite id={s.id}>{s.at}</Cite>
        </div>
        <div className="shrink-0 sm:w-[110px]">
          <Chip tone="red">{s.kind}</Chip>
        </div>
        <div className="min-w-0 flex-1 basis-[240px]">
          <div className="text-[13.5px] font-semibold text-ink">{s.text}</div>
          {s.deal && (
            <div className="mt-1">
              <Chip tone="blue">
                <Cite id={s.deal}>{deal(s.deal).name}</Cite>
              </Chip>
            </div>
          )}
          {s.diff && (
            <div className="mt-2 inline-grid max-w-full grid-cols-1 overflow-hidden rounded-[12px] border border-line text-[12px] sm:grid-cols-2">
              <div className="border-r border-line bg-bad-tint/50 px-2.5 py-1.5">
                <div className="text-[10px] tracking-wide text-mute uppercase font-semibold">
                  before · {s.diff.field}
                </div>
                <span className="text-ink2 line-through decoration-faint">
                  {s.diff.before}
                </span>
              </div>
              <div className="bg-ok-tint/60 px-2.5 py-1.5">
                <div className="text-[10px] tracking-wide text-mute uppercase font-semibold">
                  after · {s.diff.field}
                </div>
                <span className="font-semibold text-ink">{s.diff.after}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {linkAction && (
            <Btn small primary onClick={linkAction}>
              Link to deal
            </Btn>
          )}
          {onRead && (
            <Btn small onClick={onRead} disabled={!unread}>
              {unread ? "Mark read" : "Read"}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Empty State & Skeleton ── */
export function EmptyState({
  icon = "target",
  title,
  sub,
}: {
  icon?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="p-12 text-center text-mute">
      <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-full bg-panel text-faint mb-3">
        <Ico n={icon} size={24} />
      </div>
      <div className="text-[15px] font-semibold text-ink2">{title}</div>
      {sub && <div className="text-[13px] text-mute mt-1">{sub}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-8 space-y-4 max-w-[1000px] mx-auto">
      <div className="skel h-[52px]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[130, 130, 130].map((h, i) => (
          <div key={i} className="skel" style={{ height: h }} />
        ))}
      </div>
      <div className="skel h-[80px]" />
      <div className="skel h-[200px]" />
    </div>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-[12px] font-bold text-mute uppercase tracking-[.08em]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ── NoteForm ── */
export function NoteForm({
  preset,
  onClose,
}: {
  preset?: { kind?: string; attach?: string; text?: string };
  onClose: () => void;
}) {
  const { addNote } = useApp();
  const [text, setText] = useState(preset?.text ?? "");
  const [kind, setKind] = useState<"note" | "task" | "risk" | "next_step">(
    (preset?.kind?.toLowerCase() as "note" | "task" | "risk" | "next_step") ??
      "note"
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await addNote({
      kind,
      attach: preset?.attach ?? "",
      text: text.trim(),
      status: "queued",
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="space-y-3.5">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
        className="w-full rounded-[10px] border border-line bg-panel px-3 py-2 text-[13px] text-ink outline-none"
      >
        <option value="note">📝 Note</option>
        <option value="task">✅ Task</option>
        <option value="risk">⚠️ Risk flag</option>
        <option value="next_step">🎯 Next step</option>
      </select>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What do you want to record?"
        rows={4}
        className="w-full rounded-[12px] border border-line p-3 text-[14px] text-ink outline-none placeholder:text-faint focus:border-brand"
      />
      <div className="flex justify-end gap-2">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary onClick={submit} disabled={!text.trim() || saving}>
          {saving ? "Saving…" : "Save note"}
        </Btn>
      </div>
    </div>
  );
}
