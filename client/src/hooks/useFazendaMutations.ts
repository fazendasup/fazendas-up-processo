// ============================================================
// useFazendaMutations — Hook centralizado para todas as mutações tRPC
// v3: Optimistic updates for furos/perfis, debounced invalidation
// ============================================================

import { trpc } from '@/lib/trpc';
import { useFazenda } from '@/contexts/FazendaContext';
import { useCallback, useRef } from 'react';
import type { Furo, PerfilData } from '@/lib/types';

export function useFazendaMutations() {
  const utils = trpc.useUtils();
  const { data, updateData } = useFazenda();

  // Debounced invalidation: coalesce multiple rapid mutations into one refetch
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedInvalidate = useCallback(() => {
    if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
    invalidateTimer.current = setTimeout(() => {
      utils.fazenda.loadAll.invalidate();
      invalidateTimer.current = null;
    }, 500);
  }, [utils]);

  const invalidate = useCallback(() => {
    // Use debounced for all invalidations to prevent storm
    if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
    invalidateTimer.current = setTimeout(() => {
      utils.fazenda.loadAll.invalidate();
      invalidateTimer.current = null;
    }, 300);
  }, [utils]);

  // Helper: apply optimistic furo update to local data
  const optimisticFuroUpdate = useCallback((andarFrontId: string, perfilIndex: number, furoIndex: number, status?: string, variedadeId?: string | null) => {
    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) => {
        if (a.id !== andarFrontId) return a;
        const existingFuros = a.furos || [];
        const idx = existingFuros.findIndex((f) => f.perfilIndex === perfilIndex && f.furoIndex === furoIndex);
        const newFuros = [...existingFuros];
        if (idx >= 0) {
          newFuros[idx] = {
            ...newFuros[idx],
            ...(status !== undefined ? { status: status as Furo['status'] } : {}),
            ...(variedadeId !== undefined ? { variedadeId: variedadeId || undefined } : {}),
          };
        } else {
          newFuros.push({
            perfilIndex,
            furoIndex,
            status: (status || 'vazio') as Furo['status'],
            variedadeId: variedadeId || undefined,
          });
        }
        return { ...a, furos: newFuros };
      }),
    }));
  }, [updateData]);

  // Helper: apply optimistic perfil update
  const optimisticPerfilUpdate = useCallback((andarFrontId: string, perfilIndex: number, updates: Partial<PerfilData>) => {
    updateData((prev) => ({
      ...prev,
      andares: prev.andares.map((a) => {
        if (a.id !== andarFrontId) return a;
        const existingPerfis = a.perfis || [];
        const idx = existingPerfis.findIndex((p) => p.perfilIndex === perfilIndex);
        const newPerfis = [...existingPerfis];
        if (idx >= 0) {
          newPerfis[idx] = { ...newPerfis[idx], ...updates };
        } else {
          newPerfis.push({ perfilIndex, ativo: false, ...updates });
        }
        return { ...a, perfis: newPerfis };
      }),
    }));
  }, [updateData]);

  // Helper: find andar front ID from DB ID
  const findAndarFrontId = useCallback((dbId: number): string | undefined => {
    return data.andares.find((a) => a.id === `a-${dbId}`)?.id;
  }, [data.andares]);

  // ---- Medições Caixa ----
  const addMedicaoCaixa = trpc.medicoesCaixa.create.useMutation({ onSuccess: invalidate });
  const deleteMedicaoCaixa = trpc.medicoesCaixa.delete.useMutation({ onSuccess: invalidate });

  // ---- Aplicações Caixa ----
  const addAplicacaoCaixa = trpc.aplicacoesCaixa.create.useMutation({ onSuccess: invalidate });
  const deleteAplicacaoCaixa = trpc.aplicacoesCaixa.delete.useMutation({ onSuccess: invalidate });

  // ---- Andares ----
  const updateAndar = trpc.andares.update.useMutation({ onSuccess: invalidate });
  const clearAndar = trpc.andares.clearAndar.useMutation({ onSuccess: invalidate });

  // ---- Perfis (single) — optimistic + debounced ----
  const updatePerfil = trpc.perfis.update.useMutation({
    onMutate: (input) => {
      const frontId = findAndarFrontId(input.andarId);
      if (frontId) {
        optimisticPerfilUpdate(frontId, input.perfilIndex, {
          ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
          ...(input.variedadeId !== undefined ? { variedadeId: input.variedadeId ? `var-lookup-${input.variedadeId}` : undefined } : {}),
        });
      }
    },
    onSuccess: debouncedInvalidate,
  });
  const resetPerfis = trpc.perfis.resetByAndar.useMutation({ onSuccess: invalidate });

  // Batch perfis
  const batchUpdatePerfis = trpc.perfis.batchUpdate.useMutation({ onSuccess: debouncedInvalidate });
  const setAllPerfis = trpc.perfis.setAll.useMutation({
    onMutate: (input) => {
      const frontId = findAndarFrontId(input.andarId);
      if (frontId) {
        updateData((prev) => ({
          ...prev,
          andares: prev.andares.map((a) => {
            if (a.id !== frontId) return a;
            return {
              ...a,
              perfis: (a.perfis || []).map((p) => ({
                ...p,
                ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
                ...(input.variedadeId !== undefined ? { variedadeId: input.variedadeId ? `var-lookup-${input.variedadeId}` : undefined } : {}),
              })),
            };
          }),
        }));
      }
    },
    onSuccess: debouncedInvalidate,
  });

  // ---- Furos (single) — optimistic + debounced ----
  const updateFuro = trpc.furos.update.useMutation({
    onMutate: (input) => {
      const frontId = findAndarFrontId(input.andarId);
      if (frontId) {
        optimisticFuroUpdate(
          frontId,
          input.perfilIndex,
          input.furoIndex,
          input.status,
          input.variedadeId !== undefined ? (input.variedadeId ? `var-lookup-${input.variedadeId}` : null) : undefined,
        );
      }
    },
    onSuccess: debouncedInvalidate,
  });
  const resetFuros = trpc.furos.resetByAndar.useMutation({ onSuccess: invalidate });

  // Batch furos — optimistic update all at once
  const batchUpdateFuros = trpc.furos.batchUpdate.useMutation({
    onMutate: (input) => {
      const frontId = findAndarFrontId(input.andarId);
      if (frontId) {
        updateData((prev) => ({
          ...prev,
          andares: prev.andares.map((a) => {
            if (a.id !== frontId) return a;
            const newFuros = [...(a.furos || [])];
            for (const upd of input.updates) {
              const idx = newFuros.findIndex((f) => f.perfilIndex === upd.perfilIndex && f.furoIndex === upd.furoIndex);
              const patch: Partial<Furo> = {};
              if (upd.status !== undefined) patch.status = upd.status as Furo['status'];
              if (upd.variedadeId !== undefined) patch.variedadeId = upd.variedadeId ? `var-lookup-${upd.variedadeId}` : undefined;
              if (idx >= 0) {
                newFuros[idx] = { ...newFuros[idx], ...patch };
              } else {
                newFuros.push({
                  perfilIndex: upd.perfilIndex,
                  furoIndex: upd.furoIndex,
                  status: (upd.status || 'vazio') as Furo['status'],
                  variedadeId: upd.variedadeId ? `var-lookup-${upd.variedadeId}` : undefined,
                });
              }
            }
            return { ...a, furos: newFuros };
          }),
        }));
      }
    },
    onSuccess: debouncedInvalidate,
  });

  const setAllFuros = trpc.furos.setAll.useMutation({
    onMutate: (input) => {
      const frontId = findAndarFrontId(input.andarId);
      if (frontId) {
        updateData((prev) => ({
          ...prev,
          andares: prev.andares.map((a) => {
            if (a.id !== frontId) return a;
            return {
              ...a,
              furos: (a.furos || []).map((f) => ({
                ...f,
                status: (input.status || f.status) as Furo['status'],
                ...(input.variedadeId !== undefined ? { variedadeId: input.variedadeId ? `var-lookup-${input.variedadeId}` : undefined } : {}),
              })),
            };
          }),
        }));
      }
    },
    onSuccess: debouncedInvalidate,
  });

  // ---- Aplicações Andar ----
  const addAplicacaoAndar = trpc.aplicacoesAndar.create.useMutation({ onSuccess: invalidate });
  const deleteAplicacaoAndar = trpc.aplicacoesAndar.delete.useMutation({ onSuccess: invalidate });

  // ---- Germinação ----
  const createGerminacao = trpc.germinacao.create.useMutation({ onSuccess: invalidate });
  const updateGerminacao = trpc.germinacao.update.useMutation({ onSuccess: invalidate });
  const deleteGerminacao = trpc.germinacao.delete.useMutation({ onSuccess: invalidate });

  // ---- Transplantios ----
  const createTransplantio = trpc.transplantios.create.useMutation({ onSuccess: invalidate });
  const deleteTransplantio = trpc.transplantios.delete.useMutation({ onSuccess: invalidate });

  // ---- Manutenções ----
  const createManutencao = trpc.manutencoes.create.useMutation({ onSuccess: invalidate });
  const updateManutencao = trpc.manutencoes.update.useMutation({ onSuccess: invalidate });
  const deleteManutencao = trpc.manutencoes.delete.useMutation({ onSuccess: invalidate });

  // ---- Ciclos ----
  const createCiclo = trpc.ciclos.create.useMutation({ onSuccess: invalidate });
  const updateCiclo = trpc.ciclos.update.useMutation({ onSuccess: invalidate });
  const marcarCicloExecutado = trpc.ciclos.marcarExecutado.useMutation({ onSuccess: invalidate });
  const deleteCiclo = trpc.ciclos.delete.useMutation({ onSuccess: invalidate });

  // ---- Variedades — debounced for inline edits ----
  const createVariedade = trpc.variedades.create.useMutation({ onSuccess: invalidate });
  const updateVariedade = trpc.variedades.update.useMutation({ onSuccess: debouncedInvalidate });
  const deleteVariedade = trpc.variedades.delete.useMutation({ onSuccess: invalidate });

  // ---- Fases Config ----
  const upsertFaseConfig = trpc.fasesConfig.upsert.useMutation({ onSuccess: invalidate });

  // ---- Admin ----
  const seed = trpc.admin.seed.useMutation({ onSuccess: invalidate });
  const reset = trpc.admin.reset.useMutation({ onSuccess: invalidate });

  return {
    // Medições
    addMedicaoCaixa,
    deleteMedicaoCaixa,
    // Aplicações Caixa
    addAplicacaoCaixa,
    deleteAplicacaoCaixa,
    // Andares
    updateAndar,
    clearAndar,
    // Perfis
    updatePerfil,
    resetPerfis,
    batchUpdatePerfis,
    setAllPerfis,
    // Furos
    updateFuro,
    resetFuros,
    batchUpdateFuros,
    setAllFuros,
    // Aplicações Andar
    addAplicacaoAndar,
    deleteAplicacaoAndar,
    // Germinação
    createGerminacao,
    updateGerminacao,
    deleteGerminacao,
    // Transplantios
    createTransplantio,
    deleteTransplantio,
    // Manutenções
    createManutencao,
    updateManutencao,
    deleteManutencao,
    // Ciclos
    createCiclo,
    updateCiclo,
    marcarCicloExecutado,
    deleteCiclo,
    // Variedades
    createVariedade,
    updateVariedade,
    deleteVariedade,
    // Fases Config
    upsertFaseConfig,
    // Admin
    seed,
    reset,
    // Utility
    invalidate,
    debouncedInvalidate,
  };
}
