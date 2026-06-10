export type LatLng = { lat: number; lng: number };

const geocodeCache = new Map<string, LatLng | null>();
const FETCH_TIMEOUT_MS = 10_000;

function withTimeout(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

export function gerarVariantesEndereco(endereco: string): string[] {
  const base = endereco.trim();
  if (!base) return [];

  const variantes: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    variantes.push(normalized);
  };

  const withCity = (value: string) => `${value}, Manaus, AM, Brasil`;

  add(base);
  add(withCity(base));

  const fixed = base
    .replace(/\bSHOPING\b/gi, "Shopping")
    .replace(/\bYPIRANGA\b/gi, "Ypiranga");
  add(fixed);
  add(withCity(fixed));

  const semLoja = fixed
    .replace(/,?\s*\bL(?:OJA)?\.?\s*\d+\w*\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();
  add(semLoja);
  add(withCity(semLoja));

  const mallMatch = fixed.match(
    /\b(manauara\s+shop(?:p)?ing|shopping\s+[\w\s]+|[\w\s]+\s+shopping)\b/gi,
  );
  if (mallMatch) {
    for (const match of mallMatch) {
      add(match);
      add(withCity(match));
    }
  }

  const parts = fixed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    add(`${parts[0]}, ${parts[1]}`);
    add(withCity(`${parts[0]}, ${parts[1]}`));
  }
  if (parts[0]) {
    add(withCity(parts[0]));
  }

  return variantes;
}

async function geocodeGoogleServer(query: string): Promise<LatLng | null> {
  const response = await withTimeout(`/api/geocode?${new URLSearchParams({ address: query })}`);
  if (response.status === 404) return null;
  if (!response.ok) return null;
  const data = (await response.json()) as { lat?: number; lng?: number };
  if (typeof data.lat !== "number" || typeof data.lng !== "number") return null;
  return { lat: data.lat, lng: data.lng };
}

async function geocodePhoton(query: string): Promise<LatLng | null> {
  const response = await withTimeout(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=pt`,
  );
  if (!response.ok) return null;
  const data = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
  };
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords) return null;
  return { lng: coords[0], lat: coords[1] };
}

async function geocodeNominatim(query: string): Promise<LatLng | null> {
  const response = await withTimeout(
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
  if (!response.ok) return null;
  const data = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const hit = data[0];
  if (!hit?.lat || !hit.lon) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function geocodeVariante(query: string): Promise<LatLng | null> {
  const providers = [geocodeGoogleServer, geocodePhoton, geocodeNominatim];
  for (const provider of providers) {
    try {
      const result = await provider(query);
      if (result) return result;
    } catch {
      // Tenta o próximo provedor.
    }
  }
  return null;
}

export async function buscarRotaOsrm(pontos: LatLng[]): Promise<LatLng[]> {
  if (pontos.length < 2) return [];

  try {
    const coords = pontos.map((ponto) => `${ponto.lng},${ponto.lat}`).join(";");
    const response = await withTimeout(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
    );
    if (!response.ok) return [];
    const data = (await response.json()) as {
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
    };
    const coordinates = data.routes?.[0]?.geometry?.coordinates ?? [];
    return coordinates.map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return [];
  }
}

export async function geocodificarEndereco(endereco: string): Promise<LatLng | null> {
  const cacheKey = endereco.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  const variantes = gerarVariantesEndereco(endereco);
  for (const variante of variantes) {
    const result = await geocodeVariante(variante);
    if (result) {
      geocodeCache.set(cacheKey, result);
      return result;
    }
  }

  geocodeCache.set(cacheKey, null);
  return null;
}
