import "../src/load-env.js";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const senhaAdmin = await bcrypt.hash("Admin123456!", 12);
  const senhaComercial = await bcrypt.hash("Comercial123!", 12);

  await prisma.usuario.upsert({
    where: { email: "admin@fazendasup.local" },
    create: {
      nome: "Administrador",
      email: "admin@fazendasup.local",
      senhaHash: senhaAdmin,
      perfil: "ADMIN",
      status: "ATIVO",
    },
    update: {},
  });

  await prisma.usuario.upsert({
    where: { email: "comercial@fazendasup.local" },
    create: {
      nome: "Comercial Demo",
      email: "comercial@fazendasup.local",
      senhaHash: senhaComercial,
      perfil: "COMERCIAL",
      status: "ATIVO",
    },
    update: {},
  });

  const templates = [
    {
      nome: "Pós-venda consultivo",
      tipo: "POS_VENDA" as const,
      corpo: "Oi {{nome}}, tudo certo com a última entrega? Posso te ajudar com algo para a próxima compra?",
    },
    {
      nome: "Reativação suave",
      tipo: "REATIVACAO" as const,
      corpo: "Oi {{nome}}, sentimos sua falta! Separei opções que combinam com seu histórico de compras.",
    },
  ];

  for (const t of templates) {
    const exists = await prisma.templateMensagem.findFirst({ where: { nome: t.nome } });
    if (!exists) {
      await prisma.templateMensagem.create({ data: t });
    }
  }

  console.log("[seed] Usuários e templates OK. Dados Conta Azul vêm do sync na aplicação.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
