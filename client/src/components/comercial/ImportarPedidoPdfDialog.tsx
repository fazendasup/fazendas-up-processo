import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, FileUp, Loader2, Trash2 } from "lucide-react";
import {
  draftImportProntoParaSalvar,
  type DraftImportarPedidoPdf,
  type ItemDraftImportPdf,
} from "@shared/importarPedidoPdf";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TIPOS = [
  ["RECORRENTE_SEMANAL", "Recorrente Semanal"],
  ["RECORRENTE_QUINZENAL", "Recorrente Quinzenal"],
  ["PLANO", "Plano"],
  ["AVULSO", "Avulso"],
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diaPadrao: string;
  onPedidoSalvo: (dia: string) => void;
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const b64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(b64);
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function statusBadge(status: string) {
  if (status === "ok") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
  if (status === "manual") return "bg-sky-500/15 text-sky-800 dark:text-sky-200";
  if (status === "ambiguo") return "bg-amber-500/15 text-amber-900 dark:text-amber-100";
  return "bg-rose-500/15 text-rose-900 dark:text-rose-100";
}

export function ImportarPedidoPdfDialog({
  open,
  onOpenChange,
  diaPadrao,
  onPedidoSalvo,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [arquivoNome, setArquivoNome] = useState("");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftImportarPedidoPdf | null>(null);
  const [dia, setDia] = useState(diaPadrao);
  const [tipoVenda, setTipoVenda] = useState("AVULSO");
  const [obsPedido, setObsPedido] = useState("");
  const [notaRegra, setNotaRegra] = useState("");
  const [atualizarRegra, setAtualizarRegra] = useState(false);
  const [buscaClienteManual, setBuscaClienteManual] = useState("");

  const clientesQ = trpc.comercial.pedidos.clientes.useQuery(
    { busca: buscaClienteManual || undefined, limite: 100 },
    { enabled: open },
  );
  const produtosQ = trpc.comercial.pedidos.produtos.useQuery(
    { apenasOperacao: true, incluirInativos: false },
    { enabled: open },
  );
  const clientes = clientesQ.data ?? [];
  const produtos = produtosQ.data ?? [];

  const analisar = trpc.comercial.pedidos.analisarPedidoPdf.useMutation({
    onSuccess: (data) => {
      setDraft(data);
      if (data.dataEntregaSugerida) setDia(data.dataEntregaSugerida);
      else setDia(diaPadrao);
      setTipoVenda(data.tipoVendaSugerido ?? "AVULSO");
      setObsPedido(data.observacoesPedido ?? "");
      setNotaRegra(data.notaRegraSugerida ?? "");
      setAtualizarRegra(Boolean(data.notaRegraSugerida?.trim()));
      toast.success("PDF analisado — confira o lado a lado antes de lançar.");
    },
    onError: (err) => toast.error(err.message || "Não foi possível analisar o PDF."),
  });

  const salvarPedido = trpc.comercial.pedidos.salvarPedido.useMutation();
  const salvarRegra = trpc.comercial.pedidos.salvarRegraCliente.useMutation();
  const utils = trpc.useUtils();
  const contexto = trpc.comercial.pedidos.contextoCliente.useQuery(
    { contaAzulCustomerId: draft?.cliente.contaAzulCustomerId ?? "" },
    { enabled: Boolean(draft?.cliente.contaAzulCustomerId) && atualizarRegra },
  );

  useEffect(() => {
    if (!open) return;
    setDia(diaPadrao);
  }, [open, diaPadrao]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const clientesComId = useMemo(
    () =>
      clientes.filter(
        (c): c is (typeof clientes)[number] & { externalId: string } =>
          Boolean(c.externalId?.trim()),
      ),
    [clientes],
  );

  const pronto = draft
    ? draftImportProntoParaSalvar({
        cliente: draft.cliente,
        itens: draft.itens,
      })
    : { ok: false as const, motivo: "Envie e analise um PDF." };

  async function onPickFile(file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Envie um arquivo PDF.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("PDF maior que 12 MB.");
      return;
    }
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setArquivoNome(file.name);
    setDraft(null);
    try {
      const b64 = await readFileAsBase64(file);
      setPdfBase64(b64);
      analisar.mutate({ arquivoNome: file.name, pdfBase64: b64 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao ler PDF.");
    }
  }

  function patchCliente(contaAzulCustomerId: string) {
    if (!draft) return;
    const c = clientesComId.find((x) => x.externalId === contaAzulCustomerId);
    setDraft({
      ...draft,
      cliente: {
        ...draft.cliente,
        contaAzulCustomerId: contaAzulCustomerId || null,
        nomeResolvido: c?.nome ?? null,
        status: contaAzulCustomerId ? "manual" : "nao_encontrado",
      },
    });
  }

  function patchItem(chave: string, patch: Partial<ItemDraftImportPdf>) {
    if (!draft) return;
    setDraft({
      ...draft,
      itens: draft.itens.map((item) => {
        if (item.chave !== chave) return item;
        const next = { ...item, ...patch };
        if (patch.produtoId !== undefined) {
          const p = produtos.find((x) => x.id === patch.produtoId);
          next.nomeResolvido = p?.nome ?? null;
          next.status = patch.produtoId ? "manual" : "nao_encontrado";
        }
        return next;
      }),
    });
  }

  function removerItem(chave: string) {
    if (!draft) return;
    setDraft({ ...draft, itens: draft.itens.filter((i) => i.chave !== chave) });
  }

  async function confirmar() {
    if (!draft || !pronto.ok) {
      toast.error(!pronto.ok ? pronto.motivo : "Rascunho incompleto.");
      return;
    }
    if (!tipoVenda) {
      toast.error("Selecione o tipo de venda.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
      toast.error("Informe a data da agenda (dia de entrega).");
      return;
    }

    const contaAzulCustomerId = draft.cliente.contaAzulCustomerId!;
    const itens = draft.itens
      .filter((i) => i.produtoId && i.quantidade > 0)
      .map((i) => ({
        produtoId: i.produtoId!,
        quantidade: i.quantidade,
        observacoes: i.observacoes ?? undefined,
      }));

    try {
      if (atualizarRegra && notaRegra.trim()) {
        const regraAtual = contexto.data?.regra;
        await salvarRegra.mutateAsync({
          contaAzulCustomerId,
          observacoesGerais: notaRegra.trim(),
          tipoVendaPadrao:
            (regraAtual?.tipoVendaPadrao as
              | "RECORRENTE_SEMANAL"
              | "RECORRENTE_QUINZENAL"
              | "PLANO"
              | "AVULSO"
              | null) ?? null,
          periodoEntrega: (regraAtual?.periodoEntrega as "MANHA" | "TARDE" | null) ?? null,
          diasEntrega: Array.isArray(regraAtual?.diasEntrega)
            ? (regraAtual!.diasEntrega as number[])
            : null,
          horarioMaximoEntrega: regraAtual?.horarioMaximoEntrega ?? null,
          cobraTaxaEntrega: Boolean(regraAtual?.cobraTaxaEntrega),
          valorTaxaEntrega:
            regraAtual?.valorTaxaEntrega != null ? Number(regraAtual.valorTaxaEntrega) : null,
          prazoBoletoDias:
            regraAtual?.prazoBoletoDias != null ? Number(regraAtual.prazoBoletoDias) : null,
          descontoBoletoPercentual:
            regraAtual?.descontoBoletoPercentual != null
              ? Number(regraAtual.descontoBoletoPercentual)
              : null,
          acumulaPedidos: Boolean(regraAtual?.acumulaPedidos),
          diasAcumulo: regraAtual?.diasAcumulo != null ? Number(regraAtual.diasAcumulo) : null,
          prazoBoletoAcumuloDias:
            regraAtual?.prazoBoletoAcumuloDias != null
              ? Number(regraAtual.prazoBoletoAcumuloDias)
              : null,
          precosEspeciais: (regraAtual?.precosEspeciais ?? []).map((p: { produtoId: string; preco: unknown }) => ({
            produtoId: p.produtoId,
            preco: Number(p.preco),
          })),
        });
      }

      await salvarPedido.mutateAsync({
        contaAzulCustomerId,
        dataEntrega: new Date(`${dia}T12:00:00`),
        tipoVenda: tipoVenda as "RECORRENTE_SEMANAL" | "RECORRENTE_QUINZENAL" | "PLANO" | "AVULSO",
        observacoes: obsPedido.trim() || `Importado do PDF: ${arquivoNome}`,
        freteCortesia: false,
        itens,
        avarias: [],
      });

      toast.success("Pedido lançado na agenda.");
      await Promise.all([
        utils.comercial.pedidos.agenda.invalidate(),
        utils.comercial.pedidos.dashboard.invalidate(),
        utils.comercial.pedidos.contextoCliente.invalidate(),
      ]);
      onPedidoSalvo(dia);
      resetTudo();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao lançar o pedido.");
    }
  }

  function resetTudo() {
    setArquivoNome("");
    setPdfBase64(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setDraft(null);
    setObsPedido("");
    setNotaRegra("");
    setAtualizarRegra(false);
    setTipoVenda("AVULSO");
    if (fileRef.current) fileRef.current.value = "";
  }

  const salvando = salvarPedido.isPending || salvarRegra.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetTudo();
        onOpenChange(v);
      }}
    >
      <DialogContent
        showCloseButton
        className="flex h-[98vh] max-h-[98vh] w-[98vw] max-w-[98vw] translate-x-[-50%] translate-y-[-50%] flex-col gap-2 overflow-hidden rounded-lg p-3 sm:max-w-[98vw] sm:p-4"
      >
        <DialogHeader className="shrink-0 space-y-0.5 pr-8">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4" />
            Importar pedido em PDF
          </DialogTitle>
          <DialogDescription className="text-xs">
            Compare o lançamento (esquerda) com o PDF (direita). Ajuste cliente, itens e dia antes de
            confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={analisar.isPending || salvando}
            onClick={() => fileRef.current?.click()}
          >
            {analisar.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analisando…
              </>
            ) : (
              <>
                <FileUp className="h-3.5 w-3.5" />
                {pdfBase64 ? "Trocar PDF" : "Escolher PDF"}
              </>
            )}
          </Button>
          {arquivoNome ? (
            <span className="text-xs text-muted-foreground truncate max-w-[min(420px,50vw)]">
              {arquivoNome}
            </span>
          ) : null}
          {draft ? (
            <span className="text-[11px] text-muted-foreground">
              {draft.modeloUsado} · {Math.round((draft.confiancaGeral || 0) * 100)}%
            </span>
          ) : null}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 grid-cols-1 lg:grid-cols-[minmax(380px,0.9fr)_minmax(0,1.2fr)]">
          <div className="min-h-0 overflow-y-auto rounded-lg border bg-card p-3 sm:p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pedido a lançar
            </p>

            {!draft && !analisar.isPending ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Envie o PDF para gerar o rascunho comparativo.
              </p>
            ) : null}

            {analisar.isPending ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                Lendo PDF e reconhecendo cliente / itens…
              </div>
            ) : null}

            {draft ? (
              <>
                {draft.avisos.length > 0 ? (
                  <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-50">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <ul className="list-disc pl-4 space-y-0.5">
                      {draft.avisos.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">Cliente</Label>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadge(draft.cliente.status)}`}
                    >
                      {draft.cliente.status}
                    </span>
                  </div>
                  {draft.cliente.nomePdf ? (
                    <p className="text-xs text-muted-foreground break-words">
                      No PDF: {draft.cliente.nomePdf}
                      {draft.cliente.documentoPdf ? ` · ${draft.cliente.documentoPdf}` : ""}
                    </p>
                  ) : null}
                  <Input
                    className="h-9 text-sm"
                    placeholder="Buscar outro cliente…"
                    value={buscaClienteManual}
                    onChange={(e) => setBuscaClienteManual(e.target.value)}
                  />
                  <select
                    className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                    value={draft.cliente.contaAzulCustomerId ?? ""}
                    onChange={(e) => patchCliente(e.target.value)}
                  >
                    <option value="">Selecione o cliente…</option>
                    {draft.cliente.candidatos.map((c) => (
                      <option key={`cand-${c.id}`} value={c.id}>
                        ★ {c.nome}
                        {c.detalhe ? ` (${c.detalhe})` : ""}
                      </option>
                    ))}
                    {clientesComId
                      .filter((c) => !draft.cliente.candidatos.some((x) => x.id === c.externalId))
                      .map((c) => (
                        <option key={c.externalId} value={c.externalId}>
                          {c.nome}
                          {c.cnpjCpf ? ` (${c.cnpjCpf})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Dia na agenda *</Label>
                    <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de venda *</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                      value={tipoVenda}
                      onChange={(e) => setTipoVenda(e.target.value)}
                    >
                      {TIPOS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Itens ({draft.itens.length})</Label>
                  {draft.itens.map((item) => (
                    <div key={item.chave} className="rounded-md border p-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug break-words">
                            PDF: {item.nomePdf}
                            {item.unidadePdf ? ` (${item.unidadePdf})` : ""}
                          </p>
                          {item.nomeResolvido ? (
                            <p className="text-xs text-muted-foreground mt-0.5 break-words">
                              Catálogo: {item.nomeResolvido}
                            </p>
                          ) : null}
                          <span
                            className={`inline-block mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadge(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removerItem(item.chave)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_100px]">
                        <select
                          className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                          value={item.produtoId ?? ""}
                          onChange={(e) => patchItem(item.chave, { produtoId: e.target.value || null })}
                        >
                          <option value="">Produto…</option>
                          {item.candidatos.map((p) => (
                            <option key={`cand-${p.id}`} value={p.id}>
                              ★ {p.nome}
                            </option>
                          ))}
                          {produtos
                            .filter((p) => !item.candidatos.some((c) => c.id === p.id))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                        </select>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-muted-foreground">Qtd</Label>
                          <Input
                            className="h-10 text-sm tabular-nums"
                            inputMode="decimal"
                            value={String(item.quantidade)}
                            onChange={(e) => {
                              const n = Number(e.target.value.replace(",", "."));
                              if (Number.isFinite(n)) patchItem(item.chave, { quantidade: n });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Observações do pedido</Label>
                  <Textarea
                    rows={2}
                    value={obsPedido}
                    onChange={(e) => setObsPedido(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>

                <div className="space-y-2 rounded-md border border-dashed p-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={atualizarRegra}
                      onChange={(e) => setAtualizarRegra(e.target.checked)}
                    />
                    Atualizar observação na regra deste cliente
                  </label>
                  {atualizarRegra ? (
                    <Textarea
                      rows={2}
                      value={notaRegra}
                      onChange={(e) => setNotaRegra(e.target.value)}
                      placeholder="Ex.: entrega só de manhã; embalagem especial…"
                    />
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          <div className="min-h-[45vh] lg:min-h-0 overflow-hidden rounded-lg border bg-muted/20 flex flex-col">
            <div className="shrink-0 border-b px-3 py-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                PDF original
              </p>
              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  Abrir em nova aba
                </a>
              ) : null}
            </div>
            {pdfUrl ? (
              <iframe
                title="PDF do pedido"
                src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&zoom=page-width`}
                className="min-h-0 flex-1 w-full bg-white"
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground text-center">
                O PDF aparece aqui para comparar com o lançamento.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetTudo();
              onOpenChange(false);
            }}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void confirmar()}
            disabled={!pronto.ok || analisar.isPending || salvando || !draft}
          >
            {salvando ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Lançando…
              </>
            ) : (
              "Confirmar e lançar na agenda"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
