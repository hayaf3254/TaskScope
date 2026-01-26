# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# ========================================
# 依存関係インストール
# ========================================
FROM base AS deps
COPY apps/api/package*.json ./
RUN npm ci || npm install

# ========================================
# 開発用
# ========================================
FROM base AS dev
ENV NODE_ENV=development
COPY infra/docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]

# ========================================
# ビルド
# ========================================
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api ./
RUN npm run build

# ========================================
# 本番用
# ========================================
FROM base AS prod
ENV NODE_ENV=production

# 本番用依存のみインストール
COPY apps/api/package*.json ./
RUN npm ci --only=production || npm install --only=production

# ビルド成果物をコピー
COPY --from=build /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/index.js"]
