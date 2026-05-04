"""
Traffic light detection + state classification.

Uses the same YOLOv8 COCO model as VehicleDetector (class 9 = traffic light) to
locate lights, then classifies their state by HSV color analysis on the crop.
This avoids needing a separately trained light-state classifier.

The state we care about for the rule engine:
  - "red"    -> red lamp clearly lit
  - "yellow" -> yellow lamp clearly lit
  - "green"  -> green lamp clearly lit
  - "off"    -> couldn't determine
"""

from __future__ import annotations

import logging
from typing import Literal

import cv2
import numpy as np

logger = logging.getLogger(__name__)

COCO_TRAFFIC_LIGHT_CLASS = 9

LightState = Literal["red", "yellow", "green", "off"]


# HSV ranges. OpenCV hue is 0–180.
_RED_RANGES = [((0, 80, 80), (10, 255, 255)), ((170, 80, 80), (180, 255, 255))]
_YELLOW_RANGE = ((15, 80, 80), (35, 255, 255))
_GREEN_RANGE = ((40, 60, 60), (90, 255, 255))


def classify_light_state(crop: np.ndarray, min_pixels: int = 30) -> LightState:
    """Classify a single traffic-light crop by dominant lit color."""
    if crop.size == 0:
        return "off"

    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)

    red_mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
    for lo, hi in _RED_RANGES:
        red_mask |= cv2.inRange(hsv, np.array(lo), np.array(hi))
    yellow_mask = cv2.inRange(hsv, np.array(_YELLOW_RANGE[0]), np.array(_YELLOW_RANGE[1]))
    green_mask = cv2.inRange(hsv, np.array(_GREEN_RANGE[0]), np.array(_GREEN_RANGE[1]))

    counts = {
        "red": int(red_mask.sum() // 255),
        "yellow": int(yellow_mask.sum() // 255),
        "green": int(green_mask.sum() // 255),
    }

    state, count = max(counts.items(), key=lambda kv: kv[1])
    if count < min_pixels:
        return "off"
    return state  # type: ignore[return-value]


def detect_dominant_light_state(
    frame: np.ndarray, all_detections: list[dict]
) -> LightState:
    """
    Given the full frame and the YOLO detections list, find traffic-light boxes
    and return the dominant state across them. If multiple lights are visible,
    we pick the most-restrictive observed state (red > yellow > green) so a
    single misread green can't override a real red.
    """
    light_boxes = [d for d in all_detections if d.get("class_id") == COCO_TRAFFIC_LIGHT_CLASS]
    if not light_boxes:
        return "off"

    states: list[LightState] = []
    h, w = frame.shape[:2]
    for det in light_boxes:
        x1, y1, x2, y2 = (int(c) for c in det["bbox"])
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            continue
        crop = frame[y1:y2, x1:x2]
        states.append(classify_light_state(crop))

    if "red" in states:
        return "red"
    if "yellow" in states:
        return "yellow"
    if "green" in states:
        return "green"
    return "off"


def bbox_crossed_line(
    prev_bbox: list[float],
    curr_bbox: list[float],
    line: list[list[float]],
) -> bool:
    """
    Has the bottom-center of the bbox crossed `line` between prev and curr frames?

    Uses the sign of the cross product of (line_dir) x (point - line_start).
    A sign change between prev and curr indicates the point traversed the line.
    """
    if not line or len(line) < 2:
        return False

    (x1, y1), (x2, y2) = line[0], line[1]

    def bottom_center(b: list[float]) -> tuple[float, float]:
        return ((b[0] + b[2]) / 2.0, b[3])

    px, py = bottom_center(prev_bbox)
    cx, cy = bottom_center(curr_bbox)

    def side(x: float, y: float) -> float:
        return (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)

    return side(px, py) * side(cx, cy) < 0
