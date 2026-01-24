# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# deps: node_modules を作る層
FROM base AS deps
COPY apps/web/package*.json ./
RUN npm ci || npm install

# dev: 開発サーバ用（compose からこの target を使う）
FROM base AS dev
ENV NODE_ENV=development
# entrypoint スクリプトをコピー
COPY infra/docker/web-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]

# build: 本番ビルド用
FROM base AS build
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./
RUN npm run build

# runner: 本番起動用
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm","run","start","--","-H","0.0.0.0","-p","3000"]
