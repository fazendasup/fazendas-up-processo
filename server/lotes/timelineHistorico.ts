import * as db from "../db";

export type FaseTimelineKey = "germinacao" | "mudas" | "vegetativa" | "maturacao";

export type FaseTimelineItem = {
  fase: FaseTimelineKey;
  label: string;
  dataHora: string | null;
  detalhe?: string | null;
  fonte: "evento" | "transplantio" | "dataEntrada" | "lote";
};

const LABELS: Record<FaseTimelineKey, string> = {
  germinacao: "Germinação",
  mudas: "Plantio (mudas)",
  vegetativa: "Vegetativa",
  maturacao: "Maturação",
};

function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function setIfEmpty(
  map: Map<FaseTimelineKey, FaseTimelineItem>,
  fase: FaseTimelineKey,
  dataHora: Date | string | null | undefined,
  fonte: FaseTimelineItem["fonte"],
  detalhe?: string | null,
) {
  const data = iso(dataHora);
  if (!data) return;
  const cur = map.get(fase);
  if (cur?.dataHora) return;
  map.set(fase, { fase, label: LABELS[fase], dataHora: data, detalhe: detalhe ?? null, fonte });
}

function timelineFromEventos(
  eventos: Awaited<ReturnType<typeof db.getEventosByLoteId>>,
): Map<FaseTimelineKey, FaseTimelineItem> {
  const map = new Map<FaseTimelineKey, FaseTimelineItem>();
  const sorted = [...eventos].sort(
    (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
  );
  for (const ev of sorted) {
    const detalhe = [ev.origem, ev.destino].filter(Boolean).join(" → ") || ev.observacoes || null;
    if (ev.tipo === "germinacao" || ev.faseDestino === "germinacao") {
      setIfEmpty(map, "germinacao", ev.dataHora, "evento", detalhe);
      continue;
    }
    if (ev.tipo === "plantio" || ev.faseDestino === "mudas") {
      setIfEmpty(map, "mudas", ev.dataHora, "evento", detalhe);
      continue;
    }
    if (ev.tipo === "transplantio" && ev.faseDestino === "vegetativa") {
      setIfEmpty(map, "vegetativa", ev.dataHora, "evento", detalhe);
      continue;
    }
    if (ev.tipo === "transplantio" && ev.faseDestino === "maturacao") {
      setIfEmpty(map, "maturacao", ev.dataHora, "evento", detalhe);
    }
  }
  return map;
}

/**
 * Monta linha do tempo Plantio → Vegetativa → Maturação a partir dos eventos do lote
 * e, se faltar fase, completa com transplantios / dataEntrada do perfil.
 */
export async function montarTimelineHistoricoPerfil(opts: {
  projetoId: number;
  andarId: number;
  perfilIndex: number;
  loteId?: number | null;
  eventos?: Awaited<ReturnType<typeof db.getEventosByLoteId>>;
  lote?: Awaited<ReturnType<typeof db.getLoteById>>;
}): Promise<FaseTimelineItem[]> {
  const { projetoId, andarId, perfilIndex } = opts;

  const eventos =
    opts.eventos ??
    (opts.loteId ? await db.getEventosByLoteId(projetoId, opts.loteId) : []);
  const map = timelineFromEventos(eventos);

  if (opts.lote?.dataInicio) {
    setIfEmpty(map, "mudas", opts.lote.dataInicio, "lote", "Data início do lote");
  }

  const [andar, perfisAndar, torres, transplantios] = await Promise.all([
    db.getAndarById(projetoId, andarId),
    db.getPerfisByAndarId(projetoId, andarId),
    db.getAllTorres(projetoId),
    db.getAllTransplantios(projetoId),
  ]);
  const perfil = perfisAndar.find((p) => p.perfilIndex === perfilIndex);
  const torre = andar ? torres.find((t) => t.id === andar.torreId) : null;
  const variedadeId = perfil?.variedadeId ?? opts.lote?.variedadeId ?? null;

  if (variedadeId != null) {
    const txDestino = transplantios
      .filter(
        (t) =>
          t.andarDestinoId === andarId &&
          t.variedadeId === variedadeId &&
          (t.faseDestino === "vegetativa" || t.faseDestino === "maturacao"),
      )
      .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    for (const t of txDestino) {
      const fase = t.faseDestino as FaseTimelineKey;
      if (fase !== "vegetativa" && fase !== "maturacao") continue;
      const origemTorre = t.torreOrigemId ? torres.find((x) => x.id === t.torreOrigemId) : null;
      const destTorre = t.torreDestinoId ? torres.find((x) => x.id === t.torreDestinoId) : null;
      setIfEmpty(
        map,
        fase,
        t.dataHora,
        "transplantio",
        `${origemTorre?.nome ?? "Origem"} → ${destTorre?.nome ?? "Destino"}`,
      );

      // Caminha para trás: se chegou em maturação, busca vegetativa na origem
      if (fase === "maturacao" && t.andarOrigemId && !map.get("vegetativa")?.dataHora) {
        const txVeg = transplantios
          .filter(
            (x) =>
              x.andarDestinoId === t.andarOrigemId &&
              x.variedadeId === variedadeId &&
              x.faseDestino === "vegetativa" &&
              new Date(x.dataHora).getTime() <= new Date(t.dataHora).getTime() + 86_400_000,
          )
          .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())[0];
        if (txVeg) {
          const oT = txVeg.torreOrigemId ? torres.find((x) => x.id === txVeg.torreOrigemId) : null;
          const dT = txVeg.torreDestinoId ? torres.find((x) => x.id === txVeg.torreDestinoId) : null;
          setIfEmpty(
            map,
            "vegetativa",
            txVeg.dataHora,
            "transplantio",
            `${oT?.nome ?? "Origem"} → ${dT?.nome ?? "Destino"}`,
          );
        }
      }
    }
  }

  // Data de entrada do perfil/andar = entrada na fase atual da torre
  const faseAtual = (torre?.fase ?? null) as FaseTimelineKey | null;
  if (faseAtual === "mudas" || faseAtual === "vegetativa" || faseAtual === "maturacao") {
    setIfEmpty(
      map,
      faseAtual,
      perfil?.dataEntrada ?? andar?.dataEntrada ?? null,
      "dataEntrada",
      torre ? `${torre.nome} · Andar ${andar?.numero ?? "?"}` : null,
    );
  }

  const order: FaseTimelineKey[] = ["germinacao", "mudas", "vegetativa", "maturacao"];
  return order.map((fase) => map.get(fase) ?? { fase, label: LABELS[fase], dataHora: null, fonte: "evento" as const });
}
