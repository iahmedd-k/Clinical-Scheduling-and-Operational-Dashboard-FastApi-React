import { useEffect, useState } from "react";
import {
  HeartPulse,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  RefreshCw,
  Search,
  Users,
  CalendarDays,
  ClipboardList,
  BarChart3,
  UserRound,
} from "lucide-react";
import { NAV } from "../lib/workspace";
import { StatusPill } from "./ui";
import { SearchModal } from "./SearchModal";

const NAV_ICONS = {
  Overview: Home,
  Appointments: CalendarDays,
  History: ClipboardList,
  Profile: UserRound,
  Schedule: CalendarDays,
  Services: ClipboardList,
  Visits: ClipboardList,
  Desk: ClipboardList,
  Patients: Users,
  Operations: BarChart3,
  Catalog: ClipboardList,
  Analytics: BarChart3,
  Staff: Users,
};

export function AppShell({
  role,
  session,
  data,
  onAction,
  load,
  active,
  setActive,
  onLogout,
  onRefresh,
  loading,
  loadError,
  healthStatus,
  mobileNavOpen,
  setMobileNavOpen,
  onOpenAssistant,
  children,
}) {
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const nav = NAV[role] || NAV.patient;
  const roleLabel = role.replace("_", " ");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="dashboard-shell dashboard-bg h-[100dvh] overflow-hidden text-slate-900">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[84px] border-r border-white/70 bg-[#f0f5f4] px-2.5 py-3 transition-transform lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col items-center">
          <div className="mt-1 grid h-12 w-12 place-items-center rounded-[16px] bg-[#8ccfc1] text-white">
            <HeartPulse size={22} />
          </div>
          <nav className="flex flex-1 flex-col items-center justify-center gap-3">
            {nav.map((label) => {
              const selected = active === label;
              const Icon = NAV_ICONS[label] || Home;
              return (
                <button
                  key={label}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => {
                    setActive(label);
                    setMobileNavOpen(false);
                  }}
                  className={`grid h-11 w-11 place-items-center rounded-[16px] border transition ${
                    selected
                      ? "border-[#8ccfc1] bg-white text-[#0f766e] shadow-sm"
                      : "border-transparent text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-700"
                  }`}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={onLogout}
            className="mb-1 grid h-11 w-11 place-items-center rounded-[16px] border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="h-full lg:pl-[84px]">
        <header className="flex h-[60px] items-center justify-between gap-3 border-b border-white/70 bg-white/80 px-4 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-[14px] border border-slate-200 bg-white p-2 text-slate-700 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0f766e]">{roleLabel}</p>
              <h1 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-slate-950">{active}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill value={healthStatus === "ready" ? "Ready" : "Check"} tone={healthStatus === "ready" ? "success" : "warning"} />
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              title="Quick Search (Ctrl+K)"
            >
              <Search size={14} className="text-slate-400" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 md:inline-block">
                ⌘K
              </kbd>
            </button>
            <button type="button" onClick={onOpenAssistant} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
              <MessageCircle size={14} />
              <span className="hidden sm:inline">Assistant</span>
            </button>
            <button type="button" onClick={onRefresh} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        <main className={`dashboard-main relative h-[calc(100dvh-60px)] overflow-hidden ${active === "Overview" ? "" : "dashboard-main--compact"}`}>
          {loadError ? (
            <div className="absolute inset-x-4 top-3 z-20 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800 shadow-sm">
              {loadError}
            </div>
          ) : null}
          <div className={`h-full min-h-0 overflow-hidden ${active === "Overview" ? "p-3" : "p-3 sm:p-4"}`}>{children}</div>
        </main>
      </div>

      {mobileNavOpen ? (
        <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" />
      ) : null}

      <SearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        role={role}
        session={session}
        data={data}
        onAction={onAction}
        load={load}
        setActive={setActive}
      />
    </div>
  );
}
