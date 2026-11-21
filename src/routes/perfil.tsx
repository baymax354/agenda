import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, ChevronRight, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/client/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage, initials } from "@/lib/format";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — AgendaMais" },
      { name: "description", content: "Gerencie seus dados e sua conta AgendaMais." },
      { property: "og:title", content: "Meu perfil — AgendaMais" },
      { property: "og:description", content: "Gerencie seus dados e sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (profile.data) setForm({ full_name: profile.data.full_name, phone: profile.data.phone });
  }, [profile.data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (form.full_name.trim().length < 2) { toast.error("Informe seu nome"); return; }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: form.full_name.trim().slice(0, 120), phone: form.phone.trim().slice(0, 30) })
      .eq("id", user!.id);
    setBusy(false);
    if (error) { toast.error(errorMessage(error)); return; }
    toast.success("Dados salvos");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function logout() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/" });
  }

  return (
    <AppShell>
      <ScreenHeader title="Perfil" />
      {!loading && !user ? (
        <div className="px-6 py-14 text-center">
          <UserRound className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 font-semibold">Você ainda não entrou</p>
          <p className="mt-1 text-sm text-muted-foreground">Crie sua conta para agendar e acompanhar seus horários.</p>
          <div className="mt-6 grid gap-2">
            <Button asChild variant="cta" size="lg">
              <Link to="/entrar" search={{ redirect: "/perfil", modo: "cadastro" }}>
                Criar conta
              </Link>
            </Button>
            <Button asChild variant="soft" size="lg">
              <Link to="/entrar" search={{ redirect: "/perfil" }}>
                Já tenho conta
              </Link>
            </Button>
          </div>
          <CompanyLink />
        </div>
      ) : (
        <div className="px-5 pb-8">
          <div className="flex items-center gap-4 rounded-2xl bg-primary-soft p-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-extrabold">
              {initials(profile.data?.full_name || user?.email || "?")}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{profile.data?.full_name || "Seu nome"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <form onSubmit={save} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              Salvar dados
            </Button>
          </form>
          <Button variant="soft" size="lg" className="mt-3 w-full" onClick={logout}>
            <LogOut /> Sair
          </Button>
          <CompanyLink />
        </div>
      )}
    </AppShell>
  );
}

function CompanyLink() {
  return (
    <Link
      to="/empresa"
      className="mt-8 flex items-center gap-3 rounded-2xl border p-4 text-left hover:bg-muted"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar text-primary">
        <BarChart3 className="size-5" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-bold">Área da empresa</span>
        <span className="block text-xs text-muted-foreground">Agenda, equipe e relatórios</span>
      </span>
      <ChevronRight className="size-4" />
    </Link>
  );
}
