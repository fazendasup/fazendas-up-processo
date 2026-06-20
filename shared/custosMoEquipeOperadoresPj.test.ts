import { describe, expect, it } from "vitest";
import {
  CUSTO_MENSAL_TOTAL_OPERADOR_PJ,
  HONORARIOS_MENSAL_OPERADOR_PJ,
  HORAS_MES_40H_SEMANA,
  VA_MENSAL_OPERADOR_PJ,
  VT_MENSAL_OPERADOR_PJ,
  operadoresPjPadrao,
} from "./custosMoEquipeOperadoresPj";
import { calcularEquipeCompleta } from "./custosMoEquipe";

describe("operadoresPjPadrao", () => {
  it("gera 7 operadores com custo mensal completo", () => {
    const ops = operadoresPjPadrao();
    expect(ops).toHaveLength(7);
    expect(ops[0]?.nome).toBe("Operador 1");
    expect(ops[6]?.nome).toBe("Operador 7");
    expect(ops[5]?.finalidade).toBe("overhead");
    expect(ops[6]?.finalidade).toBe("overhead");
    expect(ops[0]?.finalidade).toBe("processamento");
    expect(CUSTO_MENSAL_TOTAL_OPERADOR_PJ).toBe(3150);
    expect(HONORARIOS_MENSAL_OPERADOR_PJ + VT_MENSAL_OPERADOR_PJ + VA_MENSAL_OPERADOR_PJ).toBe(3150);
    const calc = calcularEquipeCompleta({ ...ops[0]!, horasMes: HORAS_MES_40H_SEMANA });
    expect(calc.custoMensalEfetivo).toBe(3150);
    expect(calc.custoHora).toBeCloseTo(18.17, 1);
  });
});
