import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Link as LinkIcon, MessageSquareText, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { TooltipInfo } from "@/components/comercial/ui/TooltipInfo";
import { trpc } from "@/lib/trpc";

type Aba = "pendentes" | "rascunhos" | "historico";

const TAB: { id: Aba; label: string; hint: string }[] = [
  { id: "pendentes", label: "Pendentes", hint: "Aguardando sua aprovação antes do ManyChat." },
  { id: "rascunhos", label: "Rascunhos", hint: "Edite e envie para aprovação quando estiver pronto." },
  { id: "historico", label: "Histórico", hint: "Enviadas, aprovadas agendadas ou falhas." },
];

function badgeTipo(t: string) {
  const map: Record<string, string> = {
    OFERTA: "bg-[#ECFDF5] text-[#047857] ring-[#10B981]/30",
    POS_VENDA: "bg-[#EFF6FF] text-[#1E40AF] ring-[#1E40AF]/20",
    REATIVACAO: "bg-[#FFFBEB] text-[#B45309] ring-[#F59E0B]/30",
    INFORMATIVO: "bg-[#F3F4F6] text-[#374151] ring-[#E5E7EB]",
  };
  return map[t] ?? "bg-[#F3F4F6] text-[#374151]";
}

function badgeStatus(s: string) {
  if (s === "AGUARDANDO_APROVACAO") return "bg-[#FEF2F2] text-[#B91C1C] ring-red-200";
  if (s === "RASCUNHO") return "bg-[#FFFBEB] text-[#B45309] ring-amber-200";
  if (s === "ENVIADA") return "bg-[#ECFDF5] text-[#047857] ring-emerald-200";
  if (s === "FALHA") return "bg-[#FEF2F2] text-[#991B1B] ring-red-300";
  if (s === "APROVADA") return "bg-[#EFF6FF] text-[#1E40AF] ring-blue-200";
  return "bg-[#F3F4F6] text-[#374151]";
}

