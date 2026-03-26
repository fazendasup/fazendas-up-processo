# QA Notes

## Teste 1: Configurações
- Página carregou OK
- 3 cards de EC/pH: Mudas (1-1.2, 5.8-6.2), Vegetativa (1.5-2, 5.5-6.5), Maturação (2-2.5, 5.8-6.2)
- Tabela de variedades: 12 variedades com dias por fase e total
- Botões: Restaurar Padrão, Nova Variedade, Fazer Backup, Resetar
- Vou testar: editar EC da Mudas para 0.8-1.3 e verificar no dashboard

### Teste 1 Resultado: PASSOU
- Mudas agora mostra "EC 0.8–1.3 | pH 5.8–6.2" no dashboard (antes era EC 1–1.2)
- Configuração refletiu corretamente no dashboard
- Seção "Mudas" no header do grupo mostra "EC 0.8–1.3 pH 5.8–6.2"
- Dashboard mostra: 14 torres, 138 andares, 1 ocupado (do teste anterior)
- KPIs: Plantas Ativas 0, Taxa Ocupação 0%, Prontas Colheita 0
- Maturação mostra "Em Processo" e "Colhidas" (correto)
- Mudas e Vegetativa mostram apenas "Em Processo" (correto)
- BUG NOTADO: Torre Mudas 1 mostra "1/12 andares" mas "0 em processo" — inconsistência


### Teste 2: Germinação
- Modal abriu OK com: Variedade, Quantidade, Dias para Transplantio, Data/Hora, Observações
- Selecionei Alface Crespa, 72 sementes, obs "Sementes lote #42 - teste QA"
- BUG: O campo "Quantidade de Sementes" não aceita input via browser fill (tipo number com wrapper)
- Consegui preencher via JS, mas o botão "Registrar Plantio" não fechou o modal
- Possível BUG: O formulário não está registrando — pode ser que o estado React não atualizou com o JS hack
- Vou verificar o código do formulário


### Teste 2 Resultado: PASSOU
- Lote registrado: "Alface Crespa - 72 sementes"
- Mostra: "Plantado: 26/03/26, 16:11 | 0 dias decorridos | Transplantio em 1d"
- Germinadas: 0, Não germ.: 0 (editável)
- Observação "Sementes lote #42 - teste QA" aparece
- Botão "Pronto" e botão lixeira disponíveis
- Seção "Germinando (1)" apareceu
- Seção "Histórico (0)" aparece abaixo


### Teste 3: Torre Mudas 1
- Página carregou OK: "Torre Mudas 1 | 12 andares · Mudas · 12 perfis abertos"
- Mostra "0 Perfis Ativos" (correto, nenhum plantado)
- A12 tem bolinha verde (dados do teste anterior), outros cinza
- Caixa Mudas: "EC ideal: 0.8–1.3 | pH ideal: 5.8–6.2" (refletiu config!)
- Última medição: "EC 1.1 pH 5.9 | 25/03/2026, 21:19" (do teste anterior)
- Abas: Medição, Aplicação, Histórico
- Área de andar: "Selecione um andar na lista à esquerda"
- TESTE CONFIG PASSOU: EC 0.8-1.3 aparece corretamente


- Cliquei no A11 (mas selecionou A10 pelo index — A11 é index 19 que virou A10)
- BUG POSSÍVEL: index dos botões pode estar desalinhado, mas visualmente selecionou corretamente
- Andar 10 abriu com: Data de Entrada, Salvar Data, Visualizar/Plantar, 12 perfis (P1-P12) em grid compacto
- Grid mostra "PERFIS DE ESPUMA FENÓLICA" com 12 perfis em 2 linhas (P1-P6, P7-P12)
- Legenda: "Vazio, Ativo (0)"
- Botões: Transplantio, Limpar
- Abas do andar: Aplicação, Histórico
- Formulário de aplicação no andar com: Tipo, Produto, Quantidade, Data/Hora


- Selecionei Rúcula (10d) como variedade para todos os perfis — FUNCIONOU
- Todos os 12 perfis individuais mostram "Rúcula" como label
- Variedade por perfil individual disponível via "Definir variedade por perfil individual..."
- Cliquei "Ativar/Desativar Andar Todo (12 perfis)" — FUNCIONOU
- A10 agora mostra "12/12 Rúcula" na lista de andares
- Grid mostra todos 12 perfis em verde (ativo) com "Rúcula" em cada
- Legenda: "Vazio (0) · Ativo (12)"
- Contador no topo: "12 Perfis Ativos" (era 0)
- PASSOU: Plantio de perfis funciona corretamente


