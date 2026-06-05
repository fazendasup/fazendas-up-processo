-- Delivery fee defaults for clients that charge freight.
-- Standard: 15.00. Gran Amazon: 31.00.

UPDATE `regras_comerciais_cliente`
SET `valor_taxa_entrega` = 15.00
WHERE `cobra_taxa_entrega` = 1;

UPDATE `regras_comerciais_cliente` r
JOIN `clientes` c
  ON c.`external_id` = r.`conta_azul_customer_id`
SET r.`valor_taxa_entrega` = 31.00
WHERE r.`cobra_taxa_entrega` = 1
  AND LOWER(c.`nome`) LIKE '%gran amazon%';