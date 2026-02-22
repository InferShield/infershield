#!/bin/sh

echo "=================================="
echo "🚀 InferShield Starting (Railway)"
echo "=================================="
echo "Time: $(date)"
echo "Working dir: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""
echo "Environment variables:"
echo "  NODE_ENV: ${NODE_ENV}"
echo "  PORT: ${PORT}"
echo "  DATABASE_URL: ${DATABASE_URL:+SET}"
echo "  JWT_SECRET: ${JWT_SECRET:+SET}"
echo ""

echo "📦 Running migrations..."
npx knex migrate:latest --env production
MIGRATE_EXIT=$?
echo "Migration exit code: $MIGRATE_EXIT"
echo ""

if [ $MIGRATE_EXIT -eq 0 ]; then
  echo "✅ Migrations complete"
  echo ""
  echo "🚀 Starting server..."
  exec node server.js
else
  echo "❌ Migrations failed!"
  exit 1
fi