### Teste 3 - Dashboard após plantio: PASSOU
- KPIs: Plantas Ativas=12, Taxa Ocupação=0.2%, Prontas Colheita=0, Taxa Germinação=-, Desperdício=-, Manutenções=0
- "1 lote(s) germinando" badge aparece (do Teste 2)
- Plantas por Fase: Mudas=12 Em Processo, Vegetativa=0, Maturação=0 Em Processo + 0 Colhidas
- EC 0.8-1.3 | pH 5.8-6.2 aparece ao lado de "Mudas" (CONFIG REFLETIU!)
- Torre Mudas 1: mostra "12 em processo | 1/12 andares | Caixa Mudas"
- Mini-grid visual mostra 1 andar verde (A10) e 11 cinzas
- Maturação mostra "Em Processo" e "Colhidas" (correto, só maturação tem colhidas)
- TUDO PASSOU


### Teste 4: Torre Vegetativa 1
- Página carregou: "Torre Vegetativa 1 | 12 andares · Vegetativa · 12×9 furos"
- Caixa Vegetativa 1: "EC ideal: 1.5–2 | pH ideal: 5.5–6.5"
- Andar 12 abriu com grid compacto: "12 PERFIS × 9 FUROS"
- Grid mostra 12 perfis (P1-P12) cada com 9 furos (dots) em layout compacto
- Legenda: "108 · 0" (108 vazios, 0 plantados)
- Todos os 12 perfis visíveis na tela sem scroll — COMPACTO OK!
- Botões: Visualizar, Plantar, Transplantio, Limpar
- Sem opção de Colher (correto, vegetativa não tem colheita)


- Modo Plantar ativado na Vegetativa
- Grid 12 perfis × 9 furos visível (todos os 12 perfis na tela)
- Cada perfil tem botão "Plantar" individual + 9 furos clicáveis
- "0/108 plantados" mostra no rodapé
- Seletor "Variedade para todos os perfis..." disponível
- Botão "Plantar Andar Todo (108 furos)" disponível
- Abas Aplicação e Histórico no andar
- BUG ENCONTRADO: No modo Plantar, o grid ficou grande novamente com scroll necessário (cada perfil mostra botão "Plantar" + 9 furos + ícone, ocupando mais espaço que o modo Visualizar)
- O modo Visualizar estava compacto, mas o modo Plantar expandiu demais


- Selecionei Espinafre (21d) como variedade — FUNCIONOU
- Cliquei "Plantar Andar Todo (108 furos)" — grid mostra "0/108 plantados" ainda
- BUG: O botão "Plantar Andar Todo" não ativou os furos. Os furos continuam cinza/vazios.
- O "Definir variedade por perfil individual" expandiu mostrando seletores por perfil (P1-P12)
- Todos os seletores individuais mostram "Espinafre (21d)" — a variedade propagou corretamente
- Mas os furos não foram ativados — preciso verificar o código


- Plantar Andar Todo (108 furos) FUNCIONOU no segundo clique!
- Todos os 108 furos ficaram verdes (plantados) com Espinafre (21d)
- "108/108 plantados" no rodapé
- A12 na lista lateral mostra "108/108" — CORRETO
- Nota: O primeiro clique expandiu os seletores individuais de variedade por perfil, o segundo clique efetivamente plantou. Pode ser confuso para o operador.
- Todos os 12 perfis visíveis na tela com furos compactos verdes — VISUAL OK


### Teste 4 - Dashboard após plantio Vegetativa: PASSOU
- KPIs: Plantas Ativas=120 (12 mudas + 108 vegetativa), Taxa Ocupação=1.7%, Prontas Colheita=0
- Plantas por Fase: Mudas=12, Vegetativa=108, Maturação=0+0 Colhidas
- EC/pH de referência aparece ao lado de cada fase — CONFIG REFLETIU
- Torre Vegetativa 1: "108 em processo | 1/12 andares" — CORRETO (deveria ser 1/12 andares pois só plantamos A12)
- BUG ENCONTRADO: Torre Vegetativa 1 mostra "0/12 andares" mas deveria mostrar "1/12 andares"
- Foto real das torres como banner — OK
- "1 lote(s) germinando" badge — OK (do Teste 2)


