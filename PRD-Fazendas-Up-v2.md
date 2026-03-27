# PRD — Fazendas Up v2: Plataforma de Gestão de Fazendas Verticais

**Produto:** Fazendas Up
**Versão:** 2.0
**Data:** 27 de março de 2026
**Autor:** Manus AI, em colaboração com a equipe Fazendas Up / Visioneer

---

## 1. Visão do Produto

O Fazendas Up nasceu como um sistema supervisório para acompanhar torres, andares e indicadores de uma fazenda vertical hidropônica. A versão atual (v1) já entrega um painel de controle funcional com KPIs, gestão de germinação, manutenções, ciclos de aplicação, medições EC/pH, controle de acesso por perfil (operador/admin) e analytics básicos.

A versão 2.0 transforma o Fazendas Up de um **supervisório reativo** em uma **plataforma de gestão proativa**, incorporando planejamento de cultivo, gestão operacional estruturada, visão de capacidade produtiva e analytics avançados. A inspiração principal vem do iFarm Growtune [1], adaptada à realidade operacional da Fazendas Up, com foco em valor operacional imediato e simplicidade de interface.

> **Missão v2:** permitir que a equipe da Fazendas Up planeje, execute e analise toda a operação da fazenda vertical em um único sistema, substituindo planilhas, anotações manuais e decisões por intuição.

---

## 2. Estado Atual do Sistema

Antes de propor novos módulos, é importante mapear o que já existe e funciona. A tabela abaixo resume as capacidades atuais e suas limitações.

| Módulo Atual | O que faz | Limitação |
|---|---|---|
| **Dashboard** | KPIs (plantas ativas, ocupação, prontas para colheita, desperdício, manutenções), alertas de ciclos pendentes e lotes germinando, visão por fase | Não mostra projeção futura nem planejado vs. realizado |
| **Torres / Andares** | Visualização e operação de perfis e furos, plantio, colheita, data de entrada, lavagem | Não há conceito de "lote" rastreável; sem previsão de colheita por andar |
| **Germinação** | CRUD de lotes, contagem de germinadas/não germinadas, status transitions | Não conecta automaticamente ao planejamento de plantio |
| **Manutenção** | Abertura, acompanhamento e conclusão de chamados | Sem checklists preventivos automáticos |
| **Ciclos** | Ciclos recorrentes de aplicação (nutrientes, defensivos) com marcação de execução | Não gera tarefas automáticas para a equipe |
| **Config** | Variedades (dias por fase), fases (EC/pH), caixas d'água | Não há conceito de "receita de crescimento" completa |
| **Analytics** | EC/pH temporal, produção, germinação, manutenção, ocupação, desperdício | Sem planejado vs. realizado, sem yield por m², sem projeção |
| **Usuários** | Login email/senha, roles admin/operador, rastreabilidade de quem executou | Funcional e completo para a necessidade atual |

---

## 3. Arquitetura de Informação Proposta

A nova arquitetura organiza o sistema em cinco grandes áreas, acessíveis pela navegação principal. Cada área agrupa módulos relacionados, mantendo a navegação limpa e a curva de aprendizado baixa.

```
┌─────────────────────────────────────────────────────────────────┐
│                        FAZENDAS UP v2                           │
├─────────────┬──────────────┬──────────────┬──────────┬─────────┤
│  OPERAÇÃO   │ PLANEJAMENTO │  CAPACIDADE  │ ANALYTICS│  ADMIN  │
│  (todos)    │  (admin)     │  (admin)     │ (admin)  │ (admin) │
├─────────────┼──────────────┼──────────────┼──────────┼─────────┤
│ Dashboard   │ Receitas     │ Gantt Chart  │ Yield    │ Config  │
│ Torres      │ Plano Plantio│ Projeção     │ Planej.  │ Ciclos  │
│ Germinação  │ Calendário   │              │ vs Real  │ Usuários│
│ Manutenção  │              │              │ Relat.   │         │
│ Tarefas     │              │              │          │         │
│ Colheita    │              │              │          │         │
└─────────────┴──────────────┴──────────────┴──────────┴─────────┘
```

