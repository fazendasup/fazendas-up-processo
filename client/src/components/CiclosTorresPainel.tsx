import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Droplets,
  Plus,
} from "lucide-react";
import { useFazenda } from "@/contexts/FazendaContext";
import { useDbIdResolver } from "@/hooks/useDbIdResolver";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FASES_CONFIG, torreEstaAtivaNoDashboard, type CicloAplicacao, type Torre } from "@/lib/types";
import { formatarDataHora } from "@/lib/utils-farm";
import {
  caixaElegivelProgramacao,
  idCaixaMudasCompartilhada,
  torreEhMicroverdesCultivo,
} from "@shared/mudasBandejas";
import { hojeYmdSaoPaulo } from "@shared/cicloSequencia";

const STORAGE_TORRES_MIN = "ciclos.torresMinimizadas";
const STORAGE_PAINEL_MIN = "ciclos.painelTorresMinimizado";

function dateAtLocalNoonFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

function fmtYmdBr(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return "—";
  return ymd.slice(0, 10).split("-").reverse().join("/");
}

function ultimaAplicacaoYmd(ciclo: CicloAplicacao, caixaSlug: string | undefined): string | null {
  if (!caixaSlug) return ciclo.ultimaExecucao?.slice(0, 10) ?? null;
  const ex = ciclo.execucoesCaixa?.find((e) => e.caixaId === caixaSlug);
  return (ex?.ultimaExecucao ?? ciclo.ultimaExecucao)?.slice(0, 10) ?? null;
}

/**
 * Visão principal da página de ciclos: todas as torres, histórico com datas
 * e registro de aplicação com data escolhida (histórico append-only).
 */
