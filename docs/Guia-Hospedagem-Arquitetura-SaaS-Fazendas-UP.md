# Guia de Hospedagem e Arquitetura SaaS — Fazendas UP (revisão)

**Base:** guia anterior (Manus AI, abril 2026), expandido e corrigido com base em revisão técnica do stack real do projeto.  
**Objetivo:** Orientar a transformação do sistema em produto SaaS comercializável, com **isolamento forte entre clientes**, **performance sustentável**, **deploy remoto sem perda de dados** e **clareza sobre riscos e trade-offs**.

---

## Como ler este documento

1. **Secção 2** lista explicitamente **o que foi melhorado** face ao guia original e **porquê**.  
2. As secções seguintes incorporam essas melhorias no texto (não é apenas um addendum).  
3. **Custos em R$** são **ordens de grandeza** (câmbio, região e planos mudam); use para planeamento, não para contrato.

---

## 2. Melhorias em relação ao guia anterior (e porquê)

| Melhoria | O que estava incompleto ou arriscado | O que este guia faz |
|----------|--------------------------------------|---------------------|
| **Isolamento além do `WHERE projeto_id`** | Só falar em SELECT/UPDATE/DELETE omite vetores comuns de vazamento. | Inclui **INSERT**, **JOINs**, **exports**, **IDs em URLs**, **jobs em background** e **rotas admin**. |
| **Não assumir que “o middleware já resolve tudo”** | Afirmar que está “implementado” sem auditoria gera falsa segurança. | Trata o middleware como **camada necessária, não suficiente**; exige **checklist e testes de isolamento**. |
| **MySQL e “schema por tenant”** | Dizer que MySQL “não tem schema como Postgres” sugere que não há meio-termo entre coluna e servidor inteiro. | Esclarece **base de dados (`DATABASE`) por tenant** em MySQL como opção intermédia, com custo operacional. |
| **Fornecedores e planos (ex.: PlanetScale)** | Referências a “plano gratuito” e produtos mudam. | Recomenda **validar sempre** site oficial, limites, FKs e modelo de branching **na data do deploy**. |
| **Blue-green “automático”** | PaaS pequeno nem sempre garante zero downtime real. | Fala em **rolling deploy + healthcheck** e **baixo downtime**, sem prometer blue-green completo sem validar o plano. |
| **Números mágicos de clientes (500/200)** | Performance depende de carga, não só de contagem de tenants. | Substitui por **indicadores** (CPU, latência p95, filas, conexões) e **testes de carga**. |
| **Drift de esquema (`ensure*` vs migrações)** | O projeto usa alterações em runtime; isso conflita com “só Drizzle migrate em produção”. | Secção dedicada: **política** entre `ensure*` idempotente vs **só migrações versionadas**. |
| **Staging, LGPD, runbooks** | Pouco ou nada no guia original. | Inclui **mínimo comercial** para produto pago no Brasil. |

---

## 3. Visão geral do cenário

O sistema **Fazendas UP** (evolução típica): **React + Vite** no frontend, **Node.js + Express + tRPC** no backend, **Drizzle ORM** e **MySQL 8.x** em desenvolvimento (frequentemente via Docker).

Objetivos simultâneos do SaaS:

1. **Isolamento:** nenhum cliente acede a dados ou projetos de outro.  
2. **Performance:** degradação controlada com muitos utilizadores e histórico crescente.  
3. **Evolução:** alterar código e esquema **remotamente** sem apagar dados de produção.  
4. **Custo:** infra proporcional ao estágio (MVP vs escala).

---

## 4. Estratégia de isolamento (multi-tenancy)

### 4.1 Modelos (atualizado para MySQL)

| Modelo | Isolamento | Custo / complexidade | Migrações | Notas |
|--------|------------|----------------------|-----------|--------|
| **Tabela(s) partilhadas + `projeto_id`** (tenant na coluna) | Lógico — **depende da aplicação** | Baixo | Uma pipeline por release | Modelo natural se já existe `projeto_id` / `projeto_usuarios`. |
| **Uma `DATABASE` MySQL por tenant** | Forte a nível de conexão e backup | Médio a alto (N bases, N migrações) | N vezes (automatizar) | MySQL não tem “schema” como Postgres, mas **várias databases** no mesmo servidor cumprem papel semelhante ao “schema por tenant” em termos de isolamento. |
| **Instância/cluster por tenant** | Máximo | Alto | N | Para enterprise ou requisitos legais extremos. |