A navegação principal fica organizada assim:

| Item Nav | Ícone | Acesso | Descrição |
|---|---|---|---|
| Dashboard | LayoutDashboard | Todos | Painel de controle com KPIs e alertas |
| Tarefas | ClipboardCheck | Todos | Checklists diários e tarefas pendentes |
| Germinação | Sprout | Todos | Gestão de lotes de germinação |
| Manutenção | Wrench | Todos | Chamados de manutenção |
| Receitas | BookOpen | Admin | Biblioteca de receitas de crescimento |
| Planejamento | Calendar | Admin | Plano de plantio e calendário |
| Capacidade | GanttChart | Admin | Gantt de ocupação e projeção |
| Analytics | BarChart3 | Admin | Yield, planejado vs. realizado, relatórios |
| Ciclos | CalendarClock | Admin | Ciclos recorrentes de aplicação |
| Config | Settings | Admin | Variedades, fases, caixas d'água |
| Usuários | Users | Admin | Gestão de contas e permissões |

---

## 4. Módulos e Funcionalidades

### 4.1. Módulo de Receitas de Crescimento

Este módulo substitui o cadastro simples de "variedades com dias por fase" por uma biblioteca completa de receitas, inspirada no catálogo de 158+ receitas do iFarm Growtune [1]. Cada receita é um conjunto de parâmetros que define como cultivar uma variedade específica do plantio à colheita.

**Entidade: Receita de Crescimento**

| Campo | Tipo | Descrição |
|---|---|---|
| nome | string | Nome da receita (ex: "Alface Crespa — Verão") |
| variedadeId | FK | Variedade associada |
| metodoColheita | enum | "corte_unico", "multi_corte", "colheita_continua" |
| diasGerminacao | int | Dias na fase de germinação |
| diasMudas | int | Dias na fase de mudas |
| diasVegetativa | int | Dias na fase vegetativa |
| diasMaturacao | int | Dias na fase de maturação |
| ecPorFase | JSON | Faixas EC recomendadas por fase |
| phPorFase | JSON | Faixas pH recomendadas por fase |
| temperaturaMin / Max | float | Faixa de temperatura ideal (graus C) |
| umidadeMin / Max | float | Faixa de umidade ideal (%) |
| horasLuz | int | Horas de luz por dia |
| densidadePorPerfil | int | Quantidade ideal de plantas por perfil |
| yieldEsperado | float | Gramas esperadas por planta na colheita |
| observacoes | text | Notas livres (dicas, cuidados especiais) |
| ativa | boolean | Se a receita está disponível para uso |

**Telas:**

A tela principal de Receitas apresenta uma lista em cards com filtro por variedade e método de colheita. Cada card mostra o nome da receita, a variedade, os dias totais do ciclo, o yield esperado e o método de colheita. Ao clicar, abre-se o detalhe da receita com todos os parâmetros organizados em seções: "Cronograma" (dias por fase em barra visual), "Ambiente" (EC/pH/temperatura/umidade/luz), "Produtividade" (yield, densidade) e "Notas". O botão "Usar esta receita" leva diretamente ao módulo de Planejamento de Plantio com a receita pré-selecionada.

O formulário de criação/edição de receita permite ao admin definir todos os parâmetros. Campos de EC/pH por fase são pré-preenchidos com os valores padrão da fase (do fasesConfig), podendo ser ajustados por receita. Receitas podem ser duplicadas para criar variações sazonais (ex: "Alface Crespa — Inverno" com dias diferentes).

**Relação com o sistema atual:** as variedades existentes continuam como entidade base, mas a receita adiciona uma camada de parâmetros operacionais. Uma variedade pode ter múltiplas receitas (ex: diferentes protocolos para verão e inverno). O campo `diasMudas/diasVegetativa/diasMaturacao` da variedade passa a ser o valor padrão, que a receita pode sobrescrever.

