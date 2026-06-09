const DISMISS_KEY = "fazendas-up-pwa-install-dismissed";

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
