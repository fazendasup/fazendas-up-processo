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

export function rotulosNoDia(faseId: FaseProtocoloId, dia: number): string[] {
  return faseDoProtocolo(faseId)
    .janelas.filter((janela) => !("alternativa" in janela && janela.alternativa) && dia >= janela.de && dia <= janela.ate)
    .map((janela) => janela.rotulo);
}
