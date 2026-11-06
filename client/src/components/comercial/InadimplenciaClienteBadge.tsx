import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Loader2, MessageCircle } from "lucide-react";
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
import {
  abrirWhatsappCobranca,
  normalizarTelefoneWhatsapp,
} from "@shared/comercial/whatsapp-cobranca";

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDataBr(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Situação do título no PDF e na lista, sempre em português. */
function situacaoPt(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OVERDUE":
    case "ATRASADO":
      return "Em atraso";
    case "PENDING":
    case "OPEN":
    case "EM_ABERTO":
    case "ABERTO":
      return "Em aberto";
    case "ACQUITTED":
    case "RECEIVED":
    case "PAID":
    case "QUITADO":
      return "Quitado";
    case "PARTIAL":
      return "Parcial";
    case "LOST":
      return "Perdido";
    case "RENEGOTIATED":
      return "Renegociado";
    case "CANCELED":
    case "CANCELLED":
    case "CANCELADO":
      return "Cancelado";
    default:
      return /[A-Za-z]/.test(status) && status === status.toUpperCase()
        ? "Em aberto"
        : status.trim() || "Em aberto";
  }
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
  telefoneWhatsapp,
  resumo,
}: {
  contaAzulCustomerId: string;
  clienteNome?: string | null;
  /** Telefone do cadastro (se já veio no pedido). Senão usa o do detalhe CA. */
  telefoneWhatsapp?: string | null;
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

  function abrirWhatsapp() {
    const telefone =
      detalhe.data?.telefoneWhatsapp ?? telefoneWhatsapp ?? null;
    const nome =
      detalhe.data?.clienteNome || clienteNome || contaAzulCustomerId;
    const titulos = (detalhe.data?.titulos ?? []).map((t) => ({
      descricao: t.descricao,
      dataVencimento: t.dataVencimento,
      valorAberto: t.valorAberto,
    }));
    const result = abrirWhatsappCobranca({
      telefone,
      clienteNome: nome,
      valorEmAberto: detalhe.data?.valorEmAberto ?? resumo!.valorEmAberto,
      quantidadeTitulos:
        detalhe.data?.titulos.length ?? resumo!.quantidadeTitulos,
      titulos: titulos.length > 0 ? titulos : undefined,
    });
    if (!result.ok) {
      toast.error(result.erro);
      if (!aberto) setAberto(true);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
    toast.message("WhatsApp aberto com a mensagem pronta — confira e envie.");
  }

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
            "Venda",
            situacaoPt(t.status),
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

  const telefoneEfetivo =
    detalhe.data?.telefoneWhatsapp ?? telefoneWhatsapp ?? null;
  const temTelefone = Boolean(normalizarTelefoneWhatsapp(telefoneEfetivo));

  return (
    <>
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-800 ring-1 ring-red-200 hover:bg-red-200/80 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900"
          title={`${resumo.quantidadeTitulos} título(s) · ${fmtMoney(resumo.valorEmAberto)}`}
          onClick={() => setAberto(true)}
        >
          <AlertTriangle className="h-3 w-3" />
          Inadimplente
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900"
          title="Abrir WhatsApp com mensagem de cobrança pronta (sem API)"
          onClick={(e) => {
            e.stopPropagation();
            if (!aberto) setAberto(true);
            // Se o detalhe já estiver em cache, envia na hora; senão o diálogo carrega e o botão do rodapé envia.
            if (detalhe.data || telefoneWhatsapp) abrirWhatsapp();
          }}
        >
          <MessageCircle className="h-3 w-3" />
          WhatsApp
        </button>
      </span>

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
                <p className="mt-1 text-[11px] text-muted-foreground">
                  WhatsApp:{" "}
                  {temTelefone
                    ? telefoneEfetivo
                    : "não cadastrado — preencha telefoneWhatsapp no cliente ou sincronize o Conta Azul"}
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
                      Venc. {fmtDataBr(t.dataVencimento)} · {situacaoPt(t.status)} · Venda
                    </p>
                  </div>
                ))}
                {detalhe.data.titulos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum título em atraso no momento.
                  </p>
                ) : null}
              </div>

              <p className="rounded-md border border-dashed border-emerald-200 bg-emerald-50/60 px-2.5 py-2 text-[11px] text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
                O botão abre o WhatsApp Web/app com o contato e a mensagem de cobrança
                já preenchidos. Não usa API paga — o WhatsApp precisa estar logado; você
                só confere e envia.
              </p>
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Fechar
            </Button>
            <Button
              type="button"
              variant="outline"
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
                  Baixar PDF
                </>
              )}
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={detalhe.isLoading || !detalhe.data}
              onClick={() => abrirWhatsapp()}
            >
              <MessageCircle className="mr-1.5 h-4 w-4" />
              WhatsApp cobrança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
