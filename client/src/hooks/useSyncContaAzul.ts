import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { isTrpcAbortError } from "@/lib/trpc-fetch";

export type ContaAzulSyncEscopoCliente = "vendas" | "clientes" | "completo";

type SyncContaAzulCallbacks = {
  escopo?: ContaAzulSyncEscopoCliente;
  /** Sem toast ao abrir a página. O botão manual continua avisando. */
  silencioso?: boolean;
  onSuccess?: (data: { pedidosGravados: number | null; inteligenciaOportunidades: number | null }) => void;
};

const PERFIS_SYNC = new Set(["ADMIN", "GERENTE_COMERCIAL"]);

function textoInicio(escopo: ContaAzulSyncEscopoCliente) {
  if (escopo === "vendas") return "Atualizando as vendas da Conta Azul.";
  if (escopo === "clientes") return "Atualizando os clientes da Conta Azul.";
  return "Sincronização Conta Azul iniciada. Leva alguns minutos e depois atualiza os pedidos.";
}

export function useSyncContaAzul(callbacks?: SyncContaAzulCallbacks) {
  const utils = trpc.useUtils();
  const [aguardando, setAguardando] = useState(false);
  const syncStartedAtRef = useRef<number>(0);
  const escopoRef = useRef<ContaAzulSyncEscopoCliente>(callbacks?.escopo ?? "completo");
  const silenciosoRef = useRef(callbacks?.silencioso ?? false);
  const silenciosoPadraoRef = useRef(callbacks?.silencioso ?? false);
  silenciosoPadraoRef.current = callbacks?.silencioso ?? false;

  const status = trpc.comercial.integracoes.statusSyncContaAzul.useQuery(undefined, {
    enabled: aguardando,
    refetchInterval: aguardando ? 2_500 : false,
  });

  const invalidarCachesComercial = async () => {
    const escopo = escopoRef.current;
    const vendas = escopo === "vendas" || escopo === "completo";
    const clientes = escopo === "clientes" || escopo === "completo";
    await Promise.all([
      vendas ? utils.comercial.dashboard.resumo.invalidate() : Promise.resolve(),
      vendas ? utils.comercial.dashboard.serieFaturamento.invalidate() : Promise.resolve(),
      escopo === "completo" ? utils.comercial.kpis.resumoCalculado.invalidate() : Promise.resolve(),
      escopo === "completo" ? utils.comercial.kpis.snapshots.invalidate() : Promise.resolve(),
      clientes ? utils.comercial.clientes.listar.invalidate() : Promise.resolve(),
      clientes ? utils.comercial.clientes.listarCarteira.invalidate() : Promise.resolve(),
      escopo === "completo" ? utils.comercial.oportunidades.listar.invalidate() : Promise.resolve(),
      escopo === "completo" ? utils.comercial.execucoes.resumo.invalidate() : Promise.resolve(),
      escopo === "completo" ? utils.comercial.execucoes.listar.invalidate() : Promise.resolve(),
      vendas ? utils.comercial.pedidos.relatorioHistorico.invalidate() : Promise.resolve(),
      vendas ? utils.comercial.pedidos.conciliacaoPainel.invalidate() : Promise.resolve(),
      vendas ? utils.comercial.pedidos.statusSemana.invalidate() : Promise.resolve(),
      vendas ? utils.comercial.pedidos.dashboard.invalidate() : Promise.resolve(),
      vendas ? utils.comercial.pedidos.agenda.invalidate() : Promise.resolve(),
      escopo === "completo" ? utils.comercial.relatorios.resumo.invalidate() : Promise.resolve(),
    ]);
  };

  const sync = trpc.comercial.integracoes.sincronizarContaAzul.useMutation({
    onSuccess: (data, variables) => {
      if (variables?.escopo) escopoRef.current = variables.escopo;
      if (data.recente || !data.emSegundoPlano) return;
      syncStartedAtRef.current = Date.now();
      setAguardando(true);
      if (!silenciosoRef.current) toast.info(textoInicio(escopoRef.current));
    },
    onError: (e) => {
      const msg = e.message ?? "";
      if (silenciosoRef.current && (e.data?.code === "FORBIDDEN" || msg === "Permissão insuficiente")) return;
      if (msg.includes("Já existe uma sincronização")) {
        syncStartedAtRef.current = Date.now();
        setAguardando(true);
        return;
      }
      if (silenciosoRef.current) return;
      if (msg === "Não autenticado") {
        toast.error("Sua sessão expirou. Saia, entre de novo e teste o sync.");
        return;
      }
      if (isTrpcAbortError(e)) {
        toast.error("A conexão foi interrompida. Verifique se o sync ainda está rodando e atualize a página.");
        return;
      }
      toast.error(msg || "Falha ao iniciar o sync");
    },
  });

  useEffect(() => {
    if (!aguardando || !status.data) return;
    if (status.data.running) return;

    const lastAt = status.data.lastAt ? new Date(status.data.lastAt).getTime() : 0;
    const started = syncStartedAtRef.current;
    const elapsed = Date.now() - started;

    if (lastAt < started - 500 && elapsed < 20_000) return;

    setAguardando(false);

    void (async () => {
      await invalidarCachesComercial();

      if (status.data!.lastStatus === "SUCESSO") {
        const pedidos = status.data!.pedidosGravados;
        const intel = status.data!.inteligenciaOportunidades;
        callbacks?.onSuccess?.({
          pedidosGravados: pedidos,
          inteligenciaOportunidades: intel,
        });
        const escopo = escopoRef.current;
        if (escopo === "vendas") {
          toast.success(
            pedidos != null ? `Vendas atualizadas: ${pedidos} pedido(s).` : "Vendas da Conta Azul atualizadas.",
          );
        } else if (escopo === "clientes") {
          toast.success("Clientes da Conta Azul atualizados.");
        } else {
          toast.success(
            pedidos != null
              ? `Sync concluído: ${pedidos} pedido(s) atualizados${
                  intel != null ? `; ${intel} oportunidade(s) de sistema` : ""
                }.`
              : "Sync Conta Azul concluído com sucesso.",
          );
        }
        return;
      }

      if (status.data!.lastStatus === "FALHA") {
        toast.error(status.data!.lastError ?? "Sync Conta Azul falhou");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks opcionais do pai
  }, [aguardando, status.data]);

  const busy = sync.isPending || aguardando || Boolean(status.data?.running);

  const iniciar = useCallback(
    (
      input?: { escopo?: ContaAzulSyncEscopoCliente; aoAbrirPagina?: boolean },
      opts?: { silencioso?: boolean }
    ) => {
      if (input?.escopo) escopoRef.current = input.escopo;
      silenciosoRef.current = opts?.silencioso ?? silenciosoPadraoRef.current;
      sync.mutate({
        escopo: input?.escopo ?? escopoRef.current,
        aoAbrirPagina: input?.aoAbrirPagina,
      });
    },
    [sync]
  );

  return { sync, busy, aguardando, iniciar };
}

/** Atualiza só o recorte da página, uma vez ao abrir. */
export function useSyncContaAzulNaPagina(escopo: "vendas" | "clientes") {
  const me = trpc.comercial.pedidos.me.useQuery(undefined, { staleTime: 5 * 60_000 });
  const pode = PERFIS_SYNC.has(me.data?.perfil ?? "");
  const { iniciar, busy } = useSyncContaAzul({ escopo });
  const disparou = useRef(false);

  useEffect(() => {
    if (!pode || disparou.current) return;
    disparou.current = true;
    iniciar({ escopo, aoAbrirPagina: true }, { silencioso: true });
  }, [pode, escopo, iniciar]);

  return { busy, iniciar };
}
