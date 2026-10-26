/**
 * Checagem de segurança no apontamento manual (Infinito / Cercobin / Thyper).
 * Caldas A/B não entram aqui — não conflitam com tratamento de raiz.
 */

import {
  adicionarDiasYmd,
  chaveAplicacaoProtocolo,
  diferencaDiasYmd,
  folgaMinimaDias,
  ymdCalendario,
} from "./cicloSequencia";

export type ProdutoApontamentoRaiz = "infinito" | "cercobin" | "thyper" | "peroxido";

export type AlertaApontamento = {
  nivel: "bloqueio" | "aviso";
  mensagem: string;
};

export type UltimaPorProduto = Partial<
  Record<"infinito" | "cercobin" | "thyper", string | null>
>;

function normalizaProduto(chave: string | null): ProdutoApontamentoRaiz | null {
  if (!chave) return null;
  if (chave === "peroxido") return "thyper";
  if (chave === "infinito" || chave === "cercobin" || chave === "thyper") return chave;
  return null;
}

/**
 * Avalia se aplicar `produto` em `hojeYmd` na caixa é seguro,
 * dadas as últimas aplicações nesta caixa e Infinito trazido por lotes.
 */
export function avaliarApontamentoRaiz(input: {
  produto: string;
  nomeCiclo?: string;
  hojeYmd: string;
  /** Últimas na caixa (e Thyper/Infinito/Cercobin). */
  ultimasNaCaixa: UltimaPorProduto;
  /** Infinito aplicado na caixa de origem de lotes recentes. */
  infinitoCarregadoLoteYmd?: string | null;
}): AlertaApontamento[] {
  const destino = normalizaProduto(
    chaveAplicacaoProtocolo(input.nomeCiclo ?? input.produto, input.produto),
  );
  if (!destino) return [];

  const alertas: AlertaApontamento[] = [];
  const hoje = input.hojeYmd;

  const pares: Array<{ origem: "thyper" | "infinito" | "cercobin"; rotulo: string }> = [
    { origem: "thyper", rotulo: "Thyper" },
    { origem: "infinito", rotulo: "Infinito" },
    { origem: "cercobin", rotulo: "Cercobin" },
  ];

  for (const { origem, rotulo } of pares) {
    if (origem === destino) continue;
    const ult = ymdCalendario(input.ultimasNaCaixa[origem] ?? null);
    if (!ult) continue;
    const folga = folgaMinimaDias(origem, destino);
    if (folga <= 0) continue;
    const liberado = adicionarDiasYmd(ult, folga);
    if (hoje < liberado) {
      const dias = diferencaDiasYmd(hoje, liberado);
      const mesmoDiaThyper =
        hoje === ult &&
        origem === "thyper" &&
        (destino === "infinito" || destino === "cercobin");
      alertas.push({
        nivel: mesmoDiaThyper ? "bloqueio" : "aviso",
        mensagem: `${rotulo} foi aplicado em ${ult.split("-").reverse().join("/")}. ${labelProduto(destino)} só a partir de ${liberado.split("-").reverse().join("/")} (faltam ${dias} dia${dias === 1 ? "" : "s"}).`,
      });
    }
  }

  if (destino === "cercobin" && input.infinitoCarregadoLoteYmd) {
    const ult = ymdCalendario(input.infinitoCarregadoLoteYmd);
    if (ult) {
      const folga = folgaMinimaDias("infinito", "cercobin");
      const liberado = adicionarDiasYmd(ult, folga);
      if (hoje < liberado) {
        const dias = diferencaDiasYmd(hoje, liberado);
        alertas.push({
          nivel: "aviso",
          mensagem: `Lote veio de outra fase com Infinito em ${ult.split("-").reverse().join("/")}. Cercobin nesta caixa só a partir de ${liberado.split("-").reverse().join("/")} (faltam ${dias} dia${dias === 1 ? "" : "s"}).`,
        });
      }
    }
  }

  // Mesmo produto muito recente (resistência / máx. 1 por fase ~10d)
  if (destino === "infinito" || destino === "cercobin") {
    const ult = ymdCalendario(input.ultimasNaCaixa[destino] ?? null);
    if (ult) {
      const liberado = adicionarDiasYmd(ult, 7);
      if (hoje < liberado) {
        const dias = diferencaDiasYmd(hoje, liberado);
        alertas.push({
          nivel: "aviso",
          mensagem: `${labelProduto(destino)} já foi aplicado em ${ult.split("-").reverse().join("/")}. Reaplicar tão cedo (faltam ${dias} dia${dias === 1 ? "" : "s"} para 7 dias) aumenta risco e resistência.`,
        });
      }
    }
  }

  // Dedup por mensagem
  const vistos = new Set<string>();
  return alertas.filter((a) => {
    if (vistos.has(a.mensagem)) return false;
    vistos.add(a.mensagem);
    return true;
  });
}

function labelProduto(p: ProdutoApontamentoRaiz): string {
  if (p === "infinito") return "Infinito";
  if (p === "cercobin") return "Cercobin";
  return "Thyper";
}

export function temBloqueio(alertas: AlertaApontamento[]): boolean {
  return alertas.some((a) => a.nivel === "bloqueio");
}
