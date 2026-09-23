import { describe, expect, it } from "vitest";
import {
  categoriasPermitidasParaPerfil,
  normalizarPreferenciasPush,
  usuarioRecebeCategoria,
} from "./pushNotificacoes";

describe("categoriasPermitidasParaPerfil", () => {
  it("operador só operacional", () => {
    expect(categoriasPermitidasParaPerfil({ role: "user" })).toEqual([
      "operacional",
    ]);
  });

  it("admin recebe todas", () => {
    expect(categoriasPermitidasParaPerfil({ role: "admin" })).toHaveLength(6);
  });

  it("financeiro comercial: financeiro + terceiros", () => {
    expect(
      categoriasPermitidasParaPerfil({
        role: "comercial",
        comercialPerfil: "FINANCEIRO",
      }),
    ).toEqual(["financeiro", "terceiros"]);
  });

  it("logistica só logistica", () => {
    expect(
      categoriasPermitidasParaPerfil({
        role: "comercial",
        comercialPerfil: "LOGISTICA",
      }),
    ).toEqual(["logistica"]);
  });

  it("visitante não recebe nada", () => {
    expect(categoriasPermitidasParaPerfil({ role: "visitante" })).toEqual([]);
  });
});

describe("usuarioRecebeCategoria", () => {
  it("bloqueia categoria fora do perfil mesmo se preferência true", () => {
    expect(
      usuarioRecebeCategoria({
        role: "user",
        preferencias: {
          ativo: true,
          categorias: { financeiro: true, operacional: true },
        },
        categoria: "financeiro",
      }),
    ).toBe(false);
  });

  it("respeita preferência desligada", () => {
    expect(
      usuarioRecebeCategoria({
        role: "admin",
        preferencias: { ativo: true, categorias: { terceiros: false } },
        categoria: "terceiros",
      }),
    ).toBe(false);
  });

  it("master ativo=false bloqueia tudo", () => {
    expect(
      usuarioRecebeCategoria({
        role: "admin",
        preferencias: { ativo: false, categorias: { operacional: true } },
        categoria: "operacional",
      }),
    ).toBe(false);
  });
});

describe("normalizarPreferenciasPush", () => {
  it("só mantém categorias permitidas", () => {
    const r = normalizarPreferenciasPush(
      { ativo: true, categorias: { operacional: false, financeiro: true } },
      ["operacional"],
    );
    expect(r.categorias).toEqual({ operacional: false });
    expect(r.categorias.financeiro).toBeUndefined();
  });
});
