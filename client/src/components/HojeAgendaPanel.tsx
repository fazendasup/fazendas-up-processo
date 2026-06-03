// ============================================================
// Painel da agenda do dia (plantio, tarefas, ciclos) — usado no modal do dashboard
// ============================================================

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFazenda } from '@/contexts/FazendaContext';
import { trpc } from '@/lib/trpc';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  dateKeyLocal,
  eventosPorDia,
  filtrarEventosDoDiaLocal,
  filtrarEventosSomenteGerminacaoPlantio,
  resumoFasesDoDiaPt,
  type DiaEvento,
  type PlanoRow,
} from '@/lib/planejamentoCalendario';
import { listarAndaresPerfisProntosParaAcao } from '@/lib/utils-farm';
import { linhasCicloOperacaoHoje, partitionLinhasCicloAtrasadasVsHoje } from '@/lib/ciclosAgenda';
import { Link } from 'wouter';
import {
  CalendarClock,
  ClipboardList,
  Loader2,
  Circle,
  ArrowRight,
  Droplets,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  ArrowUp,
  ArrowDown,
  Play,
  Sprout,
  Building2,
} from 'lucide-react';
import { QuickCheckInModal } from '@/components/QuickCheckInModal';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Wrench, Scissors, Droplet, FlaskConical } from 'lucide-react';
import { TOOLTIPS } from '@/lib/tooltips';
import type { CicloAplicacao } from '@/lib/types';
import { filtroTarefasParaHoje, partitionTarefasHojeVsAtrasadas, startOfLocalDayMs } from '@/lib/tarefasHoje';
import {
  filtrarPlanosPrioridadeSomenteGerminacaoPlantio,
  isPlanoAtrasado,
  resumoOperacaoPlano,
  exibirContagemGerminacaoNoTransplantioVegOuMat,
  formatDatePlano,
  startOfLocalDayTime,
  ymdLocalKey,
} from '@/lib/planosPlantioOperacao';
import { Badge } from '@/components/ui/badge';
import type { AgendaFocus } from '@/lib/agendaFocus';

/** Dosagem vinda do cadastro do ciclo ou, em último caso, da descrição gerada automaticamente. */
function dosagemParaExibir(ciclo: CicloAplicacao | null | undefined, descricaoTarefa: string | null | undefined): string {
  const d = ciclo?.dosagem?.trim();
  if (d) return d;
  const desc = descricaoTarefa ?? '';
  const m = desc.match(/\|\s*dosagem:\s*([^|]+?)(?=\s*\||\s*nas fases:|$)/i);
  if (m) return m[1].trim();
  return '';
}

const CHIP: Record<DiaEvento['tipo'], string> = {
  germinacao: 'bg-emerald-600/15 text-emerald-950 dark:text-emerald-100 border-emerald-500/25',
  mudas: 'bg-emerald-600/14 text-emerald-950 dark:text-emerald-100 border-emerald-500/22',
  veg: 'bg-green-600/12 text-green-950 dark:text-green-100 border-green-600/20',
  mat: 'bg-green-700/10 text-green-950 dark:text-green-100 border-green-700/18',
  colheita: 'bg-amber-500/20 text-amber-950 dark:text-amber-100 border-amber-500/30',
};

const ORD_TIPO: Record<string, number> = {
  germinacao: 0,
  mudas: 1,
  veg: 2,
  mat: 3,
  colheita: 4,
};

const TIPO_LABEL: Record<string, string> = {
  ciclo: 'Ciclo',
  transplantio: 'Transplantio',
  colheita: 'Colheita',
  lavagem: 'Lavagem',
  medicao: 'Medição',
  manutencao: 'Manutenção',
  outro: 'Outro',
};

const STATUS_PLANO_LABEL: Record<string, string> = {
  planejado: 'Planejado',
  em_germinacao: 'Em germinação',
  em_producao: 'Em produção',
  colhido: 'Colhido',
  cancelado: 'Cancelado',
};

const NEXT_PLANO_STATUS: Record<string, 'em_germinacao' | 'em_producao' | 'colhido' | 'cancelado'> = {
  planejado: 'em_germinacao',
  em_germinacao: 'em_producao',
  em_producao: 'colhido',
};

const TIPO_BADGE: Record<string, string> = {
  ciclo: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  transplantio: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  colheita: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  lavagem: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100',
  medicao: 'bg-purple-100 text-purple-900 dark:bg-purple-950/40 dark:text-purple-100',
  manutencao: 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-100',
  outro: 'bg-muted text-muted-foreground',
};

const PRIORIDADE_ICONS: Record<string, { icon: ReactNode; label: string; color: string }> = {
  baixa: { icon: <ArrowDown className="w-3 h-3" />, label: 'Baixa', color: 'text-gray-500' },
  media: { icon: <ArrowRight className="w-3 h-3" />, label: 'Média', color: 'text-blue-500' },
  alta: { icon: <ArrowUp className="w-3 h-3" />, label: 'Alta', color: 'text-orange-500' },
  urgente: { icon: <Zap className="w-3 h-3" />, label: 'Urgente', color: 'text-red-600' },
};

/** Marcos de plantio marcados “feito” persistem entre dias (ids estáveis tipo `m-12` = mudas do plano 12). */
const LS_PLANTIO_DONE_GLOBAL = 'fu-plantio-done-ids-v1';

function loadPlantioDoneIdsFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const set = new Set<string>();
    const raw = window.localStorage.getItem(LS_PLANTIO_DONE_GLOBAL);
    if (raw) {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr)) arr.forEach((id) => typeof id === 'string' && set.add(id));
    }
    for (let i = 0; i < 21; i++) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const legacyKey = `hoje-plantio-done-${dateKeyLocal(d)}`;
      const leg = window.localStorage.getItem(legacyKey);
      if (!leg) continue;
      try {
        const arr = JSON.parse(leg) as unknown;
        if (Array.isArray(arr)) arr.forEach((id) => typeof id === 'string' && set.add(id));
      } catch {
        /* ignore */
      }
    }
    return Array.from(set);
  } catch {
    return [];
  }
}

