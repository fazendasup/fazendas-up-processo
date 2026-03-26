# Fazendas Up — Migração Full-Stack

## Migração para Banco de Dados (Backend)
- [x] Resolver conflito de merge Home.tsx (useAuth removido)
- [x] Criar schema completo PostgreSQL (torres, andares, furos, perfis, caixas_dagua, variedades, fases_config, germinacao, transplantios, manutencoes, medicoes_caixa, aplicacoes_caixa, aplicacoes_andar, ciclos)
- [x] Implementar query helpers em server/db.ts
- [x] Implementar rotas tRPC para Torres (CRUD + listagem por fase)
- [x] Implementar rotas tRPC para Andares (CRUD + furos + perfis + plantio/colheita)
- [x] Implementar rotas tRPC para Caixas d'Água (CRUD + medições + aplicações)
- [x] Implementar rotas tRPC para Variedades (CRUD)
- [x] Implementar rotas tRPC para Fases Config (leitura + atualização)
- [x] Implementar rotas tRPC para Germinação (CRUD + status transitions)
- [x] Implementar rotas tRPC para Transplantios (CRUD)
- [x] Implementar rotas tRPC para Manutenções (CRUD + status transitions)
- [x] Implementar rotas tRPC para Ciclos (CRUD + marcar executado)
- [x] Implementar rota de seed/inicialização dos dados padrão
- [x] Implementar rota de export CSV/JSON (via loadAll)
- [x] Push schema para banco de dados (pnpm db:push)

## Migração Frontend
- [x] Migrar FazendaContext para usar tRPC em vez de LocalStorage
- [x] Migrar Home.tsx (Dashboard) para tRPC (leitura via FazendaContext)
- [x] Migrar TorreDetail.tsx para tRPC
- [x] Migrar CiclosPage.tsx para tRPC
- [x] Migrar ConfigPage.tsx para tRPC
- [x] Migrar GerminacaoPage.tsx para tRPC
- [x] Migrar ManutencaoPage.tsx para tRPC
- [x] Migrar Header.tsx (export/backup/reset) para tRPC

## Testes
- [x] Testes Vitest para rotas de Torres (via loadAll)
- [x] Testes Vitest para rotas de Andares (via loadAll)
- [x] Testes Vitest para rotas de Caixas d'Água (via loadAll)
- [x] Testes Vitest para rotas de Germinação (CRUD completo)
- [x] Testes Vitest para rotas de Ciclos (CRUD completo)

## Itens Anteriores (v3 - já implementados)
- [x] Variedade por perfil (não mais por furo individual em mudas)
- [x] Mudas: perfis abertos (sem furos), apenas perfil/andar
- [x] Remover diasCiclo do FaseConfig (ciclo é por variedade)
- [x] Colheita APENAS na fase maturação
- [x] Grid de perfis/furos compacto e responsivo
- [x] Banner com foto real das torres
- [x] KPIs no dashboard
- [x] Sistema de manutenção com alertas
- [x] Sistema de germinação
- [x] Ciclos recorrentes
