# Guia de testes — Fazendas UP

Este documento descreve **como testar de forma eficiente** neste monorepo (cliente Vite/React, servidor Express + tRPC, MySQL/Drizzle). Complementa o que o CI já faz (ver `.github/workflows/ci.yml`).

---

## 1. Visão geral: o que existe hoje

| Camada | Ferramenta | Onde | Comando típico |
|--------|------------|------|----------------|
| **Unitário / integração servidor** | Vitest 2.x | `server/**/*.test.ts`, `server/**/*.spec.ts` | `pnpm test` |
| **Cobertura (servidor)** | Vitest + v8 | Mesmos ficheiros | `pnpm test:coverage` |
| **E2E browser** | Playwright | `e2e/*.spec.ts` | `pnpm test:e2e` |
| **Tipos** | TypeScript | Todo o projeto | `pnpm run check` |
| **Build** | Vite + esbuild | Cliente + bundle servidor | `pnpm run build` |

**Eficiência em uma frase:** use **Vitest + `appRouter.createCaller`** para a maior parte da lógica de API e regras de negócio; reserve **Playwright** a poucos fluxos críticos na UI; mantenha **MySQL migrado** para testes que realmente leem/escrevem na BD.

---

## 2. Pré-requisitos locais

1. **Node** (o CI usa 22) e **pnpm** (o repositório fixa `packageManager` no `package.json`).
2. **MySQL** a correr com a base esperada pela `DATABASE_URL`.
   - Exemplo em `env.defaults`: utilizador `fazendas`, base `fazendas_up`.
   - Pode usar `pnpm dev:up` (sobe MySQL via Docker Compose e arranca dev) ou um MySQL já instalado.
3. **Ficheiro `.env`** na raiz (copiar de `env.defaults` ou `pnpm run setup:env` se existir no teu fluxo).
4. **Schema alinhado com o código:**  
   `pnpm db:migrate`  
   Sem migrações, alguns testes que tocam na BD falham ou comportam-se de forma estranha.

**Credenciais E2E:** o Playwright usa por defeito `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (ver `e2e/critical-flows.spec.ts`). A conta tem de existir na base (ex. após `pnpm db:seed-admin` ou equivalente).

---

## 3. Vitest — como corre e como filtrar

- **Configuração:** `vitest.config.ts`  
  - `environment: "node"`  
  - `include`: apenas ficheiros em `server/**/*.test.ts` e `server/**/*.spec.ts`  
  - Carrega `.env` da raiz via `dotenv`  
  - Aliases: `@/`, `@shared/` (útil se algum teste importar módulos do cliente).

**Comandos úteis:**

```bash
# Suite completa (CI)
pnpm test

# Um ficheiro
pnpm exec vitest run server/tenant-isolation.test.ts

# Um teste por nome (regex)
pnpm exec vitest run -t "admin pode resyncBootstrap"

# Modo watch durante desenvolvimento
pnpm exec vitest
```

**Cobertura (foca o servidor):**

```bash
pnpm test:coverage
```

Relatórios em `./coverage/`; no `vitest.config.ts` o `include` de cobertura é `server/**/*.ts` excluindo testes e alguns artefactos.

---

## 4. Padrão principal: tRPC sem HTTP

A forma mais **rápida e estável** de testar regras de API é instanciar o router e chamar procedures como funções:

```ts
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const caller = appRouter.createCaller(contextoTrpcCompleto);
const dados = await caller.fazenda.loadAll();
```

Isto evita subir servidor, portas, CORS e parsing HTTP — só validas **contexto + input + saída**.

Referências no repositório:

- `server/fazenda.test.ts` — `fazenda.loadAll` e fluxos com admin vs operador.
- `server/sensitive-routes.test.ts` — rotas que dependem de dados (receitas, planos, etc.).
- `server/tenant-isolation.test.ts` — permissões e mocks de `db` para rotas sensíveis.

---

## 5. Contexto tRPC e multi-projeto

O middleware resolve utilizador, cookie de sessão e **projeto ativo**. Nos testes:

### 5.1 Header de projeto

O cliente envia o header `x-projeto-id` (`PROJETO_HEADER` em `shared/const.ts`). Nos testes, o helper **`withProjetoBase`** (`server/test-projeto-trpc.ts`) injeta esse header e prepara o `req` para bater certo com `projectProcedure`.

### 5.2 Mock de `resolveProjetoForUser`

Muitos testes chamam `useMockProjetoResolve()` **uma vez no topo do ficheiro** (fora de `describe`). Isso faz `vi.spyOn(db, "resolveProjetoForUser")` para aceitar o `projetoId` do header sem precisares de linhas reais em `projeto_usuarios`.

- **Vantagem:** testes rápidos e determinísticos.  
- **Limitação:** não valida a BD de memberships; para isso precisas de dados reais ou de um teste dedicado.

### 5.3 IDs de teste

`TEST_PROJETO_ID = 1` em `server/test-projeto-trpc.ts` é o projeto fictício por omissão. A tua base local deve ter o projeto `1` com dados (seed) se quiseres asserts sobre contagens ou listagens.

### 5.4 Papéis

- `user.role === "admin"` — administração global (ex. migrações expostas em `projetos`).
- `user.role === "user"` — utilizador normal; combina com `projetoProcedure` e roles de projeto (`operador`, etc.) conforme o router.

Para **matriz de permissões**, segue o estilo de `tenant-isolation.test.ts`: um `ctxUser("admin" | "user")` e `expect(...).rejects.toMatchObject({ code: "FORBIDDEN" })`.

---

## 6. Mock da camada `db` vs integração real

| Abordagem | Quando usar | Cuidado |
|-----------|-------------|---------|
| **`vi.spyOn(db, "nomeDaFunção")`** | Garantir que **só admin** chama migrações; simular `getProjetoByIdForUser` para cenários de acesso. | Restaurar com `afterEach(() => vi.restoreAllMocks())` ou `useMockProjetoResolve` que já faz cleanup. |
| **Sem mock (BD real)** | Fluxos completos: `fazenda.loadAll`, criar receita, etc. | Requer MySQL + migrate + possivelmente seed; dados podem variar entre máquinas. |
| **Testes sem BD** | Funções puras (`server/zoned-day.test.ts`, lógica isolada). | Máxima velocidade; não substituem contratos com Drizzle. |

**Dica de eficiência:** para nova feature, escreve primeiro o teste com **caller + mock mínimo**; só depois acrescenta um teste de integração se o risco for migração/schema ou SQL cru.

---

## 7. Playwright (E2E)

- **Config:** `playwright.config.ts`  
  - `baseURL` por defeito `http://127.0.0.1:3456` (override: `PLAYWRIGHT_BASE_URL`).  
  - Arranca `pnpm dev` como **webServer** a menos que defines `PLAYWRIGHT_SKIP_WEBSERVER=1` (útil se o servidor já estiver a correr).  
  - `workers: 1`, `fullyParallel: false` — sequencial, mais estável para estado partilhado (sessão, BD).  
  - Timeout longo (90s teste / 20s expect) para ambientes lentos.

