declare global {
  interface Window {
    __FAZENDAS_UP_PUBLIC_CONFIG__?: {
      googleMapsApiKey?: string;
    };
  }
}

export function googleMapsApiKey(): string {
  const fromRuntime = window.__FAZENDAS_UP_PUBLIC_CONFIG__?.googleMapsApiKey?.trim();
  if (fromRuntime) return fromRuntime;
  return String(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ??
      import.meta.env.VITE_FRONTEND_FORGE_API_KEY ??
      "",
  ).trim();
}
