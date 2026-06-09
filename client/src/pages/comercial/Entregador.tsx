import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
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

function useQueryDia() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  return params.get("dia") || diaOperacionalInicial();
}

export function Entregador() {
  const dia = useQueryDia();
  const diaDate = useMemo(() => new Date(`${dia}T12:00:00`), [dia]);
  const utils = trpc.useUtils();
  const watchIdRef = useRef<number | null>(null);
  const [aceitouLocalizacao, setAceitouLocalizacao] = useState(false);
  const [problemaTexto, setProblemaTexto] = useState("");

  const roteiro = trpc.comercial.entregas.roteiro.useQuery({ dia: diaDate }, { refetchInterval: 15000 });
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
  const paradaAtual =
    rota?.paradas.find((p) => p.status === "EM_ROTA") ??
    rota?.paradas.find((p) => p.status === "PENDENTE") ??
    null;
  const enviarLocalizacaoAtual = () => {
    if (!rota || rota.status !== "EM_ROTA" || !rota.compartilhamentoAtivo || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
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

  useEffect(() => {
    if (!rota || rota.status !== "EM_ROTA" || !rota.compartilhamentoAtivo) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) return;

    let ultimoEnvio = 0;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const agora = Date.now();
        if (agora - ultimoEnvio < 60_000) return;
        ultimoEnvio = agora;
        atualizarLocalizacao.mutate({
          rotaId: rota.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisaoMetros: pos.coords.accuracy,
        });
      },
      () => {
        toast.error("Não foi possível obter a localização.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [rota?.id, rota?.status, rota?.compartilhamentoAtivo]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        enviarLocalizacaoAtual();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [rota?.id, rota?.status, rota?.compartilhamentoAtivo]);

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
        subtitle="Use esta tela no celular. Navegue pelo Google Maps e volte aqui para marcar a entrega."
      />

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

      {rota && rota.status !== "EM_ROTA" ? (
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

            <div className="grid gap-3">
              <Button className="h-14 text-base" disabled={!mapsUrl} asChild={Boolean(mapsUrl)}>
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" onClick={enviarLocalizacaoAtual}>
                    <Navigation className="h-5 w-5" />
                    Abrir entrega atual no Google Maps
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
                disabled={atualizarParada.isPending}
                onClick={() => atualizarParada.mutate({ paradaId: paradaAtual.id, status: "ENTREGUE" })}
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
                disabled={atualizarParada.isPending}
                onClick={() =>
                  atualizarParada.mutate({
                    paradaId: paradaAtual.id,
                    status: "PROBLEMA",
                    observacoesProblema: problemaTexto,
                  })
                }
              >
                <AlertTriangle className="h-4 w-4" />
                Problema na entrega
              </Button>

              <Button
                className="h-12"
                variant="outline"
                disabled={atualizarParada.isPending}
                onClick={() => atualizarParada.mutate({ paradaId: paradaAtual.id, status: "PULADA" })}
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
