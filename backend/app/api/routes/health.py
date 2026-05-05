"""
Health endpoints — exposes which ML models are present on the live volume so
the dashboard (and ops) can confirm the deploy is fully provisioned.
"""

import os
from pathlib import Path

from fastapi import APIRouter

from backend.app.core.config import PROJECT_ROOT, settings

router = APIRouter(prefix="/health", tags=["health"])


def _file_info(path: str, fallback_globs: list[str] | None = None) -> dict:
    """Probe `path`. If absent, try the fallback glob patterns and report
    whichever one we find. Useful for YOLOv8 which Ultralytics may save to
    a non-configured location."""
    p = Path(path)
    if p.is_file():
        return {
            "present": True,
            "path": str(p),
            "size_mb": round(p.stat().st_size / (1024 * 1024), 2),
            "found_at_configured_path": True,
        }
    for pattern in fallback_globs or []:
        for hit in Path("/").glob(pattern.lstrip("/")):
            if hit.is_file():
                return {
                    "present": True,
                    "path": str(hit),
                    "size_mb": round(hit.stat().st_size / (1024 * 1024), 2),
                    "found_at_configured_path": False,
                    "configured_path": str(p),
                }
    return {
        "present": False,
        "path": str(p),
        "size_mb": 0.0,
        "found_at_configured_path": False,
    }


def _paddleocr_cache_present() -> dict:
    """Best-effort detection of PaddleOCR weights cache."""
    home = Path(os.path.expanduser("~"))
    candidates = [
        home / ".paddleocr",
        home / ".paddlex",
        Path("/root/.paddleocr"),
        Path("/root/.paddlex"),
    ]
    for c in candidates:
        if c.is_dir():
            params = list(c.rglob("*.pdiparams"))
            return {
                "present": bool(params),
                "cache_dir": str(c),
                "weights_count": len(params),
            }
    return {"present": False, "cache_dir": None, "weights_count": 0}


def _samples_summary() -> dict:
    samples_dir = PROJECT_ROOT / "samples"
    manifest = samples_dir / "manifest.json"
    if not manifest.is_file():
        return {"manifest_present": False, "count": 0}
    try:
        import json
        items = json.loads(manifest.read_text())
        present = sum(1 for it in items if (samples_dir / it["filename"]).is_file())
        return {"manifest_present": True, "count": present, "manifest_entries": len(items)}
    except Exception:
        return {"manifest_present": True, "count": 0, "error": "manifest unparseable"}


@router.get("/models")
async def models_status():
    """
    Return a snapshot of every model the pipeline depends on, plus sample
    bundle status. Useful as a one-shot diagnostic for the deployed container.
    """
    return {
        "yolo_v8n": _file_info(
            settings.DETECTION_MODEL_PATH,
            fallback_globs=[
                "/app/yolov8n.pt",
                "/root/.config/Ultralytics/yolov8n.pt",
                "/home/*/yolov8n.pt",
            ],
        ),
        "helmet": _file_info(settings.HELMET_MODEL_PATH),
        "paddleocr": _paddleocr_cache_present(),
        "media_root": settings.MEDIA_ROOT or "(unset)",
        "samples": _samples_summary(),
    }
