/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { googleMapsApiKey } from "@/lib/publicRuntimeConfig";
import { loadGoogleMapsScript, mapsAuthFailed } from "@/lib/googleMapsLoader";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const init = usePersistFn(async () => {
    setLoading(true);
    setLoadError(null);

    const loaded = await loadGoogleMapsScript();
    if (!loaded || !window.google?.maps?.Map) {
      setLoadError(
        googleMapsApiKey()
          ? mapsAuthFailed()
            ? "Chave do Google Maps bloqueada neste dispositivo. No Google Cloud, em Restrições de sites, adicione https://app.fazendasup.com.br/* e salve. Depois feche e abra o app de novo."
            : "Não foi possível carregar o Google Maps. Verifique conexão, APIs Maps JavaScript + Geocoding ativas e referrer https://app.fazendasup.com.br/* na chave."
          : "Google Maps não configurado. Defina GOOGLE_MAPS_API_KEY (ou VITE_FRONTEND_FORGE_API_KEY) no Railway.",
      );
      setLoading(false);
      return;
    }

    if (!mapContainer.current) {
      setLoading(false);
      return;
    }

    try {
      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false,
      });
      onMapReady?.(map.current);
      window.setTimeout(() => {
        window.google?.maps.event.trigger(map.current!, "resize");
      }, 150);
    } catch (error) {
      console.error("Google Maps init failed", error);
      setLoadError(
        "O Google Maps carregou, mas não iniciou o mapa. Confira restrições da chave (referrer do domínio) e APIs habilitadas no Google Cloud.",
      );
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void init();
    const onAuthFailure = () => {
      setLoadError(
        "Chave do Google Maps bloqueada neste dispositivo. No Google Cloud, em Restrições de sites, adicione https://app.fazendasup.com.br/* e salve.",
      );
      setLoading(false);
    };
    window.addEventListener("fazendas-maps-auth-failure", onAuthFailure);
    return () => window.removeEventListener("fazendas-maps-auth-failure", onAuthFailure);
  }, [init]);

  useEffect(() => {
    if (!mapContainer.current || !map.current) return;
    const observer = new ResizeObserver(() => {
      if (!map.current) return;
      window.google?.maps.event.trigger(map.current, "resize");
    });
    observer.observe(mapContainer.current);
    return () => observer.disconnect();
  }, [loading, loadError]);

  return (
    <div className={cn("relative w-full min-h-[220px] h-[500px]", className)}>
      <div ref={mapContainer} className="absolute inset-0" />
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
          Carregando mapa...
        </div>
      ) : null}
      {loadError ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/90 px-4 text-center text-sm text-muted-foreground">
          {loadError}
        </div>
      ) : null}
    </div>
  );
}
