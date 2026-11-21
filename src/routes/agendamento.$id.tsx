import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { AppShell } from "@/components/client/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatLongDate, formatTime } from "@/lib/format";

export const Route = createFileRoute("/agendamento/$id")({
  head: () => ({
    meta: [
      { title: "Agendamento confirmado — AgendaMais" },
      { name: "description", content: "Seu horário está reservado. Nos vemos em breve." },
      { property: "og:title", content: "Agendamento confirmado — AgendaMais" },
      { property: "og:description", content: "Seu horário está reservado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DonePage,
});

function DonePage() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["appointment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, starts_at, services(name), professionals(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell nav={false}>
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-8 text-center lg:min-h-full">
        <div className="flex size-24 items-center justify-center rounded-full bg-success-soft animate-in zoom-in-50 duration-500">
          <Check className="size-12 text-success" strokeWidth={3.5} />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold leading-tight">
          Agendamento
          <br />
          confirmado!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Nos vemos em breve.</p>
        {data && (
          <p className="mt-6 rounded-2xl bg-muted px-4 py-3 text-sm">
            <span className="font-bold">{data.services?.name}</span> com {data.professionals?.name}
            <br />
            {formatLongDate(data.starts_at)} às {formatTime(data.starts_at)}
          </p>
        )}
        <div className="mt-8 grid w-full gap-3">
          <Button asChild variant="default" size="lg">
            <Link to="/agendamentos">Ver meus agendamentos</Link>
          </Button>
          <Button asChild variant="soft" size="lg">
            <Link to="/">Voltar para o início</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
