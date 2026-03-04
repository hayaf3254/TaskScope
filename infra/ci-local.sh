#!/bin/bash
set -e

COMPOSE="docker compose -f $(dirname "$0")/compose.yml"

echo "=== API: lint ==="
$COMPOSE exec api npm run lint

echo "=== API: typecheck ==="
$COMPOSE exec api npm run typecheck

echo "=== API: test ==="
$COMPOSE exec api npm test

echo "=== Web: lint ==="
$COMPOSE exec web npm run lint

echo "=== Web: typecheck ==="
$COMPOSE exec web npm run typecheck

echo "=== Web: build ==="
$COMPOSE exec -e NODE_ENV=production web npm run build

echo ""
echo "✅ All CI checks passed!"