**Comandos:**

```bash
pnpm test:e2e
pnpm test:e2e:ui
```

**Eficiência:** mantém **poucos** testes E2E (login, uma navegação crítica). Detalhe de regras fica no Vitest. Em `e2e/critical-flows.spec.ts` usa-se `test.skip` quando não há torres — evita falhas ruidosas em bases vazias.

---

## 8. Alinhamento com o CI

O job `build-test` (GitHub Actions):

1. Sobe **MySQL 8** em serviço.  
2. Define `DATABASE_URL` para a base `fazendas_ci`.  
3. `pnpm install --frozen-lockfile`  
4. `pnpm exec drizzle-kit migrate`  
5. `pnpm run check` → `pnpm test` → `pnpm run build`

**Consequência:** qualquer teste que dependa de tabelas não cobertas pelas migrações **vai falhar no CI**. Antes de adicionar colunas novas, gera migração Drizzle e atualiza `drizzle/meta`.

---

## 9. Estratégia eficiente por tipo de alteração

| Alteração | Onde testar primeiro |
|-----------|----------------------|
| Nova procedure tRPC / Zod | Vitest: `createCaller` + contexto admin/operador + `withProjetoBase`. |
| Regra “só admin” / “só com projeto” | `tenant-isolation.test.ts` ou ficheiro novo espelhando esse padrão. |
| Função em `server/db.ts` | Preferir teste via **router** que já aplica `projetoId`; se impossível, teste unitário importando `db` com BD de teste ou mock. |
| Lógica de datas / fusos | Teste unitário isolado (ex. `zoned-day.test.ts`). |
| UI / fluxo longo | Playwright só se for crítico; senão teste manual ou componente (não há suite React Testing Library neste repo). |

**Ordem sugerida antes de abrir PR:** `pnpm run check` → `pnpm test` → `pnpm run build`. Opcionalmente `pnpm test:e2e` localmente.

---

## 10. Boas práticas (flakiness e manutenção)

1. **Não dependas da ordem global dos testes** se usarem a mesma BD — onde possível, usa dados com nomes únicos (timestamps/sufixos) ou mocks.  
2. **`beforeEach` / `afterEach`:** mocks de `db` devem ser limpos para não vazar para o ficheiro seguinte.  
3. **Asserts de erro tRPC:** `rejects.toMatchObject({ code: "FORBIDDEN" })` é mais estável que comparar mensagens completas.  
4. **Skip condicional** (`if (!rv) return` ou `test.skip`) — documenta no comentário por que o teste pode não correr (ex. sem variedades).  
5. **Documentação de segurança:** `docs/AUDITORIA-TENANT-ROUTERS.md` e `docs/AUDITORIA-DB-TS-QUERIES.md` ajudam a escolher **que** cenários de tenant valem um teste novo.

---

## 11. Checklist rápido

- [ ] `.env` com `DATABASE_URL` válida para o ambiente.  
- [ ] `pnpm db:migrate` aplicado.  
- [ ] `pnpm run check` sem erros.  
- [ ] `pnpm test` verde.  
- [ ] Se alteraste fluxos de login/onboarding: `pnpm test:e2e` com credenciais corretas.  
- [ ] Se adicionaste dependência: `pnpm-lock.yaml` atualizado e CI com `frozen-lockfile` ok.

---

## 12. Referências de código

| Tópico | Ficheiro |
|--------|----------|
| Config Vitest | `vitest.config.ts` |
| Helpers tRPC / projeto | `server/test-projeto-trpc.ts` |
| Constante header projeto | `shared/const.ts` (`PROJETO_HEADER`) |
| E2E exemplo | `e2e/critical-flows.spec.ts` |
| CI | `.github/workflows/ci.yml` |
| Variáveis locais exemplo | `env.defaults` |

---

*Última atualização: alinhado ao estado do repositório em 2026-04.*
