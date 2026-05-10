import bcrypt from "bcryptjs";
import * as db from "./db";

/** Predefinições — sobrescreva com BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD no painel (Railway). */
const DEFAULT_EMAIL = "comercial@visioneer.com.br";
const DEFAULT_PASSWORD = "Fup@2026";

export async function ensureBootstrapAdmin(): Promise<void> {
  try {
    const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
    const password = (process.env.BOOTSTRAP_ADMIN_PASSWORD ?? DEFAULT_PASSWORD).trim();
    const forcePasswordReset = process.env.BOOTSTRAP_FORCE_PASSWORD_RESET === "1";

    if (!email || !password) {
      console.warn("[Bootstrap] Email ou senha de bootstrap vazios; ignorando.");
      return;
    }

    const existing = await db.getUserByEmail(email);
    const hash = await bcrypt.hash(password, 10);

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

    if (!existing.passwordHash) {
      await db.updateUserPassword(existing.id, hash);
      await db.updateUserRole(existing.id, "platform_admin");
      console.log(`[Bootstrap] Senha e perfil admin definidos para: ${email}`);
      return;
    }

    if (forcePasswordReset) {
      await db.updateUserPassword(existing.id, hash);
      await db.updateUserRole(existing.id, "platform_admin");
      console.warn(
        `[Bootstrap] BOOTSTRAP_FORCE_PASSWORD_RESET=1 — senha de ${email} foi redefinida. Remova esta variável após entrar.`,
      );
      return;
    }

    if (existing.role !== "platform_admin") {
      await db.updateUserRole(existing.id, "platform_admin");
      console.log(`[Bootstrap] Papel platform_admin garantido para: ${email}`);
    }
  } catch (e) {
    console.warn("[Bootstrap] Falha ao garantir admin inicial (verifique o banco):", e);
  }
}
