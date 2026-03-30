# Fazendas Up — Migração Full-Stack

## Migração para Banco de Dados (Backend)
- [x] Resolver conflito de merge Home.tsx (useAuth removido)
- [x] Criar schema completo PostgreSQL (torres, andares, furos, perfis, caixas_dagua, variedades, fases_config, germinacao, transplantios, manutencoes, medicoes_caixa, aplicacoes_caixa, aplicacoes_andar, ciclos)
- [x] Implementar query helpers em server/db.ts
- [x] Implementar rotas tRPC para Torres (CRUD + listagem por fase)
- [x] Implementar rotas tRPC para Andares (CRUD + furos + perfis + plantio/colheita)
- [x] Implementar rotas tRPC para Caixas d'Água (CRUD + medições + aplicações)
- [x] Implementar rotas tRPC para Variedades (CRUD)
- [x] Implementar rotas tRPC para Fases Config (leitura + atualização)
- [x] Implementar rotas tRPC para Germinação (CRUD + status transitions)
- [x] Implementar rotas tRPC para Transplantios (CRUD)
- [x] Implementar rotas tRPC para Manutenções (CRUD + status transitions)
- [x] Implementar rotas tRPC para Ciclos (CRUD + marcar executado)
- [x] Implementar rota de seed/inicialização dos dados padrão
- [x] Implementar rota de export CSV/JSON (via loadAll)
- [x] Push schema para banco de dados (pnpm db:push)

## Migração Frontend
- [x] Migrar FazendaContext para usar tRPC em vez de LocalStorage
- [x] Migrar Home.tsx (Dashboard) para tRPC (leitura via FazendaContext)
- [x] Migrar TorreDetail.tsx para tRPC
- [x] Migrar CiclosPage.tsx para tRPC
- [x] Migrar ConfigPage.tsx para tRPC
- [x] Migrar GerminacaoPage.tsx para tRPC
- [x] Migrar ManutencaoPage.tsx para tRPC
- [x] Migrar Header.tsx (export/backup/reset) para tRPC

## Testes
- [x] Testes Vitest para rotas de Torres (via loadAll)
- [x] Testes Vitest para rotas de Andares (via loadAll)
- [x] Testes Vitest para rotas de Caixas d'Água (via loadAll)
- [x] Testes Vitest para rotas de Germinação (CRUD completo)
- [x] Testes Vitest para rotas de Ciclos (CRUD completo)

## Itens Anteriores (v3 - já implementados)
- [x] Variedade por perfil (não mais por furo individual em mudas)
- [x] Mudas: perfis abertos (sem furos), apenas perfil/andar
- [x] Remover diasCiclo do FaseConfig (ciclo é por variedade)
- [x] Colheita APENAS na fase maturação
- [x] Grid de perfis/furos compacto e responsivo
- [x] Banner com foto real das torres
- [x] KPIs no dashboard
- [x] Sistema de manutenção com alertas
- [x] Sistema de germinação
- [x] Ciclos recorrentes

## Sistema de Permissões e Rastreabilidade
- [x] Criar middleware adminProcedure e protectedProcedure no backend
- [x] Migrar rotas de leitura para publicProcedure (dashboard acessível sem login)
- [x] Migrar rotas de escrita operacional para protectedProcedure (operador+admin)
- [x] Migrar rotas de configuração/exclusão para adminProcedure (só admin)
- [x] Proteger rotas admin.seed e admin.reset com adminProcedure

## Rastreabilidade de Atividades (quem executou)
- [x] Adicionar campo executadoPorId (userId) nas tabelas: germinacao, transplantios, manutencoes, medicoesCaixa, aplicacoesCaixa, aplicacoesAndar
- [x] Adicionar campo executadoPorNome nas mesmas tabelas (desnormalizado para exibição rápida)
- [x] Passar userId automaticamente nas mutations do backend (ctx.user.id)
- [x] Propagar campos de executor nos tipos e transformações

