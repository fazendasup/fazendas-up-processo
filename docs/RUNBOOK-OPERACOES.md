# Runbook curto — operações

## Secrets

- `JWT_SECRET`, `DATABASE_URL`, chaves de storage — só no ambiente do host (Railway, VPS, GitHub Secrets para CI).
- Nunca commitar `.env`.

## Backup MySQL

- **Gerido:** ativar backups automáticos no painel (RDS, PlanetScale, etc.).
- **Docker:** `docker compose exec mysql mysqldump -u root -p fazendas_up > backup.sql`
- Testar **restore** em ambiente de staging trimestralmente.

## Deploy

1. `pnpm run build` (ou imagem Docker).
2. Aplicar migrações: `pnpm exec drizzle-kit migrate` (ou pipeline CI).
3. Subir nova versão da app; smoke test em `GET /healthz` (JSON com `ok`, `version`; opcional `commit` se `GIT_COMMIT` estiver definido).

## Rate limit

- Variável opcional: `RATE_LIMIT_MAX_PER_MINUTE` (padrão ~500 em produção, ~4000 em desenvolvimento).

## Incidentes

- **502 / crash:** logs do processo + Sentry (se configurado).
- **Vazamento suspeito:** revogar sessões, rodar auditoria SQL por `projetoId`, ver `docs/AUDITORIA-TENANT-ROUTERS.md`.
