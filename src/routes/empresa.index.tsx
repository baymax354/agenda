import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/AdminShell";
import { dbError, Field, selectClass } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { professionalsQuery, servicesQuery, settingsQuery, STATUS_LABEL, type AppointmentStatus } from "@/lib/queries";
import { addDays, businessDate, zonedToUtc } from "@/lib/booking-time";
import { formatFullDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Search = { data?: string };

export const Route = createFileRoute("/empresa/")({
  validateSearch: (s: Record<string, unknown>): Search =>
    typeof s["data"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s["data"]) ? { data: s["data"] } : {},
  head: () => ({
    meta: [
      { title: "Agenda da equipe — AgendaMais" },
      { name: "description", content: "Veja e gerencie os agendamentos do dia da sua equipe." },
      { property: "og:title", content: "Agenda da equipe — AgendaMais" },
      { property: "og:description", content: "Agenda do dia da sua equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  concluido: "bg-success-soft text-success",
  em_andamento: "bg-primary text-primary-foreground",
  agendado: "bg-info-soft text-info",
  cancelado: "bg-muted text-muted-foreground",
};

function AgendaPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/empresa/" });
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const tz = settings?.timezone ?? "America/Sao_Paulo";
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(businessDate(new Date(), tz)), [tz]);
  const day = search.data ?? today;
  const [newOpen, setNewOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const appts = useQuery({
    queryKey: ["admin-appointments", day],
    enabled: !!day,
    queryFn: async () => {
      const from = zonedToUtc(day!, "00:00", tz).toISOString();
      const to = zonedToUtc(addDays(day!, 1), "00:00", tz).toISOString();
      const { data, error } = await supabase
        .from("appointments")
        .select("id, client_name, client_phone, starts_at, status, services(name), professionals(name)")
        .gte("starts_at", from)
        .lt("starts_at", to)
        .order("starts_at");
      if (error) throw error;
      return data;
    },
  });

  const blocks = useQuery({
    queryKey: ["admin-timeoff", day],
    enabled: !!day,
    queryFn: async () => {
      const from = zonedToUtc(day!, "00:00", tz).toISOString();
      const to = zonedToUtc(addDays(day!, 1), "00:00", tz).toISOString();
      const { data, error } = await supabase
        .from("time_off")
        .select("id, starts_at, ends_at, reason, professionals(name)")
        .lt("starts_at", to)
        .gt("ends_at", from)
        .order("starts_at");
      if (error) throw error;
      return data;
    },
  });

  async function setStatus(id: string, status: AppointmentStatus) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error(dbError(error)); return; }
    toast.success(`Status: ${STATUS_LABEL[status]}`);
    qc.invalidateQueries({ queryKey: ["admin-appointments"] });
  }

  async function removeBlock(id: string) {
    const { error } = await supabase.from("time_off").delete().eq("id", id);
    if (error) { toast.error(dbError(error)); return; }
    toast.success("Horário liberado");
    qc.invalidateQueries({ queryKey: ["admin-timeoff"] });
  }

  const go = (d: string) => navigate({ search: { data: d } });

  return (
    <>
      <PageHeader
        title="Agenda da equipe"
        actions={
          <>
            <Button variant="outline" onClick={() => setBlockOpen(true)}>
              <Ban /> Bloquear horário
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus /> Novo agendamento
            </Button>
          </>
        }
      />

      <div className="mb-5 flex items-center gap-3">
        <Button variant="outline" size="icon" aria-label="Dia anterior" onClick={() => day && go(addDays(day, -1))}>
          <ChevronLeft />
        </Button>
        <span className="min-w-44 text-center text-base font-semibold">{day ? formatFullDate(day) : "—"}</span>
        <Button variant="outline" size="icon" aria-label="Próximo dia" onClick={() => day && go(addDays(day, 1))}>
          <ChevronRight />
        </Button>
        <Button variant="outline" className="ml-auto" onClick={() => today && go(today)}>
          Hoje
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted text-left text-xs font-semibold text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Horário</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3">Profissional</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {appts.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {appts.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum agendamento neste dia.
                </td>
              </tr>
            )}
            {appts.data?.map((a) => (
              <tr key={a.id} className={cn("border-t", a.status === "cancelado" && "opacity-60")}>
                <td className="px-4 py-3 font-semibold">{formatTime(a.starts_at, tz)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{a.client_name}</p>
                  {a.client_phone && <p className="text-xs text-muted-foreground">{a.client_phone}</p>}
                </td>
                <td className="px-4 py-3">{a.services?.name}</td>
                <td className="px-4 py-3">{a.professionals?.name}</td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`Status de ${a.client_name}`}
                    value={a.status}
                    onChange={(e) => setStatus(a.id, e.target.value as AppointmentStatus)}
                    className={cn(
                      "cursor-pointer rounded-md border-0 px-2.5 py-1 text-xs font-semibold outline-none",
                      STATUS_STYLE[a.status],
                    )}
                  >
                    {(Object.keys(STATUS_LABEL) as AppointmentStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!!blocks.data?.length && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold">Horários bloqueados</h2>
          <ul className="space-y-2">
            {blocks.data.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-2.5 text-sm">
                <Ban className="size-4 text-muted-foreground" />
                <span className="font-semibold">
                  {formatTime(b.starts_at, tz)} – {formatTime(b.ends_at, tz)}
                </span>
                <span className="text-muted-foreground">{b.professionals?.name ?? "Toda a equipe"}</span>
                {b.reason && <span className="text-muted-foreground">· {b.reason}</span>}
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => removeBlock(b.id)}>
                  <Trash2 /> Liberar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {day && <NewAppointmentDialog open={newOpen} onOpenChange={setNewOpen} day={day} tz={tz} />}
      {day && <BlockDialog open={blockOpen} onOpenChange={setBlockOpen} day={day} tz={tz} />}
    </>
  );
}

function NewAppointmentDialog({
  open,
  onOpenChange,
  day,
  tz,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  day: string;
  tz: string;
}) {
  const qc = useQueryClient();
  const { data: services } = useQuery(servicesQuery);
  const { data: pros } = useQuery(professionalsQuery);
  const [f, setF] = useState({ name: "", phone: "", service: "", pro: "", date: day, time: "09:00" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setF((x) => ({ ...x, date: day })), [day]);
  const service = services?.find((s) => s.id === f.service);
  const eligible = (pros ?? []).filter((p) => p.active && (!service || p.categories.includes(service.category)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!service || !f.pro || f.name.trim().length < 2) { toast.error("Preencha cliente, serviço e profissional"); return; }
    setBusy(true);
    const start = zonedToUtc(f.date, f.time, tz);
    const { error } = await supabase.from("appointments").insert({
      client_name: f.name.trim().slice(0, 120),
      client_phone: f.phone.trim().slice(0, 30),
      service_id: service.id,
      professional_id: f.pro,
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + service.duration_min * 60000).toISOString(),
      price: service.price,
    });
    setBusy(false);
    if (error) { toast.error(dbError(error)); return; }
    toast.success("Agendamento criado");
    qc.invalidateQueries({ queryKey: ["admin-appointments"] });
    setF({ name: "", phone: "", service: "", pro: "", date: day, time: "09:00" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Field label="Cliente" className="col-span-2">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </Field>
          <Field label="Telefone" className="col-span-2">
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
          <Field label="Serviço" className="col-span-2">
            <select className={selectClass} value={f.service} onChange={(e) => setF({ ...f, service: e.target.value, pro: "" })} required>
              <option value="">Selecione</option>
              {services?.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration_min} min
                </option>
              ))}
            </select>
          </Field>
          <Field label="Profissional" className="col-span-2">
            <select className={selectClass} value={f.pro} onChange={(e) => setF({ ...f, pro: e.target.value })} required>
              <option value="">Selecione</option>
              {eligible.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.role}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data">
            <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required />
          </Field>
          <Field label="Horário">
            <Input type="time" step={300} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} required />
          </Field>
          <Button type="submit" className="col-span-2" size="lg" disabled={busy}>
            Salvar agendamento
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BlockDialog({
  open,
  onOpenChange,
  day,
  tz,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  day: string;
  tz: string;
}) {
  const qc = useQueryClient();
  const { data: pros } = useQuery(professionalsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const [f, setF] = useState({ pro: "", date: day, start: "12:00", end: "13:00", reason: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setF((x) => ({ ...x, date: day })), [day]);

  function wholeDay() {
    if (!settings) return;
    setF((x) => ({ ...x, start: settings.open_time.slice(0, 5), end: settings.close_time.slice(0, 5) }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (f.end <= f.start) { toast.error("O fim precisa ser depois do início"); return; }
    setBusy(true);
    const { error } = await supabase.from("time_off").insert({
      professional_id: f.pro || null,
      starts_at: zonedToUtc(f.date, f.start, tz).toISOString(),
      ends_at: zonedToUtc(f.date, f.end, tz).toISOString(),
      reason: f.reason.trim().slice(0, 120),
    });
    setBusy(false);
    if (error) { toast.error(dbError(error)); return; }
    toast.success("Horário bloqueado. Clientes não poderão agendar nesse período.");
    qc.invalidateQueries({ queryKey: ["admin-timeoff"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-muted-foreground">
          Agendamentos já marcados continuam valendo; apenas novos horários ficam indisponíveis.
        </p>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Field label="Quem" className="col-span-2">
            <select className={selectClass} value={f.pro} onChange={(e) => setF({ ...f, pro: e.target.value })}>
              <option value="">Toda a equipe (fechar o salão)</option>
              {pros?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data" className="col-span-2">
            <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required />
          </Field>
          <Field label="Início">
            <Input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} required />
          </Field>
          <Field label="Fim">
            <Input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} required />
          </Field>
          <button type="button" onClick={wholeDay} className="col-span-2 -mt-2 text-left text-xs font-semibold text-muted-foreground hover:text-foreground">
            Bloquear o dia inteiro
          </button>
          <Field label="Motivo (opcional)" className="col-span-2">
            <Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Folga, feriado, almoço..." />
          </Field>
          <Button type="submit" className="col-span-2" size="lg" disabled={busy}>
            Bloquear
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
