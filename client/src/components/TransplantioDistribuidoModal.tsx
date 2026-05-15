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
import { capacidadeAndar, contarPlantasAndar, contarVaziosAndar, andarDentroDoModeloDaTorre } from "@/lib/utils-farm";
import { torreReservadaGrelhaBabyLeaf } from "@/lib/planejamentoContinuo";
import {
  resolverFaseDestinoTransplantio,
  type FaseDestinoTransplantioFv,
} from "@shared/transplantioDestino";
import { variedadePulaVegetativa } from "@shared/variedadesFase";

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
  const origemQtd = useMemo(() => {
    if (!origemAndar || !origemTorre) return 0;
    return contarPlantasAndar(origemAndar, origemTorre.fase as Fase, projetoTipo);
  }, [origemAndar, origemTorre, projetoTipo]);

  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (!open) {
      setDestinos([]);
      setObs("");
      return;
    }
    if (podeEscolherFaseDestino) {
      setDestinoFase(pulaVegetativa ? "maturacao" : "vegetativa");
    }
  }, [open, podeEscolherFaseDestino, pulaVegetativa]);

  useEffect(() => {
    setDestinos([]);
  }, [faseDestino]);

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
      .sort((x, y) => y.capDisp - x.capDisp);
  }, [faseDestino, torres, andares, projetoTipo]);

  const totalDistribuido = destinos.reduce((s, d) => s + d.quantidade, 0);
  const faltam = origemQtd - totalDistribuido;

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
  };

  const confirmar = async () => {
    if (!origemAndar || !origemTorre || !faseDestino) return;
    if (!origemAndarDbId) return;
    if (destinos.length === 0) {
      toast.error("Selecione pelo menos um destino.");
      return;
    }
    if (totalDistribuido !== origemQtd) {
      toast.error(`Distribua exatamente ${origemQtd}. Você distribuiu ${totalDistribuido}.`);
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
        destinos: destinos.map((d) => ({ andarDestinoId: d.andarIdDb, quantidade: d.quantidade })),
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

  const unidadeLabel = origemTorre?.fase === "mudas" ? "perfis" : "plantas";

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
              </div>
            </Card>

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
                {faltam === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ OK</span>
                ) : (
                  <span className="text-red-600 font-semibold">Faltam: {faltam}</span>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={autoDistribuir}>
                ⚡ Distribuir automaticamente
              </Button>
              <Button
                className="flex-1"
                onClick={confirmar}
                disabled={faltam !== 0 || transplantar.isPending}
              >
                {transplantar.isPending ? "Transferindo..." : "✓ Confirmar"}
              </Button>
            </div>
            {faltam !== 0 && (
              <p className="text-xs text-amber-700">
                A confirmação só libera quando a distribuição fecha exatamente a quantidade de origem.
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

