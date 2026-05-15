# Smoke manual — assistente (só informação / insights)

Use com **pesquisa web desligada** e **sem confirmar** nenhuma ação pendente. O objectivo é validar que o modelo responde só com base no **resumo operacional do projeto** (bloco Markdown enviado com a conversa) e no raciocínio, sem chamar ferramentas `preparar_*` para gravar alterações.

## Prompts (≈6)

1. **Estado geral** — Com base no resumo operacional, resume em 5 tópicos o estado operacional do projeto: torres (fase e se estão activas), quantas variedades há no cadastro e se há concentração em poucas culturas.

2. **Planos de plantio** — Lista os planos de plantio que aparecem no resumo com status diferente de colhido/cancelado; para cada um indica status, variedade, data de início de germinação e colheita prevista. Não sugiras avançar status nem concluir tarefas.

3. **Fila Plantio (germinação inicial)** — Na secção «Planos — germinação / plantio inicial» do resumo, quantos planos estão em planejado e quais são os #id? Explica o que significa operacionalmente estarem nessa fila.

4. **Tarefas vs planos** — Qual a diferença, neste projeto, entre tarefas da checklist (tabela tarefas) e os cartões de germinação/plantio inicial? Cita um exemplo de cada se existir no resumo.

5. **Ciclos e automação** — Dos ciclos listados no resumo, quais estão activos, quais alvos (caixa/andar) aparecem e há algum com dosagem em branco ou produto repetido entre ciclos?

6. **Insight de gestão** — Com base só no resumo operacional, aponta um único risco ou oportunidade (ex.: gargalo de fase, planos atrasados vs capacidade declarada nas torres, ou incoerência entre perfis e planos). Sem recomendar cliques nem ferramentas de execução.

## Critério de sucesso (smoke)

- Respostas em português do Brasil, ancoradas no resumo (sem inventar IDs ou contagens).
- Nenhuma proposta de **Confirmar e executar** no painel, ou painel vazio de acções pendentes após a resposta.
- Se o modelo tentar usar ferramentas de operação para um pedido puramente analítico, reformule o pedido acrescentando: *«Responda só em texto; não use ferramentas.»*
