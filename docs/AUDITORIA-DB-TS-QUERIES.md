# Auditoria de queries em `server/db.ts`

**Escopo:** todas as operações Drizzle (`select` / `insert` / `update` / `delete`), `sql.raw`, `execute` no pool mysql2, e funções auxiliares internas que acedem à BD.  
**Foco:** isolamento multi-tenant (`projetoId`), SQL sem filtro de projeto, e superfícies onde o **router** deve garantir `projetoId` + payload.

**Data da revisão:** 2026-04-16 (ficheiro ~3096 linhas).

---

## Legenda de severidade

| Nível | Significado |
|-------|-------------|
| **OK** | Filtro explícito por `projetoId` (ou tabela global sem tenant, p.ex. `users`). |
| **CONTRACT** | Sem `projetoId` na assinatura; o **Insert** deve trazer `projetoId` correto — risco se o caller não validar. |
| **OPS** | Operação administrativa / migração; afeta vários tenants ou schema; só deve ser invocada em contexto controlado. |
| **REVIEW** | Comportamento correto na maioria dos casos; ressalvas (payload parcial, FK externa, etc.). |
| **INFO** | Comportamento documentado ou limitação funcional (não necessariamente vulnerabilidade). |

---

## 1. SQL cru (`sql.raw` / `execute`)

| Local (função) | Tipo | Filtro `projetoId`? | Notas |
|----------------|------|---------------------|--------|
| `assignNullProjetoIdsToFvp` | `UPDATE \`t\` SET projetoId = ${pid} WHERE projetoId IS NULL` | Por tabela, só linhas NULL | **OPS** — `pid` numérico (não interpolado de input user). Consolida legado para FVP. |
| `ensureProjetosTables` | `CREATE TABLE`, `ALTER` FK | N/A | DDL. |
| `ensureProjetosMicroverdesSupport` | `ALTER TABLE projetos` | N/A | DDL em `projetos`. |
| `ensureProjetoMembershipsBootstrap` | `INSERT IGNORE … SELECT ${pid}, u.id, 'admin' FROM users u` | Liga **todos** os users ao projeto `pid` | **OPS** — efeito global de memberships; intencional para bootstrap. |
| `ensureBancadasSchemaColumns` | vários `ALTER` / `CREATE` / `UPDATE bancadas SET slug …` | `UPDATE` sem `projetoId` | **OPS** — backfill de `slug` em linhas com slug vazio; afeta todas as bancadas da instância. |
| `ensureReceitasCrescimentoNovasColunas` | `ALTER` + vários `UPDATE receitas_crescimento …` | **Sem** `projetoId` nos `UPDATE` | **OPS** — backfill de colunas derivadas em **toda** a tabela. Aceitável só como migração/compat; não deve ser tratado como “query de tenant”. |
| `ensureTransplantiosRastreioColumns` | `ALTER` | N/A | DDL. |
| `ensureCiclosDosagemColumn` | `ALTER` | N/A | DDL. |
| `ensureEstoqueItensTable` | `CREATE TABLE` + `ALTER ADD projetoId DEFAULT 1` | N/A | DDL + default legado. |
| `ensurePlanosPlantioGerminacaoColumns` | `ALTER` + `UPDATE planos_plantio …` | **Sem** `projetoId` no `UPDATE` | **OPS** — backfill global. |

**INSERT parametrizado (pool):** `createEstoqueItem` usa `pool.execute` com placeholders; primeiro parâmetro é `data.projetoId` com validação explícita (`projetoId` obrigatório) — **OK** desde que o caller passe o tenant certo.

---

## 2. Funções globais / sem tenant operacional

| Função | Severidade | Notas |
|--------|------------|--------|
| `getDb` | OK | Conexão. |
| `upsertUser`, `getUserByOpenId` | OK | Tabela `users`. |
| `getUserByEmail`, `getUserById`, `getAllUsers`, `createUserWithPassword`, `updateUserPassword`, `deleteUser`, `updateUserRole` | OK | Gestão global de utilizadores; proteção em router (admin). |
| `listProjetosForUser`, `getProjetoByIdForUser`, `resolveProjetoForUser`, `userHasProjetoAccess` | OK | Resolução de projeto + membership. |
| `createProjeto`, `updateProjeto`, `deactivateProjeto`, `reactivateProjeto` | REVIEW | `updateProjeto` atualiza por `projetos.id` apenas; ACL no router. |
| `addProjetoUser`, `removeProjetoUser`, `updateProjetoUserRole`, `listProjetoUsers` | OK | Escopo por `projetoId`. |
| `getProjetoRow` | REVIEW | Só filtra `projetos.id`; não verifica membership (esperado: já resolvido no tRPC). |

---

## 3. Migração / consolidação multi-projeto

