import type { MoEquipeInput } from "@shared/custosMoEquipe";
import type { CustoMoEquipeRow } from "../drizzle/schema";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function mapMoEquipeRowToInput(row: CustoMoEquipeRow): MoEquipeInput {
  return {
    id: row.id,
    nome: row.nome,
    cargo: row.cargo,
    codigoFolha: row.codigoFolha,
    regime: row.regime as MoEquipeInput["regime"],
    finalidade: row.finalidade as MoEquipeInput["finalidade"],
    numPessoas: row.numPessoas,
    horasMes: num(row.horasMes) ?? 0,
    custoMensalBase: num(row.custoMensalBase),
    encargosPct: num(row.encargosPct),
    custoMensalTotal: num(row.custoMensalTotal),
    liquidoMensal: num(row.liquidoMensal),
    observacoes: row.observacoes,
    ativo: row.ativo,
  };
}
