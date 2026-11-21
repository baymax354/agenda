import { Star } from "lucide-react";

export function Rating({ value }: { value: number | string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold">
      <Star className="size-3.5 fill-primary text-primary" />
      {Number(value).toFixed(1).replace(".", ",")}
    </span>
  );
}