| Função | Severidade | Notas |
|--------|------------|--------|
| `ensureIncompleteMultiProjetoSchema` | OPS | Orquestra DDL + `assignNullProjetoIdsToFvp`. |
| `getOperationalCountsForProjetos` | OK | `inArray(…projetoId, projetoIds)`. |
| `reassignOperationalDataBetweenProjetos` | OPS | Move dados entre `fromProjetoId` e `toProjetoId`; só admin / ferramentas. |
| `getOrCreateFazendaVerticalPrincipalProjetoId` | OPS | Cria ou devolve projeto legado. |
| `migrateAllOperationalDataToFazendaVerticalPrincipal` | OPS | Consolida todos os `projetoId` operacionais distintos para FVP. |
| `collectDistinctOperationalProjetoIdsExcluding`, `verifyOperationalDataForFvpProjeto`, `assertNoUniqueConflictsOnProjetoMerge` | OK / OPS | Helpers internos; queries com `eq(projetoId, …)` ou scans controlados. |

---

## 4. CRUD operacional com `projetoId` explícito (lista resumida)

Padrão consistente: `get*`, `update*`, `delete*` recebem `projetoId` como primeiro argumento e usam `and(eq(tabela.projetoId, projetoId), …)`.

Inclui (entre outras): bancadas, caixas bancada, medições/aplicações bancada, variedades, torres, estoque (leitura/escrita com `projetoId` no `where`), caixas d’água, medições/aplicações caixa, andares, perfis, furos, batches, `moverPerfil`, `moverTodosPerfilAndar`, aplicações andar, germinação, transplantios, manutenções, ciclos, `loadFullFazendaData`, `resetAllData`, receitas, tarefas, registros colheita, planos plantio, alertas, regras, eventos de alerta.

**`deleteTorre`:** cascata extensa; todas as sub-queries observadas incluem `eq(…projetoId, projetoId)` ou derivam de `andarIds` já obtidos com `projetoId`. **OK.**

---

## 5. Inserts com objeto `data` (CONTRACT)

Estas funções **não** recebem `projetoId` separado; confiam em `data.projetoId` (ou equivalente no insert):

| Função | Severidade |
|--------|--------------|
| `createBancada` | CONTRACT |
| `createVariedade`, `createTorre` | CONTRACT |
| `createCaixaAgua`, `createMedicaoCaixa`, `createAplicacaoCaixa` | CONTRACT |
| `createAplicacaoAndar` | CONTRACT |
| `createGerminacao`, `createTransplantio` | CONTRACT |
| `createManutencao`, `createCiclo` | CONTRACT |
| `createReceita`, `createTarefa` | CONTRACT |
| `createRegistroColheita`, `createPlanoPlantio` | CONTRACT |
| `createAlert`, `createRule`, `createAlertEvent` | CONTRACT |
| `bulkInsertVariedades`, `bulkInsertFasesConfig` (via `upsertFaseConfig`) | CONTRACT |
| `upsertFaseConfig` | CONTRACT — chave composta típica `(projetoId, fase)` no insert |

**Exceção com validação em DB:** `createEstoqueItem` valida `projetoId` finito antes do INSERT — **OK** ao nível de `db.ts`, mantém-se **CONTRACT** ao nível de tenant (quem define o número).

**`createTorreComEstrutura`:** usa `params.projetoId` em toda a cadeia. **REVIEW:** se `params.caixaAguaId` for passado, **não** há verificação em `db.ts` de que essa caixa pertence ao mesmo `projetoId` (depende do router ou validação adicional).

---

## 6. Updates com `Partial<Insert…>` (REVIEW — hijack de `projetoId`)

Funções como `updateTorre`, `updateBancada`, `updateAndar`, `updateEstoqueItem`, `updateVariedade`, `updateCaixaBancada`, etc. fazem `.set(data)` ou `.set(updates)` onde `data` é parcial.

**Risco:** se o payload incluir `projetoId` (ou outras FKs), um utilizador com acesso ao projeto A poderia, em teoria, alterar a linha e **mover** o registo para o projeto B se o `WHERE` ainda coincidir (ex.: `WHERE projetoId=A AND id=X` + `SET projetoId=B`). Mitigação recomendada: **remover `projetoId` (e `id`) do objeto `data` no router** antes de chamar `db`, ou sanitizar num wrapper em `db.ts`.

---

## 7. Comportamentos / queries a notar

| Função | Severidade | Detalhe |
|--------|------------|---------|
| `getTarefasByDate(projetoId, _date)` | INFO | O parâmetro `_date` **não** é usado na query; devolve todas as tarefas do projeto (possível bug funcional ou API legada). |
| `getOperationalCountsForProjetos` | OK | Agrega só para IDs pedidos; não expõe outros tenants. |

---

## 8. Resumo de achados prioritários

1. **CONTRACT em massa:** inserts `values(data)` — a segurança multi-tenant destas funções está no **router** + contexto tRPC (`projetoId` resolvido). Alinhar com `docs/AUDITORIA-TENANT-ROUTERS.md`.
2. **Partial updates:** avaliar política única de **strip** de `projetoId` / `id` em updates.
3. **`createTorreComEstrutura` + `caixaAguaId`:** validar ownership da caixa no mesmo projeto (router ou `db.ts`).
4. **SQL global de backfill** (`ensureReceitas…`, `ensurePlanosPlantio…`): correto para migrações; documentar que **não** são operações por-tenant; evitar expor a utilizadores normais.

---

## 9. Referência

- `docs/AUDITORIA-TENANT-ROUTERS.md` — quem chama `db.ts` e com que `projetoId`.
- Código: `server/db.ts`.
