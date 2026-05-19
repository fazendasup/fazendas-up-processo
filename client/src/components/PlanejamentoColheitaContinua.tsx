// ============================================================
// Meta de colheita em intervalo configurável — cálculo automático + planos
// ============================================================

import { useFazenda } from '@/contexts/FazendaContext';
import { useRole } from '@/hooks/useRole';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import {
  DESPERDICIO,
  capacidadePorFaseInstalacaoComFiltro,
  estimativaPlantasEmMaturacao,
  linhasCapacidadeInstalacao,
  sementesParaColheitaEsperada,
  taxaSobrevivenciaAcumulada,
  type TorreCapInput,
} from '@/lib/planejamentoContinuo';
import { multiplicadorPlantioBabyLeafFV } from '@shared/plantasPorPerfil';
import { variedadeEhBabyLeafFV, variedadePulaVegetativa } from '@shared/variedadesFase';
import {
  marcosCicloDesdeColheita,
  marcosCicloDesdeGerminacao,
  receitaCicloPrioritariaParaVariedade,
  type DiasCicloReceita,
  type MarcosCicloPlantio,
} from '@shared/cicloReceita';
import type { Fase } from '@/lib/types';
import { gerarId, type ModoDataPlantio } from '@/lib/utils-farm';
import { labelCampoDataPlantio, PlantioModoDataSelector } from '@/components/PlantioModoDataSelector';
import { Calculator, Plus, Trash2, Sprout, AlertTriangle } from 'lucide-react';

type LinhaVar = {
  id: string;
  variedadeId: number | null;
  percent: string;
};

type ReceitaRow = {
  id: number;
  nome: string;
  variedadeId: number;
  diasGerminacao: number;
  diasMudas: number;
  diasVegetativa: number;
  diasMaturacao: number;
  ativa: boolean | null;
  updatedAt?: Date | string | null;
};

