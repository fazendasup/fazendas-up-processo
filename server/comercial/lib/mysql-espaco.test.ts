import { describe, expect, it } from "vitest";
import { isErroMysqlTabelaCheia } from "./mysql-espaco.js";

describe("isErroMysqlTabelaCheia", () => {
  it("detecta MySQL 1114 em qualquer tabela", () => {
    expect(
      isErroMysqlTabelaCheia(
        new Error("The table 'pedidos_operacionais_itens' is full"),
      ),
    ).toBe(true);
    expect(
      isErroMysqlTabelaCheia(
        new Error(
          "Invalid `prisma.pedidoOperacionalItem.createMany()` invocation: MysqlError { code: 1114 }",
        ),
      ),
    ).toBe(true);
    expect(
      isErroMysqlTabelaCheia(
        new Error("MysqlError { code: 1114, message: \"The table 'x' is full\" }"),
      ),
    ).toBe(true);
    expect(isErroMysqlTabelaCheia(new Error("outro erro"))).toBe(false);
  });
});
