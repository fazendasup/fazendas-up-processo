import type { Fase } from "@/lib/types";
import { labelPrevisao, type ModoDataPlantio } from "@/lib/utils-farm";

export function labelCampoDataPlantio(
  modo: ModoDataPlantio,
  fase: Fase,
  projetoTipo?: string | null,
): string {
  if (modo === "plantio") return "Primeiro plantio";
  const marco = labelPrevisao(fase, projetoTipo).toLowerCase();
  return `Primeira ${marco} alvo`;
}

type Props = {
  value: ModoDataPlantio;
  onChange: (v: ModoDataPlantio) => void;
  fase: Fase;
  projetoTipo?: string | null;
  className?: string;
};

/** Alterna entre informar data do plantio ou data alvo da colheita/transplante. */
export function PlantioModoDataSelector({ value, onChange, fase, projetoTipo, className }: Props) {
  const alvo = labelPrevisao(fase, projetoTipo);
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">Registrar data por</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange("plantio")}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold border transition-colors ${
            value === "plantio"
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          Primeiro plantio
        </button>
        <button
          type="button"
          onClick={() => onChange("colheita_alvo")}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold border transition-colors ${
            value === "colheita_alvo"
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          Primeira {alvo.toLowerCase()} alvo
        </button>
      </div>
    </div>
  );
}
