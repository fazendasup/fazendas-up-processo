import { describe, expect, it } from "vitest";
import {
  chavePoteMicroverde,
  isVarianteBroto,
  nomeBasePoteMicroverde,
} from "./microverdesPote";

describe("microverdesPote", () => {
  it("extrai nome base de Broto e Microverdes", () => {
    expect(nomeBasePoteMicroverde("Beterraba  / Broto 30g")).toBe("Beterraba");
    expect(nomeBasePoteMicroverde("Beterraba / Microverdes 30g")).toBe(
      "Beterraba",
    );
    expect(nomeBasePoteMicroverde("Nabo Japonês  / Broto 30g")).toBe(
      "Nabo Japonês",
    );
    expect(nomeBasePoteMicroverde("Mix 3 variedades")).toBeNull();
  });

  it("agrupa Broto e Microverdes na mesma chave", () => {
    expect(chavePoteMicroverde("Beterraba / Broto 30g")).toBe(
      chavePoteMicroverde("Beterraba / Microverdes 30g"),
    );
    expect(isVarianteBroto("Beterraba / Broto 30g")).toBe(true);
    expect(isVarianteBroto("Beterraba / Microverdes 30g")).toBe(false);
  });
});
