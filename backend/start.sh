#!/usr/bin/env bash
# Entry script: run migrations then start the API.
# Railway provides $PORT; default to 8000 for local dev.
set -euo pipefail

cd /app/backend
echo "Running database migrations..."
alembic upgrade head

cd /app
echo "Starting API on port ${PORT:-8000}..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
