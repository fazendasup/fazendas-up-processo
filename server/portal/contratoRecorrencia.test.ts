import { describe, expect, it } from "vitest";
import { FAZENDA_CONTRATO, hashContrato, minimoPorAceite, montarTextoContrato } from "./contratoRecorrencia";

describe("contrato de recorrência", () => {
  const texto = montarTextoContrato({
    clienteNome: "BURGERS & BURGERS",
    clienteCnpj: "00.000.000/0001-91",
    clienteEndereco: "Rua A, 10 - Centro, Manaus/AM",
  });

  it("identifica a fazenda e o cliente", () => {
    expect(texto).toContain(FAZENDA_CONTRATO.razaoSocial);
    expect(texto).toContain(FAZENDA_CONTRATO.cnpj);
    expect(texto).toContain("Avenida do Turismo, 10072G");
    expect(texto).toContain("BURGERS & BURGERS");
    expect(texto).toContain("00.000.000/0001-91");
  });

  it("registra os mínimos, o prazo e a produção", () => {
    expect(texto).toContain("R$ 300,00");
    expect(texto).toContain("R$ 150,00");
    expect(texto).toContain("2 dias úteis");
    expect(texto).toContain("24 horas antes do envio");
    expect(texto).toContain("linha de produção");
    expect(texto).toContain("endereço IP");
  });

  it("o mínimo de 150 só vale depois do aceite", () => {
    expect(minimoPorAceite(false)).toBe(300);
    expect(minimoPorAceite(true)).toBe(150);
    expect(hashContrato(texto)).toHaveLength(64);
  });
});
