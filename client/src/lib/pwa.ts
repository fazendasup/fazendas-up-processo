const DISMISS_KEY = "fazendas-up-pwa-install-dismissed";
export const CALCULADORA_PROJETO_STORAGE_KEY = "fazendas.calculadora.projetoId";
/** Última página pública visitada — recupera ícone antigo que abria em `/` (login). */
export const PUBLIC_PWA_START_KEY = "fazendas.pwa.publicStart";
const DEFAULT_MANIFEST_HREF = "/manifest.webmanifest?v=7";
const CALCULADORA_MANIFEST_HREF = "/manifest-calculadora.webmanifest?v=7";
const TERCEIROS_MANIFEST_HREF = "/manifest-terceiros.webmanifest?v=7";

export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIos && isSafari;
}

export function wasPwaInstallDismissed(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissPwaInstallHint(): void {
  localStorage.setItem(DISMISS_KEY, "1");
}

function absUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, window.location.origin).href;
}

function getManifestLink(): HTMLLinkElement {
  return (
    document.querySelector<HTMLLinkElement>('link[rel="manifest"]') ??
    (() => {
      const el = document.createElement("link");
      el.rel = "manifest";
      document.head.appendChild(el);
      return el;
    })()
  );
}

type PublicManifestOpts = {
  name: string;
  shortName: string;
  /** Caminho canônico sem query, ex. `/calculadora` — também é o scope do PWA. */
  startPath: string;
  /** Manifest estático servido na origem (evita blob: que o Chrome ignora no install). */
  manifestHref: string;
  themeColor?: string;
};

export function rememberPublicPwaStart(path: string): void {
  try {
    const clean = path.split("?")[0] ?? path;
    if (clean === "/calculadora" || clean === "/terceiros") {
      localStorage.setItem(PUBLIC_PWA_START_KEY, clean);
    }
  } catch {
    /* ignore */
  }
}

export function recallPublicPwaStart(): "/calculadora" | "/terceiros" | null {
  try {
    const v = localStorage.getItem(PUBLIC_PWA_START_KEY);
    if (v === "/calculadora" || v === "/terceiros") return v;
    return null;
  } catch {
    return null;
  }
}

/**
 * URL de recuperação quando o ícone antigo abre em `/` → login.
 * Inclui ?projeto= se a calculadora já tiver projeto memorizado.
 */
export function publicPwaRecoveryHref(): string | null {
  const start = recallPublicPwaStart();
  if (!start) return null;
  if (start === "/calculadora") {
    const projeto = recallCalculadoraProjetoId();
    return projeto ? `/calculadora?projeto=${projeto}` : "/calculadora";
  }
  return start;
}

/**
 * Manifest estático para páginas públicas.
 * Blob manifests costumam ser ignorados no "Adicionar à tela inicial" → o browser
 * usa o manifest padrão (start_url `/`) e o app pede login.
 * Scope restrito (`/calculadora`) evita misturar com o PWA autenticado.
 */
export function applyPublicPwaManifest(opts: PublicManifestOpts): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const startPath = opts.startPath.startsWith("/")
    ? opts.startPath
    : `/${opts.startPath}`;
  const theme = opts.themeColor ?? "#059669";

  rememberPublicPwaStart(startPath);

  const link = getManifestLink();
  const prev = link.href;
  if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
  link.href = absUrl(opts.manifestHref);

  document.title = opts.name;
  const appTitle = document.querySelector(
    'meta[name="apple-mobile-web-app-title"]',
  );
  if (appTitle) appTitle.setAttribute("content", opts.shortName);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((el) => el.setAttribute("content", theme));
}

/** Volta ao manifest do sistema (start_url `/`). */
export function restoreDefaultPwaManifest(): void {
  if (typeof document === "undefined") return;
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) return;
  if (link.href.startsWith("blob:")) {
    URL.revokeObjectURL(link.href);
  }
  link.href = absUrl(DEFAULT_MANIFEST_HREF);
  const appTitle = document.querySelector(
    'meta[name="apple-mobile-web-app-title"]',
  );
  if (appTitle) appTitle.setAttribute("content", "Fazendas UP");
}

export function applyCalculadoraPublicManifest(projetoId?: number | null): void {
  if (projetoId != null && Number.isFinite(projetoId) && projetoId > 0) {
    rememberCalculadoraProjetoId(Math.floor(projetoId));
  }
  applyPublicPwaManifest({
    name: "Calculadora EC/pH — Fazendas UP",
    shortName: "Calculadora UP",
    startPath: "/calculadora",
    manifestHref: CALCULADORA_MANIFEST_HREF,
    themeColor: "#0891b2",
  });
}

export function applyTerceirosPublicManifest(): void {
  applyPublicPwaManifest({
    name: "Prestação de serviços — Fazendas UP",
    shortName: "Serviços UP",
    startPath: "/terceiros",
    manifestHref: TERCEIROS_MANIFEST_HREF,
    themeColor: "#059669",
  });
}

export function projetoIdFromSearch(search: string): number | undefined {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const raw = new URLSearchParams(q).get("projeto");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

/**
 * Em páginas públicas: manifest com start_url da própria página.
 * No restante do app: manifest padrão (abre em `/`).
 */
export function syncPwaManifestForLocation(path: string, search: string): void {
  const normalized =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

  if (normalized === "/calculadora") {
    applyCalculadoraPublicManifest(
      projetoIdFromSearch(search) ?? recallCalculadoraProjetoId(),
    );
    return;
  }
  if (normalized === "/terceiros") {
    applyTerceirosPublicManifest();
    return;
  }
  restoreDefaultPwaManifest();
}

export function rememberCalculadoraProjetoId(projetoId: number): void {
  try {
    localStorage.setItem(CALCULADORA_PROJETO_STORAGE_KEY, String(projetoId));
  } catch {
    /* ignore */
  }
}

export function recallCalculadoraProjetoId(): number | null {
  try {
    const n = Number(localStorage.getItem(CALCULADORA_PROJETO_STORAGE_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  } catch {
    return null;
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (error) {
    console.warn("[PWA] Falha ao registrar service worker:", error);
  }
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
