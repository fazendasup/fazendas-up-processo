import * as db from "../db";

/**
 * Projeto "dono" do módulo comercial (Conta Azul, vendas, pedidos, clientes).
 *
 * Enquanto o comercial é single-tenant (um único banco/conta), só o projeto-dono pode
 * acessá-lo — isso impede que outro projeto veja os dados comerciais (isolamento Fase 1).
 *
 * Resolução (em ordem):
 *  1. `COMERCIAL_PROJETO_ID` (id explícito — recomendado em produção)
 *  2. `COMERCIAL_PROJETO_NOME` (default "Fazenda Vertical - FUP") → busca o id pelo nome
 */
const NOME_PADRAO_DONO = "Fazenda Vertical - FUP";
let cache: { id: number | null; at: number } | null = null;
const TTL_MS = 60_000;

export async function getComercialOwnerProjetoId(): Promise<number | null> {
  const envId = process.env.COMERCIAL_PROJETO_ID?.trim();
  if (envId && Number.isFinite(Number(envId))) {
    return Number(envId);
  }
  if (cache && Date.now() - cache.at < TTL_MS) return cache.id;
  const nome = process.env.COMERCIAL_PROJETO_NOME?.trim() || NOME_PADRAO_DONO;
  const id = await db.getProjetoIdByNome(nome);
  cache = { id, at: Date.now() };
  return id;
}
