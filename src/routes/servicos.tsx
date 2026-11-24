import { useRef, useState } from "react";
import { photoSrc } from "@/lib/site-url";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Clock, Search, X } from "lucide-react";
import { AppShell, BackButton, ScreenHeader } from "@/components/client/AppShell";
import { CATEGORIES, servicesQuery } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — AgendaMais" },
      { name: "description", content: "Corte, escova, barba, manicure e mais. Veja preços e duração e escolha seu serviço." },
      { property: "og:title", content: "Serviços — AgendaMais" },
      { property: "og:description", content: "Veja todos os serviços, preços e duração e agende online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data: services, isLoading } = useQuery(servicesQuery);
  const [cat, setCat] = useState<string>("Todos");
  const chipsRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");

  const list = (services ?? []).filter(
    (s) =>
      (cat === "Todos" || s.category === cat) &&
      (!q || s.name.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <AppShell>
      <ScreenHeader
        title="Serviços"
        back={<BackButton />}
        right={
          <button
            type="button"
            aria-label={searching ? "Fechar busca" : "Buscar serviço"}
            onClick={() => {
              setSearching((v) => !v);
              setQ("");
            }}
            className="-mr-2 rounded-full p-2 hover:bg-muted"
          >
            {searching ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
        }
      />
      <div className="px-4">
        {searching && (
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar serviço..."
            className="mb-3 h-11 w-full rounded-xl border bg-muted px-4 text-sm outline-none focus:border-primary"
          />
        )}
        <div
          ref={chipsRef}
          onPointerDown={(e) => {
            const el = chipsRef.current;
            if (!el || e.pointerType !== "mouse") return;
            drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
          }}
          onPointerMove={(e) => {
            const el = chipsRef.current;
            const d = drag.current;
            if (!el || !d) return;
            const dx = e.clientX - d.x;
            if (Math.abs(dx) > 4) d.moved = true;
            el.scrollLeft = d.left - dx;
          }}
          onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
          onPointerLeave={() => (drag.current = null)}
          onClickCapture={(e) => {
            if (drag.current?.moved) e.stopPropagation();
          }}
          className="no-scrollbar flex w-full min-w-0 cursor-grab touch-pan-x select-none gap-1.5 overflow-x-auto pb-1 active:cursor-grabbing"
        >
          {["Todos", ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                "flex-1 shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors",
                cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-border",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <ul className="mt-4 space-y-3 pb-6">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => <li key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
          {!isLoading && list.length === 0 && (
            <li className="py-12 text-center text-sm text-muted-foreground">Nenhum serviço encontrado.</li>
          )}
          {list.map((s) => (
            <li key={s.id}>
              <Link
                to="/agendar/$serviceId"
                params={{ serviceId: s.id }}
                className="flex overflow-hidden rounded-2xl border bg-card shadow-card transition-transform active:scale-[0.99]"
              >
                {s.image_url ? (
                  <img src={photoSrc(s.image_url)} alt={s.name} className="h-28 w-28 shrink-0 object-cover" loading="lazy" />
                ) : (
                  <div className="h-28 w-28 shrink-0 bg-muted" />
                )}
                <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5 pr-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{s.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                    </div>
                    <ChevronRight className="mt-3 size-4 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" /> {s.duration_min} min
                    </span>
                    <span className="text-sm font-bold">{formatMoney(s.price)}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
