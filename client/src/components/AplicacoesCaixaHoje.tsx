import { useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useFazenda } from "@/contexts/FazendaContext";
import { useDbIdResolver } from "@/hooks/useDbIdResolver";
import { Button } from "@/components/ui/button";
import { cicloPendenteHoje } from "@/lib/utils-farm";
import { torreEstaAtivaNoDashboard } from "@/lib/types";

export type AplicacaoCaixaHoje = {
  key: string;
  cicloId: number;
  caixaSlug: string;
  caixaDbId: number;
  produto: string;
  dosagem: string;
};

export function useAplicacoesCaixaHoje(): AplicacaoCaixaHoje[] {
  const { data } = useFazenda();
  const resolver = useDbIdResolver();

  return useMemo(() => {
    const out: AplicacaoCaixaHoje[] = [];

    for (const ciclo of data.ciclos) {
      if (!ciclo.ativo || ciclo.alvo === "andar") continue;
      const cicloId = Number(String(ciclo.id).replace(/^c-/, ""));
      if (!Number.isFinite(cicloId)) continue;
      for (const caixaId of ciclo.caixaIds ?? []) {
        const caixa = data.caixasAgua.find((c) => c.id === caixaId);
        const caixaDbId = resolver.caixaSlugToId.get(caixaId);
        if (!caixa || caixaDbId == null) continue;
        const exec = ciclo.execucoesCaixa?.find((e) => e.caixaId === caixaId);
        const pendente = cicloPendenteHoje({
          ...ciclo,
          ultimaExecucao: exec?.ultimaExecucao,
        });
        if (!pendente) continue;
        const temTorreAtiva = data.torres.some(
          (t) => t.caixaAguaId === caixaId && torreEstaAtivaNoDashboard(t),
        );
        if (!temTorreAtiva) continue;
        out.push({
          key: `${ciclo.id}-${caixaId}`,
          cicloId,
          caixaSlug: caixaId,
          caixaDbId,
          produto: ciclo.produto,
          dosagem: ciclo.dosagem?.trim() || "",
        });
      }
    }

    return out;
  }, [data, resolver.caixaSlugToId]);
}

/** Dose do dia no vão do card da torre, com o botão de aplicar. */
export function AplicacaoPendenteNaTorre({ caixaId }: { caixaId?: string | null }) {
  const linhas = useAplicacoesCaixaHoje().filter((l) => l.caixaSlug === caixaId);
  const utils = trpc.useUtils();
  const aplicar = trpc.ciclos.aplicarNaCaixa.useMutation({
    onSuccess: async () => {
      toast.success("Aplicação registrada");
      await utils.fazenda.loadAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!caixaId || linhas.length === 0) return null;

  return (
    <div className="mt-auto flex flex-col gap-1.5 pt-2">
      {linhas.map((linha) => (
        <div
          key={linha.key}
          className="rounded-md bg-emerald-600 px-2.5 py-2 text-white shadow-sm"
        >
          <p className="text-[11px] font-semibold leading-tight">{linha.produto}</p>
          {linha.dosagem ? (
            <p className="mt-1 text-sm font-bold leading-snug">{linha.dosagem}</p>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="mt-2 h-8 w-full bg-white font-bold text-emerald-800 hover:bg-emerald-50"
            disabled={aplicar.isPending}
            onClick={() =>
              aplicar.mutate({
                cicloId: linha.cicloId,
                caixaAguaId: linha.caixaDbId,
              })
            }
          >
            Aplicar
          </Button>
        </div>
      ))}
    </div>
  );
}
