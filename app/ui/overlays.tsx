"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Ico } from "./icons";
import {
  Btn,
  Chip,
  ConfidenceChip,
  IdChip,
  Label,
  NoteForm,
  Mono,
  useApp,
} from "./ui";
import { DEALS, SOURCES, source as localSource } from "./data";

/* ============================================================ Drawer ====== */

type DrawerCtx = {
  open: (id: string) => void;
  close: () => void;
};
export const DrawerCtxRef = createContext<DrawerCtx>({
  open: () => void 0,
  close: () => void 0,
});

function ConfRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2 border-b border-line2 py-3 text-[13px] last:border-b-0">
      <dt className="pt-[1px] text-[11px] font-medium tracking-[.08em] text-mute uppercase">
        {label}
      </dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function PayloadViewer({ payload }: { payload: unknown }) {
  const [open, setOpen] = useState(false);
  if (payload === null || payload === undefined) return null;
  const preview = typeof payload === "string"
    ? payload.slice(0, 400)
    : JSON.stringify(payload, null, 2).slice(0, 1600);
  return (
    <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="mt-3 overflow-hidden rounded-[12px] border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between bg-panel px-3 py-2.5 text-[12px] font-medium text-ink2">
        <span className="flex items-center gap-1.5"><Ico n="file" size={13} />Raw payload</span>
        <Ico n="down" size={14} className={open ? "rotate-180" : ""} />
      </summary>
      <pre className="max-h-[380px] overflow-auto px-3 py-3 font-mono text-[11.5px] leading-relaxed text-ink2 whitespace-pre-wrap break-all">{preview}{preview.length >= 1600 ? "\n\n… (truncated)" : ""}</pre>
    </details>
  );
}

export function Drawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { copy } = useApp();
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  /* Live query: the Convex version resolves the exact MCP call that
   * carried the record. Falls back to the local in-memory source when
   * the query is still loading or returns null. */
  const remote = useQuery(api.queries.sourceDetail, { id });
  const local = localSource(id);

  const detail = remote ?? local;
  const payload = remote?.payload ?? local.payload ?? null;
  const tool = remote?.tool ?? local.tool ?? "—";
  const args = remote?.args ?? local.args ?? "—";
  const ingested = remote?.ingested
    ? new Date(remote.ingested).toISOString().slice(0, 10)
    : local.ingested ?? "—";

  /* Close on Escape or backdrop click */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex justify-end bg-ink/25 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Source detail"
    >
      <aside className="drawer-in flex h-full w-full max-w-[420px] flex-col overflow-hidden bg-white shadow-[0_0_40px_rgba(0,0,0,.12)]">
        {/* header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Chip tone="gray" className="text-[11px]">{detail.kind}</Chip>
              {detail.conf && <ConfidenceChip c={detail.conf as "verified" | "told" | "claim"} />}
            </div>
            <h2 className="mt-1 truncate text-[16px] font-medium text-ink">
              {remote?.title ?? local.id}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full border border-line text-mute hover:bg-panel"
          >
            <Ico n="x" size={16} />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {remote === undefined && (
            <p className="mb-3 text-[12.5px] text-mute italic">
              Resolving from Convex…
            </p>
          )}
          {remote === null && (
            <p className="mb-3 rounded-[10px] bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
              No record for <Mono>{id}</Mono> in the store. Showing the local fallback.
            </p>
          )}

          <dl className="-my-3">
            <ConfRow label="id">
              <IdChip id={id} />
            </ConfRow>

            {remote?.meta && (
              <ConfRow label="meta">
                <span className="text-mute">{remote.meta}</span>
              </ConfRow>
            )}

            <ConfRow label="claim">
              <span className="italic text-ink2">
                &ldquo;{detail.claim}&rdquo;
              </span>
            </ConfRow>

            <ConfRow label="captured by">
              <span className="font-mono text-[12px]">{tool}</span>
              {args !== "—" && args !== id && (
                <span className="ml-1 text-mute">({args})</span>
              )}
            </ConfRow>

            {remote?.file && (
              <ConfRow label="file">
                <span className="font-mono text-[12px] text-ink2">{remote.file}</span>
              </ConfRow>
            )}

            {ingested !== "—" && (
              <ConfRow label="ingested">
                <span className="text-mute">{ingested}</span>
              </ConfRow>
            )}
          </dl>

          <PayloadViewer payload={payload} />
        </div>

        {/* footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-5 py-3.5">
          <Btn
            small
            icon={copied ? "check" : "copy"}
            onClick={() => { copy(id); setCopied(true); setTimeout(() => setCopied(false), 1300); }}
          >
            {copied ? "Copied" : "Copy id"}
          </Btn>
          <Btn small onClick={onClose}>Close</Btn>
        </div>
      </aside>
    </div>
  );
}

/* ============================================================ Palette ===== */

type PaletteAction = {
  key: string;
  label: string;
  icon: string;
  action: () => void;
  group?: string;
};

export function Palette({
  query: initial,
  actions,
  onClose,
}: {
  query?: string;
  actions: PaletteAction[];
  onClose: () => void;
}) {
  const [q, setQ] = useState(initial ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const needle = q.trim().toLowerCase();
  const hits = needle
    ? actions.filter(
        (a) =>
          a.label.toLowerCase().includes(needle) ||
          (a.group ?? "").toLowerCase().includes(needle),
      )
    : actions;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[13vh] bg-ink/30 backdrop-blur-[3px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Quick navigation"
    >
      <div className="rise w-full max-w-[520px] overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_12px_60px_rgba(0,0,0,.18)]">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Ico n="search" size={18} className="shrink-0 text-mute" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Go to… account, deal, risk, signal"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
            aria-label="Search"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="text-mute hover:text-ink">
              <Ico n="x" size={16} />
            </button>
          )}
        </div>
        <ul className="max-h-[380px] overflow-y-auto py-1" role="listbox">
          {hits.length === 0 && (
            <li className="px-4 py-6 text-center text-[13.5px] text-mute">Nothing matches.</li>
          )}
          {hits.map((a) => (
            <li key={a.key} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => { a.action(); onClose(); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-brand-tint/60"
              >
                <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-panel text-mute">
                  <Ico n={a.icon} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{a.label}</span>
                  {a.group && (
                    <span className="block text-[12px] text-mute">{a.group}</span>
                  )}
                </span>
                <Ico n="right" size={14} className="text-faint" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11.5px] text-mute">
          <span>⌘K · open</span>
          <span>Esc · close</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ Composer ==== */

export function Composer({
  preset,
  onClose,
}: {
  preset?: { kind?: string; attach?: string; text?: string };
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/30 backdrop-blur-[3px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Write a note"
    >
      <div className="rise w-full max-w-[520px] overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_12px_60px_rgba(0,0,0,.18)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 text-[16px] font-medium text-ink">
            <Ico n="note" size={17} className="text-brand" />
            Write a note
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line text-mute hover:bg-panel"
          >
            <Ico n="x" size={15} />
          </button>
        </div>
        <div className="p-5">
          <NoteForm preset={preset} onClose={onClose} />
        </div>
        <div className="border-t border-line bg-panel px-5 py-3 text-[12px] text-mute">
          <Ico n="shield" size={12} className="mr-1 inline" />
          Token stays server-side. The browser never touches it.
          Writes go through the one-call-a-minute queue.
        </div>
      </div>
    </div>
  );
}
