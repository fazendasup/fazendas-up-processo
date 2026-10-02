import protocolo from "../../../docs/erp/ciclo_fases_14d_quimicos.json";

export type VarianteTanque = "310" | "500";
export type FaseProtocoloId = "mudas" | "vegetativa" | "maturacao";

export const protocoloFases14d = protocolo;

export const DIAS_DA_FASE = Array.from({ length: protocolo.faseDias }, (_, dia) => dia);

export function dosesDaVariante(variante: VarianteTanque) {
  const doses = protocolo.variantes[variante];
  if (!doses) throw new Error(`Variante de tanque ausente no protocolo: ${variante}`);
  return doses;
}

export function faseDoProtocolo(id: FaseProtocoloId) {
  const fase = protocolo.fases.find((item) => item.id === id);
  if (!fase) throw new Error(`Fase ausente no protocolo: ${id}`);
  return fase;
}

export type CaldaFoliarId = "A" | "B";

export function protocoloFoliar() {
  return protocolo.foliar;
}

export function caldaFoliar(id: CaldaFoliarId) {
  const calda = protocolo.foliar.caldas.find((item) => item.id === id);
  if (!calda) throw new Error(`Calda foliar ausente: ${id}`);
  if (calda.dosagemAgenda.length > 128) {
    throw new Error(`Dosagem da ${calda.nome} passa de 128 caracteres.`);
  }
  return calda;
}

export function caldaDoNome(nome: string): CaldaFoliarId | null {
  const normalizado = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (normalizado.startsWith("calda a")) return "A";
  if (normalizado.startsWith("calda b")) return "B";
  return null;
}

export function diasSemanaDaFrequencia(
  frequencia: string,
  diasSemana?: number[] | null,
): number[] {
  if (frequencia === "diaria") return [0, 1, 2, 3, 4, 5, 6];
  if (frequencia === "semanal") return diasSemana ?? [];
  return [];
}

/** Calda A e Calda B não podem cair no mesmo dia da semana. */
export function caldasNoMesmoDia(
  ciclos: Array<{
    id: string;
    nome: string;
    ativo: boolean;
    frequencia: string;
    diasSemana?: number[] | null;
  }>,
  atual: {
    id?: string | null;
    nome: string;
    frequencia: string;
    diasSemana: number[];
  },
): boolean {
  const calda = caldaDoNome(atual.nome);
  if (!calda) return false;
  const dias = new Set(diasSemanaDaFrequencia(atual.frequencia, atual.diasSemana));
  if (dias.size === 0) return false;
  const outra: CaldaFoliarId = calda === "A" ? "B" : "A";
  return ciclos.some((ciclo) => {
    if (!ciclo.ativo || ciclo.id === atual.id) return false;
    if (caldaDoNome(ciclo.nome) !== outra) return false;
    return diasSemanaDaFrequencia(ciclo.frequencia, ciclo.diasSemana).some((dia) =>
      dias.has(dia),
    );
  });
}

export type ProdutoSolucaoId = "koh" | "peroxido" | "bio" | "infinito" | "cercobin";

export type CartaoSolucao = {
  id: ProdutoSolucaoId;
  nome: string;
  produto: string;
  frequencia: "diaria" | "personalizada" | "quinzenal";
  intervaloDias?: number;
  frequenciaLabel: string;
  fases: FaseProtocoloId[];
  linhas: Array<{ rotulo: string; valor: string }>;
  notas: string[];
  aviso: string;
  dosagemAgenda: string;
};

const FASES_TODAS: FaseProtocoloId[] = ["mudas", "vegetativa", "maturacao"];
const FASES_SISTEMICO: FaseProtocoloId[] = ["vegetativa", "maturacao"];

function notasDoProduto(trecho: string): string[] {
  const alvo = trecho.toLowerCase();
  return protocolo.fases.flatMap((fase) =>
    fase.agenda
      .filter((item) => item.toLowerCase().includes(alvo))
      .map((item) => `${fase.label}: ${item}`),
  );
}

