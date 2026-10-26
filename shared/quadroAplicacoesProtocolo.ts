/**
 * Quadro operacional: por caixa, o que foi aplicado e o que vem a seguir,
 * respeitando folga Infinito→Cercobin também quando o lote veio de outra caixa
 * (transplantio vegetativa → maturação).
 */

import {
  adicionarDiasYmd,
  aplicarFolgaSegurancaYmd,
  chaveAplicacaoProtocolo,
  dataPrevistaCicloYmd,
  diferencaDiasYmd,
  folgaMinimaDias,
  ymdCalendario,
  type PassoCicloAgenda,
} from "./cicloSequencia";

export type ProdutoQuadro = "infinito" | "cercobin" | "thyper";

export type EventoAplicacaoQuadro = {
  produto: ProdutoQuadro;
  ymd: string;
  origem: "caixa" | "lote_origem";
};

export type AlertaFolgaQuadro = {
  produto: "cercobin";
  motivo: string;
  liberadoEmYmd: string;
};

export type LinhaQuadroCaixa = {
  caixaId: string;
  caixaNome: string;
  fase: string;
  torres: string[];
  /** Última aplicação auditável nesta caixa. */
  ultimas: Partial<Record<ProdutoQuadro, string>>;
  /** Próxima recomendada (cadência + folgas + lotes transplantados). */
  proximas: Partial<Record<ProdutoQuadro, string>>;
  /** Eventos recentes para a faixa visual (últimos 14 + próximos 14). */
  timeline: EventoAplicacaoQuadro[];
  alertas: AlertaFolgaQuadro[];
};

type TorreRef = {
  id: string;
  nome: string;
  caixaAguaId?: string | null;
};

type CicloRef = {
  id: string | number;
  nome: string;
  produto: string;
  ativo: boolean;
  alvo: string;
  frequencia: string;
  intervaloDias?: number | null;
  diasSemana?: number[] | null;
  dataInicio?: string | null;
  caixaIds: string[];
  execucoes: Array<{
    caixaId: string;
    ultimaExecucao?: string | Date | null;
    dataAgenda?: string | Date | null;
  }>;
};

type TransplantioRef = {
  dataHora: string;
  torreOrigemId?: string | null;
  torreDestinoId?: string | null;
  faseDestino?: string;
  quantidadeTransplantada?: number;
};

function produtoDeCiclo(ciclo: { nome: string; produto: string }): ProdutoQuadro | null {
  const chave = chaveAplicacaoProtocolo(ciclo.nome, ciclo.produto);
  if (chave === "infinito" || chave === "cercobin" || chave === "thyper" || chave === "peroxido") {
    return chave === "peroxido" ? "thyper" : chave;
  }
  return null;
}

function ultimaNaCaixa(ciclo: CicloRef, caixaId: string): string | null {
  const ex = ciclo.execucoes.find((e) => e.caixaId === caixaId);
  return ymdCalendario(ex?.ultimaExecucao ?? null);
}

/**
 * Infinito “carregado” por lotes que chegaram a esta caixa (última dose na caixa de origem).
 */
export function infinitosCarregadosPorLote(input: {
  caixaId: string;
  torres: TorreRef[];
  transplantios: TransplantioRef[];
  ciclos: CicloRef[];
  /** Só considera transplantios dos últimos N dias. */
  janelaDias?: number;
  hojeYmd: string;
}): Array<{ ymd: string; torreOrigemNome?: string; transplantioYmd: string }> {
  const janela = input.janelaDias ?? 14;
  const torresDestino = input.torres.filter((t) => t.caixaAguaId === input.caixaId);
  const idsDestino = new Set(torresDestino.map((t) => t.id));
  const infinito = input.ciclos.find((c) => c.ativo && produtoDeCiclo(c) === "infinito");
  if (!infinito || idsDestino.size === 0) return [];

  const torresById = new Map(input.torres.map((t) => [t.id, t]));
  const saida: Array<{ ymd: string; torreOrigemNome?: string; transplantioYmd: string }> = [];

  for (const tr of input.transplantios) {
    if (!tr.torreDestinoId || !idsDestino.has(tr.torreDestinoId)) continue;
    if ((tr.quantidadeTransplantada ?? 0) <= 0) continue;
    const trYmd = ymdCalendario(tr.dataHora);
    if (!trYmd) continue;
    if (diferencaDiasYmd(trYmd, input.hojeYmd) > janela) continue;
    if (!tr.torreOrigemId) continue;
    const origem = torresById.get(tr.torreOrigemId);
    if (!origem?.caixaAguaId || origem.caixaAguaId === input.caixaId) continue;
    const ult = ultimaNaCaixa(infinito, origem.caixaAguaId);
    if (!ult) continue;
    // Só importa Infinito aplicado antes (ou no dia) do transplantio.
    if (ult > trYmd) continue;
    saida.push({
      ymd: ult,
      torreOrigemNome: origem.nome,
      transplantioYmd: trYmd,
    });
  }
  return saida;
}

