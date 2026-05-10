# Checklist antes do primeiro cliente (go-live)

Use como lista objetiva **antes** de expor o sistema a utilizadores pagantes. Vários itens podem ser feitos **sem** hospedar ainda (segredos, docs, migrações, testes).

## Segurança e segredos

- [ ] `JWT_SECRET` único e forte em produção; `.env` fora do Git.
- [ ] Credenciais de bootstrap/seed **alteradas** face ao desenvolvimento (ver `server/seed-admin.mjs`).
- [ ] HTTPS no domínio público (TLS no proxy ou no PaaS).
- [ ] Rate limit ajustado (`RATE_LIMIT_MAX_PER_MINUTE`) se tiveres tráfego ou integrações.

## Base de dados e deploy

- [ ] `pnpm exec drizzle-kit migrate` na pipeline ou antes de cada deploy (como no CI).
- [ ] Backups automáticos no MySQL gerido + **restore testado** pelo menos uma vez (ver `docs/RUNBOOK-OPERACOES.md`).
- [ ] `GET /healthz` a responder `200` e `version` coerente com o deploy (opcional: variável `GIT_COMMIT` no CI).

## Multi-tenant e código

- [ ] PRs que toquem `server/db.ts` ou `server/routers/` revisados com a regra **projetoId do contexto**, não do cliente.
- [ ] Correr `pnpm test` localmente; idealmente CI verde no branch que vai a produção.

## Jurídico / Brasil (mínimo)

- [ ] Política de privacidade e forma de contacto acessível aos utilizadores (site ou dentro da app).
- [ ] Definir processo para pedidos LGPD (mesmo que manual no início): exportação/apagamento de dados pessoais.

## Observabilidade (quando já houver URL pública)

- [ ] Erros agregados (ex.: Sentry) e alerta de downtime (ex.: Better Stack / UptimeRobot).
- [ ] Logs sem dados sensíveis em excesso (palavras-passe, tokens).

---

**Hospedar “logo” ou não?** Não é obrigatório hospedar para cumprir segredos, migrações e revisão de código. **Hospedar** torna-se necessário para validar HTTPS real, backups do fornecedor, monitorização externa e testes com utilizadores. Ordem razoável: fechar itens desta lista em **staging** ou **local** → deploy **staging** → produção.
