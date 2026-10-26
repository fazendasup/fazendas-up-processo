import { useMemo, useState } from "react";
import { useFazenda } from "@/contexts/FazendaContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarDays, LayoutGrid } from "lucide-react";
import {
  diasFaixaQuadro,
  montarQuadroAplicacoesProtocolo,
  rotuloProdutoCurto,
  type ProdutoQuadro,
} from "@shared/quadroAplicacoesProtocolo";
import { hojeYmdSaoPaulo } from "@shared/cicloSequencia";
import { torreEstaAtivaNoDashboard } from "@/lib/types";

function fmtBr(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

const COR: Record<ProdutoQuadro, string> = {
  infinito: "bg-violet-600 text-white",
  cercobin: "bg-sky-700 text-white",
  thyper: "bg-teal-700 text-white",
};

const COR_SUAVE: Record<ProdutoQuadro, string> = {
  infinito: "bg-violet-100 text-violet-900 border-violet-200",
  cercobin: "bg-sky-100 text-sky-900 border-sky-200",
  thyper: "bg-teal-100 text-teal-900 border-teal-200",
};

type ModoVista = "caixa" | "calendario";

/** Quadro por caixa + faixa de calendário: o que foi aplicado e o que vem. */
export default function QuadroAplicacoesProtocolo() {
  const { data } = useFazenda();
  const [modo, setModo] = useState<ModoVista>("caixa");
  const hoje = hojeYmdSaoPaulo();

  const linhas = useMemo(() => {
    return montarQuadroAplicacoesProtocolo({
      hojeYmd: hoje,
      caixas: data.caixasAgua.map((c) => ({
        id: c.id,
        nome: c.nome,
        fase: c.fase,
      })),
      torres: data.torres
        .filter((t) => torreEstaAtivaNoDashboard(t))
        .map((t) => ({
          id: t.id,
          nome: t.nome,
          caixaAguaId: t.caixaAguaId,
        })),
      ciclos: data.ciclos.map((c) => ({
        id: c.id,
        nome: c.nome,
        produto: c.produto,
        ativo: c.ativo !== false,
        alvo: c.alvo,
        frequencia: c.frequencia,
        intervaloDias: c.intervaloDias,
        diasSemana: c.diasSemana,
        dataInicio: c.dataInicio,
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
        faseDestino: t.faseDestino,
        quantidadeTransplantada: t.quantidadeTransplantada,
      })),
    });
  }, [data.caixasAgua, data.ciclos, data.torres, data.transplantios, hoje]);

  const dias = useMemo(() => diasFaixaQuadro(hoje, 7, 14), [hoje]);

  const eventosPorDia = useMemo(() => {
    const map = new Map<string, Array<{ caixa: string; produto: ProdutoQuadro; tipo: "feito" | "prox" }>>();
    for (const linha of linhas) {
      for (const prod of ["infinito", "cercobin", "thyper"] as ProdutoQuadro[]) {
        const ult = linha.ultimas[prod];
        if (ult) {
          const arr = map.get(ult) ?? [];
          arr.push({ caixa: linha.caixaNome, produto: prod, tipo: "feito" });
          map.set(ult, arr);
        }
        const prox = linha.proximas[prod];
        if (prox) {
          const arr = map.get(prox) ?? [];
          arr.push({ caixa: linha.caixaNome, produto: prod, tipo: "prox" });
          map.set(prox, arr);
        }
      }
    }
    return map;
  }, [linhas]);

  if (linhas.length === 0) {
    return (
      <section className="mb-6 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Sem caixas de vegetativa/maturação para montar o quadro.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold">Quadro de aplicações</h2>
          <p className="text-xs text-muted-foreground">
            Por caixa (solução compartilhada). Se um lote veio da vegetativa com Infinito
            recente, o Cercobin da maturação espera a folga — mesmo que a caixa já esteja
            “no prazo”.
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={modo === "caixa" ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => setModo("caixa")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Por caixa
          </Button>
          <Button
            type="button"
            size="sm"
            variant={modo === "calendario" ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => setModo("calendario")}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendário
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
        {(
          [
            ["infinito", "Infinito"],
            ["cercobin", "Cercobin"],
            ["thyper", "Thyper"],
          ] as const
        ).map(([id, label]) => (
          <span key={id} className={`rounded px-2 py-0.5 ${COR[id]}`}>
            {label}
          </span>
        ))}
        <span className="rounded border border-dashed px-2 py-0.5 text-muted-foreground">
          contorno = próxima
        </span>
      </div>

      {modo === "caixa" ? (
        <div className="space-y-2">
          {linhas.map((linha) => (
            <article
              key={linha.caixaId}
              className="rounded-xl border bg-card p-3 shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{linha.caixaNome}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {linha.fase}
                    {linha.torres.length > 0 ? ` · ${linha.torres.join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["infinito", "Infinito"],
                      ["cercobin", "Cercobin"],
                      ["thyper", "Thyper"],
                    ] as const
                  ).map(([prod, label]) => {
                    const ult = linha.ultimas[prod];
                    const prox = linha.proximas[prod];
                    if (!ult && !prox) return null;
                    return (
                      <div key={prod} className="text-right text-[10px] leading-tight">
                        <div className={`inline-block rounded px-1.5 py-0.5 font-semibold ${COR[prod]}`}>
                          {label}
                        </div>
                        <div className="mt-0.5 text-muted-foreground">
                          {ult ? `últ. ${fmtBr(ult)}` : "sem últ."}
                          {prox ? ` → ${fmtBr(prox)}` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="flex min-w-max gap-0.5">
                  {dias.map((ymd) => {
                    const feitos = (["infinito", "cercobin", "thyper"] as ProdutoQuadro[]).filter(
                      (p) => linha.ultimas[p] === ymd,
                    );
                    const prox = (["infinito", "cercobin", "thyper"] as ProdutoQuadro[]).filter(
                      (p) => linha.proximas[p] === ymd,
                    );
                    const isHoje = ymd === hoje;
                    return (
                      <div
                        key={ymd}
                        className={`w-9 shrink-0 rounded border px-0.5 py-1 text-center ${
                          isHoje ? "border-foreground/40 bg-muted/60" : "border-transparent"
                        }`}
                      >
                        <div className="text-[9px] text-muted-foreground">{fmtBr(ymd)}</div>
                        <div className="mt-0.5 flex min-h-[28px] flex-col items-center gap-0.5">
                          {feitos.map((p) => (
                            <span
                              key={`f-${p}`}
                              className={`rounded px-1 text-[9px] font-bold ${COR[p]}`}
                              title={`${p} aplicado`}
                            >
                              {rotuloProdutoCurto(p)}
                            </span>
                          ))}
                          {prox.map((p) => (
                            <span
                              key={`p-${p}`}
                              className={`rounded border border-dashed px-1 text-[9px] font-bold ${COR_SUAVE[p]}`}
                              title={`${p} recomendado`}
                            >
                              {rotuloProdutoCurto(p)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {linha.alertas.map((alerta, idx) => (
                <p
                  key={idx}
                  className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-200"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {alerta.motivo} Liberado em {fmtBr(alerta.liberadoEmYmd)}.
                  </span>
                </p>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card p-3">
          <div className="flex min-w-max gap-1">
            {dias.map((ymd) => {
              const evs = eventosPorDia.get(ymd) ?? [];
              const isHoje = ymd === hoje;
              return (
                <div
                  key={ymd}
                  className={`w-28 shrink-0 rounded-lg border p-1.5 ${
                    isHoje ? "border-foreground/50 bg-muted/50" : "border-border"
                  }`}
                >
                  <div className="mb-1 text-center text-[10px] font-semibold">
                    {fmtBr(ymd)}
                    {isHoje ? " · hoje" : ""}
                  </div>
                  <div className="space-y-1">
                    {evs.length === 0 ? (
                      <p className="text-center text-[9px] text-muted-foreground">—</p>
                    ) : (
                      evs.slice(0, 8).map((ev, i) => (
                        <div
                          key={`${ev.caixa}-${ev.produto}-${ev.tipo}-${i}`}
                          className={`rounded px-1 py-0.5 text-[9px] leading-tight ${
                            ev.tipo === "feito" ? COR[ev.produto] : COR_SUAVE[ev.produto]
                          } ${ev.tipo === "prox" ? "border border-dashed" : ""}`}
                        >
                          <div className="font-bold">{rotuloProdutoCurto(ev.produto)}</div>
                          <div className="truncate opacity-90">{ev.caixa}</div>
                          <div className="opacity-80">{ev.tipo === "feito" ? "feito" : "próx"}</div>
                        </div>
                      ))
                    )}
                    {evs.length > 8 ? (
                      <p className="text-center text-[9px] text-muted-foreground">
                        +{evs.length - 8}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
