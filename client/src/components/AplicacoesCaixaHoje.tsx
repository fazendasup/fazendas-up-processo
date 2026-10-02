import { useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useFazenda } from "@/contexts/FazendaContext";
import { useDbIdResolver } from "@/hooks/useDbIdResolver";
import { Button } from "@/components/ui/button";
import type { CicloAplicacao } from "@/lib/types";
import {
  escolherPassoDaCaixa,
  hojeYmdSaoPaulo,
  type PassoCicloAgenda,
} from "@shared/cicloSequencia";

function passosAgenda(ciclos: CicloAplicacao[]): PassoCicloAgenda<string>[] {
  const out: PassoCicloAgenda<string>[] = [];
  for (const ciclo of ciclos) {
    const id = Number(String(ciclo.id).replace(/^c-/, ""));
    if (!Number.isFinite(id)) continue;
    out.push({
      id,
      ativo: ciclo.ativo !== false,
      alvo: ciclo.alvo,
      frequencia: ciclo.frequencia,
      diasSemana: ciclo.diasSemana,
      intervaloDias: ciclo.intervaloDias,
      dataInicio: ciclo.dataInicio,
      caixaIds: ciclo.caixaIds ?? [],
      execucoes: (ciclo.execucoesCaixa ?? []).map((e) => ({
        caixaId: e.caixaId,
        ultimaExecucao: e.ultimaExecucao,
        dataAgenda: e.dataAgenda,
      })),
    });
  }
  return out;
}

/** Próximo passo da caixa: um produto por vez, com atraso quando a data já passou. */
export function AplicacaoPendenteNaTorre({ caixaId }: { caixaId?: string | null }) {
  const { data } = useFazenda();
  const resolver = useDbIdResolver();
  const utils = trpc.useUtils();
  const aplicar = trpc.ciclos.aplicarNaCaixa.useMutation({
    onSuccess: async (resultado) => {
      toast.success(
        resultado.ajustados > 0
          ? "Aplicação registrada. As outras datas desta caixa foram atualizadas."
          : "Aplicação registrada",
      );
      await utils.fazenda.loadAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const linha = useMemo(() => {
    if (!caixaId) return null;
    const escolhido = escolherPassoDaCaixa(passosAgenda(data.ciclos), caixaId, hojeYmdSaoPaulo());
    if (!escolhido) return null;
    const ciclo = data.ciclos.find((c) => Number(String(c.id).replace(/^c-/, "")) === escolhido.passo.id);
    const caixaDbId = resolver.caixaSlugToId.get(caixaId);
    if (!ciclo || caixaDbId == null) return null;
    return {
      cicloId: escolhido.passo.id,
      caixaDbId,
      produto: ciclo.produto,
      dosagem: ciclo.dosagem?.trim() || "",
      diasAtraso: escolhido.diasAtraso,
    };
  }, [caixaId, data.ciclos, resolver.caixaSlugToId]);

  if (!linha) return null;

  const atrasado = linha.diasAtraso > 0;

  return (
    <div
      className={`mt-auto rounded-md border px-2 py-1 ${
        atrasado ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold leading-tight text-foreground">{linha.produto}</p>
          {linha.dosagem ? (
            <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground" title={linha.dosagem}>
              {linha.dosagem}
            </p>
          ) : null}
          {atrasado ? (
            <p className="text-[10px] font-semibold leading-tight text-amber-800">
              Em atraso · {linha.diasAtraso} {linha.diasAtraso === 1 ? "dia" : "dias"}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          disabled={aplicar.isPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            aplicar.mutate({
              cicloId: linha.cicloId,
              caixaAguaId: linha.caixaDbId,
            });
          }}
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
}
