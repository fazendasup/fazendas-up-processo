/**
 * API tRPC — composição dos routers por domínio.
 * Permissões: publicProcedure → leitura; protectedProcedure → operador+admin; adminProcedure → só admin.
 */
import { router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";
import { adminRouter } from "./admin";
import { andaresRouter } from "./andares";
import { aplicacoesAndarRouter } from "./aplicacoesAndar";
import { aplicacoesCaixaRouter } from "./aplicacoesCaixa";
import { authRouter } from "./auth";
import { caixasAguaRouter } from "./caixasAgua";
import { ciclosRouter } from "./ciclos";
import { fasesConfigRouter } from "./fasesConfig";
import { fazendaRouter } from "./fazenda";
import { furosRouter } from "./furos";
import { germinacaoRouter } from "./germinacao";
import { inteligenciaRouter } from "./inteligencia";
import { manutencoesRouter } from "./manutencoes";
import { medicoesCaixaRouter } from "./medicoesCaixa";
import { perfisRouter } from "./perfis";
import { planosPlantioRouter } from "./planosPlantio";
import { receitasRouter } from "./receitas";
import { registrosColheitaRouter } from "./registrosColheita";
import { regrasRouter } from "./regras";
import { tarefasRouter } from "./tarefas";
import { torresRouter } from "./torres";
import { transplantiosRouter } from "./transplantios";
import { usersRouter } from "./users";
import { variedadesRouter } from "./variedades";
import { visaoRouter } from "./visao";
import { estoqueRouter } from "./estoque";
import { automacaoRouter } from "./automacao";
import { projetosRouter } from "./projetos";
import { bancadasRouter } from "./bancadas";
import { medicoesBancadaRouter } from "./medicoesBancada";
import { aplicacoesBancadaRouter } from "./aplicacoesBancada";
import { caixasBancadaRouter } from "./caixasBancada";
import { chatRouter } from "./chat";
import { custosProducaoRouter } from "./custosProducao";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  projetos: projetosRouter,
  bancadas: bancadasRouter,
  medicoesBancada: medicoesBancadaRouter,
  aplicacoesBancada: aplicacoesBancadaRouter,
  caixasBancada: caixasBancadaRouter,
  fazenda: fazendaRouter,
  variedades: variedadesRouter,
  fasesConfig: fasesConfigRouter,
  torres: torresRouter,
  caixasAgua: caixasAguaRouter,
  medicoesCaixa: medicoesCaixaRouter,
  aplicacoesCaixa: aplicacoesCaixaRouter,
  andares: andaresRouter,
  perfis: perfisRouter,
  furos: furosRouter,
  aplicacoesAndar: aplicacoesAndarRouter,
  germinacao: germinacaoRouter,
  transplantios: transplantiosRouter,
  manutencoes: manutencoesRouter,
  ciclos: ciclosRouter,
  users: usersRouter,
  receitas: receitasRouter,
  tarefas: tarefasRouter,
  registrosColheita: registrosColheitaRouter,
  planosPlantio: planosPlantioRouter,
  inteligencia: inteligenciaRouter,
  visao: visaoRouter,
  regras: regrasRouter,
  admin: adminRouter,
  estoque: estoqueRouter,
  automacao: automacaoRouter,
  chat: chatRouter,
  custosProducao: custosProducaoRouter,
});

export type AppRouter = typeof appRouter;
