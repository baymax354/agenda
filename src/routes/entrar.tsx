import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell, BackButton, ScreenHeader } from "@/components/client/AppShell";
import { Wordmark } from "@/components/brand/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

type Search = { redirect?: string; modo?: "cadastro" };

function safePath(p: string | undefined): string {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/";
}

export const Route = createFileRoute("/entrar")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof s["redirect"] === "string") out.redirect = s["redirect"];
    if (s["modo"] === "cadastro") out.modo = "cadastro";
    return out;
  },
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — AgendaMais" },
      { name: "description", content: "Entre ou crie sua conta AgendaMais para agendar e acompanhar seus horários." },
      { property: "og:title", content: "Entrar ou criar conta — AgendaMais" },
      { property: "og:description", content: "Entre ou crie sua conta para agendar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  phone: z.string().trim().min(8, "Informe um telefone válido").max(30),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres").max(72),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const target = safePath(search.redirect);
  const [mode, setMode] = useState<"entrar" | "cadastro" | "esqueci">(search.modo === "cadastro" ? "cadastro" : "entrar");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
        navigate({ href: target });
      } else if (mode === "cadastro") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin + target,
            data: { full_name: parsed.data.full_name, phone: parsed.data.phone },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ href: target });
        else setSentTo(parsed.data.email);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
          redirectTo: window.location.origin + "/redefinir-senha",
        });
        if (error) throw error;
        toast.success("Enviamos um link para redefinir sua senha.");
        setMode("entrar");
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AppShell nav={false}>
        <div className="flex min-h-[80vh] flex-col items-center justify-center px-8 text-center lg:min-h-full">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary-soft">
            <MailCheck className="size-9" />
          </div>
          <h1 className="mt-6 text-xl font-extrabold">Confirme seu e-mail</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviamos um link para <span className="font-semibold text-foreground">{sentTo}</span>. Abra o link para ativar sua conta e
            continuar o agendamento.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell nav={false}>
      <ScreenHeader title="" back={<BackButton />} />
      <div className="px-6 pb-10">
        <Wordmark className="text-3xl" />
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "cadastro"
            ? "Crie sua conta para agendar em segundos."
            : mode === "esqueci"
              ? "Informe seu e-mail para receber um link de nova senha."
              : "Entre para agendar e acompanhar seus horários."}
        </p>

        {mode !== "esqueci" && (
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["entrar", "cadastro"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold",
                  mode === m ? "bg-background shadow-card" : "text-muted-foreground",
                )}
              >
                {m === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "cadastro" && (
            <>
              <Field label="Nome completo">
                <Input value={form.full_name} onChange={set("full_name")} autoComplete="name" required />
              </Field>
              <Field label="Telefone">
                <Input value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="(11) 99999-9999" required />
              </Field>
            </>
          )}
          <Field label="E-mail">
            <Input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
          </Field>
          {mode !== "esqueci" && (
            <Field label="Senha">
              <Input
                type="password"
                value={form.password}
                onChange={set("password")}
                autoComplete={mode === "cadastro" ? "new-password" : "current-password"}
                required
              />
            </Field>
          )}
          <Button type="submit" variant="cta" size="xl" className="w-full" disabled={busy}>
            {busy ? "Aguarde..." : mode === "entrar" ? "Entrar" : mode === "cadastro" ? "Criar conta" : "Enviar link"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          {mode === "entrar" && (
            <button type="button" onClick={() => setMode("esqueci")} className="text-muted-foreground hover:text-foreground">
              Esqueci minha senha
            </button>
          )}
          {mode === "esqueci" && (
            <button type="button" onClick={() => setMode("entrar")} className="text-muted-foreground hover:text-foreground">
              Voltar para entrar
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}
