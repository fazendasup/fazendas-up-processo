import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  SkipForward,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [problemaTexto, setProblemaTexto] = useState("");
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [atualizandoRoteiro, setAtualizandoRoteiro] = useState(false);

  const roteiro = trpc.comercial.entregas.roteiro.useQuery(
    { dia: diaDate, rotaId: rotaId ?? undefined },
    { refetchInterval: false },
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
  const atualizarParada = trpc.comercial.entregas.atualizarParada.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.comercial.entregas.roteiro.invalidate(),
        utils.comercial.pedidos.dashboard.invalidate(),
        utils.comercial.pedidos.agenda.invalidate(),
        utils.comercial.pedidos.statusSemana.invalidate(),
        utils.comercial.pedidos.compras.invalidate(),
        utils.comercial.pedidos.relatorioHistorico.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message),
  });

  const rota = roteiro.data?.rota ?? null;
  const rotas = roteiro.data?.rotas ?? [];
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

  const atualizarStatusParada = async (
    status: "ENTREGUE" | "PROBLEMA" | "PULADA",
    observacoesProblema?: string,
  ) => {
    if (!paradaAtual) return;
    setAtualizandoStatus(true);
    try {
      await atualizarParada.mutateAsync({
        paradaId: paradaAtual.id,
        status,
        observacoesProblema,
      });
    } catch {
      // O onError da mutation já mostra a mensagem correta.
    } finally {
      setAtualizandoStatus(false);
    }
  };

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
        subtitle="Use esta tela no celular para marcar entregas, problemas e abrir o endereço no Maps."
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
                Todas as entregas desta rota foram finalizadas.
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
            <p className="text-sm text-muted-foreground">
              Confirme para começar as entregas deste roteiro. Use o Google Maps externo para navegar até cada endereço.
            </p>
            <Button
              className="h-12 w-full text-base"
              disabled={iniciar.isPending}
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

            {mapsUrl ? (
              <Button className="h-14 w-full text-base" asChild>
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                  <Navigation className="h-5 w-5" />
                  Abrir no Google Maps
                </a>
              </Button>
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Endereço indisponível para abrir no Maps.
              </div>
            )}

            <div className="grid gap-3">
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

export default Entregador;
