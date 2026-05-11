# Fazendas Up — Sistema Supervisório para Fazenda Vertical

Sistema web de monitoramento e gestão operacional para fazendas verticais hidropônicas. Gerencia torres de cultivo, ciclos de produção, tarefas operacionais, manutenções, medições de EC/pH, germinação, planejamento, capacidade, analytics e inteligência acionável.

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** 18+ e [pnpm](https://pnpm.io/installation)
- **Docker Desktop** (só para subir o MySQL local com um comando)
- **Git** (para clonar o repositório)

### Primeira vez — copie e cole no terminal (na pasta do projeto)

Instale **Node (LTS)** e **Docker Desktop** com os instaladores oficiais (links nos nomes acima). Depois:

```bash
docker compose up -d
pnpm install
pnpm run setup:env
pnpm db:migrate
pnpm dev
```

Isso cria o `.env`, aplica as migrações SQL em `drizzle/`, sobe o MySQL em background e abre o site em [http://localhost:3456](http://localhost:3456) (porta padrão deste repo; ajuste `PORT` no `.env` se precisar).

**Servidor — entrada canônica:** o app (Express + tRPC + Vite em dev) sobe a partir de `server/_core/index.ts`, invocado por `pnpm dev` e pelo bundle de produção (`pnpm build` → `dist/index.js`). O arquivo `server/index.ts` só reexporta esse fluxo para quem rodar `tsx server/index.ts`. Não use o servidor estático antigo isolado; o README e os scripts sempre apontam para `_core`.

**Banco de dados — comandos:**

- `pnpm db:migrate` — aplica migrações versionadas (`drizzle-kit migrate`). Use após clone ou quando houver arquivos `.sql` novos na pasta `drizzle/`.
- `pnpm db:push` — sincroniza o schema do Drizzle com o banco **sem** gerar arquivo de migração (`drizzle-kit push`). Útil em desenvolvimento rápido; em equipe prefira `db:generate` + `db:migrate`.
- `pnpm db:generate` — gera nova migração a partir de alterações em `drizzle/schema.ts`.
- `pnpm db:studio` — interface visual do banco.

### 1. Clonar e Instalar

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/fazendas-up.git
cd fazendas-up

# Instalar dependências
pnpm install
```

### 2. Configurar Banco de Dados

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais
# DATABASE_URL=mysql://user:password@localhost:3306/fazendas_up
# JWT_SECRET=sua-chave-secreta-aqui
nano .env
```

### 3. Executar Migrações

```bash
# Criar tabelas no banco de dados
pnpm db:push
```

### 4. Iniciar o Servidor

```bash
# Desenvolvimento (com hot reload)
pnpm dev

# Produção
pnpm build
pnpm start
```

O servidor estará disponível em `http://localhost:3456` (ou a porta definida em `PORT` no `.env`).

### Testar de outro lugar (ngrok)

1. Crie conta em [ngrok](https://ngrok.com/), copie o **authtoken** e coloque em `.env` como `NGROK_AUTHTOKEN=...` (não commite o token).
2. Terminal 1: `pnpm dev` — ao subir, o servidor grava a porta efetiva em `.dev-server-port` (gitignored).
3. Terminal 2: `pnpm tunnel` — o script lê essa porta se o arquivo existir, para coincidir com quando o dev usa outra porta (ex.: `3457`). Caso contrário usa `PORT` do `.env` (padrão `3456`).

A URL HTTPS no log muda ao reiniciar o túnel no plano gratuito do ngrok.

### Variáveis opcionais (OAuth e analytics)

O fluxo padrão do projeto é **login por email e senha**. Isto não exige OAuth nem analytics.

- **OAuth (portal Manus / WebDev):** só configure se for usar esse login. Defina no `.env` uma `OAUTH_SERVER_URL` **http ou https válida** (veja comentários em `env.defaults`). Valores “sentinela” como `http://127.0.0.1:9` são tratados como **desligado**, para não gerar chamadas nem ruído no terminal. No cliente, `VITE_OAUTH_PORTAL_URL` e `VITE_APP_ID` precisam estar coerentes para o botão que monta a URL do portal; caso contrário o app manda para `/login`.
- **Analytics (Umami ou compatível):** opcional. Só são usados `VITE_ANALYTICS_ENDPOINT` e `VITE_ANALYTICS_WEBSITE_ID` quando **ambos** estão preenchidos com valores válidos; se faltarem, nenhum script é injetido em `client/src/main.tsx`.

## 📋 Utilizador inicial (bootstrap)

O arranque do servidor (`ensureBootstrapAdmin`) e/ou `pnpm db:seed-admin` podem criar o primeiro utilizador administrativo. **As credenciais concretas estão em `server/seed-admin.mjs` e no teu `.env` — não copie senhas deste README para produção.**

- **Desenvolvimento:** use `env.defaults` / `pnpm run setup:env` e credenciais apenas locais.
- **Produção:** defina `JWT_SECRET` forte (≥32 caracteres aleatórios), **altere** qualquer senha de seed antes do primeiro cliente e **nunca** reutilize segredos entre ambientes.

Quando publicar o repositório ou partilhar o projeto, **não commite** `.env` nem exponha senhas reais em documentação.

## 🏗️ Arquitetura

### Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express + tRPC + Node.js
- **Banco de Dados**: Drizzle ORM (suporta MySQL, PostgreSQL, SQLite, etc.)
- **Autenticação**: Email/Senha com bcrypt
- **Testes**: Vitest (API/backend) + Playwright (E2E)

### Estrutura de Pastas

```
fazendas-up/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilitários
│   └── public/            # Arquivos estáticos
├── server/                # Backend Express + tRPC
│   ├── _core/            # Configuração core (auth, context, etc.)
│   ├── routers/          # Rotas tRPC
│   ├── db.ts             # Query helpers
│   └── *.test.ts         # Testes
├── drizzle/              # Schema e migrações
├── shared/               # Código compartilhado
└── package.json
```

## 📚 Módulos Principais

### Dashboard
Visão geral com KPIs, plantas por fase, alertas rápidos e ciclos pendentes.

### Torres
Gerenciamento de torres, andares, perfis e plantio com suporte a datas individuais por perfil.

### Germinação
Acompanhamento de lotes em germinação com status e histórico.

### Manutenção
Registro e acompanhamento de manutenções com tipos críticos e timeline.

### Tarefas
Checklist diário com geração automática baseada em ciclos e manutenções.

### Receitas
Cadastro de receitas de crescimento com EC/pH por fase.

### Planejamento
Calendário de plantio com sugestão automática de capacidade.

### Capacidade
Gantt de ocupação e projeção de andares disponíveis.

### Analytics
9 abas de análise: EC/pH, produtividade, germinação, manutenções, ocupação, desperdício, yield, planejado vs realizado, relatórios.

### Inteligência Acionável
Motor de 9 regras determinísticas gerando alertas e recomendações operacionais.

### Usuários
Gestão de usuários com roles (admin, operador).

### Organização de módulos administrativos
- **Configurações** (`/config`): parâmetros globais, regras operacionais, preferências, integrações e cadastros-base do domínio (ex.: variedades).
- **Administração** (`/administracao`): governança e estrutura (torres, usuários e permissões).

## 🔧 Desenvolvimento

### Rodar Testes

```bash
# Testes unitários / integração (Vitest — server/**/*.test.ts)
pnpm test

# Cobertura (V8) só em `server/**/*.ts`
pnpm test:coverage

# Modo watch
pnpm test --watch

# E2E (Playwright): sobe `pnpm dev` automaticamente se nada estiver na porta base (3456).
# Requer MySQL (ex.: docker compose) e `.env` com DATABASE_URL.
pnpm exec playwright install chromium   # primeira vez
pnpm test:e2e

# Credenciais do E2E (opcional; padrão = admin do bootstrap)
# E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... pnpm test:e2e

# Servidor já rodando (não iniciar outro)
# PLAYWRIGHT_SKIP_WEBSERVER=1 pnpm test:e2e
```

O fluxo E2E cobre **login**, **Plantio** (`/planejamento`) e, se houver torres no banco, **detalhe de torre**. Sem torres cadastradas, o terceiro cenário é ignorado (`skipped`).

### Verificar TypeScript

```bash
pnpm check
```

### Formatar Código

```bash
pnpm format
```

## 🗄️ Banco de Dados

### Adicionar Nova Tabela

1. Editar `drizzle/schema.ts`
2. Executar `pnpm db:generate` e depois `pnpm db:migrate` (ou `pnpm db:push` só em dev local)
3. Criar query helpers em `server/db.ts`
4. Criar rotas tRPC em `server/routers.ts`

### Exemplo de Nova Rota

```typescript
// server/routers.ts
export const appRouter = router({
  exemplo: router({
    list: publicProcedure.query(async () => {
      return await db.listExemplos();
    }),
    create: protectedProcedure
      .input(z.object({ nome: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return await db.createExemplo(input, ctx.user.id);
      }),
  }),
});
```

## 🚢 Deploy

### Opções de Hosting

- **Vercel**: `pnpm build` → Deploy automático
- **Railway**: Conectar GitHub → Deploy automático → [**primeiro login / senha admin (passo a passo)**](docs/RAILWAY-LOGIN.md) → [**domínio próprio tipo `app.fazendasup.com.br` + link no site institucional**](docs/DOMINIO-APP-FAZENDASUP.md)
- **Render**: Conectar GitHub → Deploy automático
- **Seu Servidor**: `pnpm build && pnpm start`
- **Docker**: Criar Dockerfile com `pnpm build && pnpm start`

### Variáveis de Produção

```env
NODE_ENV=production
DATABASE_URL=seu-banco-producao
JWT_SECRET=chave-super-secreta-aleatorios
PORT=3000
```

## 📝 Licença

MIT

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

---

**Desenvolvido com ❤️ para fazendas verticais hidropônicas**