function savePlantioDoneIdsToStorage(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_PLANTIO_DONE_GLOBAL, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

function prunePlantioDoneIds(ids: string[], planoIds: Set<number>): string[] {
  return ids.filter((id) => {
    const m = id.match(/^(g|m|vg|mt|c)-(\d+)$/);
    if (!m) return false;
    return planoIds.has(Number(m[2]));
  });
}

type PlanoAcaoHoje = Record<string, unknown> & {
  id: number;
  status: string;
  receitaNome?: string;
  variedadeNome?: string;
  quantidadePlantas: number;
  germinadas?: number | null;
  naoGerminadas?: number | null;
  germinacaoFase?: string | null;
  dataInicioGerminacao?: Date | string | null;
  dataTransplantioVeg: Date | string;
  dataTransplantioMat: Date | string;
  dataColheitaPrevista?: Date | string;
};

function HojePlanoAcaoRow({
  plano,
  hojeYmd,
  isAdmin,
  salvarTaxaEMarcarPronta,
  comboBusy,
  onAvancar,
  avancarBusy,
  /** Na agenda do dia: só plantio/germinação; produção e colheita ficam nas torres. */
  agendaSomentePlantio = false,
  /** Chamado ao iniciar germinação a partir do modal da agenda (fecha e segue o fluxo na operação). */
  fecharAgendaAoIniciarGerminacao,
}: {
  plano: PlanoAcaoHoje;
  hojeYmd: string;
  isAdmin: boolean;
  salvarTaxaEMarcarPronta: (input: { id: number; germinadas: number; naoGerminadas: number }) => Promise<void>;
  comboBusy: boolean;
  onAvancar: (id: number, novoStatus: 'em_germinacao' | 'em_producao' | 'colhido') => void;
  avancarBusy: boolean;
  agendaSomentePlantio?: boolean;
  fecharAgendaAoIniciarGerminacao?: () => void;
}) {
  const status = plano.status;
  const stLabel = STATUS_PLANO_LABEL[status] || status;
  const faseG = (plano.germinacaoFase as string) || 'pendente';
  const nextStatus = NEXT_PLANO_STATUS[status];
  const naoPodeIrProducao =
    status === 'em_germinacao' && nextStatus === 'em_producao' && faseG !== 'pronto_mudas';

  const qty = plano.quantidadePlantas;
  const [germinadas, setGerminadas] = useState(() => Number(plano.germinadas ?? 0));
  const [naoGerminadas, setNaoGerminadas] = useState(() =>
    Number(plano.naoGerminadas ?? qty - (plano.germinadas ?? 0)),
  );

  useEffect(() => {
    setGerminadas(Number(plano.germinadas ?? 0));
    setNaoGerminadas(Number(plano.naoGerminadas ?? qty - (plano.germinadas ?? 0)));
  }, [plano.id, plano.germinadas, plano.naoGerminadas, qty]);

  const mostrarContagem = exibirContagemGerminacaoNoTransplantioVegOuMat(plano as any, hojeYmd);
  const resumo = resumoOperacaoPlano(plano, hojeYmd);

  return (
    <li className="rounded-lg border border-emerald-600/25 bg-emerald-500/5 px-3 py-2.5 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm">{plano.receitaNome ?? 'Plano'}</span>
            <Badge variant="outline" className="text-[10px] font-normal">
              {stLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {plano.variedadeNome ?? '—'} · {qty} plantas · #{plano.id}
          </p>
          {resumo ? <p className="text-xs text-foreground/90 leading-snug">{resumo}</p> : null}
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-1.5 shrink-0 items-stretch sm:items-end">
            {status === 'planejado' && nextStatus === 'em_germinacao' && (
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                disabled={avancarBusy}
                onClick={() => {
                  fecharAgendaAoIniciarGerminacao?.();
                  onAvancar(plano.id, 'em_germinacao');
                }}
              >
                <Sprout className="w-3 h-3 mr-1" />
                Iniciar germinação
              </Button>
            )}
            {!agendaSomentePlantio &&
              status === 'em_germinacao' &&
              faseG === 'pronto_mudas' &&
              nextStatus === 'em_producao' && (
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                disabled={avancarBusy || naoPodeIrProducao}
                onClick={() => onAvancar(plano.id, 'em_producao')}
              >
                <Play className="w-3 h-3 mr-1" />
                Passar para produção
              </Button>
            )}
            {!agendaSomentePlantio && status === 'em_producao' && nextStatus === 'colhido' && (
              <Button
                size="sm"
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700"
                disabled={avancarBusy}
                onClick={() => {
                  if (!window.confirm('Marcar este plano como colhido?')) return;
                  onAvancar(plano.id, 'colhido');
                }}
              >
                <Scissors className="w-3 h-3 mr-1" />
                Marcar colhido
              </Button>
            )}
          </div>
        )}
      </div>
      {status === 'em_germinacao' && mostrarContagem && faseG !== 'pronto_mudas' && (
        <div className="flex flex-wrap items-end gap-2 pt-1 border-t border-emerald-500/15">
          <div>
            <Label className="text-[10px] text-muted-foreground">Germinadas</Label>
            <Input
              type="number"
              min={0}
              max={qty}
              value={germinadas}
              onChange={(e) => {
                const v = Math.min(qty, Math.max(0, parseInt(e.target.value, 10) || 0));
                setGerminadas(v);
                setNaoGerminadas(qty - v);
              }}
              className="h-8 w-20 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Não germ.</Label>
            <Input
              type="number"
              min={0}
              max={qty}
              value={naoGerminadas}
              onChange={(e) => {
                const v = Math.min(qty, Math.max(0, parseInt(e.target.value, 10) || 0));
                setNaoGerminadas(v);
                setGerminadas(qty - v);
              }}
              className="h-8 w-20 text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
            disabled={comboBusy}
            onClick={async () => {
              try {
                await salvarTaxaEMarcarPronta({ id: plano.id, germinadas, naoGerminadas });
              } catch {
                /* toast nas mutations */
              }
            }}
          >
            Guardar taxa e marcar pronta
          </Button>
        </div>
      )}
      {status === 'em_germinacao' && (!mostrarContagem || faseG === 'pronto_mudas') && (
        <p className="text-[10px] text-muted-foreground">
          {mostrarContagem && faseG === 'pronto_mudas'
            ? 'Taxa já registrada e bandeja pronta — use Passar para produção (admin) quando fizer o transplantio.'
            : `Contagem da bandeja disponível só no dia ${formatDatePlano(plano.dataTransplantioVeg as Date | string)} (mudas → vegetativa).`}
        </p>
      )}
    </li>
  );
}

