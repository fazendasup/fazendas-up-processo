import { describe, expect, it } from "vitest";
import {
  canAccessCommercialPath,
  dashboardPathForUserRole,
  homeForCommercialPerfil,
  homeForUserRole,
  roleLabel,
} from "./accessPolicy";

describe("accessPolicy", () => {
  it("direciona cada papel global para a home correta", () => {
    expect(homeForUserRole("admin")).toBe("/projetos");
    expect(homeForUserRole("platform_admin")).toBe("/projetos");
    expect(homeForUserRole("comercial")).toBe("/comercial");
    expect(homeForUserRole("user")).toBe("/");
  });

  it("mantem dashboard operacional em / para admin com projeto selecionado", () => {
    expect(dashboardPathForUserRole("admin")).toBe("/");
    expect(dashboardPathForUserRole("platform_admin")).toBe("/");
    expect(dashboardPathForUserRole("user")).toBe("/");
    expect(dashboardPathForUserRole("comercial")).toBe("/comercial");
  });

  it("mantem promoter restrito a pedidos e acompanhamento de avarias", () => {
    expect(homeForCommercialPerfil("PROMOTER")).toBe("/comercial/acompanhamento-avarias");
    expect(roleLabel("comercial", "PROMOTER")).toBe("Promoter");

    expect(canAccessCommercialPath("/comercial/pedidos", "PROMOTER")).toBe(true);
    expect(canAccessCommercialPath("/comercial/acompanhamento-avarias", "PROMOTER")).toBe(true);
    expect(canAccessCommercialPath("/comercial/varejo", "PROMOTER")).toBe(true);

    expect(canAccessCommercialPath("/comercial/dashboard", "PROMOTER")).toBe(false);
    expect(canAccessCommercialPath("/comercial/estoque-vivo", "PROMOTER")).toBe(false);
    expect(canAccessCommercialPath("/custos-producao", "PROMOTER")).toBe(false);
    expect(canAccessCommercialPath("/projetos", "PROMOTER")).toBe(false);
  });

  it("limita comercial/operacoes as paginas comerciais liberadas", () => {
    for (const perfil of ["COMERCIAL", "OPERACOES"] as const) {
      expect(homeForCommercialPerfil(perfil)).toBe("/comercial/dashboard");
      expect(canAccessCommercialPath("/comercial/dashboard", perfil)).toBe(true);
      expect(canAccessCommercialPath("/estoque", perfil)).toBe(true);
      expect(canAccessCommercialPath("/comercial/estoque-vivo", perfil)).toBe(true);
      expect(canAccessCommercialPath("/comercial/pedidos", perfil)).toBe(true);
      expect(canAccessCommercialPath("/comercial/acompanhamento-avarias", perfil)).toBe(true);
      expect(canAccessCommercialPath("/custos-producao", perfil)).toBe(true);

      expect(canAccessCommercialPath("/comercial/clientes", perfil)).toBe(false);
      expect(canAccessCommercialPath("/comercial/configuracoes", perfil)).toBe(false);
      expect(canAccessCommercialPath("/projetos", perfil)).toBe(false);
    }
  });
});
