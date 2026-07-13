/**
 * Desliga `acumulaPedidos` em todas as regras comerciais, exceto clientes da allowlist:
 * Licco, Spoleto, Marinara, Ibis Novotel, Padoca.
 *
 * Uso:
 *   npx tsx server/run-desativar-acumulo-pedidos.ts
 *   npx tsx server/run-desativar-acumulo-pedidos.ts --apply
 */
import "dotenv/config";
import { getComercialPrisma } from "./comercial/db.js";
import {
  CLIENTES_ACUMULO_ALLOWLIST_LABELS,
  clientePodeAcumularPedidos,
} from "@shared/clientesAcumuloPedidos";

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = getComercialPrisma();

  const regras = await prisma.regraComercialCliente.findMany({
    where: { acumulaPedidos: true },
    include: {
      cliente: { select: { id: true, nome: true, externalId: true } },
    },
    orderBy: { contaAzulCustomerId: "asc" },
  });

  const manter: typeof regras = [];
  const desligar: typeof regras = [];
  for (const regra of regras) {
    const nome = regra.cliente?.nome ?? "";
    if (clientePodeAcumularPedidos(nome)) manter.push(regra);
    else desligar.push(regra);
  }

  console.log(
    JSON.stringify(
      {
        modo: apply ? "APPLY" : "DRY-RUN",
        allowlist: CLIENTES_ACUMULO_ALLOWLIST_LABELS,
        totalComAcumulo: regras.length,
        manter: manter.map((r) => ({
          contaAzulCustomerId: r.contaAzulCustomerId,
          nome: r.cliente?.nome ?? "(sem cliente vinculado)",
          diasAcumulo: r.diasAcumulo,
        })),
        desligar: desligar.map((r) => ({
          contaAzulCustomerId: r.contaAzulCustomerId,
          nome: r.cliente?.nome ?? "(sem cliente vinculado)",
          diasAcumulo: r.diasAcumulo,
        })),
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("\nDry-run apenas. Para aplicar: npx tsx server/run-desativar-acumulo-pedidos.ts --apply");
    await prisma.$disconnect();
    return;
  }

  if (desligar.length > 0) {
    const result = await prisma.regraComercialCliente.updateMany({
      where: {
        contaAzulCustomerId: { in: desligar.map((r) => r.contaAzulCustomerId) },
        acumulaPedidos: true,
      },
      data: { acumulaPedidos: false },
    });
    console.log(`Desligadas: ${result.count} regra(s).`);
  } else {
    console.log("Nenhuma regra para desligar.");
  }

  const clientesAllow = await prisma.cliente.findMany({
    where: { externalId: { not: null } },
    select: { nome: true, externalId: true },
  });
  const garantir = clientesAllow.filter(
    (c) => c.externalId && clientePodeAcumularPedidos(c.nome),
  );
  let garantidos = 0;
  for (const c of garantir) {
    await prisma.regraComercialCliente.upsert({
      where: { contaAzulCustomerId: c.externalId! },
      create: {
        contaAzulCustomerId: c.externalId!,
        acumulaPedidos: true,
        diasAcumulo: 15,
      },
      update: { acumulaPedidos: true },
    });
    garantidos += 1;
  }
  console.log(`Allowlist garantida com acumulo=true: ${garantidos} cliente(s).`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
