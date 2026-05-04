from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from backend.app.models.violation import ViolationStatus, ViolationType


class ViolationCreate(BaseModel):
    camera_id: str
    violation_type: ViolationType
    license_plate: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    location: str | None = None


class ViolationUpdate(BaseModel):
    status: ViolationStatus | None = None
    license_plate: str | None = None


class ViolationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    camera_id: str
    violation_type: ViolationType
    status: ViolationStatus
    license_plate: str | None
    confidence: float
    fine_amount: float | None = 0.0
    clip_url: str | None
    thumbnail_url: str | None
    evidence_package_url: str | None
    location: str | None
    detected_at: datetime
    created_at: datetime


class ViolationStats(BaseModel):
    total_violations: int
    by_type: dict[str, int]
    by_status: dict[str, int]
    by_camera: dict[str, int]
    today_count: int
    this_week_count: int


class CameraCreate(BaseModel):
    id: str
    name: str
    stream_url: str
    location: str | None = None
    lat: float | None = None
    lng: float | None = None
    stop_line_geom: list[list[float]] | None = None


class CameraUpdate(BaseModel):
    name: str | None = None
    stream_url: str | None = None
    location: str | None = None
    status: str | None = None
    lat: float | None = None
    lng: float | None = None
    stop_line_geom: list[list[float]] | None = None


class CameraResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    stream_url: str
    location: str | None
    status: str
    lat: float | None = None
    lng: float | None = None
    stop_line_geom: list[list[float]] | None = None
    last_frame_at: datetime | None = None
    created_at: datetime
