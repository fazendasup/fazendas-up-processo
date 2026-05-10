// Seed do usuário admin inicial: comercial@visioneer.com.br / Fup@2026
// Garante projeto "Fazenda Vertical Principal" e vínculo em projeto_usuarios.
// Executar: node server/seed-admin.mjs

import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida");
  process.exit(1);
}

const NOME_PROJETO_LEGADO = "Fazenda Vertical Principal";

async function ensureProjetoEVinculo(connection, userId) {
  try {
    const [prefer] = await connection.execute(
      "SELECT id FROM projetos WHERE status = 'ativo' AND nome = ? LIMIT 1",
      [NOME_PROJETO_LEGADO],
    );
    let projetoId;
    if (prefer.length) {
      projetoId = prefer[0].id;
    } else {
      const [projetosRows] = await connection.execute(
        "SELECT id FROM projetos WHERE status = 'ativo' ORDER BY id ASC LIMIT 1",
      );
      if (!projetosRows.length) {
        const [ins] = await connection.execute(
          `INSERT INTO projetos (nome, tipo, status, descricao) VALUES (?, 'fazenda_vertical', 'ativo', ?)`,
          [NOME_PROJETO_LEGADO, "Projeto original com os dados existentes do sistema."],
        );
        projetoId = ins.insertId;
        console.log(`Projeto "${NOME_PROJETO_LEGADO}" criado (id=${projetoId}).`);
      } else {
        projetoId = projetosRows[0].id;
      }
    }

    await connection.execute(
      "INSERT IGNORE INTO projeto_usuarios (projetoId, userId, role) VALUES (?, ?, 'admin')",
      [projetoId, userId],
    );
    console.log(`Utilizador id=${userId} associado ao projeto id=${projetoId} (admin).`);
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      console.warn(
        "Tabelas projetos/projeto_usuarios ainda não existem — execute a migração multi-projeto (pnpm db:migrate) e reinicie a API.",
      );
    } else {
      throw e;
    }
  }
}

async function seedAdmin() {
  const connection = await mysql.createConnection(DATABASE_URL);

  const email = "comercial@visioneer.com.br";
  const password = "Fup@2026";
  const name = "Administrador";
  const role = "platform_admin";
  const openId = `local_${crypto.randomUUID()}`;

  const [existing] = await connection.execute("SELECT id FROM users WHERE email = ?", [email]);

  let userId;
  if (existing.length > 0) {
    userId = existing[0].id;
    console.log(`Usuário ${email} já existe (id: ${userId}). Atualizando senha e role...`);
    const passwordHash = await bcrypt.hash(password, 10);
    await connection.execute(
      "UPDATE users SET passwordHash = ?, role = ?, name = ?, loginMethod = ? WHERE email = ?",
      [passwordHash, role, name, "password", email],
    );
    console.log("Senha e role atualizados com sucesso!");
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const [ins] = await connection.execute(
      `INSERT INTO users (openId, name, email, role, passwordHash, loginMethod, createdAt) VALUES (?, ?, ?, ?, ?, 'password', NOW())`,
      [openId, name, email, role, passwordHash],
    );
    userId = ins.insertId;
    console.log(`Usuário admin criado: ${email} (id=${userId})`);
  }

  await ensureProjetoEVinculo(connection, userId);

  await connection.end();
  console.log("Seed concluído!");
}

seedAdmin().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
