import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, Lock, MapPin, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell, BackButton, ScreenHeader, Stepper } from "@/components/client/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { professionalsQuery, servicesQuery, settingsQuery } from "@/lib/queries";
import { errorMessage, formatLongDate, formatMoney, formatTime } from "@/lib/format";

type Search = { servico: string; profissional: string; horario: string };

export const Route = createFileRoute("/confirmar")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    servico: String(s["servico"] ?? ""),
    profissional: String(s["profissional"] ?? ""),
    horario: String(s["horario"] ?? ""),
  }),
  head: () => ({
    meta: [
      { title: "Confirmar agendamento — AgendaMais" },
      { name: "description", content: "Revise o resumo e confirme seu agendamento." },
      { property: "og:title", content: "Confirmar agendamento — AgendaMais" },
      { property: "og:description", content: "Revise o resumo e confirme seu agendamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { servico, profissional, horario } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const { data: services } = useQuery(servicesQuery);
  const { data: pros } = useQuery(professionalsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [busy, setBusy] = useState(false);

  const service = services?.find((s) => s.id === servico);
  const pro = pros?.find((p) => p.id === profissional);
  const tz = settings?.timezone;
  const redirect = `/confirmar?servico=${servico}&profissional=${profissional}&horario=${encodeURIComponent(horario)}`;

  async function confirm() {
    setBusy(true);
    const { data, error } = await supabase.rpc("create_booking", {
      _service_id: servico,
      _professional_id: profissional,
      _starts_at: horario,
    });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    qc.invalidateQueries({ queryKey: ["my-appointments"] });
    navigate({ to: "/agendamento/$id", params: { id: data } });
  }

  const missingName = profile.data && !profile.data.full_name.trim();

  return (
    <AppShell nav={false}>
      <ScreenHeader title="Confirmar" back={<BackButton />} />
      <Stepper steps={["Serviço", "Profissional", "Confirmação"]} current={3} />

      <div className="px-4 pb-8 pt-4">
        <section className="rounded-2xl border bg-card p-4 shadow-card">
          <h2 className="font-bold">Resumo do agendamento</h2>
          {service && (
            <div className="mt-3 flex gap-3">
              {service.image_url && <img src={service.image_url} alt="" className="size-16 rounded-xl object-cover" />}
              <div className="flex flex-1 flex-col justify-between">
                <p className="font-bold">{service.name}</p>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5 text-primary" /> {service.duration_min} min
                  </span>
                  <span className="font-bold">{formatMoney(service.price)}</span>
                </div>
              </div>
            </div>
          )}
          <div className="my-4 h-px bg-border" />
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <UserRound className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">{pro?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{pro?.role}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0" />
              <p className="font-medium">
                {horario && tz ? (
                  <>
                    {formatLongDate(horario, tz).replace(/-feira/, "")}
                    <br />
                    às {formatTime(horario, tz)}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 fill-foreground text-background" />
              <div>
                <p className="font-semibold">{settings?.name}</p>
                <p className="text-xs text-muted-foreground">{settings?.address}</p>
              </div>
            </li>
          </ul>
        </section>

        {!loading && !user && (
          <div className="mt-4 rounded-2xl bg-primary-soft p-4 text-sm">
            <p className="font-semibold">Entre na sua conta para confirmar</p>
            <p className="mt-1 text-xs text-muted-foreground">Assim você acompanha e cancela seus agendamentos quando quiser.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button asChild variant="default">
                <Link to="/entrar" search={{ redirect }}>
                  Entrar
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/entrar" search={{ redirect, modo: "cadastro" }}>
                  Criar conta
                </Link>
              </Button>
            </div>
          </div>
        )}

        {user && profile.data && !missingName && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Agendando como <span className="font-semibold text-foreground">{profile.data.full_name}</span>
            {profile.data.phone && ` · ${profile.data.phone}`}
          </p>
        )}
        {user && missingName && (
          <p className="mt-4 rounded-xl bg-muted p-3 text-center text-xs">
            Complete seu nome no{" "}
            <Link to="/perfil" className="font-semibold underline">
              perfil
            </Link>{" "}
            para agendar.
          </p>
        )}

        <Button
          variant="cta"
          size="xl"
          className="mt-5 w-full"
          disabled={!user || busy || !service || !pro || !!missingName}
          onClick={confirm}
        >
          {busy ? "Confirmando..." : "Confirmar agendamento"}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> Seus dados estão seguros
        </p>
      </div>
    </AppShell>
  );
}
