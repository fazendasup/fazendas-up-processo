import type { ModuloContratavel } from "./const";

export const ROTULO_MODULO_PROJETO: Record<ModuloContratavel, string> = {
  estoque: "Estoque",
  automacao: "Automação",
  inteligencia: "Inteligência",
  visao_cultivo: "Visão do cultivo",
  custos_producao: "Custos de produção",
  comercial: "Central Comercial",
};

export const DESCRICAO_MODULO_PROJETO: Partial<Record<ModuloContratavel, string>> = {
  estoque: "Inventário de insumos, KPIs e relatórios.",
  automacao: "Programações e integração com dispositivos.",
  inteligencia: "Alertas e regras operacionais.",
  visao_cultivo: "Análise de imagens do cultivo.",
  custos_producao: "R$/planta, rateio entre variedades e painel CFO.",
  comercial: "Carteira, oportunidades, KPIs e integração Conta Azul.",
};
