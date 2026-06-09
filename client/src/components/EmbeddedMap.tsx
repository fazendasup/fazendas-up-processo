import { useEffect, useMemo, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildMapsDirectionsEmbedUrl,
  buildMapsSimpleEmbedUrl,
  buildMapsStaticUrl,
} from "@/lib/googleMapsLoader";
import { cn } from "@/lib/utils";

type Localizacao = {
  latitude: number;
  longitude: number;
};

type MapMode = "static" | "directions" | "simple" | "fallback";

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
  const [mode, setMode] = useState<MapMode>("static");
  const [staticLoaded, setStaticLoaded] = useState(false);

  const staticUrl = useMemo(
    () => buildMapsStaticUrl({ destino, localizacao, width: 640, height: 400 }),
    [destino, localizacao?.latitude, localizacao?.longitude],
  );
  const directionsEmbedUrl = useMemo(
    () => buildMapsDirectionsEmbedUrl({ destino, localizacao }),
    [destino, localizacao?.latitude, localizacao?.longitude],
  );
  const simpleEmbedUrl = useMemo(
    () => buildMapsSimpleEmbedUrl({ destino, localizacao }),
    [destino, localizacao?.latitude, localizacao?.longitude],
  );

  useEffect(() => {
    setMode(staticUrl ? "static" : directionsEmbedUrl ? "directions" : "simple");
    setStaticLoaded(false);
  }, [staticUrl, directionsEmbedUrl, destino, localizacao?.latitude, localizacao?.longitude]);

  useEffect(() => {
    if (mode !== "static") return;
    const timeoutId = window.setTimeout(() => {
      if (!staticLoaded) {
        setMode(directionsEmbedUrl ? "directions" : "simple");
      }
    }, 6000);
    return () => window.clearTimeout(timeoutId);
  }, [mode, staticLoaded, directionsEmbedUrl]);

  useEffect(() => {
    if (mode !== "directions" && mode !== "simple") return;
    const timeoutId = window.setTimeout(() => {
      setMode((current) => {
        if (current === "directions") return "simple";
        if (current === "simple") return "fallback";
        return current;
      });
    }, 6000);
    return () => window.clearTimeout(timeoutId);
  }, [mode, directionsEmbedUrl, simpleEmbedUrl]);

  const embedUrl = mode === "directions" ? directionsEmbedUrl : mode === "simple" ? simpleEmbedUrl : null;

  return (
    <div
      className={cn(
        "relative h-[320px] min-h-[280px] w-full overflow-hidden rounded-xl border border-border/70 bg-slate-100",
        className,
      )}
    >
      {mode === "static" && staticUrl ? (
        <img
          src={staticUrl}
          alt={title}
          className="h-full w-full object-cover"
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setStaticLoaded(true)}
          onError={() => setMode(directionsEmbedUrl ? "directions" : "simple")}
        />
      ) : null}

      {mode === "directions" || mode === "simple" ? (
        embedUrl ? (
          <iframe
            className="h-full w-full border-0"
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            src={embedUrl}
            title={title}
            allowFullScreen
          />
        ) : null
      ) : null}

      {mode === "fallback" ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
          <MapPin className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium">{destino}</p>
          <p className="text-xs text-muted-foreground">
            O mapa embutido não carregou neste aparelho. Toque abaixo para abrir a rota no Google Maps.
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

      {mode !== "fallback" && mode !== "static" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent px-3 py-2 text-[11px] text-white">
          Carregando mapa...
        </div>
      ) : null}
    </div>
  );
}
