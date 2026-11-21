import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarDays, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/admin/AdminShell";
import { selectClass } from "@/components/admin/fields";
import { supabase } from "@/integrations/supabase/client";
import { addDays, businessDate, zonedToUtc } from "@/lib/booking-time";
import { formatMoney, formatWeekdayShort, TZ } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/empresa/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Painel AgendaMais" },
      { name: "description", content: "Receita, agendamentos, novos clientes e ticket médio." },
      { property: "og:title", content: "Relatórios — Painel AgendaMais" },
      { property: "og:description", content: "Acompanhe os resultados do seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const [range, setRange] = useState(7);
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(businessDate(new Date(), TZ)), []);

  const { data } = useQuery({
    queryKey: ["admin-report-appts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("customer_id, client_name, client_phone, starts_at, price, status")
        .order("starts_at");
      if (error) throw error;
      return data;
    },
  });

  if (!today || !data) return <PageHeader title="Relatórios" />;

  const start = addDays(today, -(range - 1));
  const prevStart = addDays(start, -range);
  const dayOf = (iso: string) => businessDate(new Date(iso), TZ);
  const inRange = (d: string, a: string, b: string) => d >= a && d <= b;

  const firstSeen = new Map<string, string>();
  for (const a of data) {
    if (a.status === "cancelado") continue;
    const key = a.customer_id ?? (a.client_phone || a.client_name).toLowerCase();
    if (!firstSeen.has(key)) firstSeen.set(key, dayOf(a.starts_at));
  }

  const done = data.filter((a) => a.status === "concluido");
  const cur = done.filter((a) => inRange(dayOf(a.starts_at), start, today));
  const prev = done.filter((a) => inRange(dayOf(a.starts_at), prevStart, addDays(start, -1)));
  const revenue = cur.reduce((s, a) => s + Number(a.price), 0);
  const prevRevenue = prev.reduce((s, a) => s + Number(a.price), 0);
  const change = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;
  const bookings = data.filter((a) => a.status !== "cancelado" && inRange(dayOf(a.starts_at), start, today)).length;
  const newClients = [...firstSeen.values()].filter((d) => inRange(d, start, today)).length;
  const ticket = cur.length ? revenue / cur.length : 0;

  const chart = Array.from({ length: range }, (_, i) => {
    const d = addDays(start, i);
    return {
      label: range <= 7 ? formatWeekdayShort(d) : d.slice(8, 10) + "/" + d.slice(5, 7),
      valor: cur.filter((a) => dayOf(a.starts_at) === d).reduce((s, a) => s + Number(a.price), 0),
    };
  });

  return (
    <>
      <PageHeader
        title="Relatórios"
        actions={
          <select className={cn(selectClass, "w-40")} value={range} onChange={(e) => setRange(Number(e.target.value))}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
        }
      />
      <section className="rounded-2xl border p-5 shadow-card">
        <p className="text-sm font-semibold">Receita {range === 7 ? "da semana" : "do mês"}</p>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-3xl font-extrabold tracking-tight">{formatMoney(revenue)}</span>
          {change !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold",
                change >= 0 ? "bg-success-soft text-success" : "bg-muted text-destructive",
              )}
            >
              {change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">em relação ao período anterior · somente atendimentos concluídos</p>
        <div className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: -16, right: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                formatter={(v: number) => [formatMoney(v), "Receita"]}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
              />
              <Bar dataKey="valor" fill="var(--chart-bar)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat icon={CalendarDays} value={String(bookings)} label="Agendamentos" />
        <Stat icon={Users} value={String(newClients)} label="Novos clientes" />
        <Stat icon={BarChart3} value={formatMoney(ticket)} label="Ticket médio" />
      </div>
    </>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className="rounded-2xl border p-5 shadow-card">
      <Icon className="size-5" />
      <p className="mt-3 text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
