#!/usr/bin/env bash
# Container entrypoint. Runs API + Celery worker in one container so they share
# the Railway-mounted /data volume (Railway volumes can't be attached to multiple
# services). Also handles env-driven URL translation for Railway.
set -euo pipefail

# Translate Railway's sync postgres URL into the asyncpg form for FastAPI,
# while preserving a sync URL for alembic.
if [ -n "${DATABASE_URL:-}" ] && [[ "$DATABASE_URL" != *"+asyncpg"* ]]; then
  export DATABASE_URL_SYNC="${DATABASE_URL_SYNC:-$DATABASE_URL}"
  export DATABASE_URL="${DATABASE_URL/postgresql:\/\//postgresql+asyncpg:\/\/}"
fi

cd /app

# Worker-only mode (kept for the dormant worker service / local dev).
if [ "${SERVICE_TYPE:-}" = "worker" ]; then
  echo "Starting Celery worker only..."
  exec celery -A backend.app.workers.celery_app worker --loglevel=info --concurrency=2
fi

echo "Running migrations..."
( cd /app/backend && alembic upgrade head )

# Start Celery worker in the background, then uvicorn in foreground.
# A small wrapper traps signals so killing the container kills both.
echo "Starting Celery worker (background)..."
celery -A backend.app.workers.celery_app worker --loglevel=info --concurrency=2 &
CELERY_PID=$!

trap 'kill -TERM $CELERY_PID 2>/dev/null; exit 0' SIGTERM SIGINT

echo "Starting API on port ${PORT:-8000}..."
uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8000}" &
UVICORN_PID=$!

# Wait on whichever exits first; if either dies we exit so Railway restarts.
wait -n $CELERY_PID $UVICORN_PID
EXIT_CODE=$?
kill $CELERY_PID $UVICORN_PID 2>/dev/null || true
exit $EXIT_CODE
