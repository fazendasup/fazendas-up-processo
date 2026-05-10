# Build e imagem de execução — mesmo artefacto em local/staging/cloud (ver docs/RUNBOOK-OPERACOES.md).
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
EXPOSE 3456
# Migrações na subida (BD vazia na Railway até aqui); depois idempotente.
# Healthcheck: configure no orchestrator (Fly/Railway/K8s) com GET /healthz.
CMD ["sh", "-c", "pnpm exec drizzle-kit migrate && exec node dist/index.js"]
