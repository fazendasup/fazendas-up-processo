import bcrypt from "bcryptjs";
import * as db from "./db";

/** Mesmas credenciais documentadas no README — criadas só se não houver usuário com senha. */
const EMAIL = "comercial@visioneer.com.br";
const PASSWORD = "Fup@2026";

export async function ensureBootstrapAdmin(): Promise<void> {
  try {
    const existing = await db.getUserByEmail(EMAIL.toLowerCase());
    const hash = await bcrypt.hash(PASSWORD, 10);

    if (!existing) {
      await db.createUserWithPassword({
        name: "Administrador",
        email: EMAIL,
        passwordHash: hash,
        role: "platform_admin",
      });
      console.log(`[Bootstrap] Admin criado: ${EMAIL}`);
      return;
    }

    if (!existing.passwordHash) {
      await db.updateUserPassword(existing.id, hash);
      await db.updateUserRole(existing.id, "platform_admin");
      console.log(`[Bootstrap] Senha e perfil admin definidos para: ${EMAIL}`);
      return;
    }

    if (existing.role !== "platform_admin") {
      await db.updateUserRole(existing.id, "platform_admin");
      console.log(`[Bootstrap] Papel platform_admin garantido para: ${EMAIL}`);
    }
  } catch (e) {
    console.warn("[Bootstrap] Falha ao garantir admin inicial (verifique o banco):", e);
  }
}
