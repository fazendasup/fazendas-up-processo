CREATE TABLE `andares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`torreId` int NOT NULL,
	`numero` int NOT NULL,
	`dataEntrada` timestamp,
	`lavado` boolean NOT NULL DEFAULT true,
	`dataColheitaTotal` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `andares_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aplicacoes_andar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`andarId` int NOT NULL,
	`tipo` varchar(32) NOT NULL,
	`produto` varchar(256) NOT NULL,
	`quantidade` varchar(128) NOT NULL,
	`dataHora` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aplicacoes_andar_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aplicacoes_caixa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caixaAguaId` int NOT NULL,
	`tipo` varchar(32) NOT NULL,
	`produto` varchar(256) NOT NULL,
	`quantidade` varchar(128) NOT NULL,
	`dataHora` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aplicacoes_caixa_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caixas_agua` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`nome` varchar(128) NOT NULL,
	`fase` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caixas_agua_id` PRIMARY KEY(`id`),
	CONSTRAINT `caixas_agua_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `ciclos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(128) NOT NULL,
	`frequencia` varchar(32) NOT NULL,
	`diasSemana` json,
	`intervaloDias` int,
	`produto` varchar(256) NOT NULL,
	`tipo` varchar(64) NOT NULL,
	`fasesAplicaveis` json NOT NULL,
	`alvo` varchar(16) NOT NULL DEFAULT 'caixa',
	`ultimaExecucao` timestamp,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ciclos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fases_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fase` varchar(32) NOT NULL,
	`label` varchar(64) NOT NULL,
	`ecMin` float NOT NULL,
	`ecMax` float NOT NULL,
	`phMin` float NOT NULL,
	`phMax` float NOT NULL,
	`cor` varchar(64) NOT NULL,
	`corLight` varchar(64) NOT NULL,
	`icon` varchar(16) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fases_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `fases_config_fase_unique` UNIQUE(`fase`)
);
--> statement-breakpoint
CREATE TABLE `furos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`andarId` int NOT NULL,
	`perfilIndex` int NOT NULL,
	`furoIndex` int NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'vazio',
	`variedadeId` int,
	CONSTRAINT `furos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `germinacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`variedadeId` int NOT NULL,
	`variedadeNome` varchar(128) NOT NULL,
	`quantidade` int NOT NULL,
	`dataPlantio` timestamp NOT NULL,
	`dataHora` timestamp NOT NULL,
	`diasParaTransplantio` int NOT NULL DEFAULT 1,
	`germinadas` int NOT NULL DEFAULT 0,
	`naoGerminadas` int NOT NULL DEFAULT 0,
	`transplantadas` int NOT NULL DEFAULT 0,
	`status` varchar(32) NOT NULL DEFAULT 'germinando',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `germinacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manutencoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`torreId` int NOT NULL,
	`andarNumero` int,
	`tipo` varchar(32) NOT NULL,
	`descricao` text NOT NULL,
	`dataAbertura` timestamp NOT NULL,
	`prazo` timestamp,
	`dataConclusao` timestamp,
	`solucao` text,
	`status` varchar(32) NOT NULL DEFAULT 'aberta',
	`lampadaIndex` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manutencoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicoes_caixa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caixaAguaId` int NOT NULL,
	`ec` float NOT NULL,
	`ph` float NOT NULL,
	`dataHora` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medicoes_caixa_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `perfis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`andarId` int NOT NULL,
	`perfilIndex` int NOT NULL,
	`variedadeId` int,
	`ativo` boolean NOT NULL DEFAULT false,
	CONSTRAINT `perfis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `torres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`nome` varchar(128) NOT NULL,
	`fase` varchar(32) NOT NULL,
	`numAndares` int NOT NULL DEFAULT 10,
	`caixaAguaId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `torres_id` PRIMARY KEY(`id`),
	CONSTRAINT `torres_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `transplantios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataHora` timestamp NOT NULL,
	`faseOrigem` varchar(32) NOT NULL,
	`faseDestino` varchar(32) NOT NULL,
	`variedadeId` int NOT NULL,
	`variedadeNome` varchar(128) NOT NULL,
	`quantidadeTransplantada` int NOT NULL,
	`quantidadeDesperdicio` int NOT NULL DEFAULT 0,
	`motivoDesperdicio` varchar(64),
	`torreDestinoId` int,
	`andarDestinoId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transplantios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variedades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`nome` varchar(128) NOT NULL,
	`diasMudas` int NOT NULL DEFAULT 14,
	`diasVegetativa` int NOT NULL DEFAULT 21,
	`diasMaturacao` int NOT NULL DEFAULT 28,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `variedades_id` PRIMARY KEY(`id`),
	CONSTRAINT `variedades_slug_unique` UNIQUE(`slug`)
);