## Integração do Cadastro de Variedades
- [x] Páginas de plantio/germinação/transplantio já buscam variedades do banco
- [x] Dropdown de seleção de variedade em vez de texto livre (já implementado)
- [x] Garantir que dias por fase venham do cadastro da variedade (já implementado)

## Gestão de Usuários (Admin)
- [x] Criar página de listagem de usuários para Admin (/usuarios)
- [x] Permitir Admin alterar role de usuário (user/admin)
- [x] Exibir último login de cada usuário

## Testes
- [x] Teste Vitest: adminProcedure bloqueia operador (seed, reset, variedades, ciclos, fasesConfig)
- [x] Teste Vitest: protectedProcedure permite operador e admin, bloqueia anônimo
- [ ] Teste Vitest: mutations registram userId corretamente

## Controle de Acesso Frontend
- [x] Criar componente ProtectedRoute para controle de acesso por role
- [x] Criar hook useRole para verificar permissões
- [x] Atualizar App.tsx com rotas protegidas (operador vs admin)
- [x] Atualizar Header.tsx com navegação baseada em role
- [x] Adicionar botão de login/logout no Header
- [x] Operador vê: Dashboard, Germinação, Manutenção, Torre Detail
- [x] Admin vê: tudo do operador + Ciclos, Config, Usuários
- [x] Esconder "Resetar Dados" para operadores

## Página de Analytics
- [x] Gráfico de evolução EC por caixa d'água (área temporal com faixa ideal)
- [x] Gráfico de evolução pH por caixa d'água (área temporal com faixa ideal)
- [x] Faixas ideais EC/pH sobrepostas nos gráficos (referência visual)
- [x] Análise de ocupação por fase (barras de progresso + variedades mais plantadas)
- [x] Análise de produtividade: transplantios por dia e por variedade
- [x] Análise de germinação: taxa por variedade + distribuição por status
- [x] Análise de manutenções: frequência por tipo, tempo médio, timeline abertas/concluídas
- [x] Análise de desperdício: taxa por variedade + por motivo
- [x] Filtros por período (7d, 30d, 90d, tudo)
- [x] Dados processados no frontend via loadAll (sem rota extra)
- [x] Integrar página no sistema de rotas e navegação (admin only)

## Autenticação Própria (Email/Senha)
- [x] Adicionar campo passwordHash na tabela users
- [x] Implementar rota de login (email + senha) com bcrypt
- [x] Implementar rota de registro de usuário (admin only)
- [x] Criar tela de login própria (/login)
- [x] Atualizar frontend para usar /login em vez de OAuth (main.tsx, useAuth, ProtectedRoute, Header)
- [x] Seed do usuário admin: comercial@visioneer.com.br / Fup@2026
- [x] Atualizar página de Usuários para admin cadastrar novos operadores/admins com email e senha
- [x] Permitir admin definir role (operador/admin) ao cadastrar
- [x] Permitir admin resetar senha de usuário + excluir usuário

## Performance — Delay nas Ações (Corrigido)
- [x] Implementar rotas batch para furos (batchUpdate, setAll)
- [x] Implementar rotas batch para perfis (batchUpdate, setAll)
- [x] Atualizações otimistas no FazendaContext para furos/perfis
- [x] Debounced invalidation (300-500ms) para evitar refetch storm
- [x] DebouncedNumberInput para campos de dias de ciclo nas variedades
- [x] Aumentar staleTime do loadAll para 30s + refetchInterval 60s
- [x] Migrar handleAndarTodo/handlePerfilToggle para usar rotas batch
- [x] Memoizar contextValue com useMemo para evitar re-renders

