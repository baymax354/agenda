import { createFileRoute, Link } from "@tanstack/react-router";
import { photoSrc } from "@/lib/site-url";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronRight, Clock, MapPin } from "lucide-react";
import heroAsset from "@/assets/hero_woman.webp.asset.json";
import { AppShell } from "@/components/client/AppShell";
import { Wordmark } from "@/components/brand/Brand";
import { Button } from "@/components/ui/button";
import { servicesQuery, settingsQuery } from "@/lib/queries";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgendaMais — Sua melhor versão, sempre" },
      { name: "description", content: "Cabelo, barba e beleza em um só lugar. Escolha o serviço, o profissional e o horário em poucos toques." },
      { property: "og:title", content: "AgendaMais — Sua melhor versão, sempre" },
      { property: "og:description", content: "Cabelo, barba e beleza em um só lugar. Agende online com o AgendaMais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: settings } = useQuery(settingsQuery);
  const { data: services } = useQuery(servicesQuery);

  return (
    <AppShell>
      <div className="px-5 pb-6 pt-6">
        <div className="flex items-center justify-between">
          <Wordmark className="text-[1.65rem]" />
          <Link to="/agendamentos" aria-label="Meus agendamentos" className="rounded-full p-2 hover:bg-muted">
            <Bell className="size-5" />
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-4 text-foreground" />
          {settings?.city ?? "São Paulo - SP"}
          <ChevronRight className="size-3.5 text-primary" />
        </div>

        <section className="relative mt-5 overflow-hidden rounded-3xl bg-primary-soft">
          <img
            src={photoSrc(heroAsset.url)}
            alt="Mulher sorrindo com cabelo ondulado e brilhante"
            className="absolute inset-y-0 right-0 h-full w-[68%] object-cover object-top"
          />
          <div className="absolute inset-0 hero-fade" />
          <div className="relative flex min-h-[23rem] flex-col justify-between p-5">
            <div className="max-w-[11rem] pt-6">
              <h2 className="text-[2rem] font-extrabold leading-[1.05] tracking-tight">
                Sua melhor versão, sempre.
              </h2>
              <p className="mt-4 text-xs leading-relaxed text-foreground/80">
                Cabelo, barba e beleza em um só lugar.
              </p>
            </div>
            <Button asChild variant="cta" size="xl" className="relative w-full">
              <Link to="/servicos">
                Agendar
                <ChevronRight className="absolute right-5 !size-5" />
              </Link>
            </Button>
          </div>
        </section>

        <div className="mt-7 flex items-end justify-between">
          <h3 className="text-base font-bold">Serviços em destaque</h3>
          <Link to="/servicos" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            Ver todos
          </Link>
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
          {(services ?? []).slice(0, 5).map((s) => (
            <Link
              key={s.id}
              to="/agendar/$serviceId"
              params={{ serviceId: s.id }}
              className="w-36 shrink-0 overflow-hidden rounded-2xl border bg-card shadow-card"
            >
              {s.image_url ? (
                <img src={photoSrc(s.image_url)} alt={s.name} className="h-24 w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-24 bg-muted" />
              )}
              <div className="p-3">
                <p className="truncate text-sm font-bold">{s.name}</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {s.duration_min} min
                  </span>
                  <span className="font-bold text-foreground">{formatMoney(s.price)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