**Recomendação para arranque (alinhada ao código atual):** **banco partilhado com `projeto_id`** em todas as entidades de negócio, com **validação de acesso** (utilizador ↔ projeto) em **cada** entrada tRPC e **testes** que tentem violar o isolamento.

**Porquê não saltar logo para “database por cliente”:** custo operacional e número de migrações/backups crescem rapidamente; para validar produto e primeiros dezenas/centenas de clientes, o partilhado bem feito costuma ser suficiente.

### 4.2 Regra de ouro (completa)

- **Leitura/escrita:** toda query que toque em dados de cliente deve estar **ancorada** ao `projeto_id` (ou equivalente) **provido pelo contexto autenticado**, não copiado cegamente do body da API.  
- **INSERT:** sempre definir `projeto_id` no servidor; nunca confiar só no cliente.  
- **JOIN:** garantir que tabelas ligadas também estão filtradas pelo mesmo tenant (evitar “joins largos” que tragam linhas de outro projeto).  
- **IDs em URLs:** posse de um ID não implica permissão — sempre verificar **membro do projeto**.  
- **Exportações / relatórios / agregações:** mesma regra; são causas frequentes de vazamento.  
- **Jobs agendados, filas, webhooks:** o worker deve receber `projeto_id` explícito ou resolver tenant por tabela de fila; nunca “varrer” a BD sem filtro.  
- **Rotas admin / suporte / debug:** ou não acedem a dados de tenant sem auditoria, ou usam **impersonation** com log e limite de tempo.

### 4.3 Middleware tRPC e “defesa em profundidade”

O middleware que injeta `projeto_id` no contexto é **indispensável**, mas **não substitui**:

- revisão de **todas** as procedures (incluindo as antigas ou geradas);  
- **testes de isolamento** (ex.: dois projetos, dois utilizadores, garantir 403 ou lista vazia ao aceder ao ID do outro);  
- revisão periódica em **alterações de código** (regressões são comuns).

**Evolução recomendada com maturidade:** migrar para **PostgreSQL** e aplicar **Row-Level Security (RLS)** por `projeto_id`. Aí o motor de BD recusa linhas de outro tenant mesmo se uma query esquecer o filtro — **reduz risco catastrófico**, não elimina bugs de lógica de negócio.

**Drizzle:** suporta Postgres; a migração é **trabalho de engenharia** (driver, tipos, SQL dialect, testes), não um “toggle”.

---

## 5. Arquitetura de hospedagem (fases)

Princípio: **começar simples**, medir, só então subir de patamar.

### Fase 1 — Lançamento (primeiros clientes pagantes ou beta fechado)

| Componente | Opções típicas | Notas |
|------------|------------------|--------|
| **App (Node + estáticos)** | Railway, Render, Fly.io, Google Cloud Run | Dockerfile ou build nativo do PaaS; **healthcheck** na rota HTTP. |
| **MySQL** | Instância gerida do PaaS, **RDS**, **Cloud SQL**, ou fornecedor que **confirme** hoje suporte a branching/testes que precisas | **Validar** no site oficial: preço, limites, **FKs**, versão MySQL, IP allowlist. |
| **DNS + TLS** | Cloudflare (ou TLS do PaaS + CNAME) | WAF básico e rate limit por IP ajudam cedo. |
| **Ficheiros** | R2, S3, GCS | Disco do container é **efémero** — não usar para uploads persistentes. |
| **Monitorização** | Sentry (erros) + uptime (Better Stack, UptimeRobot, etc.) | Plano free costuma chegar para o início. |

**Custos indicativos:** frequentemente na ordem de **dezenas a low hundreds de R$/mês** no início, dependendo de tráfego e tamanho da BD.

**Deploy no PaaS:** muitos fazem **novo container → healthcheck → troca de tráfego**. Isso **aproxima-se** de zero-downtime, mas **valida** no teu plano: cold start, timeouts e migrações longas podem causar **picos** de erro se não forem orquestrados.

### Fase 2 — Crescimento (tráfego e equipa a exigir SLOs mais claros)

- **MySQL gerido** com redundância, backups configurados e **métricas** (slow query, conexões).  
- **Redis** (ex.: Upstash): cache de leitura pesada, rate limit, ou filas — **reduz pressão** na BD.  
- **Réplicas de leitura** quando o dashboard e relatórios dominarem SELECTs.  
- **BD apenas em rede privada** (VPC): a app liga-se por rede interna; **não** expor MySQL à internet.

### Fase 3 — Escala e conformidade

