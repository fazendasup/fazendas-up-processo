/**
 * Seed do 1º experimento: extrato de Chlorella em microverdes e alface.
 * Dose inicial acordada: 0,2 ml/L (100 ml / 500 L). Lembrete operacional: a cada 2 dias.
 */

export const CHLORELLA_TESTE_SLUG = "chlorella";

export const CHLORELLA_DOSE_ML_POR_L = 0.2;
export const CHLORELLA_LEMBRETE_DIAS = 2;

export type CulturaTeste = "microverdes" | "alface";
export type FaseAlfaceTeste = "mudas" | "vegetativa" | "maturacao";
export type TipoAplicacaoChlorella = "tanque" | "primeira_rega_pre_escuro";

export function doseTotalMl(doseMlPorL: number, volumeLitros: number): number {
  const d = Number(doseMlPorL) || 0;
  const v = Number(volumeLitros) || 0;
  return Math.round(d * v * 100) / 100;
}

export function volumePadraoFaseAlface(fase: FaseAlfaceTeste): 50 | 310 | 500 {
  if (fase === "mudas") return 50;
  if (fase === "maturacao") return 500;
  return 310;
}

/** Variedades de microverdes da linha FUP (comercial) — ciclos editáveis na página. */
export const MICROVERDES_CHLORELLA_SEED = [
  { variedadeNome: "Beterraba", diasEscuro: 2, diasFotoperiodo: 8, horasLuz: 16, biomassaEsperadaGramas: 30 },
  { variedadeNome: "Coentro", diasEscuro: 2, diasFotoperiodo: 10, horasLuz: 16, biomassaEsperadaGramas: 30 },
  { variedadeNome: "Couve", diasEscuro: 2, diasFotoperiodo: 9, horasLuz: 16, biomassaEsperadaGramas: 30 },
  { variedadeNome: "Mostarda", diasEscuro: 2, diasFotoperiodo: 8, horasLuz: 16, biomassaEsperadaGramas: 30 },
  { variedadeNome: "Nabo Japonês", diasEscuro: 2, diasFotoperiodo: 8, horasLuz: 16, biomassaEsperadaGramas: 30 },
  { variedadeNome: "Rabanete", diasEscuro: 2, diasFotoperiodo: 7, horasLuz: 16, biomassaEsperadaGramas: 30 },
  { variedadeNome: "Repolho Roxo", diasEscuro: 2, diasFotoperiodo: 9, horasLuz: 16, biomassaEsperadaGramas: 30 },
  { variedadeNome: "Rúcula", diasEscuro: 2, diasFotoperiodo: 8, horasLuz: 16, biomassaEsperadaGramas: 30 },
  { variedadeNome: "Acelga", diasEscuro: 2, diasFotoperiodo: 9, horasLuz: 16, biomassaEsperadaGramas: 30 },
] as const;

/** Alfaces de produção FUP — tempos de ciclo do cadastro (editáveis). */
export const ALFACES_CHLORELLA_SEED = [
  { variedadeNome: "Alface Brida", diasMudas: 14, diasVegetativa: 14, diasMaturacao: 14, biomassaEsperadaGramas: 180 },
  { variedadeNome: "Alface Crespa Roxa / Carmim", diasMudas: 14, diasVegetativa: 14, diasMaturacao: 14, biomassaEsperadaGramas: 175 },
  { variedadeNome: "Alface Crespa Verde / Mediterrânea", diasMudas: 14, diasVegetativa: 14, diasMaturacao: 14, biomassaEsperadaGramas: 185 },
  { variedadeNome: "Alface Crespa Verde / Vanda", diasMudas: 14, diasVegetativa: 14, diasMaturacao: 14, biomassaEsperadaGramas: 180 },
  { variedadeNome: "Alface Crespa Verde / BS 055", diasMudas: 14, diasVegetativa: 10, diasMaturacao: 10, biomassaEsperadaGramas: 170 },
  { variedadeNome: "Alface Crespa Verde / BS 155", diasMudas: 14, diasVegetativa: 14, diasMaturacao: 14, biomassaEsperadaGramas: 180 },
  { variedadeNome: "Alface Crespa Verde / Caipira", diasMudas: 14, diasVegetativa: 14, diasMaturacao: 14, biomassaEsperadaGramas: 180 },
  { variedadeNome: "Alface Americana", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28, biomassaEsperadaGramas: 250 },
  { variedadeNome: "Alface Frisee - Agnes", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28, biomassaEsperadaGramas: 165 },
  { variedadeNome: "Alface Frisèe / Excentric", diasMudas: 14, diasVegetativa: 14, diasMaturacao: 14, biomassaEsperadaGramas: 165 },
  { variedadeNome: "Alface Lisa / Lobella", diasMudas: 14, diasVegetativa: 14, diasMaturacao: 14, biomassaEsperadaGramas: 200 },
  { variedadeNome: "Alface Mimosa / Maíra", diasMudas: 14, diasVegetativa: 14, diasMaturacao: 14, biomassaEsperadaGramas: 170 },
] as const;

export const CHLORELLA_PROTOCOLO_RESUMO = [
  "Extrato líquido de Chlorella (não células vivas) na solução nutritiva.",
  "Dose inicial: 0,2 ml/L (100 ml em 500 L; 62 ml em 310 L; 10 ml em 50 L).",
  "Lembrete operacional a cada 2 dias (literatura costuma sugerir 1×/semana — ajustar se OD/biofilme subir).",
  "Microverdes: 1ª rega com extrato antes do escuro; caixa SN comum (310 L ou 500 L) para todas as variedades.",
  "Alface: mudas em galão 50 L; vegetativa 310/500 L; maturação 500 L.",
  "Não aplicar no mesmo dia que Thyper (H₂O₂). Filtrar o extrato antes de entrar no tanque.",
  "EC microverdes permanece 0,6 — o extrato quase não altera EC nesta dose.",
].join(" ");
