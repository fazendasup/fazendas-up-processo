/**
 * Sequência de aplicações numa caixa.
 * Só o passo mais antigo que já venceu (ou vence hoje) pode ser sugerido.
 * Ao aplicar, os passos seguintes deslocam-se a partir desse dia, mantendo o intervalo.
 */

export type FrequenciaCicloAgenda =
  | "diaria"
  | "semanal"
  | "quinzenal"
  | "mensal"
  | "personalizada";

export type ExecucaoCaixaAgenda<TCaixa extends string | number> = {
  caixaId: TCaixa;
  ultimaExecucao?: string | null;
  dataAgenda?: string | null;
};

export type PassoCicloAgenda<TCaixa extends string | number> = {
  id: number;
  ativo: boolean;
  alvo: string;
  frequencia: FrequenciaCicloAgenda | string;
  diasSemana?: number[] | null;
  intervaloDias?: number | null;
  dataInicio?: string | null;
  nome?: string | null;
  produto?: string | null;
  caixaIds: TCaixa[];
  execucoes: ExecucaoCaixaAgenda<TCaixa>[];
};

export type PassoEscolhido<TCaixa extends string | number> = {
  passo: PassoCicloAgenda<TCaixa>;
  previstaYmd: string;
  /** Dias de calendário depois da data prevista. Zero = vence hoje. */
  diasAtraso: number;
};

export type ReagendamentoCiclo = {
  cicloId: number;
  dataAgendaYmd: string;
};

const FUSO = "America/Sao_Paulo";

export function ymdCalendario(valor: string | Date | null | undefined): string | null {
  if (valor == null || valor === "") return null;
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor.slice(0, 10)) && valor.length <= 10) {
    return valor.slice(0, 10);
  }
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return /^\d{4}-\d{2}-\d{2}$/.test(partes) ? partes : null;
}

export function hojeYmdSaoPaulo(agora: Date = new Date()): string {
  return ymdCalendario(agora) ?? "";
}

/** Meio-dia em São Paulo, para gravar um dia de calendário sem cair no dia anterior. */
export function instanteMeioDia(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 15, 0, 0));
}

export function adicionarDiasYmd(ymd: string, dias: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + dias));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function diferencaDiasYmd(ymd1: string, ymd2: string): number {
  const [y1, m1, d1] = ymd1.split("-").map(Number);
  const [y2, m2, d2] = ymd2.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / 86400000);
}

function diaSemanaYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function proximoDiaSemana(fromYmd: string, dias: number[]): string {
  const set = new Set(dias);
  for (let i = 0; i < 21; i++) {
    const ymd = adicionarDiasYmd(fromYmd, i);
    if (set.has(diaSemanaYmd(ymd))) return ymd;
  }
  return fromYmd;
}

function intervaloEfetivo(passo: PassoCicloAgenda<string | number>): number {
  if (passo.intervaloDias != null && passo.intervaloDias > 0) return passo.intervaloDias;
  if (passo.frequencia === "quinzenal") return 14;
  if (passo.frequencia === "mensal") return 30;
  return 1;
}

/** Dias mínimos entre a aplicação de `origem` e a próxima de `destino`. Zero: mesmo dia permitido. */
const FOLGA_MINIMA: Record<string, Record<string, number>> = {
  peroxido: { infinito: 1, cercobin: 1, bio: 1 },
  infinito: { peroxido: 1, cercobin: 3, bio: 1 },
  cercobin: { peroxido: 1, infinito: 1, bio: 1 },
  bio: { peroxido: 1, infinito: 1, cercobin: 1 },
  A: { B: 1 },
  B: { A: 1 },
};

export function chaveAplicacaoProtocolo(nome: string, produto = ""): string | null {
  const normalizado = (valor: string) =>
    valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const nomeN = normalizado(nome);
  if (nomeN.startsWith("calda a")) return "A";
  if (nomeN.startsWith("calda b")) return "B";
  const bruto = normalizado(`${nome} ${produto}`);
  if (!bruto || bruto.includes("biozenith") || nomeN.startsWith("calda ")) return null;
  if (bruto.includes("cercobin")) return "cercobin";
  if (bruto.includes("infinito")) return "infinito";
  if (
    bruto.includes("peroxido") ||
    bruto.includes("h2o2") ||
    nome.toLowerCase().includes("h₂o₂") ||
    produto.toLowerCase().includes("h₂o₂")
  ) {
    return "peroxido";
  }
  if (/\bkoh\b/.test(bruto) || bruto.includes("hidroxido")) return "koh";
  const produtoN = normalizado(produto);
  if (produtoN === "bio" || nomeN === "bio" || nomeN.startsWith("bio ") || nomeN.startsWith("bio,")) {
    return "bio";
  }
  return null;
}