---

### 4.2. Módulo de Planejamento de Plantio

Este módulo permite ao admin planejar a produção com antecedência, definindo o que plantar, quando e onde, com base na capacidade disponível e nas receitas cadastradas. O iFarm Growtune oferece sugestão automática de spots disponíveis [1]; o Fazendas Up implementa isso usando os dados reais de ocupação das torres.

**Entidade: Plano de Plantio**

| Campo | Tipo | Descrição |
|---|---|---|
| receitaId | FK | Receita de crescimento selecionada |
| quantidadePlantas | int | Quantidade total desejada |
| dataInicioGerminacao | date | Data planejada para início da germinação |
| dataTransplantioMudas | date | Calculada: inicio + diasGerminacao |
| dataTransplantioVeg | date | Calculada: mudas + diasMudas |
| dataTransplantioMat | date | Calculada: veg + diasVegetativa |
| dataColheitaPrevista | date | Calculada: mat + diasMaturacao |
| torreDestinoId | FK | Torre sugerida/selecionada (opcional) |
| andarDestinoId | FK | Andar sugerido/selecionado (opcional) |
| status | enum | "planejado", "em_germinacao", "em_producao", "colhido", "cancelado" |
| observacoes | text | Notas do planejador |

**Telas:**

A tela de **Calendário de Plantio** é a visão principal, mostrando um calendário mensal onde cada dia exibe os eventos planejados: inícios de germinação (verde), transplantios (azul) e colheitas previstas (dourado). Ao clicar em um dia, abre-se o detalhe com todos os planos daquela data. Filtros por variedade, receita e status permitem focar no que interessa.

A tela de **Novo Plano** guia o admin em 3 passos: (1) selecionar receita, (2) definir quantidade e data de início, (3) o sistema calcula automaticamente todas as datas intermediárias e sugere torres/andares com capacidade disponível. A sugestão de destino usa a lógica: buscar andares da fase correta que estejam lavados e com perfis disponíveis, priorizando torres com menos ocupação para distribuir a carga.

A tela de **Lista de Planos** mostra todos os planos em uma tabela com colunas: receita, quantidade, data início, data colheita prevista, status, e ações (editar, cancelar, avançar status). Planos atrasados (data prevista ultrapassada sem avanço de status) são destacados em vermelho.

**Fluxo do Plano:**

```
Planejado → Em Germinação → Em Produção → Colhido
                                        → Cancelado (qualquer etapa)
```

Quando o admin avança o status para "Em Germinação", o sistema pode criar automaticamente um lote de germinação no módulo existente. Quando avança para "Em Produção", sugere registrar o transplantio. Essa integração conecta o planejamento à execução sem duplicar dados.

---

### 4.3. Módulo de Gestão Operacional (Tarefas)

Este módulo transforma os ciclos recorrentes e as necessidades operacionais em tarefas concretas para a equipe, com checklists diários e rastreabilidade de execução. O objetivo é que o operador abra o sistema pela manhã e veja exatamente o que precisa fazer naquele dia.

**Entidade: Tarefa**

| Campo | Tipo | Descrição |
|---|---|---|
| titulo | string | Descrição curta da tarefa |
| descricao | text | Instruções detalhadas |
| tipo | enum | "ciclo", "transplantio", "colheita", "lavagem", "medicao", "manutencao", "outro" |
| prioridade | enum | "baixa", "media", "alta", "urgente" |
| dataVencimento | date | Quando deve ser concluída |
| torreId | FK | Torre relacionada (opcional) |
| andarNumero | int | Andar relacionado (opcional) |
| caixaAguaId | FK | Caixa d'água relacionada (opcional) |
| cicloId | FK | Ciclo que gerou a tarefa (opcional) |
| planoPlantioId | FK | Plano de plantio relacionado (opcional) |
| atribuidoParaId | FK | Usuário responsável (opcional) |
| status | enum | "pendente", "em_andamento", "concluida", "cancelada" |
| concluidoPorId | FK | Quem concluiu |
| concluidoEm | timestamp | Quando foi concluída |

