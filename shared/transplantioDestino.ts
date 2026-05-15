/**
 * Fase de destino no transplantio distribuído (fazenda vertical).
 * Com `faseDestinoInformada`, o operador pode ir de mudas direto para maturação (ex.: baby leaf).
 */

export type FaseDestinoTransplantioFv = "vegetativa" | "maturacao";

export function resolverFaseDestinoTransplantio(
  faseOrigem: "mudas" | "vegetativa",
  params: {
    pulaVegetativa: boolean;
    faseDestinoInformada?: FaseDestinoTransplantioFv | null;
    projetoTipo?: string | null;
  },
): FaseDestinoTransplantioFv {
  if (faseOrigem === "vegetativa") return "maturacao";

  if (params.projetoTipo === "microverdes") {
    return "vegetativa";
  }

  if (
    params.faseDestinoInformada === "vegetativa" ||
    params.faseDestinoInformada === "maturacao"
  ) {
    return params.faseDestinoInformada;
  }

  return params.pulaVegetativa ? "maturacao" : "vegetativa";
}
