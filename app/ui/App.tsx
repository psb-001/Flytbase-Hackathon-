"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { ConvexProvider, ConvexReactClient, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { buildData } from "../lib/build";
import { hydrate, markReady, ACCOUNTS, DEALS, subscribe } from "./data";
import { AppCtx, type AppApi, type Note, NoteComposer, PageSkeleton } from "./ui";
import {
  Dashboard, AccountsList, AccountDetail, DealDetail,
  ContactDetail, ActionsList, ActionDetail, RisksList, NotesList,
} from "./screens";
import type { Portfolio } from "../../convex/lib/dto";

/* ── Convex client ── */
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

/* ── Route parser ── */
function parsePath(raw: string) {
  const parts = raw.replace(/\?.*/, "").split("/").filter(Boolean);
  return { route: parts[0] ?? "", id: parts[1] ?? "" };
}

/* ── Nav item ── */
function NavItem({ icon, label, active, onClick, badge }: {
  icon: string; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: "9px 14px", borderRadius: 10, border: "none", cursor: "pointer",
      background: active ? "rgba(37,99,235,.1)" : "transparent",
      color: active ? "var(--brand)" : "var(--ink2)",
      fontWeight: active ? 700 : 500, fontSize: 14, textAlign: "left",
      transition: "background .15s, color .15s",
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--line2)"; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: 17, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{
          background: "var(--bad)", color: "#fff", borderRadius: 999,
          padding: "1px 7px", fontSize: 11, fontWeight: 700, minWidth: 20, textAlign: "center",
        }}>{badge}</span>
      )}
    </button>
  );
}