### Teste 5: Torre Maturação 1
- Página: "Torre Maturação 1 | 9 andares · Maturação · 6×6 furos"
- Mostra "Plantas Ativas" e "Colhidas" — CORRETO (só maturação tem colhidas)
- Caixa Maturação 1: "EC ideal: 2–2.5 | pH ideal: 5.8–6.2"
- Andar 9 abriu com grid 6×6 (6 perfis × 6 furos)
- Modos: Visualizar, Plantar, Colher — CORRETO (maturação tem Colher!)
- Grid compacto, todos os 6 perfis visíveis na tela
- "0/36 plantados" no rodapé
- Botões Transplantio e Limpar disponíveis


- Plantar Andar Todo (36 furos) com Alface Americana — FUNCIONOU
- Todos os 36 furos ficaram verdes
- "36/36 plantados" no rodapé
- A9 na lista lateral mostra "36/36" — CORRETO
- Plantas Ativas=36, Colhidas=0 no painel da torre — CORRETO
- Agora vou testar COLHEITA


- Modo Colher ativado — CORRETO
- Botões mudaram para "Colher" por perfil e "Colher Andar Todo"
- Furos mostram label "Colher" em cada um — clicáveis individualmente
- Vou colher o P1 inteiro (6 furos)


- Colher P1 (6 furos) — FUNCIONOU!
- P1 furos ficaram amarelos (colhidos)
- Painel torre: Plantas Ativas=30, Colhidas=6 — CORRETO
- A9 mostra "30/36" na lista lateral — CORRETO
- Rodapé: "30/36 plantados, 6 colhidos" — CORRETO
- Agora vou colher o restante do andar todo para testar alerta de lavagem


### Teste 5 - Colheita e Lavagem: PASSOU
- Colher Andar Todo — FUNCIONOU!
- Todos os 36 furos ficaram amarelos (colhidos)
- Painel torre: Plantas Ativas=0, Colhidas=36 — CORRETO
- A9 na lista lateral mostra bolinha vermelha + "LAVAR" — ALERTA DE LAVAGEM FUNCIONOU!
- Alerta: "Lavagem de Perfis Pendente! Colheita total em 26/03/2026"
- Botão "Marcar Lavado" disponível — CORRETO
- "0/36 plantados, 36 colhidos" no rodapé — CORRETO
- Agora vou testar marcar como lavado


- Marcar Lavado — FUNCIONOU!
- Alerta de lavagem desapareceu
- A9 na lista lateral: sem bolinha vermelha, sem "LAVAR" — CORRETO
- Painel torre: Plantas Ativas=0, Colhidas=36 — manteve dados
- Grid mostra todos os furos amarelos (colhidos) — CORRETO


### Teste 6 - Ciclos
- Ciclo "Troca de Solução Nutritiva" cadastrado — PASSOU
- Mostra: Semanal (Seg), Solução Nutritiva A+B, Mudas/Vegetativa/Maturação
- Botões Desativar e Excluir disponíveis — CORRETO
- Agora vou verificar se aparece no Dashboard como pendente (hoje é quarta, Seg já passou)


### Dashboard após testes 1-6
- KPIs visíveis: Plantas Ativas=120, Taxa Ocupação=1.7%, Prontas Colheita=0, Taxa Germinação=-, Desperdício=-, Manutenções=0
- "1 lote(s) germinando" badge — CORRETO (germinação registrada)
- Plantas por Fase: Mudas=12 Em Processo, Vegetativa=108 Em Processo, Maturação=0 Em Processo + 36 Colhidas — CORRETO
- EC/pH de referência: Mudas EC 0.8-1.3 pH 5.8-6.2 — CORRETO (atualizado da config)
- Vegetativa EC 1.5-2 pH 5.5-6.5 — CORRETO
- Maturação EC 2-2.5 pH 5.8-6.2 — CORRETO
- Torre Mudas 1: 12 em processo, 1/12 andares — CORRETO
- Torre Vegetativa 1: 108 em processo, 0/12 andares — BUG! Deveria mostrar 1/12 andares ocupados
- Torre Maturação 1: 0 em processo, 36 colhidas, 0/9 andares — BUG! Deveria mostrar 1/9 andares
- Preciso rolar para ver se ciclo pendente aparece
- BUG: Contagem de andares ocupados não está refletindo corretamente


