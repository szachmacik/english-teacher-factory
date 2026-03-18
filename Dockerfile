FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
ENV NODE_ENV=development
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache wget
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
ENV NODE_ENV=development
RUN pnpm install --no-frozen-lockfile
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/health || exit 1
EXPOSE 3000
LABEL build="1773816993"
CMD ["node", "dist/index.js"]