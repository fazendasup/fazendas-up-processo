/**
 * Marca como perda as contas a receber órfãs do cliente de teste (CPF Adson)
 * que ficaram abertas após retries/trocas de pagamento no portal.
 *
 * Uso: npx tsx scripts/tmp-limpar-receber-orfaos-adson.mts
 */
import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { getComercialEnv } from "../server/comercial/env.ts";
import {
  createContaAzulHttp,
  contaAzulGet,
  contaAzulPatch,
} from "../server/comercial/integrations/conta-azul/conta-azul.client.ts";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service.ts";
import { extratoReceberClienteCa } from "../server/comercial/lib/cliente-inadimplencia-ca.ts";

const CPF = "97418480210";
const hoje = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Manaus",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: CPF }, { cnpjCpf: "974.184.802-10" }] },
});
if (!cliente?.externalId) {
  console.error("Cliente não encontrado");
  process.exit(1);
}

const pedidos = await prisma.pedidoOperacional.findMany({
  where: { clienteId: cliente.id },
  select: { id: true, status: true },
});
const pags = await prisma.portalPedidoPagamento.findMany({
  where: { pedidoId: { in: pedidos.map((p) => p.id) } },
});
const parcelaAtiva = new Set(
  pags.filter((p) => p.status === "AGUARDANDO" || p.status === "PAGO").map((p) => p.parcelaId).filter(Boolean),
);
console.log("parcelas ativas no portal", [...parcelaAtiva]);

const extrato = await extratoReceberClienteCa({
  contaAzulCustomerId: cliente.externalId,
  dataInicio: "2026-09-01",
  dataFim: "2026-12-31",
});

const orfas = extrato.titulos.filter(
  (t) => t.valorAberto > 0.009 && !/PERDIDO|CANCELADO|QUITADO/i.test(t.status) && !parcelaAtiva.has(t.id),
);
console.log(
  "órfãs a encerrar",
  orfas.map((t) => ({ id: t.id, status: t.status, valor: t.valorAberto, desc: t.descricao })),
);

const env = getComercialEnv();
const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) {
  console.error("Sem token Conta Azul");
  process.exit(1);
}
const http = createContaAzulHttp(env, cred.accessToken);

for (const titulo of orfas) {
  try {
    const parcela = await contaAzulGet<{
      versao?: number;
      status?: string;
      nao_pago?: number;
      total?: number;
      valor_composicao?: { valor_bruto?: number };
    }>(http, `/v1/financeiro/eventos-financeiros/parcelas/${encodeURIComponent(titulo.id)}`);
    const versao = Number(parcela.versao);
    const valor =
      Number(parcela.nao_pago) ||
      Number(parcela.valor_composicao?.valor_bruto) ||
      Number(parcela.total) ||
      titulo.valorAberto;
    if (!Number.isFinite(versao) || versao < 1 || valor <= 0) {
      console.warn("pula", titulo.id, { versao, valor, status: parcela.status });
      continue;
    }
    await contaAzulPatch(http, `/v1/financeiro/eventos-financeiros/parcelas/${encodeURIComponent(titulo.id)}`, {
      versao,
      perda: { data: hoje, valor: Math.round(valor * 100) / 100 },
    });
    console.log("perda ok", titulo.id, valor);
  } catch (error) {
    console.error("falha", titulo.id, error);
  }
}

await prisma.$disconnect();
