export const COOKIE_NAME = "app_session_id";
/** Cookie HTTP-only com o id do projeto ativo (tRPC + UI). */
export const PROJETO_ATIVO_COOKIE = "projeto_ativo_id";
/** Header enviado pelo cliente tRPC com o projeto da requisição. */
export const PROJETO_HEADER = "x-projeto-id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
/** Gestão comercial de módulos (estoque, automação, etc.) — só equipa da plataforma. */
export const NOT_PLATFORM_ADMIN_MSG =
  "Apenas a equipa da plataforma pode gerir módulos contratados (10007)";

/** Papel global na tabela `users` (auth). */
export type AppUserRole = "user" | "admin" | "platform_admin";

export function isOperationalAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "platform_admin";
}

export function isPlatformCommercialRole(role: string | null | undefined): boolean {
  return role === "platform_admin";
}
export const PROJETO_REQUIRED_ERR_MSG = 'Projeto não selecionado (10003)';
export const PROJETO_FORBIDDEN_ERR_MSG = 'Sem acesso a este projeto (10004)';
export const PROJETO_INATIVO_ERR_MSG = 'Projeto desativado (10005)';
export const PROJETO_TIPO_ERR_MSG = 'Operação não permitida para o tipo deste projeto (10006)';

/** Módulos comerciais opcionais (plataforma liga/desliga por projeto). */
export const MODULOS_CONTRATAVEIS = [
  "estoque",
  "automacao",
  "inteligencia",
  "visao_cultivo",
] as const;
export type ModuloContratavel = (typeof MODULOS_CONTRATAVEIS)[number];

export const MODULO_NAO_CONTRATADO_MSG =
  "Este módulo não está contratado para o projeto ativo. Contacte o administrador da plataforma.";

/** Nome do projeto criado na migração multi-projeto com os dados operacionais legados. */
export const NOME_PROJETO_FAZENDA_LEGADO = "Fazenda Vertical Principal";
