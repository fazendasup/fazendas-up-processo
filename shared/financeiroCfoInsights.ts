/**
 * Classificação setorial e motor de insights financeiros (visão CFO).
 * Dados tipicamente vindos da Conta Azul (receber / pagar / saldos).
 */

export const SETORES_FINANCEIROS = [
  "aluguel_imoveis",
  "insumos_producao",
  "embalagens",
  "terceiros_servicos",
  "folha_pessoal",
  "logistica_frete",
  "energia_utilidades",
  "impostos_taxas",
  "financeiro_juros",
  "marketing_comercial",
  "manutencao",
  "tecnologia",
  "fornecedores_diversos",
  "outros",
] as const;

export type SetorFinanceiro = (typeof SETORES_FINANCEIROS)[number];

export const LABEL_SETOR_FINANCEIRO: Record<SetorFinanceiro, string> = {
  aluguel_imoveis: "Aluguel / imóveis",
  insumos_producao: "Insumos de produção",
  embalagens: "Embalagens",
  terceiros_servicos: "Terceiros / serviços",
  folha_pessoal: "Folha / pessoal",
  logistica_frete: "Logística / frete",
  energia_utilidades: "Energia / utilidades",
  impostos_taxas: "Impostos / taxas",
  financeiro_juros: "Financeiro / juros",
  marketing_comercial: "Marketing / comercial",
  manutencao: "Manutenção",
  tecnologia: "Tecnologia / software",
  fornecedores_diversos: "Fornecedores diversos",
  outros: "Outros",
};

/** Criticidade para caixa em prejuízo: o que não pode parar vs o que dá para segurar. */
export type CriticidadeDesembolso = "essencial" | "negociavel" | "adiavel";

export const CRITICIDADE_POR_SETOR: Record<SetorFinanceiro, CriticidadeDesembolso> = {
  aluguel_imoveis: "essencial",
  insumos_producao: "essencial",
  embalagens: "negociavel",
  terceiros_servicos: "negociavel",
  folha_pessoal: "essencial",
  logistica_frete: "negociavel",
  energia_utilidades: "essencial",
  impostos_taxas: "essencial",
  financeiro_juros: "essencial",
  marketing_comercial: "adiavel",
  manutencao: "negociavel",
  tecnologia: "negociavel",
  fornecedores_diversos: "negociavel",
  outros: "adiavel",
};

