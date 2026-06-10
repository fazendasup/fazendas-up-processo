import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Edit3,
  MapPin,
  Navigation,
  Plus,
  RefreshCcw,
  Route,
  Save,
  Smartphone,
  Trash2,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/Map";
import { createMapMarker } from "@/lib/googleMapsLoader";
import { trpc } from "@/lib/trpc";
import {
  diaOperacionalInicial,
  labelStatusParada,
  labelStatusRota,
  linkGoogleMaps,
  linkGoogleMapsRota,
  trackingUrlAbsoluto,
} from "@/lib/entregas";
import { cn } from "@/lib/utils";

type RoteiroRota = {
  id: string;
  status: string;
  nome: string | null;
  entregadorId: string | null;
  entregadorNome: string | null;
  localizacao: {
    latitude: number;
    longitude: number;
    precisaoMetros: number | null;
    atualizadaEm: string | Date | null;
  } | null;
  paradas: Array<{
    id: string;
    ordem: number;
    status: string;
    clienteNome: string;
    endereco: string | null;
  }>;
};

export function Entregas() {
  const utils = trpc.useUtils();
  const [dia, setDia] = useState(diaOperacionalInicial());
  const diaDate = useMemo(() => new Date(`${dia}T12:00:00`), [dia]);
  const [nomeRota, setNomeRota] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteManualId, setClienteManualId] = useState("");
  const [rotaSelecionadaId, setRotaSelecionadaId] = useState<string | null>(null);

  const roteiro = trpc.comercial.entregas.roteiro.useQuery(
    { dia: diaDate, rotaId: rotaSelecionadaId ?? undefined },
    { refetchInterval: 60_000 },
  );
  const entregadores = trpc.comercial.entregas.listarEntregadores.useQuery();
  const [entregadorId, setEntregadorId] = useState("");

  useEffect(() => {
    if (!rotaSelecionadaId && roteiro.data?.rota?.id) {
      setRotaSelecionadaId(roteiro.data.rota.id);
    }
  }, [roteiro.data?.rota?.id, rotaSelecionadaId]);

  useEffect(() => {
    const rotaAtual = roteiro.data?.rota ?? null;
    setNomeRota(rotaAtual?.nome ?? "");
    setEntregadorId(rotaAtual?.entregadorId ?? "");
  }, [roteiro.data?.rota?.id, roteiro.data?.rota?.nome, roteiro.data?.rota?.entregadorId]);

  const criarManual = trpc.comercial.entregas.criarRotaManual.useMutation({
    onSuccess: async (data) => {
      toast.success("Rota manual criada.");
      if (data.rota?.id) setRotaSelecionadaId(data.rota.id);
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const atualizarRota = trpc.comercial.entregas.atualizarRota.useMutation({
    onSuccess: async () => {
      toast.success("Rota atualizada.");
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const excluirRota = trpc.comercial.entregas.excluirRota.useMutation({
    onSuccess: async () => {
      toast.success("Rota excluída.");
      setRotaSelecionadaId(null);
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const adicionarParada = trpc.comercial.entregas.adicionarParadaManual.useMutation({
    onSuccess: async () => {
      toast.success("Cliente adicionado à rota.");
      setClienteManualId("");
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removerParada = trpc.comercial.entregas.removerParada.useMutation({
    onSuccess: async () => {
      toast.success("Parada removida.");
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const gerar = trpc.comercial.entregas.gerarRoteiro.useMutation({
    onSuccess: async (data) => {
      toast.success("Nova rota gerada.");
      if (data.rota?.id) setRotaSelecionadaId(data.rota.id);
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const salvarOrdem = trpc.comercial.entregas.salvarOrdem.useMutation({
    onSuccess: async () => {
      toast.success("Ordem salva.");
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const atribuir = trpc.comercial.entregas.atribuirEntregador.useMutation({
    onSuccess: async () => {
      toast.success("Entregador atualizado.");
      await utils.comercial.entregas.roteiro.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rota = roteiro.data?.rota ?? null;
  const rotas = roteiro.data?.rotas ?? [];
  const planejadas = roteiro.data?.planejadas ?? [];
  const paradas = rota?.paradas ?? [];
  const rotaEditavel = rota?.status === "PLANEJADA";
  const rotaPodeExcluir = rota ? rota.status !== "EM_ROTA" : false;
  const rotaMapsUrl = linkGoogleMapsRota(paradas);
  const clientesProgramadosDisponiveis = useMemo(() => {
    const idsNaRota = new Set(paradas.map((p) => p.contaAzulCustomerId));
    const termo = buscaCliente.trim().toLocaleLowerCase("pt-BR");
    return planejadas.filter((item) => {
      if (idsNaRota.has(item.contaAzulCustomerId)) return false;
      if (!termo) return true;
      return item.clienteNome.toLocaleLowerCase("pt-BR").includes(termo);
    });
  }, [buscaCliente, paradas, planejadas]);

  const moverParada = (index: number, direcao: -1 | 1) => {
    if (!rota) return;
    const novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= paradas.length) return;
    const ids = paradas.map((p) => p.id);
    const [item] = ids.splice(index, 1);
    ids.splice(novoIndex, 0, item);
    salvarOrdem.mutate({ rotaId: rota.id, paradaIds: ids });
  };

  const copiarLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(trackingUrlAbsoluto(token));
      toast.success("Link de rastreio copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Logística"
        title="Roteiro do dia"
        subtitle="Monte a rota de entregas, priorize paradas e compartilhe o rastreamento com clientes."
        actions={
          <>
            <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="w-auto" />
            <Button
              variant="outline"
              onClick={() => void utils.comercial.entregas.roteiro.invalidate()}
              disabled={roteiro.isFetching}
            >
              <RefreshCcw className={cn("h-4 w-4", roteiro.isFetching && "animate-spin")} />
              Atualizar
            </Button>
            <Button
              onClick={() =>
                gerar.mutate({
                  dia: diaDate,
                  entregadorId: entregadorId || undefined,
                })
              }
              disabled={gerar.isPending || planejadas.length === 0}
            >
              <Route className="h-4 w-4" />
              Gerar nova rota
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                criarManual.mutate({
                  dia: diaDate,
                  nome: nomeRota || undefined,
                  entregadorId: entregadorId || undefined,
                })
              }
              disabled={criarManual.isPending}
            >
              <Plus className="h-4 w-4" />
              Criar rota vazia
            </Button>
            {rota ? (
              <Button asChild variant="secondary">
                <Link href={`/comercial/entregador?dia=${dia}&rota=${rota.id}`}>
                  <Smartphone className="h-4 w-4" />
                  Modo entregador
                </Link>
              </Button>
            ) : null}
            {rotaMapsUrl ? (
              <Button asChild>
                <a href={rotaMapsUrl} target="_blank" rel="noreferrer">
                  <Navigation className="h-4 w-4" />
                  Abrir rota no Maps
                </a>
              </Button>
            ) : null}
          </>
        }
      />

      <LiveRouteMap rotas={rotas} rotaSelecionadaId={rota?.id ?? null} />

      {rotas.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rotas do dia ({rotas.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rotas.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2",
                  item.id === rota?.id ? "border-primary bg-primary/5" : "border-border/70",
                )}
              >
                <Button
                  size="sm"
                  variant={item.id === rota?.id ? "default" : "ghost"}
                  onClick={() => setRotaSelecionadaId(item.id)}
                >
                  {item.nome ?? "Rota"}
                  {item.entregadorNome ? ` · ${item.entregadorNome}` : ""}
                  <Badge className="ml-2" variant="secondary">
                    {labelStatusRota(item.status)}
                  </Badge>
                </Button>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRotaSelecionadaId(item.id);
                      toast.info(
                        item.status === "PLANEJADA"
                          ? "Edite nome, entregador, paradas e ordem no painel abaixo."
                          : "Rotas em andamento ou concluídas ficam fechadas para edição. Rotas concluídas podem ser excluídas.",
                      );
                    }}
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={item.status === "EM_ROTA" || excluirRota.isPending}
                    onClick={() => {
                      setRotaSelecionadaId(item.id);
                      if (window.confirm("Excluir esta rota e todas as paradas?")) {
                        excluirRota.mutate({ rotaId: item.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5" />
              Paradas do dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!rota && planejadas.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {planejadas.length} cliente(s) com entrega prevista. Clique em &quot;Gerar roteiro&quot; para montar a rota.
              </p>
            ) : null}
            {!rota && planejadas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma entrega planejada para este dia.</p>
            ) : null}

            {rota ? (
              <div className="flex flex-wrap items-center gap-2 pb-2">
                <Badge variant="outline">{labelStatusRota(rota.status)}</Badge>
                {rota.entregadorNome ? <Badge variant="secondary">{rota.entregadorNome}</Badge> : null}
                {rota.localizacao ? (
                  <Badge variant="outline">
                    GPS {new Date(rota.localizacao.atualizadaEm ?? "").toLocaleTimeString("pt-BR")}
                  </Badge>
                ) : null}
                {rota.status === "CONCLUIDA" ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Rota finalizada
                  </span>
                ) : null}
              </div>
            ) : null}

            {paradas.map((parada, index) => (
              <div
                key={parada.id}
                className="rounded-xl border border-border/70 p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {parada.ordem}
                      </span>
                      <div>
                        <p className="font-semibold">{parada.clienteNome}</p>
                        <p className="text-xs text-muted-foreground">
                          {parada.periodoEntrega === "MANHA"
                            ? "Manhã"
                            : parada.periodoEntrega === "TARDE"
                              ? "Tarde"
                              : "Sem período"}
                          {parada.horarioMaximoEntrega ? ` · até ${parada.horarioMaximoEntrega}` : ""}
                        </p>
                      </div>
                    </div>
                    {parada.endereco ? (
                      <p className="mt-2 flex items-start gap-1 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        {parada.endereco}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge>{labelStatusParada(parada.status)}</Badge>
                    <div className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={index === 0 || salvarOrdem.isPending || !rotaEditavel}
                        onClick={() => moverParada(index, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={index === paradas.length - 1 || salvarOrdem.isPending || !rotaEditavel}
                        onClick={() => moverParada(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {linkGoogleMaps(parada.endereco) ? (
                    <Button size="sm" asChild>
                      <a href={linkGoogleMaps(parada.endereco)!} target="_blank" rel="noreferrer">
                        <Navigation className="h-4 w-4" />
                        Abrir no Google Maps
                      </a>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => void copiarLink(parada.tokenPublico)}>
                    <Copy className="h-4 w-4" />
                    Copiar rastreio do cliente
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={removerParada.isPending || !rotaEditavel}
                    onClick={() => removerParada.mutate({ paradaId: parada.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Planejamento sugerido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {planejadas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem clientes para este dia.</p>
              ) : (
                planejadas.map((item) => (
                  <div key={item.contaAzulCustomerId} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.clienteNome}</span>
                      <span className="text-xs text-muted-foreground">#{item.ordemSugerida}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.itensCount} item(ns) · {item.pedidosCount} pedido(s)
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {rota ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Editar rota</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="nome-rota">Nome da rota</Label>
                  <Input
                    id="nome-rota"
                    value={nomeRota}
                    onChange={(e) => setNomeRota(e.target.value)}
                    placeholder="Ex.: Rota segunda-feira"
                    disabled={!rotaEditavel}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entregador">Responsável pela rota</Label>
                  <select
                    id="entregador"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={entregadorId || rota.entregadorId || ""}
                    onChange={(e) => setEntregadorId(e.target.value)}
                    disabled={!rotaEditavel}
                  >
                    <option value="">Selecionar entregador</option>
                    {(entregadores.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={!rotaEditavel || atribuir.isPending || atualizarRota.isPending}
                  onClick={() =>
                    atualizarRota.mutate({
                      rotaId: rota.id,
                      nome: nomeRota || undefined,
                      entregadorId: entregadorId || rota.entregadorId || null,
                    })
                  }
                >
                  <Save className="h-4 w-4" />
                  Salvar rota
                </Button>
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={!rotaPodeExcluir || excluirRota.isPending}
                  onClick={() => {
                    if (window.confirm("Excluir esta rota e todas as paradas?")) {
                      excluirRota.mutate({ rotaId: rota.id });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir rota
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {rota ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Adicionar cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="busca-cliente-rota">Buscar cliente programado</Label>
                  <Input
                    id="busca-cliente-rota"
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    placeholder="Nome do cliente com entrega no dia"
                    disabled={!rotaEditavel}
                  />
                </div>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={clienteManualId}
                  onChange={(e) => setClienteManualId(e.target.value)}
                  disabled={!rotaEditavel}
                >
                  <option value="">Selecionar cliente</option>
                  {clientesProgramadosDisponiveis.map((cliente) => (
                    <option key={cliente.contaAzulCustomerId} value={cliente.contaAzulCustomerId}>
                      {cliente.clienteNome}
                    </option>
                  ))}
                </select>
                {clientesProgramadosDisponiveis.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum cliente programado para este dia disponível para adicionar.
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  disabled={!clienteManualId || adicionarParada.isPending || !rotaEditavel}
                  onClick={() =>
                    adicionarParada.mutate({
                      rotaId: rota.id,
                      contaAzulCustomerId: clienteManualId,
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Adicionar à rota
                </Button>
                {!rotaEditavel ? (
                  <p className="text-xs text-muted-foreground">
                    Rotas em andamento ou concluídas ficam fechadas para edição.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const CORES_ENTREGADOR = ["#059669", "#2563eb", "#d97706", "#7c3aed", "#db2777", "#0891b2"];

function LiveRouteMap({
  rotas,
  rotaSelecionadaId,
}: {
  rotas: RoteiroRota[];
  rotaSelecionadaId: string | null;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const geocodeCacheRef = useRef(new Map<string, google.maps.LatLngLiteral>());

  useEffect(() => {
    if (!map || !window.google) return;

    let cancelled = false;
    const geocoder = new window.google.maps.Geocoder();

    const clearMarkers = () => {
      for (const marker of markersRef.current) marker.setMap(null);
      markersRef.current = [];
    };

    const addMarker = (position: google.maps.LatLngLiteral, title: string, color: string) => {
      const marker = createMapMarker(map, position, title, color);
      markersRef.current.push(marker);
      return marker;
    };

    const run = async () => {
      clearMarkers();
      const bounds = new window.google!.maps.LatLngBounds();
      let hasBounds = false;

      for (let rotaIndex = 0; rotaIndex < rotas.length; rotaIndex++) {
        const rota = rotas[rotaIndex]!;
        const cor = CORES_ENTREGADOR[rotaIndex % CORES_ENTREGADOR.length]!;
        const destaque = rota.id === rotaSelecionadaId;

        if (rota.localizacao) {
          const pos = {
            lat: rota.localizacao.latitude,
            lng: rota.localizacao.longitude,
          };
          addMarker(
            pos,
            rota.entregadorNome ? `Entregador: ${rota.entregadorNome}` : "Localização do entregador",
            cor,
          );
          bounds.extend(pos);
          hasBounds = true;
        }

        for (const parada of rota.paradas) {
          if (!parada.endereco?.trim()) continue;
          const cacheKey = parada.endereco.trim();
          let pos = geocodeCacheRef.current.get(cacheKey);
          if (!pos) {
            pos = await new Promise<google.maps.LatLngLiteral | null>((resolve) => {
              geocoder.geocode({ address: cacheKey }, (results, status) => {
                if (status !== "OK" || !results?.[0]?.geometry.location) {
                  resolve(null);
                  return;
                }
                const location = results[0].geometry.location;
                resolve({ lat: location.lat(), lng: location.lng() });
              });
            }) ?? undefined;
            if (pos) geocodeCacheRef.current.set(cacheKey, pos);
          }
          if (cancelled || !pos) continue;

          const statusColor =
            parada.status === "ENTREGUE"
              ? "#059669"
              : parada.status === "PROBLEMA"
                ? "#e11d48"
                : parada.status === "EM_ROTA"
                  ? "#2563eb"
                  : "#334155";
          addMarker(
            pos,
            `${rota.entregadorNome ?? "Rota"} · ${parada.ordem}. ${parada.clienteNome}`,
            statusColor,
          );
          bounds.extend(pos);
          hasBounds = true;
        }
      }

      if (!cancelled && hasBounds) {
        map.fitBounds(bounds, 64);
      }
    };

    void run();

    return () => {
      cancelled = true;
      clearMarkers();
    };
  }, [map, rotas, rotaSelecionadaId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          Mapa ao vivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <MapView
          className="h-[360px] overflow-hidden rounded-xl border border-border/70"
          initialCenter={{ lat: -15.7939, lng: -47.8828 }}
          initialZoom={5}
          onMapReady={setMap}
        />
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-emerald-600 px-2 py-1 font-semibold text-white">Entregador</span>
          <span className="rounded-full bg-blue-600 px-2 py-1 font-semibold text-white">Atual</span>
          <span className="rounded-full bg-slate-700 px-2 py-1 font-semibold text-white">Pendente</span>
          <span className="rounded-full bg-emerald-600 px-2 py-1 font-semibold text-white">Entregue</span>
          <span className="rounded-full bg-rose-600 px-2 py-1 font-semibold text-white">Problema</span>
        </div>
        {rotas.some((r) => r.localizacao) ? (
          <p className="text-sm text-muted-foreground">
            Acompanhe todas as rotas ativas no mapa. No modo navegação, o GPS do entregador atualiza em poucos
            segundos com o PWA aberto.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            O GPS aparece quando o entregador inicia a rota e mantém o PWA aberto durante a entrega.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
