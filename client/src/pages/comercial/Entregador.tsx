import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Navigation,
  Phone,
  SkipForward,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import {
  diaOperacionalInicial,
  labelStatusParada,
  labelStatusRota,
  linkGoogleMaps,
  linkTelefone,
  linkWhatsapp,
} from "@/lib/entregas";
import { cn } from "@/lib/utils";

type LocalizacaoEntrega = {
  latitude: number;
  longitude: number;
  precisaoMetros: number | null;
};

function useQueryParams() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  return {
    dia: params.get("dia") || diaOperacionalInicial(),
    rotaId: params.get("rota"),
  };
}

export function Entregador() {
  const { dia, rotaId } = useQueryParams();
  const diaDate = useMemo(() => new Date(`${dia}T12:00:00`), [dia]);
  const utils = trpc.useUtils();
  const gpsErroAvisadoRef = useRef(false);
  const [aceitouLocalizacao, setAceitouLocalizacao] = useState(false);
  const [problemaTexto, setProblemaTexto] = useState("");
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [localizacaoAtual, setLocalizacaoAtual] = useState<LocalizacaoEntrega | null>(null);

  const roteiro = trpc.comercial.entregas.roteiro.useQuery(
    { dia: diaDate, rotaId: rotaId ?? undefined },
    { refetchInterval: 15000 },
  );
  const iniciar = trpc.comercial.entregas.iniciarRota.useMutation({
    onSuccess: async () => {
      toast.success("Rota iniciada.");
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const encerrar = trpc.comercial.entregas.encerrarRota.useMutation({
    onSuccess: async () => {
      toast.success("Rota encerrada.");
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const atualizarLocalizacao = trpc.comercial.entregas.atualizarLocalizacao.useMutation();
  const atualizarParada = trpc.comercial.entregas.atualizarParada.useMutation({
    onSuccess: async () => {
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rota = roteiro.data?.rota ?? null;
  const rotas = roteiro.data?.rotas ?? [];
  const rotaRef = useRef(rota);
  rotaRef.current = rota;
  const paradaAtual =
    rota?.status === "EM_ROTA"
      ? (rota.paradas.find((p) => p.status === "EM_ROTA") ??
        rota.paradas.find((p) => p.status === "PENDENTE") ??
        null)
      : null;
  const enviarLocalizacaoAtual = () => {
    if (!rota || rota.status !== "EM_ROTA" || !rota.compartilhamentoAtivo || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocalizacaoAtual({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisaoMetros: pos.coords.accuracy,
        });
        atualizarLocalizacao.mutate({
          rotaId: rota.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisaoMetros: pos.coords.accuracy,
        });
      },
      () => {
        toast.error("Não foi possível atualizar a localização agora.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  };

  const obterLocalizacaoFresca = async (): Promise<LocalizacaoEntrega | undefined> => {
    if (!rota || rota.status !== "EM_ROTA" || !rota.compartilhamentoAtivo || !navigator.geolocation) return undefined;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const localizacao = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisaoMetros: pos.coords.accuracy,
          };
          setLocalizacaoAtual(localizacao);
          resolve(localizacao);
        },
        () => {
          toast.warning("Entrega atualizada, mas não consegui obter o GPS neste momento.");
          resolve(undefined);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    });
  };

  const atualizarStatusParada = async (
    status: "ENTREGUE" | "PROBLEMA" | "PULADA",
    observacoesProblema?: string,
  ) => {
    if (!paradaAtual) return;
    setAtualizandoStatus(true);
    try {
      const localizacao = await obterLocalizacaoFresca();
      await atualizarParada.mutateAsync({
        paradaId: paradaAtual.id,
        status,
        observacoesProblema,
        localizacao,
      });
    } catch {
      // O onError da mutation já mostra a mensagem correta.
    } finally {
      setAtualizandoStatus(false);
    }
  };

  /** Envia GPS a cada 60s enquanto a rota está ativa e o app visível (PWA aberto). */
  useEffect(() => {
    if (!rota || rota.status !== "EM_ROTA" || !rota.compartilhamentoAtivo) return;
    if (!navigator.geolocation) return;

    gpsErroAvisadoRef.current = false;

    const enviarPeriodicamente = () => {
      const atual = rotaRef.current;
      if (!atual || atual.status !== "EM_ROTA" || !atual.compartilhamentoAtivo) return;
      if (document.visibilityState !== "visible") return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsErroAvisadoRef.current = false;
          setLocalizacaoAtual({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisaoMetros: pos.coords.accuracy,
          });
          atualizarLocalizacao.mutate({
            rotaId: atual.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisaoMetros: pos.coords.accuracy,
          });
        },
        () => {
          if (!gpsErroAvisadoRef.current) {
            gpsErroAvisadoRef.current = true;
            toast.error("Não foi possível obter a localização. Verifique se o GPS está ativo.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    };

    enviarPeriodicamente();
    const intervalId = window.setInterval(enviarPeriodicamente, 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        enviarPeriodicamente();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [rota?.id, rota?.status, rota?.compartilhamentoAtivo, atualizarLocalizacao]);

  const mapsUrl = linkGoogleMaps(paradaAtual?.endereco);
  const telUrl = linkTelefone(paradaAtual?.telefoneWhatsapp);
  const waUrl = linkWhatsapp(
    paradaAtual?.telefoneWhatsapp,
    `Olá, estou a caminho com a entrega da Fazendas UP.`,
  );

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-24">
      <PageHeader
        kicker="Modo entregador"
        title="Entregas de hoje"
        subtitle="Use esta tela no celular. O mapa interno mantém o PWA aberto para enviar GPS durante a rota."
      />

      {rotas.length > 1 ? (
        <Card>
          <CardContent className="flex flex-wrap gap-2 pt-6">
            {rotas.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={item.id === rota?.id ? "default" : "outline"}
                asChild
              >
                <Link href={`/comercial/entregador?dia=${dia}&rota=${item.id}`}>
                  {item.nome ?? "Rota"}
                  <Badge className="ml-2" variant="secondary">
                    {labelStatusRota(item.status)}
                  </Badge>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {rota ? (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{labelStatusRota(rota.status)}</Badge>
          {rota.entregadorNome ? <Badge variant="secondary">{rota.entregadorNome}</Badge> : null}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nenhuma rota gerada para hoje. Peça para a equipe montar o roteiro em Entregas.
          </CardContent>
        </Card>
      )}

      {rota?.status === "CONCLUIDA" ? (
        <Card className="border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="flex items-start gap-3 pt-6 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">Rota concluída</p>
              <p className="mt-1 text-muted-foreground">
                Todas as entregas desta rota foram finalizadas. O compartilhamento de localização foi encerrado.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {rota?.status === "PLANEJADA" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Iniciar rota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={aceitouLocalizacao}
                onChange={(e) => setAceitouLocalizacao(e.target.checked)}
              />
              <span>
                Aceito compartilhar minha localização durante esta rota para a empresa e para o cliente acompanhar a
                entrega.
              </span>
            </label>
            <Button
              className="h-12 w-full text-base"
              disabled={!aceitouLocalizacao || iniciar.isPending}
              onClick={() => iniciar.mutate({ rotaId: rota.id, aceitouCompartilhamento: true })}
            >
              <Truck className="h-5 w-5" />
              Iniciar rota
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {paradaAtual ? (
        <Card className="border-primary/30 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="h-5 w-5 text-primary" />
              Próxima entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-2xl font-bold leading-tight">{paradaAtual.clienteNome}</p>
              <p className="mt-1 text-sm text-muted-foreground">{paradaAtual.endereco ?? "Sem endereço cadastrado"}</p>
              <Badge className="mt-3">{labelStatusParada(paradaAtual.status)}</Badge>
            </div>

            <DriverRouteMap
              destino={paradaAtual.endereco}
              localizacaoAtual={localizacaoAtual}
              onAtualizarLocalizacao={enviarLocalizacaoAtual}
            />

            <div className="grid gap-3">
              <Button className="h-14 text-base" disabled={!mapsUrl} asChild={Boolean(mapsUrl)}>
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" onClick={enviarLocalizacaoAtual}>
                    <Navigation className="h-5 w-5" />
                    Abrir no Google Maps (opcional)
                  </a>
                ) : (
                  <>
                    <Navigation className="h-5 w-5" />
                    Endereço indisponível
                  </>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button className="h-12" variant="secondary" disabled={!telUrl} asChild={Boolean(telUrl)}>
                  {telUrl ? (
                    <a href={telUrl}>
                      <Phone className="h-4 w-4" />
                      Ligar
                    </a>
                  ) : (
                    <>
                      <Phone className="h-4 w-4" />
                      Ligar
                    </>
                  )}
                </Button>
                <Button className="h-12" variant="secondary" disabled={!waUrl} asChild={Boolean(waUrl)}>
                  {waUrl ? (
                    <a href={waUrl} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  ) : (
                    <>WhatsApp</>
                  )}
                </Button>
              </div>

              <Button
                className="h-14 bg-emerald-600 text-base hover:bg-emerald-700"
                disabled={atualizandoStatus || atualizarParada.isPending}
                onClick={() => void atualizarStatusParada("ENTREGUE")}
              >
                <CheckCircle2 className="h-5 w-5" />
                Marcar entregue
              </Button>

              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Descreva o problema, se houver..."
                value={problemaTexto}
                onChange={(e) => setProblemaTexto(e.target.value)}
              />
              <Button
                className="h-12"
                variant="destructive"
                disabled={atualizandoStatus || atualizarParada.isPending}
                onClick={() => void atualizarStatusParada("PROBLEMA", problemaTexto)}
              >
                <AlertTriangle className="h-4 w-4" />
                Problema na entrega
              </Button>

              <Button
                className="h-12"
                variant="outline"
                disabled={atualizandoStatus || atualizarParada.isPending}
                onClick={() => void atualizarStatusParada("PULADA")}
              >
                <SkipForward className="h-4 w-4" />
                Pular e ir para próxima
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : rota ? (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Todas as paradas foram concluídas.
          </CardContent>
        </Card>
      ) : null}

      {rota?.status === "EM_ROTA" ? (
        <Button
          className={cn("h-12 w-full")}
          variant="outline"
          disabled={encerrar.isPending}
          onClick={() => encerrar.mutate({ rotaId: rota.id })}
        >
          Encerrar rota
        </Button>
      ) : null}

      {rota ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Todas as paradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rota.paradas.map((parada) => (
              <div key={parada.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>
                  {parada.ordem}. {parada.clienteNome}
                </span>
                <Badge variant="outline">{labelStatusParada(parada.status)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function DriverRouteMap({
  destino,
  localizacaoAtual,
  onAtualizarLocalizacao,
}: {
  destino: string | null | undefined;
  localizacaoAtual: LocalizacaoEntrega | null;
  onAtualizarLocalizacao: () => void;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const directionsRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  useEffect(() => {
    if (!map || !window.google?.maps || !destino?.trim()) return;

    const clearMarkers = () => {
      for (const marker of markersRef.current) marker.map = null;
      markersRef.current = [];
    };

    const markerContent = (label: string, className: string) => {
      const el = document.createElement("div");
      el.className = className;
      el.textContent = label;
      return el;
    };

    const addMarker = (position: google.maps.LatLngLiteral, label: string, title: string, className: string) => {
      const marker = new window.google!.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title,
        content: markerContent(label, className),
      });
      markersRef.current.push(marker);
    };

    const renderer =
      directionsRef.current ??
      new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: {
          strokeColor: "#059669",
          strokeOpacity: 0.95,
          strokeWeight: 6,
        },
      });
    directionsRef.current = renderer;
    renderer.setMap(map);
    const clearDirections = () => {
      renderer.setMap(null);
      renderer.setMap(map);
    };

    let cancelled = false;
    const service = new window.google.maps.DirectionsService();
    const geocoder = new window.google.maps.Geocoder();

    const run = async () => {
      clearMarkers();
      const destinoTexto = destino.trim();
      const destinoPos = await new Promise<google.maps.LatLngLiteral | null>((resolve) => {
        geocoder.geocode({ address: destinoTexto }, (results, status) => {
          if (status !== "OK" || !results?.[0]?.geometry.location) {
            resolve(null);
            return;
          }
          const location = results[0].geometry.location;
          resolve({ lat: location.lat(), lng: location.lng() });
        });
      });

      if (cancelled) return;

      if (destinoPos) {
        addMarker(
          destinoPos,
          "Entrega",
          "Destino da entrega",
          "rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-md ring-2 ring-white",
        );
      }

      if (!localizacaoAtual) {
        clearDirections();
        if (destinoPos) {
          map.setCenter(destinoPos);
          map.setZoom(15);
        }
        return;
      }

      const origem = { lat: localizacaoAtual.latitude, lng: localizacaoAtual.longitude };
      addMarker(
        origem,
        "Você",
        "Sua posição atual",
        "rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md ring-2 ring-emerald-100",
      );

      service.route(
        {
          origin: origem,
          destination: destinoTexto,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (cancelled) return;
          if (status === "OK" && result) {
            renderer.setDirections(result);
            return;
          }
          clearDirections();
          const bounds = new window.google!.maps.LatLngBounds();
          bounds.extend(origem);
          if (destinoPos) bounds.extend(destinoPos);
          map.fitBounds(bounds, 64);
        },
      );
    };

    void run();

    return () => {
      cancelled = true;
      clearMarkers();
    };
  }, [destino, localizacaoAtual?.latitude, localizacaoAtual?.longitude, map]);

  useEffect(() => {
    return () => {
      directionsRef.current?.setMap(null);
      directionsRef.current = null;
      for (const marker of markersRef.current) marker.map = null;
      markersRef.current = [];
    };
  }, []);

  return (
    <div className="space-y-2">
      <MapView
        className="h-[300px] overflow-hidden rounded-xl border border-border/70"
        initialCenter={{ lat: -3.119, lng: -60.0217 }}
        initialZoom={13}
        onMapReady={setMap}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {localizacaoAtual
            ? "Rota dentro do PWA. Mantenha esta tela aberta para enviar GPS a cada minuto."
            : "Toque em atualizar posição para traçar a rota dentro do PWA."}
        </span>
        <Button size="sm" variant="outline" onClick={onAtualizarLocalizacao}>
          Atualizar posição
        </Button>
      </div>
    </div>
  );
}