## Onda 1 — Receitas + Tarefas + Colheita
- [x] Schema: tabela receitas_crescimento
- [x] Schema: tabela tarefas
- [x] Schema: tabela registros_colheita
- [x] Push schema para banco (pnpm db:push)
- [x] Query helpers para receitas (CRUD)
- [x] Rotas tRPC para receitas (admin CRUD + leitura pública)
- [x] Página de Receitas (listagem em cards + formulário CRUD)
- [x] Query helpers para tarefas (CRUD + geração automática)
- [x] Rotas tRPC para tarefas (listar, concluir, gerar automáticas)
- [x] Página de Tarefas com checklist diário
- [x] Geração automática de tarefas a partir de ciclos pendentes
- [x] Geração automática de tarefas a partir de manutenções vencidas
- [x] Query helpers para registros de colheita
- [x] Rotas tRPC para registros de colheita
- [x] Modal de registro de colheita no TorreDetail
- [x] Integrar Receitas e Tarefas na navegação (Header)
- [x] Atualizar Dashboard com contagem de tarefas pendentes
- [x] Testes Vitest para receitas, tarefas e colheita

## Onda 2 — Planejamento de Plantio + Capacidade
- [x] Schema: tabela planos_plantio
- [x] Push schema para banco (pnpm db:push)
- [x] Query helpers para planos de plantio (CRUD + avanço de status)
- [x] Rotas tRPC para planos de plantio (admin CRUD + leitura pública)
- [x] Página de Planejamento: Calendário de Plantio (visão mensal com eventos)
- [x] Página de Planejamento: Formulário Novo Plano (3 passos: receita, quantidade/data, destino)
- [x] Página de Planejamento: Lista de Planos (tabela com filtros e ações)
- [x] Cálculo automático de datas intermediárias baseado na receita
- [x] Sugestão de torre/andar com capacidade disponível
- [x] Fluxo de status: Planejado → Em Germinação → Em Produção → Colhido / Cancelado
- [x] Página de Gantt de Capacidade (barras horizontais por andar/torre, real + planejado)
- [x] Projeção de Capacidade (andares disponíveis por fase nas próximas semanas)
- [x] Integrar Planejamento e Capacidade na navegação (Header)

## Onda 3 — Analytics Avançados + Relatórios
-- [x] Analytics: aba Yield (g/planta por variedade, yield esperado vs realizado)
- [x] Analytics: aba Planejado vs Realizado (atraso médio, taxa conclusão, desvio quantidade)
- [x] Analytics: aba Relatórios exportáveis (CSV: Produção, Operacional, Capacidade), Eficiência Capacidade)
- [x] Exportar relatórios como CSV

## Pendente Onda 1
- [x] Atualizar Dashboard com contagem de tarefas pendentes

## Movimentação de Perfis entre Andares/Torres
- [x] Rota tRPC: moverPerfil (perfil individual para outro andar da mesma fase)
- [x] Rota tRPC: moverAndar (todos os perfis de um andar para outro andar da mesma fase)
- [x] Validação: destino deve ser da mesma fase que a origem
- [x] UI: botão/modal de movimentação no TorreDetail (selecionar destino)
- [x] UI: opção de mover 1 perfil ou andar inteiro
- [x] Testes Vitest para rotas de movimentação

## Bug Fix
- [x] Dados inseridos no andar 1 da torre de mudas não aparecem no dashboard nem na torre