- Auto-scaling de **app** (ECS/Fargate, GKE, etc.).  
- **Aurora** / Postgres gerido, mais réplicas e **observabilidade** paga (Datadog, New Relic, Grafana Cloud) se o negócio justificar.  
- **Filas** (SQS, Redis + BullMQ) para trabalho assíncrono pesado.

**Performance:** não uses “número de clientes” como único guia. Monitoriza **p95 de latência**, **CPU da BD**, **filas**, **erros 5xx** e corre **testes de carga** antes de grandes campanhas ou onboarding em massa.

---

## 6. Deploy contínuo sem perda de dados

### 6.1 Pipeline (CI/CD)

Fluxo recomendado (adaptar nomes ao teu Git):

```text
push → testes automatizados → build de imagem ou artefacto →
  → aplicar migrações compatíveis com a versão AINDA em produção →
  → deploy da nova app → healthcheck → (opcional) rollback
```

**Expand-and-contract:** novas colunas/tabelas **antes** do código novo depender delas; código novo **compatível** com esquema antigo durante a janela de deploy; remoções **só** depois de ninguém ler/escrever o campo.

### 6.2 Drizzle e produção

- Preferir **`drizzle-kit generate`** + revisão humana do SQL + **`migrate` em pipeline** (ou ferramenta equivalente auditável).  
- **Evitar `push` direto em produção** sem revisão.  
- **Bloquear** em CI migrações com `DROP TABLE`, `TRUNCATE`, `DROP COLUMN` sem processo — ou exigir aprovação explícita.

### 6.3 Drift: `ensure*` no runtime vs migrações versionadas

Se o servidor aplica `ALTER TABLE` em **arranque** (“ensure column exists”):

- **Vantagem:** ambientes desalinhados recuperam sozinhos.  
- **Risco em produção:** condição de corrida, locks, falhas parciais, **duplicidade** se a migração Drizzle e o `ensure*` não estiverem alinhados — comportamento difícil de auditar.

**Política recomendada para SaaS:**

1. **Curto prazo:** tornar todo `ensure*` **idempotente** e **seguro** (ignorar “já existe”, não falhar o arranque por duplicado), e **registar** em log o que alterou.  
2. **Médio prazo:** **deslocar** alterações de esquema para **migrações Drizzle apenas**, e reduzir `ensure*` a casos excecionais ou a um “bootstrap” único controlado.

Assim o guia de “só migrar em CI” **alinha** com a realidade do repositório.

### 6.4 Staging

- Ambiente **staging** com **mesma versão** de MySQL (ou próximo) e **migrações aplicadas como em produção**.  
- Ideal: **restaurar backup anonimizado** ou subset para testar migrações pesadas **antes** de produção.

---

## 7. Segurança (camadas)

### 7.1 Autenticação e autorização

- **JWT** (ou sessões server-side) com identidade de utilizador; **projeto ativo** derivado de `projeto_usuarios` (ou header explícito **validado**).  
- **Trocar de projeto** na UI deve **refrescar** permissões (novo token ou nova sessão), não apenas mudar estado no browser.  
- **Rate limiting** por IP e, quando possível, **por tenant** (Redis + `express-rate-limit` ou equivalente).

### 7.2 Dados e compliance (Brasil)

- **HTTPS** obrigatório.  
- **LGPD:** bases legais, política de privacidade, **retenção** de dados, capacidade de **exportar/apagar** dados pessoais quando aplicável, minimização em logs.  
- **Backups** automáticos + **teste de restore** periódico (ex.: trimestral).  
- **Criptografia em repouso:** ativar no serviço gerido de BD e em buckets de ficheiros.

### 7.3 Operações

- **Runbook** para: indisponibilidade, restore de backup, rotação de secrets, incidente de vazamento.  
- **Auditoria** em ações sensíveis (admin, impersonation, exportação em massa).

---

## 8. Monitorização e observabilidade

- **Erros:** Sentry (ou similar) com release tracking.  
- **Disponibilidade:** check HTTP externo + alertas.  
- **BD:** slow queries, conexões, espaço em disco — dashboards do fornecedor.  
- **Sintético opcional:** login + uma query crítica em horário comercial.

---

## 9. Modelo de custos por cliente (indicativo)

Custos variáveis **por tenant** dependem de uso (número de torres, medições, histórico). A tabela abaixo é **ilustrativa** para pricing interno:

