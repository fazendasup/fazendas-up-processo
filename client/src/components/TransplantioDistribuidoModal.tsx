import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { Andar, Torre, Fase } from "@/lib/types";
import { capacidadeAndar, contarPlantasAndar, contarVaziosAndar, andarDentroDoModeloDaTorre } from "@/lib/utils-farm";
import { variedadePulaVegetativa } from "@shared/variedadesFase";

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

function proximaFase(
  fase: Fase,
  pulaVegetativa: boolean,
  projetoTipo: string | null | undefined,
): Fase | null {
  if (projetoTipo === "microverdes") {
    if (fase === "mudas") return "vegetativa";
    return null;
  }
  if (fase === "mudas") return pulaVegetativa ? "maturacao" : "vegetativa";
  if (fase === "vegetativa") return "maturacao";
  return null;
}

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
}) {
  const utils = trpc.useUtils();
  const transplantar = trpc.andares.transplantarDistribuido.useMutation();

  const slugVariedadeOrigem = useMemo(() => {
    const p = origemAndar?.perfis?.find((x) => x.ativo && x.variedadeId);
    return p?.variedadeId ?? null;
  }, [origemAndar]);

  const pulaVegetativa = variedadePulaVegetativa(slugVariedadeOrigem, undefined);

  const faseDestino = origemTorre
    ? proximaFase(origemTorre.fase as Fase, pulaVegetativa, projetoTipo)
    : null;
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
    }
  }, [open]);

  const destinosDisponiveis = useMemo(() => {
    if (!faseDestino) return [];
    const torresDestino = torres.filter((t) => t.fase === faseDestino);
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
        torreNome: item.torre.nome,
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
        torreNome: item.torre.nome,
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
                            {x.torre.nome} — Andar {x.andar.numero}
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

