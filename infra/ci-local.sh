#!/bin/bash
set -e

echo "=== API: lint ==="
docker compose exec api npm run lint

echo "=== API: typecheck ==="
docker compose exec api npm run typecheck

echo "=== API: test ==="
docker compose exec api npm test

echo "=== Web: lint ==="
docker compose exec web npm run lint

echo "=== Web: typecheck ==="
docker compose exec web npm run typecheck

echo "=== Web: build ==="
docker compose exec web npm run build

echo ""
echo "✅ All CI checks passed!"
