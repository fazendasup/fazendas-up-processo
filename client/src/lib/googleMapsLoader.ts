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

/** Embed com rota — requer Maps Embed API ativa. */
export function buildMapsDirectionsEmbedUrl(options: {
  destino: string;
  localizacao?: { latitude: number; longitude: number } | null;
}): string | null {
  const apiKey = googleMapsApiKey();
  const destino = options.destino.trim();
  const localizacao = options.localizacao;
  if (!apiKey || !localizacao) return null;

  const origin = `${localizacao.latitude},${localizacao.longitude}`;
  return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(apiKey)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destino)}&mode=driving`;
}

/** Embed simples sem API key. */
export function buildMapsSimpleEmbedUrl(options: {
  destino: string;
  localizacao?: { latitude: number; longitude: number } | null;
}): string {
  const destino = options.destino.trim();
  const localizacao = options.localizacao;

  if (localizacao) {
    const origin = `${localizacao.latitude},${localizacao.longitude}`;
    return `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destino)}&output=embed`;
  }

  return `https://maps.google.com/maps?q=${encodeURIComponent(destino)}&output=embed`;
}

/** Imagem estática — requer Maps Static API ativa. */
export function buildMapsStaticUrl(options: {
  destino: string;
  localizacao?: { latitude: number; longitude: number } | null;
  width?: number;
  height?: number;
}): string | null {
  const apiKey = googleMapsApiKey();
  if (!apiKey) return null;

  const width = options.width ?? 640;
  const height = options.height ?? 400;
  const params = new URLSearchParams({
    size: `${width}x${height}`,
    scale: "2",
    maptype: "roadmap",
    key: apiKey,
  });

  if (options.localizacao) {
    const origem = `${options.localizacao.latitude},${options.localizacao.longitude}`;
    params.append("markers", `color:0x059669|label:V|${origem}`);
  }

  params.append("markers", `color:0x2563eb|label:D|${options.destino.trim()}`);

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
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
