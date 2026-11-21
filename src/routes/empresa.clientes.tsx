import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatLongDate, formatMoney, initials } from "@/lib/format";

export const Route = createFileRoute("/empresa/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Painel AgendaMais" },
      { name: "description", content: "Lista de clientes com visitas e valor gasto." },
      { property: "og:title", content: "Clientes — Painel AgendaMais" },
      { property: "og:description", content: "Lista de clientes do seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminClients,
});

type Row = { key: string; name: string; phone: string; email: string; visits: number; spent: number; last: string | null; account: boolean };

function AdminClients() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const [profiles, appts] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, email"),
        supabase.from("appointments").select("customer_id, client_name, client_phone, starts_at, price, status").order("starts_at"),
      ]);
      if (profiles.error) throw profiles.error;
      if (appts.error) throw appts.error;
      const map = new Map<string, Row>();
      for (const p of profiles.data) {
        map.set(p.id, { key: p.id, name: p.full_name || p.email, phone: p.phone, email: p.email, visits: 0, spent: 0, last: null, account: true });
      }
      for (const a of appts.data) {
        const key = a.customer_id ?? (a.client_phone || a.client_name).toLowerCase();
        const row =
          map.get(key) ??
          ({ key, name: a.client_name, phone: a.client_phone, email: "", visits: 0, spent: 0, last: null, account: false } as Row);
        if (a.status !== "cancelado") {
          row.visits += 1;
          row.last = a.starts_at;
        }
        if (a.status === "concluido") row.spent += Number(a.price);
        map.set(key, row);
      }
      return [...map.values()].sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
    },
  });

  const list = (data ?? []).filter(
    (r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.phone.includes(q) || r.email.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Clientes"
        actions={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente..." className="w-60 bg-muted pl-9" />
          </div>
        }
      />
      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted text-left text-xs font-semibold text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Visitas</th>
              <th className="px-4 py-3">Última visita</th>
              <th className="px-4 py-3 text-right">Total gasto</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {list.map((r) => (
              <tr key={r.key} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-xs font-bold">{initials(r.name)}</span>
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.account ? "Com conta no app" : "Cadastro pela agenda"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  <p>{r.phone || "—"}</p>
                  {r.email && <p className="text-muted-foreground">{r.email}</p>}
                </td>
                <td className="px-4 py-3 font-semibold">{r.visits}</td>
                <td className="px-4 py-3 text-xs">{r.last ? formatLongDate(r.last) : "—"}</td>
                <td className="px-4 py-3 text-right font-bold">{formatMoney(r.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
