import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PHOTO_GALLERY } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function PhotoPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">
        {PHOTO_GALLERY.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => onChange(url)}
            className={cn(
              "relative aspect-square overflow-hidden rounded-lg border-2",
              value === url ? "border-primary" : "border-transparent",
            )}
          >
            <img src={url} alt="" className="size-full object-cover" />
            {value === url && (
              <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                <Check className="size-3" />
              </span>
            )}
          </button>
        ))}
      </div>
      <Input
        value={value.startsWith("/__l5e/") ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ou cole o link de uma foto (https://...)"
      />
    </div>
  );
}
