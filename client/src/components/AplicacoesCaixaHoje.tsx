import { useMemo } from "react";
import { Droplet } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useFazenda } from "@/contexts/FazendaContext";
import { useDbIdResolver } from "@/hooks/useDbIdResolver";
import { Button } from "@/components/ui/button";
import { cicloPendenteHoje } from "@/lib/utils-farm";
import { torreEstaAtivaNoDashboard } from "@/lib/types";

/**
 * O que aplicar hoje, por caixa. Uma linha: torres, produto, dosagem, Aplicar.
 * O ritmo seguinte dessa caixa parte do momento da aplicação.
 */
export default function AplicacoesCaixaHoje() {
  const { data } = useFazenda();
  const resolver = useDbIdResolver();
  const utils = trpc.useUtils();
  const aplicar = trpc.ciclos.aplicarNaCaixa.useMutation({
    onSuccess: async () => {
      toast.success("Aplicação registrada");
      await utils.fazenda.loadAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const linhas = useMemo(() => {
    const out: {
      key: string;
      cicloId: number;
      caixaDbId: number;
      torres: string;
      produto: string;
      dosagem: string;
    }[] = [];

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
        const numeros = data.torres
          .filter(
            (t) => t.caixaAguaId === caixaId && torreEstaAtivaNoDashboard(t),
          )
          .map((t) => t.numeroTorre)
          .sort((a, b) => a - b);
        out.push({
          key: `${ciclo.id}-${caixaId}`,
          cicloId,
          caixaDbId,
          torres: numeros.length > 0 ? numeros.join(" · ") : caixa.nome,
          produto: ciclo.produto,
          dosagem: ciclo.dosagem?.trim() || "",
        });
      }
    }

    return out.sort((a, b) => a.torres.localeCompare(b.torres, "pt-BR"));
  }, [data, resolver.caixaSlugToId]);

  if (linhas.length === 0) return null;

  return (
    <section>
      <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2 text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/20">
          <Droplet className="w-4 h-4" />
        </span>
        Aplicar hoje
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {linhas.map((linha) => (
          <div
            key={linha.key}
            className="surface-panel rounded-xl border border-border/70 px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-display text-lg font-bold tabular-nums leading-none">
                {linha.torres}
              </p>
              <p className="mt-1.5 text-sm">{linha.produto}</p>
              {linha.dosagem ? (
                <p className="text-base font-semibold">{linha.dosagem}</p>
              ) : null}
            </div>
            <Button
              size="sm"
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
    </section>
  );
}
