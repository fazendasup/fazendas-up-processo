CREATE TABLE `estoque_itens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `categoria` varchar(32) NOT NULL,
  `nome` varchar(256) NOT NULL,
  `quantidadeTotal` float NOT NULL DEFAULT 0,
  `unidadeTipo` varchar(16) NOT NULL DEFAULT 'unidade',
  `usoPorEvento` float NOT NULL DEFAULT 0,
  `frequenciaDias` float NOT NULL DEFAULT 1,
  `prazoEntregaDias` int NOT NULL DEFAULT 7,
  `diasMargemCompra` int NOT NULL DEFAULT 7,
  `nivelMinimo` float,
  `precoUnitario` float,
  `fornecedor` varchar(256),
  `observacoes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `estoque_itens_id` PRIMARY KEY(`id`)
);
