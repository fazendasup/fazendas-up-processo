import "dotenv/config";
import { getComercialPrisma } from "../server/comercial/db.ts";
import { getComercialEnv } from "../server/comercial/env.ts";
import {
  contaAzulGet,
  createContaAzulHttp,
} from "../server/comercial/integrations/conta-azul/conta-azul.client.ts";
import {
  extrairPesoLiquidoKgContaAzul,
  mapProdutoContaAzulItem,
} from "../server/comercial/integrations/conta-azul/mappers.ts";
import { sincronizarCatalogoProdutosContaAzul } from "../server/comercial/integrations/conta-azul/produtos-sync.service.ts";
import { ensureValidAccessToken } from "../server/comercial/integrations/conta-azul/sync.service.ts";
import {
  enriquecerNomeComPesoKg,
  pesoDoProduto,
} from "../shared/produtoPeso.ts";

const prisma = getComercialPrisma();
const env = getComercialEnv();

const operacao = await prisma.produtoComercial.findMany({
  where: {
    contaAzulProdutoId: { not: null },
    OR: [{ importadoOperacao: true }, { ativo: true }],
  },
  select: {
    id: true,
    nome: true,
    sku: true,
    modoCompra: true,
    contaAzulProdutoId: true,
    importadoOperacao: true,
    ativo: true,
  },
  orderBy: { nome: "asc" },
});

const semPeso = operacao.filter((p) => !pesoDoProduto(p.nome, p.modoCompra));
console.log(
  JSON.stringify(
    {
      operacao: operacao.length,
      semPeso: semPeso.length,
      amostraSemPeso: semPeso.slice(0, 40).map((p) => ({
        nome: p.nome,
        sku: p.sku,
        idCa: p.contaAzulProdutoId,
      })),
    },
    null,
    2,
  ),
);

const cred = await ensureValidAccessToken(prisma, env);
if (!cred?.accessToken) {
  console.error("sem token Conta Azul");
  process.exit(1);
}
const http = createContaAzulHttp(env, cred.accessToken);

type Achado = {
  idCa: string;
  nomeCa: string;
  sku: string | null;
  pesoKg: number;
  nomeComPeso: string;
  localNome: string;
};

const comPesoCa: Achado[] = [];
const semPesoCa: string[] = [];
const falhas: string[] = [];

for (const p of semPeso) {
  const idCa = p.contaAzulProdutoId!;
  try {
    const raw = await contaAzulGet<unknown>(
      http,
      `/v1/produtos/${encodeURIComponent(idCa)}`,
    );
    const pesoKg = extrairPesoLiquidoKgContaAzul(raw);
    const mapped = mapProdutoContaAzulItem(raw);
    if (pesoKg == null || pesoKg <= 0) {
      semPesoCa.push(`${p.nome} (${p.sku ?? idCa})`);
      continue;
    }
    const nomeCa = mapped?.nome ?? p.nome;
    comPesoCa.push({
      idCa,
      nomeCa,
      sku: mapped?.codigo ?? p.sku,
      pesoKg,
      nomeComPeso: enriquecerNomeComPesoKg(nomeCa, pesoKg),
      localNome: p.nome,
    });
  } catch (e) {
    falhas.push(
      `${p.nome}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

console.log(
  JSON.stringify(
    {
      comPesoCa: comPesoCa.length,
      semPesoCa: semPesoCa.length,
      falhas: falhas.length,
      paraAtualizar: comPesoCa,
      semPesoNoCa: semPesoCa,
      falhasDetalhe: falhas,
    },
    null,
    2,
  ),
);

if (comPesoCa.length === 0) {
  console.log("Nada a sincronizar por peso.");
  await prisma.$disconnect();
  process.exit(0);
}

// Sync pontual por nome/sku dos que têm peso no CA (reusa upsert com enrich).
const buscas = Array.from(
  new Set(
    comPesoCa.flatMap((x) => {
      const out: string[] = [];
      if (x.sku) out.push(x.sku);
      const base = x.nomeCa.split(/\s+/).slice(0, 2).join(" ");
      if (base.length >= 3) out.push(base);
      return out;
    }),
  ),
);

let totalAtualizados = 0;
const avisosAll: string[] = [];
for (const busca of buscas) {
  const r = await sincronizarCatalogoProdutosContaAzul(prisma, env, {
    busca,
    ...(busca.match(/^[A-Z0-9._-]{3,24}$/i) ? { sku: busca } : {}),
  });
  totalAtualizados += r.atualizados + r.novos;
  avisosAll.push(...r.avisos);
  console.log("sync", busca, {
    recebidos: r.recebidos,
    atualizados: r.atualizados,
    novos: r.novos,
    ignorados: r.ignorados,
    amostra: r.amostraNomes,
  });
}

const depois = await prisma.produtoComercial.findMany({
  where: { id: { in: semPeso.map((p) => p.id) } },
  select: { nome: true, sku: true, modoCompra: true },
  orderBy: { nome: "asc" },
});
console.log(
  "resultado final",
  depois.map((p) => ({
    nome: p.nome,
    sku: p.sku,
    peso: pesoDoProduto(p.nome, p.modoCompra),
  })),
);
console.log("totalAtualizados~", totalAtualizados, "avisos", avisosAll.slice(0, 20));

await prisma.$disconnect();
