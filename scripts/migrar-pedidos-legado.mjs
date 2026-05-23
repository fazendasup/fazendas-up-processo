import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { PrismaClient, Prisma } = require(path.join(root, "server/comercial/generated/prisma/index.js"));

const DEFAULT_SOURCE = "C:\\Users\\adson\\dev\\fazendas-up\\dados-sync.json";
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [k, ...rest] = arg.replace(/^--/, "").split("=");
    return [k, rest.length ? rest.join("=") : "1"];
  }),
);

const sourcePath = path.resolve(String(args.get("source") || DEFAULT_SOURCE));
const mapPath = args.get("map") ? path.resolve(String(args.get("map"))) : null;
const reportPath = path.resolve(String(args.get("report") || "tmp/migracao-pedidos-legado-report.json"));
const apply = args.get("apply") === "1" || args.get("apply") === "true";
const bootstrapClientesLegado =
  args.get("bootstrap-clientes-legado") === "1" || args.get("bootstrap-clientes-legado") === "true";
const resetPedidosLegado = args.get("reset-pedidos-legado") === "1" || args.get("reset-pedidos-legado") === "true";
const weekStart = args.get("week-start") ? new Date(`${args.get("week-start")}T12:00:00`) : new Date();

const DIA_INDEX = {
  domingo: 0,
  "segunda-feira": 1,
  segunda: 1,
  "terça-feira": 2,
  terca: 2,
  "terca-feira": 2,
  terça: 2,
  quarta: 3,
  "quarta-feira": 3,
  quinta: 4,
  "quinta-feira": 4,
  sexta: 5,
  "sexta-feira": 5,
  sabado: 6,
  sábado: 6,
};

const TIPO_VENDA = {
  "recorrente semanal": "RECORRENTE_SEMANAL",
  "recorrente quinzenal": "RECORRENTE_QUINZENAL",
  plano: "PLANO",
  avulso: "AVULSO",
};

const STATUS = {
  pendente: "PENDENTE",
  pronto: "PRONTO",
  pronta: "PRONTO",
  entregue: "ENTREGUE",
  cancelado: "CANCELADO",
  cancelada: "CANCELADO",
};

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(ltda|me|eireli|restaurante|rest|bar|the|da|de|do|dos|das)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text) {
  return normalize(text).split(" ").filter((t) => t.length > 2);
}

function jaccard(a, b) {
  const as = new Set(tokens(a));
  const bs = new Set(tokens(b));
  if (as.size === 0 || bs.size === 0) return 0;
  let inter = 0;
  for (const t of as) if (bs.has(t)) inter++;
  return inter / new Set([...as, ...bs]).size;
}

function scoreNames(legacyName, cliente) {
  const a = normalize(legacyName);
  const b = normalize(cliente.nome);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.92;
  return jaccard(a, b);
}

function parseDias(value) {
  const m = String(value || "").match(/\d+/);
  return m ? Number(m[0]) : null;
}

function periodoEntrega(value) {
  const v = normalize(value);
  if (v.includes("manha")) return "MANHA";
  if (v.includes("tarde")) return "TARDE";
  return null;
}

function dataEntregaDaSemana(diaSemanaRaw) {
  const idx = DIA_INDEX[normalize(diaSemanaRaw)] ?? DIA_INDEX[String(diaSemanaRaw || "").toLowerCase()];
  const base = new Date(weekStart);
  base.setHours(0, 0, 0, 0);
  const diff = (idx ?? base.getDay()) - base.getDay();
  base.setDate(base.getDate() + diff);
  return base;
}

function tipoVenda(value) {
  return TIPO_VENDA[normalize(value)] || "AVULSO";
}

