import jwt from "jsonwebtoken";
import type { Env } from "./env";

export type AccessPayload = {
  sub: string;
  email: string;
  perfil: string;
};

export function signAccessToken(env: Env, payload: AccessPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(env: Env, payload: { sub: string }) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(env: Env, token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded !== "object" || decoded === null) throw new Error("Token inválido");
  const sub = (decoded as { sub?: string }).sub;
  const email = (decoded as { email?: string }).email;
  const perfil = (decoded as { perfil?: string }).perfil;
  if (!sub || !email || !perfil) throw new Error("Token inválido");
  return { sub, email, perfil };
}

export function verifyRefreshToken(env: Env, token: string): { sub: string } {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (typeof decoded !== "object" || decoded === null) throw new Error("Refresh inválido");
  const sub = (decoded as { sub?: string }).sub;
  if (!sub) throw new Error("Refresh inválido");
  return { sub };
}
