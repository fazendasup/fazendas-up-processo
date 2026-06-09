import { useMemo, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildMapsEmbedUrl, buildMapsStaticUrl } from "@/lib/googleMapsLoader";
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
  navUrl,
}: {
  destino: string;
  localizacao?: Localizacao | null;
  className?: string;
  title?: string;
  navUrl?: string | null;
}) {
  const [staticFailed, setStaticFailed] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);

  const staticUrl = useMemo(
    () => buildMapsStaticUrl({ destino, localizacao, width: 640, height: 400 }),
    [destino, localizacao?.latitude, localizacao?.longitude],
  );
  const embedUrl = useMemo(
    () => buildMapsEmbedUrl({ destino, localizacao }),
    [destino, localizacao?.latitude, localizacao?.longitude],
  );

  const showStatic = Boolean(staticUrl) && !staticFailed;
  const showEmbed = !showStatic && !embedFailed;

  return (
    <div className={cn("relative min-h-[280px] overflow-hidden rounded-xl border border-border/70 bg-sky-50", className)}>
      {showStatic ? (
        <img
          src={staticUrl!}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setStaticFailed(true)}
        />
      ) : null}

      {showEmbed ? (
        <iframe
          className="absolute inset-0 h-full w-full border-0"
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
          src={embedUrl}
          title={title}
          allowFullScreen
          onError={() => setEmbedFailed(true)}
        />
      ) : null}

      {!showStatic && !showEmbed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/40 px-4 text-center">
          <MapPin className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium">{destino}</p>
          <p className="text-xs text-muted-foreground">
            O mapa embutido não carregou neste aparelho. Use o botão abaixo para abrir a rota no Google Maps.
          </p>
          {navUrl ? (
            <Button className="h-11" asChild>
              <a href={navUrl} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4" />
                Abrir rota no Google Maps
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
