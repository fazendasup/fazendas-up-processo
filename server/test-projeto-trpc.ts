/**
 * Helpers para testes tRPC que exigem projeto ativo (cookie/header + resolveProjetoForUser).
 */
import { afterEach, beforeEach, vi } from "vitest";
import { PROJETO_HEADER } from "@shared/const";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

/** Id de projeto fictício usado nos testes de integração com BD local. */
export const TEST_PROJETO_ID = 1;

export function projetoHeader(pid: number = TEST_PROJETO_ID): Record<string, string> {
  return { [PROJETO_HEADER]: String(pid) };
}

/** Instala mock de vínculo usuário↔projeto (evita depender de `projeto_usuarios` preenchido). */
export function useMockProjetoResolve(): void {
  beforeEach(() => {
    vi.spyOn(db, "resolveProjetoForUser").mockImplementation(async (_userId, pid) => {
      if (pid == null || pid === 999999) return undefined;
      return { id: pid, tipo: "fazenda_vertical", status: "ativo" };
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
}

export function withProjetoBase(
  base: Omit<TrpcContext, "projetoId" | "projetoTipo">,
  pid: number = TEST_PROJETO_ID,
): TrpcContext {
  const headers = {
    ...((base.req.headers as Record<string, string | string[] | undefined>) || {}),
    ...projetoHeader(pid),
  } as TrpcContext["req"]["headers"];
  return {
    ...base,
    projetoId: null,
    projetoTipo: null,
    req: { ...base.req, headers } as TrpcContext["req"],
    res: base.res,
  };
}
