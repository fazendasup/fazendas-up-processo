// Seed do usuário admin inicial: comercial@visioneer.com.br / Fup@2026
// Executar: node server/seed-admin.mjs

import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL não definida');
  process.exit(1);
}

async function seedAdmin() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  const email = 'comercial@visioneer.com.br';
  const password = 'Fup@2026';
  const name = 'Administrador';
  const role = 'admin';
  const openId = `local_${crypto.randomUUID()}`;
  
  // Verificar se já existe
  const [existing] = await connection.execute(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  
  if (existing.length > 0) {
    console.log(`Usuário ${email} já existe (id: ${existing[0].id}). Atualizando senha e role...`);
    const passwordHash = await bcrypt.hash(password, 10);
    await connection.execute(
      'UPDATE users SET passwordHash = ?, role = ?, name = ? WHERE email = ?',
      [passwordHash, role, name, email]
    );
    console.log('Senha e role atualizados com sucesso!');
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await connection.execute(
      'INSERT INTO users (openId, name, email, role, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
      [openId, name, email, role, passwordHash]
    );
    console.log(`Usuário admin criado: ${email}`);
  }
  
  await connection.end();
  console.log('Seed concluído!');
}

seedAdmin().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
