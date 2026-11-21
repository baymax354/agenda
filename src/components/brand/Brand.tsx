import { BarChart3, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

export function Wordmark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "font-extrabold tracking-tight",
        inverted ? "text-sidebar-accent-foreground" : "text-foreground",
        className,
      )}
    >
      Agenda<span className="text-primary">Mais</span>
    </span>
  );
}

export function BrandIcon({ variant = "client", className }: { variant?: "client" | "business"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-14 items-center justify-center rounded-2xl",
        variant === "client" ? "bg-primary text-primary-foreground" : "bg-sidebar text-primary",
        className,
      )}
    >
      {variant === "client" ? <Scissors className="size-7" strokeWidth={2.4} /> : <BarChart3 className="size-7" strokeWidth={2.6} />}
    </span>
  );
}
