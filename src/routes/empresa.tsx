import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { BrandIcon, Wordmark } from "@/components/brand/Brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { errorMessage } from "@/lib/format";

export const Route = createFileRoute("/empresa")({
  head: () => ({
    meta: [
      { title: "Painel da empresa — AgendaMais" },
      { name: "description", content: "Gestão completa para o seu negócio: agenda da equipe, serviços, clientes e relatórios." },
      { property: "og:title", content: "Painel da empresa — AgendaMais" },
      { property: "og:description", content: "Organize sua equipe, acompanhe agendamentos e faça seu negócio crescer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompanyLayout,
});

function CompanyLayout() {
  const { user, loading } = useAuth();
  const admin = useIsAdmin(user?.id);
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  if (loading || (user && admin.isLoading)) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!user) return <Gate kind="login" />;
  if (!admin.data) return <Gate kind="claim" />;

  return (
    <AdminShell userName={profile.data?.full_name || user.email || "Administrador"}>
      <Outlet />
    </AdminShell>
  );
}

function Gate({ kind }: { kind: "login" | "claim" }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const exists = useQuery({
    queryKey: ["admin-exists"],
    enabled: kind === "claim",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_exists");
      if (error) throw error;
      return data;
    },
  });

  async function claim() {
    setBusy(true);
    const { error } = await supabase.rpc("claim_business_owner");
    setBusy(false);
    if (error) { toast.error(errorMessage(error)); return; }
    toast.success("Painel ativado! Você é o administrador.");
    qc.invalidateQueries({ queryKey: ["is-admin"] });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-background p-8 shadow-phone">
        <BrandIcon variant="business" />
        <Wordmark className="mt-5 block text-4xl" />
        <p className="mt-2 text-lg text-foreground/80">Gestão completa para o seu negócio</p>
        <div className="my-6 h-px w-12 bg-foreground/20" />
        {kind === "login" && (
          <>
            <p className="text-sm text-muted-foreground">Entre com a conta da empresa para acessar a agenda, a equipe e os relatórios.</p>
            <div className="mt-6 grid gap-2">
              <Button asChild variant="cta" size="lg">
                <Link to="/entrar" search={{ redirect: "/empresa" }}>
                  Entrar
                </Link>
              </Button>
              <Button asChild variant="soft" size="lg">
                <Link to="/entrar" search={{ redirect: "/empresa", modo: "cadastro" }}>
                  Criar conta da empresa
                </Link>
              </Button>
            </div>
          </>
        )}
        {kind === "claim" && exists.data === false && (
          <>
            <p className="text-sm text-muted-foreground">
              O painel ainda não tem administrador. Ative agora para que esta conta gerencie o negócio.
            </p>
            <Button variant="cta" size="lg" className="mt-6 w-full" onClick={claim} disabled={busy}>
              Ativar painel da empresa
            </Button>
          </>
        )}
        {kind === "claim" && exists.data === true && (
          <p className="text-sm text-muted-foreground">
            Esta conta não tem acesso ao painel da empresa. Peça acesso ao administrador.
          </p>
        )}
        <Link to="/" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          Ir para o app do cliente
        </Link>
      </div>
    </div>
  );
}