/** Cartões da solução, com a dose de cada tanque vinda do protocolo. */
export function cartoesSolucao(): CartaoSolucao[] {
  const tanque310 = dosesDaVariante("310");
  const tanque500 = dosesDaVariante("500");
  return [
    {
      id: "koh",
      nome: "KOH",
      produto: "KOH",
      frequencia: "diaria",
      frequenciaLabel: protocolo.koh.rotina,
      fases: FASES_TODAS,
      linhas: [
        { rotulo: "Estoque", valor: protocolo.koh.estoque },
        { rotulo: "pH", valor: protocolo.ph },
      ],
      notas: [],
      aviso: `${protocolo.koh.aviso} ${protocolo.koh.esperaMinutos}.`,
      dosagemAgenda: `Estoque ${protocolo.koh.estoque}. Até pH ${protocolo.ph}.`,
    },
    {
      id: "peroxido",
      nome: "Peróxido",
      produto: protocolo.h2o2.produto,
      frequencia: "personalizada",
      intervaloDias: 2,
      frequenciaLabel: protocolo.h2o2.rotina,
      fases: FASES_TODAS,
      linhas: [
        { rotulo: "310 L", valor: tanque310.h2o2 },
        { rotulo: "500 L", valor: tanque500.h2o2 },
      ],
      notas: [],
      aviso: "Nesse dia não entra Infinito, Cercobin nem bio.",
      dosagemAgenda: `310 L: ${tanque310.h2o2}. 500 L: ${tanque500.h2o2}.`,
    },
    {
      id: "bio",
      nome: "Bio",
      produto: "Bio",
      frequencia: "personalizada",
      intervaloDias: 2,
      frequenciaLabel: "Nos dias sem peróxido.",
      fases: FASES_TODAS,
      linhas: [
        { rotulo: "310 L", valor: tanque310.bio },
        { rotulo: "500 L", valor: tanque500.bio },
      ],
      notas: [],
      aviso: `${protocolo.bioNota}. Bio nos dias sem H₂O₂.`,
      dosagemAgenda: `310 L: ${tanque310.bio}. 500 L: ${tanque500.bio}. Dias sem peróxido.`,
    },
    {
      id: "infinito",
      nome: "Infinito",
      produto: "Infinito",
      frequencia: "quinzenal",
      frequenciaLabel: "No máximo 1 por fase de 14 dias. Nunca em Mudas.",
      fases: FASES_SISTEMICO,
      linhas: [
        { rotulo: "310 L", valor: tanque310.infinito },
        { rotulo: "500 L", valor: tanque500.infinito },
      ],
      notas: notasDoProduto("Infinito"),
      aviso: "Infinito com menos de 12 h após H₂O₂. Preferir 24 h.",
      dosagemAgenda: `310 L: ${tanque310.infinito}. 500 L: ${tanque500.infinito}. Máx. 1 por fase.`,
    },
    {
      id: "cercobin",
      nome: "Cercobin",
      produto: "Cercobin",
      frequencia: "quinzenal",
      frequenciaLabel: "No máximo 1 por fase de 14 dias. Nunca em Mudas.",
      fases: FASES_SISTEMICO,
      linhas: [
        { rotulo: "310 L", valor: tanque310.cercobin },
        { rotulo: "500 L", valor: tanque500.cercobin },
      ],
      notas: notasDoProduto("Cercobin"),
      aviso: "Pelo menos 3 dias depois do Infinito, em dia sem H₂O₂.",
      dosagemAgenda: `310 L: ${tanque310.cercobin}. 500 L: ${tanque500.cercobin}. Máx. 1 por fase.`,
    },
  ];
}

export function cartaoSolucao(id: ProdutoSolucaoId): CartaoSolucao {
  const cartao = cartoesSolucao().find((item) => item.id === id);
  if (!cartao) throw new Error(`Produto da solução ausente: ${id}`);
  if (cartao.dosagemAgenda.length > 128) {
    throw new Error(`Dosagem de ${cartao.nome} passa de 128 caracteres.`);
  }
  return cartao;
}

export function produtoSolucaoDoNome(nome: string): ProdutoSolucaoId | null {
  const normalizado = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (!normalizado || normalizado.includes("biozenith") || normalizado.startsWith("calda ")) {
    return null;
  }
  if (normalizado.includes("cercobin")) return "cercobin";
  if (normalizado.includes("infinito")) return "infinito";
  if (
    normalizado.includes("peroxido") ||
    normalizado.includes("h2o2") ||
    normalizado.includes("h₂o₂")
  ) {
    return "peroxido";
  }
  if (/\bkoh\b/.test(normalizado) || normalizado.includes("hidroxido")) return "koh";
  if (normalizado === "bio" || normalizado.startsWith("bio ") || normalizado.startsWith("bio,")) {
    return "bio";
  }
  return null;
}

type CicloRegraSolucao = {
  id: string;
  nome: string;
  produto?: string | null;
  ativo: boolean;
  frequencia: string;
  diasSemana?: number[] | null;
  intervaloDias?: number | null;
  dataInicio?: string | null;
  fasesAplicaveis?: string[] | null;
};

const MESMO_DIA: Array<[ProdutoSolucaoId, ProdutoSolucaoId, string]> = [
  ["peroxido", "infinito", "Infinito com menos de 12 h após H₂O₂. Preferir 24 h."],
  ["peroxido", "cercobin", "Cercobin no mesmo dia de H₂O₂ ou de Infinito."],
  ["peroxido", "bio", "Bio nos dias sem H₂O₂."],
  ["infinito", "cercobin", "Cercobin no mesmo dia de H₂O₂ ou de Infinito."],
  ["cercobin", "bio", "Cercobin e bio ficam em dias diferentes."],
  ["infinito", "bio", "Infinito e bio: preferir dias diferentes."],
];

function inicioYmd(valor?: string | null): string | null {
  if (!valor) return null;
  const prefixo = valor.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(prefixo) ? prefixo : null;
}

