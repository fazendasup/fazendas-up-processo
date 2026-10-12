import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportTableDocument } from "@/lib/exportTableDocument";

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDataBr(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function useInadimplenciaResumo(contaAzulCustomerIds: string[]) {
  const ids = useMemo(
    () =>
      Array.from(new Set(contaAzulCustomerIds.map((id) => id.trim()).filter(Boolean))).slice(
        0,
        200,
      ),
    [contaAzulCustomerIds],
  );

  const query = trpc.comercial.pedidos.inadimplenciaResumo.useQuery(
    { contaAzulCustomerIds: ids },
    {
      enabled: ids.length > 0,
      staleTime: 60_000,
      retry: false,
    },
  );

  const mapa = useMemo(() => {
    const m = new Map<
      string,
      { inadimplente: boolean; quantidadeTitulos: number; valorEmAberto: number }
    >();
    for (const row of query.data ?? []) {
      m.set(row.contaAzulCustomerId, {
        inadimplente: row.inadimplente,
        quantidadeTitulos: row.quantidadeTitulos,
        valorEmAberto: row.valorEmAberto,
      });
    }
    return m;
  }, [query.data]);

  return { mapa, isLoading: query.isLoading, error: query.error };
}

export function InadimplenciaClienteBadge({
  contaAzulCustomerId,
  clienteNome,
  resumo,
}: {
  contaAzulCustomerId: string;
  clienteNome?: string | null;
  resumo?: {
    inadimplente: boolean;
    quantidadeTitulos: number;
    valorEmAberto: number;
  } | null;
}) {
  const [aberto, setAberto] = useState(false);
  const detalhe = trpc.comercial.pedidos.inadimplenciaDetalhe.useQuery(
    { contaAzulCustomerId },
    { enabled: aberto, staleTime: 30_000, retry: false },
  );
  const [baixandoPdf, setBaixandoPdf] = useState(false);

  if (!resumo?.inadimplente) return null;

  function baixarPdfEmAberto() {
    const titulos = (detalhe.data?.titulos ?? []).filter((t) => t.valorAberto > 0.009);
    if (titulos.length === 0) {
      toast.error("Não há títulos em aberto para este cliente.");
      return;
    }
    setBaixandoPdf(true);
    try {
      const nome = detalhe.data?.clienteNome || clienteNome || contaAzulCustomerId;
      const total = titulos.reduce((s, t) => s + t.valorAberto, 0);
      const hoje = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      exportTableDocument(
        {
          title: `Títulos em aberto — ${nome}`,
          subtitle: "Somente o saldo em aberto deste cliente",
          filename: `titulos_em_aberto_${nome.replace(/[^\w\-]+/g, "_").slice(0, 40)}_${hoje}`,
          headers: ["Vencimento", "Lançamento", "Categoria", "Situação", "Em aberto"],
          rows: titulos.map((t) => [
            fmtDataBr(t.dataVencimento),
            t.descricao,
            t.categoria ?? "",
            t.status,
            fmtMoney(t.valorAberto),
          ]),
          footers: [["", "", "", "Total em aberto", fmtMoney(total)]],
          kpis: [
            { label: "Títulos", value: String(titulos.length) },
            { label: "Em aberto", value: fmtMoney(total) },
          ],
          orientation: "landscape",
        },
        "pdf",
      );
      toast.success("PDF dos títulos em aberto gerado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar PDF.");
    } finally {
      setBaixandoPdf(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-800 ring-1 ring-red-200 hover:bg-red-200/80 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900"
        title={`${resumo.quantidadeTitulos} título(s) · ${fmtMoney(resumo.valorEmAberto)}`}
        onClick={() => setAberto(true)}
      >
        <AlertTriangle className="h-3 w-3" />
        Inadimplente
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Títulos em atraso — Conta Azul</DialogTitle>
          </DialogHeader>

          {detalhe.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Consultando Conta Azul…
            </p>
          ) : detalhe.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {detalhe.error.message}
            </p>
          ) : detalhe.data ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border bg-red-50/80 px-3 py-2 dark:bg-red-950/30">
                <p className="font-semibold">
                  {detalhe.data.clienteNome || clienteNome || contaAzulCustomerId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {detalhe.data.titulos.length} título(s) em atraso ·{" "}
                  {fmtMoney(detalhe.data.valorEmAberto)}
                </p>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {detalhe.data.titulos.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-red-100 px-2.5 py-2 dark:border-red-900/50"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <p className="font-medium leading-snug">{t.descricao}</p>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-red-700">
                        {fmtMoney(t.valorAberto)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Venc. {fmtDataBr(t.dataVencimento)} · {t.status}
                      {t.categoria ? ` · ${t.categoria}` : ""}
                    </p>
                  </div>
                ))}
                {detalhe.data.titulos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum título em atraso no momento.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              disabled={baixandoPdf || !detalhe.data || detalhe.data.titulos.length === 0}
              onClick={() => baixarPdfEmAberto()}
            >
              {baixandoPdf ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Gerando…
                </>
              ) : (
                <>
                  <Download className="mr-1.5 h-4 w-4" />
                  Baixar PDF em aberto
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
