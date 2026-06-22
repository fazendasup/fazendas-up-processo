import type { ModuloContratavel } from "./const";

export type ModulosProjetoMap = Record<ModuloContratavel, boolean>;

export type ChatPageEntry = {
  rota: string;
  nome: string;
  /** Módulo contratável ou área core da operação */
  area: ModuloContratavel | "core" | "admin";
  /** Aba interna (ex.: custos-producao?tab=rentabilidade) */
  aba?: string;
  descricao: string;
  /** Chave do bloco JSON no resumo do assistente, quando existir */
  blocoSnapshot?: string;
};

const PAGINAS_CORE: ChatPageEntry[] = [
  { rota: "/", nome: "Início", area: "core", descricao: "Visão geral das torres, bancadas e indicadores do dia." },
  { rota: "/hoje", nome: "Hoje", area: "core", descricao: "Agenda operacional do dia: tarefas, colheitas e prioridades." },
  { rota: "/planejamento", nome: "Plantio", area: "core", descricao: "Planos de plantio, germinação inicial e fila de produção." },
  { rota: "/tarefas", nome: "Tarefas", area: "core", descricao: "Checklist e tabela de tarefas operacionais por vencimento." },
  { rota: "/analytics", nome: "Analytics", area: "core", descricao: "Gráficos e tendências de produção, colheita e ocupação." },
  { rota: "/capacidade", nome: "Capacidade", area: "admin", descricao: "Simulação de capacidade produtiva e gargalos (admin)." },
  { rota: "/germinacao", nome: "Germinação", area: "core", descricao: "Lotes de germinação e contagem de mudas." },
  { rota: "/manutencao", nome: "Manutenção", area: "core", descricao: "Ordens e registros de manutenção de infraestrutura." },
  { rota: "/ciclos", nome: "Ciclos / dosagem", area: "core", descricao: "Ciclos de automação, produtos e dosagens por fase." },
  { rota: "/receitas", nome: "Receitas / cadastros", area: "core", descricao: "Receitas de crescimento e cadastros auxiliares." },
  { rota: "/config", nome: "Configurações", area: "admin", descricao: "Parâmetros do projeto, limites EC/pH e infraestrutura." },
  { rota: "/torre/:id", nome: "Detalhe da torre", area: "core", descricao: "Perfis, furos, fases e operações de uma torre específica." },
  { rota: "/bancada/:id", nome: "Detalhe da bancada", area: "core", descricao: "Plantio, caixas e colheita de uma bancada (hidroponia)." },
];

