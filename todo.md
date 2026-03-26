# Fazendas Up — Atualização v2

## Modelo de Dados (types.ts)
- [ ] Variedade com dias de ciclo por fase (mudas, vegetativa, maturação)
- [ ] Sistema de perfis/furos por andar (6 perfis x 6 furos = 36 plantas)
- [ ] Estado de cada furo: vazio, plantado, colhido
- [ ] Alerta pós-colheita para lavagem de perfis
- [ ] Fase de Germinação (pré-mudas) com plantio, data, quantidade, variedade
- [ ] Registro de desperdício / não germinação por transplantio
- [ ] Sistema de manutenção por torre/andar (vazamentos, lâmpadas, etc.)
- [ ] KPIs de fazenda vertical

## Utilitários (utils-farm.ts)
- [ ] Cálculos de dias por variedade em vez de fase fixa
- [ ] Contagem de plantas por andar, torre e geral
- [ ] Status de plantas (em processo vs pronto para colheita)
- [ ] Funções de KPI (taxa germinação, desperdício, ocupação, produtividade)

## Correções de Bugs
- [ ] Ciclo marcado como "feito" continua aparecendo como pendente no dashboard
- [ ] Configurações não atualizam dados de referência no dashboard (EC, pH, ciclo dias)

## Páginas
- [ ] TorreDetail: grid visual 6x6 de perfis/furos por andar
- [ ] TorreDetail: transplantio com contagem de furos/perfis preenchidos
- [ ] TorreDetail: colheita por furo/perfil/andar todo
- [ ] TorreDetail: alerta lavagem pós-colheita
- [ ] Nova página/seção: Germinação (pré-mudas)
- [ ] Nova página/seção: Manutenção por torre/andar
- [ ] Dashboard: KPIs de fazenda vertical
- [ ] Dashboard: usar fasesConfig do estado (não constante) para referências
