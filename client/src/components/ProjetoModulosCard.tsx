import { useProjeto } from "@/contexts/ProjetoContext";
import { useRole } from "@/hooks/useRole";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MODULOS_CONTRATAVEIS } from "@shared/const";
import type { ModuloContratavel } from "@shared/const";
import { DESCRICAO_MODULO_PROJETO, ROTULO_MODULO_PROJETO } from "@shared/projetoModulos";
import { Link } from "wouter";
import { toast } from "sonner";

/**
 * Estado dos módulos contratados do projeto ativo.
 * Equipa da plataforma pode ligar/desligar aqui; outros admins só consultam.
 */
export function ProjetoModulosCard() {
  const { activeProjetoId, activeProjeto, modulosAtivos } = useProjeto();
  const { isPlatformAdmin } = useRole();
  const utils = trpc.useUtils();

  const definir = trpc.projetos.definirModuloProjeto.useMutation({
    onSuccess: async () => {
      toast.success("Módulo atualizado.");
      await Promise.all([
        utils.projetos.modulosAtivos.invalidate(),
        utils.projetos.listagemModulosPlataforma.invalidate(),
      ]);
    },
    onError: (e) => toast.error(e.message || "Não foi possível atualizar o módulo."),
  });

  if (activeProjetoId == null || !activeProjeto) {
    return (
      <p className="text-sm text-muted-foreground">Selecione um projeto para ver os módulos contratados.</p>
    );
  }

  if (modulosAtivos == null) {
    return <p className="text-sm text-muted-foreground">Carregando módulos…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground max-w-xl">
          Funcionalidades opcionais deste projeto. Com o módulo desligado, o menu e as rotas ficam ocultos.
        </p>
        {isPlatformAdmin && (
          <Link href="/plataforma/modulos" className="text-xs text-primary hover:underline shrink-0">
            Gerir todos os projetos
          </Link>
        )}
      </div>
      <ul className="space-y-3">
        {MODULOS_CONTRATAVEIS.map((m: ModuloContratavel) => {
          const ativo = modulosAtivos[m];
          return (
            <li
              key={m}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{ROTULO_MODULO_PROJETO[m]}</span>
                  {!isPlatformAdmin && (
                    <Badge variant={ativo ? "secondary" : "outline"} className="text-[10px]">
                      {ativo ? "Ativo" : "Desligado"}
                    </Badge>
                  )}
                </div>
                {DESCRICAO_MODULO_PROJETO[m] ? (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {DESCRICAO_MODULO_PROJETO[m]}
                  </p>
                ) : null}
              </div>
              {isPlatformAdmin ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Label htmlFor={`mod-${m}`} className="sr-only">
                    {ROTULO_MODULO_PROJETO[m]}
                  </Label>
                  <Switch
                    id={`mod-${m}`}
                    checked={ativo}
                    disabled={definir.isPending}
                    onCheckedChange={(habilitado) =>
                      definir.mutate({ projetoId: activeProjetoId, modulo: m, habilitado })
                    }
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {!isPlatformAdmin && (
        <p className="text-xs text-muted-foreground">
          Para contratar ou desligar módulos, contacte a equipa da plataforma.
        </p>
      )}
    </div>
  );
}
