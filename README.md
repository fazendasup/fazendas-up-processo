# Fazendas Up — Sistema Supervisório para Fazenda Vertical

Sistema web de monitoramento e gestão operacional para fazendas verticais hidropônicas. Gerencia torres de cultivo, ciclos de produção, tarefas operacionais, manutenções, medições de EC/pH, germinação, planejamento, capacidade, analytics e inteligência acionável.

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** 18+ com pnpm
- **Banco de Dados**: MySQL, PostgreSQL, SQLite ou qualquer banco suportado pelo Drizzle ORM
- **Git** (para clonar o repositório)

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

O servidor estará disponível em `http://localhost:3000`

## 📋 Credenciais Padrão

Após a primeira execução, um usuário admin é criado automaticamente:

- **Email**: comercial@visioneer.com.br
- **Senha**: Fup@2026

> ⚠️ **Importante**: Altere a senha após o primeiro login em produção!

## 🏗️ Arquitetura

### Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express + tRPC + Node.js
- **Banco de Dados**: Drizzle ORM (suporta MySQL, PostgreSQL, SQLite, etc.)
- **Autenticação**: Email/Senha com bcrypt
- **Testes**: Vitest

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

## 🔧 Desenvolvimento

### Rodar Testes

```bash
# Executar todos os testes
pnpm test

# Modo watch
pnpm test --watch
```

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
2. Executar `pnpm db:push`
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
- **Railway**: Conectar GitHub → Deploy automático
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
