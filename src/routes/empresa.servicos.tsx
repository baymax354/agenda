import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/AdminShell";
import { dbError, Field, selectClass } from "@/components/admin/fields";
import { PhotoPicker } from "@/components/admin/PhotoPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, servicesQuery, type Service } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/empresa/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — Painel AgendaMais" },
      { name: "description", content: "Cadastre e edite os serviços, preços e duração." },
      { property: "og:title", content: "Serviços — Painel AgendaMais" },
      { property: "og:description", content: "Cadastre e edite os serviços do seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminServices,
});

type Form = { id?: string; name: string; description: string; category: string; duration_min: string; price: string; image_url: string };
const EMPTY: Form = { name: "", description: "", category: "Cabelo", duration_min: "60", price: "", image_url: "" };

function AdminServices() {
  const qc = useQueryClient();
  const { data: services, isLoading } = useQuery(servicesQuery);
  const [cat, setCat] = useState("Todos");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const list = (services ?? []).filter(
    (s) => (cat === "Todos" || s.category === cat) && (!q || s.name.toLowerCase().includes(q.toLowerCase())),
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ["services"] });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const duration = Number(form.duration_min);
    const price = Number(form.price.replace(",", "."));
    if (form.name.trim().length < 2) { toast.error("Informe o nome do serviço"); return; }
    if (!Number.isFinite(duration) || duration < 10 || duration > 480) { toast.error("Duração entre 10 e 480 minutos"); return; }
    if (!Number.isFinite(price) || price < 0) { toast.error("Preço inválido"); return; }
    const row = {
      name: form.name.trim().slice(0, 80),
      description: form.description.trim().slice(0, 200),
      category: form.category,
      duration_min: Math.round(duration),
      price,
      image_url: form.image_url.trim() || null,
    };
    setBusy(true);
    const { error } = form.id
      ? await supabase.from("services").update(row).eq("id", form.id)
      : await supabase.from("services").insert({ ...row, sort_order: (services?.length ?? 0) + 1 });
    setBusy(false);
    if (error) { toast.error(dbError(error)); return; }
    toast.success(form.id ? "Serviço atualizado" : "Serviço criado");
    setForm(null);
    refresh();
  }

  async function toggle(s: Service) {
    const { error } = await supabase.from("services").update({ active: !s.active }).eq("id", s.id);
    if (error) { toast.error(dbError(error)); return; }
    toast.success(s.active ? "Serviço oculto para clientes" : "Serviço visível para clientes");
    refresh();
  }

  async function remove(s: Service) {
    if (!confirm(`Excluir "${s.name}"?`)) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id);
    if (error) { toast.error(dbError(error)); return; }
    toast.success("Serviço excluído");
    refresh();
  }

  return (
    <>
      <PageHeader
        title="Serviços"
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar serviço..." className="w-56 bg-muted pl-9" />
            </div>
            <Button onClick={() => setForm(EMPTY)}>
              <Plus /> Novo serviço
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {["Todos", ...CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-xs font-semibold",
              cat === c ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-border",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="divide-y rounded-2xl border">
        {isLoading && <li className="p-6 text-center text-sm text-muted-foreground">Carregando...</li>}
        {!isLoading && list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum serviço.</li>}
        {list.map((s) => (
          <li key={s.id} className={cn("flex items-center gap-4 p-3", !s.active && "opacity-50")}>
            {s.image_url ? (
              <img src={s.image_url} alt="" className="size-14 rounded-xl object-cover" />
            ) : (
              <div className="size-14 rounded-xl bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {s.name} {!s.active && <span className="text-xs font-normal text-muted-foreground">(oculto)</span>}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" /> {s.duration_min} min · {s.category}
              </p>
            </div>
            <span className="font-bold">{formatMoney(s.price)}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Opções de ${s.name}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    setForm({
                      id: s.id,
                      name: s.name,
                      description: s.description,
                      category: s.category,
                      duration_min: String(s.duration_min),
                      price: String(s.price),
                      image_url: s.image_url ?? "",
                    })
                  }
                >
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggle(s)}>{s.active ? "Ocultar dos clientes" : "Mostrar aos clientes"}</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => remove(s)}>
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          {form && (
            <form onSubmit={save} className="grid grid-cols-2 gap-4">
              <Field label="Nome" className="col-span-2">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Descrição" className="col-span-2">
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Field label="Categoria" className="col-span-2">
                <select className={selectClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Duração (min)">
                <Input type="number" min={10} max={480} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} required />
              </Field>
              <Field label="Preço (R$)">
                <Input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="80,00" required />
              </Field>
              <Field label="Foto" className="col-span-2">
                <PhotoPicker value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
              </Field>
              <Button type="submit" size="lg" className="col-span-2" disabled={busy}>
                Salvar
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
