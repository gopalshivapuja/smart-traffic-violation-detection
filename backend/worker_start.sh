#!/usr/bin/env bash
# Celery worker entry — same image as the API service, different command.
set -euo pipefail
exec celery -A backend.app.workers.celery_app worker --loglevel=info --concurrency=2
