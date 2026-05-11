-- DDL real está em `ensureUsersRoleVarchar()` (arranque do servidor), **depois** de `/healthz` estar à escuta.
-- Correr `ALTER TABLE users ... role` aqui no `drizzle-kit migrate` bloqueava no deploy Railway:
-- o script corre antes do Node e pode ficar à espera de metadata lock da réplica antiga (vários minutos → healthcheck falha).
-- Bases novas: esta entrada marca o passo como aplicado; o VARCHAR é aplicado no primeiro arranque pela função ensure.

SELECT 1;
