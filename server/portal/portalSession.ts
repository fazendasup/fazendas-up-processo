import { createHash, randomBytes } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import { ENV } from "../_core/env";

export const COOKIE_CLIENTE = "fu_portal";
export const COOKIE_EQUIPE = "fu_portal_equipe";

const SESSION_DAYS = 14;
const EQUIPE_HOURS = 12;

type ClienteClaims = { typ: "cliente"; acessoId: string; clienteId: string };
type EquipeClaims = { typ: "equipe"; userId: number };

function secretKey() {
  const secret = ENV.cookieSecret;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

function serializeCookie(
  name: string,
  value: string,
  options: { httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge: number },
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  parts.push("SameSite=Lax");
  return parts.join("; ");
}

function cookieOptions(req: Request, maxAgeSec: number) {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  const localHttp = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    httpOnly: true,
    secure: !localHttp,
    sameSite: "lax" as const,
    path: "/api/portal",
    maxAge: maxAgeSec,
  };
}

function readCookie(req: Request, name: string): string | undefined {
  const parsed = parseCookieHeader(req.headers.cookie ?? "");
  const value = parsed[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function portalConfigurado(): boolean {
  return Boolean(ENV.cookieSecret);
}

export async function emitirSessaoCliente(
  req: Request,
  res: Response,
  acessoId: string,
  clienteId: string,
) {
  const key = secretKey();
  if (!key) throw new Error("JWT_SECRET ausente");
  const token = await new SignJWT({ typ: "cliente", acessoId, clienteId } satisfies ClienteClaims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key);
  res.append(
    "Set-Cookie",
    serializeCookie(COOKIE_CLIENTE, token, cookieOptions(req, SESSION_DAYS * 24 * 60 * 60)),
  );
}

export async function emitirSessaoEquipe(req: Request, res: Response, userId: number) {
  const key = secretKey();
  if (!key) throw new Error("JWT_SECRET ausente");
  const token = await new SignJWT({ typ: "equipe", userId } satisfies EquipeClaims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${EQUIPE_HOURS}h`)
    .sign(key);
  res.append(
    "Set-Cookie",
    serializeCookie(COOKIE_EQUIPE, token, cookieOptions(req, EQUIPE_HOURS * 60 * 60)),
  );
}

export function encerrarSessao(req: Request, res: Response, qual: "cliente" | "equipe") {
  const name = qual === "cliente" ? COOKIE_CLIENTE : COOKIE_EQUIPE;
  res.append("Set-Cookie", serializeCookie(name, "", cookieOptions(req, 0)));
}

async function ler<T>(token: string | undefined, typ: "cliente" | "equipe"): Promise<T | null> {
  const key = secretKey();
  if (!key || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.typ !== typ) return null;
    return payload as T;
  } catch {
    return null;
  }
}

export async function lerSessaoCliente(req: Request): Promise<ClienteClaims | null> {
  const payload = await ler<ClienteClaims>(readCookie(req, COOKIE_CLIENTE), "cliente");
  if (!payload || payload.typ !== "cliente") return null;
  if (typeof payload.acessoId !== "string" || typeof payload.clienteId !== "string") return null;
  return { typ: "cliente", acessoId: payload.acessoId, clienteId: payload.clienteId };
}

export async function lerSessaoEquipe(req: Request): Promise<EquipeClaims | null> {
  const payload = await ler<EquipeClaims>(readCookie(req, COOKIE_EQUIPE), "equipe");
  if (!payload || payload.typ !== "equipe") return null;
  const userId = Number(payload.userId);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  return { typ: "equipe", userId };
}

export function novoConviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashConvite(token) };
}

export function hashConvite(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function origemPermitida(origin: string | undefined): boolean {
  if (!origin) return true;
  const extra = (process.env.PORTAL_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowed = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://www.fazendasup.com.br",
    "https://fazendasup.com.br",
    ...extra,
  ]);
  return allowed.has(origin);
}

export function urlPublicaSite(): string {
  return (process.env.PORTAL_PUBLIC_URL ?? "https://www.fazendasup.com.br").trim().replace(/\/$/, "");
}
