#!/bin/sh
set -e

echo "==> Installing dependencies..."
npm install

echo "==> Cleaning .next cache..."
rm -rf .next

echo "==> Starting dev server..."
exec npm run dev -- -H 0.0.0.0 -p 3000