## Auditoria QA
- [x] BUG FIX: ReceitasPage e UsersPage protegidos com ProtectedRoute (sessão anterior)
- [x] BUG FIX: passwordHash removido da resposta auth.me (sessão anterior)
- [x] BUG FIX: React Hooks crash no TorreDetail (sessão anterior)
- [x] BUG FIX: Perfis não ativavam ao atribuir variedade (sessão anterior)
- [x] BUG FIX: auth.logout usava ctx.res.cookie (não existe no Express res mock) — corrigido para usar apenas clearCookie
- [x] BUG FIX: tarefas.concluir não aceitava observacoes e não retornava status — corrigido
- [x] CLEANUP: Removidos ~20 usuários de teste do banco de dados
- [x] QA: Testar Dashboard via browser (KPIs, torres, alertas, navegação)
- [x] QA: Testar Login/Logout via browser (funciona, logout quirk do preview mode)
- [x] QA: Testar Torre Detail via browser (andares, perfis, medição, aplicação, transplantio, mover)
- [x] QA: Testar Germinação via browser (novo lote, listagem, botões)
- [x] QA: Testar Manutenção via browser (nova manutenção, tipos, workflow)
- [x] QA: Testar Tarefas via browser (KPIs, filtros, gerar automáticas, nova tarefa)
- [x] QA: Testar Receitas via browser (formulário completo, filtro por variedade)
- [x] QA: Testar Planejamento via browser (calendário, lista, novo plano)
- [x] QA: Testar Capacidade via browser (Gantt, projeção semanal, filtros)
- [x] QA: Testar Analytics via browser (9 abas, filtros, relatórios CSV)
- [x] QA: Testar Ciclos via browser (listagem, novo ciclo)
- [x] QA: Testar Config via browser (EC/pH, variedades, backup/export/reset)
- [x] QA: Testar Usuários via browser (listagem, roles, ações)
- [x] QA: TypeScript sem erros (npx tsc --noEmit)
- [x] QA: 67 testes Vitest passando (7 arquivos, 0 falhas)

## Datas Individuais por Perfil
- [x] Adicionar campo dataEntrada na tabela perfis (timestamp, nullable)
- [x] Atualizar backend: permitir setar dataEntrada por perfil individualmente
- [x] Atualizar TorreDetail: mostrar e editar dataEntrada por perfil (não apenas por andar)
- [x] Manter compatibilidade: "Data de Entrada" do andar aplica a todos os perfis que não têm data própria
- [x] Calcular previsão de transplantio/colheita por perfil (baseado em dataEntrada + dias da variedade)
- [x] Dashboard: mostrar status parcial no andar (ex: "11/12 prontos para transplantio")
- [x] TorreCard: indicar quando parte do andar está pronta e parte não
- [x] Alertas: gerar alertas específicos por perfil quando previsão vence
- [x] Testes Vitest: 67 testes passando (7 arquivos, 0 falhas, sem regressão)

## Bug Fix: Datas e Clareza Visual nos Perfis
- [x] BUG: Input de data individual por perfil — adicionado onBlur como fallback para garantir que a mutation é chamada
- [x] UX: Banner de alerta no topo do andar mostrando perfis prontos para transplantio/colheita (com nomes)
- [x] UX: Badges coloridos em cada card de perfil (TRANSPL./COLHER! em vermelho, Xd em verde/amarelo)
- [x] UX: Resumo de status parcial (Transplante X/12, Em Processo Y/12)
- [x] UX: Cards de perfil no grid com borda vermelha + animação pulse quando prontos
- [x] Testes: 67 testes Vitest passando (7 arquivos, 0 falhas)

## Bug Fix: Gerar Tarefas não detecta transplantios pendentes
- [x] Investigar lógica de geração de tarefas no backend (routers.ts / db.ts)
- [x] Corrigir detecção de transplantios e colheitas pendentes baseada em dataEntrada por perfil
- [x] 67 testes Vitest passando (7 arquivos, 0 falhas)

## BUG CRÍTICO: Dados do usuário sendo apagados durante deploy/checkpoint
- [x] Causa raiz: teste permissions.test.ts executava admin.seed() que chama resetAllData() no banco de produção
- [x] Corrigido: teste agora apenas verifica permissão sem executar seed real
- [x] Nenhum outro teste chama seed/reset/resetAllData
- [x] 67 testes passando, dados preservados após execução

