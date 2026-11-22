import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleAlert, MailCheck } from "lucide-react";
import { AppShell } from "@/components/client/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { safeForwardTarget } from "@/lib/site-url";

export const Route = createFileRoute("/auth/retorno")({
  head: () => ({
    meta: [
      { title: "Confirmando sua conta — AgendaMais" },
      { name: "description", content: "Confirmação de e-mail e nova senha da sua conta AgendaMais." },
      { property: "og:title", content: "Confirmando sua conta — AgendaMais" },
      { property: "og:description", content: "Confirmação de e-mail da sua conta AgendaMais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReturnPage,
});

type State = { kind: "carregando" } | { kind: "erro"; entrar: string } | { kind: "confirmado"; entrar: string };

function ReturnPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: "carregando" });

  useEffect(() => {
    // Read the link's parameters before the login client consumes and clears them.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const failed = hash.get("error_code") ?? hash.get("error") ?? query.get("error_code") ?? query.get("error");
    const type = hash.get("type") ?? "signup";
    const target = safeForwardTarget(query.get("para"));
    const entrar = (target && target.origin !== window.location.origin ? target.origin : "") + "/entrar";

    (async () => {
      if (failed) {
        setState({ kind: "erro", entrar });
        return;
      }
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        setState({ kind: "confirmado", entrar });
        return;
      }
      if (target && target.origin !== window.location.origin) {
        const params = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: String(session.expires_in),
          expires_at: String(session.expires_at ?? ""),
          token_type: "bearer",
          type,
        });
        // Leave this site without revoking the session, then hand it to the customer's site.
        await supabase.auth.signOut({ scope: "local" });
        window.location.replace(`${target.origin}${target.pathname}${target.search}#${params.toString()}`);
        return;
      }
      navigate({ href: target ? target.pathname + target.search : "/", replace: true });
    })();
  }, [navigate]);

  return (
    <AppShell nav={false}>
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-8 text-center lg:min-h-full">
        {state.kind === "carregando" ? (
          <>
            <div className="size-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Confirmando sua conta...</p>
          </>
        ) : state.kind === "erro" ? (
          <>
            <div className="flex size-20 items-center justify-center rounded-full bg-muted">
              <CircleAlert className="size-9" />
            </div>
            <h1 className="mt-6 text-xl font-extrabold">Este link expirou ou já foi usado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Se você já confirmou seu e-mail, é só entrar com sua senha. Se não, entre e peça um novo link.
            </p>
            <Button asChild variant="cta" size="xl" className="mt-6 w-full">
              <a href={state.entrar}>Ir para entrar</a>
            </Button>
          </>
        ) : (
          <>
            <div className="flex size-20 items-center justify-center rounded-full bg-primary-soft">
              <MailCheck className="size-9" />
            </div>
            <h1 className="mt-6 text-xl font-extrabold">E-mail confirmado!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Agora entre com seu e-mail e senha para agendar.</p>
            <Button asChild variant="cta" size="xl" className="mt-6 w-full">
              <a href={state.entrar}>Entrar</a>
            </Button>
          </>
        )}
      </div>
    </AppShell>
  );
}