**Geração Automática de Tarefas:**

O sistema gera tarefas automaticamente a partir de três fontes. Primeiro, dos **ciclos recorrentes**: quando um ciclo está pendente (baseado na frequência e última execução), o sistema cria uma tarefa com título "Aplicar [produto] — [fase]" e data de vencimento para hoje. Segundo, do **planejamento de plantio**: quando uma data de transplantio ou colheita se aproxima (ex: 1 dia antes), o sistema cria tarefas como "Transplantar 200 Alface Crespa para Torre M1" ou "Colher Andar A3 da Torre V2". Terceiro, de **manutenções preventivas**: andares que precisam de lavagem, medições EC/pH atrasadas (sem medição há mais de X dias), e manutenções com prazo vencido geram tarefas urgentes.

**Telas:**

A tela principal de **Tarefas** é dividida em duas seções: "Hoje" (tarefas com vencimento hoje ou atrasadas) e "Próximos dias" (tarefas futuras agrupadas por dia). Cada tarefa mostra um checkbox para marcar como concluída, o título, a prioridade (badge colorido), a torre/andar relacionado e o responsável. Ao marcar como concluída, o sistema registra quem e quando executou.

O **Checklist Diário** é uma visão simplificada que o operador usa no dia a dia: uma lista sequencial de tarefas do dia, com instruções expandíveis e botão de "Feito" para cada item. Ao concluir todas as tarefas do dia, o sistema exibe uma mensagem de confirmação com o resumo do que foi feito.

A tela de **Histórico de Tarefas** (admin) mostra todas as tarefas concluídas com filtros por período, tipo, executor e torre, permitindo analisar a produtividade da equipe e identificar gargalos operacionais.

---

### 4.4. Módulo de Gestão de Colheita

Atualmente, a colheita é registrada apenas como toggle de furos (plantado → colhido) e data de colheita total do andar. Este módulo adiciona registro de peso, qualidade e destino, transformando a colheita em um evento rastreável com dados de produtividade.

**Entidade: Registro de Colheita**

| Campo | Tipo | Descrição |
|---|---|---|
| torreId | FK | Torre colhida |
| andarId | FK | Andar colhido |
| variedadeId | FK | Variedade colhida |
| receitaId | FK | Receita utilizada (opcional) |
| planoPlantioId | FK | Plano de plantio relacionado (opcional) |
| dataColheita | timestamp | Data e hora da colheita |
| quantidadePlantas | int | Número de plantas colhidas |
| pesoTotalGramas | float | Peso total da colheita em gramas |
| qualidade | enum | "A" (excelente), "B" (boa), "C" (abaixo) |
| destino | string | Cliente ou destino (ex: "Restaurante X", "Estoque") |
| observacoes | text | Notas sobre a colheita |
| executadoPorId | FK | Quem colheu |

**Tela:**

Ao colher um andar na página de Torre Detail, o sistema abre um modal de "Registro de Colheita" pedindo peso, qualidade e destino. Esses dados alimentam o módulo de Analytics com métricas de yield (gramas por planta, gramas por m²) e permitem comparar o realizado com o esperado da receita.

---

### 4.5. Módulo de Capacidade e Gantt Chart

Este módulo oferece uma visão temporal da ocupação da fazenda, permitindo ao admin visualizar quando cada andar estará livre, planejar a rotação de cultivos e identificar gargalos de capacidade. A visualização em Gantt é inspirada no iFarm Growtune Planning [1].

**Tela: Gantt de Ocupação**

O Gantt Chart mostra o eixo Y com as torres e andares (agrupados por fase) e o eixo X com o tempo (dias/semanas). Cada barra horizontal representa a ocupação de um andar, colorida pela variedade plantada. Barras sólidas representam ocupação real (dados do sistema), barras tracejadas representam ocupação planejada (do módulo de Planejamento). A largura da barra corresponde ao ciclo completo da receita (dias de permanência naquela fase).

