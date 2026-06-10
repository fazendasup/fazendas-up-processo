import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { geocodificarEndereco, type LatLng } from "@/lib/geocoding";
import "leaflet/dist/leaflet.css";

type Localizacao = {
  latitude: number;
  longitude: number;
};

const MANAUS_CENTER: LatLng = { lat: -3.1190275, lng: -60.0217314 };
const ROUTE_RECALC_MIN_INTERVAL_MS = 15_000;
const ROUTE_RECALC_MIN_DISTANCE_METERS = 40;

function distanciaMetros(a: LatLng, b: LatLng): number {
  const earthRadiusMeters = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

async function buscarRota(origem: LatLng, destino: LatLng): Promise<LatLng[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
    };
    const coordinates = data.routes?.[0]?.geometry?.coordinates ?? [];
    return coordinates.map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return [];
  }
}

export function OsmRouteMap({
  destino,
  localizacao,
  navegando = false,
  className,
}: {
  destino: string;
  localizacao?: Localizacao | null;
  navegando?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rotaRef = useRef<L.Polyline | null>(null);
  const marcadorOrigemRef = useRef<L.CircleMarker | null>(null);
  const marcadorDestinoRef = useRef<L.CircleMarker | null>(null);
  const destinoPosRef = useRef<LatLng | null>(null);
  const destinoPromiseRef = useRef<Promise<LatLng | null> | null>(null);
  const rotaEmAndamentoRef = useRef(false);
  const rotaRequestIdRef = useRef(0);
  const ultimaRotaOrigemRef = useRef<LatLng | null>(null);
  const ultimaRotaDestinoRef = useRef<LatLng | null>(null);
  const ultimaRotaMsRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    map.setView([MANAUS_CENTER.lat, MANAUS_CENTER.lng], 12);

    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      rotaRef.current = null;
      marcadorOrigemRef.current = null;
      marcadorDestinoRef.current = null;
      destinoPromiseRef.current = null;
      rotaEmAndamentoRef.current = false;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    let cancelado = false;

    const atualizar = async () => {
      setCarregando(!marcadorOrigemRef.current && !marcadorDestinoRef.current);
      setAviso(null);

      try {
        const origem = localizacao ? { lat: localizacao.latitude, lng: localizacao.longitude } : null;

        if (origem) {
          marcadorOrigemRef.current?.remove();
          marcadorOrigemRef.current = L.circleMarker([origem.lat, origem.lng], {
            radius: navegando ? 13 : 10,
            color: "#ffffff",
            weight: navegando ? 4 : 2,
            fillColor: "#059669",
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip("Você", { permanent: false });

          if (navegando) {
            map.flyTo([origem.lat, origem.lng], 18, {
              animate: true,
              duration: 0.25,
            });
          } else if (!destinoPosRef.current) {
            map.setView([origem.lat, origem.lng], 15);
          }
          setCarregando(false);
        }

        if (!destinoPosRef.current) {
          destinoPromiseRef.current ??= geocodificarEndereco(destino);
          destinoPosRef.current = await destinoPromiseRef.current;
        }
        const destinoPos = destinoPosRef.current;

        if (cancelado) return;

        if (!destinoPos) {
          setAviso("Não foi possível localizar o endereço da entrega. O mapa mostra sua posição atual.");
        } else {
          marcadorDestinoRef.current?.remove();
          marcadorDestinoRef.current = L.circleMarker([destinoPos.lat, destinoPos.lng], {
            radius: 10,
            color: "#ffffff",
            weight: 2,
            fillColor: "#2563eb",
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip("Entrega", { permanent: false });
          setCarregando(false);
        }

        if (origem) {
          if (destinoPos) {
            const agora = Date.now();
            const mudouDestino =
              !ultimaRotaDestinoRef.current || distanciaMetros(ultimaRotaDestinoRef.current, destinoPos) > 5;
            const mudouOrigem =
              !ultimaRotaOrigemRef.current ||
              distanciaMetros(ultimaRotaOrigemRef.current, origem) >= ROUTE_RECALC_MIN_DISTANCE_METERS;
            const passouIntervalo = agora - ultimaRotaMsRef.current >= ROUTE_RECALC_MIN_INTERVAL_MS;
            const deveRecalcular = !rotaRef.current || mudouDestino || mudouOrigem || (!navegando && passouIntervalo);

            if (deveRecalcular && !rotaEmAndamentoRef.current) {
              rotaEmAndamentoRef.current = true;
              const requestId = ++rotaRequestIdRef.current;
              const pontos = await buscarRota(origem, destinoPos);
              rotaEmAndamentoRef.current = false;
              if (cancelado || requestId !== rotaRequestIdRef.current) return;

              rotaRef.current?.remove();
              if (pontos.length > 0) {
                rotaRef.current = L.polyline(
                  pontos.map((p) => [p.lat, p.lng] as [number, number]),
                  { color: "#059669", weight: 5, opacity: 0.9 },
                ).addTo(map);
                ultimaRotaOrigemRef.current = origem;
                ultimaRotaDestinoRef.current = destinoPos;
                ultimaRotaMsRef.current = Date.now();
                if (!navegando) {
                  map.fitBounds(rotaRef.current.getBounds(), { padding: [48, 48] });
                }
              } else if (!rotaRef.current) {
                rotaRef.current = L.polyline(
                  [
                    [origem.lat, origem.lng],
                    [destinoPos.lat, destinoPos.lng],
                  ],
                  { color: "#059669", weight: 4, opacity: 0.55, dashArray: "8 8" },
                ).addTo(map);
                if (!navegando) {
                  map.fitBounds(rotaRef.current.getBounds(), { padding: [48, 48] });
                }
              }
            } else if (!navegando && !rotaRef.current) {
              map.fitBounds(
                L.latLngBounds([origem.lat, origem.lng], [destinoPos.lat, destinoPos.lng]),
                { padding: [48, 48] },
              );
            }
          } else if (!navegando) {
            rotaRef.current?.remove();
            map.setView([origem.lat, origem.lng], 15);
          }
        } else if (destinoPos) {
          rotaRef.current?.remove();
          marcadorOrigemRef.current?.remove();
          map.setView([destinoPos.lat, destinoPos.lng], 15);
        } else {
          rotaRef.current?.remove();
          marcadorOrigemRef.current?.remove();
          map.setView([MANAUS_CENTER.lat, MANAUS_CENTER.lng], 12);
        }
      } catch {
        if (!cancelado) {
          setAviso("Não foi possível carregar a rota agora. Tente novamente em instantes.");
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    void atualizar();

    return () => {
      cancelado = true;
    };
  }, [mapReady, destino, localizacao?.latitude, localizacao?.longitude, navegando]);

  useEffect(() => {
    destinoPosRef.current = null;
    destinoPromiseRef.current = null;
    ultimaRotaOrigemRef.current = null;
    ultimaRotaDestinoRef.current = null;
    ultimaRotaMsRef.current = 0;
    rotaRequestIdRef.current += 1;
    rotaRef.current?.remove();
    rotaRef.current = null;
  }, [destino]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    window.setTimeout(() => map.invalidateSize(), 150);
  }, [navegando, className, mapReady]);

  return (
    <div
      className={cn(
        "relative h-[320px] min-h-[280px] w-full overflow-hidden rounded-xl border border-border/70 bg-slate-100",
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {carregando ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : null}
      {aviso ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 rounded-lg border border-amber-500/40 bg-background/95 px-3 py-2 text-center shadow-sm">
          <MapPin className="mx-auto mb-1 h-4 w-4 text-amber-600" />
          <p className="text-xs text-muted-foreground">{aviso}</p>
        </div>
      ) : null}
    </div>
  );
}