export function folgaMinimaDias(origem: string, destino: string): number {
  return FOLGA_MINIMA[origem]?.[destino] ?? 0;
}

function ultimaOcorrenciaSemanal(dias: number[], inicio: string | null, hoje: string): string {
  if (inicio && inicio > hoje) return proximoDiaSemana(inicio, dias);
  for (let i = 0; i < 7; i++) {
    const ymd = adicionarDiasYmd(hoje, -i);
    if (inicio && ymd < inicio) break;
    if (dias.includes(diaSemanaYmd(ymd))) return ymd;
  }
  return inicio && inicio <= hoje ? inicio : hoje;
}

/**
 * Data em que esta ocorrência devia acontecer.
 * Com atraso, usa o último dia da cadência que já venceu, não a âncora original.
 */
export function dataDevidaCicloYmd<TCaixa extends string | number>(
  passo: PassoCicloAgenda<TCaixa>,
  caixaId: TCaixa,
  hojeYmd: string,
): string | null {
  const prevista = dataPrevistaCicloYmd(passo, caixaId, hojeYmd);
  if (!prevista) return null;
  const exec = passo.execucoes.find((e) => e.caixaId === caixaId);
  const agenda = ymdCalendario(exec?.dataAgenda);
  const ultima = ymdCalendario(exec?.ultimaExecucao);
  if (agenda && (!ultima || agenda > ultima)) return prevista;
  if (prevista >= hojeYmd) return prevista;
  if (passo.frequencia === "diaria") return hojeYmd;
  if (passo.frequencia === "semanal" && passo.diasSemana && passo.diasSemana.length > 0) {
    return ultimaOcorrenciaSemanal(passo.diasSemana, ymdCalendario(passo.dataInicio), hojeYmd);
  }
  const intervalo = intervaloEfetivo(passo);
  if (
    intervalo > 1 &&
    (passo.frequencia === "personalizada" ||
      passo.frequencia === "quinzenal" ||
      passo.frequencia === "mensal")
  ) {
    const passos = Math.floor(diferencaDiasYmd(prevista, hojeYmd) / intervalo);
    return adicionarDiasYmd(prevista, passos * intervalo);
  }
  return prevista;
}

/** Próxima data deste ciclo nesta caixa. A agenda deslocada vale até ser aplicada. */
export function dataPrevistaCicloYmd<TCaixa extends string | number>(
  passo: PassoCicloAgenda<TCaixa>,
  caixaId: TCaixa,
  hojeYmd: string,
): string | null {
  if (!passo.ativo || passo.alvo === "andar") return null;
  if (!passo.caixaIds.includes(caixaId)) return null;

  const exec = passo.execucoes.find((e) => e.caixaId === caixaId);
  const ultima = ymdCalendario(exec?.ultimaExecucao);
  const agenda = ymdCalendario(exec?.dataAgenda);
  const inicio = ymdCalendario(passo.dataInicio);

  if (agenda && (!ultima || agenda > ultima)) return agenda;

  if (passo.frequencia === "semanal" && passo.diasSemana && passo.diasSemana.length > 0) {
    const feitoHoje = ultima === hojeYmd;
    if (!feitoHoje && (!inicio || inicio <= hojeYmd) && passo.diasSemana.includes(diaSemanaYmd(hojeYmd))) {
      return hojeYmd;
    }
    const aPartirDe = inicio && inicio > hojeYmd ? inicio : adicionarDiasYmd(hojeYmd, 1);
    return proximoDiaSemana(aPartirDe, passo.diasSemana);
  }

  if (!ultima) return inicio ?? hojeYmd;
  return adicionarDiasYmd(ultima, intervaloEfetivo(passo));
}