/* ── Shell ── */
function AppShell() {
  /* routing */
  const [path, setPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );
  const go = useCallback((next: string) => {
    window.history.pushState(null, "", next);
    setPath(next);
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* data */
  const portfolio = useQuery(api.queries.portfolio);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!portfolio) return;
    hydrate(buildData(portfolio as unknown as Portfolio));
    markReady();
    setReady(true);
  }, [portfolio]);
  useEffect(() => subscribe(() => setReady(r => { return r; })), []);

  /* notes */
  const rawNotes = useQuery(api.queries.notes, {});
  const addNoteMut = useMutation(api.notes.addNote);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);

  const notes: Note[] = useMemo(() => {
    const remote: Note[] = (rawNotes ?? []).map(n => ({
      id: n._id, kind: n.kind, attach: n.accountId ?? n.dealId ?? "",
      text: n.text, at: new Date(n.at).toLocaleString(), status: n.status,
    }));
    return [...remote, ...localNotes.filter(l => !remote.some(r => r.id === l.id))];
  }, [rawNotes, localNotes]);

  const addNote = useCallback(async (n: Omit<Note, "id" | "at">) => {
    let accountId = "A";
    let dealId: string | undefined;
    if (n.attach?.startsWith("acct:")) accountId = n.attach.slice(5);
    else if (n.attach?.startsWith("d:")) {
      dealId = n.attach.slice(2);
      accountId = DEALS.find(d => d.id === dealId)?.acct ?? "A";
    }
    const kind = (n.kind === "task" ? "task" : n.kind === "risk" ? "risk" : n.kind === "next_step" ? "next_step" : "note") as "note" | "task" | "risk" | "next_step";
    const tmp: Note = { id: `local_${Date.now()}`, kind: n.kind, attach: n.attach ?? "", text: n.text, at: new Date().toLocaleString(), status: "queued" };
    setLocalNotes(prev => [tmp, ...prev]);
    await addNoteMut({ accountId, dealId, kind, text: n.text });
  }, [addNoteMut]);

  /* composer */
  const [composer, setComposer] = useState<{ kind?: string; attach?: string; text?: string } | null>(null);

  /* read */
  const [read, setRead] = useState<Set<string>>(new Set());
  const markRead = useCallback((id: string) => setRead(s => new Set([...s, id])), []);
  const copy = useCallback((t: string) => { navigator.clipboard?.writeText(t).catch(() => {}); }, []);

  /* keyboard shortcut */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); setComposer({}); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const appApi: AppApi = useMemo(() => ({
    go, openComposer: (p) => setComposer(p ?? {}), copy,
    notes, addNote, read, markRead,
  }), [go, copy, notes, addNote, read, markRead]);

  /* page render */
  const { route, id } = parsePath(path);

  function page() {
    if (!ready) return <PageSkeleton />;
    switch (route) {
      case "":        return <Dashboard />;
      case "accounts":return <AccountsList />;
      case "a":       return <AccountDetail id={id} />;
      case "d":       return <DealDetail id={id} />;
      case "p":       return <ContactDetail id={id} />;
      case "m":       return <ActionDetail id={id} />;
      case "actions": return <ActionsList />;
      case "risks":   return <RisksList />;
      case "notes":   return <NotesList />;
      default:        return (
        <div style={{ padding: 60, textAlign: "center", color: "var(--mute)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Page not found</div>
          <button onClick={() => go("/")} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 8, background: "var(--brand)", color: "#fff", border: "none", cursor: "pointer" }}>Go home</button>
        </div>
      );
    }
  }

  const highRisks = ready ? (ACCOUNTS.length > 0 ? 2 : 0) : 0; // will re-render on hydrate

  return (
    <AppCtx.Provider value={appApi}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "inherit" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 220, flexShrink: 0, background: "var(--white)",
          borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>
          {/* logo */}
          <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: "var(--brand)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>🎯</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)" }}>SalesCRM</div>
                <div style={{ fontSize: 11, color: "var(--faint)" }}>FlytBase</div>
              </div>
            </div>
          </div>

          {/* nav */}
          <nav style={{ padding: "12px 10px", flex: 1 }}>
            <NavItem icon="🏠" label="Dashboard"  active={route === "" && path === "/"} onClick={() => go("/")} />
            <NavItem icon="🏢" label="Accounts"   active={route === "accounts" || route === "a"} onClick={() => go("/accounts")} />
            <NavItem icon="✅" label="Actions"    active={route === "actions" || route === "m"} onClick={() => go("/actions")} />
            <NavItem icon="⚠️" label="Risks"      active={route === "risks"} onClick={() => go("/risks")} />
            <NavItem icon="📝" label="Notes"      active={route === "notes"} onClick={() => go("/notes")} badge={notes.filter(n => n.status === "queued").length} />

            {/* accounts quick-jump */}
            {ready && ACCOUNTS.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ padding: "4px 14px", fontSize: 10, fontWeight: 700, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".08em" }}>Accounts</div>
                {ACCOUNTS.map(a => (
                  <NavItem key={a.id} icon={a.id === "A" ? "🔵" : "🟣"} label={a.short ?? a.name}
                    active={route === "a" && id === a.id} onClick={() => go(`/a/${a.id}`)} />
                ))}
              </div>
            )}
          </nav>

          {/* add note button */}
          <div style={{ padding: "12px 10px", borderTop: "1px solid var(--line)" }}>
            <button onClick={() => setComposer({})} style={{
              width: "100%", padding: "9px 14px", borderRadius: 10, border: "1px solid var(--brand)",
              background: "var(--brand)", color: "#fff", cursor: "pointer",
              fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span>+</span> Add Note
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* topbar */}
          <header style={{
            padding: "12px 28px", borderBottom: "1px solid var(--line)",
            background: "var(--white)", display: "flex", alignItems: "center",
            justifyContent: "space-between", flexShrink: 0,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink2)" }}>
              {route === "" ? "Dashboard"
                : route === "accounts" ? "Accounts"
                : route === "a" ? (ACCOUNTS.find(a => a.id === id)?.name ?? "Account")
                : route === "d" ? "Deal"
                : route === "p" ? "Contact"
                : route === "m" ? "Action"
                : route === "actions" ? "Actions"
                : route === "risks" ? "Risks"
                : route === "notes" ? "Notes"
                : ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: portfolio ? "var(--ok)" : "var(--warn)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: portfolio ? "var(--ok)" : "var(--warn)", display: "inline-block" }} />
                {portfolio ? "Live" : "Connecting…"}
              </div>
            </div>
          </header>

          {/* content */}
          <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
            {page()}
          </main>
        </div>
      </div>

      {/* note composer overlay */}
      {composer && <NoteComposer preset={composer} onClose={() => setComposer(null)} />}
    </AppCtx.Provider>
  );
}

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <AppShell />
    </ConvexProvider>
  );
}
