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

/** Só o primeiro passo da sequência que já pode ser feito. Os seguintes ficam ocultos. */
export function escolherPassoDaCaixa<TCaixa extends string | number>(
  passos: PassoCicloAgenda<TCaixa>[],
  caixaId: TCaixa,
  hojeYmd: string,
): PassoEscolhido<TCaixa> | null {
  const devidos = passos
    .map((passo) => {
      const previstaYmd = dataPrevistaCicloYmd(passo, caixaId, hojeYmd);
      return previstaYmd ? { passo, previstaYmd } : null;
    })
    .filter((item): item is { passo: PassoCicloAgenda<TCaixa>; previstaYmd: string } => item != null)
    .filter((item) => item.previstaYmd <= hojeYmd)
    .sort((a, b) => a.previstaYmd.localeCompare(b.previstaYmd) || a.passo.id - b.passo.id);

  const primeiro = devidos[0];
  if (!primeiro) return null;
  const diasAtraso = Math.max(0, diferencaDiasYmd(primeiro.previstaYmd, hojeYmd));
  return { ...primeiro, diasAtraso };
}

/**
 * Datas novas dos passos posteriores, contadas a partir do dia em que este foi aplicado.
 * O intervalo entre eles permanece o que já estava marcado.
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

  return posteriores.map((item) => {
    const gap = Math.max(0, diferencaDiasYmd(atual.previstaYmd, item.previstaYmd));
    return { cicloId: item.passo.id, dataAgendaYmd: adicionarDiasYmd(hojeYmd, gap) };
  });
}
