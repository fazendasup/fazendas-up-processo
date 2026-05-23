import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { Andar, Torre, Fase, VariedadeConfig } from "@/lib/types";
import {
  capacidadeAndar,
  contarVaziosAndar,
  andarDentroDoModeloDaTorre,
  quantidadePlantasPerfilMudas,
} from "@/lib/utils-farm";
import { labelPosicaoProducao } from "@/lib/microverdesPhases";
import { torreReservadaGrelhaBabyLeaf } from "@/lib/planejamentoContinuo";
import {
  resolverFaseDestinoTransplantio,
  type FaseDestinoTransplantioFv,
} from "@shared/transplantioDestino";
import { PLANTAS_POR_PERFIL_FV } from "@shared/plantasPorPerfil";
import { variedadePulaVegetativa } from "@shared/variedadesFase";

function datetimeLocalValue(d: Date = new Date()): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function rotuloTorreDestino(torre: Torre): string {
  const baby = torreReservadaGrelhaBabyLeaf(torre as Parameters<typeof torreReservadaGrelhaBabyLeaf>[0]);
  return baby ? `${torre.nome} · 12×6 baby leaf` : torre.nome;
}

type Destino = {
  andarIdFront: string;
  andarIdDb: number;
  torreNome: string;
  andarNumero: number;
  capacidadeTotal: number;
  capacidadeUsada: number;
  capacidadeDisponivel: number;
  quantidade: number;
};

