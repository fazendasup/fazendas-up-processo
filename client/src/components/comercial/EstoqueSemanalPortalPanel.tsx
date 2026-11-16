import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Package, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  dia: Date;
  canEdit: boolean;
};

function fmtQtd(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return Number.isInteger(v)
    ? String(v)
    : v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export function EstoqueSemanalPortalPanel({ dia, canEdit }: Props) {
  const utils = trpc.useUtils();
  const consulta = trpc.comercial.pedidos.estoqueSemanal.useQuery({ dia });
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!consulta.data) return;
    const next: Record<string, string> = {};
    for (const item of consulta.data.itens) {
      next[item.produtoId] =
        item.quantidade == null ? "" : String(item.quantidade);
    }
    setRascunho(next);
  }, [consulta.data]);

  const salvar = trpc.comercial.pedidos.salvarEstoqueSemanal.useMutation({
    onSuccess: async () => {
      toast.success("Estoque da semana salvo e sincronizado com o site.");
      await utils.comercial.pedidos.estoqueSemanal.invalidate();
    },
    onError: err => toast.error(err.message || "Falha ao salvar estoque."),
  });

  const filtrados = useMemo(() => {
    const itens = consulta.data?.itens ?? [];
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter(
      i =>
        i.nome.toLowerCase().includes(q) ||
        (i.categoria ?? "").toLowerCase().includes(q)
    );
  }, [consulta.data?.itens, busca]);

  const dirty = useMemo(() => {
    if (!consulta.data) return false;
    return consulta.data.itens.some(item => {
      const raw = (rascunho[item.produtoId] ?? "").trim();
      const atual =
        item.quantidade == null ? "" : String(item.quantidade);
      return raw !== atual;
    });
  }, [consulta.data, rascunho]);

  function salvarAlteracoes() {
    if (!consulta.data) return;
    const itens: Array<{ produtoId: string; quantidade: number | null }> = [];
    for (const item of consulta.data.itens) {
      const raw = (rascunho[item.produtoId] ?? "").trim();
      const atual =
        item.quantidade == null ? "" : String(item.quantidade);
      if (raw === atual) continue;
      if (raw === "") {
        itens.push({ produtoId: item.produtoId, quantidade: null });
        continue;
      }
      const n = Number(raw.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        toast.error(`Quantidade inválida em ${item.nome}`);
        return;
      }
      itens.push({ produtoId: item.produtoId, quantidade: n });
    }
    if (itens.length === 0) {
      toast.message("Nenhuma alteração para salvar.");
      return;
    }
    salvar.mutate({ dia, itens });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Estoque da semana (site)
              {consulta.data?.rotulo ? (
                <Badge variant="secondary">{consulta.data.rotulo}</Badge>
              ) : null}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Informe a capacidade da semana. O{" "}
              <strong className="font-medium text-foreground">reservado</strong>{" "}
              soma os pedidos não cancelados da semana; o disponível é
              sincronizado com a loja do site.
            </p>
          </div>
          {canEdit ? (
            <Button
              size="sm"
              disabled={!dirty || salvar.isPending || consulta.isLoading}
              onClick={salvarAlteracoes}
            >
              {salvar.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Salvar e sincronizar
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Buscar produto ou categoria..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="max-w-md"
        />
        {consulta.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando estoque…
          </p>
        ) : consulta.isError ? (
          <p className="text-sm text-destructive">
            Não foi possível carregar o estoque semanal.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Nenhum produto da loja/operação para esta semana.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Produto</th>
                  <th className="px-3 py-2 font-semibold">Estoque semana</th>
                  <th className="px-3 py-2 font-semibold">Reservado</th>
                  <th className="px-3 py-2 font-semibold">Disponível</th>
                  <th className="px-3 py-2 font-semibold">Site agora</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(item => (
                  <tr
                    key={item.produtoId}
                    className="border-t align-middle odd:bg-background even:bg-muted/10"
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium leading-tight">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.categoria || "Sem categoria"}
                        {item.visivelPortal ? " · na loja" : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 w-28"
                        inputMode="decimal"
                        disabled={!canEdit || salvar.isPending}
                        value={rascunho[item.produtoId] ?? ""}
                        placeholder="—"
                        onChange={e =>
                          setRascunho(prev => ({
                            ...prev,
                            [item.produtoId]: e.target.value,
                          }))
                        }
                        aria-label={`Estoque semana ${item.nome}`}
                      />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-amber-800 dark:text-amber-200">
                      {fmtQtd(item.reservado)}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-medium">
                      {fmtQtd(item.disponivel)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {fmtQtd(item.estoqueLoja)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