function somarDias(ymd: string, dias: number): string {
  const [ano, mes, dia] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(ano, mes - 1, dia + dias));
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${utc.getUTCFullYear()}-${mm}-${dd}`;
}

function diaDaSemana(ymd: string): number {
  const [ano, mes, dia] = ymd.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

function diferenca(ymdInicio: string, ymdFim: string): number {
  const [ano1, mes1, dia1] = ymdInicio.split("-").map(Number);
  const [ano2, mes2, dia2] = ymdFim.split("-").map(Number);
  return Math.round(
    (Date.UTC(ano2, mes2 - 1, dia2) - Date.UTC(ano1, mes1 - 1, dia1)) / 86400000,
  );
}

function cadenciaDias(frequencia: string, intervaloDias?: number | null): number | null {
  if (frequencia === "diaria") return 1;
  if (frequencia === "semanal") return 7;
  if (frequencia === "quinzenal") return 14;
  if (frequencia === "mensal") return 30;
  if (frequencia === "personalizada" && intervaloDias && intervaloDias > 0) return intervaloDias;
  return null;
}

function ocorrencias(
  ciclo: {
    frequencia: string;
    diasSemana?: number[] | null;
    intervaloDias?: number | null;
    dataInicio?: string | null;
  },
  horizonte = 42,
): string[] {
  const inicio = inicioYmd(ciclo.dataInicio);
  if (!inicio) return [];
  if (ciclo.frequencia === "semanal") {
    const dias = new Set(ciclo.diasSemana ?? []);
    if (dias.size === 0) return [];
    const datas: string[] = [];
    for (let i = 0; i < horizonte; i++) {
      const ymd = somarDias(inicio, i);
      if (dias.has(diaDaSemana(ymd))) datas.push(ymd);
    }
    return datas;
  }
  const passo = cadenciaDias(ciclo.frequencia, ciclo.intervaloDias);
  if (!passo) return [];
  const datas: string[] = [];
  for (let dia = 0; dia < horizonte; dia += passo) datas.push(somarDias(inicio, dia));
  return datas;
}

function mensagemMesmoDia(a: ProdutoSolucaoId, b: ProdutoSolucaoId): string | null {
  const par = MESMO_DIA.find(
    ([esquerda, direita]) =>
      (esquerda === a && direita === b) || (esquerda === b && direita === a),
  );
  return par?.[2] ?? null;
}

/** Recusa o que o protocolo preventivo proíbe ao agendar a solução. */
export function mensagemRegraSolucao(
  ciclos: CicloRegraSolucao[],
  atual: CicloRegraSolucao,
): string | null {
  const produto =
    produtoSolucaoDoNome(atual.nome) ??
    (atual.produto ? produtoSolucaoDoNome(atual.produto) : null);
  if (!produto) return null;

  const fases = atual.fasesAplicaveis ?? [];
  if ((produto === "infinito" || produto === "cercobin") && fases.includes("mudas")) {
    return "Infinito e Cercobin bloqueados na fase Mudas.";
  }

  if (produto === "infinito" || produto === "cercobin") {
    const cadencia = cadenciaDias(atual.frequencia, atual.intervaloDias);
    if (cadencia != null && cadencia < 10) {
      return produto === "infinito"
        ? "Infinito com menos de 10 dias desde o último Infinito."
        : "Cercobin com menos de 10 dias desde o último. Preferir 14 dias.";
    }
  }

  const datasAtuais = new Set(ocorrencias(atual));
  if (datasAtuais.size === 0) return null;

  for (const ciclo of ciclos) {
    if (!ciclo.ativo || ciclo.id === atual.id) continue;
    const outro =
      produtoSolucaoDoNome(ciclo.nome) ??
      (ciclo.produto ? produtoSolucaoDoNome(ciclo.produto) : null);
    if (!outro || outro === produto) continue;
    const datasOutro = ocorrencias(ciclo);
    const mesmoDia = mensagemMesmoDia(produto, outro);
    if (mesmoDia && datasOutro.some((data) => datasAtuais.has(data))) return mesmoDia;

    const infinito = produto === "infinito" ? datasAtuais : outro === "infinito" ? new Set(datasOutro) : null;
    const cercobin = produto === "cercobin" ? datasAtuais : outro === "cercobin" ? new Set(datasOutro) : null;
    if (infinito && cercobin) {
      for (const diaInfinito of infinito) {
        for (const diaCercobin of cercobin) {
          const depois = diferenca(diaInfinito, diaCercobin);
          if (depois >= 0 && depois < 3) {
            return "Cercobin pelo menos 3 dias depois do Infinito.";
          }
        }
      }
    }
  }

  return null;
}

export function rotulosNoDia(faseId: FaseProtocoloId, dia: number): string[] {
  return faseDoProtocolo(faseId)
    .janelas.filter((janela) => !("alternativa" in janela && janela.alternativa) && dia >= janela.de && dia <= janela.ate)
    .map((janela) => janela.rotulo);
}
