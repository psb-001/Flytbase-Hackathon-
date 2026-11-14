"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ConvexProvider, ConvexReactClient, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { buildData } from "../lib/build";
import {
  hydrate,
  markReady,
  ACCOUNTS,
  DEALS,
  PEOPLE,
  MOVES,
  RISKS,
  subscribe,
} from "./data";
import {
  AppCtx,
  type AppApi,
  type Note,
  PageSkeleton,
  Btn,
  Chip,
  Avatar,
} from "./ui";
import { Ico } from "./icons";
import { Drawer, Palette, Composer } from "./overlays";
import {
  SyncButton,
  Dashboard,
  AccountsList,
  AccountDetail,
  DealDetail,
  ContactDetail,
  ActionsList,
  ActionDetail,
  RisksList,
  NotesList,
} from "./screens";
import type { Portfolio } from "../../convex/lib/dto";

/* ── Convex client ── */
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

/* ── Route parser ── */
function parsePath(raw: string) {
  const parts = raw.replace(/\?.*/, "").split("/").filter(Boolean);
  return { route: parts[0] ?? "", id: parts[1] ?? "" };
}

/* ── Sidebar Nav Item ── */
function NavItem({
  icon,
  label,
  active,
  onClick,
  badge,
  indicator,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  indicator?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition-all ${
        active
          ? "bg-brand-tint text-brand-dark shadow-xs"
          : "text-ink2 hover:bg-panel hover:text-ink"
      }`}
    >
      <span
        className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg transition-colors ${
          active
            ? "bg-brand text-white"
            : "bg-panel text-mute group-hover:bg-bar group-hover:text-ink2"
        }`}
      >
        <Ico n={icon} size={15} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {indicator && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: indicator }}
        />
      )}
      {badge !== undefined && badge > 0 && (
        <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Shell ── */
function AppShell() {
  /* ── routing ── */
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

  /* ── data hydration from Convex ── */
  const portfolio = useQuery(api.queries.portfolio);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!portfolio) return;
    hydrate(buildData(portfolio as unknown as Portfolio));
    markReady();
    setReady(true);
  }, [portfolio]);

  useEffect(() => subscribe(() => setReady((r) => r)), []);

  /* ── notes ── */
  const rawNotes = useQuery(api.queries.notes, {});
  const addNoteMut = useMutation(api.notes.addNote);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);

  const notes: Note[] = useMemo(() => {
    const remote: Note[] = (rawNotes ?? []).map((n) => ({
      id: n._id,
      kind: n.kind,
      attach: n.accountId ?? n.dealId ?? "",
      text: n.text,
      at: new Date(n.at).toLocaleString(),
      status: n.status,
    }));
    return [...remote, ...localNotes.filter((l) => !remote.some((r) => r.id === l.id))];
  }, [rawNotes, localNotes]);

  const addNote = useCallback(
    async (n: Omit<Note, "id" | "at">) => {
      let accountId = "A";
      let dealId: string | undefined;
      if (n.attach?.startsWith("acct:")) accountId = n.attach.slice(5);
      else if (n.attach?.startsWith("d:")) {
        dealId = n.attach.slice(2);
        accountId = DEALS.find((d) => d.id === dealId)?.acct ?? "A";
      }
      const kind = (n.kind === "task"
        ? "task"
        : n.kind === "risk"
          ? "risk"
          : n.kind === "next_step"
            ? "next_step"
            : "note") as "note" | "task" | "risk" | "next_step";
      const tmp: Note = {
        id: `local_${Date.now()}`,
        kind: n.kind,
        attach: n.attach ?? "",
        text: n.text,
        at: new Date().toLocaleString(),
        status: "queued",
      };
      setLocalNotes((prev) => [tmp, ...prev]);
      await addNoteMut({ accountId, dealId, kind, text: n.text });
    },
    [addNoteMut]
  );

  /* ── overlays ── */
  const [composer, setComposer] = useState<{
    kind?: string;
    attach?: string;
    text?: string;
  } | null>(null);
  const [sourceDrawer, setSourceDrawer] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  /* ── read state ── */
  const [read, setRead] = useState<Set<string>>(new Set());
  const markRead = useCallback((id: string) => setRead((s) => new Set([...s, id])), []);
  const copy = useCallback((t: string) => {
    navigator.clipboard?.writeText(t).catch(() => {});
  }, []);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setComposer({});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const appApi: AppApi = useMemo(
    () => ({
      openSource: (id: string) => setSourceDrawer(id),
      openComposer: (p) => setComposer(p ?? {}),
      openPalette: () => setPaletteOpen(true),
      go,
      copy,
      notes,
      addNote,
      read,
      markRead,
    }),
    [go, copy, notes, addNote, read, markRead]
  );

  /* ── palette searchable actions ── */
  const paletteActions = useMemo(() => {
    const list: Array<{
      key: string;
      label: string;
      icon: string;
      action: () => void;
      group?: string;
    }> = [
      { key: "nav:dash", label: "Dashboard", icon: "home", action: () => go("/") },
      { key: "nav:accounts", label: "All Accounts", icon: "users", action: () => go("/accounts") },
      { key: "nav:actions", label: "Next Actions Due", icon: "clock", action: () => go("/actions") },
      { key: "nav:risks", label: "Risk Radar", icon: "alert", action: () => go("/risks") },
      { key: "nav:notes", label: "Notes & Tasks", icon: "note", action: () => go("/notes") },
    ];

    for (const a of ACCOUNTS) {
      list.push({
        key: `acc:${a.id}`,
        label: `${a.name} (${a.currency})`,
        icon: "users",
        action: () => go(`/a/${a.id}`),
        group: "Accounts",
      });
    }

    for (const d of DEALS) {
      list.push({
        key: `deal:${d.id}`,
        label: d.name,
        icon: "target",
        action: () => go(`/d/${d.id}`),
        group: "Deals",
      });
    }

    for (const p of PEOPLE) {
      list.push({
        key: `person:${p.id}`,
        label: `${p.name} · ${p.title || "Stakeholder"}`,
        icon: "user",
        action: () => go(`/p/${p.id}`),
        group: "Contacts",
      });
    }

    return list;
  }, [go]);

  /* ── page router ── */
  const { route, id } = parsePath(path);

  function renderPage() {
    if (!ready) return <PageSkeleton />;
    switch (route) {
      case "":
        return <Dashboard />;
      case "accounts":
        return <AccountsList />;
      case "a":
        return <AccountDetail id={id} />;
      case "d":
        return <DealDetail id={id} />;
      case "p":
        return <ContactDetail id={id} />;
      case "m":
        return <ActionDetail id={id} />;
      case "actions":
        return <ActionsList />;
      case "risks":
        return <RisksList />;
      case "notes":
        return <NotesList />;
      default:
        return (
          <div className="py-20 text-center text-mute">
            <div className="mb-3 text-[48px]">🔍</div>
            <div className="text-[18px] font-bold text-ink">Page not found</div>
            <Btn primary className="mt-4" onClick={() => go("/")}>
              Go to Dashboard
            </Btn>
          </div>
        );
    }
  }

  const currentAccount = ACCOUNTS.find((a) => a.id === id);

  return (
    <AppCtx.Provider value={appApi}>
      <div className="flex h-screen overflow-hidden bg-white text-ink antialiased">
        {/* ── Sidebar ── */}
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-line bg-panel">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 border-b border-line px-5 py-4.5 bg-white">
            <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-brand text-white shadow-xs">
              <Ico n="shield" size={18} />
            </div>
            <div>
              <div className="text-[15px] font-extrabold tracking-tight text-ink leading-tight">
                FlytBase
              </div>
              <div className="text-[11.5px] font-medium text-mute">
                DroneOps CRM
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            <NavItem
              icon="home"
              label="Dashboard"
              active={route === "" && path === "/"}
              onClick={() => go("/")}
            />
            <NavItem
              icon="users"
              label="Accounts"
              active={route === "accounts" || (route === "a" && !id)}
              onClick={() => go("/accounts")}
            />
            <NavItem
              icon="target"
              label="Next Actions"
              active={route === "actions" || route === "m"}
              onClick={() => go("/actions")}
              badge={MOVES.length > 0 ? MOVES.length : undefined}
            />
            <NavItem
              icon="alert"
              label="Risk Radar"
              active={route === "risks"}
              onClick={() => go("/risks")}
              badge={RISKS.filter((r) => r.sev === "high").length || undefined}
            />
            <NavItem
              icon="note"
              label="Notes & Tasks"
              active={route === "notes"}
              onClick={() => go("/notes")}
              badge={notes.filter((n) => n.status === "queued").length || undefined}
            />

            {/* Quick-switch Accounts Section */}
            {ready && ACCOUNTS.length > 0 && (
              <div className="pt-5">
                <div className="px-3 pb-2 text-[10.5px] font-bold tracking-[.08em] text-mute uppercase">
                  Accounts ({ACCOUNTS.length})
                </div>
                <div className="space-y-0.5">
                  {ACCOUNTS.map((a) => {
                    const hue =
                      a.id === "A" ? "#2b6cb0" : a.id === "B" ? "#7c3aed" : "#059669";
                    return (
                      <NavItem
                        key={a.id}
                        icon="building"
                        label={a.name}
                        active={route === "a" && id === a.id}
                        onClick={() => go(`/a/${a.id}`)}
                        indicator={hue}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

          {/* Quick-add Note Button & Shortcuts */}
          <div className="border-t border-line bg-white p-3 space-y-2">
            <button
              type="button"
              onClick={() => setComposer({})}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-brand bg-brand px-3 py-2 text-[13px] font-semibold text-white shadow-xs hover:bg-brand-dark transition-all"
            >
              <Ico n="plus" size={14} />
              <span>Add Note</span>
              <kbd className="ml-auto rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] text-white">
                ⌘N
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex w-full items-center justify-between rounded-[10px] border border-line bg-panel px-3 py-1.5 text-[12px] font-medium text-mute hover:bg-bar hover:text-ink transition-all"
            >
              <span className="flex items-center gap-1.5">
                <Ico n="search" size={13} />
                Quick Search
              </span>
              <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[10px] text-mute">
                ⌘K
              </kbd>
            </button>
          </div>
        </aside>

        {/* ── Main Area ── */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          {/* Topbar */}
          <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-line px-7 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-bold text-ink">
                {route === ""
                  ? "Dashboard Overview"
                  : route === "accounts"
                    ? "Accounts Portfolio"
                    : route === "a"
                      ? (currentAccount?.name ?? "Account Detail")
                      : route === "d"
                        ? "Deal Overview"
                        : route === "p"
                          ? "Contact Record"
                          : route === "m"
                            ? "Action Detail"
                            : route === "actions"
                              ? "Next Actions"
                              : route === "risks"
                                ? "Risk Radar"
                                : route === "notes"
                                  ? "Notes & Tasks"
                                  : ""}
              </span>
              {currentAccount && (
                <Chip tone={currentAccount.id === "A" ? "blue" : currentAccount.id === "B" ? "gray" : "green"}>
                  {currentAccount.currency}
                </Chip>
              )}
            </div>

            {/* Right Topbar actions: Search, SyncButton */}
            <div className="flex items-center gap-3">
              <SyncButton />
            </div>
          </header>

          {/* Main Scrollable Canvas */}
          <main className="flex-1 overflow-y-auto px-8 py-7 bg-[#fafbfc]">
            {renderPage()}
          </main>
        </div>
      </div>

      {/* ── Drawer for Evidence Citations ── */}
      {sourceDrawer && (
        <Drawer id={sourceDrawer} onClose={() => setSourceDrawer(null)} />
      )}

      {/* ── Quick-switch Palette (Cmd+K) ── */}
      {paletteOpen && (
        <Palette actions={paletteActions} onClose={() => setPaletteOpen(false)} />
      )}

      {/* ── Note Composer (Cmd+N) ── */}
      {composer && (
        <Composer preset={composer} onClose={() => setComposer(null)} />
      )}
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
