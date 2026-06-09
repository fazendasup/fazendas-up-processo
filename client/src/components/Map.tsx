/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { googleMapsApiKey } from "@/lib/publicRuntimeConfig";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

let mapsLoadPromise: Promise<boolean> | null = null;

async function waitForMapsReady(timeoutMs = 15_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (window.google?.maps?.importLibrary) {
      try {
        await window.google.maps.importLibrary("maps");
        await Promise.all([
          window.google.maps.importLibrary("marker"),
          window.google.maps.importLibrary("geocoding"),
          window.google.maps.importLibrary("geometry"),
        ]);
        return Boolean(window.google.maps.Map);
      } catch (error) {
        console.error("Google Maps importLibrary failed", error);
        return false;
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  return false;
}

function loadMapScript() {
  const apiKey = googleMapsApiKey();
  if (!apiKey) return Promise.resolve(false);
  if (window.google?.maps?.Map) return Promise.resolve(true);
  if (mapsLoadPromise) return mapsLoadPromise;

  mapsLoadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-fazendas-maps-loader]");
    if (existing) {
      void waitForMapsReady().then((ready) => {
        if (!ready) mapsLoadPromise = null;
        resolve(ready);
      });
      return;
    }

    const script = document.createElement("script");
    script.dataset.fazendasMapsLoader = "1";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      mapsLoadPromise = null;
      resolve(false);
    };
    script.onload = () => {
      void waitForMapsReady().then((ready) => {
        if (!ready) mapsLoadPromise = null;
        resolve(ready);
      });
    };
    document.head.appendChild(script);
  });

  return mapsLoadPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const init = usePersistFn(async () => {
    const loaded = await loadMapScript();
    if (!loaded || !window.google?.maps?.Map) {
      setLoadError(
        googleMapsApiKey()
          ? "Não foi possível carregar o Google Maps. Verifique no Google Cloud: Maps JavaScript API e Geocoding API ativas, faturamento habilitado e referrer https://app.fazendasup.com.br/* liberado na chave."
          : "Google Maps não configurado. Defina GOOGLE_MAPS_API_KEY (ou VITE_FRONTEND_FORGE_API_KEY) no Railway.",
      );
      return;
    }
    if (!mapContainer.current) {
      console.error("Map container not found");
      return;
    }
    try {
      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: "DEMO_MAP_ID",
      });
      if (onMapReady) {
        onMapReady(map.current);
      }
    } catch (error) {
      console.error("Google Maps init failed", error);
      setLoadError(
        "O Google Maps carregou, mas não iniciou o mapa. Confira restrições da chave (referrer do domínio) e APIs habilitadas no Google Cloud.",
      );
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)}>
      {loadError ? (
        <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 text-center text-sm text-muted-foreground">
          {loadError}
        </div>
      ) : null}
    </div>
  );
}
