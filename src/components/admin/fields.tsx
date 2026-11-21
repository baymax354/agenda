import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}

export function dbError(e: { code?: string; message: string } | null): string {
  if (!e) return "";
  if (e.code === "23P01") return "Esse profissional já tem um atendimento nesse horário.";
  if (e.code === "23503") return "Não é possível excluir: existem agendamentos ligados a este item. Desative-o em vez disso.";
  return e.message;
}
