import { useEffect } from "react";
import { useLocation } from "wouter";

const BASE = "Fazendas Up";

const STATIC: Record<string, string> = {
  "/": "Início",
  "/login": "Entrar",
  "/privacidade": "Privacidade",
  "/hoje": "Agenda",
  "/analytics": "Analytics",
  "/germinacao": "Germinação",
  "/manutencao": "Manutenção",
  "/estoque": "Estoque",
  "/ciclos": "Ciclos",
  "/config": "Configuração",
  "/administracao": "Administração",
  "/plataforma/modulos": "Módulos",
  "/planejamento": "Planejamento",
  "/capacidade": "Capacidade",
  "/custos-producao": "Custos de produção",
  "/receitas": "Receitas",
  "/cadastros": "Cadastros",
  "/tarefas": "Tarefas",
  "/inteligencia": "Inteligência",
  "/visao": "Visão",
  "/automacao": "Automação",
  "/usuarios": "Usuários",
  "/projetos": "Projetos",
  "/404": "Não encontrado",
};

function normalizePath(raw: string): string {
  const path = (raw.split("?")[0] ?? "").replace(/\/$/, "") || "/";
  return path;
}

function titleForPath(path: string): string {
  if (STATIC[path]) return `${STATIC[path]} · ${BASE}`;
  if (path.startsWith("/torre/")) return `Torre · ${BASE}`;
  if (path.startsWith("/bancada/")) return `Bancada · ${BASE}`;
  return `Página não encontrada · ${BASE}`;
}

/**
 * Mantém `document.title` alinhado à rota (separador do browser e atalhos).
 */
export function SyncDocumentTitle() {
  const [location] = useLocation();

  useEffect(() => {
    const path = normalizePath(location);
    document.title = titleForPath(path);
  }, [location]);

  return null;
}
