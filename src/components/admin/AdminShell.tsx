import { DRAG_STRIP, useDragScroll } from "@/hooks/use-drag-scroll";
import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarDays, LogOut, Scissors, Settings, Smartphone, UserRound, Users } from "lucide-react";
import { Wordmark } from "@/components/brand/Brand";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/format";

const NAV = [
  { to: "/empresa", label: "Agenda", icon: CalendarDays, exact: true },
  { to: "/empresa/servicos", label: "Serviços", icon: Scissors },
  { to: "/empresa/profissionais", label: "Profissionais", icon: Users },
  { to: "/empresa/clientes", label: "Clientes", icon: UserRound },
  { to: "/empresa/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/empresa/configuracoes", label: "Configurações", icon: Settings },
] as const;

const itemClass =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:font-semibold data-[status=active]:text-sidebar-primary-foreground";

export function AdminShell({ children, userName }: { children: ReactNode; userName: string }) {
  const navStrip = useDragScroll<HTMLElement>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function logout() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-canvas md:flex md:p-4 md:gap-0">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar p-4 md:sticky md:top-4 md:flex md:h-[calc(100vh-2rem)] md:rounded-l-3xl">
        <Link to="/empresa" className="px-2 py-2">
          <Wordmark inverted className="text-xl" />
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <Link key={to} to={to} activeOptions={{ exact: "exact" in rest, includeSearch: false }} className={itemClass}>
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
          <Link to="/" className={itemClass + " mt-auto"}>
            <Smartphone className="size-4" />
            Ver app do cliente
          </Link>
        </nav>
        <div className="mt-3 flex items-center gap-3 border-t border-sidebar-border px-1 pt-4">
          <span className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
            {initials(userName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-accent-foreground">{userName}</p>
            <p className="text-[11px] text-sidebar-foreground/60">Administrador</p>
          </div>
          <button type="button" onClick={logout} aria-label="Sair" className="rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 bg-sidebar md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Wordmark inverted className="text-lg" />
          <button type="button" onClick={logout} aria-label="Sair" className="rounded-lg p-2 text-sidebar-foreground/70">
            <LogOut className="size-4" />
          </button>
        </div>
        <nav {...navStrip} className={`${DRAG_STRIP} flex gap-1 px-3 pb-3`}>
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <Link key={to} to={to} activeOptions={{ exact: "exact" in rest, includeSearch: false }} draggable={false} className={itemClass + " shrink-0 py-2"}>
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <main className="min-w-0 flex-1 bg-background p-5 md:rounded-r-3xl md:p-8 md:shadow-card">{children}</main>
    </div>
  );
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
