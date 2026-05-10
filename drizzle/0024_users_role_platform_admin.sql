-- Papel global: `platform_admin` = equipa comercial/plataforma (módulos contratados).
-- `admin` = administrador operacional do cliente (config, utilizadores no projeto).

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('user', 'admin', 'platform_admin') NOT NULL DEFAULT 'user';

UPDATE `users` SET `role` = 'platform_admin' WHERE `role` = 'admin';
