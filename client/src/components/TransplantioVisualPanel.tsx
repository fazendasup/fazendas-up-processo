/**
 * Transplantio na própria página: torre destino → andares origem/destino →
 * quantidade que vai (com descarte do restante). Sem popup.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useRole } from "@/hooks/useRole";
import { wrapReadOnlyMutation } from "@/lib/readOnlyMutation";
import type { Andar, Torre, Fase, VariedadeConfig } from "@/lib/types";
import {
  capacidadeAndar,
  contarVaziosAndar,
  andarDentroDoModeloDaTorre,
  quantidadePlantasPerfilMudas,
  andaresDaTorreDeclarados,
} from "@/lib/utils-farm";
import { torreReservadaGrelhaBabyLeaf } from "@/lib/planejamentoContinuo";
import {
  resolverFaseDestinoTransplantio,
  type FaseDestinoTransplantioFv,
} from "@shared/transplantioDestino";
import { PLANTAS_POR_PERFIL_FV } from "@shared/plantasPorPerfil";
import { variedadePulaVegetativa } from "@shared/variedadesFase";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Minus,
  Plus,
  Sprout,
  Trash2,
  X,
} from "lucide-react";

function datetimeLocalValue(d: Date = new Date()): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function rotuloTorre(torre: Torre): string {
  const baby = torreReservadaGrelhaBabyLeaf(
    torre as Parameters<typeof torreReservadaGrelhaBabyLeaf>[0],
  );
  return baby ? `${torre.nome} · baby leaf` : torre.nome;
}

type DestinoLinha = {
  andarIdFront: string;
  andarIdDb: number;
  andarNumero: number;
  capacidadeDisponivel: number;
  quantidade: number;
};

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
          aria-label="Diminuir"
        >
          <Minus className="h-5 w-5" />
        </Button>
        <Input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={e => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(min);
              return;
            }
            const n = Number.parseInt(raw, 10);
            if (!Number.isFinite(n)) return;
            onChange(clamp(n));
          }}
          className="h-11 w-20 text-center text-2xl font-bold tabular-nums px-1"
          aria-label={label}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
          aria-label="Aumentar"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export function TransplantioVisualPanel({
  origemAndar,
  origemTorre,
  torres,
  andares,
  origemAndarDbId,
  resolver,
  projetoTipo,
  variedades,
  initialPerfilIndices,
  onCancel,
  onDone,
}: {
  origemAndar: Andar;
  origemTorre: Torre;
  torres: Torre[];
  andares: Andar[];
  origemAndarDbId: number | null;
  resolver: { andarFrontIdToDbId: Map<string, number> };
  projetoTipo?: string | null;
  variedades?: VariedadeConfig[];
  initialPerfilIndices?: number[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const { isVisitante } = useRole();
  const transplantar = wrapReadOnlyMutation(
    trpc.andares.transplantarDistribuido.useMutation(),
    isVisitante,
  );

  const slugVariedadeOrigem = useMemo(() => {
    const p = origemAndar.perfis?.find(x => x.ativo && x.variedadeId);
    return p?.variedadeId ?? null;
  }, [origemAndar]);

  const nomeVariedadeOrigem = useMemo(() => {
    if (!slugVariedadeOrigem) return undefined;
    return variedades?.find(v => v.id === slugVariedadeOrigem)?.nome;
  }, [slugVariedadeOrigem, variedades]);

  const pulaVegetativa = variedadePulaVegetativa(
    slugVariedadeOrigem,
    nomeVariedadeOrigem,
  );

  const podeEscolherFaseDestino =
    origemTorre.fase === "mudas" && projetoTipo !== "microverdes";

  const [passo, setPasso] = useState<"torre" | "andares">("torre");
  const [destinoFase, setDestinoFase] = useState<FaseDestinoTransplantioFv>(
    "vegetativa",
  );
  const [torreDestinoId, setTorreDestinoId] = useState<string | null>(null);
  const [perfisSelecionados, setPerfisSelecionados] = useState<number[]>([]);
  const [quantidadeVao, setQuantidadeVao] = useState(0);
  const [destinos, setDestinos] = useState<DestinoLinha[]>([]);
  const [dataHora, setDataHora] = useState(datetimeLocalValue);
  const [motivoDescarte, setMotivoDescarte] = useState("");

  const faseDestino = useMemo((): Fase | null => {
    if (origemTorre.fase === "mudas" || origemTorre.fase === "vegetativa") {
      return resolverFaseDestinoTransplantio(origemTorre.fase, {
        pulaVegetativa,
        faseDestinoInformada: podeEscolherFaseDestino ? destinoFase : null,
        projetoTipo,
      });
    }
    return null;
  }, [
    origemTorre.fase,
    pulaVegetativa,
    podeEscolherFaseDestino,
    destinoFase,
    projetoTipo,
  ]);

  const perfisDisponiveisOrigem = useMemo(() => {
    if (origemTorre.fase === "mudas") {
      return (origemAndar.perfis || [])
        .filter(p => p.ativo)
        .map(p => p.perfilIndex)
        .sort((a, b) => a - b);
    }
    const indices = new Set<number>();
    for (const f of origemAndar.furos || []) {
      if (f.status === "plantado") indices.add(f.perfilIndex);
    }
    return Array.from(indices).sort((a, b) => a - b);
  }, [origemAndar, origemTorre.fase]);

  const plantasPorPerfilMudasUi =
    origemTorre.fase === "mudas" && projetoTipo !== "microverdes"
      ? PLANTAS_POR_PERFIL_FV.mudas
      : 1;

  const origemQtd = useMemo(() => {
    if (perfisSelecionados.length === 0) return 0;
    if (origemTorre.fase === "mudas") {
      if (projetoTipo === "microverdes") return perfisSelecionados.length;
      return (origemAndar.perfis || [])
        .filter(p => p.ativo && perfisSelecionados.includes(p.perfilIndex))
        .reduce(
          (sum, p) =>
            sum + quantidadePlantasPerfilMudas(p, plantasPorPerfilMudasUi),
          0,
        );
    }
    return (origemAndar.furos || []).filter(
      f =>
        f.status === "plantado" &&
        perfisSelecionados.includes(f.perfilIndex),
    ).length;
  }, [
    origemAndar,
    origemTorre.fase,
    perfisSelecionados,
    projetoTipo,
    plantasPorPerfilMudasUi,
  ]);

  useEffect(() => {
    if (podeEscolherFaseDestino) {
      setDestinoFase(pulaVegetativa ? "maturacao" : "vegetativa");
    }
    const base = initialPerfilIndices?.length
      ? initialPerfilIndices.filter(i => perfisDisponiveisOrigem.includes(i))
      : [...perfisDisponiveisOrigem];
    setPerfisSelecionados(base);
  }, [
    podeEscolherFaseDestino,
    pulaVegetativa,
    initialPerfilIndices,
    perfisDisponiveisOrigem,
  ]);

  useEffect(() => {
    setQuantidadeVao(origemQtd);
    setDestinos([]);
  }, [origemQtd, perfisSelecionados]);

  const torresDestino = useMemo(() => {
    if (!faseDestino) return [];
    return torres
      .filter(t => t.fase === faseDestino && t.ativa !== false)
      .map(t => {
        const lista = andaresDaTorreDeclarados(andares, t).filter(a =>
          andarDentroDoModeloDaTorre(a, t),
        );
        const vagas = lista.reduce(
          (s, a) =>
            s +
            contarVaziosAndar(
              a,
              faseDestino,
              projetoTipo,
              t.estruturaOverride ?? null,
            ),
          0,
        );
        return { torre: t, vagas, andares: lista };
      })
      .filter(x => x.vagas > 0)
      .sort((a, b) => b.vagas - a.vagas);
  }, [faseDestino, torres, andares, projetoTipo]);

  const torreDestino = useMemo(
    () => torresDestino.find(t => t.torre.id === torreDestinoId) ?? null,
    [torresDestino, torreDestinoId],
  );

  const andaresDestinoUi = useMemo(() => {
    if (!torreDestino || !faseDestino) return [];
    return [...torreDestino.andares]
      .map(a => {
        const cap = capacidadeAndar(
          faseDestino,
          projetoTipo,
          torreDestino.torre.estruturaOverride ?? null,
        );
        const disp = contarVaziosAndar(
          a,
          faseDestino,
          projetoTipo,
          torreDestino.torre.estruturaOverride ?? null,
        );
        return { andar: a, cap, disp };
      })
      .sort((a, b) => b.andar.numero - a.andar.numero);
  }, [torreDestino, faseDestino, projetoTipo]);

  const totalDestinos = destinos.reduce((s, d) => s + d.quantidade, 0);
  const descarteQtd = Math.max(0, origemQtd - quantidadeVao);
  const faltamDestino = Math.max(0, quantidadeVao - totalDestinos);
  const podeConfirmar =
    origemQtd > 0 &&
    perfisSelecionados.length > 0 &&
    quantidadeVao + descarteQtd === origemQtd &&
    totalDestinos === quantidadeVao &&
    (quantidadeVao === 0 || destinos.some(d => d.quantidade > 0)) &&
    !!origemAndarDbId;

  const escolherTorre = (id: string) => {
    setTorreDestinoId(id);
    setDestinos([]);
    setPasso("andares");
  };

  const toggleDestinoAndar = (andar: Andar, disp: number) => {
    if (disp <= 0) return;
    const andarIdDb = resolver.andarFrontIdToDbId.get(andar.id);
    if (!andarIdDb) {
      toast.error("Andar destino sem id no banco.");
      return;
    }
    setDestinos(prev => {
      const existe = prev.find(d => d.andarIdFront === andar.id);
      if (existe) {
        return prev.filter(d => d.andarIdFront !== andar.id);
      }
      const ja = prev.reduce((s, d) => s + d.quantidade, 0);
      const falta = Math.max(0, quantidadeVao - ja);
      if (falta <= 0) {
        toast.message("Já repartiu todas as plantas que vão.");
        return prev;
      }
      const q = Math.min(disp, falta);
      return [
        ...prev,
        {
          andarIdFront: andar.id,
          andarIdDb,
          andarNumero: andar.numero,
          capacidadeDisponivel: disp,
          quantidade: q,
        },
      ];
    });
  };

  const ajustarDestino = (andarIdFront: string, q: number) => {
    setDestinos(prev =>
      prev
        .map(d => {
          if (d.andarIdFront !== andarIdFront) return d;
          return {
            ...d,
            quantidade: Math.max(
              0,
              Math.min(d.capacidadeDisponivel, Math.floor(q)),
            ),
          };
        })
        .filter(d => d.quantidade > 0),
    );
  };

  const confirmar = async () => {
    if (!faseDestino || !origemAndarDbId) return;
    if (!podeConfirmar) {
      toast.error(
        faltamDestino > 0
          ? `Ainda faltam ${faltamDestino} planta(s) nos andares de destino.`
          : "Ajuste origem, quantidade e destinos.",
      );
      return;
    }
    const dataHoraReal = new Date(dataHora);
    if (!dataHora || Number.isNaN(dataHoraReal.getTime())) {
      toast.error("Informe a data/hora do transplantio.");
      return;
    }
    try {
      await transplantar.mutateAsync({
        andarOrigemId: origemAndarDbId,
        perfilIndicesOrigem: perfisSelecionados,
        dataHora: dataHoraReal,
        destinos: destinos
          .filter(d => d.quantidade > 0)
          .map(d => ({
            andarDestinoId: d.andarIdDb,
            quantidade: d.quantidade,
          })),
        quantidadeDesperdicio: descarteQtd,
        motivoDesperdicio:
          descarteQtd > 0
            ? motivoDescarte.trim() || "descarte_no_transplantio"
            : undefined,
        ...(origemTorre.fase === "mudas"
          ? { faseDestino: faseDestino as FaseDestinoTransplantioFv }
          : {}),
      });
      await utils.fazenda.loadAll.invalidate();
      await utils.fazenda.loadAll.fetch();
      toast.success(
        descarteQtd > 0
          ? `Transplantio ok · ${descarteQtd} no descarte`
          : "Transplantio concluído.",
      );
      onDone();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível concluir o transplantio.";
      toast.error(msg);
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b bg-emerald-50/80 px-4 py-3 dark:bg-emerald-950/30">
        <div className="flex items-center gap-2 min-w-0">
          <Sprout className="h-5 w-5 shrink-0 text-emerald-700" />
          <div className="min-w-0">
            <p className="font-display font-bold text-sm truncate">
              Transplantar · {origemTorre.nome} · Andar {origemAndar.numero}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {passo === "torre"
                ? "1. Escolha a torre de destino"
                : "2. Quantas vão · andares de destino"}
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {podeEscolherFaseDestino && passo === "torre" && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={destinoFase === "vegetativa" ? "default" : "outline"}
              onClick={() => {
                setDestinoFase("vegetativa");
                setTorreDestinoId(null);
              }}
            >
              Ir para vegetativa
            </Button>
            <Button
              type="button"
              size="sm"
              variant={destinoFase === "maturacao" ? "default" : "outline"}
              onClick={() => {
                setDestinoFase("maturacao");
                setTorreDestinoId(null);
              }}
            >
              Ir direto para maturação
            </Button>
          </div>
        )}

        {passo === "torre" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {torresDestino.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">
                Nenhuma torre de destino com vaga nesta fase.
              </p>
            ) : (
              torresDestino.map(({ torre, vagas }) => (
                <button
                  key={torre.id}
                  type="button"
                  onClick={() => escolherTorre(torre.id)}
                  className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
                >
                  <p className="font-bold text-sm leading-tight">
                    {rotuloTorre(torre)}
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700">
                    {vagas}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    vagas livres
                  </p>
                </button>
              ))
            )}
          </div>
        )}

        {passo === "andares" && torreDestino && (
          <>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  setPasso("torre");
                  setDestinos([]);
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Trocar torre
              </Button>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold truncate">
                {rotuloTorre(torreDestino.torre)}
              </span>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    No andar de origem
                  </p>
                  <p className="text-3xl font-bold tabular-nums">{origemQtd}</p>
                  <p className="text-xs text-muted-foreground">plantas</p>
                </div>
                <Stepper
                  label="Quantas vão"
                  value={quantidadeVao}
                  min={0}
                  max={origemQtd}
                  onChange={n => {
                    setQuantidadeVao(n);
                    setDestinos([]);
                  }}
                />
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Descarte
                  </p>
                  <p
                    className={`text-3xl font-bold tabular-nums ${
                      descarteQtd > 0 ? "text-amber-600" : ""
                    }`}
                  >
                    {descarteQtd}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    o que não for
                  </p>
                </div>
              </div>
              {descarteQtd > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Motivo do descarte (opcional)</Label>
                  <Input
                    value={motivoDescarte}
                    onChange={e => setMotivoDescarte(e.target.value)}
                    placeholder="Ex.: mudas fracas"
                    className="h-9"
                  />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Use − / + em “Quantas vão”. O restante vira descarte
                automaticamente.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">
                Toque nos andares que recebem
                {faltamDestino > 0 ? (
                  <span className="ml-2 font-normal text-amber-700">
                    · faltam {faltamDestino}
                  </span>
                ) : quantidadeVao > 0 ? (
                  <span className="ml-2 font-normal text-emerald-700">
                    · repartido
                  </span>
                ) : null}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {andaresDestinoUi.map(({ andar, disp }) => {
                  const sel = destinos.find(d => d.andarIdFront === andar.id);
                  const vazio = disp <= 0;
                  return (
                    <button
                      key={andar.id}
                      type="button"
                      disabled={vazio && !sel}
                      onClick={() => toggleDestinoAndar(andar, disp)}
                      className={`rounded-lg border-2 p-2 text-center transition ${
                        sel
                          ? "border-emerald-600 bg-emerald-100 dark:bg-emerald-900/40"
                          : vazio
                            ? "border-muted bg-muted/40 opacity-40"
                            : "border-muted hover:border-emerald-400"
                      }`}
                    >
                      <p className="text-xs font-bold">A{andar.numero}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {sel ? `${sel.quantidade}/${disp}` : `${disp} livres`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {destinos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Ajuste fino por andar
                </p>
                {destinos.map(d => (
                  <div
                    key={d.andarIdFront}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm font-medium">
                      Andar {d.andarNumero}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() =>
                          ajustarDestino(d.andarIdFront, d.quantidade - 1)
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-bold tabular-nums">
                        {d.quantidade}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        disabled={d.quantidade >= d.capacidadeDisponivel}
                        onClick={() =>
                          ajustarDestino(d.andarIdFront, d.quantidade + 1)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() =>
                          setDestinos(prev =>
                            prev.filter(x => x.andarIdFront !== d.andarIdFront),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Data/hora do transplantio</Label>
              <Input
                type="datetime-local"
                value={dataHora}
                onChange={e => setDataHora(e.target.value)}
                className="h-10 max-w-xs"
              />
            </div>
          </>
        )}
      </div>

      {passo === "andares" && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-card px-4 py-3">
          <div className="text-sm">
            <span className="font-bold tabular-nums">{quantidadeVao}</span> vão
            {descarteQtd > 0 && (
              <>
                {" · "}
                <span className="font-bold tabular-nums text-amber-700">
                  {descarteQtd}
                </span>{" "}
                descarte
              </>
            )}
            {faltamDestino > 0 && (
              <span className="text-amber-700">
                {" "}
                · falta repartir {faltamDestino}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              disabled={!podeConfirmar || transplantar.isPending}
              onClick={() => void confirmar()}
            >
              <Check className="h-4 w-4" />
              {transplantar.isPending ? "Salvando…" : "Confirmar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
