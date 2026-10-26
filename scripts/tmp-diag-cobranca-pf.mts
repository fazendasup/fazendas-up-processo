/**
 * Diagnóstico: pessoa CA + conta cobrança + tentativa PIX (valor >= 10).
 * Uso: npx tsx scripts/tmp-diag-cobranca-pf.mts
 */
import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { getComercialEnv } from "../server/comercial/env.ts";
import {
  createContaAzulHttp,
  contaAzulGet,
  contaAzulPost,
  contaAzulDelete,
  contaAzulPatch,
} from "../server/comercial/integrations/conta-azul/conta-azul.client.ts";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service.ts";
import {
  escolherContaCobrancaBoleto,
  sincronizarContasFinanceirasEnvio,
} from "../server/comercial/integrations/conta-azul/venda-outbound.service.ts";

const CPF = "97418480210";
const hoje = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Manaus",
}).format(new Date());

const prisma = getComercialPrisma();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: CPF }, { cnpjCpf: "974.184.802-10" }] },
});
if (!cliente?.externalId) {
  console.error("sem cliente", cliente);
  process.exit(1);
}

const env = getComercialEnv();
const cred = await ensureValidAccessToken(prisma, env);
const http = createContaAzulHttp(env, cred!.accessToken!);

const pessoa = await contaAzulGet<Record<string, unknown>>(
  http,
  `/v1/pessoas/${encodeURIComponent(cliente.externalId)}`,
);
console.log("pessoa", {
  id: pessoa.id,
  nome: pessoa.nome,
  email: pessoa.email,
  documento: (pessoa as { documento?: string }).documento ?? (pessoa as { cpf?: string }).cpf,
  telefone: (pessoa as { telefones?: unknown }).telefones ?? (pessoa as { celular?: string }).celular,
  endereco: (pessoa as { enderecos?: unknown }).enderecos ?? (pessoa as { endereco?: unknown }).endereco,
  perfil: pessoa.perfil ?? (pessoa as { tipo_pessoa?: string }).tipo_pessoa,
});

const sync = await sincronizarContasFinanceirasEnvio(prisma, env);
const contaId = escolherContaCobrancaBoleto(sync.contas, sync.selecionadaId);
console.log(
  "contas",
  sync.contas.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo, banco: c.banco, boleto: c.possuiConfigBoleto })),
);
console.log("escolhida", contaId, "selecionadaCfg", sync.selecionadaId);

const cats = await contaAzulGet<{ itens?: Array<{ id?: string; nome?: string; tipo?: string }> }>(
  http,
  `/v1/categorias?tamanho_pagina=100&pagina=1`,
);
const cat =
  (cats.itens ?? []).find((i) => /receitas?\s+de\s+vendas?/i.test(i.nome ?? "")) ??
  (cats.itens ?? []).find((i) => String(i.tipo).toUpperCase() === "RECEITA");
console.log("categoria", cat?.id, cat?.nome);

const total = 10.5;
const conta = await contaAzulPost<Record<string, unknown>>(http, "/v1/financeiro/contas-a-receber", {
  data_competencia: hoje,
  valor: total,
  observacao: "Diagnóstico portal Pix",
  descricao: "Teste Pix portal",
  id_cliente: cliente.externalId,
  conta_financeira: contaId,
  rateio: [{ id_categoria: cat!.id, valor: total }],
  condicao_pagamento: {
    parcelas: [
      {
        descricao: "Parcela 1",
        data_vencimento: hoje,
        nota: "diag",
        conta_financeira: contaId,
        detalhe_valor: { valor_bruto: total },
      },
    ],
  },
});
const receberId = String(conta.id ?? "");
let parcelaId = "";
const cond = conta.condicao_pagamento as { parcelas?: Array<{ id?: string }> } | undefined;
parcelaId = String(cond?.parcelas?.[0]?.id ?? "").trim();
if (!parcelaId && receberId) {
  const raw = await contaAzulGet<unknown>(
    http,
    `/v1/financeiro/eventos-financeiros/${encodeURIComponent(receberId)}/parcelas`,
  );
  const lista = Array.isArray(raw) ? raw : (raw as { itens?: unknown[] })?.itens;
  parcelaId = String((lista as Array<{ id?: string }>)?.[0]?.id ?? "");
}
console.log("receber", receberId, "parcela", parcelaId);

const cobranca = await contaAzulPost<{ id?: string; url?: string; status?: string }>(
  http,
  "/v1/financeiro/eventos-financeiros/contas-a-receber/gerar-cobranca",
  {
    conta_bancaria: contaId,
    descricao_fatura: "Teste Pix portal",
    id_parcela: parcelaId,
    data_vencimento: hoje,
    tipo: "PIX_COBRANCA",
  },
);
console.log("cobranca imediata", cobranca);

for (let i = 1; i <= 8; i++) {
  await new Promise((r) => setTimeout(r, 1500));
  const c = await contaAzulGet<{ id?: string; url?: string; status?: string }>(
    http,
    `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${encodeURIComponent(String(cobranca.id))}`,
  );
  console.log(`poll ${i}`, { status: c.status, url: c.url });
  if (c.url || (c.status && /FALHA|INVALIDO|REGISTRADO|PAGO/i.test(c.status))) break;
}

// limpa
try {
  if (cobranca.id) {
    await contaAzulDelete(
      http,
      `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${encodeURIComponent(String(cobranca.id))}`,
    );
  }
} catch {
  /* */
}
try {
  const p = await contaAzulGet<{ versao?: number; nao_pago?: number; total?: number }>(
    http,
    `/v1/financeiro/eventos-financeiros/parcelas/${encodeURIComponent(parcelaId)}`,
  );
  await contaAzulPatch(http, `/v1/financeiro/eventos-financeiros/parcelas/${encodeURIComponent(parcelaId)}`, {
    versao: p.versao,
    perda: { data: hoje, valor: Number(p.nao_pago) || total },
  });
  console.log("limpeza perda ok");
} catch (e) {
  console.warn("limpeza", e);
}

await prisma.$disconnect();
