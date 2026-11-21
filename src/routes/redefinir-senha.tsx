import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/client/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/format";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Nova senha — AgendaMais" },
      { name: "description", content: "Defina uma nova senha para sua conta AgendaMais." },
      { property: "og:title", content: "Nova senha — AgendaMais" },
      { property: "og:description", content: "Defina uma nova senha para sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("A senha precisa ter pelo menos 6 caracteres"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(errorMessage(error)); return; }
    toast.success("Senha atualizada!");
    navigate({ to: "/perfil" });
  }

  return (
    <AppShell nav={false}>
      <ScreenHeader title="Nova senha" />
      <form onSubmit={submit} className="space-y-4 px-6 pt-4">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nova senha" autoComplete="new-password" />
        <Button type="submit" variant="cta" size="xl" className="w-full" disabled={busy}>
          Salvar nova senha
        </Button>
      </form>
    </AppShell>
  );
}