export default function CiclosTorresPainel() {
  const { data } = useFazenda();
  const resolver = useDbIdResolver();
  const utils = trpc.useUtils();
  const aplicarCaixa = trpc.ciclos.aplicarNaCaixa.useMutation();
  const marcarFoliar = trpc.ciclos.marcarExecutado.useMutation();

  const hoje = hojeYmdSaoPaulo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [torreFoco, setTorreFoco] = useState<Torre | null>(null);
  const [cicloIdFront, setCicloIdFront] = useState("");
  const [dataAplicacaoYmd, setDataAplicacaoYmd] = useState(hoje);
  const [painelMinimizado, setPainelMinimizado] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_PAINEL_MIN) === "1";
    } catch {
      return false;
    }
  });
  const [torresMinimizadas, setTorresMinimizadas] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_TORRES_MIN);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as unknown;
      return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
    } catch {
      return new Set();
    }
  });

  const caixaMudasId = useMemo(
    () => idCaixaMudasCompartilhada(data.torres),
    [data.torres],
  );

  const torres = useMemo(() => {
    return [...data.torres]
      .filter((t) => torreEstaAtivaNoDashboard(t))
      .sort((a, b) => {
        const fa = a.fase.localeCompare(b.fase);
        if (fa !== 0) return fa;
        return (a.numeroTorre ?? 0) - (b.numeroTorre ?? 0) || a.nome.localeCompare(b.nome, "pt-BR");
      });
  }, [data.torres]);

  const ciclosAtivos = useMemo(
    () => data.ciclos.filter((c) => c.ativo !== false),
    [data.ciclos],
  );

  function persistPainelMin(v: boolean) {
    setPainelMinimizado(v);
    try {
      localStorage.setItem(STORAGE_PAINEL_MIN, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function toggleTorreMin(id: string) {
    setTorresMinimizadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_TORRES_MIN, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function minimizarTodas() {
    const ids = torres.map((t) => t.id);
    const next = new Set(ids);
    setTorresMinimizadas(next);
    try {
      localStorage.setItem(STORAGE_TORRES_MIN, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }

  function expandirTodas() {
    setTorresMinimizadas(new Set());
    try {
      localStorage.setItem(STORAGE_TORRES_MIN, "[]");
    } catch {
      /* ignore */
    }
  }

  function abrirRegistrar(torre: Torre) {
    setTorreFoco(torre);
    setDataAplicacaoYmd(hoje);
    const caixa = data.caixasAgua.find((c) => c.id === torre.caixaAguaId);
    const elegiveis = ciclosAtivos.filter((c) => {
      if (c.alvo === "andar") return c.fasesAplicaveis.includes(torre.fase);
      if (!caixa) return false;
      return (c.caixaIds ?? []).includes(caixa.id);
    });
    setCicloIdFront(elegiveis[0]?.id ?? "");
    setDialogOpen(true);
  }

  async function confirmarRegistro() {
    if (!torreFoco) return;
    if (!cicloIdFront) {
      toast.error("Escolha a aplicação (ciclo).");
      return;
    }
    const ciclo = data.ciclos.find((c) => c.id === cicloIdFront);
    if (!ciclo) {
      toast.error("Ciclo não encontrado.");
      return;
    }
    const cicloDbId = resolver.cicloFrontIdToDbId.get(cicloIdFront);
    if (cicloDbId == null) {
      toast.error("Ciclo inválido.");
      return;
    }
    const dataHora = dateAtLocalNoonFromYmd(dataAplicacaoYmd.trim());
    if (Number.isNaN(dataHora.getTime())) {
      toast.error("Data da aplicação inválida.");
      return;
    }

    try {
      if (ciclo.alvo === "andar" || !(ciclo.caixaIds?.length)) {
        await marcarFoliar.mutateAsync({ id: cicloDbId, ultimaExecucao: dataHora });
      } else {
        const caixaSlug = torreFoco.caixaAguaId;
        if (!caixaSlug) {
          toast.error("Esta torre não tem caixa d'água ligada.");
          return;
        }
        if (!(ciclo.caixaIds ?? []).includes(caixaSlug)) {
          toast.error("Este ciclo não se aplica à caixa desta torre.");
          return;
        }
        const caixaDbId = resolver.caixaSlugToId.get(caixaSlug);
        if (caixaDbId == null) {
          toast.error("Caixa não encontrada.");
          return;
        }
        await aplicarCaixa.mutateAsync({
          cicloId: cicloDbId,
          caixaAguaId: caixaDbId,
          dataHora,
        });
      }
      await utils.fazenda.loadAll.invalidate();
      setDialogOpen(false);
      toast.success(
        `Aplicação de ${ciclo.nome} registrada em ${fmtYmdBr(dataAplicacaoYmd)}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar aplicação.");
    }
  }

  const pendenteRegistro = aplicarCaixa.isPending || marcarFoliar.isPending;

  const ciclosDialog = useMemo(() => {
    if (!torreFoco) return [];
    const caixa = data.caixasAgua.find((c) => c.id === torreFoco.caixaAguaId);
    return ciclosAtivos.filter((c) => {
      if (c.alvo === "andar") return c.fasesAplicaveis.includes(torreFoco.fase);
      if (!caixa) return false;
      if (!caixaElegivelProgramacao(caixa, data.torres, caixaMudasId)) return false;
      return (c.caixaIds ?? []).includes(caixa.id);
    });
  }, [torreFoco, ciclosAtivos, data.caixasAgua, data.torres, caixaMudasId]);

  return (
    <section className="mb-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Ciclos e aplicações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas as torres, histórico com data e registro (inclusive retroativo) sem
            apagar o que já foi feito.
          </p>
        </div>
        {torres.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {!painelMinimizado ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={minimizarTodas}
                >
                  Minimizar todas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={expandirTodas}
                >
                  Expandir todas
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1 text-xs"
              onClick={() => persistPainelMin(!painelMinimizado)}
            >
              {painelMinimizado ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {painelMinimizado
                ? `Mostrar torres (${torres.length})`
                : "Ocultar torres"}
            </Button>
          </div>
        ) : null}
      </div>

      {torres.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma torre ativa cadastrada.
        </div>
      ) : painelMinimizado ? (
        <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Torres ocultas. Use &quot;Mostrar torres&quot; para expandir de novo.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {torres.map((torre) => {
            const caixa = data.caixasAgua.find((c) => c.id === torre.caixaAguaId);
            const apps = [...(caixa?.aplicacoes ?? [])].sort(
              (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime(),
            );
            const recentes = apps.slice(0, 5);
            const ciclosTorre = ciclosAtivos.filter((c) => {
              if (c.alvo === "andar") return c.fasesAplicaveis.includes(torre.fase);
              if (!caixa) return false;
              return (c.caixaIds ?? []).includes(caixa.id);
            });
            const micro = torreEhMicroverdesCultivo(torre);
            const minimizada = torresMinimizadas.has(torre.id);
            const ultimaHist = recentes[0];

            return (
              <article
                key={torre.id}
                className="flex flex-col rounded-xl border bg-card p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-1.5 text-left"
                    onClick={() => toggleTorreMin(torre.id)}
                    title={minimizada ? "Expandir torre" : "Minimizar torre"}
                  >
                    {minimizada ? (
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-sm font-bold">{torre.nome}</h2>
                      <p className="text-[11px] text-muted-foreground">
                        {FASES_CONFIG[torre.fase]?.label ?? torre.fase}
                        {micro ? " · Microverdes (só manual)" : null}
                        {caixa ? ` · ${caixa.nome}` : " · Sem caixa"}
                        {minimizada && ultimaHist
                          ? ` · Última: ${formatarDataHora(ultimaHist.dataHora)}`
                          : null}
                      </p>
                    </div>
                  </button>
                  {!micro ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 gap-1 text-xs"
                      onClick={() => abrirRegistrar(torre)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Registrar
                    </Button>
                  ) : null}
                </div>

                {!minimizada ? (
                  <>
                    <div className="mb-2 mt-2 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Ciclos nesta torre
                      </p>
                      {ciclosTorre.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum ciclo ativo ligado.</p>
                      ) : (
                        <ul className="space-y-1">
                          {ciclosTorre.map((c) => {
                            const ult = ultimaAplicacaoYmd(c, caixa?.id);
                            return (
                              <li
                                key={c.id}
                                className="flex items-baseline justify-between gap-2 text-xs"
                              >
                                <span className="min-w-0 truncate font-medium">{c.nome}</span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                  {ult ? `Última ${fmtYmdBr(ult)}` : "Sem registro"}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="mt-auto border-t pt-2">
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <Droplets className="h-3 w-3" />
                        Histórico da caixa
                      </p>
                      {recentes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {caixa
                            ? "Nenhuma aplicação registrada ainda."
                            : "Sem caixa — histórico aparece ao registrar em outra torre da mesma caixa."}
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {recentes.map((a) => (
                            <li key={a.id} className="text-xs leading-snug">
                              <span className="font-semibold tabular-nums text-foreground">
                                {formatarDataHora(a.dataHora)}
                              </span>
                              <span className="text-muted-foreground"> · </span>
                              <span className="font-medium">{a.produto}</span>
                              {a.quantidade ? (
                                <span className="text-muted-foreground"> ({a.quantidade})</span>
                              ) : null}
                              {a.executadoPorNome ? (
                                <span className="text-muted-foreground"> — {a.executadoPorNome}</span>
                              ) : null}
                            </li>
                          ))}
                          {apps.length > recentes.length ? (
                            <li className="text-[10px] text-muted-foreground">
                              +{apps.length - recentes.length} registro(s) anteriores
                            </li>
                          ) : null}
                        </ul>
                      )}
                    </div>
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              Registrar aplicação
              {torreFoco ? ` — ${torreFoco.nome}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Aplicação (ciclo) *</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={cicloIdFront}
                onChange={(e) => setCicloIdFront(e.target.value)}
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {ciclosDialog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.produto})
                  </option>
                ))}
              </select>
              {ciclosDialog.length === 0 ? (
                <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-200">
                  Nenhum ciclo ativo para esta torre. Ative um ciclo na lista abaixo ou
                  cadastre um novo.
                </p>
              ) : null}
            </div>
            <div>
              <Label className="text-xs">Data da aplicação *</Label>
              <Input
                type="date"
                className="mt-1 h-9 text-sm"
                value={dataAplicacaoYmd}
                max={hoje}
                onChange={(e) => setDataAplicacaoYmd(e.target.value)}
              />
              <p className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
                <CalendarClock className="mt-0.5 h-3 w-3 shrink-0" />
                Pode ser hoje ou uma data passada. O histórico anterior não é apagado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={pendenteRegistro || !cicloIdFront}
              className="gap-1.5"
              onClick={() => void confirmarRegistro()}
            >
              <CheckCircle2 className="h-4 w-4" />
              {pendenteRegistro ? "Salvando…" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