const PAGINAS_MODULO: ChatPageEntry[] = [
  {
    rota: "/estoque",
    nome: "Estoque",
    area: "estoque",
    descricao: "Inventário de insumos, projeção de esgotamento e KPIs de compra.",
    blocoSnapshot: "Estoque",
  },
  {
    rota: "/automacao",
    nome: "Automação",
    area: "automacao",
    descricao: "Painel SCADA, programações e integração com dispositivos MQTT.",
    blocoSnapshot: "Automação",
  },
  {
    rota: "/inteligencia",
    nome: "Inteligência",
    area: "inteligencia",
    descricao: "Alertas operacionais, regras e motor de inteligência.",
    blocoSnapshot: "Inteligência",
  },
  {
    rota: "/visao",
    nome: "Visão do cultivo",
    area: "visao_cultivo",
    descricao: "Análise de imagens do cultivo e amostras de treino.",
    blocoSnapshot: "Visão do cultivo",
  },
  {
    rota: "/custos-producao",
    nome: "Custos — Painel CFO",
    area: "custos_producao",
    aba: "painel",
    descricao: "Indicadores CFO, alertas de custo e drivers principais.",
    blocoSnapshot: "Custos — Painel CFO",
  },
  {
    rota: "/custos-producao",
    nome: "Custos — Por variedade",
    area: "custos_producao",
    aba: "variedade",
    descricao: "R$/planta por variedade com rateio e colheita.",
    blocoSnapshot: "Custos — Por variedade",
  },
  {
    rota: "/custos-producao",
    nome: "Custos — Produtos vendidos",
    area: "custos_producao",
    aba: "produtos",
    descricao: "Fichas de custo de produtos comerciais, componentes e etapas de processo.",
    blocoSnapshot: "Custos — Produtos vendidos",
  },
  {
    rota: "/custos-producao",
    nome: "Custos — Comuns (rateio)",
    area: "custos_producao",
    aba: "comuns",
    descricao: "Rubricas compartilhadas e rateio entre variedades.",
    blocoSnapshot: "Custos — Comuns (rateio)",
  },
  {
    rota: "/custos-producao",
    nome: "Custos — Equipes MO",
    area: "custos_producao",
    aba: "mo-equipes",
    descricao: "Equipes de mão de obra, R$/h e impacto nas fichas.",
    blocoSnapshot: "Custos — Equipes MO",
  },
  {
    rota: "/custos-producao",
    nome: "Custos — Rentabilidade",
    area: "custos_producao",
    aba: "rentabilidade",
    descricao: "Períodos de rentabilidade, resultado por produto e viabilidade.",
    blocoSnapshot: "Custos — Rentabilidade",
  },
  {
    rota: "/custos-producao",
    nome: "Custos — Simulador",
    area: "custos_producao",
    aba: "simulador",
    descricao: "Simulação de preço e margem com base nas fichas cadastradas.",
    blocoSnapshot: "Custos — Produtos vendidos",
  },
  {
    rota: "/comercial/dashboard",
    nome: "Comercial — Dashboard",
    area: "comercial",
    descricao: "KPIs comerciais, série mensal e status de integrações.",
    blocoSnapshot: "Dashboard",
  },
  {
    rota: "/comercial/kpis",
    nome: "Comercial — KPIs",
    area: "comercial",
    descricao: "Indicadores comerciais detalhados e snapshots históricos.",
    blocoSnapshot: "KPIs",
  },
  {
    rota: "/comercial/relatorios",
    nome: "Comercial — Relatórios",
    area: "comercial",
    descricao: "Top clientes, produtos, margens e clientes em risco.",
    blocoSnapshot: "Relatórios",
  },
  {
    rota: "/comercial/clientes",
    nome: "Comercial — Clientes",
    area: "comercial",
    descricao: "Carteira de clientes, scores e segmentação.",
    blocoSnapshot: "Clientes",
  },
  {
    rota: "/comercial/oportunidades",
    nome: "Comercial — Oportunidades",
    area: "comercial",
    descricao: "Pipeline comercial e potencial de conversão.",
    blocoSnapshot: "Oportunidades",
  },
  {
    rota: "/comercial/pedidos",
    nome: "Comercial — Pedidos",
    area: "comercial",
    descricao: "Pedidos operacionais, produtos e regras comerciais.",
    blocoSnapshot: "Pedidos",
  },
  {
    rota: "/comercial/pedidos-historico",
    nome: "Comercial — Histórico de pedidos",
    area: "comercial",
    descricao: "Pedidos históricos e tendências de longo prazo.",
    blocoSnapshot: "PedidosHistórico",
  },
  {
    rota: "/comercial/entregas",
    nome: "Comercial — Entregas",
    area: "comercial",
    descricao: "Roteiro de entregas, status e fila do entregador.",
    blocoSnapshot: "Entregas",
  },
  {
    rota: "/comercial/acompanhamento-avarias",
    nome: "Comercial — Varejo / avarias",
    area: "comercial",
    descricao: "Acompanhamento de avarias em varejo e supermercado.",
    blocoSnapshot: "AcompanhamentoAvarias",
  },
  {
    rota: "/comercial/mensagens",
    nome: "Comercial — Mensagens",
    area: "comercial",
    descricao: "Mensagens WhatsApp pendentes, rascunhos e aprovações.",
    blocoSnapshot: "Mensagens",
  },
  {
    rota: "/comercial/execucoes",
    nome: "Comercial — Execuções API",
    area: "comercial",
    descricao: "Log de integrações Conta Azul e falhas de sync.",
    blocoSnapshot: "Execuções",
  },
  {
    rota: "/comercial/configuracoes",
    nome: "Comercial — Configurações",
    area: "comercial",
    descricao: "Produtos comerciais, regras por cliente e integração CA.",
    blocoSnapshot: "Configuracoes",
  },
];

function moduloAtivo(modulos: ModulosProjetoMap | null | undefined, area: ChatPageEntry["area"]): boolean {
  if (area === "core" || area === "admin") return true;
  if (!modulos) return false;
  return modulos[area] === true;
}

/** Catálogo de páginas do sistema para orientar o assistente sobre onde encontrar cada informação. */
export function buildChatPageCatalog(modulos: ModulosProjetoMap | null | undefined): ChatPageEntry[] {
  const out: ChatPageEntry[] = [...PAGINAS_CORE];
  for (const p of PAGINAS_MODULO) {
    if (moduloAtivo(modulos, p.area)) out.push(p);
  }
  return out;
}

export function formatChatPageCatalogMarkdown(modulos: ModulosProjetoMap | null | undefined): string {
  const pages = buildChatPageCatalog(modulos);
  const lines: string[] = [
    "## Mapa de páginas do sistema",
    "Use esta tabela para indicar ao usuário **onde** encontrar cada tipo de informação na interface.",
    "",
  ];
  for (const p of pages) {
    const aba = p.aba ? ` (aba \`${p.aba}\`)` : "";
    const bloco = p.blocoSnapshot ? ` — bloco snapshot: \`${p.blocoSnapshot}\`` : "";
    lines.push(`- **${p.nome}** — rota \`${p.rota}\`${aba}: ${p.descricao}${bloco}`);
  }
  return lines.join("\n");
}
