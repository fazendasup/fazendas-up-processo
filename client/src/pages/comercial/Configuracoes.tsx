import { motion } from "framer-motion";
import { Activity, KeyRound, RefreshCw, Shield, Sliders, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useSearchParams } from "@/hooks/useSearchParams";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { Spinner } from "@/components/comercial/ui/Spinner";
import { TooltipInfo } from "@/components/comercial/ui/TooltipInfo";
import { useSyncContaAzul } from "@/hooks/useSyncContaAzul";
import { trpc } from "@/lib/trpc";

export function Configuracoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const ca = searchParams.get("ca");
    if (!ca) return;
    if (ca === "connected") {
      toast.success("Conta Azul conectada. Você já pode testar a sincronização.");
    } else if (ca === "error") {
      const reason = searchParams.get("reason");
      toast.error(
        reason
          ? `Conta Azul não concluiu: ${reason}. Tente de novo em «Conectar Conta Azul».`
          : "Não foi possível salvar o login da Conta Azul. Confira Redirect URI no portal e .env; depois clique de novo em Conectar.",
      );
    }
    const next = new URLSearchParams(searchParams);
    next.delete("ca");
    next.delete("reason");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const utils = trpc.useUtils();

  const templates = trpc.comercial.configuracoes.listarTemplates.useQuery(undefined, { retry: false });
  const regras = trpc.comercial.configuracoes.listarRegras.useQuery(undefined, { retry: false });
  const usuarios = trpc.comercial.configuracoes.listarUsuarios.useQuery(undefined, { retry: false });
  const execResumo = trpc.comercial.execucoes.resumo.useQuery(undefined, { retry: false });
  const execRecentes = trpc.comercial.execucoes.listar.useQuery({ limite: 12 }, { retry: false });

  const contaAzulAuth = trpc.comercial.integracoes.urlAutorizacaoContaAzul.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e) => toast.error(e.message ?? "Não foi possível iniciar o Conta Azul"),
  });

  const { sync, busy: syncBusy } = useSyncContaAzul();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<"PROMOTER" | "GERENTE_COMERCIAL" | "COMERCIAL" | "OPERACOES" | "ADMIN">("COMERCIAL");
  const [senhaTemp, setSenhaTemp] = useState("");

  const convidar = trpc.comercial.configuracoes.convidarUsuario.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado.");
      setNome("");
      setEmail("");
      setSenhaTemp("");
      void usuarios.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Configurações"
        subtitle={
          <>
            Integrações OAuth, templates aprovados e políticas de classificação. Alterações sensíveis ficam restritas a
            perfis administrativos.
            <TooltipInfo text="Chaves de API ficam no servidor (.env); a UI só dispara testes e OAuth seguro." />
          </>
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border-2 border-[#1E40AF]/25 bg-white p-6 shadow-[0_1px_3px_#00000014]"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-[#1E40AF]">Integração</p>
        <h2 className="mt-1 text-lg font-bold text-[#1E40AF]">Conta Azul</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Conecte via OAuth. Com o servidor no ar, a sincronização roda sozinha a cada{" "}
          <strong>5 minutos</strong> (e uma vez ~1 min após reiniciar). Use o botão abaixo só para forçar agora.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-black hover:shadow-[0_4px_12px_#00000020] disabled:opacity-50"
            disabled={contaAzulAuth.isPending}
            onClick={() =>
              contaAzulAuth.mutate({
                returnUrl: `${window.location.origin}/comercial/configuracoes`,
              })
            }
          >
            {contaAzulAuth.isPending ? <Spinner className="h-4 w-4" /> : <Shield className="h-4 w-4 text-[#10B981]" />}
            Conectar Conta Azul (OAuth)
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#059669] hover:shadow-[0_4px_12px_#00000020] disabled:opacity-50"
            disabled={syncBusy}
            onClick={() => sync.mutate()}
          >
            {syncBusy ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar agora
          </button>
        </div>
        <p className="mt-4 text-xs text-[#9CA3AF]">
          Após o retorno do OAuth você será redirecionado para esta página com{" "}
          <code className="rounded bg-[#F3F4F6] px-1">?ca=connected</code>. Não abra só a URL do ngrok na raiz (isso
          mostra JSON da API); use sempre este site em localhost:5173 e este botão.
        </p>
      </motion.section>

      <Tabs defaultValue="templates" className="mt-2">
        <TabsList className="flex h-auto flex-wrap gap-2 rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-[0_1px_3px_#00000014]">
          <TabsTrigger value="templates" className="gap-2 data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white">
            <KeyRound className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="regras" className="gap-2 data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white">
            <Sliders className="h-4 w-4" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2 data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="execucoes" className="gap-2 data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white">
            <Activity className="h-4 w-4" />
            Execuções API
          </TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="mt-6">
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_#00000014]"
            >
              <h2 className="text-lg font-bold text-[#1E40AF]">Templates de mensagem</h2>
              <p className="mt-1 text-sm text-[#6B7280]">Textos aprovados para campanhas e respostas rápidas.</p>
              {templates.isLoading ? (
                <div className="mt-6 flex justify-center py-8">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : templates.error ? (
                <p className="mt-4 rounded-lg bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                  {templates.error.message} — apenas gerência/admin visualiza esta lista.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {(templates.data ?? []).map((t) => (
                    <li
                      key={t.id}
                      className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 transition duration-200 hover:border-[#10B981]/40 hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#111827]">{t.nome}</span>
                        <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-bold text-[#1E40AF] ring-1 ring-[#1E40AF]/20">
                          {t.tipo}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">{t.corpo}</p>
                    </li>
                  ))}
                  {(templates.data ?? []).length === 0 ? (
                    <p className="text-sm text-[#6B7280]">Nenhum template cadastrado.</p>
                  ) : null}
                </ul>
              )}
            </motion.section>
        </TabsContent>

        <TabsContent value="regras" className="mt-6">
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_#00000014]"
            >
              <h2 className="text-lg font-bold text-[#1E40AF]">Regras de classificação</h2>
              <p className="mt-1 text-sm text-[#6B7280]">Regras ativas que alimentam score e status do cliente.</p>
              {regras.isLoading ? (
                <div className="mt-6 flex justify-center py-8">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : regras.error ? (
                <p className="mt-4 rounded-lg bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{regras.error.message}</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {(regras.data ?? []).map((r) => (
                    <li key={r.id} className="rounded-lg border border-[#E5E7EB] p-4">
                      <div className="font-semibold text-[#111827]">{r.nome}</div>
                      <pre className="mt-2 max-h-40 overflow-auto rounded bg-[#111827] p-3 text-xs text-[#E5E7EB]">
                        {JSON.stringify(r.payload, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_#00000014]"
            >
              <h2 className="text-lg font-bold text-[#1E40AF]">Usuários</h2>
              <p className="mt-1 text-sm text-[#6B7280]">Somente administradores convidam novos acessos.</p>
              {usuarios.isLoading ? (
                <div className="mt-6 flex justify-center py-8">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : usuarios.error ? (
                <p className="mt-4 rounded-lg bg-[#FFFBEB] px-4 py-3 text-sm text-[#B45309]">{usuarios.error.message}</p>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto rounded-lg border border-[#E5E7EB]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[#F9FAFB] text-xs font-bold uppercase text-[#6B7280]">
                        <tr>
                          <th className="px-4 py-2 text-left">Nome</th>
                          <th className="px-4 py-2 text-left">E-mail</th>
                          <th className="px-4 py-2 text-left">Perfil</th>
                          <th className="px-4 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F3F4F6]">
                        {(usuarios.data ?? []).map((u) => (
                          <tr key={u.id} className="hover:bg-[#F9FAFB]">
                            <td className="px-4 py-2 font-medium text-[#111827]">{u.nome}</td>
                            <td className="px-4 py-2 text-[#6B7280]">{u.email}</td>
                            <td className="px-4 py-2">
                              <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-bold text-[#047857]">
                                {u.perfil}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-[#6B7280]">{u.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-8 border-t border-[#F3F4F6] pt-6">
                    <h3 className="text-sm font-bold text-[#1E40AF]">Convidar usuário</h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-semibold uppercase text-[#6B7280]">
                        Nome
                        <input
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase text-[#6B7280]">
                        E-mail
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase text-[#6B7280]">
                        Perfil
                        <select
                          value={perfil}
                          onChange={(e) => setPerfil(e.target.value as typeof perfil)}
                          className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
                        >
                          <option value="PROMOTER">Promoter</option>
                          <option value="COMERCIAL">Comercial</option>
                          <option value="GERENTE_COMERCIAL">Gerente comercial</option>
                          <option value="OPERACOES">Operações</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase text-[#6B7280]">
                        Senha temporária (mín. 8)
                        <input
                          type="password"
                          value={senhaTemp}
                          onChange={(e) => setSenhaTemp(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="mt-4 rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#059669] disabled:opacity-50"
                      disabled={convidar.isPending || nome.length < 2 || !email.includes("@") || senhaTemp.length < 8}
                      onClick={() =>
                        convidar.mutate({ nome, email, perfil, senhaTemporaria: senhaTemp })
                      }
                    >
                      {convidar.isPending ? "Salvando…" : "Criar usuário"}
                    </button>
                  </div>
                </>
              )}
            </motion.section>
        </TabsContent>

        <TabsContent value="execucoes" className="mt-6">
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_#00000014]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#1E40AF]">Execuções de API</h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Auditoria técnica de sincronizações e integrações — não é indicador comercial.
                  </p>
                </div>
                <Link
                  href="/comercial/execucoes"
                  className="shrink-0 rounded-lg bg-[#1E40AF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E3A8A]"
                >
                  Histórico completo
                </Link>
              </div>

              {execResumo.isLoading ? (
                <div className="mt-6 flex justify-center py-6">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : execResumo.error ? (
                <p className="mt-4 rounded-lg bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{execResumo.error.message}</p>
              ) : (
                <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#374151]">
                  <span className="font-semibold text-[#111827]">Confiabilidade</span> — taxa de sucesso global:{" "}
                  <span className="font-bold text-[#047857]">
                    {Math.round((execResumo.data?.taxaSucessoApis ?? 1) * 100)}%
                  </span>
                  {execResumo.data?.totalExecucoes != null ? (
                    <span className="text-[#6B7280]">
                      {" "}
                      ({execResumo.data.execucoesSucesso} de {execResumo.data.totalExecucoes} execuções)
                    </span>
                  ) : null}
                </div>
              )}

              <h3 className="mt-6 text-sm font-bold text-[#1E40AF]">Últimas execuções</h3>
              {execRecentes.isLoading ? (
                <div className="mt-4 flex justify-center py-8">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : execRecentes.error ? (
                <p className="mt-4 rounded-lg bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{execRecentes.error.message}</p>
              ) : (
                <ul className="mt-3 divide-y divide-[#E5E7EB] rounded-lg border border-[#E5E7EB]">
                  {(execRecentes.data ?? []).map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="font-semibold text-[#111827]">{e.acaoApi}</span>
                      <span
                        className={
                          e.statusExecucao === "SUCESSO"
                            ? "font-bold text-[#047857]"
                            : e.statusExecucao === "FALHA"
                              ? "font-bold text-[#B91C1C]"
                              : "font-bold text-[#B45309]"
                        }
                      >
                        {e.statusExecucao}
                      </span>
                    </li>
                  ))}
                  {(execRecentes.data ?? []).length === 0 ? (
                    <li className="px-4 py-10 text-center text-sm text-[#6B7280]">Sem execuções registradas ainda.</li>
                  ) : null}
                </ul>
              )}
            </motion.section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
