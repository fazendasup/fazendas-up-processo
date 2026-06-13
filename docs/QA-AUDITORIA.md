# Auditoria QA Funcional — Fazendas UP

> Revisão code-first concluída em jun/2026. Correções aplicadas em ondas pequenas com `npm run check`.

## Inventário de rotas

### Operação / processo (`App.tsx`)

| Rota | Página | Router(s) servidor |
|------|--------|-------------------|
| `/` | Home | torres, bancadas, tarefas, … |
| `/hoje` | HojePage | tarefas, ciclos |
| `/analytics` | AnalyticsPage | analytics |
| `/torre/:id` | TorreDetail | torres |
| `/bancada/:id` | BancadaDetail | bancadas |
| `/germinacao` | GerminacaoPage → redirect planejamento | planosPlantio |
| `/planejamento` | PlanejamentoPage | planosPlantio |
| `/capacidade` | CapacidadePage | planosPlantio |
| `/ciclos` | CiclosPage | ciclos |
| `/receitas` | ReceitasPage | receitas |
| `/cadastros` | ReceitasPage (alias) | receitas |
| `/estoque` | EstoquePage | estoque |
| `/config` | ConfigPage | config |
| `/manutencao` | ManutencaoPage | manutencao |
| `/tarefas` | TarefasPage (redirect modal) | tarefas |
| `/inteligencia` | Inteligencia | inteligencia |
| `/visao` | VisaoPage | visao |
| `/automacao` | AutomacaoPage | automacao |
| `/custos` | CustosProducaoPage | custos |
| `/usuarios` | UsersPage | users |
| `/projetos` | ProjetosPage | projetos |
| `/administrador` | AdministradorPage | admin |
| `/modulos-plataforma` | ModulosPlataformaPage | modulos |

### Comercial (`ComercialRoutes.tsx`)

| Rota | Página | Router servidor |
|------|--------|-----------------|
| `/comercial/dashboard` | Dashboard | dashboard |
| `/comercial/clientes` | Clientes | clientes |
| `/comercial/clientes/:id` | Cliente360 | clientes |
| `/comercial/oportunidades` | Oportunidades | oportunidades |
| `/comercial/mensagens` | Mensagens | mensagens |
| `/comercial/kpis` | Kpis | kpis |
| `/comercial/relatorios` | Relatorios | relatórios / pedidos |
| `/comercial/acompanhamento-avarias` | VarejoSupermercado | avarias |
| `/comercial/varejo` | redirect legado | — |
| `/comercial/pedidos` | Pedidos | pedidos |
| `/comercial/pedidos-historico` | PedidosHistorico | pedidos |
| `/comercial/estoque-vivo` | Pedidos (aba compras) | pedidos |
| `/comercial/entregas` | Entregas | entregas |
| `/comercial/entregador` | Entregador | entregas |
| `/comercial/execucoes` | Execucoes | execucoes |
| `/comercial/configuracoes` | Configuracoes | integracoes |

### Público

| Rota | Página |
|------|--------|
| `/login` | LoginPage |
| `/rastreio/:token` | RastreioEntrega |

---

## Onda 1 — Controles compartilhados (busca/seleção)

| Página | Problema | Correção | Status |
|--------|----------|----------|--------|
| Pedidos — emitir pedido | `Input` + `<select>` separados para cliente Conta Azul | `SearchSelect` com busca server-side | ✅ |
| Pedidos — agenda | Filtro de cliente compartilhava estado com formulário; `<select>` nativo | Estado `agendaClienteFiltro` + `SearchSelect` | ✅ |
| Entregas — adicionar cliente | `Input` + `<select>` | `SearchSelect` com filtro local | ✅ |
| PedidosHistorico — filtro cliente | `Input` + `<select>` | `SearchSelect` com busca server-side | ✅ |

Componente novo: `client/src/components/ui/search-select.tsx` (Popover + Command).

---

## Onda 2 — Comercial

