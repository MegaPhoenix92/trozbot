# TROZBOT orchestrator — thin Node image (Wave 5)
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core ./packages/core
COPY apps/orchestrator ./apps/orchestrator
RUN pnpm install --frozen-lockfile --filter @trozbot/orchestrator... \
  && pnpm --filter @trozbot/core build \
  && pnpm --filter @trozbot/orchestrator build \
  && pnpm --filter @trozbot/orchestrator deploy --prod /out

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S trozbot && adduser -S trozbot -G trozbot
COPY --from=build /out ./
USER trozbot
EXPOSE 8787
ENV PORT=8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "dist/index.js"]
