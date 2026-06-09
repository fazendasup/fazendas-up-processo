import type { Express } from "express";
import { ENV } from "./env";

export function registerPublicConfigRoute(app: Express) {
  app.get("/api/public-config.js", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.type("application/javascript");
    res.send(
      `window.__FAZENDAS_UP_PUBLIC_CONFIG__=${JSON.stringify({
        googleMapsApiKey: ENV.googleMapsApiKey,
      })};`,
    );
  });
}
