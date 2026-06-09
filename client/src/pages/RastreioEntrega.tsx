import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { MapPin, Package, Truck } from "lucide-react";
import { MapView } from "@/components/Map";
import { createMapMarker } from "@/lib/googleMapsLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { labelStatusParada } from "@/lib/entregas";

export default function RastreioEntrega() {
  const [, params] = useRoute("/rastreio/:token");
  const token = params?.token ?? "";

  const rastreio = trpc.comercial.entregas.rastrearPublico.useQuery(
    { token },
    {
      enabled: Boolean(token),
      refetchInterval: 15000,
      retry: false,
    },
  );

  const mapaUrl = useMemo(() => {
    const loc = rastreio.data?.localizacao;
    if (!loc) return null;
    return `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}&z=15`;
  }, [rastreio.data?.localizacao]);

  if (!token) {
    return <Shell erro="Link de rastreamento inválido." />;
  }

  if (rastreio.isLoading) {
    return <Shell carregando />;
  }

  if (rastreio.error || !rastreio.data) {
    return <Shell erro="Rastreamento não encontrado ou expirado." />;
  }

  const data = rastreio.data;
  const previsao = data.fila?.previsaoMinutos;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white px-4 py-8 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Fazendas UP</p>
          <h1 className="mt-2 text-2xl font-bold">Acompanhe sua entrega</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.clienteNome}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge className="text-sm">{labelStatusParada(data.statusParada)}</Badge>
            {data.statusParada === "ENTREGUE" ? (
              <p className="text-sm text-emerald-700">Sua entrega foi concluída.</p>
            ) : data.statusParada === "PROBLEMA" ? (
              <p className="text-sm text-rose-700">
                Houve um problema na entrega. Nossa equipe foi avisada.
                {data.observacoesProblema ? ` ${data.observacoesProblema}` : ""}
              </p>
            ) : data.compartilhando ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />
                Seu pedido está a caminho.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                A entrega ainda não está em trânsito ou o compartilhamento de localização não está ativo.
              </p>
            )}
            {data.compartilhando && data.fila?.posicao ? (
              <div className="grid gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Sua posição na fila</span>
                  <strong>
                    {data.fila.posicao}
                    {data.fila.total ? ` de ${data.fila.total}` : ""}
                  </strong>
                </div>
                {previsao ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Previsão estimada</span>
                    <strong>
                      {previsao.minutosMin}-{previsao.minutosMax} min
                    </strong>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {data.compartilhando && data.localizacao ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                Localização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Atualizado às{" "}
                {data.localizacao.atualizadaEm
                  ? new Date(data.localizacao.atualizadaEm).toLocaleTimeString("pt-BR")
                  : "—"}
              </p>
              <EntregadorLiveMap
                latitude={data.localizacao.latitude}
                longitude={data.localizacao.longitude}
                clienteNome={data.clienteNome}
              />
              {mapaUrl ? (
                <a
                  href={mapaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground"
                >
                  Abrir no Google Maps
                </a>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function EntregadorLiveMap({
  latitude,
  longitude,
  clienteNome,
}: {
  latitude: number;
  longitude: number;
  clienteNome: string;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const position = useMemo(() => ({ lat: latitude, lng: longitude }), [latitude, longitude]);

  useEffect(() => {
    if (!map || !window.google?.maps) return;

    const marker = createMapMarker(map, position, `Entregador - ${clienteNome}`, "#059669");

    map.setCenter(position);
    map.setZoom(15);

    return () => {
      marker.setMap(null);
    };
  }, [clienteNome, map, position]);

  return (
    <MapView
      className="h-72 overflow-hidden rounded-xl border border-border/70"
      fallbackUrl={`https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
      initialCenter={position}
      initialZoom={15}
      onMapReady={setMap}
    />
  );
}

function Shell({ carregando, erro }: { carregando?: boolean; erro?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          {carregando ? "Carregando rastreamento..." : erro}
        </CardContent>
      </Card>
    </div>
  );
}
