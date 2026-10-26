import { getComercialPrisma } from "../server/comercial/db.ts";
import { getComercialEnv } from "../server/comercial/env.ts";
import { createContaAzulHttp, contaAzulGet, contaAzulPost } from "../server/comercial/integrations/conta-azul/conta-azul.client.ts";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service.ts";
import {
  escolherContaCobrancaBoleto,
  sincronizarContasFinanceirasEnvio,
} from "../server/comercial/integrations/conta-azul/venda-outbound.service.ts";

const prisma = getComercialPrisma();
const env = getComercialEnv();
const cliente = await prisma.cliente.findFirst({
  where: { OR: [{ cnpjCpf: "97418480210" }, { cnpjCpf: "974.184.802-10" }] },
});
if (!cliente?.externalId) throw new Error("sem cliente");
const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) throw new Error("sem token");
const http = createContaAzulHttp(env, cred.accessToken);
const sync = await sincronizarContasFinanceirasEnvio(prisma, env);
const contaId = escolherContaCobrancaBoleto(sync.contas, sync.selecionadaId)!;

type Cat = { id?: string; nome?: string; tipo?: string };
const receita: Cat[] = [];
for (let pagina = 1; pagina <= 10; pagina += 1) {
  const r = await contaAzulGet<{ itens?: Cat[]; items?: Cat[] }>(
    http,
    `/v1/categorias?tamanho_pagina=100&pagina=${pagina}`,
  );
  const itens = r.itens ?? r.items ?? [];
  if (itens.length === 0) break;
  for (const c of itens) {
    if (String(c.tipo ?? "").toUpperCase() === "RECEITA") receita.push(c);
  }
}
console.log(
  "receitas",
  receita
    .filter((c) => /venda|produto|receita|mercadoria|folh|salada/i.test(c.nome ?? ""))
    .slice(0, 30)
    .map((c) => `${c.nome} | ${c.id}`),
);
console.log("total receitas", receita.length);
const escolhida =
  receita.find((c) => /venda.*produto|produtos|mercadoria/i.test(c.nome ?? "")) ??
  receita.find((c) => /venda/i.test(c.nome ?? "")) ??
  receita[0];
console.log("escolhida", escolhida);

const total = 12.79;
const vencimento = "2026-10-22";
try {
  const conta = await contaAzulPost<Record<string, unknown>>(http, "/v1/financeiro/contas-a-receber", {
    data_competencia: vencimento,
    valor: total,
    observacao: "Probe site PF",
    descricao: "Pedido probe PF",
    id_cliente: cliente.externalId,
    conta_financeira: contaId,
    rateio: [{ id_categoria: escolhida!.id, valor: total }],
    condicao_pagamento: {
      parcelas: [
        {
          descricao: "Parcela 1",
          data_vencimento: vencimento,
          nota: "Pagamento pelo site",
          conta_financeira: contaId,
          detalhe_valor: { valor_bruto: total },
        },
      ],
    },
  });
  console.log("conta OK", {
    id: conta.id,
    parcelas: (conta.condicao_pagamento as { parcelas?: Array<{ id?: string }> } | undefined)?.parcelas,
  });

  const parcelaId = String(
    ((conta.condicao_pagamento as { parcelas?: Array<{ id?: string }> } | undefined)?.parcelas?.[0]?.id ?? ""),
  ).trim();
  console.log("parcela", parcelaId);

  if (parcelaId) {
    for (const tipo of ["PIX_COBRANCA", "LINK_PAGAMENTO"] as const) {
      try {
        const body: Record<string, unknown> = {
          conta_bancaria: contaId,
          descricao_fatura: `Probe ${tipo}`,
          id_parcela: parcelaId,
          data_vencimento: vencimento,
          tipo,
        };
        if (tipo === "LINK_PAGAMENTO") body.maximo_parcelas = 3;
        const cob = await contaAzulPost<Record<string, unknown>>(
          http,
          "/v1/financeiro/eventos-financeiros/contas-a-receber/gerar-cobranca",
          body,
        );
        console.log(tipo, "OK", { id: cob.id, url: cob.url ?? cob.URL, status: cob.status });
      } catch (e) {
        console.log(tipo, "ERR", e instanceof Error ? e.message : e);
      }
    }
  }
} catch (e) {
  console.error("conta ERR", e instanceof Error ? e.message : e);
}

await prisma.$disconnect();