/** Todos os passos da caixa que já venceram ou vencem hoje, do mais antigo ao mais novo. */
export function passosDevidosDaCaixa<TCaixa extends string | number>(
  passos: PassoCicloAgenda<TCaixa>[],
  caixaId: TCaixa,
  hojeYmd: string,
): PassoEscolhido<TCaixa>[] {
  return passos
    .map((passo) => {
      const previstaYmd = dataPrevistaCicloYmd(passo, caixaId, hojeYmd);
      return previstaYmd ? { passo, previstaYmd } : null;
    })
    .filter((item): item is { passo: PassoCicloAgenda<TCaixa>; previstaYmd: string } => item != null)
    .filter((item) => item.previstaYmd <= hojeYmd)
    .sort((a, b) => a.previstaYmd.localeCompare(b.previstaYmd) || a.passo.id - b.passo.id)
    .map((item) => ({
      ...item,
      diasAtraso: Math.max(0, diferencaDiasYmd(item.previstaYmd, hojeYmd)),
    }));
}

/** O passo mais antigo que já pode ser feito. */
export function escolherPassoDaCaixa<TCaixa extends string | number>(
  passos: PassoCicloAgenda<TCaixa>[],
  caixaId: TCaixa,
  hojeYmd: string,
): PassoEscolhido<TCaixa> | null {
  return passosDevidosDaCaixa(passos, caixaId, hojeYmd)[0] ?? null;
}

/**
 * Datas novas dos passos posteriores, contadas a partir do dia em que este foi aplicado.
 * Se a aplicação atrasou, os outros produtos do protocolo acompanham o atraso
 * e ainda respeitam o intervalo mínimo entre eles.
 */
export function reagendarSequenciaAposAplicar<TCaixa extends string | number>(
  passos: PassoCicloAgenda<TCaixa>[],
  caixaId: TCaixa,
  cicloAplicadoId: number,
  hojeYmd: string,
): ReagendamentoCiclo[] {
  const comData = passos
    .map((passo) => {
      const previstaYmd = dataPrevistaCicloYmd(passo, caixaId, hojeYmd);
      return previstaYmd ? { passo, previstaYmd } : null;
    })
    .filter((item): item is { passo: PassoCicloAgenda<TCaixa>; previstaYmd: string } => item != null)
    .sort((a, b) => a.previstaYmd.localeCompare(b.previstaYmd) || a.passo.id - b.passo.id);

  const atual = comData.find((item) => item.passo.id === cicloAplicadoId);
  if (!atual) return [];

  const posteriores = comData.filter(
    (item) =>
      item.previstaYmd > atual.previstaYmd ||
      (item.previstaYmd === atual.previstaYmd && item.passo.id > atual.passo.id),
  );

  const porGap = posteriores.map((item) => {
    const gap = Math.max(0, diferencaDiasYmd(atual.previstaYmd, item.previstaYmd));
    return { cicloId: item.passo.id, dataAgendaYmd: adicionarDiasYmd(hojeYmd, gap) };
  });

  const chaveAtual = chaveAplicacaoProtocolo(atual.passo.nome ?? "", atual.passo.produto ?? "");
  if (!chaveAtual || chaveAtual === "koh") return porGap;

  const devidaAtual = dataDevidaCicloYmd(atual.passo, caixaId, hojeYmd) ?? atual.previstaYmd;
  const atraso = Math.max(0, diferencaDiasYmd(devidaAtual, hojeYmd));
  const ajustes = new Map(porGap.map((item) => [item.cicloId, item.dataAgendaYmd]));
  const referencias = new Map<number, string>();

  for (const item of comData) {
    if (item.passo.id === cicloAplicadoId) continue;
    const chave = chaveAplicacaoProtocolo(item.passo.nome ?? "", item.passo.produto ?? "");
    if (!chave || chave === "koh") continue;
    const referencia = dataDevidaCicloYmd(item.passo, caixaId, hojeYmd) ?? item.previstaYmd;
    referencias.set(item.passo.id, referencia);
    const folga = folgaMinimaDias(chaveAtual, chave);
    let nova = adicionarDiasYmd(referencia, atraso);
    if (folga > 0) {
      const minimo = adicionarDiasYmd(hojeYmd, folga);
      if (nova < minimo) nova = minimo;
    }
    ajustes.set(item.passo.id, nova);
  }

  const slots: Array<{ cicloId: number; chave: string; ymd: string; fixo: boolean }> = [
    { cicloId: cicloAplicadoId, chave: chaveAtual, ymd: hojeYmd, fixo: true },
  ];
  for (const item of comData) {
    if (item.passo.id === cicloAplicadoId) continue;
    const chave = chaveAplicacaoProtocolo(item.passo.nome ?? "", item.passo.produto ?? "");
    if (!chave || chave === "koh") continue;
    const ymd = ajustes.get(item.passo.id);
    if (!ymd) continue;
    slots.push({ cicloId: item.passo.id, chave, ymd, fixo: false });
  }

  for (let volta = 0; volta < 40; volta++) {
    let mudou = false;
    for (const origem of slots) {
      for (const destino of slots) {
        if (origem.cicloId === destino.cicloId || destino.fixo) continue;
        const folga = folgaMinimaDias(origem.chave, destino.chave);
        if (folga <= 0) continue;
        const minimo = adicionarDiasYmd(origem.ymd, folga);
        const mesmoDia = destino.ymd === origem.ymd;
        const pertoDepois = destino.ymd > origem.ymd && destino.ymd < minimo;
        if (!mesmoDia && !pertoDepois) continue;
        if (mesmoDia && !origem.fixo && folga === 1 && destino.cicloId < origem.cicloId) continue;
        destino.ymd = minimo;
        mudou = true;
      }
    }
    if (!mudou) break;
  }

  for (const slot of slots) {
    if (!slot.fixo) ajustes.set(slot.cicloId, slot.ymd);
  }

  return [...ajustes.entries()]
    .filter(([cicloId, ymd]) => {
      const referencia = referencias.get(cicloId);
      return referencia == null || ymd !== referencia;
    })
    .map(([cicloId, dataAgendaYmd]) => ({ cicloId, dataAgendaYmd }));
}

