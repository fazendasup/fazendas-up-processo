import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secureFromProxy = isSecureRequest(req);
  const isProd = process.env.NODE_ENV === "production";
  /**
   * Na Railway o pedido ao Node costuma ser HTTP com `x-forwarded-proto: https`.
   * Se esse header falhar, `secure` ficaria false e o browser em https://***.railway.app pode **não guardar** o cookie de sessão.
   * Em produção assumimos cookie seguro; desligue só com `SESSION_COOKIE_SECURE=0` (casos raros).
   */
  const secure =
    process.env.SESSION_COOKIE_SECURE === "0"
      ? false
      : secureFromProxy || isProd;
  /**
   * Mesmo em HTTPS, `SameSite=Lax` costuma ser o certo quando o browser fala com a **mesma origem**
   * (`fazendas-up-processo.railway.app` → `/api/trpc`). `None` só é necessário em fluxos cross-site (OAuth noutro domínio).
   * `None` + `Secure` às vezes é bloqueado ou mal gravado em contextos same-origin.
   */
  const sameSite =
    process.env.SESSION_COOKIE_SAMESITE === "none"
      ? ("none" as const)
      : process.env.SESSION_COOKIE_SAMESITE === "strict"
        ? ("strict" as const)
        : ("lax" as const);
  const effectiveSecure = sameSite === "none" ? true : secure;
  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure: effectiveSecure,
  };
}