function formatDateBr(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function pickReceita(receitas: ReceitaRow[], variedadeId: number): ReceitaRow | undefined {
  const r = receitaCicloPrioritariaParaVariedade(receitas, variedadeId);
  return r as ReceitaRow | undefined;
}

const INTERVALO_PRESETS = [1, 2, 3, 7, 14] as const;

function clampIntervaloDias(n: number): number {
  if (!Number.isFinite(n)) return 2;
  return Math.max(1, Math.min(365, Math.round(n)));
}

function marcosPrimeiroLote(
  modo: ModoDataPlantio,
  dataYmd: string,
  dias: DiasCicloReceita,
  pulaVegetativa: boolean,
): MarcosCicloPlantio | null {
  if (!dataYmd.trim()) return null;
  const anchor = new Date(`${dataYmd}T12:00:00`);
  if (modo === 'colheita_alvo') return marcosCicloDesdeColheita(anchor, dias, pulaVegetativa);
  return marcosCicloDesdeGerminacao(anchor, dias, pulaVegetativa);
}

export default function PlanejamentoColheitaContinua() {
  const { data: fazenda } = useFazenda();
  const { isAdmin } = useRole();
  const variedadesQuery = trpc.variedades.list.useQuery();
  const receitasQuery = trpc.receitas.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.planosPlantio.create.useMutation({
    onSuccess: () => {
      utils.planosPlantio.list.invalidate();
      utils.fazenda.loadAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const variedades = variedadesQuery.data || [];
  const receitas = (receitasQuery.data || []) as ReceitaRow[];

  const [metaColheita, setMetaColheita] = useState('120');
  const [intervaloDias, setIntervaloDias] = useState(2);
  const [numLotes, setNumLotes] = useState('8');
  const [modoDataInicio, setModoDataInicio] = useState<ModoDataPlantio>('colheita_alvo');
  const [dataReferencia, setDataReferencia] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() + 28);
    return t.toISOString().slice(0, 10);
  });
  const [linhas, setLinhas] = useState<LinhaVar[]>(() => [
    { id: gerarId(), variedadeId: null, percent: '100' },
  ]);

  const taxa = taxaSobrevivenciaAcumulada();

  const torresCap = useMemo((): TorreCapInput[] => {
    const andares = fazenda?.andares ?? [];
    return (fazenda?.torres || []).map((t) => {
      const andaresReais = andares.filter((a) => a.torreId === t.id).length;
      const declarado = t.numAndares ?? t.andares ?? 0;
      return {
        nome: t.nome,
        fase: t.fase as Fase,
        numAndares: andaresReais > 0 ? andaresReais : declarado,
        ativa: t.ativa,
        estruturaOverride: t.estruturaOverride ?? null,
      };
    });
  }, [fazenda?.torres, fazenda?.andares]);

  const capPadrao = useMemo(
    () => capacidadePorFaseInstalacaoComFiltro(torresCap, fazenda?.projetoTipo ?? null, 'exceto_baby_leaf'),
    [torresCap, fazenda?.projetoTipo],
  );

  const capBaby = useMemo(
    () => capacidadePorFaseInstalacaoComFiltro(torresCap, fazenda?.projetoTipo ?? null, 'apenas_baby_leaf'),
    [torresCap, fazenda?.projetoTipo],
  );

  const detalheBabyMat = useMemo(() => {
    return linhasCapacidadeInstalacao(torresCap, fazenda?.projetoTipo ?? null, 'apenas_baby_leaf').filter(
      (l) => l.fase === 'maturacao' && l.subtotal > 0,
    );
  }, [torresCap, fazenda?.projetoTipo]);

  const resultado = useMemo(() => {
    const meta = Math.max(0, parseFloat(metaColheita.replace(',', '.')) || 0);
    const pctSum = linhas.reduce((s, l) => s + (parseFloat(l.percent.replace(',', '.')) || 0), 0);
    const rows: {
      variedadeId: number;
      nome: string;
      percent: number;
      colheitaCadaCiclo: number;
      sementesPorLote: number;
      diasCiclo: number;
      pulaVegetativa: boolean;
      babyLeaf: boolean;
      diasGerminacao: number;
      diasMudas: number;
      diasVegetativa: number;
      diasMaturacao: number;
      receita: ReceitaRow | undefined;
    }[] = [];

    for (const l of linhas) {
      if (l.variedadeId == null) continue;
      const pct = parseFloat(l.percent.replace(',', '.')) || 0;
      const v = variedades.find((x) => x.id === l.variedadeId);
      if (!v) continue;
      const rec = pickReceita(receitas, l.variedadeId);
      const dm = rec?.diasMudas ?? v.diasMudas;
      const pulaVeg = variedadePulaVegetativa(v.slug, v.nome);
      const babyLeaf = variedadeEhBabyLeafFV(v.slug, v.nome, v.babyLeaf);
      const dv = pulaVeg ? 0 : (rec?.diasVegetativa ?? v.diasVegetativa);
      const dmat = rec?.diasMaturacao ?? v.diasMaturacao;
      const colheitaCadaCiclo = meta > 0 && pctSum > 0 ? (meta * pct) / pctSum : 0;
      const sementes = sementesParaColheitaEsperada(Math.ceil(colheitaCadaCiclo), {
        multiplicadorPlantio: multiplicadorPlantioBabyLeafFV(babyLeaf),
      });
      const dg = rec?.diasGerminacao ?? 5;
      const diasCicloFim =
        dg + dm + (pulaVeg ? 0 : dv) + dmat;
      rows.push({
        variedadeId: l.variedadeId,
        nome: v.nome,
        percent: pct,
        colheitaCadaCiclo: Math.ceil(colheitaCadaCiclo),
        sementesPorLote: sementes,
        diasCiclo: diasCicloFim,
        pulaVegetativa: pulaVeg,
        babyLeaf,
        diasGerminacao: dg,
        diasMudas: dm,
        diasVegetativa: dv,
        diasMaturacao: dmat,
        receita: rec,
      });
    }

    const okPct = Math.abs(pctSum - 100) < 0.01;
    return { meta, pctSum, okPct, rows };
  }, [linhas, metaColheita, variedades, receitas]);

  const alertaMat = useMemo(() => {
    const meta = resultado.meta;
    const pctSum = resultado.pctSum;
    if (meta <= 0 || pctSum <= 0) return null;

    let estBaby = 0;
    let estPadrao = 0;
    for (const r of resultado.rows) {
      const colheita = (meta * r.percent) / pctSum;
      const est = estimativaPlantasEmMaturacao(colheita, r.diasMaturacao, intervaloDias);
      if (r.babyLeaf) estBaby += est;
      else estPadrao += est;
    }

    const linhas: string[] = [];
    if (estBaby > capBaby.maturacao + 0.5) {
      linhas.push(
        `Baby leaf (torres 12×6): estimativa ~${Math.ceil(estBaby)} plantas em maturação (lote a cada ${intervaloDias} dia(s)); capacidade instalada nessas torres: ${capBaby.maturacao}.`,
      );
    }
    if (estPadrao > capPadrao.maturacao + 0.5) {
      linhas.push(
        `Demais variedades (torres padrão): estimativa ~${Math.ceil(estPadrao)} plantas em maturação; capacidade sem torres 12×6: ${capPadrao.maturacao}.`,
      );
    }

    if (linhas.length === 0) return null;
    return { msgs: linhas };
  }, [resultado, capBaby.maturacao, capPadrao.maturacao, intervaloDias]);

  const lotes = Math.max(1, Math.min(52, parseInt(numLotes, 10) || 1));

  const marcos0PorVariedade = useMemo(() => {
    const m = new Map<number, MarcosCicloPlantio>();
    for (const r of resultado.rows) {
      if (!r.receita) continue;
      const dias: DiasCicloReceita = {
        diasGerminacao: r.diasGerminacao,
        diasMudas: r.diasMudas,
        diasVegetativa: r.diasVegetativa,
        diasMaturacao: r.diasMaturacao,
      };
      const marcos = marcosPrimeiroLote(modoDataInicio, dataReferencia, dias, r.pulaVegetativa);
      if (marcos) m.set(r.variedadeId, marcos);
    }
    return m;
  }, [resultado.rows, dataReferencia, modoDataInicio]);

  function addLinha() {
    setLinhas((prev) => [...prev, { id: gerarId(), variedadeId: null, percent: '0' }]);
  }

  function removeLinha(id: string) {
    setLinhas((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.id !== id)));
  }

  function normalizarPercent() {
    const n = linhas.filter((l) => l.variedadeId != null).length;
    if (n === 0) return;
    const p = (100 / n).toFixed(1);
    setLinhas((prev) =>
      prev.map((l) => (l.variedadeId != null ? { ...l, percent: p } : l))
    );
    toast.message('Percentuais divididos igualmente entre as variedades preenchidas.');
  }

  async function gerarPlanos() {
    if (!resultado.okPct) {
      toast.error('A soma dos percentuais deve ser 100%.');
      return;
    }
    const nLotes = Math.max(1, Math.min(52, parseInt(numLotes, 10) || 1));
    let criados = 0;

    for (const r of resultado.rows) {
      if (!r.receita) {
        toast.error(`Cadastre uma receita ativa para a variedade "${r.nome}".`);
        return;
      }
      const dias: DiasCicloReceita = {
        diasGerminacao: r.diasGerminacao,
        diasMudas: r.diasMudas,
        diasVegetativa: r.diasVegetativa,
        diasMaturacao: r.diasMaturacao,
      };
      const m0 = marcosPrimeiroLote(modoDataInicio, dataReferencia, dias, r.pulaVegetativa);
      if (!m0) {
        toast.error('Informe uma data válida para o primeiro lote.');
        return;
      }

      const obsData =
        modoDataInicio === 'colheita_alvo'
          ? `1.ª colheita alvo ${dataReferencia}`
          : `1.º plantio (germinação) ${dataReferencia}`;

      try {
        await createMutation.mutateAsync({
          receitaId: r.receita.id,
          receitaNome: r.receita.nome,
          variedadeId: r.variedadeId,
          variedadeNome: r.nome,
          quantidadePlantas: r.sementesPorLote,
          dataInicioGerminacao: m0.germinacao,
          dataTransplantioMudas: m0.mudas,
          dataTransplantioVeg: m0.veg,
          dataTransplantioMat: m0.mat,
          dataColheitaPrevista: m0.colheita,
          torreDestinoId: null,
          observacoes: `Planejador colheita a cada ${intervaloDias} dia(s); ${obsData}`,
          recorrencia: 'personalizado',
          intervaloDiasPersonalizado: intervaloDias,
          repeticoes: nLotes,
        });
        criados += nLotes;
      } catch {
        return;
      }
    }

    toast.success(`${criados} plano(s) gerado(s) na aba Planos.`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Meta de colheita a cada {intervaloDias} dias
          </CardTitle>
          <CardDescription>
            Informe quantas plantas você quer <strong>prontas para colheita</strong> a cada {intervaloDias} dias, a{' '}
            <strong>data de referência do 1.º lote</strong> (primeira colheita alvo ou primeiro plantio — conforme o modo)
            e distribua as variedades em %. Com colheita alvo, todas as variedades do mix colhem no mesmo dia no 1.º lote;
            com primeiro plantio, a germinação é a mesma data e a colheita prevista varia por receita. Os prazos por fase
            vêm da <strong>receita</strong> de cada variedade. O sistema aplica
            desperdício: germinação {DESPERDICIO.germinacao * 100}%, mudas→veg {DESPERDICIO.mudasParaVegetativa * 100}%,
            veg→mat {DESPERDICIO.vegetativaParaMaturacao * 100}% (germinação na receita: dias até ir para mudas).             Taxa
            combinada até a colheita: {(taxa * 100).toFixed(1)}% das sementes. Torres 12×6 (baby leaf): 2 células por furo em veg/mat — sementes e capacidade em dobro; manjericão, baby leaf beterraba/acelga. Demais variedades usam torres padrão (1 planta por furo na maturação).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Plantas na colheita a cada {intervaloDias} dias (total)</Label>
              <Input
                inputMode="decimal"
                value={metaColheita}
                onChange={(e) => setMetaColheita(e.target.value)}
                placeholder="Ex: 120"
              />
            </div>
            <div className="space-y-2">
              <PlantioModoDataSelector
                value={modoDataInicio}
                onChange={setModoDataInicio}
                fase="maturacao"
                projetoTipo={fazenda?.projetoTipo}
              />
              <Label>{labelCampoDataPlantio(modoDataInicio, 'maturacao', fazenda?.projetoTipo)}</Label>
              <Input type="date" value={dataReferencia} onChange={(e) => setDataReferencia(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">
                {modoDataInicio === 'colheita_alvo'
                  ? 'A germinação de cada variedade é calculada automaticamente para essa data de colheita no 1.º lote.'
                  : 'A colheita prevista de cada variedade é calculada a partir desta data de germinação e da receita.'}
              </p>
            </div>
            <div>
              <Label>Nº de lotes por variedade</Label>
              <Input
                type="number"
                min={1}
                max={52}
                value={numLotes}
                onChange={(e) => setNumLotes(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Um lote a cada {intervaloDias} dias por variedade.</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-2">
              <div>
                <p className="font-medium text-foreground">Torres padrão (ex.: alface)</p>
                <p className="text-muted-foreground">
                  Sem torres 12 perfis × 6 furos — mudas {capPadrao.mudas.toLocaleString('pt-BR')} · veg{' '}
                  {capPadrao.vegetativa.toLocaleString('pt-BR')} · mat {capPadrao.maturacao.toLocaleString('pt-BR')} plantas
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Baby leaf (torres 12×6, 2 células/furo)</p>
                <p className="text-muted-foreground">
                  Manjericão, baby leaf beterraba/acelga — mudas {capBaby.mudas.toLocaleString('pt-BR')} · veg{' '}
                  {capBaby.vegetativa.toLocaleString('pt-BR')} · mat {capBaby.maturacao.toLocaleString('pt-BR')} plantas
                </p>
                {detalheBabyMat.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Mat. (12×6):{' '}
                    {detalheBabyMat
                      .map(
                        (l) =>
                          `${l.nome ?? 'Torre'}: ${l.numAndares} and. × ${l.plantasPorAndar.toLocaleString('pt-BR')} = ${l.subtotal.toLocaleString('pt-BR')}`,
                      )
                      .join(' · ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div>
              <Label className="text-base">Intervalo entre lotes (dias)</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Espaço entre o início da germinação de um lote e do seguinte (na mesma variedade). Em regime estável,
                equivale à frequência das colheitas (ex.: 2 = colheita a cada 2 dias). O cálculo de sementes por lote
                continua automático.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {INTERVALO_PRESETS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={intervaloDias === d ? 'default' : 'outline'}
                  size="sm"
                  className="h-9"
                  onClick={() => setIntervaloDias(d)}
                >
                  {d} {d === 1 ? 'dia' : 'dias'}
                </Button>
              ))}
              <span className="text-sm text-muted-foreground px-1">outro</span>
              <Input
                type="number"
                min={1}
                max={365}
                className="h-9 w-20"
                aria-label="Intervalo em dias (1 a 365)"
                value={intervaloDias}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isNaN(v)) return;
                  setIntervaloDias(clampIntervaloDias(v));
                }}
              />
              <span className="text-sm text-muted-foreground">(1–365)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label>Variedades no mix</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addLinha}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Linha
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={normalizarPercent}>
                  Repartir 100%
                </Button>
              </div>
            </div>

            {linhas.map((linha) => (
              <div key={linha.id} className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px]">
                  <Select
                    value={linha.variedadeId != null ? String(linha.variedadeId) : ''}
                    onValueChange={(v) =>
                      setLinhas((prev) =>
                        prev.map((x) => (x.id === linha.id ? { ...x, variedadeId: v ? Number(v) : null } : x))
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Variedade" />
                    </SelectTrigger>
                    <SelectContent>
                      {variedades.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={linha.percent}
                    onChange={(e) =>
                      setLinhas((prev) =>
                        prev.map((x) => (x.id === linha.id ? { ...x, percent: e.target.value } : x))
                      )
                    }
                    placeholder="%"
                  />
                </div>
                <span className="text-sm text-muted-foreground pb-2">%</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeLinha(linha.id)}
                  disabled={linhas.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <div className="flex items-center gap-2 text-sm">
              <span>Soma dos percentuais:</span>
              <Badge variant={resultado.okPct ? 'default' : 'destructive'}>{resultado.pctSum.toFixed(1)}%</Badge>
              {!resultado.okPct && (
                <span className="text-destructive text-xs">Ajuste para 100% ou use &quot;Repartir 100%&quot;.</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {resultado.rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sprout className="w-4 h-4" />
              Volume por variedade (automático)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variedade</TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap">Tipo</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Colheita / ciclo</TableHead>
                  <TableHead className="text-right">Sementes (lote)</TableHead>
                  <TableHead className="text-right">Dias ciclo</TableHead>
                  <TableHead>Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.rows.map((r) => (
                  <TableRow key={r.variedadeId}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>
                      {r.babyLeaf ? (
                        <Badge variant="secondary" className="font-normal">
                          12×6
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{r.percent.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{r.colheitaCadaCiclo}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-800 dark:text-emerald-200">{r.sementesPorLote}</TableCell>
                    <TableCell className="text-right">{r.diasCiclo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.receita ? r.receita.nome : <span className="text-amber-600 dark:text-amber-400">Sem receita ativa</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {alertaMat && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <ul className="list-disc pl-4 space-y-1">
                  {alertaMat.msgs.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-x-auto">
              <p className="text-xs font-medium mb-2">
                Início da germinação por lote
                {modoDataInicio === 'colheita_alvo'
                  ? ' (calculado a partir da primeira colheita + receita)'
                  : ' (a partir do primeiro plantio informado)'}
                ; quantidade a plantar por lote abaixo.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    {resultado.rows.map((r) => (
                      <TableHead key={r.variedadeId} className="text-right min-w-[7rem]">
                        {r.nome}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: Math.min(lotes, 14) }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{i + 1}</TableCell>
                      {resultado.rows.map((r) => {
                        const m0 = marcos0PorVariedade.get(r.variedadeId);
                        const dGerm = m0 ? addDays(m0.germinacao, i * intervaloDias) : null;
                        const dColheita =
                          m0 && i === 0 && modoDataInicio === 'plantio' ? m0.colheita : null;
                        return (
                          <TableCell key={r.variedadeId} className="text-right text-xs">
                            {dGerm ? (
                              <>
                                <span className="whitespace-nowrap">{formatDateBr(dGerm)}</span>
                                <span className="block text-muted-foreground">({r.sementesPorLote} sementes)</span>
                                {dColheita && (
                                  <span className="block text-emerald-700 dark:text-emerald-300">
                                    colheita {formatDateBr(dColheita)}
                                  </span>
                                )}
                              </>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {lotes > 14 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Mostrando 14 linhas; na geração de planos serão {lotes} lotes por variedade.
                </p>
              )}
            </div>

            {isAdmin ? (
              <Button
                onClick={() => void gerarPlanos()}
                disabled={createMutation.isPending || !resultado.okPct || resultado.rows.some((r) => !r.receita)}
                className="w-full sm:w-auto"
              >
                {createMutation.isPending ? 'Gerando…' : 'Gerar planos no sistema'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Apenas administradores podem gerar os planos no sistema.</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Cria uma série por variedade (intervalo {intervaloDias} dia(s) entre inícios de germinação), quantidade =
              sementes calculadas
              {modoDataInicio === 'colheita_alvo'
                ? ' e primeira colheita na data alvo informada.'
                : ' a partir do primeiro plantio informado.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
