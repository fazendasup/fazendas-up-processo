import bcrypt from "bcryptjs";
import * as db from "./db";

/** Predefinições — sobrescreva com BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD no painel (Railway). */
const DEFAULT_EMAIL = "comercial@visioneer.com.br";
const DEFAULT_PASSWORD = "Fup@2026";

export async function ensureBootstrapAdmin(): Promise<void> {
  try {
    await db.ensureUsersRoleVarchar();

    const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();

    const explicitPwRaw = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    const explicitPasswordSet =
      typeof explicitPwRaw === "string" && explicitPwRaw.trim().length > 0;
    const password = explicitPasswordSet ? explicitPwRaw.trim() : DEFAULT_PASSWORD;

    const forcePasswordReset = process.env.BOOTSTRAP_FORCE_PASSWORD_RESET === "1";
    const isProd = process.env.NODE_ENV === "production";
    const disableProdAutoSync = process.env.BOOTSTRAP_DISABLE_ADMIN_PASSWORD_SYNC === "1";

    if (!email || !password) {
      console.warn("[Bootstrap] Email ou senha de bootstrap vazios; ignorando.");
      return;
    }

    const existing = await db.getUserByEmail(email);
    const hash = await bcrypt.hash(password, 10);

    /** Em produção, por defeito volta a aplicar a senha em cada arranque (recupera Railway sem variáveis extra). */
    const shouldOverwriteExistingPassword =
      forcePasswordReset ||
      explicitPasswordSet ||
      (isProd && !disableProdAutoSync);

    if (!existing) {
      await db.createUserWithPassword({
        name: "Administrador",
        email,
        passwordHash: hash,
        role: "platform_admin",
      });
      console.log(`[Bootstrap] Admin criado: ${email}`);
      return;
    }

    if (!existing.passwordHash || shouldOverwriteExistingPassword) {
      await db.updateUserPassword(existing.id, hash);
      await db.updateUserEmail(existing.id, email);
      await db.updateUserRole(existing.id, "platform_admin");
      console.log(`[Bootstrap] Conta ${email} (id=${existing.id}) pronta para login neste arranque.`);
      if (!existing.passwordHash) {
        console.log(`[Bootstrap] Senha e perfil admin definidos para: ${email}`);
      } else if (forcePasswordReset) {
        console.warn(
          `[Bootstrap] BOOTSTRAP_FORCE_PASSWORD_RESET=1 — senha de ${email} foi redefinida. Remova esta variável se já não precisar.`,
        );
      } else if (explicitPasswordSet) {
        console.log(`[Bootstrap] Senha sincronizada a partir de BOOTSTRAP_ADMIN_PASSWORD para: ${email}`);
      } else if (isProd && !disableProdAutoSync) {
        console.warn(
          `[Bootstrap] Produção: senha de ${email} alinhada com a pré-definição/env neste arranque. ` +
            `Depois de mudar a senha no app, defina BOOTSTRAP_DISABLE_ADMIN_PASSWORD_SYNC=1 para não voltar a sobrescrever.`,
        );
      }
      return;
    }

    if (existing.role !== "platform_admin") {
      await db.updateUserRole(existing.id, "platform_admin");
      await db.updateUserEmail(existing.id, email);
      console.log(`[Bootstrap] Papel platform_admin garantido para: ${email}`);
    }
  } catch (e) {
    console.error("[Bootstrap] Falha ao garantir admin inicial (verifique DATABASE_URL e migrações):", e);
  }
}
