# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY apps/api/package*.json ./
RUN npm ci || npm install

FROM base AS dev
ENV NODE_ENV=development
# entrypoint スクリプトをコピー
COPY infra/docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
