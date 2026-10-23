import type { ModuloContratavel } from "./const";

export const ROTULO_MODULO_PROJETO: Record<ModuloContratavel, string> = {
  estoque: "Estoque",
  automacao: "Automação",
  inteligencia: "Inteligência",
  visao_cultivo: "Visão do cultivo",
  custos_producao: "Custos de produção",
  comercial: "Central Comercial",
};

/** Textos curtos para a UI (card de módulos / toggles). */
export const DESCRICAO_MODULO_PROJETO: Record<ModuloContratavel, string> = {
  estoque:
    "Inventário de insumos e materiais, com movimentações, KPIs e relatórios para o chão de fábrica e a gestão.",
  automacao:
    "Painel de programações e visão SCADA da infraestrutura (torres, caixas, atuadores) — pronto para integrar dispositivos.",
  inteligencia:
    "Motor de regras que gera alertas e recomendações operacionais (atrasos, EC/pH, manutenções, capacidade).",
  visao_cultivo:
    "Análise assistida por imagem do cultivo: saúde foliar, pragas, deficiências e anomalias por torre.",
  custos_producao:
    "Custo por planta/variedade, rateio de despesas e painel financeiro (CFO) com visão de rentabilidade.",
  comercial:
    "Pedidos, entregas, carteira de clientes, estoque vivo, KPIs e integração com Conta Azul.",
};

/**
 * Catálogo para apresentação a prospects (núcleo + opcionais).
 * O núcleo entra em todo projeto; os opcionais ligam/desligam por contrato.
 */
export type ModuloApresentacao = {
  id: string;
  nome: string;
  camada: "nucleo" | "opcional";
  moduloContratavel?: ModuloContratavel;
  resumo: string;
  paraQuem: string;
};

export const CATALOGO_MODULOS_APRESENTACAO: ModuloApresentacao[] = [
  {
    id: "dashboard",
    nome: "Dashboard de cultivo",
    camada: "nucleo",
    resumo:
      "Painel do dia: bancadas/torres por fase, ciclos pendentes, tarefas e prioridade operacional em um só lugar.",
    paraQuem: "Operação e supervisão no turno.",
  },
  {
    id: "plantio",
    nome: "Plantio e germinação",
    camada: "nucleo",
    resumo:
      "Planejamento de plantio, lotes em germinação, transplantio e ocupação das estruturas com datas por perfil.",
    paraQuem: "Equipe de processo e líderes de turno.",
  },
  {
    id: "ciclos",
    nome: "Ciclos e protocolos",
    camada: "nucleo",
    resumo:
      "Agenda de aplicações na solução e foliares (Thyper, Infinito, Cercobin, caldas), com folgas de segurança e execução por caixa.",
    paraQuem: "Técnicos e operadores de solução nutritiva.",
  },
  {
    id: "correcao_ec",
    nome: "Correção EC/pH",
    camada: "nucleo",
    resumo: "Registro e ajuste de EC e pH por caixa/bancada, alinhado ao protocolo da receita.",
    paraQuem: "Operadores de cultivo.",
  },
  {
    id: "manutencao",
    nome: "Manutenção",
    camada: "nucleo",
    resumo: "Ordens e histórico de manutenção (crítica e preventiva) com timeline por equipamento.",
    paraQuem: "Manutenção e supervisão.",
  },
  {
    id: "bpf",
    nome: "POP e FIT (BPF)",
    camada: "nucleo",
    resumo: "Biblioteca de procedimentos e fichas técnicas acessível no fluxo do dia a dia.",
    paraQuem: "Qualidade e operação.",
  },
  {
    id: "receitas",
    nome: "Receitas e cadastros",
    camada: "nucleo",
    resumo: "Receitas de crescimento (dias por fase, EC/pH) e cadastros de variedades e estruturas.",
    paraQuem: "Agrônomos e administradores do projeto.",
  },
  {
    id: "capacidade",
    nome: "Capacidade e projeção de colheita",
    camada: "nucleo",
    resumo: "Gantt de ocupação, andares disponíveis e projeção de colheita para planejar a safra.",
    paraQuem: "Planejamento e gestão.",
  },
  {
    id: "analytics",
    nome: "Analytics",
    camada: "nucleo",
    resumo:
      "Análises de EC/pH, produtividade, germinação, manutenções, ocupação, desperdício e planejado × realizado.",
    paraQuem: "Gestão e melhoria contínua.",
  },
  {
    id: "projetos",
    nome: "Multi-projeto",
    camada: "nucleo",
    resumo:
      "Vários projetos (fazenda vertical, hidroponia, microverdes) no mesmo tenant, com isolamento de dados e módulos por contrato.",
    paraQuem: "Grupos com mais de uma unidade ou modalidade.",
  },
  {
    id: "estoque",
    nome: ROTULO_MODULO_PROJETO.estoque,
    camada: "opcional",
    moduloContratavel: "estoque",
    resumo: DESCRICAO_MODULO_PROJETO.estoque,
    paraQuem: "Compras, almoxarifado e operações.",
  },
  {
    id: "automacao",
    nome: ROTULO_MODULO_PROJETO.automacao,
    camada: "opcional",
    moduloContratavel: "automacao",
    resumo: DESCRICAO_MODULO_PROJETO.automacao,
    paraQuem: "Unidades com automação ou em preparação para IoT.",
  },
  {
    id: "inteligencia",
    nome: ROTULO_MODULO_PROJETO.inteligencia,
    camada: "opcional",
    moduloContratavel: "inteligencia",
    resumo: DESCRICAO_MODULO_PROJETO.inteligencia,
    paraQuem: "Supervisão que quer alertas acionáveis sem planilha.",
  },
  {
    id: "visao_cultivo",
    nome: ROTULO_MODULO_PROJETO.visao_cultivo,
    camada: "opcional",
    moduloContratavel: "visao_cultivo",
    resumo: DESCRICAO_MODULO_PROJETO.visao_cultivo,
    paraQuem: "Times que fotografam o cultivo e querem triagem assistida.",
  },
  {
    id: "custos_producao",
    nome: ROTULO_MODULO_PROJETO.custos_producao,
    camada: "opcional",
    moduloContratavel: "custos_producao",
    resumo: DESCRICAO_MODULO_PROJETO.custos_producao,
    paraQuem: "Diretoria financeira e gestão de custos.",
  },
  {
    id: "comercial",
    nome: ROTULO_MODULO_PROJETO.comercial,
    camada: "opcional",
    moduloContratavel: "comercial",
    resumo: DESCRICAO_MODULO_PROJETO.comercial,
    paraQuem: "Comercial, logística e financeiro comercial.",
  },
];
