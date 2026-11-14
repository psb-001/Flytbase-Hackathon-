"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ConvexProvider, ConvexReactClient, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

import { buildData } from "../lib/build";
import {
  hydrate,
  markReady,
  ACCOUNTS,
  DEALS,
  GAPS,
  MOVES,
  PEOPLE,
  RISKS,
  SIGNALS,
  SOURCES,
  SNAPSHOTS,
  subscribe,
  getVersion,
} from "./data";
import { AppCtx, type AppApi, type Note } from "./ui";
import { Ico } from "./icons";
import { Drawer, Palette, Composer } from "./overlays";
import { Monday, NotesScreen, DataScreen } from "./Monday";
import {
  DealScreen,
  PersonScreen,
  RisksScreen,
  WhyScreen,
  MoveScreen,
  LinkScreen,
  SignalsScreen,
} from "./screens";
import { AccountScreen } from "./AccountScreen";
import { PageSkeleton, FreshnessBadge, Btn } from "./ui";
import type { Portfolio } from "../../convex/lib/dto";

/* ================================================================ client = */

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string,
);

/* ================================================================ routing = */

function parsePath(raw: string): { route: string; id: string; sub: string } {
  const url = new URL(raw, "http://x");
  const parts = url.pathname.split("/").filter(Boolean);
  const route = parts[0] ?? "";
  const id = parts[1] ?? url.searchParams.get("acct") ?? "";
  const sub = parts[2] ?? "";
  return { route, id, sub };
}

