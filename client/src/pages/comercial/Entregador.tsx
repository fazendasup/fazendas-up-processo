import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  SkipForward,
  Truck,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/Map";
import { createMapMarker } from "@/lib/googleMapsLoader";
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

function useMobilePullToRefresh(onRefresh: () => Promise<void>, disabled = false) {
  const startYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    const reset = () => {
      startYRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (disabled || window.scrollY > 0) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-no-pull-refresh='true']")) return;
      startYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (disabled || startYRef.current === null || window.scrollY > 0) return;
      const currentY = event.touches[0]?.clientY;
      if (currentY === undefined) return;

      const distance = Math.max(0, Math.min(120, currentY - startYRef.current));
      pullDistanceRef.current = distance;
      setPullDistance(distance);
    };

    const onTouchEnd = () => {
      const shouldRefresh = pullDistanceRef.current >= 80;
      reset();
      if (shouldRefresh && !disabled) {
        void onRefresh();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", reset);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, [disabled, onRefresh]);

  return pullDistance;
}

export function Entregador() {
  const { dia, rotaId } = useQueryParams();
  const diaDate = useMemo(() => new Date(`${dia}T12:00:00`), [dia]);
  const utils = trpc.useUtils();
  const gpsErroAvisadoRef = useRef(false);
  const [aceitouLocalizacao, setAceitouLocalizacao] = useState(false);
  const [problemaTexto, setProblemaTexto] = useState("");
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [atualizandoRoteiro, setAtualizandoRoteiro] = useState(false);
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

  const atualizarRoteiro = useCallback(async () => {
    setAtualizandoRoteiro(true);
    try {
      await roteiro.refetch();
      toast.success("Roteiro atualizado.");
    } catch {
      toast.error("Não foi possível atualizar o roteiro agora.");
    } finally {
      setAtualizandoRoteiro(false);
    }
  }, [roteiro]);
  const pullDistance = useMobilePullToRefresh(atualizarRoteiro, atualizandoRoteiro);

  const registrarLocalizacao = useCallback(
    (rotaIdAtual: string, coords: GeolocationCoordinates) => {
      gpsErroAvisadoRef.current = false;
      const localizacao = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        precisaoMetros: coords.accuracy,
      };
      setLocalizacaoAtual(localizacao);
      atualizarLocalizacao.mutate({
        rotaId: rotaIdAtual,
        latitude: coords.latitude,
        longitude: coords.longitude,
        precisaoMetros: coords.accuracy,
      });
    },
    [atualizarLocalizacao],
  );

  const avisarErroGps = useCallback(() => {
    if (gpsErroAvisadoRef.current) return;
    gpsErroAvisadoRef.current = true;
    toast.error("Não foi possível obter a localização. Verifique se o GPS está ativo.");
  }, []);

  const enviarLocalizacaoAtual = useCallback(() => {
    if (!rota || rota.status !== "EM_ROTA" || !rota.compartilhamentoAtivo || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        registrarLocalizacao(rota.id, pos.coords);
      },
      avisarErroGps,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }, [avisarErroGps, registrarLocalizacao, rota]);

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
          registrarLocalizacao(rota.id, pos.coords);
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

  /** Mantém o GPS automático enquanto a rota está ativa e o app visível (PWA aberto). */
  useEffect(() => {
    if (!rota || rota.status !== "EM_ROTA" || !rota.compartilhamentoAtivo) return;
    if (!navigator.geolocation) return;

    gpsErroAvisadoRef.current = false;

    const registrarSeAtivo = (pos: GeolocationPosition) => {
      const atual = rotaRef.current;
      if (!atual || atual.status !== "EM_ROTA" || !atual.compartilhamentoAtivo) return;
      if (document.visibilityState !== "visible") return;
      registrarLocalizacao(atual.id, pos.coords);
    };

    const enviarPeriodicamente = () => {
      const atual = rotaRef.current;
      if (!atual || atual.status !== "EM_ROTA" || !atual.compartilhamentoAtivo) return;
      if (document.visibilityState !== "visible") return;

      navigator.geolocation.getCurrentPosition(
        registrarSeAtivo,
        avisarErroGps,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    };

    enviarPeriodicamente();
    const intervalId = window.setInterval(enviarPeriodicamente, 60_000);
    const watchId = navigator.geolocation.watchPosition(registrarSeAtivo, avisarErroGps, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        enviarPeriodicamente();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(intervalId);
      navigator.geolocation.clearWatch(watchId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [avisarErroGps, registrarLocalizacao, rota?.id, rota?.status, rota?.compartilhamentoAtivo]);

  const mapsUrl = linkGoogleMaps(paradaAtual?.endereco);
  const telUrl = linkTelefone(paradaAtual?.telefoneWhatsapp);
  const waUrl = linkWhatsapp(
    paradaAtual?.telefoneWhatsapp,
    `Olá, estou a caminho com a entrega da Fazendas UP.`,
  );

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-24">
      {(pullDistance > 12 || atualizandoRoteiro) ? (
        <div
          className="fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full border bg-background/95 px-4 py-2 text-xs font-medium text-muted-foreground shadow-md backdrop-blur"
          style={{ transform: `translate(-50%, ${Math.min(pullDistance / 3, 28)}px)` }}
        >
          {atualizandoRoteiro ? "Atualizando roteiro..." : pullDistance >= 80 ? "Solte para atualizar" : "Puxe para atualizar"}
        </div>
      ) : null}

      <PageHeader
        kicker="Modo entregador"
        title="Entregas de hoje"
        subtitle="Use esta tela no celular. O mapa interno mantém o PWA aberto para enviar GPS durante a rota."
      />

      <Button
        className="w-full"
        variant="outline"
        disabled={atualizandoRoteiro}
        onClick={() => void atualizarRoteiro()}
      >
        <RefreshCw className={cn("h-4 w-4", atualizandoRoteiro && "animate-spin")} />
        Atualizar roteiro
      </Button>

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
              onIniciarNavegacao={enviarLocalizacaoAtual}
            />

            <div className="grid gap-3">
              <Button className="h-14 text-base" disabled={!mapsUrl} asChild={Boolean(mapsUrl)}>
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noreferrer">
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
  onIniciarNavegacao,
}: {
  destino: string | null | undefined;
  localizacaoAtual: LocalizacaoEntrega | null;
  onIniciarNavegacao: () => void;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [navegando, setNavegando] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distancia: string; duracao: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const directionsRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const redimensionarMapa = useCallback(() => {
    if (!map || !window.google?.maps) return;
    window.setTimeout(() => {
      window.google?.maps.event.trigger(map, "resize");
      if (localizacaoAtual && navegando) {
        map.setCenter({ lat: localizacaoAtual.latitude, lng: localizacaoAtual.longitude });
        map.setZoom(17);
      }
    }, 120);
  }, [localizacaoAtual, map, navegando]);

  const iniciarNavegacao = async () => {
    setNavegando(true);
    onIniciarNavegacao();
    try {
      await containerRef.current?.requestFullscreen?.();
    } catch {
      // Alguns PWAs mobile não expõem Fullscreen API; o overlay fixo mantém a experiência em tela cheia.
    }
    redimensionarMapa();
  };

  const sairNavegacao = async () => {
    setNavegando(false);
    try {
      if (document.fullscreenElement === containerRef.current) {
        await document.exitFullscreen();
      }
    } catch {
      // Sair do fullscreen pode falhar se o navegador já tiver encerrado o modo.
    }
    redimensionarMapa();
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setNavegando(false);
        redimensionarMapa();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [redimensionarMapa]);

  useEffect(() => {
    redimensionarMapa();
  }, [redimensionarMapa]);

  useEffect(() => {
    if (!map || !window.google?.maps || !destino?.trim()) return;

    const clearMarkers = () => {
      for (const marker of markersRef.current) marker.setMap(null);
      markersRef.current = [];
    };

    const addMarker = (position: google.maps.LatLngLiteral, title: string, color: string) => {
      const marker = createMapMarker(map, position, title, color);
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
      setRouteInfo(null);
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
        addMarker(destinoPos, "Destino da entrega", "#2563eb");
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
      addMarker(origem, "Sua posição atual", "#059669");

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
            const leg = result.routes[0]?.legs[0];
            setRouteInfo({
              distancia: leg?.distance?.text ?? "Distância indisponível",
              duracao: leg?.duration?.text ?? "Tempo indisponível",
            });
            if (navegando) {
              map.setCenter(origem);
              map.setZoom(17);
            }
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
  }, [destino, localizacaoAtual?.latitude, localizacaoAtual?.longitude, map, navegando]);

  useEffect(() => {
    return () => {
      directionsRef.current?.setMap(null);
      directionsRef.current = null;
      for (const marker of markersRef.current) marker.setMap(null);
      markersRef.current = [];
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-no-pull-refresh="true"
      className={cn(
        "space-y-2 bg-background",
        navegando && "fixed inset-0 z-50 flex flex-col space-y-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]",
      )}
    >
      {navegando ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border bg-card/95 p-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Navegação no app</p>
            <p className="truncate text-sm font-medium">{destino ?? "Destino da entrega"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {routeInfo ? `${routeInfo.distancia} • ${routeInfo.duracao}` : "Calculando rota..."}
            </p>
          </div>
          <Button size="icon" variant="outline" onClick={() => void sairNavegacao()} aria-label="Sair da navegação">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <MapView
        className={cn(
          "overflow-hidden rounded-xl border border-border/70",
          navegando ? "min-h-0 flex-1" : "h-[300px]",
        )}
        initialCenter={{ lat: -3.119, lng: -60.0217 }}
        initialZoom={13}
        onMapReady={setMap}
      />

      {navegando ? (
        <div className="rounded-xl border bg-card/95 p-3 text-xs text-muted-foreground shadow-sm">
          GPS automático ativo enquanto esta tela permanecer aberta. O mapa acompanha sua posição e recalcula a rota até
          a entrega.
        </div>
      ) : (
        <div className="space-y-2">
          <Button className="h-12 w-full text-base" disabled={!destino} onClick={() => void iniciarNavegacao()}>
            <Maximize2 className="h-5 w-5" />
            Iniciar navegação no app
          </Button>
          <p className="text-xs text-muted-foreground">
            {localizacaoAtual
              ? "GPS automático ativo. Mantenha o PWA aberto para enviar posição durante a rota."
              : "Ao iniciar a navegação, o app solicitará sua posição e acompanhará a rota automaticamente."}
          </p>
        </div>
      )}
    </div>
  );
}