export type ReagendamentoCalda = {
  cicloId: number;
  dataInicioYmd: string;
  diasSemana: number[];
};

/** Atraso de uma calda empurra a outra para outro dia da semana. */
export function reagendarCaldasAposAplicar(
  ciclos: Array<{
    id: number;
    nome: string;
    produto?: string | null;
    ativo: boolean;
    diasSemana?: number[] | null;
    dataInicio?: string | null;
  }>,
  aplicadaId: number,
  dataAplicacaoYmd: string,
): ReagendamentoCalda[] {
  const atual = ciclos.find((ciclo) => ciclo.id === aplicadaId);
  if (!atual?.ativo) return [];
  const chave = chaveAplicacaoProtocolo(atual.nome, atual.produto ?? "");
  if (chave !== "A" && chave !== "B") return [];
  const dias = atual.diasSemana ?? [];
  if (dias.length === 0) return [];
  const planejada = ultimaOcorrenciaSemanal(dias, ymdCalendario(atual.dataInicio), dataAplicacaoYmd);
  const atraso = Math.max(0, diferencaDiasYmd(planejada, dataAplicacaoYmd));
  if (atraso === 0) return [];

  const saida: ReagendamentoCalda[] = [];
  for (const ciclo of ciclos) {
    if (!ciclo.ativo || ciclo.id === aplicadaId) continue;
    const outra = chaveAplicacaoProtocolo(ciclo.nome, ciclo.produto ?? "");
    if (outra !== "A" && outra !== "B") continue;
    const diasOutra = ciclo.diasSemana ?? [];
    if (diasOutra.length === 0) continue;
    const inicio = ymdCalendario(ciclo.dataInicio);
    const aPartirDe =
      inicio && inicio > dataAplicacaoYmd ? inicio : adicionarDiasYmd(dataAplicacaoYmd, 1);
    let nova = adicionarDiasYmd(proximoDiaSemana(aPartirDe, diasOutra), atraso);
    if (nova <= dataAplicacaoYmd) nova = adicionarDiasYmd(dataAplicacaoYmd, 1);
    saida.push({
      cicloId: ciclo.id,
      dataInicioYmd: nova,
      diasSemana: [diaSemanaYmd(nova)],
    });
  }
  return saida;
}
