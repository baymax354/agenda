import { useState, type FormEvent } from "react";
import { photoSrc } from "@/lib/site-url";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/AdminShell";
import { dbError, Field } from "@/components/admin/fields";
import { PhotoPicker } from "@/components/admin/PhotoPicker";
import { Rating } from "@/components/Rating";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, professionalsQuery, type Professional } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/empresa/profissionais")({
  head: () => ({
    meta: [
      { title: "Profissionais — Painel AgendaMais" },
      { name: "description", content: "Gerencie a equipe e os serviços que cada profissional atende." },
      { property: "og:title", content: "Profissionais — Painel AgendaMais" },
      { property: "og:description", content: "Gerencie a equipe do seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPros,
});

type Form = { id?: string; name: string; role: string; rating: string; photo_url: string; categories: string[] };
const EMPTY: Form = { name: "", role: "", rating: "5.0", photo_url: "", categories: [] };

function AdminPros() {
  const qc = useQueryClient();
  const { data: pros, isLoading } = useQuery(professionalsQuery);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["professionals"] });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const rating = Number(form.rating.replace(",", "."));
    if (form.name.trim().length < 2 || form.role.trim().length < 2) { toast.error("Informe nome e função"); return; }
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) { toast.error("Avaliação entre 0 e 5"); return; }
    if (form.categories.length === 0) { toast.error("Escolha ao menos uma categoria atendida"); return; }
    const row = {
      name: form.name.trim().slice(0, 80),
      role: form.role.trim().slice(0, 60),
      rating,
      photo_url: form.photo_url.trim() || null,
      categories: form.categories,
    };
    setBusy(true);
    const { error } = form.id
      ? await supabase.from("professionals").update(row).eq("id", form.id)
      : await supabase.from("professionals").insert(row);
    setBusy(false);
    if (error) { toast.error(dbError(error)); return; }
    toast.success(form.id ? "Profissional atualizado" : "Profissional adicionado");
    setForm(null);
    refresh();
  }

  async function toggle(p: Professional) {
    const { error } = await supabase.from("professionals").update({ active: !p.active }).eq("id", p.id);
    if (error) { toast.error(dbError(error)); return; }
    refresh();
  }

  async function remove(p: Professional) {
    if (!confirm(`Excluir ${p.name}?`)) return;
    const { error } = await supabase.from("professionals").delete().eq("id", p.id);
    if (error) { toast.error(dbError(error)); return; }
    toast.success("Profissional excluído");
    refresh();
  }

  return (
    <>
      <PageHeader
        title="Profissionais"
        actions={
          <Button onClick={() => setForm(EMPTY)}>
            <Plus /> Novo profissional
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {pros?.map((p) => (
          <div key={p.id} className={cn("relative rounded-2xl border bg-card p-5 text-center shadow-card", !p.active && "opacity-50")}>
            <div className="absolute right-2 top-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Opções de ${p.name}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      setForm({
                        id: p.id,
                        name: p.name,
                        role: p.role,
                        rating: String(p.rating),
                        photo_url: p.photo_url ?? "",
                        categories: p.categories,
                      })
                    }
                  >
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggle(p)}>{p.active ? "Desativar" : "Ativar"}</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => remove(p)}>
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {p.photo_url ? (
              <img src={photoSrc(p.photo_url)} alt={p.name} className="mx-auto size-24 rounded-full object-cover" />
            ) : (
              <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-muted text-2xl font-bold">{p.name[0]}</div>
            )}
            <p className="mt-3 font-bold">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.role}</p>
            <div className="mt-1">
              <Rating value={p.rating} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{p.categories.join(" · ")}</p>
          </div>
        ))}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar profissional" : "Novo profissional"}</DialogTitle>
          </DialogHeader>
          {form && (
            <form onSubmit={save} className="grid grid-cols-2 gap-4">
              <Field label="Nome" className="col-span-2">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Função">
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Cabeleireira" required />
              </Field>
              <Field label="Avaliação (0 a 5)">
                <Input inputMode="decimal" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
              </Field>
              <Field label="Atende" className="col-span-2">
                <div className="flex flex-wrap gap-4 pt-1">
                  {CATEGORIES.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.categories.includes(c)}
                        onCheckedChange={(v) =>
                          setForm({
                            ...form,
                            categories: v ? [...form.categories, c] : form.categories.filter((x) => x !== c),
                          })
                        }
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Foto" className="col-span-2">
                <PhotoPicker value={form.photo_url} onChange={(v) => setForm({ ...form, photo_url: v })} />
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
