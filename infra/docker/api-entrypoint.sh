#!/bin/sh
set -e

echo "==> Installing dependencies..."
npm install

echo "==> Starting dev server (polling mode for Docker hot-reload)..."
exec npx ts-node-dev --respawn --transpile-only --poll src/index.ts
