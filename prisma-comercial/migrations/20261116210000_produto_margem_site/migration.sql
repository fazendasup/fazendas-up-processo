-- AlterTable: add site-only margin column (never touches precoBase / Conta Azul)
ALTER TABLE `produtos_comerciais`
  ADD COLUMN `margem_site` DECIMAL(5, 2) NULL;
