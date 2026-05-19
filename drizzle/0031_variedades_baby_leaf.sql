ALTER TABLE `variedades` ADD COLUMN `babyLeaf` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE `variedades` SET `babyLeaf` = true WHERE `slug` IN ('manjericao', 'baby-leaf-beterraba', 'baby-leaf-acelga');
