import type { LatLng } from "@shared/comercial/geocoding-endereco";
import { geocodificarEnderecoServidor, resolverOrigemEntrega } from "./geocodificar-endereco";

export type ParadaParaOtimizar = {
  contaAzulCustomerId: string;
  clienteId?: string | null;
  clienteNome?: string | null;
  endereco: string | null;
  prioridade: number;
  periodoEntrega?: string | null;
};

type PontoGeocodificado = {
  parada: ParadaParaOtimizar;
  lat: number;
  lng: number;
};

const OSRM_TIMEOUT_MS = 15_000;

export function distanciaHaversineMetros(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bucketPeriodoEntrega(periodo: string | null | undefined): number {
  if (periodo === "MANHA") return 0;
  if (periodo === "TARDE") return 1;
  return 2;
}

function compararParadas(a: ParadaParaOtimizar, b: ParadaParaOtimizar): number {
  if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
  return (a.clienteNome ?? "").localeCompare(b.clienteNome ?? "", "pt-BR");
}

export function otimizarNearestNeighbor(
  origem: LatLng,
  pontos: Array<{ idx: number; lat: number; lng: number }>,
): number[] {
  const rest = [...pontos];
  const ordem: number[] = [];
  let atual = origem;

  while (rest.length > 0) {
    rest.sort(
      (a, b) =>
        distanciaHaversineMetros(atual, a) - distanciaHaversineMetros(atual, b),
    );
    const prox = rest.shift()!;
    ordem.push(prox.idx);
    atual = { lat: prox.lat, lng: prox.lng };
  }

  return ordem;
}

export async function otimizarOrdemOsrm(
  origem: LatLng,
  pontos: Array<{ idx: number; lat: number; lng: number }>,
): Promise<number[] | null> {
  if (pontos.length === 0) return [];
  if (pontos.length === 1) return [pontos[0]!.idx];

  const coords = [
    `${origem.lng},${origem.lat}`,
    ...pontos.map((p) => `${p.lng},${p.lat}`),
  ].join(";");

  try {
    const response = await fetch(
      `https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&destination=any`,
      { signal: AbortSignal.timeout(OSRM_TIMEOUT_MS) },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      code?: string;
      waypoints?: Array<{ waypoint_index: number }>;
    };
    if (data.code !== "Ok" || !Array.isArray(data.waypoints)) return null;

    return data.waypoints
      .map((wp, inputIndex) => ({
        inputIndex,
        tripIndex: wp.waypoint_index,
      }))
      .filter((item) => item.inputIndex > 0)
      .sort((a, b) => a.tripIndex - b.tripIndex)
      .map((item) => pontos[item.inputIndex - 1]!.idx);
  } catch {
    return null;
  }
}

async function otimizarBucket(
  origemAtual: LatLng,
  bucket: ParadaParaOtimizar[],
): Promise<{ paradas: ParadaParaOtimizar[]; origemAtual: LatLng }> {
  const ordenadasPrioridade = [...bucket].sort(compararParadas);
  const geocodificadas: PontoGeocodificado[] = [];
  const semCoordenadas: ParadaParaOtimizar[] = [];

  for (const parada of ordenadasPrioridade) {
    if (!parada.endereco?.trim()) {
      semCoordenadas.push(parada);
      continue;
    }
    const coords = await geocodificarEnderecoServidor(parada.endereco);
    if (coords) {
      geocodificadas.push({ parada, lat: coords.lat, lng: coords.lng });
    } else {
      semCoordenadas.push(parada);
    }
  }

  const resultado: ParadaParaOtimizar[] = [];
  let origem = origemAtual;

  if (geocodificadas.length >= 2) {
    const pontos = geocodificadas.map((item, idx) => ({
      idx,
      lat: item.lat,
      lng: item.lng,
    }));
    const ordemIndices =
      (await otimizarOrdemOsrm(origem, pontos)) ??
      otimizarNearestNeighbor(origem, pontos);

    for (const idx of ordemIndices) {
      const item = geocodificadas[idx]!;
      resultado.push(item.parada);
      origem = { lat: item.lat, lng: item.lng };
    }
  } else if (geocodificadas.length === 1) {
    const item = geocodificadas[0]!;
    resultado.push(item.parada);
    origem = { lat: item.lat, lng: item.lng };
  }

  resultado.push(...semCoordenadas.sort(compararParadas));
  return { paradas: resultado, origemAtual: origem };
}

export async function ordenarParadasOtimizadas(
  paradas: ParadaParaOtimizar[],
  opts?: { origem?: LatLng },
): Promise<ParadaParaOtimizar[]> {
  if (paradas.length <= 1) return paradas;

  const buckets: ParadaParaOtimizar[][] = [[], [], []];
  for (const parada of paradas) {
    buckets[bucketPeriodoEntrega(parada.periodoEntrega)]!.push(parada);
  }

  let origemAtual = opts?.origem ?? (await resolverOrigemEntrega());
  const resultado: ParadaParaOtimizar[] = [];

  for (const bucket of buckets) {
    if (bucket.length === 0) continue;
    const otimizado = await otimizarBucket(origemAtual, bucket);
    resultado.push(...otimizado.paradas);
    origemAtual = otimizado.origemAtual;
  }

  return resultado;
}
