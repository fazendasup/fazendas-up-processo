# Central Comercial (migrada no supervisório)

O módulo **Central Comercial** (Comercia) foi **incorporado** ao repositório do Sistema Supervisório — não é mais um app separado em iframe.

## Rotas (admin do ERP)

| Rota | Tela |
|------|------|
| `/comercial/dashboard` | Painel |
| `/comercial/clientes` | Carteira |
| `/comercial/clientes/:id` | Cliente 360° |
| `/comercial/oportunidades` | Oportunidades |
| `/comercial/mensagens` | Mensagens |
| `/comercial/kpis` | KPIs |
| `/comercial/configuracoes` | Configurações + Conta Azul |
| `/comercial/execucoes` | Execuções de integração |

Menu: **Análise → Comercial** (mesmo login do supervisório; perfil **admin**).

## Banco de dados

Schema Prisma em `prisma-comercial/`. Use um MySQL dedicado ou o mesmo servidor com database separado:

```env
COMERCIAL_DATABASE_URL=mysql://user:pass@127.0.0.1:3307/fazendas_comercial
```

Opcional (OAuth Conta Azul — redirect de volta ao supervisório):

```env
COMERCIAL_WEB_URL=http://localhost:3456
COMERCIAL_API_URL=http://localhost:3456
CONTA_AZUL_CLIENT_ID=...
CONTA_AZUL_CLIENT_SECRET=...
CONTA_AZUL_REDIRECT_URI=http://localhost:3456/integrations/conta-azul/callback
ENABLE_COMERCIAL_INTEGRATION_CRON=true   # opcional; padrão = ligado se COMERCIAL_DATABASE_URL existir
COMERCIAL_CONTA_AZUL_CRON=*/10 * * * *   # opcional; padrão a cada 10 minutos
```

## Setup

```bash
# Gerar client Prisma (a partir do Comercia, se prisma local falhar):
cd ../Comercia && npx prisma generate --schema=../fazendas-up-processo/prisma-comercial/schema.prisma

# Migrar + seed usuários comerciais (admin@fazendasup.local / Admin123456!)
npm run comercial:migrate
npm run comercial:seed
```

Vincule o e-mail do admin do ERP a um usuário em `usuarios` do banco comercial, ou use o seed `admin@fazendasup.local`.

## API

- tRPC: `trpc.comercial.*` (mesmo endpoint `/api/trpc`)
- OAuth Conta Azul: `GET /integrations/conta-azul/auth` e `/callback`

## Código

| Área | Pasta |
|------|--------|
| Backend | `server/comercial/` |
| Rotas tRPC | `server/routers/comercial.ts` |
| UI | `client/src/pages/comercial/` |
| Layout | `client/src/components/comercial/ComercialLayout.tsx` |
