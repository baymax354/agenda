import { STATUS_LABEL, type AppointmentStatus } from "@/lib/queries";
import { cn } from "@/lib/utils";

const STYLES: Record<AppointmentStatus, string> = {
  concluido: "bg-success-soft text-success",
  em_andamento: "bg-primary text-primary-foreground",
  agendado: "bg-info-soft text-info",
  cancelado: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold", STYLES[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}