| Recurso | Ordem de grandeza / cliente |
|---------|----------------------------|
| Compute | Baixo se partilhado; sobe com picos dedicados |
| Armazenamento BD | Cresce com histórico e anexos |
| Tráfego | CDN reduz; API ainda paga egress em alguns clouds |
| Backup | Parte fixa + armazenamento |

**Planos comerciais:** limitar por **nº de projetos**, **torres/bancadas**, **retenção de histórico** e **utilizadores** reduz surpresas de custo e de performance.

---

## 10. Roadmap de implementação (ajustado)

| Etapa | Ação | Notas |
|-------|------|--------|
| 1 | **Auditoria de isolamento** (checklist secção 4.2 + testes automatizados) | Bloqueador para “primeiro cliente pago”. |
| 2 | **Política `ensure*` vs migrações** | Reduz risco em deploy. |
| 3 | **Dockerfile** + compose de **produção** (só app ou app+sidecar conforme PaaS) | Reprodutível fora da tua máquina. |
| 4 | **Conta PaaS + MySQL gerido** + variáveis de ambiente | Validar conectividade e backups. |
| 5 | **Domínio + TLS** (Cloudflare ou PaaS) | |
| 6 | **GitHub Actions** (test, build, migrate, deploy) | Branch `main` protegida. |
| 7 | **Staging** + restore test | |
| 8 | **Onboarding** self-service ou semi-manual | Criar projeto + primeiro admin. |
| 9 | **Pagamentos** (Stripe, Pagar.me, etc.) | |
| 10 | **Monitorização** mínima + runbook | |
| 11 | **Beta** com poucos clientes e revisão de métricas | Antes de marketing amplo. |

---

## 11. Resumo executivo

- **Isolamento:** `projeto_id` no modelo partilhado é **adequado ao início**, com **regras completas** (não só SELECT) e **testes**; middleware é **obrigatório**, não **suficiente**. Evolução forte: **Postgres + RLS**.  
- **Hospedagem:** app containerizada ou nativa em PaaS + **MySQL gerido** + Cloudflare (ou equivalente); **confirmar** fornecedores na data da contratação.  
- **Deploy:** CI/CD, **expand-and-contract**, migrações revistas; **alinhar** `ensure*` com migrações ou eliminar drift.  
- **Segurança:** HTTPS, secrets no provedor, VPC para BD em fase 2+, backups + teste de restore, rate limits, **LGPD** para produto no Brasil.  
- **Performance:** medir p95, BD e filas; testes de carga; não confiar em números mágicos de “N clientes”.

---

## 12. Checklist rápida — “posso faturar?”

- [ ] Cada procedure tRPC valida **membro do projeto** antes de dados mutáveis.  
- [ ] Não existe lista/export/report sem **filtro de tenant**.  
- [ ] Jobs/filas passam **projeto_id** ou equivalente auditável.  
- [ ] Migrações em CI; **`push` não** em produção sem processo.  
- [ ] `ensure*` documentado ou migrado para Drizzle **sem** erro de arranque em BD já migrada.  
- [ ] Backups + **restore testado**.  
- [ ] Staging com migrações iguais à produção.  
- [ ] Política mínima LGPD + contacto DPO/privacidade se aplicável.  
- [ ] Monitorização de erros e uptime ativa.

---

## Referências (leitura geral; validar datas e produtos)

- Multi-tenant: modelos partilhados vs database-per-tenant (vários artigos e discussões em `dev.to`, blogs de arquitetura, documentação de cloud).  
- Zero-downtime migrations: padrões expand-and-contract (PostgreSQL é referência comum, mas o **conceito** aplica-se a MySQL).  
- Documentação oficial dos fornecedores escolhidos (Railway, Render, Fly, AWS, GCP, Cloudflare).

---

## Artefactos no repositório (pós-guia)

- `docs/AUDITORIA-TENANT-ROUTERS.md`, `docs/RUNBOOK-OPERACOES.md`, `docs/STORAGE-OBJECT.md`  
- `server/tenant-isolation.test.ts`, `server/test-projeto-trpc.ts` (helpers + mock de projeto nos testes)  
- `.github/workflows/ci.yml`, `Dockerfile`, `docker-compose.prod.yml`, `.dockerignore`  
- Rate limit em `server/_core/index.ts`; endurecimento `projetos.resyncBootstrap` / `migrateLegacyData*` → `adminProcedure`  
- `server/ensure-multi-projeto-schema.ts`: removido filtro genérico demasiado largo em erros benignos  

---

*Documento vivo: atualize fornecedores, preços e checklist quando o produto e a equipa crescerem.*
