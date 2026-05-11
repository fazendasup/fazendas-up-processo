-- Não aplicar ENUM + UPDATE em migração SQL: o UPDATE `admin`→`platform_admin` era destrutivo em bases reais;
-- `platform_admin` e VARCHAR são tratados em `ensureUsersRoleVarchar()` + login (`server/db.ts`).

SELECT 1;
