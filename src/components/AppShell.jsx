import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  CalendarRange,
  Home,
  Users,
  CalendarClock,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ShellProvider } from "../context/ShellProvider";
import SidebarBackupActions from "./SidebarBackupActions";
import BackupExportReminder from "./BackupExportReminder";

const SIDEBAR_COLLAPSED_KEY = "easyscale:sidebar-collapsed";

const NAV_ITEMS = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/equipe", label: "Equipe", icon: Users },
  { to: "/escalas", label: "Escalas", icon: CalendarClock },
  { to: "/semana", label: "Escala da semana", icon: CalendarRange },
  { to: "/mes", label: "Escala do mês", icon: CalendarDays },
  { to: "/configuracoes", label: "Ajustes", icon: Settings2 },
];

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export default function AppShell({ children, exportBackup, importBackup }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // localStorage indisponível
      }
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base text-ink">
      <BackupExportReminder exportBackup={exportBackup} />

      {/* Sidebar - desktop */}
      <aside
        className={`hidden h-full shrink-0 flex-col overflow-hidden border-r border-border-soft bg-surface py-6 transition-[width,padding] duration-200 ease-out md:flex ${
          sidebarCollapsed ? "w-18 px-2" : "w-60 px-4"
        }`}
      >
        <Brand compact={sidebarCollapsed} />

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        <SidebarBackupActions
          collapsed={sidebarCollapsed}
          exportBackup={exportBackup}
          importBackup={importBackup}
        />

        <div className={`mt-4 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
          <button
            type="button"
            onClick={toggleSidebar}
            className={`flex items-center rounded-lg text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink ${
              sidebarCollapsed ? "h-9 w-9 justify-center" : "w-full gap-3 px-3 py-2.5 text-[13px]"
            }`}
            aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={2} />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                <span>Recolher menu</span>
              </>
            )}
          </button>
        </div>

        {!sidebarCollapsed && <Footer />}
      </aside>

      {/* Main content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Topbar - mobile */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border-soft bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <Brand compact />
        </header>

        <main
          className={`flex-1 px-4 py-6 pb-24 transition-[padding] duration-200 ease-out md:py-10 md:pb-10 ${
            sidebarCollapsed ? "md:px-6 lg:px-8" : "md:px-8 lg:px-10"
          }`}
        >
          <ShellProvider sidebarCollapsed={sidebarCollapsed}>{children}</ShellProvider>
        </main>

        {/* Bottom nav - mobile */}
        <nav className="sticky bottom-0 z-20 flex border-t border-border-soft bg-surface/95 backdrop-blur md:hidden">
          {NAV_ITEMS.map((item) => (
            <MobileLink key={item.to} {...item} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function Brand({ compact }) {
  return (
    <div className={`flex items-center ${compact ? "justify-center px-0" : "gap-2.5 px-2"}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-[15px] font-bold text-base">
        ES
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight text-ink">EasyScale</p>
          <p className="truncate text-[11px] leading-tight text-ink-faint">Escalas simples</p>
        </div>
      )}
    </div>
  );
}

function SidebarLink({ to, label, icon: Icon, end, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          "flex items-center rounded-lg py-2.5 text-[14px] font-medium transition-colors",
          collapsed ? "justify-center px-2" : "gap-3 px-3",
          isActive
            ? "bg-surface-3 text-ink"
            : "text-ink-soft hover:bg-surface-2 hover:text-ink",
        ].join(" ")
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

function MobileLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
          isActive ? "text-brand" : "text-ink-faint",
        ].join(" ")
      }
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
      {label}
    </NavLink>
  );
}

function Footer() {
  return (
    <p className="mt-4 px-2 text-[11px] leading-snug text-ink-faint">
      Tudo salvo neste dispositivo.
      <br />
      Funciona offline.
    </p>
  );
}
