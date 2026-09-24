const DISMISS_KEY = "fazendas-up-pwa-install-dismissed";
export const CALCULADORA_PROJETO_STORAGE_KEY = "fazendas.calculadora.projetoId";
const DEFAULT_MANIFEST_HREF = "/manifest.webmanifest?v=6";

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
  description: string;
  /** Caminho absoluto no site, ex. `/terceiros` ou `/calculadora?projeto=1` */
  startPath: string;
  themeColor?: string;
};

/**
 * Manifest dinâmico para páginas públicas.
 * Usa URLs absolutas: em blob, paths relativos resolvem contra `blob:` e o
 * start_url cai em `/` → tela de login.
 */
export function applyPublicPwaManifest(opts: PublicManifestOpts): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const startPath = opts.startPath.startsWith("/")
    ? opts.startPath
    : `/${opts.startPath}`;
  const theme = opts.themeColor ?? "#059669";
  const icon = (src: string, sizes: string, purpose: string) => ({
    src: absUrl(src),
    sizes,
    type: src.endsWith(".svg") ? "image/svg+xml" : "image/png",
    purpose,
  });

  const manifest = {
    name: opts.name,
    short_name: opts.shortName,
    description: opts.description,
    start_url: absUrl(startPath),
    scope: absUrl("/"),
    id: absUrl(startPath.split("?")[0] ?? startPath),
    display: "standalone",
    orientation: "any",
    background_color: "#f8fafc",
    theme_color: theme,
    lang: "pt-BR",
    categories: ["utilities", "productivity"],
    icons: [
      icon("/pwa-icon-192.png?v=6", "192x192", "any"),
      icon("/pwa-icon-512.png?v=6", "512x512", "any"),
      icon("/pwa-icon-512.png?v=6", "512x512", "maskable"),
      icon("/pwa-icon.svg?v=6", "any", "any"),
    ],
  };

  const link = getManifestLink();
  const blob = new Blob([JSON.stringify(manifest)], {
    type: "application/manifest+json",
  });
  const prev = link.href;
  if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
  link.href = URL.createObjectURL(blob);

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
  const qs =
    projetoId != null && Number.isFinite(projetoId) && projetoId > 0
      ? `?projeto=${Math.floor(projetoId)}`
      : "";
  applyPublicPwaManifest({
    name: "Calculadora EC/pH — Fazendas UP",
    shortName: "Calculadora UP",
    description: "Correção de EC e pH — ferramenta pública sem login.",
    startPath: `/calculadora${qs}`,
    themeColor: "#0891b2",
  });
}

export function applyTerceirosPublicManifest(): void {
  applyPublicPwaManifest({
    name: "Prestação de serviços — Fazendas UP",
    shortName: "Serviços UP",
    description: "Registro de horas e almoço — acesso público sem login do sistema.",
    startPath: "/terceiros",
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
