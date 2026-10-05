/** Atalho de um procedimento para a página POP e FIT. */
export type BpfAtalho = {
  view: string;
  codigo: string;
  rotulo: string;
};

export function hrefBpf(view: string): string {
  return `/bpf#${view}`;
}

/**
 * Tira fotos embutidas (data URL) para o histórico não guardar dezenas de MB.
 * A versão atual no banco continua com as fotos.
 */
export function semFotosBpf<T>(value: T): T {
  if (typeof value === "string") {
    return (value.startsWith("data:") ? null : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(item => semFotosBpf(item)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = semFotosBpf(item);
    }
    return out as T;
  }
  return value;
}

function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Liga o nome do produto ou da tarefa à FIT correspondente. */
export function atalhoBpfDoTexto(
  ...trechos: Array<string | null | undefined>
): BpfAtalho | null {
  const normalizado = normalizarBusca(
    trechos.filter(parte => parte && parte.trim()).join(" "),
  );
  if (!normalizado) return null;
  if (
    normalizado.includes("peroxido") ||
    normalizado.includes("h2o2") ||
    normalizado.includes("h₂o₂")
  ) {
    return {
      view: "tr-fit3",
      codigo: "FIT-TR-004",
      rotulo: "FIT-TR-004 H₂O₂",
    };
  }
  if (
    /\bkoh\b/.test(normalizado) ||
    normalizado.includes("hidroxido") ||
    normalizado.includes("correcao de ph") ||
    normalizado.includes("correcao ph")
  ) {
    return {
      view: "tr-fit2",
      codigo: "FIT-TR-003",
      rotulo: "FIT-TR-003 Correção pH",
    };
  }
  if (
    normalizado.includes("correcao de ec") ||
    normalizado.includes("correcao ec") ||
    /\bec\b/.test(normalizado)
  ) {
    return {
      view: "tr-fit1",
      codigo: "FIT-TR-002",
      rotulo: "FIT-TR-002 Correção EC",
    };
  }
  if (normalizado.includes("transplant")) {
    return {
      view: "tr-fit5",
      codigo: "FIT-TR-006",
      rotulo: "FIT-TR-006 Transplantios",
    };
  }
  if (normalizado.includes("colheita")) {
    return {
      view: "tr-fit6",
      codigo: "FIT-TR-007",
      rotulo: "FIT-TR-007 Colheita",
    };
  }
  return null;
}
