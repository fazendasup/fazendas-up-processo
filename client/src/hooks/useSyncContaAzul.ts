import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { isTrpcAbortError } from "@/lib/trpc-fetch";

type SyncContaAzulCallbacks = {
  onSuccess?: (data: { pedidosGravados: number | null; inteligenciaOportunidades: number | null }) => void;
};

export function useSyncContaAzul(callbacks?: SyncContaAzulCallbacks) {
  const utils = trpc.useUtils();
  const [aguardando, setAguardando] = useState(false);
  const syncStartedAtRef = useRef<number>(0);

  const status = trpc.comercial.integracoes.statusSyncContaAzul.useQuery(undefined, {
    enabled: aguardando,
    refetchInterval: aguardando ? 2_500 : false,
  });

  const invalidarCachesComercial = async () => {
    await Promise.all([
      utils.comercial.dashboard.resumo.invalidate(),
      utils.comercial.dashboard.serieFaturamento.invalidate(),
      utils.comercial.kpis.resumoCalculado.invalidate(),
      utils.comercial.kpis.snapshots.invalidate(),
      utils.comercial.clientes.listar.invalidate(),
      utils.comercial.clientes.listarCarteira.invalidate(),
      utils.comercial.oportunidades.listar.invalidate(),
      utils.comercial.execucoes.resumo.invalidate(),
      utils.comercial.execucoes.listar.invalidate(),
    ]);
  };

  const sync = trpc.comercial.integracoes.sincronizarContaAzul.useMutation({
    onSuccess: () => {
      syncStartedAtRef.current = Date.now();
      setAguardando(true);
      toast.info("Sincronização Conta Azul iniciada. Em geral termina em poucos segundos.");
    },
    onError: (e) => {
      const msg = e.message ?? "";
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
        toast.success(
          pedidos != null
            ? `Sync concluído: ${pedidos} pedido(s) atualizados${
                intel != null ? `; ${intel} oportunidade(s) de sistema` : ""
              }.`
            : "Sync Conta Azul concluído com sucesso.",
        );
        return;
      }

      if (status.data!.lastStatus === "FALHA") {
        toast.error(status.data!.lastError ?? "Sync Conta Azul falhou");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks opcionais do pai
  }, [aguardando, status.data]);

  const busy = sync.isPending || aguardando || Boolean(status.data?.running);

  return { sync, busy, aguardando };
}