Funcionalidades interativas: ao passar o mouse sobre uma barra, exibe tooltip com variedade, data de entrada, data prevista de saída e dias restantes. Ao clicar, navega para o detalhe do andar. Filtros por fase, torre e período permitem focar em áreas específicas. Um indicador de "capacidade disponível" no topo mostra quantos andares estão livres por fase.

**Tela: Projeção de Capacidade**

Uma visão complementar ao Gantt que mostra, para cada semana futura (4 a 12 semanas), quantos andares estarão disponíveis por fase, baseado nas datas de colheita previstas. Isso permite ao admin decidir quando iniciar novos planos de plantio sem sobrecarregar a capacidade.

---

### 4.6. Analytics Avançados

O módulo de Analytics atual já cobre EC/pH, produção, germinação, manutenção, ocupação e desperdício. A evolução adiciona três novas análises que dependem dos módulos de Receitas, Planejamento e Colheita.

**Nova aba: Yield**

Métricas de produtividade calculadas a partir dos registros de colheita: gramas por planta (média, por variedade, por receita), gramas por m² (estimado pela quantidade de perfis/furos), comparação entre yield esperado (da receita) e yield realizado (da colheita). Gráfico de barras agrupadas mostrando yield por variedade com linha de referência do esperado.

**Nova aba: Planejado vs. Realizado**

Comparação entre as datas planejadas (do módulo de Planejamento) e as datas reais de execução. Métricas: atraso médio por etapa (germinação, transplantio, colheita), taxa de conclusão de planos (% de planos que chegaram a "colhido"), e desvio de quantidade (plantas planejadas vs. plantas efetivamente colhidas). Gráfico de dispersão mostrando data planejada vs. data real para cada evento.

**Nova aba: Relatórios**

Relatórios pré-configurados que o admin pode gerar para um período selecionado: "Resumo de Produção" (total colhido por variedade, peso, qualidade), "Performance Operacional" (tarefas concluídas vs. pendentes, tempo médio de resolução de manutenções, taxa de execução de ciclos), e "Eficiência de Capacidade" (taxa de ocupação média, tempo médio de ociosidade por andar, rotatividade). Cada relatório é renderizado em tela com opção de exportar como CSV.

---

## 5. Fluxo do Usuário

### 5.1. Fluxo do Operador (dia a dia)

O operador inicia o dia abrindo a página de **Tarefas**, onde vê o checklist diário gerado automaticamente. As tarefas estão ordenadas por prioridade: primeiro as urgentes (manutenções vencidas, medições atrasadas), depois as normais (ciclos pendentes, transplantios do dia). Para cada tarefa, o operador lê as instruções, executa a ação na fazenda, e marca como concluída no sistema. Ao concluir, o sistema registra quem fez e quando.

Se durante a operação o operador encontra um problema (ex: lâmpada queimada, vazamento), ele abre um chamado de manutenção diretamente da página de Tarefas ou da Torre Detail, que gera uma tarefa urgente para a equipe de manutenção.

O operador também acessa o **Dashboard** para ter uma visão geral rápida dos KPIs e alertas, e a página de **Torres** para executar operações específicas (plantio, colheita, medições).

### 5.2. Fluxo do Administrador (planejamento)

O admin começa pela página de **Capacidade (Gantt)** para visualizar a ocupação atual e identificar janelas de disponibilidade. Com base nisso, acessa **Planejamento** para criar novos planos de plantio, selecionando receitas e definindo quantidades. O sistema sugere datas e destinos automaticamente.

Semanalmente, o admin acessa **Analytics** para revisar o yield, comparar planejado vs. realizado, e identificar variedades ou receitas com desempenho abaixo do esperado. Com base nesses dados, pode ajustar receitas (modificar dias por fase, EC/pH) ou criar novas variações.

