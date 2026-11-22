import { useEffect, useMemo, useState } from "react";
import { photoSrc } from "@/lib/site-url";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { AppShell, BackButton, ScreenHeader, Stepper } from "@/components/client/AppShell";
import { Rating } from "@/components/Rating";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { professionalsQuery, servicesQuery, settingsQuery } from "@/lib/queries";
import { addDays, buildSlots, businessDate, upcomingOpenDays, zonedToUtc } from "@/lib/booking-time";
import { formatDayMonth, formatMoney, formatWeekdayShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agendar/$serviceId")({
  head: () => ({
    meta: [
      { title: "Profissional e horário — AgendaMais" },
      { name: "description", content: "Escolha o profissional e o melhor horário para o seu atendimento." },
      { property: "og:title", content: "Profissional e horário — AgendaMais" },
      { property: "og:description", content: "Escolha o profissional e o horário do seu atendimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PickPage,
});

function PickPage() {
  const { serviceId } = Route.useParams();
  const navigate = useNavigate();
  const { data: services } = useQuery(servicesQuery);
  const { data: pros } = useQuery(professionalsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const service = services?.find((s) => s.id === serviceId);
  const eligible = useMemo(
    () => (pros ?? []).filter((p) => p.active && service && p.categories.includes(service.category)),
    [pros, service],
  );

  const [proId, setProId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => setNow(new Date()), []);
  useEffect(() => {
    if (!proId && eligible[0]) setProId(eligible[0].id);
  }, [eligible, proId]);

  const today = settings && now ? businessDate(now, settings.timezone) : null;
  const days = settings && today ? upcomingOpenDays(today, settings, 14) : [];
  const activeDay = day ?? days[0] ?? null;

  const busy = useQuery({
    queryKey: ["busy", proId, activeDay],
    enabled: !!proId && !!activeDay && !!settings,
    queryFn: async () => {
      const from = zonedToUtc(activeDay!, "00:00", settings!.timezone).toISOString();
      const to = zonedToUtc(addDays(activeDay!, 1), "00:00", settings!.timezone).toISOString();
      const { data, error } = await supabase.rpc("get_busy_slots", {
        _professional_id: proId!,
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return data;
    },
  });

  const slots =
    settings && service && activeDay && now && busy.data
      ? buildSlots({ date: activeDay, hours: settings, durationMin: service.duration_min, busy: busy.data, now })
      : [];

  const step = slot ? 2 : 1;

  if (services && !service) {
    return (
      <AppShell>
        <ScreenHeader title="Profissional e horário" back={<BackButton />} />
        <p className="px-6 py-16 text-center text-sm text-muted-foreground">
          Este serviço não está mais disponível.{" "}
          <Link to="/servicos" className="font-semibold text-foreground underline">
            Ver serviços
          </Link>
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      nav={false}
      footer={
        <Button
          variant="cta"
          size="xl"
          className="w-full"
          disabled={!slot || !proId}
          onClick={() =>
            navigate({
              to: "/confirmar",
              search: { servico: serviceId, profissional: proId!, horario: slot! },
            })
          }
        >
          Continuar
        </Button>
      }
    >
      <ScreenHeader title="Profissional e horário" back={<BackButton />} />
      <Stepper steps={["Serviço", "Profissional", "Horário"]} current={step} />

      {service && (
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-muted p-2.5">
          {service.image_url && <img src={photoSrc(service.image_url)} alt="" className="size-12 rounded-xl object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{service.name}</p>
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" /> {service.duration_min} min
            </p>
          </div>
          <span className="pr-2 text-sm font-bold">{formatMoney(service.price)}</span>
        </div>
      )}

      <section className="mt-5">
        <h2 className="px-5 text-base font-bold">Escolha o profissional</h2>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
          {eligible.length === 0 && pros && (
            <p className="text-sm text-muted-foreground">Nenhum profissional disponível para este serviço.</p>
          )}
          {eligible.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setProId(p.id);
                setSlot(null);
              }}
              className="flex w-[4.75rem] shrink-0 flex-col items-center text-center"
            >
              <span
                className={cn(
                  "rounded-full p-[3px] transition-all",
                  proId === p.id ? "bg-primary" : "bg-transparent",
                )}
              >
                {p.photo_url ? (
                  <img src={photoSrc(p.photo_url)} alt={p.name} className="size-16 rounded-full border-2 border-background object-cover" />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-full border-2 border-background bg-muted font-bold">
                    {p.name[0]}
                  </span>
                )}
              </span>
              <span className="mt-1.5 w-full truncate text-xs font-bold">{p.name}</span>
              <span className="w-full truncate text-[11px] text-muted-foreground">{p.role}</span>
              <Rating value={p.rating} />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 px-5 pb-6">
        <h2 className="text-base font-bold">Escolha o horário</h2>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          {days.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDay(d);
                setSlot(null);
              }}
              className={cn(
                "w-[4.4rem] shrink-0 rounded-xl border py-2 text-center text-xs leading-tight transition-colors",
                activeDay === d ? "border-primary bg-primary font-bold text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              <span className="block font-semibold">
                {d === today ? "Hoje" : d === addDays(today ?? "", 1) && i <= 1 ? "Amanhã" : formatWeekdayShort(d)}
              </span>
              <span className="block">{formatDayMonth(d)}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {busy.isLoading &&
            Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-muted" />)}
          {slots.map((s) => (
            <button
              key={s.iso}
              type="button"
              disabled={!s.available}
              onClick={() => setSlot(s.iso)}
              className={cn(
                "h-11 rounded-xl border text-sm font-semibold transition-colors",
                slot === s.iso && "border-primary bg-primary text-primary-foreground",
                slot !== s.iso && s.available && "bg-background hover:bg-muted",
                !s.available && "cursor-not-allowed bg-muted text-muted-foreground/60 line-through",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {!busy.isLoading && busy.data && slots.length > 0 && !slots.some((s) => s.available) && (
          <p className="mt-4 text-center text-sm text-muted-foreground">Sem horários livres neste dia. Tente outro dia.</p>
        )}
      </section>
    </AppShell>
  );
}
