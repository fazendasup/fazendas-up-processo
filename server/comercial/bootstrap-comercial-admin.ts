import bcrypt from "bcryptjs";
import { getComercialPrisma } from "./db";
import { resolveComercialDatabaseUrl } from "./env";

/**
 * Cria o primeiro usuário ADMIN no banco comercial se a tabela existir e estiver vazia.
 * Usa o mesmo e-mail/senha do bootstrap do ERP (`BOOTSTRAP_ADMIN_*`) para o login do supervisório funcionar.
 */
export async function ensureComercialBootstrapUsuario(): Promise<void> {
  try {
    resolveComercialDatabaseUrl();
  } catch {
    return;
  }

  const prisma = getComercialPrisma();
  const total = await prisma.usuario.count();
  if (total > 0) return;

  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "comercial@visioneer.com.br")
    .trim()
    .toLowerCase();
  const explicitPw = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
  const password = explicitPw && explicitPw.length > 0 ? explicitPw : "Fup@2026";
  const senhaHash = await bcrypt.hash(password, 12);

  await prisma.usuario.create({
    data: {
      nome: "Administrador",
      email,
      senhaHash,
      perfil: "ADMIN",
      status: "ATIVO",
    },
  });

  console.log(`[Comercial] Utilizador ADMIN inicial criado (${email}) — vinculado ao login do ERP.`);
}
