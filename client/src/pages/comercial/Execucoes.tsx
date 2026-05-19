import { Fragment, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { TooltipInfo } from "@/components/comercial/ui/TooltipInfo";
import { trpc } from "@/lib/trpc";

export function Execucoes() {
  const [acao, setAcao] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [aberto, setAberto] = useState<string | null>(null);

  const q = trpc.comercial.execucoes.listar.useQuery({
    limite: 150,
    acao: acao ? (acao as "SYNC_CA" | "ENVIO_MC" | "ANALISE_IG" | "PESQUISA_WEB") : undefined,
    status: status ? (status as "SUCESSO" | "FALHA" | "PENDENTE") : undefined,
  });

  const rows = q.data ?? [];
  const taxa = useMemo(() => {
    const ok = rows.filter((r) => r.statusExecucao === "SUCESSO").length;
    const tot = rows.length;
    if (!tot) return null;
    return Math.round((ok / tot) * 100);
  }, [rows]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Execuções das APIs"
        subtitle={
          <>
            Auditoria de chamadas Conta Azul, ManyChat e outros conectores — expanda para ver JSON e erros.
            <TooltipInfo text="Retry automático pode ser acionado pelo backend; use Configurações para novo sync." />
          </>
        }
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#6B7280] shadow-sm transition duration-200 hover:bg-[#F9FAFB]"
            onClick={() => toast.message("Reexecução em lote virá com fila de jobs no backend.")}
          >
            <RefreshCw className="h-4 w-4" />
            Retry (roadmap)
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_#00000014]">
        <div>
          <label className="text-xs font-semibold uppercase text-[#6B7280]">API / ação</label>
          <select
            value={acao}
            onChange={(e) => setAcao(e.target.value)}
            className="mt-1 block rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm font-medium text-[#111827] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
          >
            <option value="">Todas</option>
            <option value="SYNC_CA">Sync Conta Azul</option>
            <option value="ENVIO_MC">Envio ManyChat</option>
            <option value="ANALISE_IG">Análise Instagram</option>
            <option value="PESQUISA_WEB">Pesquisa web</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-[#6B7280]">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm font-medium text-[#111827] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
          >
            <option value="">Todos</option>
            <option value="SUCESSO">Sucesso</option>
            <option value="FALHA">Falha</option>
            <option value="PENDENTE">Pendente</option>
          </select>
        </div>
        <div className="flex flex-1 flex-col justify-end">
          <div className="text-xs font-semibold uppercase text-[#6B7280]">Taxa de sucesso (amostra)</div>
          <div className="text-2xl font-bold text-[#10B981]">{taxa != null ? `${taxa}%` : "—"}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_#00000014]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#F3F4F6] bg-[#F9FAFB] text-xs font-bold uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="w-10 px-2"></th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Duração</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {rows.map((e) => {
                const open = aberto === e.id;
                const ok = e.statusExecucao === "SUCESSO";
                return (
                  <Fragment key={e.id}>
                    <tr className="bg-white transition duration-200 hover:bg-[#F9FAFB]">
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="rounded p-1 text-[#6B7280] transition duration-200 hover:bg-[#E5E7EB] hover:text-[#1E40AF]"
                          aria-expanded={open}
                          onClick={() => setAberto(open ? null : e.id)}
                        >
                          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#111827]">{e.acaoApi}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${
                            ok
                              ? "bg-[#ECFDF5] text-[#047857] ring-[#10B981]/40"
                              : e.statusExecucao === "FALHA"
                                ? "bg-[#FEF2F2] text-[#B91C1C] ring-red-200"
                                : "bg-[#FFFBEB] text-[#B45309] ring-amber-200"
                          }`}
                        >
                          {e.statusExecucao}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#374151]">{e.cliente?.nome ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#6B7280]">
                        {new Date(e.dataExecucao).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">{e.duracaoMs != null ? `${e.duracaoMs} ms` : "—"}</td>
                    </tr>
                    <AnimatePresence>
                      {open ? (
                        <tr className="bg-[#F9FAFB]">
                          <td colSpan={6} className="px-4 py-4">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="rounded-lg border border-[#E5E7EB] bg-white p-4 text-xs shadow-sm"
                            >
                              <div className="font-semibold text-[#1E40AF]">Detalhes (JSON)</div>
                              <pre className="mt-2 max-h-48 overflow-auto rounded bg-[#111827] p-3 text-[#E5E7EB]">
                                {JSON.stringify(e.detalhesExecucao, null, 2)}
                              </pre>
                              {e.mensagemErro ? (
                                <p className="mt-2 text-sm font-medium text-[#DC2626]">Erro: {e.mensagemErro}</p>
                              ) : null}
                              <button
                                type="button"
                                className="mt-3 rounded-lg bg-[#1E40AF] px-3 py-1.5 text-xs font-semibold text-white transition duration-200 hover:bg-[#1D4ED8] hover:shadow-[0_4px_12px_#00000020]"
                                onClick={() => toast.message("Use Configurações → sync Conta Azul ou reenvie mensagem na fila.")}
                              >
                                Retry falha (manual)
                              </button>
                            </motion.div>
                          </td>
                        </tr>
                      ) : null}
                    </AnimatePresence>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !q.isLoading ? (
          <div className="p-12 text-center text-[#6B7280]">Nenhuma execução registrada.</div>
        ) : null}
      </div>
    </div>
  );
}