## Módulo de Inteligência Acionável
### Schema e Banco
- [x] Criar tabela IntelligentAlert (tipo, severidade, prioridade, titulo, descricao, entidadeTipo, entidadeId, fase, origem, dadosSnapshot, sugestaoAcao, nivelConfianca, status, hashUnico, tarefaGeradaId, lidoPor, resolvidoPor, ignoradoPor/Motivo/Prazo)
- [x] Criar tabela RecommendationRule (nome, tipo, gatilho, condicao, acaoSugerida, faseAplicavel, prioridadePadrao, severidadePadrao, ativo, versao, criadoPor, aprovadoPor, fonte, observacoes)
- [x] Criar tabela AlertEvent (alertaId, eventoTipo, usuarioId, usuarioNome, observacao, dadosExtra)
- [x] Executar pnpm db:push

### Backend - Motor de Regras
- [x] Implementar motor de regras determinísticas (intelligence-engine.ts)
- [x] Regra 1: Risco de Atraso (transplantio/colheita vencidos, manutenções com prazo, ciclos atrasados)
- [x] Regra 2: Torre Subutilizada (ocupação abaixo de 30%)
- [x] Regra 3: Lote Fora do Padrão (germinação <70%, desperdício >20%)
- [x] Regra 4: Manutenção Crítica (tipos críticos, >5 dias aberta, concentração por torre)
- [x] Regra 5: Capacidade Disponível (>50% perfis livres por fase + lotes prontos)
- [x] Regra 6: Inconsistência Planejamento vs Execução (planos atrasados)
- [x] Regra 7: Sequência Operacional Incompleta (andares sem lavagem)
- [x] Regra 8: Desempenho Abaixo da Média Histórica (yield <80% da média)
- [x] Regra 9: Desvio EC/pH (medições fora da faixa ideal) + fix replaceAll
- [x] Rotas tRPC: alertas (list, getById, recalcular, marcarLido, marcarEmAndamento, resolver, ignorar, criarTarefa, limparResolvidos, resumo)
- [x] Rotas tRPC: regras (list, getById, create, update, aprovar, delete)

### Frontend - Centro de Inteligência
- [x] Página /inteligencia com lista de alertas (cards com severidade, confiança, status)
- [x] Filtros por fase, tipo, severidade, status
- [x] Histórico de eventos por alerta (timeline com usuário e ação)
- [x] Ações rápidas (criar tarefa, resolver, ignorar com justificativa, marcar como lido)
- [x] Indicadores visuais de severidade e confiança (cores, badges, ícones)
- [x] Resumo de KPIs (total, críticos, altos, médios, baixos, novos)

### Frontend - Alertas Contextuais
- [x] AlertCenter global (sino no Header com badge de contagem)
- [x] AlertBanner no Dashboard (seção Inteligência Operacional com top 5 alertas)
- [x] Rota registrada no App.tsx

### Permissões e Rastreabilidade
- [x] publicProcedure: leitura de alertas e regras (operador + admin)
- [x] protectedProcedure: recalcular, marcarLido, resolver, ignorar, criarTarefa (operador + admin)
- [x] adminProcedure: CRUD regras, aprovar regras, limpar resolvidos (só admin)
- [x] Histórico completo de eventos por alerta (AlertEvent com usuário, tipo, observação)
- [x] Auditoria de ações (quem fez o quê e quando)

### Testes
- [x] Testes Vitest para motor de regras (14 testes: 9 regras + propriedades)
- [x] Bug fix: replaceAll no matching de tipos críticos de manutenção
- [x] 81 testes passando (8 arquivos, 0 falhas)

## Fix: Layout do Header
- [x] Corrigir posicionamento do nome/logo "Fazendas Up - Sistema Supervisório" no header com muitas abas

## Bug Fix: Datas de Tarefas e Edição de Ciclos
- [x] BUG: Tarefas gerando com data 29/03 em vez de hoje (30/03) — Corrigido com UTC
- [x] FEATURE: Adicionar edição individual de aplicações de ciclos (escolher data específica por aplicação) — Implementado modal CicloApplicationsEditor
- [x] FEATURE: Criar modal de prévia de dosagens antes de confirmar ciclo — Adicionado card com resumo de produto/tipo/fases
