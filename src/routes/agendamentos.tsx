import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/client/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage, formatLongDate, formatMoney, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agendamentos")({
  head: () => ({
    meta: [
      { title: "Meus agendamentos — AgendaMais" },
      { name: "description", content: "Acompanhe e cancele seus agendamentos." },
      { property: "og:title", content: "Meus agendamentos — AgendaMais" },
      { property: "og:description", content: "Acompanhe e cancele seus agendamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyAppointments,
});

function MyAppointments() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"proximos" | "historico">("proximos");
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);

  const { data, isLoading } = useQuery({
    queryKey: ["my-appointments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, starts_at, status, price, services(name, image_url), professionals(name, role)")
        .eq("customer_id", user!.id)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upcoming = (data ?? [])
    .filter((a) => Date.parse(a.starts_at) >= now && a.status !== "cancelado" && a.status !== "concluido")
    .reverse();
  const history = (data ?? []).filter((a) => !upcoming.includes(a));
  const list = tab === "proximos" ? upcoming : history;

  async function cancel(id: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    const { error } = await supabase.rpc("cancel_my_booking", { _id: id });
    if (error) { toast.error(errorMessage(error)); return; }
    toast.success("Agendamento cancelado");
    qc.invalidateQueries({ queryKey: ["my-appointments"] });
  }

  return (
    <AppShell>
      <ScreenHeader title="Agendamentos" />
      {!loading && !user ? (
        <div className="px-6 py-16 text-center">
          <CalendarDays className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 font-semibold">Entre para ver seus agendamentos</p>
          <Button asChild className="mt-5">
            <Link to="/entrar" search={{ redirect: "/agendamentos" }}>
              Entrar na minha conta
            </Link>
          </Button>
        </div>
      ) : (
        <div className="px-4 pb-6">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["proximos", "historico"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold transition-colors",
                  tab === t ? "bg-background shadow-card" : "text-muted-foreground",
                )}
              >
                {t === "proximos" ? "Próximos" : "Histórico"}
              </button>
            ))}
          </div>
          <ul className="mt-4 space-y-3">
            {isLoading && <li className="h-28 animate-pulse rounded-2xl bg-muted" />}
            {!isLoading && list.length === 0 && (
              <li className="py-12 text-center text-sm text-muted-foreground">
                {tab === "proximos" ? "Você não tem agendamentos futuros." : "Nada por aqui ainda."}
                {tab === "proximos" && (
                  <div className="mt-4">
                    <Button asChild>
                      <Link to="/servicos">Agendar agora</Link>
                    </Button>
                  </div>
                )}
              </li>
            )}
            {list.map((a) => (
              <li key={a.id} className="rounded-2xl border bg-card p-3 shadow-card">
                <div className="flex gap-3">
                  {a.services?.image_url && (
                    <img src={a.services.image_url} alt="" className="size-16 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold">{a.services?.name}</p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="size-3.5" /> {a.professionals?.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" /> {formatLongDate(a.starts_at)} · {formatTime(a.starts_at)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-bold">{formatMoney(a.price)}</span>
                  {a.status === "agendado" && Date.parse(a.starts_at) > now && (
                    <Button variant="soft" size="sm" onClick={() => cancel(a.id)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