function proximaProdutoCaixa(
  ciclo: CicloRef,
  caixaId: string,
  hojeYmd: string,
  outrosVirtuais: Array<{ nome: string; produto: string; ultimaExecucao: string | null }>,
): string | null {
  const passo: PassoCicloAgenda<string> = {
    id: Number(String(ciclo.id).replace(/^c-/, "")) || 0,
    ativo: ciclo.ativo,
    alvo: ciclo.alvo,
    frequencia: ciclo.frequencia,
    intervaloDias: ciclo.intervaloDias,
    diasSemana: ciclo.diasSemana,
    dataInicio: ciclo.dataInicio,
    nome: ciclo.nome,
    produto: ciclo.produto,
    caixaIds: ciclo.caixaIds,
    execucoes: ciclo.execucoes,
  };
  const base = dataPrevistaCicloYmd(passo, caixaId, hojeYmd);
  if (!base) return null;
  const outros = [
    ...ciclo.caixaIds.includes(caixaId)
      ? [] // preenchido abaixo via lista de ciclos
      : [],
    ...outrosVirtuais,
  ];
  return aplicarFolgaSegurancaYmd(
    base,
    { nome: ciclo.nome, produto: ciclo.produto },
    outros.map((o) => ({
      nome: o.nome,
      produto: o.produto,
      ultimaExecucao: o.ultimaExecucao,
      ativo: true,
    })),
  );
}

