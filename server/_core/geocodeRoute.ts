import type { Express } from "express";
import { ENV } from "./env";

type GeocodeResult = { lat: number; lng: number };

async function geocodeGoogle(address: string): Promise<GeocodeResult | null> {
  const key = ENV.googleMapsApiKey;
  if (!key) return null;

  const params = new URLSearchParams({
    address,
    key,
    region: "br",
  });
  params.append("components", "country:BR");

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) return null;

  const data = (await response.json()) as {
    status?: string;
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  };
  if (data.status !== "OK") return null;

  const location = data.results?.[0]?.geometry?.location;
  if (typeof location?.lat !== "number" || typeof location?.lng !== "number") return null;

  return { lat: location.lat, lng: location.lng };
}

export function registerGeocodeRoute(app: Express) {
  app.get("/api/geocode", async (req, res) => {
    const address = String(req.query.address ?? "").trim();
    if (!address || address.length > 500) {
      res.status(400).json({ error: "Endereço inválido" });
      return;
    }

    res.setHeader("Cache-Control", "private, max-age=3600");

    try {
      const result = await geocodeGoogle(address);
      if (!result) {
        res.status(404).json({ error: "Endereço não encontrado" });
        return;
      }
      res.json(result);
    } catch {
      res.status(502).json({ error: "Falha ao geocodificar" });
    }
  });
}
