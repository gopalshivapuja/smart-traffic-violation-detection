#!/usr/bin/env bash
# Container entrypoint. Same image runs both API and worker; SERVICE_TYPE switches.
# Railway provides $PORT (API) and a single $DATABASE_URL (sync postgresql://).
# We derive DATABASE_URL_SYNC for alembic + the async DATABASE_URL for FastAPI.
set -euo pipefail

# If DATABASE_URL is the sync form (Railway gives us postgresql://...), translate
# to the asyncpg form for the FastAPI app while keeping the sync form for alembic.
if [ -n "${DATABASE_URL:-}" ] && [[ "$DATABASE_URL" != *"+asyncpg"* ]]; then
  export DATABASE_URL_SYNC="${DATABASE_URL_SYNC:-$DATABASE_URL}"
  export DATABASE_URL="${DATABASE_URL/postgresql:\/\//postgresql+asyncpg:\/\/}"
fi

cd /app

if [ "${SERVICE_TYPE:-api}" = "worker" ]; then
  echo "Starting Celery worker..."
  exec celery -A backend.app.workers.celery_app worker --loglevel=info --concurrency=2
fi

# API path
echo "Running migrations..."
cd /app/backend && alembic upgrade head && cd /app
echo "Starting API on port ${PORT:-8000}..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
