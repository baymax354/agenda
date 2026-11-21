import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, CircleCheck, Heart, Home, Scissors, User } from "lucide-react";
import { BrandIcon, Wordmark } from "@/components/brand/Brand";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/servicos", label: "Serviços", icon: Scissors },
  { to: "/agendamentos", label: "Agendamentos", icon: CalendarDays },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell({
  children,
  nav = true,
  footer,
}: {
  children: ReactNode;
  nav?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:flex lg:items-center lg:justify-center lg:gap-20 lg:p-8">
      <BrandPanel />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-background lg:mx-0 lg:h-[min(880px,calc(100vh-4rem))] lg:min-h-0 lg:overflow-hidden lg:rounded-[2.5rem] lg:shadow-phone">
        <main className="flex-1 lg:overflow-y-auto lg:no-scrollbar">{children}</main>
        {footer && (
          <div className="sticky bottom-0 z-10 border-t bg-background/95 px-5 py-4 backdrop-blur">{footer}</div>
        )}
        {nav && <BottomNav />}
      </div>
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="group flex flex-col items-center gap-1 py-1 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary"
        >
          <Icon className="size-5" strokeWidth={2.2} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

const STEPS = [
  { icon: CalendarDays, label: "Escolha" },
  { icon: User, label: "Agende" },
  { icon: CircleCheck, label: "Confirme" },
  { icon: Heart, label: "Cuide de você" },
];

function BrandPanel() {
  return (
    <aside className="hidden max-w-sm flex-col lg:flex">
      <BrandIcon />
      <Wordmark className="mt-6 text-5xl" />
      <p className="mt-3 text-2xl leading-snug text-foreground/80">
        Beleza e bem-estar
        <br />
        na sua rotina
      </p>
      <div className="my-8 h-px w-14 bg-foreground/20" />
      <p className="text-lg leading-relaxed text-muted-foreground">
        Agende serviços de salão e barbearia de forma simples, rápida e segura.
      </p>
      <div className="mt-12 flex gap-8">
        {STEPS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <Icon className="size-7 text-foreground" strokeWidth={1.8} />
            {label}
          </div>
        ))}
      </div>
      <Link
        to="/empresa"
        className="mt-14 inline-flex w-fit items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold shadow-card hover:bg-muted"
      >
        Sou empresa · Abrir painel
      </Link>
    </aside>
  );
}

export function ScreenHeader({
  title,
  back,
  right,
}: {
  title: string;
  back?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 grid grid-cols-[2.5rem_1fr_2.5rem] items-center bg-background/95 px-4 pb-3 pt-5 backdrop-blur">
      <div>{back}</div>
      <h1 className="text-center text-xl font-bold">{title}</h1>
      <div className="flex justify-end">{right}</div>
    </header>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="px-6 pb-2 pt-1">
      <div className="relative flex justify-between">
        <div className="absolute left-[8%] right-[8%] top-3 h-0.5 bg-muted" />
        <div
          className="absolute left-[8%] top-3 h-0.5 bg-primary transition-all"
          style={{ width: `${(Math.min(current, steps.length - 1) / (steps.length - 1)) * 84}%` }}
        />
        {steps.map((s, i) => (
          <div key={s} className="relative z-[1] flex w-20 flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border-2",
                i < current && "border-primary bg-primary text-primary-foreground",
                i === current && "border-primary bg-primary ring-4 ring-primary-soft",
                i > current && "border-muted bg-muted",
              )}
            >
              {i < current && (
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" }))}
      className="-ml-2 rounded-full p-2 hover:bg-muted"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