export function Mensagens() {
  const utils = trpc.useUtils();
  const [aba, setAba] = useState<Aba>("pendentes");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectText, setRejectText] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const q = trpc.comercial.mensagens.fila.useQuery({ aba });
  const nPendentes = trpc.comercial.mensagens.fila.useQuery({ aba: "pendentes" }, { select: (d) => d.length, staleTime: 20_000 });
  const editar = trpc.comercial.mensagens.editar.useMutation({
    onSuccess: () => {
      void q.refetch();
      void utils.comercial.mensagens.fila.invalidate();
    },
  });
  const aprovar = trpc.comercial.mensagens.aprovarEEnviar.useMutation({
    onSuccess: () => {
      toast.success("Mensagem aprovada e enviada via ManyChat (stub pode falhar em dev).");
      void q.refetch();
      void utils.comercial.mensagens.fila.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const rejeitar = trpc.comercial.mensagens.rejeitar.useMutation({
    onSuccess: () => {
      toast.success("Devolvido para rascunho com justificativa.");
      setRejectId(null);
      setRejectText("");
      void q.refetch();
      void utils.comercial.mensagens.fila.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const lista = q.data ?? [];
  const taxaResposta = lista.length
    ? Math.round((lista.filter((m) => m.statusEnvio === "ENVIADA").length / Math.max(1, lista.length)) * 100)
    : null;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Mensagens"
        subtitle={
          <>
            Aprovação humana antes do envio pelo ManyChat. Edite o texto e envie com um clique.
            <TooltipInfo text="Em produção, o envio usa o telefone/WhatsApp do cadastro do cliente." />
          </>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
        {TAB.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAba(t.id)}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition duration-200 ${
              aba === t.id
                ? "bg-[#1E40AF] text-white shadow-[0_4px_12px_#00000020]"
                : "text-[#4B5563] hover:bg-[#F3F4F6]"
            }`}
          >
            <MessageSquareText className="h-4 w-4" />
            {t.label}
            {t.id === "pendentes" && (nPendentes.data ?? 0) > 0 ? (
              <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-xs font-bold text-[#B91C1C]">
                {nPendentes.data}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <p className="text-sm text-[#6B7280]">{TAB.find((x) => x.id === aba)?.hint}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_#00000014] lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Volume na aba</div>
          <div className="mt-1 text-3xl font-bold text-[#1E40AF]">{lista.length}</div>
        </div>
        <div className="rounded-lg border border-[#D1FAE5] bg-[#ECFDF5] p-4">
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[#047857]">
            Taxa envio (aba)
            <TooltipInfo text="Proporção aproximada neste recorte; métrica real virá do ManyChat em produção." />
          </div>
          <div className="mt-1 text-3xl font-bold text-[#10B981]">{taxaResposta != null ? `${taxaResposta}%` : "—"}</div>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div layout className="grid gap-4">
          {lista.map((m, i) => (
            <motion.article
              key={m.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.2) }}
              className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_#00000014]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="font-bold text-[#1E40AF] hover:underline" href={`/comercial/clientes/${m.cliente.id}`}>
                      {m.cliente.nome}
                    </Link>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${badgeTipo(m.tipoMensagem)}`}>
                      {m.tipoMensagem.replace(/_/g, " ")}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${badgeStatus(m.statusEnvio)}`}>
                      {m.statusEnvio.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Criada em {new Date(m.dataCriacao).toLocaleString("pt-BR")}
                    {m.cliente.telefoneWhatsapp ? ` · ${m.cliente.telefoneWhatsapp}` : ""}
                  </p>
                </div>
                <Link
                  href={`/comercial/clientes/${m.cliente.id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#10B981] hover:underline"
                >
                  Ver cliente
                  <LinkIcon className="h-4 w-4" />
                </Link>
              </div>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Conteúdo</label>
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#111827] outline-none transition duration-200 focus:border-[#10B981] focus:bg-white focus:ring-2 focus:ring-[#10B981]/25"
                value={drafts[m.id] ?? (m.conteudoFinal ?? m.conteudoSugerido)}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))
                }
                onBlur={(e) => {
                  const text = e.target.value.trim();
                  if (text && text !== (m.conteudoFinal ?? m.conteudoSugerido)) {
                    editar.mutate({ id: m.id, texto: text });
                  }
                }}
                aria-label="Texto da mensagem"
              />

              {aba === "pendentes" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#059669] hover:shadow-[0_4px_12px_#00000020] disabled:opacity-50"
                    disabled={aprovar.isPending}
                    onClick={() => {
                      const text = (drafts[m.id] ?? m.conteudoFinal ?? m.conteudoSugerido).trim();
                      if (!text) {
                        toast.error("Informe o texto da mensagem antes de aprovar.");
                        return;
                      }
                      aprovar.mutate({ id: m.id, texto: text });
                    }}
                  >
                    <Check className="h-4 w-4" />
                    Aprovar e enviar
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#FECACA] bg-white px-4 py-2 text-sm font-semibold text-[#B91C1C] transition duration-200 hover:bg-[#FEF2F2]"
                    onClick={() => setRejectId(m.id)}
                  >
                    <X className="h-4 w-4" />
                    Rejeitar
                  </button>
                </div>
              ) : null}
            </motion.article>
          ))}
        </motion.div>
      </AnimatePresence>

      {lista.length === 0 && !q.isLoading ? (
        <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-12 text-center text-[#6B7280]">
          Nada nesta aba. Troque acima ou gere mensagens em Oportunidades.
        </div>
      ) : null}

      <Dialog open={rejectId != null} onClose={() => setRejectId(null)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px]" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-xl">
            <DialogTitle className="text-lg font-bold text-[#1E40AF]">Rejeitar mensagem</DialogTitle>
            <p className="mt-2 text-sm text-[#6B7280]">Informe uma justificativa (mín. 3 caracteres). O status volta para rascunho.</p>
            <textarea
              value={rejectText}
              onChange={(e) => setRejectText(e.target.value)}
              className="mt-4 min-h-[100px] w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/25"
              placeholder="Ex.: Ajustar tom para cliente estratégico…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
                onClick={() => setRejectId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#1E40AF] px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-[#1D4ED8] disabled:opacity-50"
                disabled={rejectText.trim().length < 3 || rejeitar.isPending || !rejectId}
                onClick={() => {
                  if (!rejectId) return;
                  rejeitar.mutate({ id: rejectId, justificativa: rejectText.trim() });
                }}
              >
                Confirmar rejeição
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