export function TransplantioDistribuidoModal({
  open,
  onOpenChange,
  origemAndar,
  origemTorre,
  torres,
  andares,
  origemAndarDbId,
  resolver,
  projetoTipo,
  variedades,
  initialPerfilIndices,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  origemAndar: Andar | null;
  origemTorre: Torre | null;
  torres: Torre[];
  andares: Andar[];
  origemAndarDbId: number | null;
  resolver: {
    andarFrontIdToDbId: Map<string, number>;
  };
  /** Alinha capacidade e fase destino ao modelo microverdes (mudas → iluminação). */
  projetoTipo?: string | null;
  variedades?: VariedadeConfig[];
  /** Pré-seleção (ex.: perfis marcados no grid antes de abrir o modal). */
  initialPerfilIndices?: number[];
}) {
  const utils = trpc.useUtils();
  const transplantar = trpc.andares.transplantarDistribuido.useMutation();

  const slugVariedadeOrigem = useMemo(() => {
    const p = origemAndar?.perfis?.find((x) => x.ativo && x.variedadeId);
    return p?.variedadeId ?? null;
  }, [origemAndar]);

  const nomeVariedadeOrigem = useMemo(() => {
    if (!slugVariedadeOrigem) return undefined;
    return variedades?.find((v) => v.id === slugVariedadeOrigem)?.nome;
  }, [slugVariedadeOrigem, variedades]);

  const pulaVegetativa = variedadePulaVegetativa(slugVariedadeOrigem, nomeVariedadeOrigem);

  const podeEscolherFaseDestino =
    origemTorre?.fase === "mudas" && projetoTipo !== "microverdes";

  const [destinoFase, setDestinoFase] = useState<FaseDestinoTransplantioFv>("vegetativa");

  const faseDestino = useMemo((): Fase | null => {
    if (!origemTorre) return null;
    if (origemTorre.fase === "mudas" || origemTorre.fase === "vegetativa") {
      return resolverFaseDestinoTransplantio(origemTorre.fase, {
        pulaVegetativa,
        faseDestinoInformada: podeEscolherFaseDestino ? destinoFase : null,
        projetoTipo,
      });
    }
    return null;
  }, [origemTorre, pulaVegetativa, podeEscolherFaseDestino, destinoFase, projetoTipo]);
  const perfisDisponiveisOrigem = useMemo(() => {
    if (!origemAndar || !origemTorre) return [] as number[];
    if (origemTorre.fase === "mudas") {
      return (origemAndar.perfis || [])
        .filter((p) => p.ativo)
        .map((p) => p.perfilIndex)
        .sort((a, b) => a - b);
    }
    const indices = new Set<number>();
    for (const f of origemAndar.furos || []) {
      if (f.status === "plantado") indices.add(f.perfilIndex);
    }
    return Array.from(indices).sort((a, b) => a - b);
  }, [origemAndar, origemTorre]);

  const plantasPorPerfilMudasUi =
    origemTorre?.fase === "mudas" && projetoTipo !== "microverdes"
      ? PLANTAS_POR_PERFIL_FV.mudas
      : 1;

  const [perfisSelecionados, setPerfisSelecionados] = useState<number[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [quantidadeDescarte, setQuantidadeDescarte] = useState("0");
  const [motivoDescarte, setMotivoDescarte] = useState("");
  const [dataHora, setDataHora] = useState(datetimeLocalValue);
  const [obs, setObs] = useState("");

  const origemQtd = useMemo(() => {
    if (!origemAndar || !origemTorre || perfisSelecionados.length === 0) return 0;
    if (origemTorre.fase === "mudas") {
      if (projetoTipo === "microverdes") return perfisSelecionados.length;
      return (origemAndar.perfis || [])
        .filter((p) => p.ativo && perfisSelecionados.includes(p.perfilIndex))
        .reduce((sum, p) => sum + quantidadePlantasPerfilMudas(p, plantasPorPerfilMudasUi), 0);
    }
    return (origemAndar.furos || []).filter(
      (f) => f.status === "plantado" && perfisSelecionados.includes(f.perfilIndex),
    ).length;
  }, [origemAndar, origemTorre, perfisSelecionados, projetoTipo, plantasPorPerfilMudasUi]);

  useEffect(() => {
    if (!open) {
      setDestinos([]);
      setObs("");
      setQuantidadeDescarte("0");
      setMotivoDescarte("");
      setDataHora(datetimeLocalValue());
      setPerfisSelecionados([]);
      return;
    }
    if (podeEscolherFaseDestino) {
      setDestinoFase(pulaVegetativa ? "maturacao" : "vegetativa");
    }
    const base = initialPerfilIndices?.length
      ? initialPerfilIndices.filter((i) => perfisDisponiveisOrigem.includes(i))
      : [];
    setPerfisSelecionados(base);
  }, [open, podeEscolherFaseDestino, pulaVegetativa, initialPerfilIndices, perfisDisponiveisOrigem]);

  useEffect(() => {
    setDestinos([]);
    setQuantidadeDescarte("0");
    setMotivoDescarte("");
  }, [faseDestino, perfisSelecionados]);

  const destinosDisponiveis = useMemo(() => {
    if (!faseDestino) return [];
    /** Todas as torres da fase destino (incl. 12×6 baby leaf); não filtra por variedade. */
    const torresDestino = torres.filter((t) => t.fase === faseDestino && t.ativa !== false);
    const torreById = new Map(torresDestino.map((t) => [t.id, t]));
    return andares
      .filter((a) => {
        const t = torreById.get(a.torreId);
        return !!t && andarDentroDoModeloDaTorre(a, t);
      })
      .map((a) => {
        const torre = torreById.get(a.torreId)!;
        const cap = capacidadeAndar(faseDestino, projetoTipo, torre.estruturaOverride ?? null);
        // Espaço real = furos `vazio` (plantado+colhido ocupam; servidor só grava em vazios).
        const disp = contarVaziosAndar(a, faseDestino, projetoTipo, torre.estruturaOverride ?? null);
        const usada = Math.max(0, cap - disp);
        return {
          andar: a,
          torre,
          capTotal: cap,
          capUsada: usada,
          capDisp: disp,
        };
      })
      .sort((x, y) => {
        const xParcial = x.capUsada > 0 && x.capDisp > 0 ? 1 : 0;
        const yParcial = y.capUsada > 0 && y.capDisp > 0 ? 1 : 0;
        if (xParcial !== yParcial) return yParcial - xParcial;
        return y.capDisp - x.capDisp;
      });
  }, [faseDestino, torres, andares, projetoTipo]);

  const totalDistribuido = destinos.reduce((s, d) => s + d.quantidade, 0);
  const descarteQtd = Math.max(0, Math.floor(Number(quantidadeDescarte || 0)));
  const totalProcessado = totalDistribuido + descarteQtd;
  const faltam = origemQtd - totalProcessado;
  const excedente = Math.max(0, totalProcessado - origemQtd);
  const destinosComQuantidade = destinos.filter((d) => d.quantidade > 0);

  const addDestino = (andarFrontId: string) => {
    const item = destinosDisponiveis.find((d) => d.andar.id === andarFrontId);
    if (!item) return;
    if (destinos.some((x) => x.andarIdFront === andarFrontId)) return;
    const andarIdDb = resolver.andarFrontIdToDbId.get(item.andar.id);
    if (!andarIdDb) return;
    setDestinos((prev) => [
      ...prev,
      {
        andarIdFront: item.andar.id,
        andarIdDb,
        torreNome: rotuloTorreDestino(item.torre),
        andarNumero: item.andar.numero,
        capacidadeTotal: item.capTotal,
        capacidadeUsada: item.capUsada,
        capacidadeDisponivel: item.capDisp,
        quantidade: 0,
      },
    ]);
  };

  const autoDistribuir = () => {
    if (!origemQtd) return;
    const novo: Destino[] = [];
    let restantes = origemQtd;
    for (const item of destinosDisponiveis) {
      if (restantes <= 0) break;
      if (item.capDisp <= 0) continue;
      const andarIdDb = resolver.andarFrontIdToDbId.get(item.andar.id);
      if (!andarIdDb) continue;
      const q = Math.min(item.capDisp, restantes);
      novo.push({
        andarIdFront: item.andar.id,
        andarIdDb,
        torreNome: rotuloTorreDestino(item.torre),
        andarNumero: item.andar.numero,
        capacidadeTotal: item.capTotal,
        capacidadeUsada: item.capUsada,
        capacidadeDisponivel: item.capDisp,
        quantidade: q,
      });
      restantes -= q;
    }
    setDestinos(novo);
    setQuantidadeDescarte("0");
  };

  const confirmar = async () => {
    if (!origemAndar || !origemTorre || !faseDestino) return;
    if (!origemAndarDbId) return;
    if (perfisSelecionados.length === 0) {
      toast.error(
        origemTorre.fase === "mudas"
          ? projetoTipo === "microverdes"
            ? "Selecione ao menos uma bandeja de origem."
            : "Selecione ao menos um perfil de origem."
          : "Selecione ao menos um perfil com plantas na origem.",
      );
      return;
    }
    if (destinosComQuantidade.length === 0 && descarteQtd === 0) {
      toast.error("Selecione pelo menos um destino ou informe descarte.");
      return;
    }
    if (origemQtd === 0) {
      toast.error("Nada para transplantar na seleção de origem.");
      return;
    }
    const dataHoraReal = new Date(dataHora);
    if (!dataHora || Number.isNaN(dataHoraReal.getTime())) {
      toast.error("Informe uma data/hora real de transplantio válida.");
      return;
    }
    if (totalProcessado !== origemQtd) {
      toast.error(`Distribua e/ou descarte exatamente ${origemQtd}. Processado: ${totalProcessado}.`);
      return;
    }
    const overflow = destinos.find((d) => d.quantidade > d.capacidadeDisponivel);
    if (overflow) {
      toast.error(`${overflow.torreNome} Andar ${overflow.andarNumero} sem capacidade (máx ${overflow.capacidadeDisponivel}).`);
      return;
    }

    try {
      await transplantar.mutateAsync({
        andarOrigemId: origemAndarDbId,
        perfilIndicesOrigem: perfisSelecionados,
        dataHora: dataHoraReal,
        destinos: destinosComQuantidade.map((d) => ({ andarDestinoId: d.andarIdDb, quantidade: d.quantidade })),
        quantidadeDesperdicio: descarteQtd,
        motivoDesperdicio: descarteQtd > 0 ? motivoDescarte.trim() || "descarte_no_transplantio" : undefined,
        observacoes: obs.trim() || undefined,
        ...(origemTorre.fase === "mudas" ? { faseDestino: faseDestino as FaseDestinoTransplantioFv } : {}),
      });
      // Garante atualização imediata do estado global após o transplantio.
      await utils.fazenda.loadAll.invalidate();
      await utils.fazenda.loadAll.fetch();
      toast.success("Transplantio concluído.");
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message || err?.data?.message || "Não foi possível concluir o transplantio.";
      toast.error(msg);
    }
  };

  const unidadeLabel =
    origemTorre?.fase === "mudas" && projetoTipo === "microverdes" ? "bandejas" : "plantas";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🌱 Transplantio inteligente</DialogTitle>
        </DialogHeader>

        {!origemAndar || !origemTorre || !faseDestino ? (
          <div className="text-sm text-muted-foreground">Selecione um andar de origem válido.</div>
        ) : (
          <div className="space-y-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="font-semibold">Origem</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <p>
                  <strong>Torre:</strong> {origemTorre.nome}
                </p>
                <p>
                  <strong>Andar:</strong> {origemAndar.numero}
                </p>
                <p>
                  <strong>Fase:</strong> {origemTorre.fase}
                </p>
                <p>
                  <strong>Quantidade:</strong> {origemQtd} {unidadeLabel}
                </p>
                {origemTorre.fase === "mudas" && projetoTipo !== "microverdes" && perfisDisponiveisOrigem.length > 0 && (
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Quantidade por perfil vem do plantio registrado; perfis antigos sem quantidade usam {PLANTAS_POR_PERFIL_FV.mudas}.
                  </p>
                )}
              </div>
            </Card>

            <SelecaoPerfisOrigem
              origemTorre={origemTorre}
              origemAndar={origemAndar}
              projetoTipo={projetoTipo}
              perfisDisponiveisOrigem={perfisDisponiveisOrigem}
              perfisSelecionados={perfisSelecionados}
              setPerfisSelecionados={setPerfisSelecionados}
              plantasPorPerfilMudasUi={plantasPorPerfilMudasUi}
              variedades={variedades}
              unidadeLabel={unidadeLabel}
              origemQtd={origemQtd}
            />

            {podeEscolherFaseDestino && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-semibold">Fase de destino</p>
                <RadioGroup
                  value={destinoFase}
                  onValueChange={(v) => setDestinoFase(v as FaseDestinoTransplantioFv)}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <div className="flex items-start gap-2 rounded-md border bg-card p-2.5">
                    <RadioGroupItem value="vegetativa" id="dest-veg" className="mt-0.5" />
                    <Label htmlFor="dest-veg" className="cursor-pointer text-xs font-normal leading-snug">
                      <span className="font-medium text-foreground">Vegetativa</span>
                      <span className="mt-0.5 block text-muted-foreground">
                        Fluxo padrão (ex.: alface) — torres de vegetativa, incluindo grelha 12×6 se houver.
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-start gap-2 rounded-md border bg-card p-2.5">
                    <RadioGroupItem value="maturacao" id="dest-mat" className="mt-0.5" />
                    <Label htmlFor="dest-mat" className="cursor-pointer text-xs font-normal leading-snug">
                      <span className="font-medium text-foreground">Maturação (direto)</span>
                      <span className="mt-0.5 block text-muted-foreground">
                        Pula a vegetativa — todas as torres de maturação, incluindo baby leaf (12×6).
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
                {pulaVegetativa && destinoFase === "vegetativa" && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Esta variedade costuma ir direto para maturação; confirme se quer mesmo passar pela vegetativa.
                  </p>
                )}
              </div>
            )}

            <Alert>
              <AlertDescription>
                Distribua <strong>{origemQtd}</strong> {unidadeLabel} para <strong>{faseDestino}</strong>.{" "}
                Já distribuído: <strong>{totalDistribuido}</strong>.{" "}
                Descarte: <strong>{descarteQtd}</strong>.{" "}
                {faltam === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ OK</span>
                ) : excedente > 0 ? (
                  <span className="text-red-600 font-semibold">Excedente: {excedente}</span>
                ) : (
                  <span className="text-red-600 font-semibold">Faltam: {faltam}</span>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
              <Label className="text-xs">Data/hora real do transplantio</Label>
              <Input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Use a data em que o transplantio realmente aconteceu, mesmo se estiver registrando depois.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border bg-amber-50/60 p-3 dark:bg-amber-950/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Descarte no transplantio</p>
                  <p className="text-xs text-muted-foreground">
                    Use quando parte das mudas/plantas não será aproveitada. O descarte limpa a origem e entra no histórico.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={origemQtd <= totalDistribuido}
                  onClick={() => setQuantidadeDescarte(String(Math.max(0, origemQtd - totalDistribuido)))}
                >
                  Descartar faltantes
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min={0}
                    max={Math.max(0, origemQtd - totalDistribuido)}
                    value={quantidadeDescarte}
                    onChange={(e) => setQuantidadeDescarte(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Motivo</Label>
                  <Input
                    value={motivoDescarte}
                    onChange={(e) => setMotivoDescarte(e.target.value)}
                    placeholder="Ex.: mudas fracas, raízes ruins, descarte operacional..."
                    className="h-9"
                    disabled={descarteQtd === 0}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={autoDistribuir}>
                ⚡ Distribuir automaticamente
              </Button>
              <Button
                className="flex-1"
                onClick={confirmar}
                disabled={faltam !== 0 || excedente > 0 || transplantar.isPending || perfisSelecionados.length === 0 || origemQtd === 0}
              >
                {transplantar.isPending ? "Transferindo..." : "✓ Confirmar"}
              </Button>
            </div>
            {faltam !== 0 && (
              <p className="text-xs text-amber-700">
                A confirmação libera quando a soma de destino + descarte fecha exatamente a quantidade de origem.
              </p>
            )}

            <div className="space-y-2">
              <p className="font-semibold">Destinos selecionados</p>
              {destinos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum destino selecionado.</p>
              ) : (
                <div className="space-y-2">
                  {destinos.map((d, idx) => (
                    <Card key={d.andarIdFront} className="p-3 border-l-4 border-l-emerald-500">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{d.torreNome} — Andar {d.andarNumero}</p>
                          <p className="text-xs text-muted-foreground">
                            Capacidade: {d.capacidadeUsada}/{d.capacidadeTotal} (disp {d.capacidadeDisponivel})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={d.capacidadeDisponivel}
                            value={d.quantidade}
                            onChange={(e) => {
                              const v = Math.max(0, Math.floor(Number(e.target.value || 0)));
                              setDestinos((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], quantidade: v };
                                return next;
                              });
                            }}
                            className="w-24 h-9"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDestinos((prev) => prev.filter((x) => x.andarIdFront !== d.andarIdFront))}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Adicionar destinos</p>
              <div className="max-h-56 overflow-y-auto space-y-2">
                {destinosDisponiveis.map((x) => {
                  const ja = destinos.some((d) => d.andarIdFront === x.andar.id);
                  const disabled = ja || x.capDisp === 0;
                  return (
                    <Card
                      key={x.andar.id}
                      className={`p-3 ${disabled ? "opacity-60" : "hover:bg-accent/50"} transition`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            {rotuloTorreDestino(x.torre)} — Andar {x.andar.numero}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {x.capUsada}/{x.capTotal} (disp {x.capDisp})
                            {x.capUsada > 0 && x.capDisp > 0 ? (
                              <span className="ml-1 font-semibold text-emerald-700 dark:text-emerald-300">· parcial com espaço</span>
                            ) : null}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disabled}
                          onClick={() => addDestino(x.andar.id)}
                        >
                          {ja ? "✓" : "+ Adicionar"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Observações (opcional)</p>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Motivo / ocorrências..." />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SelecaoPerfisOrigem({
  origemTorre,
  origemAndar,
  projetoTipo,
  perfisDisponiveisOrigem,
  perfisSelecionados,
  setPerfisSelecionados,
  plantasPorPerfilMudasUi,
  variedades,
  unidadeLabel,
  origemQtd,
}: {
  origemTorre: Torre;
  origemAndar: Andar;
  projetoTipo?: string | null;
  perfisDisponiveisOrigem: number[];
  perfisSelecionados: number[];
  setPerfisSelecionados: React.Dispatch<React.SetStateAction<number[]>>;
  plantasPorPerfilMudasUi: number;
  variedades?: VariedadeConfig[];
  unidadeLabel: string;
  origemQtd: number;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-semibold">
        {origemTorre.fase === "mudas"
          ? projetoTipo === "microverdes"
            ? "Bandejas de origem"
            : "Perfis de origem"
          : "Perfis de origem (vegetativa)"}
      </p>
      {perfisDisponiveisOrigem.length === 0 ? (
        <p className="text-xs text-amber-700">
          {origemTorre.fase === "mudas"
            ? "Nenhum perfil/bandeja ativo neste andar."
            : "Nenhum perfil com plantas neste andar."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {perfisDisponiveisOrigem.map((idx) => {
            const marcado = perfisSelecionados.includes(idx);
            const perfil = origemAndar.perfis?.find((p) => p.perfilIndex === idx);
            const varNome = perfil?.variedadeId
              ? variedades?.find((v) => v.id === perfil.variedadeId)?.nome
              : null;
            const qtdPerfil =
              origemTorre.fase === "mudas"
                ? projetoTipo === "microverdes"
                  ? 1
                  : quantidadePlantasPerfilMudas(perfil, plantasPorPerfilMudasUi)
                : (origemAndar.furos || []).filter(
                    (f) => f.perfilIndex === idx && f.status === "plantado",
                  ).length;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPerfisSelecionados((prev) =>
                    marcado ? prev.filter((i) => i !== idx) : [...prev, idx].sort((a, b) => a - b),
                  );
                }}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  marcado
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300"
                    : "border-border bg-card text-muted-foreground hover:bg-accent/50"
                }`}
              >
                <span className="font-semibold">{labelPosicaoProducao(projetoTipo, idx)}</span>
                {varNome && <span className="ml-1 text-muted-foreground">· {varNome}</span>}
                <span className="mt-0.5 block text-[10px]">
                  {qtdPerfil} {unidadeLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={perfisDisponiveisOrigem.length === 0}
          onClick={() => setPerfisSelecionados([...perfisDisponiveisOrigem])}
        >
          Selecionar todos
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setPerfisSelecionados([])}
        >
          Limpar seleção
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Selecionados: <strong>{perfisSelecionados.length}</strong> · Quantidade a distribuir:{" "}
        <strong>{origemQtd}</strong> {unidadeLabel}
      </p>
    </div>
  );
}