export function HojeAgendaPanel({
  focus = 'full',
  /** Fecha o modal (evita `useAgendaModal` → contexto no entry → ciclo com este chunk). */
  onCloseModal,
}: {
  focus?: AgendaFocus;
  onCloseModal: () => void;
}) {
  const { data, refetch: refetchFazenda } = useFazenda();
  const isHidroponia = data.projetoTipo === 'hidroponia';
  const { isAdmin } = useRole();
  const planosQuery = trpc.planosPlantio.list.useQuery();
  const tarefasQuery = trpc.tarefas.list.useQuery();
  const utils = trpc.useUtils();
  const refetchTarefas = tarefasQuery.refetch;

  // Sempre sincroniza ao abrir a página Hoje (mudanças vindas de outras telas).
  useEffect(() => {
    refetchTarefas();
    refetchFazenda();
  }, [refetchTarefas, refetchFazenda]);

  // Também sincroniza quando a aba volta para frente.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      refetchTarefas();
      refetchFazenda();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refetchTarefas, refetchFazenda]);

  const eventosPlantio = useMemo(() => {
    const planos = (planosQuery.data || []) as PlanoRow[];
    const map = eventosPorDia(planos);
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const hojeKey = dateKeyLocal(hoje);
    const raw = map.get(hojeKey) ?? [];
    const evs = filtrarEventosDoDiaLocal(raw, planos, hojeKey);
    return [...evs].sort(
      (a, b) =>
        (ORD_TIPO[a.tipo] ?? 9) - (ORD_TIPO[b.tipo] ?? 9) || a.variedade.localeCompare(b.variedade)
    );
  }, [planosQuery.data]);

  const tarefasHoje = useMemo(() => {
    const all = tarefasQuery.data || [];
    const filtradas = filtroTarefasParaHoje(all);
    return [...filtradas].sort((a, b) => {
      const po: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
      const d = (po[a.prioridade] ?? 2) - (po[b.prioridade] ?? 2);
      if (d !== 0) return d;
      return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime();
    });
  }, [tarefasQuery.data]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitulo, setNewTitulo] = useState('');
  const [newDescricao, setNewDescricao] = useState('');
  const [newTipo, setNewTipo] = useState('outro');
  const [newPrioridade, setNewPrioridade] = useState('media');
  const [formError, setFormError] = useState('');

  const gerarAutomaticas = trpc.tarefas.gerarAutomaticas.useMutation({
    onSuccess: async (res) => {
      await Promise.all([refetchTarefas(), utils.fazenda.loadAll.invalidate(), refetchFazenda()]);
      if (res.criadas > 0) toast.success(`${res.criadas} tarefa(s) gerada(s) automaticamente!`);
      else toast.info('Nenhuma tarefa pendente para gerar hoje.');
    },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });

  const createTarefa = trpc.tarefas.create.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchTarefas(), utils.fazenda.loadAll.invalidate(), refetchFazenda()]);
      toast.success('Tarefa criada!');
    },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });

  const deleteTarefa = trpc.tarefas.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchTarefas(), utils.fazenda.loadAll.invalidate(), refetchFazenda()]);
      toast.success('Tarefa excluída!');
    },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });

  const adiar = trpc.tarefas.adiar.useMutation({
    onSuccess: () => {
      refetchTarefas();
      void utils.fazenda.loadAll.invalidate();
      void refetchFazenda();
      toast.success('Tarefa adiada');
    },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });

  const updateTarefa = trpc.tarefas.update.useMutation({
    onSuccess: () => {
      refetchTarefas();
      utils.tarefas.list.invalidate();
      void utils.fazenda.loadAll.invalidate();
      void refetchFazenda();
      toast.success('Tarefa cancelada');
    },
    onError: (err: any) => { toast.error(`Erro: ${err.message}`); },
  });

  const concluir = trpc.tarefas.concluir.useMutation({
    onSuccess: () => {
      utils.tarefas.list.invalidate();
      void utils.fazenda.loadAll.invalidate();
      void refetchFazenda();
    },
    onError: (e) => toast.error(e.message),
  });

  const registrarContagemPlano = trpc.planosPlantio.registrarContagemGerminacao.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.planosPlantio.list.invalidate(),
        utils.fazenda.loadAll.invalidate(),
        refetchFazenda(),
      ]);
    },
    onError: (e) => toast.error(e.message),
  });

  const marcarGerminacaoProntaPlano = trpc.planosPlantio.marcarGerminacaoPronta.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.planosPlantio.list.invalidate(),
        utils.fazenda.loadAll.invalidate(),
        refetchFazenda(),
      ]);
    },
    onError: (e) => toast.error(e.message),
  });

  const avancarPlanoMutation = trpc.planosPlantio.avancarStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.planosPlantio.list.invalidate(),
        utils.fazenda.loadAll.invalidate(),
        refetchFazenda(),
      ]);
      toast.success('Plano atualizado');
    },
    onError: (e) => toast.error(e.message),
  });

  const salvarTaxaEMarcarProntaHoje = async (input: { id: number; germinadas: number; naoGerminadas: number }) => {
    await registrarContagemPlano.mutateAsync(input);
    await marcarGerminacaoProntaPlano.mutateAsync({ id: input.id });
    toast.success('Taxa guardada e bandeja marcada como pronta para mudas');
  };

  const [quickTask, setQuickTask] = useState<any | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [plantioDoneIds, setPlantioDoneIds] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : loadPlantioDoneIdsFromStorage(),
  );
  const [ciclosDoneKeys, setCiclosDoneKeys] = useState<string[]>([]);
  const eventosPlantioExibidos = useMemo(
    () => eventosPlantio.filter((e) => !plantioDoneIds.includes(e.id)),
    [eventosPlantio, plantioDoneIds]
  );

  const planosFazerAgoraGerminacao = useMemo(
    () => filtrarPlanosPrioridadeSomenteGerminacaoPlantio((planosQuery.data || []) as any[], new Date()),
    [planosQuery.data],
  );

  const planosGerminacaoAtrasados = useMemo(() => {
    const hojeStart = startOfLocalDayTime(new Date());
    return planosFazerAgoraGerminacao.filter((p: PlanoAcaoHoje) => {
      if (isPlanoAtrasado(p as { status: string; dataColheitaPrevista: Date | string }, hojeStart)) return true;
      if (
        p.status === 'planejado' &&
        p.dataInicioGerminacao &&
        startOfLocalDayTime(p.dataInicioGerminacao as Date | string) < hojeStart
      )
        return true;
      return false;
    });
  }, [planosFazerAgoraGerminacao]);

  const idsPlanosGerminacaoAtrasados = useMemo(
    () => new Set(planosGerminacaoAtrasados.map((p: { id: number }) => p.id)),
    [planosGerminacaoAtrasados],
  );

  const planosGerminacaoMarcoHoje = useMemo(
    () => planosFazerAgoraGerminacao.filter((p: { id: number }) => !idsPlanosGerminacaoAtrasados.has(p.id)),
    [planosFazerAgoraGerminacao, idsPlanosGerminacaoAtrasados],
  );

  const idsPlanosGerminacao = useMemo(
    () => new Set(planosFazerAgoraGerminacao.map((p: { id: number }) => p.id)),
    [planosFazerAgoraGerminacao],
  );

  const eventosPlantioCalendarioGerminacao = useMemo(
    () =>
      filtrarEventosSomenteGerminacaoPlantio(eventosPlantioExibidos).filter(
        (e) => !idsPlanosGerminacao.has(e.planoId),
      ),
    [eventosPlantioExibidos, idsPlanosGerminacao],
  );

  const hojeYmdOperacao = ymdLocalKey(new Date());

  const marcarCicloExecutado = trpc.ciclos.marcarExecutado.useMutation({
    onSuccess: () => {
      utils.fazenda.loadAll.invalidate();
      utils.tarefas.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    const planos = (planosQuery.data || []) as PlanoRow[];
    if (planos.length === 0) return;
    const idSet = new Set(planos.map((p) => p.id));
    setPlantioDoneIds((prev) => {
      const fromLs = loadPlantioDoneIdsFromStorage();
      const merged = Array.from(new Set([...prev, ...fromLs]));
      const pruned = prunePlantioDoneIds(merged, idSet);
      if (pruned.length !== merged.length) savePlantioDoneIdsToStorage(pruned);
      return pruned;
    });
  }, [planosQuery.data]);

  const marcarPlantioExecutado = (id: string) => {
    const next = Array.from(new Set([...plantioDoneIds, id]));
    setPlantioDoneIds(next);
    savePlantioDoneIdsToStorage(next);
    toast.success('Marcado como feito');
  };

  /** Une ciclos pendentes (config) com tarefas automáticas tipo ciclo para exibir dosagem e um único cartão. */
  const linhasCicloHoje = useMemo(
    () => linhasCicloOperacaoHoje(data.ciclos, tarefasHoje),
    [data.ciclos, tarefasHoje],
  );

  const linhasCicloHojeExibidas = useMemo(
    () => linhasCicloHoje.filter((l) => !ciclosDoneKeys.includes(l.key)),
    [linhasCicloHoje, ciclosDoneKeys]
  );

  const { atrasadas: linhasCicloAtrasadas, paraHoje: linhasCicloParaHoje } = useMemo(
    () => partitionLinhasCicloAtrasadasVsHoje(linhasCicloHojeExibidas),
    [linhasCicloHojeExibidas],
  );

  // Ocultação otimista só até o próximo sync do servidor.
  // Evita "sumir para sempre" quando o ciclo volta a ficar pendente.
  useEffect(() => {
    setCiclosDoneKeys([]);
  }, [tarefasQuery.data, data.ciclos]);

  const registrarCicloFeito = (
    linhaKey: string,
    cicloNumId: number | null,
    tarefa: (typeof tarefasHoje)[number] | null | undefined
  ) => {
    const okFeito = () => toast.success('Marcado como feito');
    const hideNow = () => setCiclosDoneKeys((prev) => (prev.includes(linhaKey) ? prev : [...prev, linhaKey]));
    const tarefaPendenteId =
      tarefa && (tarefa.status === 'pendente' || tarefa.status === 'em_andamento') ? tarefa.id : null;

    if (cicloNumId != null && cicloNumId > 0) {
      marcarCicloExecutado.mutate(
        { id: cicloNumId, ultimaExecucao: new Date() },
        {
          onSuccess: () => {
            if (tarefaPendenteId != null) {
              concluir.mutate(
                { id: tarefaPendenteId },
                {
                  onSuccess: async () => {
                    hideNow();
                    await Promise.all([utils.tarefas.list.invalidate(), utils.fazenda.loadAll.invalidate()]);
                    refetchTarefas();
                    refetchFazenda();
                    okFeito();
                  },
                  onError: (e) => toast.error(e.message),
                }
              );
            } else {
              hideNow();
              void utils.fazenda.loadAll.invalidate();
              refetchFazenda();
              okFeito();
            }
          },
        }
      );
      return;
    }

    if (tarefaPendenteId != null) {
      concluir.mutate(
        { id: tarefaPendenteId },
        {
          onSuccess: async () => {
            hideNow();
            await Promise.all([utils.tarefas.list.invalidate(), utils.fazenda.loadAll.invalidate()]);
            refetchTarefas();
            refetchFazenda();
            okFeito();
          },
          onError: (e) => toast.error(e.message),
        }
      );
    }
  };

  type LinhaCiclo = (typeof linhasCicloHojeExibidas)[number];

  const adiarCicloLinha = (linha: LinhaCiclo) => {
    const t = linha.tarefa;
    if (t && (t.status === 'pendente' || t.status === 'em_andamento')) {
      adiar.mutate({ tarefaId: t.id, horas: 24 }, { onSuccess: () => toast.success('Tarefa do ciclo adiada 24h') });
      return;
    }
    const nid = linha.cicloNumId;
    if (nid != null && nid > 0) {
      marcarCicloExecutado.mutate(
        { id: nid, ultimaExecucao: new Date() },
        {
          onSuccess: () => {
            toast.success('Ciclo não volta a aparecer como pendente hoje');
            refetchFazenda();
            setCiclosDoneKeys((prev) => (prev.includes(linha.key) ? prev : [...prev, linha.key]));
          },
        },
      );
    }
  };

  const cancelarAlertaCicloLinha = (linha: LinhaCiclo) => {
    const t = linha.tarefa;
    if (t && (t.status === 'pendente' || t.status === 'em_andamento')) {
      if (!window.confirm('Cancelar a tarefa ligada a este ciclo?')) return;
      updateTarefa.mutate({ id: t.id, status: 'cancelada' });
      return;
    }
    if (!window.confirm('Dispensar este alerta de ciclo para hoje?')) return;
    const nid = linha.cicloNumId;
    if (nid != null && nid > 0) {
      marcarCicloExecutado.mutate(
        { id: nid, ultimaExecucao: new Date() },
        {
          onSuccess: () => {
            toast.success('Dispensado');
            refetchFazenda();
            setCiclosDoneKeys((prev) => (prev.includes(linha.key) ? prev : [...prev, linha.key]));
          },
        },
      );
    } else {
      setCiclosDoneKeys((prev) => (prev.includes(linha.key) ? prev : [...prev, linha.key]));
      toast.success('Removido da lista');
    }
  };

  const renderCicloLinhaItem = (linha: LinhaCiclo) => {
    const nome = linha.ciclo?.nome ?? linha.tarefa?.titulo ?? 'Ciclo';
    const produto = linha.ciclo?.produto;
    const dose = dosagemParaExibir(linha.ciclo ?? undefined, linha.tarefa?.descricao ?? undefined);
    const mostrarBotaoFeito =
      (linha.cicloNumId != null && linha.cicloNumId > 0) ||
      (linha.tarefa != null &&
        (linha.tarefa.status === 'pendente' || linha.tarefa.status === 'em_andamento'));
    return (
      <li key={linha.key} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
              <span className="font-medium">{nome}</span>
              {produto ? <span className="text-muted-foreground">· {produto}</span> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Dosagem: <span className="font-medium text-foreground/90">{dose || '—'}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
            {mostrarBotaoFeito ? (
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() =>
                  registrarCicloFeito(
                    linha.key,
                    linha.cicloNumId != null && linha.cicloNumId > 0 ? linha.cicloNumId : null,
                    linha.tarefa ?? null,
                  )
                }
                disabled={marcarCicloExecutado.isPending || concluir.isPending}
              >
                Feito
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => adiarCicloLinha(linha)}
              disabled={marcarCicloExecutado.isPending || adiar.isPending}
            >
              Adiar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => cancelarAlertaCicloLinha(linha)}
              disabled={marcarCicloExecutado.isPending || updateTarefa.isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </li>
    );
  };

  const loading = planosQuery.isLoading || tarefasQuery.isLoading;
  type GrupoTarefas = { tipo: string; itens: (typeof tarefasHoje)[number][] };

  const perfisProntosRows = useMemo(() => listarAndaresPerfisProntosParaAcao(data), [data]);

  const taskGroupsSplit = useMemo(() => {
    const base = tarefasHoje.filter((t) => t.tipo !== 'ciclo');
    const { paraHoje, atrasadas } = partitionTarefasHojeVsAtrasadas(base);
    const ordemTipos = ['manutencao', 'transplantio', 'colheita', 'lavagem', 'medicao', 'outro'];
    const build = (items: typeof base): GrupoTarefas[] =>
      ordemTipos
        .map((tipo) => ({ tipo, itens: items.filter((t) => t.tipo === tipo) }))
        .filter((g) => g.itens.length > 0);
    return { gruposHoje: build(paraHoje), gruposAtrasadas: build(atrasadas) };
  }, [tarefasHoje]);

  const nPlantioGerminacao =
    planosFazerAgoraGerminacao.length + eventosPlantioCalendarioGerminacao.length;

  /** Secções visíveis conforme o alerta clicado no dashboard */
  const view = useMemo(() => {
    if (focus === 'colheita') {
      return {
        showCiclos: false,
        showPlantio: false,
        gruposHoje: [] as GrupoTarefas[],
        gruposAtrasadas: [] as GrupoTarefas[],
        // Andares/perfis prontos só existem em fazenda vertical/microverdes (torres).
        showPerfisProntos: !isHidroponia,
        total: isHidroponia ? 0 : perfisProntosRows.length,
      };
    }
    const showCiclos =
      focus === 'full' || focus === 'ciclos' || focus === 'tarefas' || focus === 'tarefas_atrasadas';
    const showPlantio = focus === 'full' || focus === 'plantio';
    let gH = taskGroupsSplit.gruposHoje;
    let gA = taskGroupsSplit.gruposAtrasadas;

    if (focus === 'ciclos' || focus === 'plantio') {
      gH = [];
      gA = [];
    } else if (focus === 'tarefas_hoje') {
      gA = [];
    } else if (focus === 'tarefas_atrasadas') {
      gH = [];
    } else if (
      focus === 'lavagem' ||
      focus === 'manutencao' ||
      focus === 'transplantio' ||
      focus === 'medicao' ||
      focus === 'outro'
    ) {
      gH = gH.filter((x) => x.tipo === focus);
      gA = gA.filter((x) => x.tipo === focus);
    }

    const nCiclos = showCiclos
      ? focus === 'tarefas_atrasadas'
        ? linhasCicloAtrasadas.length
        : linhasCicloHojeExibidas.length
      : 0;
    const nPlantio = showPlantio ? nPlantioGerminacao : 0;
    const nTH = gH.reduce((s, g) => s + g.itens.length, 0);
    const nTA = gA.reduce((s, g) => s + g.itens.length, 0);
    const total = nCiclos + nPlantio + nTH + nTA;
    return {
      showCiclos,
      showPlantio,
      gruposHoje: gH,
      gruposAtrasadas: gA,
      showPerfisProntos: false,
      total,
    };
  }, [
    focus,
    taskGroupsSplit.gruposHoje,
    taskGroupsSplit.gruposAtrasadas,
    linhasCicloHojeExibidas.length,
    linhasCicloAtrasadas.length,
    nPlantioGerminacao,
    perfisProntosRows.length,
    isHidroponia,
  ]);

  const kpisHoje = useMemo(() => {
    const outras =
      taskGroupsSplit.gruposHoje.reduce((s, g) => s + g.itens.length, 0) +
      taskGroupsSplit.gruposAtrasadas.reduce((s, g) => s + g.itens.length, 0);
    const total = linhasCicloHojeExibidas.length + nPlantioGerminacao + outras;
    const blocoPlantio = nPlantioGerminacao > 0;
    const nGruposTarefa = taskGroupsSplit.gruposHoje.length + taskGroupsSplit.gruposAtrasadas.length;
    const grupos =
      (linhasCicloHojeExibidas.length > 0 ? 1 : 0) + (blocoPlantio ? 1 : 0) + nGruposTarefa;
    const baseTasks = tarefasHoje.filter((t) => t.tipo !== 'ciclo');
    const urg = baseTasks.filter((t) => t.prioridade === 'urgente');
    return {
      total,
      pendentes: total,
      concluidas: 0,
      urgentes: urg.length,
      grupos,
    };
  }, [tarefasHoje, taskGroupsSplit, linhasCicloHojeExibidas.length, nPlantioGerminacao]);

  const tipoIcone: Record<string, ReactNode> = {
    manutencao: <Wrench className="w-4 h-4 text-red-600" />,
    transplantio: <Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    colheita: <Scissors className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    lavagem: <Droplet className="w-4 h-4 text-cyan-600" />,
    medicao: <FlaskConical className="w-4 h-4 text-purple-600" />,
    outro: <ClipboardList className="w-4 h-4 text-muted-foreground" />,
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Excluir esta tarefa?')) return;
    deleteTarefa.mutate({ id });
  };

  const fecharAgendaAoIniciarGerminacaoPlantio = () => {
    onCloseModal();
    void utils.fazenda.loadAll.invalidate();
    void refetchFazenda();
  };

  const handleCreate = () => {
    setFormError('');
    if (!newTitulo.trim()) { setFormError('Título é obrigatório'); return; }
    createTarefa.mutate({
      titulo: newTitulo.trim(),
      descricao: newDescricao.trim() || null,
      tipo: newTipo,
      prioridade: newPrioridade,
      dataVencimento: new Date(),
    }, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setNewTitulo('');
        setNewDescricao('');
        setNewTipo('outro');
        setNewPrioridade('media');
      },
    });
  };

  const formatDate = (d: Date | string | null) => {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (d: Date | string | null) => {
    if (!d) return false;
    const date = d instanceof Date ? d : new Date(d);
    const hoje = new Date();
    return date.toDateString() === hoje.toDateString();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
        {(focus === 'full' ||
          focus === 'tarefas' ||
          focus === 'tarefas_hoje' ||
          focus === 'tarefas_atrasadas') && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-sm font-semibold">Operação do dia</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() =>
                    gerarAutomaticas.mutate({
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    })
                  }
                  disabled={gerarAutomaticas.isPending}
                >
                  {gerarAutomaticas.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  Gerar tarefas
                </Button>
                <Button size="sm" className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  Nova tarefa
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border p-2 text-center"><p className="text-[10px] text-muted-foreground uppercase">Exibidas</p><p className="font-display font-bold">{kpisHoje.total}</p></div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-center"><p className="text-[10px] text-amber-700 uppercase">Pendentes</p><p className="font-display font-bold text-amber-800">{kpisHoje.pendentes}</p></div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-center"><p className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">Grupos</p><p className="font-display font-bold text-emerald-800 dark:text-emerald-200">{kpisHoje.grupos}</p></div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-center"><p className="text-[10px] text-red-700 uppercase">Urgentes</p><p className="font-display font-bold text-red-800">{kpisHoje.urgentes}</p></div>
            </div>
          </CardContent>
        </Card>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Carregando…</span>
          </div>
        ) : (
          <>
            {view.showPerfisProntos && (
              <Card className="border-red-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    Andares com perfil pronto para acção ({perfisProntosRows.length})
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">
                    Abre a torre com o andar já selecionado para transplantio, colheita ou registro na bandeja.
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  {perfisProntosRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Nenhum andar neste estado neste momento.</p>
                  ) : (
                    <ul className="space-y-2">
                      {perfisProntosRows.map((row) => (
                        <li key={`${row.torreId}-${row.andarId}`}>
                          <Link
                            href={`/torre/${row.torreId}?andar=${encodeURIComponent(row.andarId)}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm no-underline hover:bg-muted/40 transition-colors"
                            onClick={() => {
                              onCloseModal();
                              void utils.fazenda.loadAll.invalidate();
                              void refetchFazenda();
                            }}
                          >
                            <span className="font-medium text-foreground">
                              {row.torreNome}
                              <span className="text-muted-foreground font-normal">
                                {' '}
                                · Andar {row.andarNumero}
                              </span>
                            </span>
                            <span className="text-xs text-primary flex items-center gap-1 shrink-0">
                              Abrir torre
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {!view.showPerfisProntos && view.total === 0 && (
              <Card>
                <CardContent className="py-4 text-sm text-muted-foreground">
                  {focus === 'full'
                    ? 'Nenhuma atividade operacional pendente hoje/atrasada.'
                    : 'Não há itens para este alerta neste momento (ou já foram concluídos).'}
                </CardContent>
              </Card>
            )}

            {!view.showPerfisProntos && view.total > 0 && (
              <>
                {view.showCiclos &&
                  (focus === 'tarefas_atrasadas'
                    ? linhasCicloAtrasadas.length > 0
                    : linhasCicloHojeExibidas.length > 0) && (
                  <Card className="border-amber-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        Ciclos de aplicação (
                        {focus === 'tarefas_atrasadas'
                          ? linhasCicloAtrasadas.length
                          : linhasCicloHojeExibidas.length}
                        )
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      {linhasCicloAtrasadas.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 border-b border-amber-500/35 pb-1">
                            Atrasadas ({linhasCicloAtrasadas.length})
                          </p>
                          <ul className="space-y-2">{linhasCicloAtrasadas.map(renderCicloLinhaItem)}</ul>
                        </div>
                      )}
                      {focus !== 'tarefas_atrasadas' && linhasCicloParaHoje.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-foreground border-b border-border/60 pb-1">
                            Para hoje ({linhasCicloParaHoje.length})
                          </p>
                          <ul className="space-y-2">{linhasCicloParaHoje.map(renderCicloLinhaItem)}</ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {view.showPlantio &&
                  (planosFazerAgoraGerminacao.length > 0 || eventosPlantioCalendarioGerminacao.length > 0) && (
                  <Card className="border-emerald-500/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CalendarClock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Germinação / plantio inicial
                          <span className="text-muted-foreground font-normal text-sm">
                            ({planosFazerAgoraGerminacao.length + eventosPlantioCalendarioGerminacao.length})
                          </span>
                        </CardTitle>
                        <Button variant="outline" size="sm" className="text-xs h-8" asChild>
                          <Link
                            href="/planejamento?tab=lista"
                            onClick={() => onCloseModal()}
                          >
                            Planejamento
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground font-normal">
                        Só germinação e início de plano (sem transplantio vegetativa/maturação nem colheita — faça essas acções {isHidroponia ? 'na bancada' : 'na torre'}).
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      {planosFazerAgoraGerminacao.length > 0 && (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 border-b border-amber-500/30 pb-1 mb-2">
                              Em atraso ({planosGerminacaoAtrasados.length})
                            </p>
                            {planosGerminacaoAtrasados.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-1 pl-0.5">
                                Nenhum plano de germinação/plantio inicial em atraso.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {planosGerminacaoAtrasados.map((plano: PlanoAcaoHoje) => (
                                  <HojePlanoAcaoRow
                                    key={plano.id}
                                    plano={plano}
                                    hojeYmd={hojeYmdOperacao}
                                    isAdmin={!!isAdmin}
                                    agendaSomentePlantio
                                    fecharAgendaAoIniciarGerminacao={fecharAgendaAoIniciarGerminacaoPlantio}
                                    salvarTaxaEMarcarPronta={salvarTaxaEMarcarProntaHoje}
                                    comboBusy={
                                      registrarContagemPlano.isPending || marcarGerminacaoProntaPlano.isPending
                                    }
                                    onAvancar={(id, novoStatus) => avancarPlanoMutation.mutate({ id, novoStatus })}
                                    avancarBusy={avancarPlanoMutation.isPending}
                                  />
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-emerald-900/90 dark:text-emerald-200/95 border-b border-emerald-500/25 pb-1 mb-2">
                              Para hoje ({planosGerminacaoMarcoHoje.length})
                            </p>
                            {planosGerminacaoMarcoHoje.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-1 pl-0.5">
                                Nenhum marco de germinação/plantio para hoje nesta lista.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {planosGerminacaoMarcoHoje.map((plano: PlanoAcaoHoje) => (
                                  <HojePlanoAcaoRow
                                    key={plano.id}
                                    plano={plano}
                                    hojeYmd={hojeYmdOperacao}
                                    isAdmin={!!isAdmin}
                                    agendaSomentePlantio
                                    fecharAgendaAoIniciarGerminacao={fecharAgendaAoIniciarGerminacaoPlantio}
                                    salvarTaxaEMarcarPronta={salvarTaxaEMarcarProntaHoje}
                                    comboBusy={
                                      registrarContagemPlano.isPending || marcarGerminacaoProntaPlano.isPending
                                    }
                                    onAvancar={(id, novoStatus) => avancarPlanoMutation.mutate({ id, novoStatus })}
                                    avancarBusy={avancarPlanoMutation.isPending}
                                  />
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
                      )}
                      {eventosPlantioCalendarioGerminacao.length > 0 && (
                        <div>
                          {planosFazerAgoraGerminacao.length > 0 && (
                            <p className="text-xs font-semibold text-muted-foreground mb-2 border-b border-border/40 pb-1">
                              Marcos no calendário (hoje)
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mb-2">
                            {resumoFasesDoDiaPt(eventosPlantioCalendarioGerminacao)}
                          </p>
                          <ul className="space-y-2">
                            {eventosPlantioCalendarioGerminacao.map((e) => (
                              <li
                                key={e.id}
                                className={cn(
                                  'rounded-lg border px-3 py-2 text-sm flex flex-wrap items-center gap-2',
                                  CHIP[e.tipo],
                                )}
                              >
                                <span className="font-semibold">{e.rotulo}</span>
                                <span className="text-foreground/90">{e.variedade}</span>
                                {e.quantidade != null && (
                                  <span className="text-xs font-mono text-muted-foreground">{e.quantidade} plantas</span>
                                )}
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => marcarPlantioExecutado(e.id)}
                                >
                                  Feito
                                </Button>
                                <span className="text-[10px] text-muted-foreground ml-auto">Plano #{e.planoId}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {[
                  {
                    key: 'atrasadas',
                    labelClass: 'text-amber-800 dark:text-amber-200',
                    grupos: view.gruposAtrasadas,
                  },
                  {
                    key: 'hoje',
                    labelClass: 'text-foreground',
                    grupos: view.gruposHoje,
                  },
                ].map(
                  (sec) =>
                    sec.grupos.length === 0 ? null : (
                      <div key={sec.key} className="space-y-3">
                        <p className={cn('text-sm font-semibold border-b border-border/60 pb-1', sec.labelClass)}>
                          {sec.key === 'atrasadas'
                            ? `Atrasadas (${sec.grupos.reduce((s, g) => s + g.itens.length, 0)})`
                            : `Para hoje (${sec.grupos.reduce((s, g) => s + g.itens.length, 0)})`}
                        </p>
                        {sec.grupos.map(({ tipo, itens }) => (
                  <Card key={`${sec.key}-${tipo}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {tipoIcone[tipo] || <ClipboardList className="w-4 h-4" />}
                        {TIPO_LABEL[tipo] ?? tipo} ({itens.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2">
                        {itens.map((t) => {
                      const tipo = TIPO_BADGE[t.tipo] || TIPO_BADGE.outro;
                      const isPendente = t.status === 'pendente' || t.status === 'em_andamento';
                      const isUrgente = t.prioridade === 'urgente';
                      const prioInfo = PRIORIDADE_ICONS[t.prioridade] || PRIORIDADE_ICONS.media;
                      const tip = (TOOLTIPS.TAREFAS as any)[t.tipo];
                      return (
                        <li
                          key={t.id}
                          className={cn(
                            'rounded-lg border bg-card px-3 py-2.5 flex items-start gap-3',
                            isUrgente && isPendente && 'border-red-300 bg-red-50/30',
                            !isPendente && 'opacity-70',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              isPendente &&
                              concluir.mutate(
                                { id: t.id },
                                { onSuccess: () => toast.success('Marcado como feito') }
                              )
                            }
                            disabled={!isPendente || concluir.isPending}
                            className={cn(
                              'mt-0.5 shrink-0',
                              isPendente ? 'text-muted-foreground hover:text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400',
                            )}
                            aria-label="Marcar concluída"
                          >
                            {isPendente ? <Circle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn('text-sm font-medium', !isPendente && 'line-through text-muted-foreground')}>
                                {t.titulo}
                              </span>
                              <span className={cn('text-[10px] px-1.5 py-0 rounded font-medium', tipo)}>
                                {TIPO_LABEL[t.tipo] ?? t.tipo}
                              </span>
                              {tip && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex items-center text-muted-foreground hover:text-foreground" aria-label="Ajuda">
                                      <HelpCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-semibold">{tip.titulo}</p>
                                    <p className="mt-1 text-xs">{tip.descricao}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <span className={cn('flex items-center gap-0.5 text-[10px] font-medium', prioInfo.color)}>
                                {prioInfo.icon}
                                {prioInfo.label}
                              </span>
                            </div>
                            {t.descricao && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.descricao}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {isToday(t.dataVencimento) ? 'Hoje' : formatDate(t.dataVencimento)}
                              </span>
                              {t.concluidoPorNome && <span>Concluída por: {t.concluidoPorNome}</span>}
                            </div>
                          </div>
                          {isPendente && (
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-xs"
                                onClick={() => {
                                  setQuickTask(t);
                                  setQuickOpen(true);
                                }}
                              >
                                Feito
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => adiar.mutate({ tarefaId: t.id, horas: 1 })}>
                                ⏭ 1h
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => adiar.mutate({ tarefaId: t.id, horas: 24 })}>
                                ⏭ Amanhã
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (!window.confirm('Cancelar esta tarefa?')) return;
                                  updateTarefa.mutate({ id: t.id, status: 'cancelada' });
                                }}
                                disabled={updateTarefa.isPending}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => handleDelete(t.id)}
                              disabled={deleteTarefa.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </li>
                      );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                        ))}
                      </div>
                    ),
                )}
              </>
            )}
          </>
        )}

      <QuickCheckInModal
        tarefa={quickTask}
        open={quickOpen}
        onOpenChange={setQuickOpen}
        onDone={async () => {
          await Promise.all([utils.tarefas.list.invalidate(), utils.fazenda.loadAll.invalidate()]);
          refetchTarefas();
          refetchFazenda();
          setQuickTask(null);
        }}
      />

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogDescription>
              Crie uma tarefa manual para o checklist operacional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input placeholder="Descrição breve da tarefa" value={newTitulo} onChange={(e) => setNewTitulo(e.target.value)} disabled={createTarefa.isPending} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Detalhes adicionais..." value={newDescricao} onChange={(e) => setNewDescricao(e.target.value)} disabled={createTarefa.isPending} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newTipo} onValueChange={setNewTipo} disabled={createTarefa.isPending}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABEL).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={newPrioridade} onValueChange={setNewPrioridade} disabled={createTarefa.isPending}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={createTarefa.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createTarefa.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {createTarefa.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</>
              ) : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