/* ================================================================= nav ==== */

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-[3px] px-3 py-2 text-[11px] font-medium transition-colors ${
        active ? "text-brand" : "text-mute hover:text-ink"
      }`}
    >
      <span
        className={`flex h-[28px] w-[28px] items-center justify-center rounded-full ${
          active ? "bg-brand-tint" : ""
        }`}
      >
        <Ico n={icon} size={16} />
      </span>
      {label}
    </button>
  );
}

function Sidebar({ path, go }: { path: string; go: (p: string) => void }) {
  const { route } = parsePath(path);
  const isActive = (r: string) => route === r || (r === "" && route === "");
  return (
    <nav
      className="flex h-full flex-col items-center gap-1 border-r border-line bg-panel py-4"
      aria-label="Main navigation"
    >
      <NavItem icon="home" label="Monday" active={isActive("")} onClick={() => go("/")} />
      {ACCOUNTS.map((a) => (
        <NavItem
          key={a.id}
          icon="users"
          label={a.short}
          active={route === "a" && parsePath(path).id === a.id}
          onClick={() => go(`/a/${a.id}`)}
        />
      ))}
      <NavItem icon="alert" label="Risks" active={route === "risks"} onClick={() => go("/risks")} />
      <NavItem icon="signal" label="Signals" active={route === "signals"} onClick={() => go("/signals")} />
      <div className="mt-auto space-y-1">
        <NavItem icon="note" label="Notes" active={route === "notes"} onClick={() => go("/notes")} />
        <NavItem icon="file" label="Data" active={route === "data"} onClick={() => go("/data")} />
      </div>
    </nav>
  );
}

/* ================================================================== App === */

function AppShell() {
  /* ---- routing ---- */
  const [path, setPath] = useState(
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
  );

  const go = useCallback((next: string, opts?: { anchor?: string }) => {
    const dest = opts?.anchor ? `${next}#${opts.anchor}` : next;
    window.history.pushState(null, "", dest);
    setPath(next);
    if (opts?.anchor) {
      setTimeout(() => {
        document.getElementById(opts.anchor!)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    } else {
      window.scrollTo({ top: 0 });
    }
  }, []);

  useEffect(() => {
    const onPop = () =>
      setPath(window.location.pathname + window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ---- data ---- */
  const portfolio = useQuery(api.queries.portfolio);
  const [ready, setReady] = useState(false);
  const [ver, setVer] = useState(0);

  useEffect(() => {
    if (!portfolio) return;
    hydrate(buildData(portfolio as unknown as Portfolio));
    markReady();
    setReady(true);
    setVer((v) => v + 1);
  }, [portfolio]);

  /* also subscribe to in-module changes (e.g. another tab's hydration) */
  useEffect(() => subscribe(() => setVer((v) => v + 1)), []);

  /* ---- overlays ---- */
  const [drawer, setDrawer] = useState<string | null>(null);
  const [composer, setComposer] = useState<{
    kind?: string;
    attach?: string;
    text?: string;
  } | null>(null);
  const [palette, setPalette] = useState<string | null>(null);

  /* ---- notes ---- */
  const rawNotes = useQuery(api.queries.notes, {});
  const addNoteMut = useMutation(api.notes.addNote);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [noteRead, setNoteRead] = useState<Set<string>>(new Set());

  const notes: Note[] = useMemo(() => {
    const remote: Note[] = (rawNotes ?? []).map((n) => ({
      id: n._id,
      kind: n.kind,
      attach: n.accountId ?? n.dealId ?? "Account",
      text: n.text,
      at: new Date(n.at).toLocaleString(),
      status: n.status,
    }));
    return [...remote, ...localNotes.filter((l) => !remote.some((r) => r.id === l.id))];
  }, [rawNotes, localNotes]);

  const addNote = useCallback(
    async (n: Omit<Note, "id" | "at">) => {
      /* resolve attach to accountId / dealId */
      let accountId = "A";
      let dealId: string | undefined;
      if (n.attach?.startsWith("acct:")) {
        accountId = n.attach.slice(5);
      } else if (n.attach?.startsWith("d:")) {
        const did = n.attach.slice(2);
        dealId = did;
        accountId = DEALS.find((d) => d.id === did)?.acct ?? "A";
      } else {
        accountId = n.attach ?? "A";
      }

      const kind = (
        n.kind === "Note" ? "note"
        : n.kind === "Task" ? "task"
        : n.kind === "Risk" ? "risk"
        : "next_step"
      ) as "note" | "task" | "risk" | "next_step";

      const tmp: Note = {
        id: `local_${Date.now()}`,
        kind: n.kind,
        attach: n.attach ?? "Account",
        text: n.text,
        at: new Date().toLocaleString(),
        status: "queued",
      };
      setLocalNotes((prev) => [tmp, ...prev]);

      await addNoteMut({ accountId, dealId, kind, text: n.text });
    },
    [addNoteMut],
  );

  /* ---- read tracking ---- */
  const markRead = useCallback(
    (id: string) => setNoteRead((s) => new Set([...s, id])),
    [],
  );

  /* ---- copy ---- */
  const copy = useCallback((t: string) => {
    navigator.clipboard?.writeText(t).catch(() => void 0);
  }, []);

  /* ---- countdown (shows time until next MCP pump, ~20s cycle) ---- */
  const [countdown, setCountdown] = useState(20);
  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => (c <= 1 ? 20 : c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPalette("");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setComposer({});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---- palette actions ---- */
  const paletteActions = useMemo(() => {
    const a = [
      { key: "monday", label: "Monday", icon: "home", action: () => go("/"), group: "Pages" },
      { key: "risks", label: "All risks", icon: "alert", action: () => go("/risks"), group: "Pages" },
      { key: "signals", label: "Signals", icon: "signal", action: () => go("/signals"), group: "Pages" },
      { key: "notes", label: "Notes", icon: "note", action: () => go("/notes"), group: "Pages" },
      { key: "data", label: "Data & sources", icon: "file", action: () => go("/data"), group: "Pages" },
    ];
    for (const acc of ACCOUNTS) {
      a.push({
        key: `a-${acc.id}`,
        label: acc.name,
        icon: "users",
        action: () => go(`/a/${acc.id}`),
        group: "Accounts",
      });
    }
    for (const d of DEALS) {
      a.push({
        key: `d-${d.id}`,
        label: d.name,
        icon: "target",
        action: () => go(`/d/${d.id}`),
        group: "Deals",
      });
    }
    for (const p of PEOPLE) {
      a.push({
        key: `p-${p.id}`,
        label: p.name,
        icon: "user",
        action: () => go(`/p/${p.id}`),
        group: "People",
      });
    }
    for (const m of MOVES) {
      a.push({
        key: `m-${m.id}`,
        label: `Move ${m.g} · ${m.action.slice(0, 60)}`,
        icon: "bolt",
        action: () => go(`/m/${m.id}`),
        group: "Moves",
      });
    }
    return a;
  }, [go, ver]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- API context ---- */
  const appApi: AppApi & { ingest: Portfolio["ingest"] } = useMemo(
    () => ({
      openSource: (id) => setDrawer(id),
      openComposer: (p) => setComposer(p ?? {}),
      openPalette: (q) => setPalette(q ?? ""),
      go,
      copy,
      notes,
      addNote,
      read: noteRead,
      markRead,
      countdown,
      ingest: (portfolio as unknown as Portfolio)?.ingest ?? [],
    }),
    [go, copy, notes, addNote, noteRead, markRead, countdown, portfolio, ver], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ---- render page ---- */
  const { route, id, sub } = parsePath(path);

  function page() {
    if (!ready) return <PageSkeleton />;
    switch (route) {
      case "":
        return <Monday />;
      case "a":
        return <AccountScreen id={id} />;
      case "d":
        return <DealScreen id={id} />;
      case "p":
        return <PersonScreen id={id} />;
      case "m":
        return <MoveScreen id={id} />;
      case "risks":
        return <RisksScreen lane={id} />;
      case "why":
        return <WhyScreen acct={id} />;
      case "signals":
        return id ? <LinkScreen id={id} /> : <SignalsScreen />;
      case "notes":
        return <NotesScreen />;
      case "data":
        return <DataScreen />;
      default:
        return (
          <div className="py-20 text-center">
            <h1 className="text-[26px] font-light">Page not found</h1>
            <Btn className="mt-4" onClick={() => go("/")}>
              Return to Monday
            </Btn>
          </div>
        );
    }
  }

  return (
    <AppCtx.Provider value={appApi as AppApi}>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* top bar */}
        <header className="flex shrink-0 items-center justify-between border-b border-line bg-white px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={() => go("/")}
            className="flex items-center gap-2 font-medium text-ink hover:text-brand"
          >
            <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-brand text-white">
              <Ico n="target" size={16} />
            </span>
            <span className="hidden sm:block">Account Quest</span>
          </button>

          <div className="flex items-center gap-3">
            <FreshnessBadge
              state={portfolio ? "live" : "stale"}
              text={portfolio ? "live" : "connecting…"}
            />
            <span className="hidden text-[12px] text-mute sm:block">
              {countdown}s
            </span>
            {SNAPSHOTS[0] && (
              <span className="hidden text-[12px] text-mute sm:block">
                · snap {SNAPSHOTS[0].time}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPalette("")}
              aria-label="Quick navigation (⌘K)"
              className="flex h-[32px] items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[12.5px] text-ink2 hover:bg-panel"
            >
              <Ico n="search" size={14} />
              <span className="hidden sm:block">Go to…</span>
              <kbd className="hidden rounded-[4px] border border-line bg-bar px-1 py-[1px] font-mono text-[10px] text-mute sm:block">
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => setComposer({})}
              aria-label="Write a note (⌘N)"
              className="flex h-[32px] w-[32px] items-center justify-center rounded-full border border-brand bg-brand text-white hover:bg-[#3f84d6]"
            >
              <Ico n="plus" size={16} />
            </button>
          </div>
        </header>

        {/* body */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* sidebar */}
          <div className="hidden w-[72px] shrink-0 overflow-y-auto sm:block">
            <Sidebar path={path} go={go} />
          </div>

          {/* main */}
          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
            {page()}
          </main>
        </div>

        {/* mobile bottom nav */}
        <nav className="flex shrink-0 border-t border-line bg-white sm:hidden" aria-label="Mobile navigation">
          {[
            { icon: "home", label: "Monday", path: "/" },
            { icon: "users", label: "Accounts", path: "/a/A" },
            { icon: "alert", label: "Risks", path: "/risks" },
            { icon: "signal", label: "Signals", path: "/signals" },
            { icon: "note", label: "Notes", path: "/notes" },
          ].map((item) => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              active={path === item.path || (item.path !== "/" && path.startsWith(item.path))}
              onClick={() => go(item.path)}
            />
          ))}
        </nav>
      </div>

      {/* overlays */}
      {drawer && <Drawer id={drawer} onClose={() => setDrawer(null)} />}
      {palette !== null && (
        <Palette
          query={palette}
          actions={paletteActions}
          onClose={() => setPalette(null)}
        />
      )}
      {composer && <Composer preset={composer} onClose={() => setComposer(null)} />}
    </AppCtx.Provider>
  );
}

/* ================================================================ export == */

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <AppShell />
    </ConvexProvider>
  );
}
