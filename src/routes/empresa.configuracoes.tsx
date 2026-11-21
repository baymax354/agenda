import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/AdminShell";
import { dbError, Field, selectClass } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/empresa/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Painel AgendaMais" },
      { name: "description", content: "Nome, endereço e horário de funcionamento do negócio." },
      { property: "og:title", content: "Configurações — Painel AgendaMais" },
      { property: "og:description", content: "Configure o seu negócio no AgendaMais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [f, setF] = useState({ name: "", address: "", city: "", open_time: "09:00", close_time: "18:00", slot_minutes: 60, closed: [0] as number[] });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data)
      setF({
        name: data.name,
        address: data.address,
        city: data.city,
        open_time: data.open_time.slice(0, 5),
        close_time: data.close_time.slice(0, 5),
        slot_minutes: data.slot_minutes,
        closed: data.closed_weekdays,
      });
  }, [data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (f.close_time <= f.open_time) { toast.error("O fechamento precisa ser depois da abertura"); return; }
    if (f.closed.length === 7) { toast.error("Deixe pelo menos um dia aberto"); return; }
    setBusy(true);
    const { error } = await supabase
      .from("business_settings")
      .update({
        name: f.name.trim().slice(0, 100),
        address: f.address.trim().slice(0, 200),
        city: f.city.trim().slice(0, 60),
        open_time: f.open_time,
        close_time: f.close_time,
        slot_minutes: f.slot_minutes,
        closed_weekdays: f.closed,
      })
      .eq("id", 1);
    setBusy(false);
    if (error) { toast.error(dbError(error)); return; }
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }

  return (
    <>
      <PageHeader title="Configurações" />
      <form onSubmit={save} className="grid max-w-2xl gap-6">
        <section className="grid gap-4 rounded-2xl border p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Seu negócio</h2>
          <Field label="Nome da unidade" className="sm:col-span-2">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </Field>
          <Field label="Endereço" className="sm:col-span-2">
            <Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} required />
          </Field>
          <Field label="Cidade (aparece no app)">
            <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} required />
          </Field>
        </section>
        <section className="grid gap-4 rounded-2xl border p-5 sm:grid-cols-3">
          <h2 className="font-bold sm:col-span-3">Horário de funcionamento</h2>
          <Field label="Abre às">
            <Input type="time" value={f.open_time} onChange={(e) => setF({ ...f, open_time: e.target.value })} required />
          </Field>
          <Field label="Fecha às">
            <Input type="time" value={f.close_time} onChange={(e) => setF({ ...f, close_time: e.target.value })} required />
          </Field>
          <Field label="Intervalo entre horários">
            <select className={selectClass} value={f.slot_minutes} onChange={(e) => setF({ ...f, slot_minutes: Number(e.target.value) })}>
              {[15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minutos
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dias fechados" className="sm:col-span-3">
            <div className="flex flex-wrap gap-4 pt-1">
              {WEEKDAYS.map((w, i) => (
                <label key={w} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={f.closed.includes(i)}
                    onCheckedChange={(v) => setF({ ...f, closed: v ? [...f.closed, i].sort() : f.closed.filter((x) => x !== i) })}
                  />
                  {w}
                </label>
              ))}
            </div>
          </Field>
        </section>
        <Button type="submit" size="lg" className="w-fit" disabled={busy}>
          Salvar configurações
        </Button>
      </form>
    </>
  );
}
