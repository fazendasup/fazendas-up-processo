import { Link } from "wouter";
import { Layers, Box, ChevronRight, Share2 } from "lucide-react";
import { FASES_CONFIG, type Fase } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type BancadaRow = inferRouterOutputs<AppRouter>["bancadas"]["list"][number];

const statusPt: Record<string, string> = {
  ativa: "Ativa",
  inativa: "Inativa",
  manutencao: "Manutenção",
};

export default function BancadaCard({ bancada, fase }: { bancada: BancadaRow; fase: Fase }) {
  const cfg = FASES_CONFIG[fase];
  return (
    <Link
      href={`/bancada/${bancada.id}`}
      className={cn(
        "group block rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm transition-all",
        "hover:border-primary/40 hover:shadow-md no-underline text-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm truncate group-hover:text-primary transition-colors">{bancada.nome}</p>
          {bancada.codigo && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{bancada.codigo}</p>}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" aria-hidden />
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5">
          <Layers className="h-3 w-3" />
          {statusPt[bancada.status] ?? bancada.status}
        </span>
        {!bancada.ativa && (
          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-900 dark:text-amber-100">Oculta no painel</span>
        )}
        {bancada.compartilhada && (
          <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-cyan-900 dark:text-cyan-100">
            <Share2 className="h-3 w-3" />
            Compartilhada
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5">
          <Box className="h-3 w-3" />
          {bancada.quantidadeCaixas} caixa(s)
        </span>
        {bancada.tipoCultivo && <span className="truncate max-w-[10rem]">{bancada.tipoCultivo}</span>}
      </div>
      <p className="text-[10px] text-muted-foreground/90 mt-2 flex items-center gap-2">
        <span>{cfg.icon}</span>
        <span>
          EC {cfg.ecMin}-{cfg.ecMax} · pH {cfg.phMin}-{cfg.phMax}
        </span>
      </p>
    </Link>
  );
}
