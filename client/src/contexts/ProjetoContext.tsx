import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getActiveProjetoId, setActiveProjetoId } from "@/lib/projeto-header";
import type { ModulosProjetoMap } from "@/lib/projetoModulosNav";

/** Espelha `OperationalCounts` no servidor — contagens para ver onde estão torres/ciclos. */
export type OperationalCounts = {
  torres: number;
  andares: number;
  ciclos: number;
  caixasAgua: number;
  variedades: number;
  bancadas: number;
  planosPlantio: number;
};

export const EMPTY_OPERATIONAL_COUNTS: OperationalCounts = {
  torres: 0,
  andares: 0,
  ciclos: 0,
  caixasAgua: 0,
  variedades: 0,
  bancadas: 0,
  planosPlantio: 0,
};

export type ProjetoListItem = {
  id: number;
  nome: string;
  tipo: string;
  status: string;
  role: string;
  /** Módulo de caixas d'água (relevante em microverdes). Por omissão true. */
  usarCaixaAgua: boolean;
  /** Preenchido na página Projetos via `projetos.operationalCounts`; no resto da app usa-se `EMPTY_OPERATIONAL_COUNTS`. */
  operationalCounts: OperationalCounts;
};

type ProjetoContextValue = {
  projetos: ProjetoListItem[];
  activeProjetoId: number | null;
  activeProjeto: ProjetoListItem | null;
  ready: boolean;
  switchProjeto: (id: number) => void;
  isSwitching: boolean;
  /** Módulos contratados do projeto ativo; `null` se sem projeto ou ainda a carregar. */
  modulosAtivos: ModulosProjetoMap | null;
};

const ProjetoContext = createContext<ProjetoContextValue | null>(null);

export function ProjetoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const [activeProjetoId, setActiveState] = useState<number | null>(() => getActiveProjetoId());
  /** Alinhado ao LS para não chamar switchActive no primeiro paint se o id já está correto (evita clear/refetch em cascata). */
  const lastSyncedId = useRef<number | null>(
    typeof window !== "undefined" ? getActiveProjetoId() : null,
  );

  const listQuery = trpc.projetos.list.useQuery(undefined, {
    enabled: Boolean(user),
    staleTime: 60_000,
    /** Evita lista de projetos a ir a [] durante refetch após trocar projeto / invalidar — reduz piscar no header/menu. */
    placeholderData: keepPreviousData,
  });

  const modulosQuery = trpc.projetos.modulosAtivos.useQuery(undefined, {
    enabled: Boolean(user && activeProjetoId != null),
    staleTime: 60_000,
  });

  const switchMutation = trpc.projetos.switchActive.useMutation({
    onSuccess: async () => {
      /** Não usar clear(): apagava projetos.list e tudo mais → refetch em cascata e piscar no header/menu. */
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const s = JSON.stringify(q.queryKey);
          if (s.includes('"projetos"') && s.includes('"list"')) return false;
          return true;
        },
      });
      await utils.projetos.modulosAtivos.invalidate();
    },
  });

  const projetos: ProjetoListItem[] = useMemo(() => {
    const rows = listQuery.data ?? [];
    return rows.map((row) => ({
      id: row.projeto.id,
      nome: row.projeto.nome,
      tipo: row.projeto.tipo,
      status: row.projeto.status,
      role: row.role,
      usarCaixaAgua: (row.projeto as { usarCaixaAgua?: boolean }).usarCaixaAgua !== false,
      operationalCounts: EMPTY_OPERATIONAL_COUNTS,
    }));
  }, [listQuery.data]);

  useEffect(() => {
    if (!user) {
      lastSyncedId.current = null;
      return;
    }
    if (!listQuery.isSuccess) return;
    const rows = listQuery.data ?? [];
    /** Só o projeto ativo (não arquivado) pode ser o contexto operacional; admins podem ver arquivados na lista. */
    const ativos = rows.filter((r) => r.projeto.status === "ativo");
    if (ativos.length === 0) {
      setActiveProjetoId(null);
      setActiveState(null);
      lastSyncedId.current = null;
      return;
    }
    const fromLs = getActiveProjetoId();
    const idsAtivos = new Set(ativos.map((r) => r.projeto.id));
    if (fromLs && idsAtivos.has(fromLs)) {
      setActiveState(fromLs);
    } else {
      const next = ativos[0].projeto.id;
      setActiveProjetoId(next);
      setActiveState(next);
      lastSyncedId.current = null;
    }
  }, [user, listQuery.isSuccess, listQuery.data]);

  useEffect(() => {
    if (!user || !listQuery.isSuccess) return;
    if (activeProjetoId == null) return;
    const row = projetos.find((p) => p.id === activeProjetoId);
    if (!row || row.status !== "ativo") return;
    if (lastSyncedId.current === activeProjetoId) return;
    lastSyncedId.current = activeProjetoId;
    switchMutation.mutate({ projetoId: activeProjetoId });
    // switchMutation é estável o suficiente; incluir na deps recria o efeito em alguns builds e pode piscar o layout.
  }, [user, listQuery.isSuccess, projetos, activeProjetoId]);

  const switchProjeto = useCallback(
    (id: number) => {
      setActiveProjetoId(id);
      setActiveState(id);
      lastSyncedId.current = id;
      switchMutation.mutate({ projetoId: id });
    },
    [switchMutation],
  );

  const activeProjeto =
    projetos.find((p) => p.id === activeProjetoId && p.status === "ativo") ?? null;

  const modulosAtivos: ModulosProjetoMap | null =
    activeProjetoId == null ? null : (modulosQuery.data ?? null);

  /** Após o primeiro fetch (sucesso ou erro) para não bloquear o restante da app em loading infinito. */
  const ready = !user || listQuery.isFetched;

  const value = useMemo<ProjetoContextValue>(
    () => ({
      projetos,
      activeProjetoId,
      activeProjeto,
      ready,
      switchProjeto,
      isSwitching: switchMutation.isPending,
      modulosAtivos,
    }),
    [projetos, activeProjetoId, activeProjeto, ready, switchProjeto, switchMutation.isPending, modulosAtivos],
  );

  return <ProjetoContext.Provider value={value}>{children}</ProjetoContext.Provider>;
}

export function useProjeto(): ProjetoContextValue {
  const ctx = useContext(ProjetoContext);
  if (!ctx) throw new Error("useProjeto must be used within ProjetoProvider");
  return ctx;
}
