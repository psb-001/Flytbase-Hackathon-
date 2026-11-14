"use client";
import {
  createContext, useContext, useState, useCallback,
  type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DEALS } from "./data";

/* ── Types ── */
export type Note = {
  id: string; kind: string; attach: string;
  text: string; at: string; status: string;
};
export type AppApi = {
  go: (p: string) => void;
  openComposer: (p?: { kind?: string; attach?: string; text?: string }) => void;
  copy: (t: string) => void;
  notes: Note[];
  addNote: (n: Omit<Note, "id" | "at">) => Promise<void>;
  read: Set<string>;
  markRead: (id: string) => void;
};
export const AppCtx = createContext<AppApi>({
  go: () => {}, openComposer: () => {}, copy: () => {},
  notes: [], addNote: async () => {},
  read: new Set(), markRead: () => {},
});
export const useApp = () => useContext(AppCtx);

/* ── Primitives ── */

export function Avatar({
  name, size = 36, hue = "blue",
}: { name: string; size?: number; hue?: "blue" | "purple" | "green" | "amber" }) {
  const initials = name.split(" ").map(w => w[0] ?? "").slice(0, 2).join("").toUpperCase();
  const bg = { blue: "#2563eb", purple: "#7c3aed", green: "#16a34a", amber: "#d97706" }[hue];
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2, background: bg,
      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: size * .36, fontWeight: 700, letterSpacing: "-.01em",
    }}>
      {initials}
    </div>
  );
}

export function Tag({ children, tone = "gray" }: { children: ReactNode; tone?: string }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

export function StageBadge({ stage }: { stage: string | null }) {
  const map: Record<string, { label: string; tone: string }> = {
    identified: { label: "Identified", tone: "gray" },
    qualified:  { label: "Qualified",  tone: "blue" },
    cleared:    { label: "Cleared",    tone: "amber" },
    agreed:     { label: "Agreed",     tone: "green" },
  };
  const { label, tone } = map[stage ?? ""] ?? { label: "No stage", tone: "gray" };
  return <Tag tone={tone}>{label}</Tag>;
}

export function WarmthBadge({ warmth }: { warmth: string | null }) {
  const map: Record<string, { label: string; tone: string; dot: string }> = {
    guarded: { label: "Guarded", tone: "red",   dot: "#ef4444" },
    neutral: { label: "Neutral", tone: "gray",  dot: "#9ca3af" },
    warm:    { label: "Warm",    tone: "amber",  dot: "#f59e0b" },
    ally:    { label: "Ally",    tone: "green",  dot: "#22c55e" },
  };
  if (!warmth || !map[warmth]) return null;
  const { label, tone, dot } = map[warmth];
  return (
    <Tag tone={tone}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      {label}
    </Tag>
  );
}

export function ValueBadge({ bucket }: { bucket: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    backed:  { label: "Committed",  tone: "green" },
    claimed: { label: "Forecasted", tone: "amber" },
    unknown: { label: "No Value",   tone: "gray" },
  };
  const { label, tone } = map[bucket] ?? { label: bucket, tone: "gray" };
  return <Tag tone={tone}>{label}</Tag>;
}

export function SevBadge({ sev }: { sev: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    high: { label: "High",   tone: "red" },
    med:  { label: "Medium", tone: "amber" },
    low:  { label: "Low",    tone: "gray" },
  };
  const { label, tone } = map[sev] ?? { label: sev, tone: "gray" };
  return <Tag tone={tone}>{label}</Tag>;
}

export function Btn({
  children, onClick, primary = false, small = false, disabled = false, loading = false,
}: {
  children: ReactNode; onClick?: () => void;
  primary?: boolean; small?: boolean; disabled?: boolean; loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: small ? "5px 12px" : "8px 16px",
        borderRadius: 10,
        border: primary ? "none" : "1px solid var(--line)",
        background: primary ? "var(--brand)" : "var(--white)",
        color: primary ? "#fff" : "var(--ink2)",
        fontWeight: 600, fontSize: small ? 12 : 13,
        cursor: disabled || loading ? "default" : "pointer",
        opacity: disabled ? .5 : 1,
        transition: "opacity .15s, background .15s",
      }}
    >
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--mute)" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 15, color: "var(--ink2)" }}>{title}</div>
      {sub && <div style={{ fontSize: 13, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="skel" style={{ height: 44 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[150, 150, 150].map((h, i) => <div key={i} className="skel" style={{ height: h }} />)}
      </div>
      <div className="skel" style={{ height: 60 }} />
      <div className="skel" style={{ height: 180 }} />
    </div>
  );
}

export function Section({
  title, children, action,
}: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".07em" }}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ── Note composer modal ── */
export function NoteComposer({
  preset, onClose,
}: { preset?: { kind?: string; attach?: string; text?: string }; onClose: () => void }) {
  const { addNote } = useApp();
  const [text, setText] = useState(preset?.text ?? "");
  const [kind, setKind] = useState<"note" | "task" | "risk" | "next_step">(
    (preset?.kind as "note" | "task" | "risk" | "next_step") ?? "note"
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await addNote({ kind, attach: preset?.attach ?? "", text: text.trim(), status: "queued" });
    setSaving(false);
    onClose();
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,.3)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div className="card fade-up" style={{ width: "100%", maxWidth: 480, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>📝 Add Note</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--mute)", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <select
            value={kind}
            onChange={e => setKind(e.target.value as typeof kind)}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, background: "var(--panel)" }}
          >
            <option value="note">📝  Note</option>
            <option value="task">✅  Task</option>
            <option value="risk">⚠️  Risk flag</option>
            <option value="next_step">🎯  Next step</option>
          </select>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What do you want to record?"
            rows={4}
            style={{
              padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)",
              fontSize: 14, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5,
              outline: "none",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn primary onClick={submit} loading={saving} disabled={!text.trim()}>
              Save note
            </Btn>
          </div>
        </div>
        <p style={{ marginTop: 14, fontSize: 11, color: "var(--faint)" }}>
          🔒 Saved to Convex, then sent through the MCP queue. Token never leaves the server.
        </p>
      </div>
    </div>
  );
}