function statusPedido(value) {
  return STATUS[normalize(value)] || "PENDENTE";
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readOverrides() {
  if (!mapPath || !fs.existsSync(mapPath)) return {};
  const raw = loadJson(mapPath);
  return raw.legacyToContaAzul || raw;
}

function produtoKey(nome) {
  return normalize(nome);
}

async function main() {
  if (!process.env.COMERCIAL_DATABASE_URL) {
    throw new Error("COMERCIAL_DATABASE_URL não configurada.");
  }

  const legacy = loadJson(sourcePath);
  const data = legacy.data || legacy;
  const legacyClientes = data.clientes || data.clients || [];
  const legacyProdutos = data.produtos || data.products || [];
  const legacyPedidos = data.pedidos || data.orders || [];
  const overrides = readOverrides();

  const prisma = new PrismaClient({ datasources: { db: { url: process.env.COMERCIAL_DATABASE_URL } } });
  const report = {
    sourcePath,
    apply,
    totals: {
      legacyClientes: legacyClientes.length,
      legacyProdutos: legacyProdutos.length,
      legacyPedidos: legacyPedidos.length,
      links: 0,
      linksPendentes: 0,
      produtos: 0,
      regras: 0,
      precosEspeciais: 0,
      pedidos: 0,
      pedidosIgnorados: 0,
      clientesBootstrap: 0,
    },
    unresolvedClientes: [],
    ambiguousClientes: [],
    skippedPedidos: [],
    links: [],
  };

  try {
    if (apply && bootstrapClientesLegado) {
      for (const c of legacyClientes) {
        await prisma.cliente.upsert({
          where: { externalId: `legado:${c.id}` },
          create: {
            externalId: `legado:${c.id}`,
            nome: c.nome,
            tipo: "OUTROS",
            statusRelacionamento: "ATIVO",
            tags: ["migracao-legado-local"],
          },
          update: {
            nome: c.nome,
            tags: ["migracao-legado-local"],
          },
        });
        report.totals.clientesBootstrap++;
      }
    }

    if (apply && resetPedidosLegado) {
      const auditorias = await prisma.pedidoOperacionalAuditoria.findMany({
        where: { acao: "migracao_legado" },
        select: { pedidoId: true },
      });
      const pedidoIds = [...new Set(auditorias.map((a) => a.pedidoId))];
      if (pedidoIds.length) {
        await prisma.pedidoOperacionalItem.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
        await prisma.pedidoOperacionalAuditoria.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
        await prisma.pedidoOperacional.deleteMany({ where: { id: { in: pedidoIds } } });
      }
    }

    const clientesContaAzul = await prisma.cliente.findMany({
      where: { externalId: { not: null } },
      select: { id: true, externalId: true, nome: true, cnpjCpf: true },
    });

    const links = new Map();
    for (const c of legacyClientes) {
      const override = overrides[String(c.id)];
      let match = null;
      let method = "nome";
      let confidence = 0;

      if (override) {
        match = clientesContaAzul.find((x) => x.externalId === override || x.id === override) || null;
        method = "override";
        confidence = match ? 1 : 0;
      } else {
        const ranked = clientesContaAzul
          .map((ca) => ({ ca, score: scoreNames(c.nome, ca) }))
          .filter((x) => x.score >= 0.62)
          .sort((a, b) => b.score - a.score);
        if (ranked[0]) {
          match = ranked[0].ca;
          confidence = ranked[0].score;
          if (ranked[1] && ranked[0].score - ranked[1].score < 0.08 && ranked[0].score < 0.95) {
            report.ambiguousClientes.push({
              legacyClientId: c.id,
              legacyClientName: c.nome,
              candidates: ranked.slice(0, 5).map((r) => ({ contaAzulCustomerId: r.ca.externalId, nome: r.ca.nome, score: r.score })),
            });
            match = null;
          }
        }
      }

      if (!match?.externalId) {
        report.totals.linksPendentes++;
        report.unresolvedClientes.push({ legacyClientId: c.id, legacyClientName: c.nome });
        continue;
      }

      links.set(String(c.id), match);
      report.links.push({
        legacyClientId: String(c.id),
        legacyClientName: c.nome,
        contaAzulCustomerId: match.externalId,
        contaAzulName: match.nome,
        method,
        confidence: Number(confidence.toFixed(2)),
      });

      if (apply) {
        await prisma.clienteLegadoContaAzulLink.upsert({
          where: { legacyClientId: String(c.id) },
          create: {
            legacyClientId: String(c.id),
            legacyClientName: c.nome,
            contaAzulCustomerId: match.externalId,
            clienteId: match.id,
            metodo: method,
            confianca: new Prisma.Decimal(confidence),
            revisado: method === "override",
          },
          update: {
            legacyClientName: c.nome,
            contaAzulCustomerId: match.externalId,
            clienteId: match.id,
            metodo: method,
            confianca: new Prisma.Decimal(confidence),
            revisado: method === "override",
          },
        });
      }
      report.totals.links++;
    }

    const produtoByKey = new Map();
    const produtoNames = new Set([
      ...legacyProdutos.map((p) => p.nome).filter(Boolean),
      ...legacyPedidos.map((p) => p.produto).filter(Boolean),
    ]);

    for (const nome of produtoNames) {
      const legacyProduto = legacyProdutos.find((p) => normalize(p.nome) === normalize(nome)) || {};
      const categoria =
        Array.isArray(legacyProduto.categorias) && legacyProduto.categorias.length === 1
          ? legacyProduto.categorias[0]
          : legacyPedidos.find((p) => normalize(p.produto) === normalize(nome) && p.categoria)?.categoria || null;
      const key = produtoKey(nome);
      if (apply) {
        const produto = await prisma.produtoComercial.upsert({
          where: { nome: nome },
          create: {
            nome,
            precoBase: legacyProduto.precoBase ? new Prisma.Decimal(legacyProduto.precoBase) : null,
            categoria: categoria || null,
            fatorCompraUnidade: data.estoqueFatores?.[key] ? new Prisma.Decimal(data.estoqueFatores[key]) : null,
            modoCompra: normalize(data.estoqueModoCompra?.[key]) === "kg" ? "KG" : "UNIDADE",
            rendimentoPorKg: data.estoqueRendimentoKilo?.[key] ? new Prisma.Decimal(data.estoqueRendimentoKilo[key]) : null,
            ocultoListaCompra: Boolean(data.estoqueDesativados?.[key]),
            mixAtivo: Boolean(data.estoqueMix?.[key]),
          },
          update: {
            precoBase: legacyProduto.precoBase ? new Prisma.Decimal(legacyProduto.precoBase) : undefined,
            categoria: categoria || undefined,
            fatorCompraUnidade: data.estoqueFatores?.[key] ? new Prisma.Decimal(data.estoqueFatores[key]) : undefined,
            modoCompra: normalize(data.estoqueModoCompra?.[key]) === "kg" ? "KG" : undefined,
            rendimentoPorKg: data.estoqueRendimentoKilo?.[key] ? new Prisma.Decimal(data.estoqueRendimentoKilo[key]) : undefined,
            ocultoListaCompra: data.estoqueDesativados?.[key] === undefined ? undefined : Boolean(data.estoqueDesativados[key]),
            mixAtivo: data.estoqueMix?.[key] === undefined ? undefined : Boolean(data.estoqueMix[key]),
          },
        });
        produtoByKey.set(key, produto);
      }
      report.totals.produtos++;
    }

    const mixFolha = data.estoqueMixFolhaLeve;
    if (apply && mixFolha?.referenciaProduto) {
      await prisma.estoqueVivoConfig.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          mixReferenciaNome: String(mixFolha.referenciaProduto).trim(),
          mixVariedades: Array.isArray(mixFolha.variedades) ? mixFolha.variedades : [],
        },
        update: {
          mixReferenciaNome: String(mixFolha.referenciaProduto).trim(),
          mixVariedades: Array.isArray(mixFolha.variedades) ? mixFolha.variedades : [],
        },
      });
    }

    for (const c of legacyClientes) {
      const match = links.get(String(c.id));
      if (!match?.externalId) continue;
      if (apply) {
        const regra = await prisma.regraComercialCliente.upsert({
          where: { contaAzulCustomerId: match.externalId },
          create: {
            contaAzulCustomerId: match.externalId,
            observacoesGerais: c.observacoes || null,
            periodoEntrega: periodoEntrega(c.periodoEntrega),
            horarioMaximoEntrega: c.horarioMaximo || null,
            cobraTaxaEntrega: Boolean(c.cobraEntrega),
            prazoBoletoDias: parseDias(c.prazoBoleto),
            acumulaPedidos: Boolean(c.acumulaPedidos),
            diasAcumulo: parseDias(c.diasAcumulo),
            prazoBoletoAcumuloDias: parseDias(c.prazoBoletoAcumulo),
          },
          update: {
            observacoesGerais: c.observacoes || null,
            periodoEntrega: periodoEntrega(c.periodoEntrega),
            horarioMaximoEntrega: c.horarioMaximo || null,
            cobraTaxaEntrega: Boolean(c.cobraEntrega),
            prazoBoletoDias: parseDias(c.prazoBoleto),
            acumulaPedidos: Boolean(c.acumulaPedidos),
            diasAcumulo: parseDias(c.diasAcumulo),
            prazoBoletoAcumuloDias: parseDias(c.prazoBoletoAcumulo),
          },
        });
        await prisma.precoEspecialCliente.deleteMany({ where: { regraId: regra.id } });
        for (const preco of c.precos || []) {
          const produto = produtoByKey.get(produtoKey(preco.produto));
          if (!produto) continue;
          await prisma.precoEspecialCliente.create({
            data: {
              regraId: regra.id,
              produtoId: produto.id,
              preco: new Prisma.Decimal(preco.preco),
            },
          });
          report.totals.precosEspeciais++;
        }
      } else {
        report.totals.precosEspeciais += (c.precos || []).length;
      }
      report.totals.regras++;
    }

    const pedidosAgrupados = new Map();
    for (const p of legacyPedidos) {
      const match = links.get(String(p.id_cliente));
      if (!match?.externalId) {
        report.totals.pedidosIgnorados++;
        report.skippedPedidos.push({ id: p.id, reason: "cliente_sem_match", cliente: p.cliente, produto: p.produto });
        continue;
      }
      if (!(Number(p.quantidade) > 0)) {
        report.totals.pedidosIgnorados++;
        report.skippedPedidos.push({ id: p.id, reason: "quantidade_invalida", cliente: p.cliente, produto: p.produto, quantidade: p.quantidade });
        continue;
      }
      if (!normalize(p.produto)) {
        report.totals.pedidosIgnorados++;
        report.skippedPedidos.push({ id: p.id, reason: "produto_vazio", cliente: p.cliente });
        continue;
      }
      const dataEntrega = dataEntregaDaSemana(p.dia_semana);
      const key = [match.externalId, dataEntrega.toISOString().slice(0, 10), tipoVenda(p.tipo_venda), normalize(p.observacoes)].join("|");
      const group = pedidosAgrupados.get(key) || {
        match,
        dataEntrega,
        tipoVenda: tipoVenda(p.tipo_venda),
        status: statusPedido(p.status),
        observacoes: p.observacoes || null,
        legacyIds: [],
        itens: [],
      };
      group.legacyIds.push(p.id);
      group.itens.push(p);
      pedidosAgrupados.set(key, group);
    }

    if (apply) {
      const migrador = await prisma.usuario.findFirst({
        where: { status: "ATIVO", perfil: { in: ["ADMIN", "GERENTE_COMERCIAL", "COMERCIAL", "VENDEDOR"] } },
        orderBy: { dataCadastro: "asc" },
      });
      for (const group of pedidosAgrupados.values()) {
        const pedido = await prisma.pedidoOperacional.create({
          data: {
            clienteId: group.match.id,
            contaAzulCustomerId: group.match.externalId,
            dataEntrega: group.dataEntrega,
            diaSemana: group.dataEntrega.getDay(),
            tipoVenda: group.tipoVenda,
            status: group.status,
            observacoes: group.observacoes,
            criadoPorId: migrador?.id,
            editadoPorId: migrador?.id,
            itens: {
              create: group.itens.map((item) => {
                const produto = produtoByKey.get(produtoKey(item.produto));
                return {
                  produtoId: produto.id,
                  produtoNome: produto.nome,
                  categoria: item.categoria || produto.categoria || null,
                  quantidade: new Prisma.Decimal(item.quantidade),
                  precoUnit: produto.precoBase,
                  observacoes: item.observacoes || null,
                };
              }),
            },
          },
        });
        await prisma.pedidoOperacionalAuditoria.create({
          data: {
            pedidoId: pedido.id,
            usuarioId: migrador?.id,
            usuarioNome: migrador?.nome || "Migração legado",
            acao: "migracao_legado",
            depois: { legacyIds: group.legacyIds },
          },
        });
      }
    }
    report.totals.pedidos = pedidosAgrupados.size;
  } finally {
    await prisma.$disconnect();
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[migracao] ${apply ? "APLICADA" : "DRY-RUN"}: ${JSON.stringify(report.totals)}`);
  console.log(`[migracao] relatório: ${reportPath}`);
  if (!apply && report.unresolvedClientes.length > 0) {
    console.log("[migracao] clientes sem match: crie um arquivo --map=legacy-map.json com { \"legacyId\": \"contaAzulCustomerId\" } e rode novamente.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
