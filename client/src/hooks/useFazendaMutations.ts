// ============================================================
// useFazendaMutations — Hook centralizado para todas as mutações tRPC
// Cada mutação invalida o cache loadAll automaticamente
// ============================================================

import { trpc } from '@/lib/trpc';

export function useFazendaMutations() {
  const utils = trpc.useUtils();

  const invalidate = () => {
    utils.fazenda.loadAll.invalidate();
  };

  // ---- Medições Caixa ----
  const addMedicaoCaixa = trpc.medicoesCaixa.create.useMutation({ onSuccess: invalidate });
  const deleteMedicaoCaixa = trpc.medicoesCaixa.delete.useMutation({ onSuccess: invalidate });

  // ---- Aplicações Caixa ----
  const addAplicacaoCaixa = trpc.aplicacoesCaixa.create.useMutation({ onSuccess: invalidate });
  const deleteAplicacaoCaixa = trpc.aplicacoesCaixa.delete.useMutation({ onSuccess: invalidate });

  // ---- Andares ----
  const updateAndar = trpc.andares.update.useMutation({ onSuccess: invalidate });
  const clearAndar = trpc.andares.clearAndar.useMutation({ onSuccess: invalidate });

  // ---- Perfis ----
  const updatePerfil = trpc.perfis.update.useMutation({ onSuccess: invalidate });
  const resetPerfis = trpc.perfis.resetByAndar.useMutation({ onSuccess: invalidate });

  // ---- Furos ----
  const updateFuro = trpc.furos.update.useMutation({ onSuccess: invalidate });
  const resetFuros = trpc.furos.resetByAndar.useMutation({ onSuccess: invalidate });

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
  const deleteCiclo = trpc.ciclos.delete.useMutation({ onSuccess: invalidate });

  // ---- Variedades ----
  const createVariedade = trpc.variedades.create.useMutation({ onSuccess: invalidate });
  const updateVariedade = trpc.variedades.update.useMutation({ onSuccess: invalidate });
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
    // Furos
    updateFuro,
    resetFuros,
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
  };
}
