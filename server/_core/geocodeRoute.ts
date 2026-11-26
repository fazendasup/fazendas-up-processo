import type { Express } from "express";
import { geocodificarEnderecoServidor } from "../comercial/lib/geocodificar-endereco";

export function registerGeocodeRoute(app: Express) {
  app.get("/api/geocode", async (req, res) => {
    const address = String(req.query.address ?? "").trim();
    if (!address || address.length > 500) {
      res.status(400).json({ error: "Endereço inválido" });
      return;
    }

    res.setHeader("Cache-Control", "private, max-age=3600");

    try {
      // Google + Photon + Nominatim (servidor) — evita CORS e chave Maps incompleta no browser.
      const result = await geocodificarEnderecoServidor(address);
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