| Página / área | Problema | Correção | Status |
|---------------|----------|----------|--------|
| ConciliacaoContaAzulPanel | Mutations não invalidavam dashboard, statusSemana, histórico | Helper `invalidarCachesConciliacao()` | ✅ |
| useSyncContaAzul | Sync não atualizava conciliação/fechamento | Invalidação de pedidos.* após sync | ✅ |
| entregasRouter | Clientes de rotas `CONCLUIDA` reapareciam como planejados | Incluir `CONCLUIDA` em `idsClientesEmRotasDoDia` | ✅ |
| entregasRouter | `encerrarRota` com paradas abertas | Bloqueio se paradas `PENDENTE`/`EM_ROTA` | ✅ |
| Entregador | Entrega não atualizava caches de pedidos | Invalidação cruzada pedidos + entregas | ✅ |
| Mensagens | Aprovar podia enviar texto anterior ao blur | Texto controlado + `texto` em `aprovarEEnviar` | ✅ |
| Pedidos | Pedidos novos/cancelados não refletiam em entregas | Invalidação de `entregas.roteiro` | ✅ |
| PedidosHistorico | Datas default em UTC (`toISOString`) | `hojeIsoLocal()` / início do mês local | ✅ |
| Clientes | Link quebrado `/clientes?busca=Mercado` | `comercialPath(...)` | ✅ |
| Cliente360 | Score recalculado não atualizava carteira | Invalidação listar/carteira/dashboard | ✅ |
| Dashboard, Kpis, Relatorios | Datas — já usam `hojeIsoLocal` nos presets | Sem alteração adicional | OK |
| Execucoes, Configuracoes, Oportunidades, Varejo | Sem achados materiais | — | OK |

---

## Onda 3 — Operação / administração

| Página / router | Problema | Correção | Status |
|-----------------|----------|----------|--------|
| planosPlantio | Quantidade ≤ 0 e datas fora de ordem aceitas via API | Zod: `.positive()` + ordem cronológica | ✅ |
| ciclos | Strings livres em frequência/alvo/fases | Enums Zod alinhados à UI | ✅ |
| receitas | Números negativos aceitos via API | Faixas de validação por campo | ✅ |
| CapacidadePage | Projeção conta plano em todas as fases | Lógica por janela de fase | ⏳ pendente |
| ProjetoContext | Cache stale ao trocar projeto | Incluir projetoId nas query keys | ⏳ pendente |
| trpc projectProcedure | Comercial visualizador pode mutar operações via API | Revisar matriz de permissões | ⏳ pendente |
| ModulosPlataformaPage | Menu stale durante toggle | Desabilitar nav durante invalidação | ⏳ baixa prioridade |
| TarefasPage | `/tarefas` só redireciona para modal | Documentado; wrapper opcional | ⏳ baixa prioridade |
| Login, Users, Projetos, Config, Estoque, Custos, Visão, Automacao, TorreDetail, BancadaDetail, Germinacao, Manutencao, Hoje, Analytics, Inteligencia | Sem achados materiais nesta passagem | — | OK |

---

## Onda 4 — Limpeza de código obsoleto

| Arquivo removido | Evidência |
|------------------|-----------|
| `EmbeddedMap.tsx` | Zero imports |
| `ManusDialog.tsx` | Zero imports |
| `DashboardLayout.tsx` + skeleton | Zero imports (app usa Header/ComercialLayout) |
| `hooks/useStorage.ts` | Zero imports (legado localStorage) |
| `lib/comercial/api.ts` | Zero imports (app usa tRPC) |
| `lib/comercial/tokens.ts` | Zero imports (auth por cookie) |
| `googleMapsLoader` — `buildMaps*` | Só usados por EmbeddedMap |

**Mantidos (ativos ou legado documentado):** `Map.tsx`, `OsmRouteMap.tsx`, redirect `/comercial/varejo`, `/germinacao`, `syncErpTheme.tsx` (embed ERP — revisar depois).

---

## Validação

- `npm run check` — OK após cada onda
- Testes automatizados direcionados: não há suite E2E comercial; recomendado smoke manual em Pedidos, Entregas e Conciliação pós-deploy

---

## Commits (ondas)

1. `feat(ui): SearchSelect e substituição de Input+select`
2. `fix(comercial): invalidação de cache, entregas e mensagens`
3. `fix(ops): validação server-side planos, ciclos e receitas`
4. `chore: remove código morto comprovado`
5. `docs: relatório QA-AUDITORIA`
