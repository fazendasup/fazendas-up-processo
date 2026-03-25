# Brainstorm de Design - Fazendas Up - Sistema Supervisório

## Contexto
Sistema supervisório web para fazenda vertical de cultivo hidropônico. Foco em cadastro manual e operação diária. Dashboard com torres, caixas d'água, andares, ciclos de cultivo, alertas visuais e relatórios.

---

<response>
## Ideia 1 — "Botanical Industrial"
<probability>0.07</probability>

**Design Movement:** Industrial Botânico — fusão de elementos orgânicos de estufa com a precisão de painéis de controle industriais.

**Core Principles:**
1. Contraste entre natureza e tecnologia — superfícies metálicas com toques vegetais
2. Dados como paisagem — visualizações que lembram cortes transversais de plantas
3. Funcionalidade brutal — cada pixel serve a um propósito operacional

**Color Philosophy:** Paleta de estufa industrial. Fundo escuro grafite (#1a1f2e) com acentos em verde-musgo (#4a7c59), cobre oxidado (#b87333), e branco-giz (#f0ece2). O verde representa saúde da planta, o cobre alerta, e o grafite é a estrutura.

**Layout Paradigm:** Layout de painel de controle industrial com sidebar fixa à esquerda mostrando a "planta baixa" das torres como diagrama vertical. Conteúdo principal em grid assimétrico com cards de tamanhos variados baseados em prioridade.

**Signature Elements:**
1. Torres representadas como diagramas técnicos SVG com andares clicáveis
2. Indicadores circulares tipo gauge para EC e pH
3. Linhas de conexão pontilhadas entre torres e caixas d'água compartilhadas

**Interaction Philosophy:** Cliques revelam camadas de detalhe — como "zoom" em um diagrama técnico. Transições suaves de escala.

**Animation:** Transições de slide lateral para painéis, pulso suave em alertas, barras de progresso animadas para ciclos.

**Typography System:** DM Sans para corpo (legibilidade em dados), Space Grotesk para títulos (industrial moderno).
</response>

---

<response>
## Ideia 2 — "Agronomic Dashboard"
<probability>0.05</probability>

**Design Movement:** Data-Dense Agronomic — inspirado em dashboards de agricultura de precisão e estações meteorológicas profissionais.

**Core Principles:**
1. Densidade informacional controlada — máximo de dados visíveis sem sobrecarga
2. Hierarquia por cor de fase — verde-esmeralda (mudas), azul-petróleo (vegetativa), laranja-terra (maturação)
3. Tempo como eixo central — tudo gira em torno de datas, ciclos e contagens regressivas

**Color Philosophy:** Fundo claro creme (#faf8f5) com cards brancos puros. Três cores de fase dominam: esmeralda (#059669), azul-petróleo (#0e7490), terracota (#c2410c). Texto em grafite quente (#374151). Alertas em vermelho-vivo (#dc2626). A paleta evoca terra, água e crescimento.

**Layout Paradigm:** Dashboard com header fixo contendo resumo global + filtros. Corpo principal em grid responsivo de 3 colunas (agrupadas por fase). Ao clicar numa torre, painel desliza da direita como drawer, mantendo contexto do dashboard.

**Signature Elements:**
1. Cards de torre com mini-visualização vertical dos andares (barras coloridas por status)
2. Timeline horizontal para ciclos pendentes do dia
3. Badges numéricos com contagem regressiva (ex: "Colheita em 5d")

**Interaction Philosophy:** Navegação por drill-down — dashboard > torre > andar/caixa. Sempre visível onde você está via breadcrumbs.

**Animation:** Entrada suave de cards com stagger, números que contam animados, shake sutil em alertas críticos.

**Typography System:** Plus Jakarta Sans para corpo (moderna e amigável), Outfit para títulos e números (geométrica, ótima para dados).
</response>

---

<response>
## Ideia 3 — "Living Systems"
<probability>0.08</probability>

**Design Movement:** Biomimético Digital — interfaces que imitam sistemas vivos, com fluidez orgânica e visualizações que "respiram".

**Core Principles:**
1. A interface é um organismo — elementos pulsam, crescem e respondem como seres vivos
2. Gradientes naturais — cores que fluem como a luz do sol através de folhas
3. Espaço como respiração — layouts generosos que dão "ar" aos dados

**Color Philosophy:** Fundo em verde-escuro profundo (#0f2419) com gradientes sutis que simulam luz filtrada por folhagem. Acentos em verde-lima (#84cc16), âmbar (#f59e0b), e azul-água (#06b6d4). Texto em branco-pérola (#f5f5f4).

**Layout Paradigm:** Layout orgânico com dashboard central mostrando as torres como uma "floresta" de elementos verticais. Navegação por proximidade — torres agrupadas visualmente por fase em clusters, não em grid rígido.

**Signature Elements:**
1. Torres como barras verticais "vivas" que mudam de cor conforme status
2. Ondas animadas representando fluxo de água nas caixas
3. Círculos concêntricos para ciclos de aplicação

**Interaction Philosophy:** Hover revela informações como "desabrochar" — elementos expandem organicamente ao receber atenção.

**Animation:** Micro-animações de respiração (scale sutil), ondulações em superfícies de água, transições com easing orgânico (spring).

**Typography System:** Instrument Sans para corpo (clean e técnico), Bricolage Grotesque para títulos (personalidade orgânica).
</response>

---

## Decisão

**Escolha: Ideia 2 — "Agronomic Dashboard"**

Razão: É a abordagem mais funcional e prática para operação diária. A densidade informacional controlada permite que o operador veja rapidamente o status de todas as torres. As cores por fase (esmeralda, azul-petróleo, terracota) criam uma linguagem visual clara e intuitiva. O layout de drill-down (dashboard > torre > detalhe) é o mais natural para o fluxo de trabalho descrito. A tipografia Plus Jakarta Sans + Outfit oferece excelente legibilidade para dados numéricos.
