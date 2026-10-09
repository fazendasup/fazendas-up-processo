import { useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useFazenda } from "@/contexts/FazendaContext";
import { useDbIdResolver } from "@/hooks/useDbIdResolver";
import { Button } from "@/components/ui/button";
import type { CicloAplicacao, Fase } from "@/lib/types";
import { cicloPendenteNoProtocolo } from "@/lib/utils-farm";
import {
  hojeYmdSaoPaulo,
  passosDevidosDaCaixa,
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

type LinhaAplicacao = {
  key: string;
  produto: string;
  dosagem: string;
  diasAtraso: number;
  acao: { tipo: "caixa"; cicloId: number; caixaDbId: number } | { tipo: "andar"; cicloId: number };
};

function referenciaHojeFazenda(): Date {
  const [ano, mes, dia] = hojeYmdSaoPaulo().split("-").map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1, 12, 0, 0);
}

/** Aplicações da caixa e a calda foliar da fase, cada uma com o próprio botão. */
export function AplicacaoPendenteNaTorre({
  caixaId,
  fase,
}: {
  caixaId?: string | null;
  fase?: Fase | null;
}) {
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
  const marcarFoliar = trpc.ciclos.marcarExecutado.useMutation({
    onSuccess: async (resultado) => {
      toast.success(
        resultado.ajustados > 0
          ? "Aplicação registrada. A outra calda mudou de data."
          : "Aplicação registrada",
      );
      await utils.fazenda.loadAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const linhas = useMemo(() => {
    const saida: LinhaAplicacao[] = [];
    const hoje = hojeYmdSaoPaulo();
    const referencia = referenciaHojeFazenda();
    if (caixaId) {
      const caixaDbId = resolver.caixaSlugToId.get(caixaId);
      if (caixaDbId != null) {
        for (const escolhido of passosDevidosDaCaixa(passosAgenda(data.ciclos), caixaId, hoje)) {
          const ciclo = data.ciclos.find(
            (c) => Number(String(c.id).replace(/^c-/, "")) === escolhido.passo.id,
          );
          if (!ciclo) continue;
          const cicloId = escolhido.passo.id;
          saida.push({
            key: `caixa-${cicloId}`,
            produto: ciclo.produto,
            dosagem: ciclo.dosagem?.trim() || "",
            diasAtraso: escolhido.diasAtraso,
            acao: { tipo: "caixa", cicloId, caixaDbId },
          });
        }
      }
    }
    if (fase) {
      for (const ciclo of data.ciclos) {
        if (ciclo.alvo !== "andar") continue;
        if (!ciclo.fasesAplicaveis.includes(fase)) continue;
        if (!cicloPendenteNoProtocolo(ciclo, data.ciclos, referencia)) continue;
        const cicloId = Number(String(ciclo.id).replace(/^c-/, ""));
        if (!Number.isFinite(cicloId)) continue;
        saida.push({
          key: `andar-${cicloId}`,
          produto: ciclo.produto,
          dosagem: ciclo.dosagem?.trim() || "",
          diasAtraso: 0,
          acao: { tipo: "andar", cicloId },
        });
      }
    }
    return saida;
  }, [caixaId, data.ciclos, fase, resolver.caixaSlugToId]);

  if (linhas.length === 0) return null;

  return (
    <div className="mt-auto space-y-1">
      {linhas.map((linha) => {
        const atrasado = linha.diasAtraso > 0;
        return (
          <div
            key={linha.key}
            className={`rounded-md border px-2 py-1 ${
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
                disabled={aplicar.isPending || marcarFoliar.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (linha.acao.tipo === "caixa") {
                    aplicar.mutate({
                      cicloId: linha.acao.cicloId,
                      caixaAguaId: linha.acao.caixaDbId,
                    });
                    return;
                  }
                  marcarFoliar.mutate({
                    id: linha.acao.cicloId,
                    ultimaExecucao: new Date(),
                  });
                }}
              >
                Aplicar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
