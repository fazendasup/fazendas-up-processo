import { describe, expect, it } from "vitest";
import {
  detalheHttpContaAzul,
  textoErroContaAzul,
} from "./contaAzulErroUsuario";

const HTML_503 =
  "<HTML><HEAD><TITLE>Error</TITLE></HEAD><BODY> An error occurred while processing your request.<p> Reference&#32;&#35;35&#46;5c0a7cb1f6 </p><P>https&#58;&#47;&#47;errors&#46;edgesuite&#46;net&#47;x</P> </BODY></HTML>";

describe("erro Conta Azul para o usuário", () => {
  it("503 com HTML da CDN vira aviso curto", () => {
    expect(detalheHttpContaAzul(503, HTML_503, "falha")).toBe(
      "A Conta Azul está fora do ar agora. Espere um minuto e clique em Atualizar.",
    );
    expect(
      textoErroContaAzul(`Conta Azul (503): ${HTML_503}`),
    ).toBe(
      "A Conta Azul está fora do ar agora. Espere um minuto e clique em Atualizar.",
    );
  });

  it("429 não repete o corpo técnico", () => {
    expect(detalheHttpContaAzul(429, "rate limit", "x")).toMatch(/limitou/);
  });
});