export function montarQuadroAplicacoesProtocolo(input: {
  hojeYmd: string;
  caixas: Array<{ id: string; nome: string; fase: string }>;
  torres: TorreRef[];
  ciclos: CicloRef[];
  transplantios: TransplantioRef[];
}): LinhaQuadroCaixa[] {
  const sistemicos = input.ciclos.filter((c) => c.ativo && produtoDeCiclo(c) != null);
  const porProduto = {
    infinito: sistemicos.find((c) => produtoDeCiclo(c) === "infinito"),
    cercobin: sistemicos.find((c) => produtoDeCiclo(c) === "cercobin"),
    thyper: sistemicos.find((c) => produtoDeCiclo(c) === "thyper"),
  };

  const linhas: LinhaQuadroCaixa[] = [];

  for (const caixa of input.caixas) {
    if (caixa.fase === "mudas") continue;
    const torresCx = input.torres
      .filter((t) => t.caixaAguaId === caixa.id)
      .map((t) => t.nome)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    const ultimas: Partial<Record<ProdutoQuadro, string>> = {};
    for (const prod of ["infinito", "cercobin", "thyper"] as ProdutoQuadro[]) {
      const ciclo = porProduto[prod];
      if (!ciclo || !ciclo.caixaIds.includes(caixa.id)) continue;
      const u = ultimaNaCaixa(ciclo, caixa.id);
      if (u) ultimas[prod] = u;
    }

    const carregados = infinitosCarregadosPorLote({
      caixaId: caixa.id,
      torres: input.torres,
      transplantios: input.transplantios,
      ciclos: input.ciclos,
      hojeYmd: input.hojeYmd,
    });
    const infinitoMaisRecenteLote = carregados
      .map((c) => c.ymd)
      .sort()
      .at(-1);

    const outrosBase = sistemicos
      .filter((c) => c.id !== porProduto.cercobin?.id && c.caixaIds.includes(caixa.id))
      .map((c) => ({
        nome: c.nome,
        produto: c.produto,
        ultimaExecucao: ultimaNaCaixa(c, caixa.id),
      }));

    if (infinitoMaisRecenteLote) {
      outrosBase.push({
        nome: "Infinito",
        produto: "Infinito",
        ultimaExecucao: infinitoMaisRecenteLote,
      });
    }

    const proximas: Partial<Record<ProdutoQuadro, string>> = {};
    const alertas: AlertaFolgaQuadro[] = [];

    for (const prod of ["thyper", "infinito", "cercobin"] as ProdutoQuadro[]) {
      const ciclo = porProduto[prod];
      if (!ciclo || !ciclo.caixaIds.includes(caixa.id)) continue;
      const outros =
        prod === "cercobin"
          ? outrosBase
          : sistemicos
              .filter((c) => c.id !== ciclo.id && c.caixaIds.includes(caixa.id))
              .map((c) => ({
                nome: c.nome,
                produto: c.produto,
                ultimaExecucao: ultimaNaCaixa(c, caixa.id),
              }));
      const prox = proximaProdutoCaixa(ciclo, caixa.id, input.hojeYmd, outros);
      if (prox) proximas[prod] = prox;
    }

    if (infinitoMaisRecenteLote && proximas.cercobin) {
      const folga = folgaMinimaDias("infinito", "cercobin");
      const liberado = adicionarDiasYmd(infinitoMaisRecenteLote, folga);
      if (proximas.cercobin < liberado) {
        proximas.cercobin = liberado;
      }
      const baseSemLote = porProduto.cercobin
        ? proximaProdutoCaixa(
            porProduto.cercobin,
            caixa.id,
            input.hojeYmd,
            outrosBase.filter((o) => o.ultimaExecucao !== infinitoMaisRecenteLote),
          )
        : null;
      if (baseSemLote && baseSemLote < liberado) {
        const lote = carregados.find((c) => c.ymd === infinitoMaisRecenteLote);
        alertas.push({
          produto: "cercobin",
          liberadoEmYmd: liberado,
          motivo: `Lote transplantado${lote?.torreOrigemNome ? ` de ${lote.torreOrigemNome}` : ""} trouxe Infinito de ${infinitoMaisRecenteLote.split("-").reverse().join("/")}. Cercobin só após folga de ${folga} dia(s).`,
        });
      }
    }

    const timeline: EventoAplicacaoQuadro[] = [];
    for (const prod of ["infinito", "cercobin", "thyper"] as ProdutoQuadro[]) {
      if (ultimas[prod]) {
        timeline.push({ produto: prod, ymd: ultimas[prod]!, origem: "caixa" });
      }
    }
    for (const c of carregados) {
      timeline.push({ produto: "infinito", ymd: c.ymd, origem: "lote_origem" });
    }
    timeline.sort((a, b) => a.ymd.localeCompare(b.ymd));

    // Inclui próximas na timeline visual
    for (const prod of ["infinito", "cercobin", "thyper"] as ProdutoQuadro[]) {
      if (proximas[prod]) {
        timeline.push({ produto: prod, ymd: proximas[prod]!, origem: "caixa" });
      }
    }

    linhas.push({
      caixaId: caixa.id,
      caixaNome: caixa.nome,
      fase: caixa.fase,
      torres: torresCx,
      ultimas,
      proximas,
      timeline,
      alertas,
    });
  }

  return linhas.sort((a, b) => {
    const fa = a.fase.localeCompare(b.fase);
    if (fa !== 0) return fa;
    return a.caixaNome.localeCompare(b.caixaNome, "pt-BR");
  });
}

/** Dias do calendário curto (passados + futuros) para o quadro. */
export function diasFaixaQuadro(hojeYmd: string, atras = 7, frente = 14): string[] {
  const dias: string[] = [];
  for (let i = -atras; i <= frente; i++) {
    dias.push(adicionarDiasYmd(hojeYmd, i));
  }
  return dias;
}

export function rotuloProdutoCurto(p: ProdutoQuadro): string {
  if (p === "infinito") return "Inf";
  if (p === "cercobin") return "Cer";
  return "Thy";
}
