import { googleMapsApiKey } from "@/lib/publicRuntimeConfig";

declare global {
  interface Window {
    gm_authFailure?: () => void;
    __fazendasUpMapsReady?: () => void;
  }
}

let mapsLoadPromise: Promise<boolean> | null = null;
let authFailure = false;

export function mapsAuthFailed(): boolean {
  return authFailure;
}

function setupAuthFailureListener() {
  if (typeof window === "undefined") return;
  window.gm_authFailure = () => {
    authFailure = true;
    window.dispatchEvent(new CustomEvent("fazendas-maps-auth-failure"));
  };
}

export function loadGoogleMapsScript(): Promise<boolean> {
  const apiKey = googleMapsApiKey();
  if (!apiKey) return Promise.resolve(false);
  if (window.google?.maps?.Map) return Promise.resolve(true);
  if (mapsLoadPromise) return mapsLoadPromise;

  setupAuthFailureListener();

  mapsLoadPromise = new Promise<boolean>((resolve) => {
    const finish = (ok: boolean) => {
      if (!ok) mapsLoadPromise = null;
      resolve(ok);
    };

    const timeoutId = window.setTimeout(() => finish(false), 30_000);

    const onReady = () => {
      window.clearTimeout(timeoutId);
      finish(Boolean(window.google?.maps?.Map));
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-fazendas-maps-loader]");
    if (existing) {
      if (window.google?.maps?.Map) {
        window.clearTimeout(timeoutId);
        finish(true);
        return;
      }
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", () => finish(false), { once: true });
      return;
    }

    window.__fazendasUpMapsReady = () => {
      delete window.__fazendasUpMapsReady;
      onReady();
    };

    const script = document.createElement("script");
    script.dataset.fazendasMapsLoader = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=__fazendasUpMapsReady`;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      finish(false);
    };
    document.head.appendChild(script);
  });

  return mapsLoadPromise;
}

export function isMobileMapClient(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

export function buildMapsEmbedUrl(options: {
  destino: string;
  localizacao?: { latitude: number; longitude: number } | null;
}): string {
  const destino = options.destino.trim();
  const apiKey = googleMapsApiKey();
  const localizacao = options.localizacao;

  if (apiKey && localizacao) {
    const origin = `${localizacao.latitude},${localizacao.longitude}`;
    return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(apiKey)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destino)}&mode=driving`;
  }

  if (localizacao) {
    const origin = `${localizacao.latitude},${localizacao.longitude}`;
    return `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destino)}&output=embed`;
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(destino)}&output=embed`;
}

export function createMapMarker(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  title: string,
  color: string,
): google.maps.Marker {
  return new window.google.maps.Marker({
    map,
    position,
    title,
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    },
  });
}
