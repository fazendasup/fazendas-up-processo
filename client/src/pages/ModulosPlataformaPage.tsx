import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { MODULOS_CONTRATAVEIS } from "@shared/const";
import type { ModuloContratavel } from "@shared/const";
import { ROTULO_MODULO_PROJETO } from "@shared/projetoModulos";
import { Link } from "wouter";
import { ArrowLeft, Layers } from "lucide-react";
import { toast } from "sonner";

export default function ModulosPlataformaPage() {
  const utils = trpc.useUtils();
  const { data, isLoading, isError } = trpc.projetos.listagemModulosPlataforma.useQuery();

  const definir = trpc.projetos.definirModuloProjeto.useMutation({
    onSuccess: async () => {
      toast.success("Módulo atualizado.");
      await Promise.all([
        utils.projetos.listagemModulosPlataforma.invalidate(),
        utils.projetos.modulosAtivos.invalidate(),
      ]);
    },
    onError: (e) => toast.error(e.message || "Não foi possível atualizar."),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/administracao" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Administração
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold">Módulos por projeto</h1>
              <p className="text-sm text-muted-foreground">
                Liga ou desliga funcionalidades comerciais (estoque, automação, inteligência, visão, custos de produção) por projeto.
              </p>
            </div>
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {isError && <p className="text-destructive">Não foi possível carregar a listagem.</p>}

        {data && data.length === 0 && (
          <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
        )}

        {data && data.length > 0 && (
          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  {MODULOS_CONTRATAVEIS.map((m) => (
                    <TableHead key={m} className="text-center min-w-[7rem]">
                      {ROTULO_MODULO_PROJETO[m]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.tipo}</TableCell>
                    <TableCell className="text-sm">{row.status}</TableCell>
                    {MODULOS_CONTRATAVEIS.map((m) => (
                      <TableCell key={m} className="text-center">
                        <Switch
                          checked={row.modulos[m]}
                          disabled={definir.isPending}
                          onCheckedChange={(habilitado) =>
                            definir.mutate({ projetoId: row.id, modulo: m, habilitado })
                          }
                          aria-label={`${ROTULO_MODULO_PROJETO[m]} — ${row.nome}`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
