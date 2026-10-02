import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  caldaDoNome,
  protocoloFoliar,
  type CaldaFoliarId,
} from "@/data/cicloFases14d";
import { DIAS_SEMANA } from "@/lib/utils-farm";

type CicloFoliarResumo = {
  nome: string;
  ativo: boolean;
  frequencia: string;
  diasSemana?: number[] | null;
};

export default function AplicacaoFoliar({
  ciclos,
  onAgendar,
}: {
  ciclos: CicloFoliarResumo[];
  onAgendar: (id: CaldaFoliarId) => void;
}) {
  const foliar = protocoloFoliar();

  return (
    <section className="mb-8 rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 font-display font-bold">
            <Leaf className="h-4 w-4 text-primary" />
            {foliar.titulo}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {foliar.via} Calda de {foliar.volume}. {foliar.horario}
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t px-4 py-4">
        <p className="text-xs text-muted-foreground">
          Produtos, só foliar: {foliar.produtos.join(", ")}.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {foliar.caldas.map((calda) => {
            const dias = diasDaCalda(ciclos, calda.id as CaldaFoliarId);
            return (
              <article key={calda.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold">
                      {calda.nome} — {calda.volume}
                    </h3>
                    <p className="text-xs text-muted-foreground">{calda.frequencia}</p>
                  </div>
                </div>
                <ul className="space-y-1 text-sm">
                  {calda.itens.map((item) => (
                    <li key={item.produto} className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{item.produto}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {item.dose}
                        {"crise" in item && item.crise ? ` · ${item.crise}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                {"aviso" in calda && calda.aviso ? (
                  <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                    {calda.aviso}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {dias.length > 0 ? `Na agenda: ${dias.join(", ")}` : "Ainda sem dia na agenda."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 h-8 text-xs"
                  onClick={() => onAgendar(calda.id as CaldaFoliarId)}
                >
                  Agendar na semana
                </Button>
              </article>
            );
          })}
        </div>

        <ul className="space-y-1 text-sm">
          {foliar.regras.map((regra) => (
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

function diasDaCalda(ciclos: CicloFoliarResumo[], id: CaldaFoliarId): string[] {
  const dias = new Set<number>();
  for (const ciclo of ciclos) {
    if (!ciclo.ativo || caldaDoNome(ciclo.nome) !== id) continue;
    if (ciclo.frequencia === "diaria") {
      for (const dia of DIAS_SEMANA) dias.add(dia.value);
      continue;
    }
    for (const dia of ciclo.diasSemana ?? []) dias.add(dia);
  }
  return DIAS_SEMANA.filter((dia) => dias.has(dia.value)).map((dia) => dia.label);
}
