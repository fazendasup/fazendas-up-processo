/**
 * Mutations de `comercial.pedidos` que o assistente pode preparar/executar
 * (espelho das ações manuais da página Pedidos e abas).
 */
export const COMERCIAL_PEDIDOS_ASSISTANT_PROCEDURES = [
  "salvarRegraCliente",
  "salvarPedido",
  "alterarDataPedido",
  "copiarPedidoParaDia",
  "copiarSemanaAnterior",
  "atualizarStatusClienteDia",
  "atualizarPrioridadeClienteDia",
  "atualizarItemPronto",
  "definirQuantidadeProntaVariedade",
  "cancelarPedido",
  "reativarPedidosCancelados",
  "salvarProduto",
  "excluirProduto",
  "atualizarCompraProduto",
  "salvarConfigMixFolhaLeve",
  "fecharSemana",
  "reabrirSemana",
  "sincronizarCatalogoContaAzul",
  "importarProdutosContaAzul",
  "repararProdutosInativosContaAzul",
  "conciliacaoConfirmarVinculo",
  "conciliacaoConfirmarVinculoMultiplo",
  "conciliacaoMarcarVendaErrada",
  "conciliacaoIgnorarVenda",
  "conciliacaoManterOperacional",
  "conciliacaoCriarOperacionalDeVenda",
  "conciliacaoDesvincular",
  "conciliacaoAplicarCorrecao",
  "conciliacaoAplicarCorrecaoAgregada",
  "enviarOperacionalContaAzul",
  "liberarReenvioVendaContaAzul",
  "fecharPeriodoAcumuloContaAzul",
] as const;

export type ComercialPedidosAssistantProcedure =
  (typeof COMERCIAL_PEDIDOS_ASSISTANT_PROCEDURES)[number];

export function isComercialPedidosAssistantProcedure(
  value: string,
): value is ComercialPedidosAssistantProcedure {
  return (COMERCIAL_PEDIDOS_ASSISTANT_PROCEDURES as readonly string[]).includes(value);
}

export const COMERCIAL_PEDIDOS_PROCEDURE_LABEL: Record<
  ComercialPedidosAssistantProcedure,
  string
> = {
  salvarRegraCliente: "Salvar regra comercial do cliente",
  salvarPedido: "Salvar / emitir pedido operacional",
  alterarDataPedido: "Alterar data do pedido",
  copiarPedidoParaDia: "Copiar pedido para outro dia",
  copiarSemanaAnterior: "Copiar semana anterior",
  atualizarStatusClienteDia: "Atualizar status do cliente no dia",
  atualizarPrioridadeClienteDia: "Atualizar prioridade de entrega no dia",
  atualizarItemPronto: "Marcar item pronto",
  definirQuantidadeProntaVariedade: "Definir quantidade pronta por variedade",
  cancelarPedido: "Cancelar pedido",
  reativarPedidosCancelados: "Reativar pedidos cancelados",
  salvarProduto: "Salvar produto operacional",
  excluirProduto: "Excluir / desativar produto",
  atualizarCompraProduto: "Atualizar compra (estoque vivo)",
  salvarConfigMixFolhaLeve: "Salvar mix folha leve",
  fecharSemana: "Fechar semana",
  reabrirSemana: "Reabrir semana",
  sincronizarCatalogoContaAzul: "Sincronizar catálogo Conta Azul",
  importarProdutosContaAzul: "Importar produtos Conta Azul",
  repararProdutosInativosContaAzul: "Reparar produtos inativos Conta Azul",
  conciliacaoConfirmarVinculo: "Conciliação: confirmar vínculo",
  conciliacaoConfirmarVinculoMultiplo: "Conciliação: vínculo múltiplo",
  conciliacaoMarcarVendaErrada: "Conciliação: marcar venda errada",
  conciliacaoIgnorarVenda: "Conciliação: ignorar venda",
  conciliacaoManterOperacional: "Conciliação: manter operacional",
  conciliacaoCriarOperacionalDeVenda: "Conciliação: criar operacional da venda",
  conciliacaoDesvincular: "Conciliação: desvincular",
  conciliacaoAplicarCorrecao: "Conciliação: aplicar correção",
  conciliacaoAplicarCorrecaoAgregada: "Conciliação: correção agregada",
  enviarOperacionalContaAzul: "Enviar pedido ao Conta Azul",
  liberarReenvioVendaContaAzul: "Liberar reenvio Conta Azul",
  fecharPeriodoAcumuloContaAzul: "Fechar período de acúmulo Conta Azul",
};