export function normalizarTextoFinanceiro(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function classificarSetorFinanceiro(texto: string): SetorFinanceiro {
  const t = normalizarTextoFinanceiro(texto);
  if (/aluguel|locacao|imovel|galpao|condominio|iptu/.test(t)) return "aluguel_imoveis";
  if (/embalag|rotulo|adesivo|caixa de|sacola|filme stretch|bandeja plast/.test(t))
    return "embalagens";
  if (
    /semente|muda|substrato|nutri|fertiliz|defens|biologic|insumo|foliar|hidropon|fert/.test(
      t,
    )
  )
    return "insumos_producao";
  if (
    /consult|bpo|contabil|advog|jurid|auditor|servico|terceiriz|honor|prestacao/.test(t)
  )
    return "terceiros_servicos";
  if (/salari|folha|encarg|pro labore|clt|pj |rh |beneficio|vale refeic|fgts|inss/.test(t))
    return "folha_pessoal";
  if (/combust|diesel|gasolina|frete|transporte|logist|entrega|correios|motoboy/.test(t))
    return "logistica_frete";
  if (/energia|luz|eletric|agua|esgoto|gas natural|utilidade|internet fibra/.test(t))
    return "energia_utilidades";
  if (/imposto|iss|icms|pis|cofins|irpj|csll|simples|das |guia |tribut/.test(t))
    return "impostos_taxas";
  if (/juros|financ|tarifa banc|anuidade|emprest|cheque especial|iof/.test(t))
    return "financeiro_juros";
  if (/marketing|publicid|anuncio|meta ads|google ads|instagram|influencer|brinde/.test(t))
    return "marketing_comercial";
  if (/manut|peca|ferrament|reparo|conserto|oficina/.test(t)) return "manutencao";
  if (/software|saas|assinatura|cloud|hosting|microsoft|google workspace|erp/.test(t))
    return "tecnologia";
  if (/fornecedor|compra|mercadoria|atacado/.test(t)) return "fornecedores_diversos";
  return "outros";
}

export type ParcelaFinanceiraNorm = {
  id: string;
  tipo: "receber" | "pagar";
  descricao: string;
  valor: number;
  valorPago: number;
  valorEmAberto: number;
  status: string;
  dataVencimento: string | null;
  dataPagamento: string | null;
  dataCompetencia: string | null;
  categoria: string | null;
  contraparte: string | null;
  setor: SetorFinanceiro;
  criticidade: CriticidadeDesembolso;
};

export type InsightCfo = {
  id: string;
  severidade: "critica" | "alta" | "media" | "oportunidade";
  tipo:
    | "caixa"
    | "descasamento"
    | "setor"
    | "fornecedor"
    | "compra"
    | "recuperacao"
    | "escala";
  titulo: string;
  analise: string;
  acaoSimples: string;
  acaoComplexa?: string;
  impactoEstimado?: number | null;
  setor?: SetorFinanceiro | null;
};

export type SetorAgg = {
  setor: SetorFinanceiro;
  label: string;
  criticidade: CriticidadeDesembolso;
  pago: number;
  emAberto: number;
  total: number;
  qtd: number;
  pctDoDesembolso: number;
};

export type FornecedorAgg = {
  nome: string;
  setor: SetorFinanceiro;
  total: number;
  pago: number;
  emAberto: number;
  qtd: number;
  pctDoDesembolso: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function semanaKey(ymd: string | null): string | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export type SemanaFluxo = {
  inicioSemana: string;
  entradasPrevistas: number;
  saidasPrevistas: number;
  entradasRealizadas: number;
  saidasRealizadas: number;
  saldoLiquidoPrevisto: number;
  saldoLiquidoRealizado: number;
};

export function montarFluxoPorSemana(
  parcelas: ParcelaFinanceiraNorm[],
): SemanaFluxo[] {
  const map = new Map<string, SemanaFluxo>();
  const ensure = (key: string): SemanaFluxo => {
    let row = map.get(key);
    if (!row) {
      row = {
        inicioSemana: key,
        entradasPrevistas: 0,
        saidasPrevistas: 0,
        entradasRealizadas: 0,
        saidasRealizadas: 0,
        saldoLiquidoPrevisto: 0,
        saldoLiquidoRealizado: 0,
      };
      map.set(key, row);
    }
    return row;
  };

  for (const p of parcelas) {
    const kVenc = semanaKey(p.dataVencimento);
    const kPag = semanaKey(p.dataPagamento);
    if (p.tipo === "receber") {
      if (kVenc) ensure(kVenc).entradasPrevistas += p.valor;
      if (kPag) ensure(kPag).entradasRealizadas += p.valorPago;
    } else {
      if (kVenc) ensure(kVenc).saidasPrevistas += p.valor;
      if (kPag) ensure(kPag).saidasRealizadas += p.valorPago;
    }
  }

  return Array.from(map.values())
    .map(s => ({
      ...s,
      entradasPrevistas: round2(s.entradasPrevistas),
      saidasPrevistas: round2(s.saidasPrevistas),
      entradasRealizadas: round2(s.entradasRealizadas),
      saidasRealizadas: round2(s.saidasRealizadas),
      saldoLiquidoPrevisto: round2(s.entradasPrevistas - s.saidasPrevistas),
      saldoLiquidoRealizado: round2(s.entradasRealizadas - s.saidasRealizadas),
    }))
    .sort((a, b) => a.inicioSemana.localeCompare(b.inicioSemana));
}

export function agregarPorSetor(pagar: ParcelaFinanceiraNorm[]): SetorAgg[] {
  const map = new Map<SetorFinanceiro, SetorAgg>();
  let totalGeral = 0;
  for (const p of pagar) {
    const v = p.valor > 0 ? p.valor : p.valorPago;
    totalGeral += v;
    const cur = map.get(p.setor) ?? {
      setor: p.setor,
      label: LABEL_SETOR_FINANCEIRO[p.setor],
      criticidade: CRITICIDADE_POR_SETOR[p.setor],
      pago: 0,
      emAberto: 0,
      total: 0,
      qtd: 0,
      pctDoDesembolso: 0,
    };
    cur.pago += p.valorPago;
    cur.emAberto += p.valorEmAberto;
    cur.total += v;
    cur.qtd += 1;
    map.set(p.setor, cur);
  }
  return Array.from(map.values())
    .map(s => ({
      ...s,
      pago: round2(s.pago),
      emAberto: round2(s.emAberto),
      total: round2(s.total),
      pctDoDesembolso: totalGeral > 0 ? round2((s.total / totalGeral) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function agregarPorFornecedor(pagar: ParcelaFinanceiraNorm[]): FornecedorAgg[] {
  const map = new Map<string, FornecedorAgg>();
  let totalGeral = 0;
  for (const p of pagar) {
    const nome = (p.contraparte || "Sem fornecedor").trim() || "Sem fornecedor";
    const v = p.valor > 0 ? p.valor : p.valorPago;
    totalGeral += v;
    const cur = map.get(nome) ?? {
      nome,
      setor: p.setor,
      total: 0,
      pago: 0,
      emAberto: 0,
      qtd: 0,
      pctDoDesembolso: 0,
    };
    cur.total += v;
    cur.pago += p.valorPago;
    cur.emAberto += p.valorEmAberto;
    cur.qtd += 1;
    map.set(nome, cur);
  }
  return Array.from(map.values())
    .map(f => ({
      ...f,
      total: round2(f.total),
      pago: round2(f.pago),
      emAberto: round2(f.emAberto),
      pctDoDesembolso: totalGeral > 0 ? round2((f.total / totalGeral) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export type OportunidadeCompra = {
  id: string;
  setor: SetorFinanceiro;
  titulo: string;
  motivo: string;
  fornecedoresComparados: string[];
  economiaPotencialEstimada: number | null;
  acao: string;
};

/** Compara fornecedores no mesmo setor — “dinheiro na mesa” sem API de marketplace. */
export function detectarOportunidadesCompra(
  pagar: ParcelaFinanceiraNorm[],
): OportunidadeCompra[] {
  const porSetor = new Map<SetorFinanceiro, Map<string, { total: number; qtd: number }>>();
  for (const p of pagar) {
    if (p.tipo !== "pagar") continue;
    const forn = (p.contraparte || "").trim();
    if (!forn) continue;
    const v = p.valorPago > 0 ? p.valorPago : p.valor;
    if (v <= 0) continue;
    if (!porSetor.has(p.setor)) porSetor.set(p.setor, new Map());
    const m = porSetor.get(p.setor)!;
    const cur = m.get(forn) ?? { total: 0, qtd: 0 };
    cur.total += v;
    cur.qtd += 1;
    m.set(forn, cur);
  }

  const out: OportunidadeCompra[] = [];
  for (const [setor, fornMap] of Array.from(porSetor.entries())) {
    if (setor === "folha_pessoal" || setor === "impostos_taxas" || setor === "aluguel_imoveis") {
      continue;
    }
    const lista = Array.from(fornMap.entries())
      .map(([nome, d]) => ({
        nome,
        total: d.total,
        ticket: d.total / Math.max(1, d.qtd),
        qtd: d.qtd,
      }))
      .sort((a, b) => b.total - a.total);
    if (lista.length < 2) {
      if (lista[0] && lista[0].total >= 2000) {
        out.push({
          id: `mono-${setor}`,
          setor,
          titulo: `Monopsônio em ${LABEL_SETOR_FINANCEIRO[setor]}`,
          motivo: `${lista[0].nome} concentra 100% do gasto setorial (~R$ ${lista[0].total.toFixed(0)}). Sem concorrência interna no Conta Azul.`,
          fornecedoresComparados: [lista[0].nome],
          economiaPotencialEstimada: round2(lista[0].total * 0.08),
          acao: "Cotação com 2–3 alternativas (preço, prazo, frete CIF/FOB) e meta de -8% no próximo ciclo.",
        });
      }
      continue;
    }
    const top = lista[0]!;
    const segundo = lista[1]!;
    const ticketMedio =
      lista.reduce((s, x) => s + x.ticket, 0) / Math.max(1, lista.length);
    const totalSetor = lista.reduce((s, x) => s + x.total, 0);
    const pctTop = totalSetor > 0 ? top.total / totalSetor : 0;

    if (top.ticket > ticketMedio * 1.25 && top.total >= 500) {
      const economia = round2((top.ticket - ticketMedio) * top.qtd);
      out.push({
        id: `var-${setor}-${top.nome}`,
        setor,
        titulo: `Ticket acima da média: ${top.nome}`,
        motivo: `Em ${LABEL_SETOR_FINANCEIRO[setor]}, ticket médio de ${top.nome} (~R$ ${top.ticket.toFixed(0)}) está ${((top.ticket / ticketMedio - 1) * 100).toFixed(0)}% acima da média dos outros (${lista.length} fornecedores).`,
        fornecedoresComparados: lista.slice(0, 4).map(x => x.nome),
        economiaPotencialEstimada: economia > 0 ? economia : round2(top.total * 0.05),
        acao: `Renegociar com ${top.nome} alinhando ao patamar de ${segundo.nome}, ou migrar volume parcial (preço + prazo + frete).`,
      });
    }
    if (pctTop >= 0.55 && lista.length >= 2) {
      out.push({
        id: `conc-${setor}`,
        setor,
        titulo: `Concentração alta em ${top.nome}`,
        motivo: `${(pctTop * 100).toFixed(0)}% do setor ${LABEL_SETOR_FINANCEIRO[setor]} em um único fornecedor — risco de preço e ruptura.`,
        fornecedoresComparados: lista.slice(0, 3).map(x => x.nome),
        economiaPotencialEstimada: round2(top.total * 0.05),
        acao: "Dividir volume 70/30 com segundo fornecedor e pedir desconto por volume comprometido + frete incluso.",
      });
    }
  }
  return out.sort(
    (a, b) =>
      (b.economiaPotencialEstimada ?? 0) - (a.economiaPotencialEstimada ?? 0),
  );
}

export type ResumoCaixaCfo = {
  entradasPrevistas: number;
  entradasRealizadas: number;
  saidasPrevistas: number;
  saidasRealizadas: number;
  aReceberEmAberto: number;
  aPagarEmAberto: number;
  aPagarEssencialEmAberto: number;
  aPagarAdiavelEmAberto: number;
  aPagarNegociavelEmAberto: number;
  saldoPeriodoRealizado: number;
  gapCaixaPrevisto: number;
  coberturaReceberSobrePagar: number | null;
};

export function resumirCaixa(
  receber: ParcelaFinanceiraNorm[],
  pagar: ParcelaFinanceiraNorm[],
): ResumoCaixaCfo {
  const sum = (xs: ParcelaFinanceiraNorm[], f: (p: ParcelaFinanceiraNorm) => number) =>
    round2(xs.reduce((s, p) => s + f(p), 0));

  const entradasPrevistas = sum(receber, p => p.valor);
  const entradasRealizadas = sum(receber, p => p.valorPago);
  const saidasPrevistas = sum(pagar, p => p.valor);
  const saidasRealizadas = sum(pagar, p => p.valorPago);
  const aReceberEmAberto = sum(receber, p => p.valorEmAberto);
  const aPagarEmAberto = sum(pagar, p => p.valorEmAberto);
  const aPagarEssencialEmAberto = sum(
    pagar.filter(p => p.criticidade === "essencial"),
    p => p.valorEmAberto,
  );
  const aPagarAdiavelEmAberto = sum(
    pagar.filter(p => p.criticidade === "adiavel"),
    p => p.valorEmAberto,
  );
  const aPagarNegociavelEmAberto = sum(
    pagar.filter(p => p.criticidade === "negociavel"),
    p => p.valorEmAberto,
  );

  return {
    entradasPrevistas,
    entradasRealizadas,
    saidasPrevistas,
    saidasRealizadas,
    aReceberEmAberto,
    aPagarEmAberto,
    aPagarEssencialEmAberto,
    aPagarAdiavelEmAberto,
    aPagarNegociavelEmAberto,
    saldoPeriodoRealizado: round2(entradasRealizadas - saidasRealizadas),
    gapCaixaPrevisto: round2(entradasPrevistas - saidasPrevistas),
    coberturaReceberSobrePagar:
      aPagarEmAberto > 0
        ? round2(aReceberEmAberto / aPagarEmAberto)
        : null,
  };
}

export function gerarInsightsCfo(input: {
  resumo: ResumoCaixaCfo;
  setores: SetorAgg[];
  fornecedores: FornecedorAgg[];
  oportunidadesCompra: OportunidadeCompra[];
  saldoContas?: number | null;
}): InsightCfo[] {
  const insights: InsightCfo[] = [];
  const { resumo, setores, fornecedores, oportunidadesCompra, saldoContas } = input;

  if (resumo.saldoPeriodoRealizado < 0) {
    insights.push({
      id: "prejuizo-periodo",
      severidade: "critica",
      tipo: "recuperacao",
      titulo: "Período no vermelho (caixa realizado)",
      analise: `Saídas realizadas superam entradas em R$ ${Math.abs(resumo.saldoPeriodoRealizado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Em operação deficitária, cada dia de atraso no receber e cada desembolso adiável conta.`,
      acaoSimples:
        "Congelar despesas adiáveis (marketing, extras) e priorizar cobrança dos maiores a receber esta semana.",
      acaoComplexa:
        "Montar plano 30-60-90: (1) acelerar recebíveis / renegociar prazos de clientes, (2) alongar pagar negociáveis 15–30 dias, (3) cotar insumos/embalagens com meta de -5 a -10%.",
      impactoEstimado: round2(
        resumo.aPagarAdiavelEmAberto + resumo.aPagarNegociavelEmAberto * 0.3,
      ),
    });
  }

  if (resumo.gapCaixaPrevisto < 0) {
    insights.push({
      id: "gap-previsto",
      severidade: "alta",
      tipo: "descasamento",
      titulo: "Descasamento previsto no período",
      analise: `Vencimentos de pagar excedem receber em R$ ${Math.abs(resumo.gapCaixaPrevisto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      acaoSimples: "Reordenar pagamentos: essenciais primeiro; negociar data dos negociáveis.",
      acaoComplexa:
        "Alinhar calendário de faturamento (boleto/PIX antecipado) com a curva semanal de desembolsos — use o fluxo por semana nesta página.",
      impactoEstimado: Math.abs(resumo.gapCaixaPrevisto),
    });
  }

  if (
    resumo.coberturaReceberSobrePagar != null &&
    resumo.coberturaReceberSobrePagar < 0.85
  ) {
    insights.push({
      id: "cobertura-baixa",
      severidade: "alta",
      tipo: "caixa",
      titulo: "A receber não cobre a pagar em aberto",
      analise: `Cobertura ${resumo.coberturaReceberSobrePagar.toFixed(2)}× (ideal ≥ 1,0). Há risco de rombo mesmo cobrando tudo em dia.`,
      acaoSimples: "Lista top 10 a receber e cobrança ativa hoje (WhatsApp/telefone).",
      acaoComplexa:
        "Revisar prazo médio de recebimento vs pagamento por cliente grande; antecipar faturamento ou pedir sinal em pedidos grandes.",
    });
  }

  if (resumo.aPagarAdiavelEmAberto > 0) {
    insights.push({
      id: "adiavel",
      severidade: "oportunidade",
      tipo: "recuperacao",
      titulo: "Caixa que dá para segurar agora",
      analise: `R$ ${resumo.aPagarAdiavelEmAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em aberto classificado como adiável (marketing, extras).`,
      acaoSimples: "Suspender ou parcelar esses títulos até o caixa estabilizar.",
      impactoEstimado: resumo.aPagarAdiavelEmAberto,
    });
  }

  if (resumo.aPagarEssencialEmAberto > 0) {
    insights.push({
      id: "essencial",
      severidade: "media",
      tipo: "caixa",
      titulo: "Desembolsos essenciais protegidos",
      analise: `R$ ${resumo.aPagarEssencialEmAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em folha, energia, insumos, aluguel e impostos — não cortar; no máximo renegociar prazo sem risco operacional.`,
      acaoSimples: "Reservar saldo de contas para esses vencimentos antes de qualquer outro pagamento.",
      setor: null,
    });
  }

  for (const s of setores.slice(0, 5)) {
    if (s.pctDoDesembolso < 12) continue;
    if (s.criticidade === "essencial") {
      insights.push({
        id: `setor-ess-${s.setor}`,
        severidade: "media",
        tipo: "setor",
        titulo: `${s.label} pesa ${s.pctDoDesembolso}% do desembolso`,
        analise: `Essencial, mas volumoso (R$ ${s.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}). Redução vem de eficiência e cotação, não de corte abrupto.`,
        acaoSimples: "Auditar 3 maiores títulos do setor e validar se há desperdício ou preço fora de mercado.",
        acaoComplexa:
          s.setor === "insumos_producao"
            ? "Contrato de fornecimento com preço travado + frete incluso; estoque mínimo para não comprar emergencial."
            : "Benchmark de preço e renegociação trimestral com cláusula de volume.",
        setor: s.setor,
        impactoEstimado: round2(s.total * 0.05),
      });
    } else if (s.criticidade === "adiavel" || s.criticidade === "negociavel") {
      insights.push({
        id: `setor-corte-${s.setor}`,
        severidade: s.criticidade === "adiavel" ? "oportunidade" : "alta",
        tipo: "setor",
        titulo: `Espaço para aliviar: ${s.label}`,
        analise: `${s.pctDoDesembolso}% do caixa (R$ ${s.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) em rubrica ${s.criticidade}.`,
        acaoSimples:
          s.criticidade === "adiavel"
            ? "Pausar novos gastos e renegociar o que já venceu."
            : "Pedir 15–30 dias extras ou desconto à vista se houver caixa pontual.",
        setor: s.setor,
        impactoEstimado: round2(s.total * (s.criticidade === "adiavel" ? 0.5 : 0.15)),
      });
    }
  }

  for (const f of fornecedores.slice(0, 3)) {
    if (f.pctDoDesembolso < 15) continue;
    insights.push({
      id: `forn-${f.nome}`,
      severidade: "media",
      tipo: "fornecedor",
      titulo: `Dependência: ${f.nome}`,
      analise: `${f.pctDoDesembolso}% do desembolso (R$ ${f.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}). Poder de barganha e risco de ruptura.`,
      acaoSimples: "Agendar conversa de renegociação (preço, prazo, frete) com meta clara.",
      acaoComplexa: "Qualificar fornecedor B e transferir 20–30% do volume em 60 dias.",
      impactoEstimado: round2(f.total * 0.07),
    });
  }

  for (const op of oportunidadesCompra.slice(0, 6)) {
    insights.push({
      id: `compra-${op.id}`,
      severidade: "oportunidade",
      tipo: "compra",
      titulo: op.titulo,
      analise: op.motivo,
      acaoSimples: op.acao,
      acaoComplexa:
        "Registrar cotação com preço unitário, prazo de pagamento e frete; escolher pelo custo total desembarcado, não só preço de tabela.",
      impactoEstimado: op.economiaPotencialEstimada,
      setor: op.setor,
    });
  }

  if (saldoContas != null && saldoContas >= 0 && resumo.aPagarEmAberto > saldoContas) {
    insights.push({
      id: "saldo-insuficiente",
      severidade: "critica",
      tipo: "caixa",
      titulo: "Saldo em contas < contas a pagar em aberto",
      analise: `Saldo atual ~R$ ${saldoContas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} vs a pagar R$ ${resumo.aPagarEmAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      acaoSimples: "Priorizar essenciais e acelerar recebimentos antes do próximo lote de vencimentos.",
      acaoComplexa: "Linha de crédito emergencial só como ponte; foco em ciclo financeiro (DSO/DPO).",
    });
  }

  if (resumo.saldoPeriodoRealizado >= 0 && resumo.gapCaixaPrevisto >= 0) {
    insights.push({
      id: "escala",
      severidade: "oportunidade",
      tipo: "escala",
      titulo: "Caixa estável — momento de estruturar escala",
      analise:
        "Entradas e saídas estão alinhadas no período. Use a folga para travar preços de insumos e alongar visibilidade de fluxo em 8–12 semanas.",
      acaoSimples: "Criar reserva mínima (ex.: 2 semanas de despesas essenciais).",
      acaoComplexa:
        "Política de compras: cotação tripla acima de valor X; prazo mínimo de pagar ≥ prazo médio de receber + 7 dias.",
    });
  }

  const order: Record<InsightCfo["severidade"], number> = {
    critica: 0,
    alta: 1,
    media: 2,
    oportunidade: 3,
  };
  return insights.sort(
    (a, b) =>
      order[a.severidade] - order[b.severidade] ||
      (b.impactoEstimado ?? 0) - (a.impactoEstimado ?? 0),
  );
}

export function normalizarParcela(input: {
  id: string;
  tipo: "receber" | "pagar";
  descricao?: string | null;
  valor?: number | null;
  valorPago?: number | null;
  valorEmAberto?: number | null;
  status?: string | null;
  dataVencimento?: string | null;
  dataPagamento?: string | null;
  dataCompetencia?: string | null;
  categoria?: string | null;
  contraparte?: string | null;
}): ParcelaFinanceiraNorm {
  const texto = [input.descricao, input.categoria, input.contraparte]
    .filter(Boolean)
    .join(" ");
  const setor = classificarSetorFinanceiro(texto);
  const valor = Number(input.valor ?? 0) || 0;
  const valorPago = Number(input.valorPago ?? 0) || 0;
  const valorEmAberto =
    input.valorEmAberto != null
      ? Number(input.valorEmAberto) || 0
      : Math.max(0, valor - valorPago);
  return {
    id: input.id,
    tipo: input.tipo,
    descricao: input.descricao?.trim() || "Sem descrição",
    valor: round2(valor),
    valorPago: round2(valorPago),
    valorEmAberto: round2(valorEmAberto),
    status: input.status?.trim() || "DESCONHECIDO",
    dataVencimento: input.dataVencimento?.slice(0, 10) ?? null,
    dataPagamento: input.dataPagamento?.slice(0, 10) ?? null,
    dataCompetencia: input.dataCompetencia?.slice(0, 10) ?? null,
    categoria: input.categoria ?? null,
    contraparte: input.contraparte ?? null,
    setor,
    criticidade: CRITICIDADE_POR_SETOR[setor],
  };
}
