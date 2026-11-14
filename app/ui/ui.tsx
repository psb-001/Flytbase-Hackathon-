"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DEALS } from "./data";

/* ── App context ── */
export type Note = {
  id: string; kind: string; attach: string;
  text: string; at: string; status: string;
};
export type AppApi = {
  go: (p: string, opts?: { anchor?: string }) => void;
  openComposer: (p?: { kind?: string; attach?: string; text?: string }) => void;
  copy: (t: string) => void;
  notes: Note[];
  addNote: (n: Omit<Note, "id" | "at">) => Promise<void>;
  read: Set<string>;
  markRead: (id: string) => void;
};
export const AppCtx = createContext<AppApi>({
  go: () => void 0, openComposer: () => void 0, copy: () => void 0,
  notes: [], addNote: async () => void 0,
  read: new Set(), markRead: () => void 0,
});
export const useApp = () => useContext(AppCtx);

/* ── Shared primitives ── */

export function Avatar({ name, size = 36, color = "blue" }: { name: string; size?: number; color?: string }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const colors: Record<string, string> = {
    blue: "#2563eb", green: "#16a34a", purple: "#7c3aed",
    orange: "#ea580c", pink: "#db2777", teal: "#0d9488",
  };
  const bg = colors[color] ?? colors.blue;
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>
      {initials}
    </div>
  );
}

export function Tag({ children, tone = "gray" }: { children: ReactNode; tone?: string }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

export function Dot({ color }: { color: string }) {
  const map: Record<string, string> = {
    green: "#22c55e", amber: "#f59e0b", red: "#ef4444",
    blue: "#3b82f6", gray: "#d1d5db",
  };
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: map[color] ?? map.gray, flexShrink: 0 }} />;
}

export function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return <Tag tone="gray">No Stage</Tag>;
  const map: Record<string, { label: string; tone: string }> = {
    identified: { label: "Identified", tone: "gray" },
    qualified:  { label: "Qualified",  tone: "blue" },
    cleared:    { label: "Cleared",    tone: "amber" },
    agreed:     { label: "Agreed",     tone: "green" },
  };
  const { label, tone } = map[stage] ?? { label: stage, tone: "gray" };
  return <Tag tone={tone}>{label}</Tag>;
}

export function WarmthBadge({ warmth }: { warmth: string | null }) {
  if (!warmth) return null;
  const map: Record<string, { label: string; tone: string; dot: string }> = {
    guarded: { label: "Guarded", tone: "red",   dot: "red" },
    neutral: { label: "Neutral", tone: "gray",  dot: "gray" },
    warm:    { label: "Warm",    tone: "amber",  dot: "amber" },
    ally:    { label: "Ally",    tone: "green",  dot: "green" },
  };
  const { label, tone, dot } = map[warmth] ?? { label: warmth, tone: "gray", dot: "gray" };
  return <Tag tone={tone}><Dot color={dot} />{label}</Tag>;
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
    high: { label: "High", tone: "red" },
    med:  { label: "Medium", tone: "amber" },
    low:  { label: "Low",  tone: "gray" },
  };
  const { label, tone } = map[sev] ?? { label: sev, tone: "gray" };
  return <Tag tone={tone}>{label}</Tag>;
}

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--mute)" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
      {[200, 120, 160, 100].map((h, i) => (
        <div key={i} className="skel" style={{ height: h, borderRadius: 12 }} />
      ))}
    </div>
  );
}

/* ── Note composer ── */
export function NoteComposer({ preset, onClose }: {
  preset?: { kind?: string; attach?: string; text?: string };
  onClose: () => void;
}) {
  const { notes, addNote } = useApp();
  const [text, setText] = useState(preset?.text ?? "");
  const [kind, setKind] = useState<"note" | "task" | "risk" | "next_step">(
    (preset?.kind as "note" | "task" | "risk" | "next_step") ?? "note"
  );
  const [attach, setAttach] = useState(preset?.attach ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await addNote({ kind, attach, text: text.trim(), status: "queued" });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,.35)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card fade-up" style={{ width: "100%", maxWidth: 480, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Add Note</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--mute)" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <select value={kind} onChange={e => setKind(e.target.value as typeof kind)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, background: "var(--panel)" }}>
            <option value="note">📝 Note</option>
            <option value="task">✅ Task</option>
            <option value="risk">⚠️ Risk flag</option>
            <option value="next_step">🎯 Next step</option>
          </select>

          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="What do you want to record?"
            rows={4} style={{
              padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)",
              fontSize: 14, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5,
            }} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={onClose} style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid var(--line)",
              background: "var(--white)", cursor: "pointer", fontSize: 13,
            }}>Cancel</button>
            <button onClick={submit} disabled={!text.trim() || saving} style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: text.trim() ? "var(--brand)" : "var(--line)", color: text.trim() ? "#fff" : "var(--mute)",
              cursor: text.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600,
            }}>{saving ? "Saving…" : "Save note"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
