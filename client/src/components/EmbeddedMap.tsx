import { useMemo } from "react";
import { buildMapsEmbedUrl } from "@/lib/googleMapsLoader";
import { cn } from "@/lib/utils";

type Localizacao = {
  latitude: number;
  longitude: number;
};

export function EmbeddedMap({
  destino,
  localizacao,
  className,
  title = "Mapa da entrega",
}: {
  destino: string;
  localizacao?: Localizacao | null;
  className?: string;
  title?: string;
}) {
  const embedUrl = useMemo(
    () => buildMapsEmbedUrl({ destino, localizacao }),
    [destino, localizacao?.latitude, localizacao?.longitude],
  );

  return (
    <div className={cn("relative min-h-[280px] overflow-hidden rounded-xl border border-border/70 bg-muted/20", className)}>
      <iframe
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={embedUrl}
        title={title}
        allowFullScreen
      />
    </div>
  );
}
