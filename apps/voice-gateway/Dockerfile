# TROZBOT voice-gateway — production image (no devDependencies)
# hadolint ignore=DL3018
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY apps/voice-gateway/package.json ./apps/voice-gateway/
RUN pnpm install --frozen-lockfile --filter @trozbot/voice-gateway...
COPY packages/core ./packages/core
COPY apps/voice-gateway ./apps/voice-gateway
RUN pnpm --filter @trozbot/core build \
  && pnpm --filter @trozbot/voice-gateway build \
  && pnpm --filter @trozbot/voice-gateway deploy --prod /prod

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S trozbot && adduser -S trozbot -G trozbot
COPY --from=build --chown=trozbot:trozbot /prod ./
USER trozbot
EXPOSE 8790
ENV PORT=8790
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8790/health || exit 1
CMD ["node", "dist/index.js"]
