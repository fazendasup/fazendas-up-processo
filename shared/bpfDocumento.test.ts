import { describe, expect, it } from "vitest";
import { atalhoBpfDoTexto, hrefBpf, semFotosBpf } from "./bpfDocumento";

describe("bpfDocumento", () => {
  it("aponta peróxido, colheita e transplante para a FIT certa", () => {
    expect(atalhoBpfDoTexto("H₂O₂ 200V")?.view).toBe("tr-fit3");
    expect(atalhoBpfDoTexto("Colheita do perfil")?.codigo).toBe("FIT-TR-007");
    expect(atalhoBpfDoTexto("Transplantio berçário")?.view).toBe("tr-fit5");
    expect(atalhoBpfDoTexto("KOH P.A.")?.view).toBe("tr-fit2");
    expect(atalhoBpfDoTexto("")).toBeNull();
  });

  it("prefere o produto químico quando o nome também cita colheita", () => {
    expect(atalhoBpfDoTexto("H2O2", "dia de colheita")?.view).toBe("tr-fit3");
  });

  it("remove foto embutida e mantém o texto", () => {
    const limpo = semFotosBpf({
      titulo: "Bancada",
      foto: "data:image/png;base64,AAAA",
      passos: [{ texto: "Cortar" }],
    });
    expect(limpo.foto).toBeNull();
    expect(limpo.titulo).toBe("Bancada");
    expect(limpo.passos[0]?.texto).toBe("Cortar");
  });

  it("monta o endereço com a âncora do documento", () => {
    expect(hrefBpf("tr-fit6")).toBe("/bpf#tr-fit6");
  });
});
