# Smart Traffic Violation Detection System

> AI Masterclass Cohort 3.0 — Capstone Project
> Authors: Gopal Shivapuja, Adhish Malviya

An AI-powered traffic enforcement platform that ingests camera feeds, detects violations (no helmet, red-light running, wrong-way driving), reads license plates with OCR, and produces signed evidence packages for downstream enforcement.

![status](https://img.shields.io/badge/status-capstone%20demo-blue) ![python](https://img.shields.io/badge/python-3.12-blue) ![react](https://img.shields.io/badge/react-19-61dafb)

---

## Why this exists

Manual traffic enforcement is inefficient, subjective, and doesn't scale. Officers can't be on every corner, and enforcement drops to zero at night when violations spike. This system runs continuously on existing camera infrastructure, detects violations the moment they happen, captures court-grade evidence, and routes it for processing — replacing on-the-spot stops with after-the-fact citations.

Target users: municipal traffic authorities, smart-city planners, highway toll operators.

---

## Architecture

```
RTSP / video upload
        │
        ▼
┌─────────────────────────────┐         ┌──────────────────┐
│ Celery worker               │         │ FastAPI backend  │
│  • YOLOv8n detection (COCO) │  ─────► │  /api/v1/*       │
│  • ByteTrack tracking       │   DB    │  serves React UI │
│  • Helmet detector (custom) │         └──────────────────┘
│  • Traffic-light HSV class. │                  ▲
│  • Stop-line crossing rule  │                  │
│  • PaddleOCR plate reader   │                  │
└─────────────────────────────┘            React 19 + Vite
        │                                  Tailwind dark UI
        ▼
   Postgres + filesystem
   (clips, frames, evidence ZIP)
```

| Layer | Tech |
|---|---|
| Backend API | FastAPI 0.115, SQLAlchemy 2.0 (async), Pydantic 2 |
| Worker | Celery 5.4 + Redis broker |
| Database | PostgreSQL 16 |
| ML detection | YOLOv8n (Ultralytics) on COCO + a fine-tuned helmet head |
| Tracking | ByteTrack (supervision) |
| OCR | PaddleOCR (English) |
| Frontend | React 19, Vite 6, TypeScript, Tailwind, Recharts |
| Deployment | Docker on Railway (Postgres + Redis + backend + worker + frontend) |

---

## Violations supported

| Type | Method | Status |
|---|---|---|
| **No Helmet** | YOLOv8 fine-tuned on Indian helmet datasets, frame-count confirmation (≥5) | Pretrained drop-in works; custom training in `ml/notebooks/train_helmet_detector.ipynb` |
| **Red Light** | Detect traffic lights with COCO weights → HSV state classification → bottom-of-bbox crossing the stored stop-line during red | Works; per-camera stop-line set via PATCH `/api/v1/cameras/{id}` |
| **Wrong Way** | Track centroid trajectory vs. allowed direction registered per camera | Works; needs per-camera rule registration |
| Speeding | Out of scope — needs camera calibration | Not implemented |

---

## Quick start (local dev)

Prereqs: Docker Desktop, Python 3.12, Node 20+.

```bash
# 1. Start dev dependencies
docker compose -f docker-compose.dev.yml up -d
# Postgres on host port 5433, Redis on 6380 (avoids collisions with locally-installed Postgres/Redis).

# 2. Backend deps
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3. Apply migrations
export DATABASE_URL_SYNC="postgresql://postgres:postgres@localhost:5433/traffic_violations"
PYTHONPATH=.. alembic upgrade head

# 4. Run the API
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/traffic_violations"
export REDIS_URL="redis://localhost:6380/0"
export CELERY_BROKER_URL="redis://localhost:6380/1"
export CELERY_RESULT_BACKEND="redis://localhost:6380/2"
uvicorn backend.app.main:app --reload --port 8000

# 5. (Separate terminal) Celery worker
cd backend && source .venv/bin/activate
celery -A backend.app.workers.celery_app worker --loglevel=info

# 6. (Separate terminal) Frontend
cd frontend && npm install && npm run dev
# Open http://localhost:3000
```

### Optional: pretrained helmet weights

Without a helmet model the detector returns `helmet=True` (fail-safe) and no helmet violations fire. To enable real helmet detection:

```bash
# Free Roboflow account: https://app.roboflow.com/settings/api
export ROBOFLOW_API_KEY=your_key
python ml/scripts/download_helmet_model.py
# Saves to ml/models/helmet_detector.pt
```

Or train your own — see [Phase F](#phase-f--training-your-own-helmet-model).

---

## Deployment (Railway)

Full step-by-step in [DEPLOYMENT.md](DEPLOYMENT.md). TL;DR:

```bash
railway login
railway init
# Add Postgres + Redis plugins from the dashboard, then create three services
# (backend, worker, frontend) pointing at this repo with the Dockerfiles in
# infrastructure/docker/. Attach a 5 GB volume to backend + worker at /data.
```

The frontend Dockerfile takes `VITE_API_BASE_URL` as a **build arg** (Vite inlines env at build time). The backend reads `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, and `MEDIA_ROOT` from runtime env vars.

---

## Project layout

```
backend/
  app/
    api/routes/       # FastAPI routers (violations, cameras, processing)
    core/             # config, db, storage abstraction
    models/           # SQLAlchemy ORM
    schemas/          # Pydantic
    services/
      detection/      # YOLO + helmet + traffic-light HSV classifier
      tracking/       # ByteTrack wrapper
      ocr/            # PaddleOCR
      violations/     # rule engine + evidence + PDF
    workers/          # Celery tasks
  alembic/            # migrations
  tests/              # pytest
frontend/
  src/
    components/       # Dashboard / Violations / Cameras / Upload
    services/api.ts   # axios client (env-driven baseURL)
    types/            # shared TS types
infrastructure/docker/
  Dockerfile.backend  # python:3.12-slim + ffmpeg, runs alembic + uvicorn
  Dockerfile.frontend # multi-stage build → nginx
  nginx.conf          # SPA fallback, $PORT for Railway
ml/
  notebooks/          # train_helmet_detector.ipynb
  scripts/            # download_helmet_model.py
DEPLOYMENT.md         # Railway walkthrough
```

---

## API surface

```
GET    /health
GET    /api/v1/violations/                       # filtered list
GET    /api/v1/violations/stats                  # totals by type/status/camera
GET    /api/v1/violations/stats/peak-hours       # 24-row hour-of-day histogram
GET    /api/v1/violations/stats/revenue          # sum of fines (rupees)
GET    /api/v1/violations/{id}
PATCH  /api/v1/violations/{id}                   # confirm/reject + edit plate
GET    /api/v1/violations/{id}/evidence          # ZIP download
GET    /api/v1/cameras/
GET    /api/v1/cameras/health                    # for the dashboard map
POST   /api/v1/cameras/
PATCH  /api/v1/cameras/{id}                      # set lat/lng/stop_line_geom
DELETE /api/v1/cameras/{id}
POST   /api/v1/process/upload
POST   /api/v1/process/stream
GET    /api/v1/process/status/{task_id}
```

---

## Phase F — Training your own helmet model

Open `ml/notebooks/train_helmet_detector.ipynb` in Google Colab (T4 GPU). The notebook:

1. Pulls the [Indian helmet+plate dataset](https://universe.roboflow.com/cdio-zmfmj/helmet-lincense-plate-detection-gevlq) from Roboflow (~2k images).
2. Fine-tunes `yolov8n.pt` for 50 epochs.
3. Reports mAP@0.5 + per-class mAP.
4. Exports `best.pt` — drop into `ml/models/helmet_detector.pt` and redeploy.

Datasets and reference projects considered: see commit history of `ml/notebooks/`.

---

## Tests

```bash
cd backend && pytest
```

Current coverage: 17 tests passing (rule engine, detector helpers). Some pre-existing helmet-violation tests need the rule engine's frame-count counting fixed — tracked but not blocking the demo.

---

## Acknowledgements

- Adhish wired the initial scaffold (FastAPI/Celery plumbing, frontend skeleton, ML pipeline glue).
- Gopal built out detection/rule-engine, frontend rebuild matching the pitch mockups, and Railway deployment.
- Built for AI Masterclass Cohort 3.0.
