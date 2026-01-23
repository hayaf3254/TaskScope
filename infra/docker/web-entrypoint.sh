#!/bin/sh
set -e

echo "==> Installing dependencies..."
npm install

echo "==> Cleaning .next cache..."
rm -rf .next

echo "==> Starting dev server (Webpack mode for Docker hot-reload)..."
exec npm run dev -- --webpack -H 0.0.0.0 -p 3000
