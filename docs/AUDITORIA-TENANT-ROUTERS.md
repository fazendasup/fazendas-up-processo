# Auditoria rápida — routers tRPC e escopo de projeto

Última revisão automática do código: procedures **sem** `projectProcedure` / `fazendaVerticalProcedure` / `hidroponiaProcedure` ficam listadas em **Rotas globais ou só utilizador**.

## Regra

- Dados operacionais (torres, tarefas, etc.): usar **`fazendaVerticalProcedure`**, **`hidroponiaProcedure`** ou **`projectProcedure`** + `projetoIdFromCtx` nas funções `db.*`.
- **`projetos.*` com `protectedProcedure`**: só operações de **lista / troca de projeto ativo / contagens filtradas**; validar sempre `getProjetoByIdForUser` ou conjunto permitido.
- **`adminProcedure` sem projeto**: poder global (criar projeto, utilizadores). Aceitável para operação interna; em SaaS puro pode exigir segundo factor ou auditoria.

## Inventário (por ficheiro em `server/routers/`)

| Router            | Base típica                          | Notas |
|-------------------|--------------------------------------|--------|
| `auth`            | `public` / `protected`               | Sem tenant — OK. |
| `projetos`        | `protected` / `admin`              | `getById`, `operationalCounts`, `switchActive` filtram por utilizador; **migração legado e resync só `adminProcedure`**. |
| `users`           | `admin`                              | Global. |
| `system`          | `public` health + `admin` notify      | OK. |
| `fazenda`         | `projectProcedure`                   | OK. |
| Torres / andares / perfis / furos / aplicacoes* (torre) | `fazendaVerticalProcedure` | OK. |
| `bancadas`, `*Bancada` | `hidroponiaProcedure`           | OK. |
| Restantes domínios | `projectProcedure` ou `adminProjectProcedure` | Rever cada `create`/`update` no `db` se usa `projetoIdFromCtx`. |

Reauditar após cada PR que toque em `server/routers/` ou `server/db.ts`.
