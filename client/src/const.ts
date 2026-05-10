export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Evita URL inválida / placeholders tipo %VITE_*% vindos de template mal preenchido. */
function isValidHttpUrl(s: string): boolean {
  const t = s.trim();
  if (!t || t.includes("%VITE_")) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * URL do portal OAuth (Manus/WebDev), só quando `VITE_OAUTH_PORTAL_URL` + `VITE_APP_ID` estão definidos.
 * Caso contrário redireciona para o login local por email/senha.
 */
export const getLoginUrl = (): string => {
  const oauthPortalUrl = String(
    import.meta.env.VITE_OAUTH_PORTAL_URL ?? ""
  ).trim();
  const appId = String(import.meta.env.VITE_APP_ID ?? "").trim();

  if (!isValidHttpUrl(oauthPortalUrl) || !appId) {
    return `${window.location.origin}/login`;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl.replace(/\/$/, "")}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
