import type { CategoriaProdutoCusto } from "./custosProduto";
import { LABEL_ETAPA_PROCESSO, type TipoEtapaProcesso } from "./custosProduto";
import type { RegimeMoEtapa } from "./custosMoEquipe";

/** Etapa padrão reutilizada ao gerar fichas do Conta Azul. */
export type EtapaProcessoPadrao = {
  tipo: TipoEtapaProcesso;
  nome: string;
  custoPorUnidade: number;
  custoPorKgProcessado: number | null;
  custoPercentual: number | null;
  minutosPorUnidade: number | null;
  regimeMo: RegimeMoEtapa;
  ativo: boolean;
};

export type CustosProdutoProcessoConfig = {
  embalagemMicroverdeUn: number;
  embalagemOutrosUn: number;
  lavagemMinutosUn: number | null;
  embalagemMinutosUn: number | null;
  corteMinutosUn: number | null;
  adesivoCustoUn: number | null;
  regimeMoPadrao: RegimeMoEtapa;
  incluirLavagem: boolean;
  incluirCorte: boolean;
  incluirAdesivo: boolean;
};

export const CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO: CustosProdutoProcessoConfig = {
  embalagemMicroverdeUn: 0.95,
  embalagemOutrosUn: 0.6,
  lavagemMinutosUn: null,
  embalagemMinutosUn: null,
  corteMinutosUn: null,
  adesivoCustoUn: null,
  regimeMoPadrao: "qualquer",
  incluirLavagem: true,
  incluirCorte: false,
  incluirAdesivo: true,
};

function normalizarNomeProduto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Detecta microverdes pelo nome ou categoria comercial. */
export function inferirCategoriaProdutoCusto(
  nome: string,
  categoriaComercial?: string | null,
): CategoriaProdutoCusto {
  const n = normalizarNomeProduto(nome);
  const cat = normalizarNomeProduto(categoriaComercial ?? "");
  if (n.includes("microverde") || n.includes("micro verde") || cat.includes("microverde")) {
    return "microverde";
  }
  if (n.includes("mix") || cat.includes("mix")) return "mix";
  if (n.includes("alface") || n.includes("rucula") || n.includes("folha")) return "alface";
  if (n.includes("revenda") || cat.includes("revenda")) return "revenda";
  return "outros";
}

export function custoEmbalagemPorCategoria(
  categoria: CategoriaProdutoCusto,
  config: CustosProdutoProcessoConfig = CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
): number {
  return categoria === "microverde" ? config.embalagemMicroverdeUn : config.embalagemOutrosUn;
}

function etapa(
  tipo: TipoEtapaProcesso,
  patch: Partial<EtapaProcessoPadrao> & { nome?: string },
): EtapaProcessoPadrao {
  return {
    tipo,
    nome: patch.nome ?? LABEL_ETAPA_PROCESSO[tipo],
    custoPorUnidade: patch.custoPorUnidade ?? 0,
    custoPorKgProcessado: patch.custoPorKgProcessado ?? null,
    custoPercentual: patch.custoPercentual ?? null,
    minutosPorUnidade: patch.minutosPorUnidade ?? null,
    regimeMo: patch.regimeMo ?? "qualquer",
    ativo: patch.ativo ?? true,
  };
}

/**
 * Monta etapas de processo industrial sem duplicar MO:
 * - embalagem = insumo (R$/un), não salário
 * - minutos/un = MO variável (operadores de processamento via Equipes MO)
 * - não inclui etapa `mao_de_obra` fixa (MO fixa fica na Rentabilidade)
 */
export function etapasProcessoPadraoParaProduto(
  categoria: CategoriaProdutoCusto,
  config: CustosProdutoProcessoConfig = CUSTOS_PRODUTO_PROCESSO_CONFIG_PADRAO,
): EtapaProcessoPadrao[] {
  const regime = config.regimeMoPadrao;
  const embalagem = custoEmbalagemPorCategoria(categoria, config);
  const etapas: EtapaProcessoPadrao[] = [];

  if (config.incluirLavagem && config.lavagemMinutosUn != null && config.lavagemMinutosUn > 0) {
    etapas.push(
      etapa("lavagem", {
        minutosPorUnidade: config.lavagemMinutosUn,
        regimeMo: regime,
      }),
    );
  }

  if (config.incluirCorte && config.corteMinutosUn != null && config.corteMinutosUn > 0) {
    etapas.push(
      etapa("descasque_corte", {
        minutosPorUnidade: config.corteMinutosUn,
        regimeMo: regime,
      }),
    );
  }

  etapas.push(
    etapa("embalagem", {
      custoPorUnidade: embalagem,
      minutosPorUnidade:
        config.embalagemMinutosUn != null && config.embalagemMinutosUn > 0
          ? config.embalagemMinutosUn
          : null,
      regimeMo: regime,
    }),
  );

  if (config.incluirAdesivo && config.adesivoCustoUn != null && config.adesivoCustoUn > 0) {
    etapas.push(
      etapa("adesivo", {
        custoPorUnidade: config.adesivoCustoUn,
      }),
    );
  }

  return etapas.filter((e) => e.ativo);
}
