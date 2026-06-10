import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

type Localizacao = {
  latitude: number;
  longitude: number;
};

type LatLng = { lat: number; lng: number };

async function geocodificarEndereco(endereco: string): Promise<LatLng | null> {
  const query = encodeURIComponent(`${endereco}, Manaus, AM, Brasil`);
  const response = await fetch(`https://photon.komoot.io/api/?q=${query}&limit=1`);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
  };
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords) return null;
  return { lng: coords[0], lat: coords[1] };
}

async function buscarRota(origem: LatLng, destino: LatLng): Promise<LatLng[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = (await response.json()) as {
    routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
  };
  const coordinates = data.routes?.[0]?.geometry?.coordinates ?? [];
  return coordinates.map(([lng, lat]) => ({ lat, lng }));
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
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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

    return () => {
      map.remove();
      mapRef.current = null;
      rotaRef.current = null;
      marcadorOrigemRef.current = null;
      marcadorDestinoRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelado = false;

    const atualizar = async () => {
      setCarregando(true);
      setErro(null);

      try {
        if (!destinoPosRef.current) {
          destinoPosRef.current = await geocodificarEndereco(destino);
        }
        const destinoPos = destinoPosRef.current;
        if (cancelado || !destinoPos) {
          setErro("Não foi possível localizar o endereço da entrega.");
          setCarregando(false);
          return;
        }

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

        if (localizacao) {
          const origem = { lat: localizacao.latitude, lng: localizacao.longitude };

          marcadorOrigemRef.current?.remove();
          marcadorOrigemRef.current = L.circleMarker([origem.lat, origem.lng], {
            radius: 10,
            color: "#ffffff",
            weight: 2,
            fillColor: "#059669",
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip("Você", { permanent: false });

          const pontos = await buscarRota(origem, destinoPos);
          if (cancelado) return;

          rotaRef.current?.remove();
          if (pontos.length > 0) {
            rotaRef.current = L.polyline(
              pontos.map((p) => [p.lat, p.lng] as [number, number]),
              { color: "#059669", weight: 5, opacity: 0.9 },
            ).addTo(map);
            map.fitBounds(rotaRef.current.getBounds(), { padding: [48, 48] });
          } else {
            map.fitBounds(
              L.latLngBounds([origem.lat, origem.lng], [destinoPos.lat, destinoPos.lng]),
              { padding: [48, 48] },
            );
          }

          if (navegando) {
            map.setView([origem.lat, origem.lng], 16, { animate: true });
          }
        } else {
          rotaRef.current?.remove();
          marcadorOrigemRef.current?.remove();
          map.setView([destinoPos.lat, destinoPos.lng], 15);
        }
      } catch {
        if (!cancelado) {
          setErro("Não foi possível carregar o mapa agora.");
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    void atualizar();

    return () => {
      cancelado = true;
    };
  }, [destino, localizacao?.latitude, localizacao?.longitude, navegando]);

  useEffect(() => {
    destinoPosRef.current = null;
  }, [destino]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    window.setTimeout(() => map.invalidateSize(), 150);
  }, [navegando, className]);

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
      {erro ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/90 px-4 text-center">
          <MapPin className="h-7 w-7 text-primary" />
          <p className="text-sm text-muted-foreground">{erro}</p>
        </div>
      ) : null}
    </div>
  );
}
