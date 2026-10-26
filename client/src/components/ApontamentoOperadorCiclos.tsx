import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Droplets, FlaskConical, Leaf } from "lucide-react";
import { useFazenda } from "@/contexts/FazendaContext";
import { useDbIdResolver } from "@/hooks/useDbIdResolver";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { caldaFoliar, cartaoSolucao, type ProdutoSolucaoId } from "@/data/cicloFases14d";
import { cicloPendenteNoProtocolo } from "@/lib/utils-farm";
import { torreEstaAtivaNoDashboard } from "@/lib/types";
import {
  avaliarApontamentoRaiz,
  temBloqueio,
  type AlertaApontamento,
} from "@shared/apontamentoSeguranca";
import { infinitosCarregadosPorLote } from "@shared/quadroAplicacoesProtocolo";
import { hojeYmdSaoPaulo, ymdCalendario } from "@shared/cicloSequencia";

const RAIZ_IDS: ProdutoSolucaoId[] = ["thyper", "infinito", "cercobin"];

function referenciaHoje(): Date {
  const [a, m, d] = hojeYmdSaoPaulo().split("-").map(Number);
  return new Date(a, (m || 1) - 1, d || 1, 12, 0, 0);
}

function fmtBr(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

/**
 * Tela do operador: caldas sugeridas automaticamente; raiz apontada à mão
 * com alerta de segurança antes de gravar.
 */
export default function ApontamentoOperadorCiclos() {
  const { data } = useFazenda();
  const resolver = useDbIdResolver();
  const utils = trpc.useUtils();
  const hoje = hojeYmdSaoPaulo();
  const refHoje = referenciaHoje();

  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoSolucaoId | null>(null);
  const [caixasSel, setCaixasSel] = useState<string[]>([]);
  const [alertasPendentes, setAlertasPendentes] = useState<AlertaApontamento[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const aplicarCaixa = trpc.ciclos.aplicarNaCaixa.useMutation();
  const marcarFoliar = trpc.ciclos.marcarExecutado.useMutation();

  const cicloPorProduto = useMemo(() => {
    const map = new Map<string, (typeof data.ciclos)[0]>();
    const norm = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase();
    for (const c of data.ciclos) {
      if (c.ativo === false) continue;
      const nome = norm(c.nome);
      const bruto = norm(`${c.nome} ${c.produto}`);
      if (nome.startsWith("calda a")) map.set("A", c);
      else if (nome.startsWith("calda b")) map.set("B", c);
      else if (bruto.includes("infinito")) map.set("infinito", c);
      else if (bruto.includes("cercobin")) map.set("cercobin", c);
      else if (bruto.includes("thyper") || bruto.includes("peroxido")) map.set("thyper", c);
    }
    return map;
  }, [data.ciclos]);

  const caldasSugeridas = useMemo(() => {
    return (["A", "B"] as const)
      .map((id) => {
        const ciclo = cicloPorProduto.get(id);
        if (!ciclo) return null;
        const pendente = cicloPendenteNoProtocolo(ciclo, data.ciclos, refHoje);
        const calda = caldaFoliar(id);
        return { id, ciclo, pendente, calda };
      })
      .filter(Boolean) as Array<{
      id: "A" | "B";
      ciclo: (typeof data.ciclos)[0];
      pendente: boolean;
      calda: ReturnType<typeof caldaFoliar>;
    }>;
  }, [cicloPorProduto, data.ciclos, refHoje]);

  const caixasElegiveis = useMemo(() => {
    if (!produtoAtivo) return [];
    const ciclo = cicloPorProduto.get(produtoAtivo);
    if (!ciclo) return [];
    const ids = new Set(ciclo.caixaIds ?? []);
    const cartao = cartaoSolucao(produtoAtivo);
    return data.caixasAgua
      .filter((c) => ids.has(c.id))
      .filter((c) => {
        if (produtoAtivo === "infinito" || produtoAtivo === "cercobin") {
          return cartao.fases.includes(c.fase as "vegetativa" | "maturacao" | "mudas");
        }
        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [produtoAtivo, cicloPorProduto, data.caixasAgua]);

  function ultimasNaCaixa(caixaId: string) {
    const pick = (key: "infinito" | "cercobin" | "thyper") => {
      const ciclo = cicloPorProduto.get(key);
      if (!ciclo) return null;
      const ex = ciclo.execucoesCaixa?.find((e) => e.caixaId === caixaId);
      return ymdCalendario(ex?.ultimaExecucao ?? ciclo.ultimaExecucao ?? null);
    };
    return {
      infinito: pick("infinito"),
      cercobin: pick("cercobin"),
      thyper: pick("thyper"),
    };
  }

  function infinitoLote(caixaId: string): string | null {
    const carregados = infinitosCarregadosPorLote({
      caixaId,
      hojeYmd: hoje,
      torres: data.torres
        .filter((t) => torreEstaAtivaNoDashboard(t))
        .map((t) => ({ id: t.id, nome: t.nome, caixaAguaId: t.caixaAguaId })),
      ciclos: data.ciclos.map((c) => ({
        id: c.id,
        nome: c.nome,
        produto: c.produto,
        ativo: c.ativo !== false,
        alvo: c.alvo,
        frequencia: c.frequencia,
        intervaloDias: c.intervaloDias,
        caixaIds: c.caixaIds ?? [],
        execucoes: (c.execucoesCaixa ?? []).map((e) => ({
          caixaId: e.caixaId,
          ultimaExecucao: e.ultimaExecucao,
          dataAgenda: e.dataAgenda,
        })),
      })),
      transplantios: data.transplantios.map((t) => ({
        dataHora: t.dataHora,
        torreOrigemId: t.torreOrigemId,
        torreDestinoId: t.torreDestinoId,
        quantidadeTransplantada: t.quantidadeTransplantada,
        faseDestino: t.faseDestino,
      })),
    });
    return carregados.map((c) => c.ymd).sort().at(-1) ?? null;
  }

  function abrirApontamento(id: ProdutoSolucaoId) {
    const ciclo = cicloPorProduto.get(id);
    if (!ciclo) {
      toast.error("Este produto ainda não está cadastrado nos ciclos da fazenda.");
      return;
    }
    setProdutoAtivo(id);
    const elegiveis = data.caixasAgua
      .filter((c) => (ciclo.caixaIds ?? []).includes(c.id))
      .filter((c) => {
        if (id === "infinito" || id === "cercobin") return c.fase !== "mudas";
        return true;
      })
      .map((c) => c.id);
    setCaixasSel(elegiveis);
    setAlertasPendentes([]);
  }

  function checarERegistrar() {
    if (!produtoAtivo || caixasSel.length === 0) {
      toast.error("Escolha pelo menos uma caixa.");
      return;
    }
    const todos: AlertaApontamento[] = [];
    for (const caixaId of caixasSel) {
      const alertas = avaliarApontamentoRaiz({
        produto: produtoAtivo,
        nomeCiclo: cicloPorProduto.get(produtoAtivo)?.nome,
        hojeYmd: hoje,
        ultimasNaCaixa: ultimasNaCaixa(caixaId),
        infinitoCarregadoLoteYmd: infinitoLote(caixaId),
      });
      const nomeCx = data.caixasAgua.find((c) => c.id === caixaId)?.nome ?? caixaId;
      for (const a of alertas) {
        todos.push({ ...a, mensagem: `${nomeCx}: ${a.mensagem}` });
      }
    }
    if (todos.length > 0) {
      setAlertasPendentes(todos);
      setConfirmOpen(true);
      return;
    }
    void gravarAplicacoes();
  }

  async function gravarAplicacoes() {
    if (!produtoAtivo) return;
    if (temBloqueio(alertasPendentes)) {
      toast.error("Não é possível registrar: há bloqueio de segurança.");
      return;
    }
    const ciclo = cicloPorProduto.get(produtoAtivo);
    if (!ciclo) return;
    const cicloId = Number(String(ciclo.id).replace(/^c-/, ""));
    if (!Number.isFinite(cicloId)) {
      toast.error("Ciclo inválido.");
      return;
    }

    setConfirmOpen(false);
    let ok = 0;
    let falhas = 0;
    for (const slug of caixasSel) {
      const caixaDbId = resolver.caixaSlugToId.get(slug);
      if (caixaDbId == null) {
        falhas += 1;
        continue;
      }
      try {
        await aplicarCaixa.mutateAsync({ cicloId, caixaAguaId: caixaDbId });
        ok += 1;
      } catch {
        falhas += 1;
      }
    }
    await utils.fazenda.loadAll.invalidate();
    setProdutoAtivo(null);
    setCaixasSel([]);
    setAlertasPendentes([]);
    if (ok > 0) {
      toast.success(
        falhas > 0
          ? `Registrado em ${ok} caixa(s). ${falhas} falhou.`
          : `Aplicação registrada em ${ok} caixa(s).`,
      );
    } else {
      toast.error("Não foi possível registrar a aplicação.");
    }
  }

  async function marcarCalda(cicloIdFront: string) {
    const dbId = resolver.cicloFrontIdToDbId.get(cicloIdFront);
    if (!dbId) {
      toast.error("Ciclo não encontrado.");
      return;
    }
    try {
      await marcarFoliar.mutateAsync({ id: dbId, ultimaExecucao: new Date() });
      await utils.fazenda.loadAll.invalidate();
      toast.success("Calda registrada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar calda.");
    }
  }

  const pendenteRegistro = aplicarCaixa.isPending || marcarFoliar.isPending;

  return (
    <div className="mb-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Aplicações de hoje</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hoje.split("-").reverse().join("/")} — marque o que for feito. Tratamento de
          raiz você escolhe; o sistema avisa se houver risco.
        </p>
      </div>

      {/* Caldas — indicação automática */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-1 flex items-center gap-2 font-display text-base font-bold">
          <Leaf className="h-4 w-4 text-emerald-600" />
          Caldas foliares
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Sugestão automática do protocolo (não conflitam com raiz). Aplique quando
          estiver no dia e marque Pronto.
        </p>
        <div className="space-y-2">
          {caldasSugeridas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma calda cadastrada.</p>
          ) : (
            caldasSugeridas.map(({ id, ciclo, pendente, calda }) => (
              <div
                key={id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                  pendente
                    ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                    : "bg-muted/20"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{calda.nome}</h3>
                    {pendente ? (
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        SUGERIDO HOJE
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Fora do dia sugerido</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{calda.dosagemAgenda}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Foliar · manhã cedo ou fim de tarde · {calda.frequencia}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1"
                  disabled={!pendente || pendenteRegistro}
                  variant={pendente ? "default" : "outline"}
                  onClick={() => void marcarCalda(ciclo.id)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Pronto
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Raiz — escolha manual */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-1 flex items-center gap-2 font-display text-base font-bold">
          <Droplets className="h-4 w-4 text-sky-700" />
          Tratamento de raiz (você escolhe o dia)
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Toque no produto, confira a dose, escolha as caixas e registre. Se houver risco
          de segurança, o sistema avisa antes de gravar.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {RAIZ_IDS.map((id) => {
            const cartao = cartaoSolucao(id);
            const ciclo = cicloPorProduto.get(id);
            return (
              <button
                key={id}
                type="button"
                disabled={!ciclo}
                onClick={() => abrirApontamento(id)}
                className={`rounded-xl border p-3 text-left transition hover:border-primary/50 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                  produtoAtivo === id ? "border-primary bg-primary/5" : "bg-card"
                }`}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-display font-bold">{cartao.nome}</span>
                </div>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {cartao.linhas.map((l) => (
                    <li key={l.rotulo}>
                      <span className="font-medium text-foreground">{l.rotulo}:</span> {l.valor}
                    </li>
                  ))}
                </ul>
                {cartao.aviso ? (
                  <p className="mt-2 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                    {cartao.aviso}
                  </p>
                ) : null}
                {!ciclo ? (
                  <p className="mt-2 text-[11px] text-destructive">Não cadastrado nesta fazenda</p>
                ) : (
                  <p className="mt-2 text-[11px] text-primary">Toque para apontar →</p>
                )}
              </button>
            );
          })}
        </div>

        {produtoAtivo ? (
          <div className="mt-4 rounded-lg border border-dashed p-3">
            <h3 className="mb-2 text-sm font-semibold">
              Registrar {cartaoSolucao(produtoAtivo).nome} — escolha as caixas
            </h3>
            <div className="mb-3 max-h-48 space-y-1 overflow-y-auto">
              {caixasElegiveis.map((cx) => {
                const checked = caixasSel.includes(cx.id);
                return (
                  <label
                    key={cx.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setCaixasSel((prev) =>
                          checked ? prev.filter((id) => id !== cx.id) : [...prev, cx.id],
                        );
                      }}
                    />
                    <span>
                      {cx.nome}{" "}
                      <span className="text-xs text-muted-foreground">({cx.fase})</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={checarERegistrar}
                disabled={pendenteRegistro || caixasSel.length === 0}
              >
                Registrar aplicação
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setProdutoAtivo(null);
                  setCaixasSel([]);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              {temBloqueio(alertasPendentes) ? "Não pode aplicar" : "Atenção à segurança"}
            </DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {alertasPendentes.map((a, i) => (
              <li
                key={i}
                className={
                  a.nivel === "bloqueio"
                    ? "font-medium text-destructive"
                    : "text-amber-900 dark:text-amber-200"
                }
              >
                {a.nivel === "bloqueio" ? "Bloqueio: " : "Aviso: "}
                {a.mensagem}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Hoje: {fmtBr(hoje)}. Confirme só se a operação estiver correta.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Voltar
            </Button>
            {!temBloqueio(alertasPendentes) ? (
              <Button type="button" onClick={() => void gravarAplicacoes()} disabled={pendenteRegistro}>
                Entendi, registrar mesmo assim
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
