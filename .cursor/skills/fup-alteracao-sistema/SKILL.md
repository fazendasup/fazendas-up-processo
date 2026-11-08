---
name: fup-alteracao-sistema
description: >-
  Consome pedidos de alteração de código/UI enfileirados pelo Assistente Fazendas Up
  (admin only) via /api/cursor-bridge e aplica no repositório ERP FUP. Use when the
  user mentions FUP alteração sistema, pedidos do assistente, cursor-bridge, or
  encaminhar alteração de sistema.
---

# FUP — Alteração de sistema (fila do Assistente)

## Contexto

No app, só **admin** / **platform_admin** pode confirmar `encaminhar_alteracao_sistema` no Assistente.
Isso grava uma linha em `solicitacoes_alteracao_sistema` (status `pendente`).
Este skill aplica o pedido no código e marca a solicitação como concluída.

## Pré-requisitos

1. Repo `fazendas-up-processo` aberto neste workspace.
2. Variáveis locais (`.env` ou shell):
   - `FUP_APP_URL` — ex. `https://app.fazendasup.com.br` (sem barra final)
   - `CURSOR_BRIDGE_SECRET` — mesmo valor da variável no Railway
3. Script: `scripts/cursor-bridge-solicitacoes.mts`

## Fluxo obrigatório

1. Listar pendentes:
   ```bash
   npx tsx scripts/cursor-bridge-solicitacoes.mts list
   ```
2. Se houver vários, peça ao usuário qual `#id` aplicar (ou aplique o mais antigo).
3. Claim:
   ```bash
   npx tsx scripts/cursor-bridge-solicitacoes.mts claim <id>
   ```
4. Implemente **exatamente** o `pedido` (e use `contextoConversacao` se houver).
5. Commit convencional + push em `main` (só se o usuário já pediu “suba” / deploy automático neste projeto; caso contrário commit local e pergunte). Neste projeto o padrão do dono é **subir** após alterações pedidas pelo assistente.
6. Concluir:
   ```bash
   npx tsx scripts/cursor-bridge-solicitacoes.mts concluir <id> "resumo do que foi feito" [commitSha]
   ```
7. Se falhar:
   ```bash
   npx tsx scripts/cursor-bridge-solicitacoes.mts falhou <id> "motivo"
   ```

## Regras

- Não execute pedidos que peçam apagar dados de produção em massa.
- Não altere secrets no Railway a partir deste skill.
- Mudanças de UI/código só; dados operacionais (plantio, torres) não vêm por esta fila.
- Responda em português do Brasil de forma curta ao terminar.
