import { createHash } from "crypto";

/** Versão do stub/heurística — substituir quando integrar ONNX/Python. */
export const VISION_MODEL_VERSION = "stub-v1";

export type VisionCategoria =
  | "saude_vegetativo"
  | "possivel_atraso_fenologico"
  | "possivel_doenca_foliar"
  | "possivel_praga"
  | "deficiencia_nutricional"
  | "estresse_hidrico"
  | "anomalia_iluminacao"
  | "irreconhecivel";

export interface VisionDeteccao {
  categoria: VisionCategoria;
  confianca: number;
  descricao: string;
  sugestoes: string[];
}

export interface VisionResultado {
  modeloVersao: string;
  sumario: string;
  deteccoes: VisionDeteccao[];
  metricasDerivadas?: {
    luminosidadeMedia?: number;
    saturacaoVerde?: number;
    entropiaBytes?: number;
  };
  /** Metadados para auditoria — não substituem laudo agronômico. */
  avisoLegal?: string;
}

function byteEntropy(buf: Buffer): number {
  const counts = new Uint32Array(256);
  for (let i = 0; i < buf.length; i++) counts[buf[i]]++;
  let h = 0;
  const n = buf.length;
  for (let i = 0; i < 256; i++) {
    const c = counts[i];
    if (c === 0) continue;
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return Math.round(h * 1000) / 1000;
}

function pseudoScore(seed: number, mod: number): number {
  const x = ((seed % mod) + mod) % mod;
  return Math.round((0.45 + (x / mod) * 0.48) * 100) / 100;
}

/**
 * Motor determinístico por hash/tamanho — útil para desenvolvimento e testes.
 * Substituir por inferência real (TensorFlow.js, ONNX, serviço Python, API cloud).
 */
export function analyzeImageBuffer(buf: Buffer, mimeType: string): VisionResultado {
  const sha = createHash("sha256").update(buf).digest("hex");
  const n = buf.length;
  const s0 = parseInt(sha.slice(0, 8), 16) >>> 0;
  const s1 = parseInt(sha.slice(8, 16), 16) >>> 0;
  const s2 = parseInt(sha.slice(16, 24), 16) >>> 0;
  const ent = byteEntropy(buf.slice(0, Math.min(buf.length, 4096)));

  const luminosidadeMedia = Math.round(((s0 % 1000) / 1000) * 255);
  const saturacaoVerde = Math.round(((s1 % 1000) / 1000) * 100);

  const categorias: VisionCategoria[] = [
    "saude_vegetativo",
    "possivel_atraso_fenologico",
    "possivel_doenca_foliar",
    "possivel_praga",
    "deficiencia_nutricional",
    "estresse_hidrico",
    "anomalia_iluminacao",
  ];

  const pick = (i: number) => categorias[(s0 + s1 + i * 17) % categorias.length];
  const conf = (i: number) => pseudoScore(s2 + i * 997, 97);

  const deteccoes: VisionDeteccao[] = [];

  deteccoes.push({
    categoria: pick(0),
    confianca: conf(0),
    descricao:
      n < 12_000
        ? "Imagem com resolução modesta — prefira fotos mais nítidas e bem iluminadas para análises futuras."
        : "Padrões visuais analisados em modo demonstração (stub).",
    sugestoes: ["Repetir a foto com zoom na copa/folhas", "Registrar torre e variedade para contextualizar"],
  });

  if ((s1 ^ s2) % 5 === 0) {
    deteccoes.push({
      categoria: pick(1),
      confianca: conf(2),
      descricao:
        "Segundo conjunto de indícios em modo stub — correlacionar com idade do perfil e plano de plantio.",
      sugestoes: ["Comparar com fotos da mesma torre em datas anteriores"],
    });
  }

  if (ent < 4 && n > 5000) {
    deteccoes.push({
      categoria: "irreconhecivel",
      confianca: 0.35,
      descricao: "Baixa variedade de tons na imagem — pode ser solo, equipamento ou reflexo.",
      sugestoes: ["Centralizar as folhas na foto", "Evitar contra-luz forte"],
    });
  }

  const sumario =
    deteccoes.length === 1
      ? `${deteccoes[0].categoria.replace(/_/g, " ")} (simulação ${VISION_MODEL_VERSION}).`
      : `Múltiplos sinais simulados (${VISION_MODEL_VERSION}) — revisar lista abaixo.`;

  return {
    modeloVersao: VISION_MODEL_VERSION,
    sumario,
    deteccoes,
    metricasDerivadas: {
      luminosidadeMedia,
      saturacaoVerde,
      entropiaBytes: ent,
    },
    avisoLegal:
      "Resultado gerado por modelo de demonstração. Valide sempre em campo com avaliação técnica.",
  };
}
