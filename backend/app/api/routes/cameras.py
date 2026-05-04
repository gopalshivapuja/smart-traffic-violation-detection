from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.violation import Camera
from backend.app.schemas.violation import CameraCreate, CameraResponse, CameraUpdate

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.get("/", response_model=list[CameraResponse])
async def list_cameras(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).order_by(Camera.created_at.desc()))
    return result.scalars().all()


@router.get("/health")
async def camera_health(db: AsyncSession = Depends(get_db)):
    """
    Returns one row per camera with the data the dashboard map widget needs.
    A camera is "healthy" if we've seen a frame in the last 60s.
    """
    result = await db.execute(select(Camera))
    cameras = result.scalars().all()
    threshold = datetime.utcnow() - timedelta(seconds=60)
    out = []
    for c in cameras:
        is_healthy = bool(c.last_frame_at and c.last_frame_at >= threshold)
        out.append({
            "id": c.id,
            "name": c.name,
            "lat": c.lat,
            "lng": c.lng,
            "status": "healthy" if is_healthy else c.status,
            "last_frame_at": c.last_frame_at.isoformat() if c.last_frame_at else None,
        })
    return out


@router.post("/", response_model=CameraResponse, status_code=201)
async def create_camera(camera: CameraCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Camera).where(Camera.id == camera.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Camera ID already exists")

    db_camera = Camera(**camera.model_dump())
    db.add(db_camera)
    await db.commit()
    await db.refresh(db_camera)
    return db_camera


@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: str, update: CameraUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    for k, v in update.model_dump(exclude_unset=True).items():
        setattr(camera, k, v)
    await db.commit()
    await db.refresh(camera)
    return camera


@router.delete("/{camera_id}", status_code=204)
async def delete_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    await db.delete(camera)
    await db.commit()
