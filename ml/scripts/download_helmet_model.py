"""
Download a pretrained helmet detection model into ml/models/helmet_detector.pt.

Two ways to use this:

1) Roboflow Universe (recommended — free, well-trained on Indian context):
   - Create a free Roboflow account: https://app.roboflow.com/
   - Get your API key: https://app.roboflow.com/settings/api
   - export ROBOFLOW_API_KEY=...
   - python ml/scripts/download_helmet_model.py

2) Direct URL (if you've trained your own and uploaded somewhere):
   - export HELMET_MODEL_URL=https://...
   - python ml/scripts/download_helmet_model.py

The trained model goes to: ml/models/helmet_detector.pt
"""

import os
import sys
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
TARGET_PATH = PROJECT_ROOT / "ml" / "models" / "helmet_detector.pt"

# Roboflow Universe project hosting a YOLOv8 helmet+plate model.
# Source: https://universe.roboflow.com/cdio-zmfmj/helmet-lincense-plate-detection-gevlq
ROBOFLOW_WORKSPACE = "cdio-zmfmj"
ROBOFLOW_PROJECT = "helmet-lincense-plate-detection-gevlq"
ROBOFLOW_VERSION = 1


def download_from_url(url: str, target: Path) -> None:
    print(f"Downloading {url} -> {target}")
    target.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, target)
    print(f"Saved {target.stat().st_size / 1e6:.1f} MB to {target}")


def download_from_roboflow(api_key: str, target: Path) -> None:
    try:
        from roboflow import Roboflow
    except ImportError:
        sys.exit(
            "roboflow not installed. Run: pip install roboflow\n"
            "Or set HELMET_MODEL_URL to use a direct download instead."
        )

    print(f"Fetching weights from Roboflow: {ROBOFLOW_WORKSPACE}/{ROBOFLOW_PROJECT} v{ROBOFLOW_VERSION}")
    rf = Roboflow(api_key=api_key)
    project = rf.workspace(ROBOFLOW_WORKSPACE).project(ROBOFLOW_PROJECT)
    version = project.version(ROBOFLOW_VERSION)
    model = version.model
    weights_path = Path(model.weights_path) if hasattr(model, "weights_path") else None

    if weights_path and weights_path.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(weights_path.read_bytes())
        print(f"Saved Roboflow weights to {target}")
    else:
        sys.exit(
            "Roboflow API did not return downloadable weights for this project version.\n"
            "Falling back: download the dataset and train via ml/notebooks/train_helmet_detector.ipynb,\n"
            "or set HELMET_MODEL_URL to a direct .pt download."
        )


def main() -> None:
    if TARGET_PATH.exists():
        print(f"Model already present at {TARGET_PATH}. Delete it to re-download.")
        return

    direct_url = os.environ.get("HELMET_MODEL_URL")
    if direct_url:
        download_from_url(direct_url, TARGET_PATH)
        return

    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if api_key:
        download_from_roboflow(api_key, TARGET_PATH)
        return

    sys.exit(
        "No download source configured.\n"
        "Set ROBOFLOW_API_KEY (recommended) or HELMET_MODEL_URL and re-run."
    )


if __name__ == "__main__":
    main()