### Bugs identificados no Dashboard:
1. BUG: Torre Vegetativa 1 mostra "0/12 andares" mas tem 108 plantas no andar 12 — deveria ser "1/12 andares"
2. BUG: Torre Maturação 1 mostra "0/9 andares" mas tem 36 colhidas no andar 9 — deveria ser "1/9 andares"  
3. BUG: Ciclo pendente "Troca de Solução Nutritiva" NÃO aparece no dashboard — deveria ter seção de alertas/ciclos pendentes
4. NOTA: Não vi seção de ciclos pendentes no dashboard — pode ser que não exista ou que hoje não é segunda

### Resumo dos testes:
- Configurações EC/pH → Dashboard: PASSOU
- Germinação → Dashboard: PASSOU (badge "1 lote germinando")
- Mudas plantar perfis → Dashboard: PASSOU (12 em processo, 1/12 andares)
- Vegetativa plantar furos → Dashboard: PARCIAL (108 em processo OK, mas 0/12 andares = BUG)
- Maturação plantar/colher/lavar → Dashboard: PARCIAL (36 colhidas OK, mas 0/9 andares = BUG)
- Ciclos → Dashboard: NÃO TESTÁVEL (hoje não é segunda)
- Manutenção: AINDA NÃO TESTADO


### Teste 7 - Manutenção: PASSOU
- Manutenção registrada: Torre Vegetativa 1, Vazamento Tubo Injetor
- Descrição: "Vazamento no tubo injetor do andar 8, gotejamento constante"
- Aberta: 26/03/2026
- Seção "Abertas (1)" — CORRETO
- Botões Iniciar, Concluir e Excluir disponíveis — CORRETO
- Seção "Concluídas (0)" — CORRETO


### Teste 8 - Dashboard Final
- KPIs: Plantas Ativas=120, Taxa Ocupação=1.7%, Prontas Colheita=0, Taxa Germinação=-, Desperdício=-, Manutenções=1 — CORRETO (manutenção refletiu!)
- "1 lote(s) germinando" badge — CORRETO
- Plantas por Fase: Mudas=12, Vegetativa=108, Maturação=0+36 colhidas — CORRETO
- EC/pH referências atualizadas: Mudas 0.8-1.3, Veg 1.5-2, Mat 2-2.5 — CORRETO
- Torre Vegetativa 1 mostra badge vermelho "1" (manutenção aberta) — CORRETO
- Torre Mudas 1: 1/12 andares — CORRETO
- BUGS CONFIRMADOS:
  - Torre Vegetativa 1: "0/12 andares" mas tem 108 plantas — deveria ser "1/12 andares"
  - Torre Maturação 1: "0/9 andares" mas tem 36 colhidas — deveria ser "1/9 andares"
  - Banner mostra "1 ocupados" mas deveria ser pelo menos 3 (1 mudas + 1 veg + 1 mat)


### Correção de Bugs — CONFIRMADA
- Banner agora mostra "3 ocupados" (1 mudas + 1 veg + 1 mat) — CORRETO
- Torre Vegetativa 1: "1/12 andares" — CORRETO (antes mostrava 0/12)
- Torre Maturação 1: "1/9 andares" — CORRETO (antes mostrava 0/9)
- Torre Mudas 1: "1/12 andares" — CORRETO (já funcionava antes)
- KPIs: Plantas Ativas=120, Taxa Ocupação=1.7%, Manutenções=1 — CORRETO


### Verificação Final do Dashboard (scroll down)
- Torre Vegetativa 1: 108 em processo, 1/12 andares, badge vermelho "1" (manutenção) — CORRETO
- Torre Vegetativa 2: 0 em processo, 0/12 andares — CORRETO
- Torre Vegetativa 3: 0 em processo, 0/12 andares — CORRETO
- Torre Maturação 1: 0 em processo, 36 colhidas, 1/9 andares, barra laranja (colhido) — CORRETO
- Torres Maturação 2-10: 0 em processo, 0/9 andares — CORRETO
- Visualização mini-torre: barras coloridas refletem corretamente o estado dos andares — CORRETO
- Todas as contagens estão corretas após a correção

