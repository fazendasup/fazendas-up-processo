import type { MoEquipeInput } from "./custosMoEquipe";

/** 40 h/semana × 52 semanas ÷ 12 meses. */
export const HORAS_MES_40H_SEMANA = Math.round((40 * 52) / 12 * 100) / 100;

/** VT R$ 10/dia × 5 dias úteis/semana, proporcional ao mês (52/12). */
export const VT_MENSAL_OPERADOR_PJ = Math.round(10 * 5 * (52 / 12) * 100) / 100;

/** VA R$ 20/dia × 5 dias úteis/semana, proporcional ao mês (52/12). */
export const VA_MENSAL_OPERADOR_PJ = Math.round(20 * 5 * (52 / 12) * 100) / 100;

export const HONORARIOS_MENSAL_OPERADOR_PJ = 2500;

export const CUSTO_MENSAL_TOTAL_OPERADOR_PJ = Math.round(
  (HONORARIOS_MENSAL_OPERADOR_PJ + VT_MENSAL_OPERADOR_PJ + VA_MENSAL_OPERADOR_PJ) * 100,
) / 100;

export const OBS_OPERADOR_PJ =
  "Contrato R$ 2.500 (40 h/semana) + VT R$ 10/dia × 5 dias úteis + VA R$ 20/dia × 5 dias úteis. " +
  `Custo mensal total R$ ${CUSTO_MENSAL_TOTAL_OPERADOR_PJ.toFixed(2).replace(".", ",")} ` +
  "(proporção 52/12 semanas).";

export const OBS_SUPERVISOR_PJ = `${OBS_OPERADOR_PJ} Função: ADM / supervisão (overhead — rateio mensal, não entra no R$/h de processamento).`;

/** Índices 1–7; 6 e 7 são ADM/supervisores (overhead). */
export const INDICES_SUPERVISOR_PJ = [6, 7] as const;

export function criarOperadorPjTemplate(indice: number): MoEquipeInput {
  const isSupervisor = (INDICES_SUPERVISOR_PJ as readonly number[]).includes(indice);
  return {
    nome: `Operador ${indice}`,
    regime: "pj",
    finalidade: isSupervisor ? "overhead" : "processamento",
    numPessoas: 1,
    horasMes: HORAS_MES_40H_SEMANA,
    custoMensalBase: HONORARIOS_MENSAL_OPERADOR_PJ,
    custoMensalTotal: CUSTO_MENSAL_TOTAL_OPERADOR_PJ,
    liquidoMensal: CUSTO_MENSAL_TOTAL_OPERADOR_PJ,
    ativo: true,
  };
}

/** 5 operadores PJ (processamento) + 2 ADM/supervisores PJ (overhead). */
export function operadoresPjPadrao(): MoEquipeInput[] {
  return Array.from({ length: 7 }, (_, i) => criarOperadorPjTemplate(i + 1));
}

export function observacoesOperadorPj(indice?: number): string {
  if (indice != null && (INDICES_SUPERVISOR_PJ as readonly number[]).includes(indice)) {
    return OBS_SUPERVISOR_PJ;
  }
  return OBS_OPERADOR_PJ;
}
