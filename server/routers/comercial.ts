/**
 * Central Comercial — routers migrados do Comercia (Prisma + integrações).
 * Autenticação via sessão do supervisório (`comercialProcedure`).
 */
import { router } from "../_core/trpc";
import { clientesRouter } from "../comercial/routers/clientesRouter";
import { configRouter } from "../comercial/routers/configRouter";
import { dashboardRouter } from "../comercial/routers/dashboardRouter";
import { execucoesRouter } from "../comercial/routers/execucoesRouter";
import { integrationsRouter } from "../comercial/routers/integrationsRouter";
import { kpisRouter } from "../comercial/routers/kpisRouter";
import { manusRouter } from "../comercial/routers/manusRouter";
import { mensagensRouter } from "../comercial/routers/mensagensRouter";
import { oportunidadesRouter } from "../comercial/routers/oportunidadesRouter";
import { pedidosRouter } from "../comercial/routers/pedidosRouter";
import { relatoriosRouter } from "../comercial/routers/relatoriosRouter";

export const comercialRouter = router({
  dashboard: dashboardRouter,
  clientes: clientesRouter,
  oportunidades: oportunidadesRouter,
  mensagens: mensagensRouter,
  kpis: kpisRouter,
  execucoes: execucoesRouter,
  configuracoes: configRouter,
  manus: manusRouter,
  integracoes: integrationsRouter,
  pedidos: pedidosRouter,
  relatorios: relatoriosRouter,
});
