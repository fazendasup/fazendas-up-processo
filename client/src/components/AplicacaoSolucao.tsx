import { Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cartoesSolucao,
  produtoSolucaoDoNome,
  protocoloFases14d as protocolo,
  type ProdutoSolucaoId,
} from "@/data/cicloFases14d";
import { DIAS_SEMANA } from "@/lib/utils-farm";

type CicloSolucaoResumo = {
  nome: string;
  produto?: string | null;
  ativo: boolean;
  frequencia: string;
  diasSemana?: number[] | null;
  intervaloDias?: number | null;
};

export default function AplicacaoSolucao({
  ciclos,
  onAgendar,
}: {
  ciclos: CicloSolucaoResumo[];
  onAgendar: (id: ProdutoSolucaoId) => void;
}) {
  const cartoes = cartoesSolucao();

  return (
    <section className="mb-8 rounded-xl border border-border bg-card">
      <div className="px-4 py-3">
        <h2 className="flex items-center gap-2 font-display font-bold">
          <Droplet className="h-4 w-4 text-primary" />
          Aplicação na solução
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {protocolo.sistemico} {protocolo.pare}
        </p>
      </div>

      <div className="space-y-4 border-t px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {cartoes.map((cartao) => (
            <article key={cartao.id} className="rounded-lg border bg-muted/30 p-3">
              <h3 className="font-display text-base font-bold">{cartao.nome}</h3>
              <p className="text-xs text-muted-foreground">{cartao.frequenciaLabel}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {cartao.linhas.map((linha) => (
                  <li key={linha.rotulo} className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{linha.rotulo}</span>
                    <span className="tabular-nums text-muted-foreground">{linha.valor}</span>
                  </li>
                ))}
              </ul>
              {cartao.aviso ? (
                <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                  {cartao.aviso}
                </p>
              ) : null}
              {cartao.notas.length > 0 ? (
                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  {cartao.notas.map((nota) => (
                    <li key={nota}>{nota}</li>
                  ))}
                </ul>
              ) : null}
              {cartao.id === "koh" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Fora da agenda. Use a correção de pH quando a leitura estiver abaixo de 5,8.
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">{resumoAgenda(ciclos, cartao.id)}</p>
              )}
              {cartao.id === "koh" ? (
                <Button type="button" size="sm" variant="outline" className="mt-3 h-8 text-xs" asChild>
                  <a href="/correcao-ec">Corrigir pH</a>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 h-8 text-xs"
                  onClick={() => onAgendar(cartao.id)}
                >
                  Agendar
                </Button>
              )}
            </article>
          ))}
        </div>

        <ul className="space-y-1 text-sm">
          {protocolo.bloqueios.map((regra) => (
            <li key={regra} className="flex gap-2">
              <span className="text-muted-foreground">·</span>
              <span>{regra}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function resumoAgenda(ciclos: CicloSolucaoResumo[], id: ProdutoSolucaoId): string {
  const encontrados = ciclos.filter((ciclo) => {
    if (!ciclo.ativo) return false;
    return (
      produtoSolucaoDoNome(ciclo.nome) === id ||
      (ciclo.produto ? produtoSolucaoDoNome(ciclo.produto) === id : false)
    );
  });
  if (encontrados.length === 0) return "Ainda sem dia na agenda.";
  return `Na agenda: ${encontrados.map(rotuloAgenda).join(" · ")}`;
}

function rotuloAgenda(ciclo: CicloSolucaoResumo): string {
  if (ciclo.frequencia === "diaria") return "todo dia";
  if (ciclo.frequencia === "quinzenal") return "a cada 14 dias";
  if (ciclo.frequencia === "mensal") return "mensal";
  if (ciclo.frequencia === "personalizada" && ciclo.intervaloDias) {
    return `a cada ${ciclo.intervaloDias} dias`;
  }
  const dias = DIAS_SEMANA.filter((dia) => (ciclo.diasSemana ?? []).includes(dia.value)).map(
    (dia) => dia.label,
  );
  return dias.length > 0 ? dias.join(", ") : "sem dia marcado";
}