O admin também gerencia **Receitas** (criando e ajustando protocolos de cultivo), **Ciclos** (definindo rotinas de aplicação), **Config** (parâmetros de fases e caixas d'água) e **Usuários** (cadastrando novos operadores).

---

## 6. Organização dos Dados

A tabela abaixo mostra como os dados se organizam por dimensão, permitindo filtros e agrupamentos consistentes em todo o sistema.

| Dimensão | Entidades | Usado em |
|---|---|---|
| **Torre** | Torres, Andares, Perfis, Furos | Dashboard, Torre Detail, Gantt, Tarefas |
| **Fase** | Fases Config, Caixas d'Água | Dashboard, Analytics, Gantt, Receitas |
| **Variedade** | Variedades, Receitas | Config, Receitas, Planejamento, Analytics |
| **Lote/Plano** | Plano de Plantio, Germinação, Transplantio, Colheita | Planejamento, Tarefas, Analytics |
| **Período** | Todas as entidades com timestamp | Analytics, Relatórios, Histórico |
| **Executor** | Usuários (executadoPorId em todas as tabelas) | Tarefas, Histórico, Performance |

O conceito de **Lote** é materializado pelo Plano de Plantio: um plano agrupa germinação, transplantios e colheita em uma unidade rastreável. Isso permite responder perguntas como "qual foi o yield do lote 47 de Alface Crespa?" ou "quanto tempo levou do plantio à colheita para o lote 52?".

---

## 7. Componentes de Interface Recomendados

| Componente | Uso | Biblioteca |
|---|---|---|
| **Calendário mensal** | Planejamento de plantio | react-day-picker (já no shadcn) |
| **Gantt Chart** | Capacidade e ocupação | Recharts (barras horizontais empilhadas) ou custom SVG |
| **Checklist com checkbox** | Tarefas diárias | shadcn Checkbox + Card |
| **Cards com badge de status** | Receitas, Planos, Tarefas | shadcn Card + Badge |
| **Tabela com filtros** | Listagens, Relatórios | shadcn Table + Select |
| **Modal de registro** | Colheita, Novo plano | shadcn Dialog + Form |
| **Barra de progresso por fase** | Receita (cronograma visual) | Custom com Tailwind |
| **Tooltip em gráficos** | Gantt, Analytics | Recharts Tooltip |
| **Tabs** | Analytics (abas de análise) | shadcn Tabs (já usado) |
| **Toast de confirmação** | Ações operacionais | Sonner (já instalado) |

---

## 8. Recomendações de UX para Operação Rápida

O sistema será usado em ambiente de produção, muitas vezes com as mãos sujas ou molhadas, em tablets ou celulares. As seguintes diretrizes de UX garantem operação rápida e sem fricção.

**Ações com um toque.** Marcar tarefa como concluída, registrar medição EC/pH e marcar ciclo como executado devem exigir no máximo dois toques: um para abrir e um para confirmar. Evitar formulários longos para ações recorrentes.

**Informação hierárquica.** O Dashboard mostra primeiro os alertas (vermelho/amarelo), depois os KPIs, depois as seções detalhadas. A página de Tarefas mostra primeiro as urgentes, depois as normais. O operador nunca precisa rolar para encontrar o que é mais importante.

**Feedback visual imediato.** Atualizações otimistas (já implementadas para furos/perfis) devem ser estendidas para tarefas e ciclos. Ao marcar uma tarefa como concluída, ela muda de cor instantaneamente, sem esperar o servidor.

**Navegação contextual.** Ao clicar em uma torre no Gantt, navegar para o detalhe da torre. Ao clicar em uma tarefa de transplantio, navegar para o andar de destino. Ao clicar em um alerta no Dashboard, navegar para a página relevante. O usuário nunca deve ficar "preso" em uma tela sem saber como voltar.

**Mobile-first.** Todas as telas devem funcionar em telas de 375px (celular). O Gantt Chart deve ter scroll horizontal com indicador de posição. Tabelas longas devem usar cards empilhados no mobile em vez de tabelas horizontais.

---

## 9. Prioridades de Implementação

A implementação é dividida em três ondas, priorizando valor operacional imediato. Cada onda pode ser entregue e validada independentemente.

### Onda 1 — Fundação (2-3 semanas)

| Prioridade | Módulo | Justificativa |
|---|---|---|
| P0 | **Tarefas (Checklist Diário)** | Valor imediato para operadores; transforma ciclos pendentes em ações concretas |
| P0 | **Receitas de Crescimento** | Base para planejamento; evolução natural do cadastro de variedades |
| P1 | **Registro de Colheita** | Dados de peso/qualidade são pré-requisito para analytics de yield |

A Onda 1 entrega valor operacional direto: o operador ganha um checklist diário, o admin ganha receitas parametrizadas, e a colheita passa a gerar dados de produtividade.

### Onda 2 — Planejamento (2-3 semanas)

| Prioridade | Módulo | Justificativa |
|---|---|---|
| P0 | **Planejamento de Plantio** | Permite planejar a produção com antecedência |
| P1 | **Gantt de Capacidade** | Visualização essencial para decisões de planejamento |
| P1 | **Projeção de Capacidade** | Complemento do Gantt para visão futura |

A Onda 2 transforma o sistema de reativo para proativo: o admin pode planejar semanas à frente e visualizar a ocupação temporal da fazenda.

### Onda 3 — Inteligência (1-2 semanas)

| Prioridade | Módulo | Justificativa |
|---|---|---|
| P1 | **Analytics: Yield** | Depende dos registros de colheita da Onda 1 |
| P1 | **Analytics: Planejado vs. Realizado** | Depende do Planejamento da Onda 2 |
| P2 | **Relatórios exportáveis** | Valor para gestão, mas não bloqueia operação |

A Onda 3 fecha o ciclo de melhoria contínua: com dados de yield e comparação planejado vs. realizado, o admin pode ajustar receitas e planos para otimizar a produção.

---

## 10. Métricas de Sucesso

| Métrica | Baseline (v1) | Meta (v2) | Como medir |
|---|---|---|---|
| Tarefas concluídas/dia | N/A (não existe) | > 80% das tarefas geradas | Tarefas concluídas / tarefas geradas |
| Planos de plantio criados | 0 | > 5/semana | Contagem de planos com status != cancelado |
| Yield registrado | 0% das colheitas | > 90% das colheitas | Colheitas com peso registrado / total |
| Desvio planejado vs. real | N/A | < 3 dias de atraso médio | Média(data_real - data_planejada) |
| Receitas cadastradas | 0 | > 10 receitas ativas | Contagem de receitas ativas |
| Ocupação média | Visível mas não rastreada | > 75% | Andares ocupados / total de andares |

---

## 11. Considerações Técnicas

O sistema atual já possui a infraestrutura necessária para suportar os novos módulos. O backend usa tRPC com Drizzle ORM sobre MySQL/TiDB, o frontend usa React 19 com Tailwind 4 e shadcn/ui, e a autenticação própria com bcrypt/JWT já está funcional. As novas tabelas (receitas, planos_plantio, tarefas, colheitas) seguem o mesmo padrão do schema existente, com campos de rastreabilidade (executadoPorId, executadoPorNome) e timestamps.

O Gantt Chart pode ser implementado com Recharts (barras horizontais) ou com um componente SVG customizado para maior controle visual. A geração automática de tarefas pode rodar como um cron job no servidor (verificando ciclos pendentes e datas de planos a cada hora) ou ser calculada on-demand quando o operador abre a página de Tarefas.

A performance otimizada com rotas batch e atualizações otimistas (já implementada para furos/perfis) deve ser estendida para o módulo de Tarefas, onde o operador vai marcar múltiplas tarefas como concluídas em sequência rápida.

---

## Referências

[1]: https://ifarm.fi/technologies "iFarm Growtune — Vertical Farming Technology"
