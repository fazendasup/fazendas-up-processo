import { gerarVariantesEndereco, type LatLng } from "@shared/comercial/geocoding-endereco";
import { ENV } from "../../_core/env";

const cache = new Map<string, LatLng | null>();
const FETCH_TIMEOUT_MS = 10_000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function geocodeGoogle(query: string): Promise<LatLng | null> {
  const key = ENV.googleMapsApiKey;
  if (!key) return null;

  const params = new URLSearchParams({
    address: query,
    key,
    region: "br",
  });
  params.append("components", "country:BR");

  const data = await fetchJson<{
    status?: string;
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  }>(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);

  if (data?.status !== "OK") return null;
  const location = data.results?.[0]?.geometry?.location;
  if (typeof location?.lat !== "number" || typeof location?.lng !== "number") return null;
  return { lat: location.lat, lng: location.lng };
}

async function geocodePhoton(query: string): Promise<LatLng | null> {
  const data = await fetchJson<{
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
  }>(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=pt`);
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (!coords) return null;
  return { lng: coords[0], lat: coords[1] };
}

async function geocodeNominatim(query: string): Promise<LatLng | null> {
  const data = await fetchJson<Array<{ lat?: string; lon?: string }>>(
    `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      countrycodes: "br",
    })}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "pt-BR",
      },
    },
  );
  const hit = data?.[0];
  if (!hit?.lat || !hit.lon) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function geocodeVariante(query: string): Promise<LatLng | null> {
  for (const provider of [geocodeGoogle, geocodePhoton, geocodeNominatim]) {
    const result = await provider(query);
    if (result) return result;
  }
  return null;
}

export async function geocodificarEnderecoServidor(endereco: string): Promise<LatLng | null> {
  const cacheKey = endereco.trim().toLowerCase();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? null;
  }

  for (const variante of gerarVariantesEndereco(endereco)) {
    const result = await geocodeVariante(variante);
    if (result) {
      cache.set(cacheKey, result);
      return result;
    }
  }

  cache.set(cacheKey, null);
  return null;
}

/** Origem padrão das rotas (Fazendas Up / Manaus). Sobrescreva via env. */
export async function resolverOrigemEntrega(): Promise<LatLng> {
  const latEnv = process.env.ENTREGA_ORIGEM_LAT?.trim();
  const lngEnv = process.env.ENTREGA_ORIGEM_LNG?.trim();
  if (latEnv && lngEnv) {
    const lat = Number(latEnv);
    const lng = Number(lngEnv);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  const endereco = process.env.ENTREGA_ORIGEM_ENDERECO?.trim();
  if (endereco) {
    const coords = await geocodificarEnderecoServidor(endereco);
    if (coords) return coords;
  }

  return { lat: -3.119, lng: -60.0217 };
}
