ALTER TABLE `aplicacoes_andar` ADD `executadoPorId` int;--> statement-breakpoint
ALTER TABLE `aplicacoes_andar` ADD `executadoPorNome` varchar(128);--> statement-breakpoint
ALTER TABLE `aplicacoes_caixa` ADD `executadoPorId` int;--> statement-breakpoint
ALTER TABLE `aplicacoes_caixa` ADD `executadoPorNome` varchar(128);--> statement-breakpoint
ALTER TABLE `ciclos` ADD `ultimoExecutorId` int;--> statement-breakpoint
ALTER TABLE `ciclos` ADD `ultimoExecutorNome` varchar(128);--> statement-breakpoint
ALTER TABLE `germinacao` ADD `executadoPorId` int;--> statement-breakpoint
ALTER TABLE `germinacao` ADD `executadoPorNome` varchar(128);--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `abertoPorId` int;--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `abertoPorNome` varchar(128);--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `concluidoPorId` int;--> statement-breakpoint
ALTER TABLE `manutencoes` ADD `concluidoPorNome` varchar(128);--> statement-breakpoint
ALTER TABLE `medicoes_caixa` ADD `executadoPorId` int;--> statement-breakpoint
ALTER TABLE `medicoes_caixa` ADD `executadoPorNome` varchar(128);--> statement-breakpoint
ALTER TABLE `transplantios` ADD `executadoPorId` int;--> statement-breakpoint
ALTER TABLE `transplantios` ADD `executadoPorNome` varchar(128);