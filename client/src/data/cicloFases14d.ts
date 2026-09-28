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

export function rotulosNoDia(faseId: FaseProtocoloId, dia: number): string[] {
  return faseDoProtocolo(faseId)
    .janelas.filter((janela) => !("alternativa" in janela && janela.alternativa) && dia >= janela.de && dia <= janela.ate)
    .map((janela) => janela.rotulo);
}
