-- Evita MySQL 1265 "Data truncated for column 'role'" quando ENUM na BD não inclui `platform_admin`
-- (migrações inconsistentes / ALTER ENUM falhou em alguns hosts).
ALTER TABLE `users`
  MODIFY COLUMN `role` VARCHAR(32) NOT NULL DEFAULT 'user';
