# Railway Deployment Guide

This walkthrough takes you from a fresh Railway account to a public demo URL for the Smart Traffic Violation Detection system.

## What gets deployed

Five Railway resources, all in one project:

| Resource | What it is | Image / source |
|---|---|---|
| Postgres | Managed plugin | Railway template |
| Redis | Managed plugin | Railway template |
| `backend` | FastAPI service (port 8000) | `infrastructure/docker/Dockerfile.backend` |
| `worker` | Celery worker (no public port) | Same image as backend, command override |
| `frontend` | React static site behind nginx | `infrastructure/docker/Dockerfile.frontend` |

The backend and worker share a 5 GB volume mounted at `/data` so the worker writes evidence files where the backend can serve them.

## One-time setup

### 1. Push your branch

```bash
git push -u origin feat/capstone-build-out
```

### 2. Create the Railway project

```bash
brew install railway   # or: npm i -g @railway/cli
railway login
railway init           # follow the prompts; create a NEW project
```

### 3. Add Postgres and Redis

In the Railway dashboard for your project:
- Click **+ New** → **Database** → **PostgreSQL**
- Click **+ New** → **Database** → **Redis**

Each one auto-creates connection variables (`DATABASE_URL`, `REDIS_URL`) you can reference from other services.

### 4. Create the `backend` service

- **+ New** → **GitHub Repo** → pick this repo, branch `feat/capstone-build-out`.
- Settings → **Root Directory**: leave blank (Dockerfile uses repo root).
- Settings → **Build** → set **Dockerfile path** to `infrastructure/docker/Dockerfile.backend`.
- Settings → **Volumes** → add a 5 GB volume mounted at `/data`. Name it `media`.
- Settings → **Variables** → add (use Reference variables for the DB/Redis URLs):

```
ENVIRONMENT=production
DATABASE_URL=${{Postgres.DATABASE_URL}}        # Railway will rewrite this to the right format below
DATABASE_URL_SYNC=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
CELERY_BROKER_URL=${{Redis.REDIS_URL}}
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
SECRET_KEY=<paste a 32+ char random string>
STORAGE_MODE=local
MEDIA_ROOT=/data
CORS_ORIGINS=https://<frontend-domain>.up.railway.app
MIN_VIOLATION_FRAMES=5
```

> ⚠️ The Railway-provided `DATABASE_URL` looks like `postgresql://...`. Our async code expects the `postgresql+asyncpg://` driver prefix. Two options:
> 1. Set `DATABASE_URL` to `postgresql+asyncpg://...same creds...` manually.
> 2. Or add a small startup hook in `backend/start.sh` to rewrite the prefix. Easier to just paste both URLs once.

- Settings → **Networking** → click **Generate Domain** to get a public URL.

### 5. Create the `worker` service

- **+ New** → **GitHub Repo** → pick the same repo + branch.
- Settings → **Build** → Dockerfile path: `infrastructure/docker/Dockerfile.backend` (same image).
- Settings → **Deploy** → **Custom Start Command**: `/app/worker_start.sh`
- Settings → **Volumes** → attach the SAME `media` volume created in step 4 at `/data`. (Multiple services can share one volume on Railway.)
- Settings → **Variables** → copy ALL the same variables as the backend service.

### 6. Create the `frontend` service

- **+ New** → **GitHub Repo** → same repo + branch.
- Settings → **Build** → Dockerfile path: `infrastructure/docker/Dockerfile.frontend`.
- Settings → **Build Args** (NOT runtime env vars — Vite needs this at build time):
  ```
  VITE_API_BASE_URL=https://<backend-domain>.up.railway.app/api/v1
  ```
- Settings → **Networking** → **Generate Domain**.

### 7. Update CORS

Now that you have the frontend domain, set `CORS_ORIGINS` on the **backend** service to that exact URL and redeploy.

## Smoke test

1. Open `https://<backend-domain>.up.railway.app/health` → should return `{"status":"ok",...}`.
2. Open the frontend domain → dashboard loads.
3. Go to Cameras → add a camera with a public RTSP URL or skip and use upload.
4. Go to Upload → drop a sample MP4 (try `tests/fixtures/` once we add one, or any traffic clip).
5. Watch the worker logs in Railway dashboard — you should see "Processing complete" with a non-zero violation count.
6. Refresh dashboard → recent-violations panel populates.

## Common issues

- **Worker crashes immediately**: usually means it can't connect to Redis. Verify `REDIS_URL` reference is set.
- **Migration fails on first boot**: check that `DATABASE_URL_SYNC` uses the `postgresql://` (no `+asyncpg`) prefix — Alembic uses the sync driver.
- **CORS errors in browser console**: `CORS_ORIGINS` doesn't match the frontend's actual URL exactly. No trailing slash, include the `https://`.
- **Worker can't read evidence files written by backend**: the volume isn't shared. Both services must mount the SAME volume name at the same path.

## Updating the helmet model later

After Phase F (training notebook), the trained `best.pt`:

```bash
# Rename to helmet_detector.pt and copy into the volume
railway run --service backend -- bash -c 'mkdir -p /data/models && cp /tmp/best.pt /data/models/helmet_detector.pt'
```

Or upload via SSH/rsync. Restart the worker service and helmet violations will start firing.
