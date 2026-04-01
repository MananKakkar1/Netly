from __future__ import annotations

import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cv2
import numpy as np

ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "mkv"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def decode_data_url_image(data_url: str) -> np.ndarray:
    if "," in data_url:
        _, encoded = data_url.split(",", 1)
    else:
        encoded = data_url

    image_bytes = base64.b64decode(encoded)
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode image data")
    return frame


def _score(value: float, lower: float, upper: float) -> float:
    if upper <= lower:
        return 0.0
    normalized = (value - lower) / (upper - lower)
    return max(0.0, min(100.0, normalized * 100.0))


def _event(
    event_type: str,
    timestamp: float,
    description: str,
    severity: str,
    frame: int,
) -> dict[str, Any]:
    return {
        "type": event_type,
        "timestamp": round(timestamp, 2),
        "frame": frame,
        "description": description,
        "severity": severity,
    }


def _summarize_events(events: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for event in events:
        event_type = event["type"]
        counts[event_type] = counts.get(event_type, 0) + 1
    return counts


def _frame_metrics(frame: np.ndarray) -> dict[str, float]:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    height, width = gray.shape
    center = gray[height // 4 : (height * 3) // 4, width // 4 : (width * 3) // 4]
    edges = cv2.Canny(gray, 100, 200)
    edge_density = float(np.count_nonzero(edges)) / float(edges.size)
    framing_focus = float(np.std(center)) if center.size else 0.0

    return {
        "brightness": brightness,
        "contrast": contrast,
        "sharpness": sharpness,
        "edge_density": edge_density,
        "framing_focus": framing_focus,
    }


def analyze_webcam_snapshot(frame: np.ndarray) -> dict[str, Any]:
    metrics = _frame_metrics(frame)

    brightness_score = _score(metrics["brightness"], 45, 190)
    clarity_score = _score(metrics["sharpness"], 40, 320)
    contrast_score = _score(metrics["contrast"], 18, 70)
    framing_score = _score(metrics["framing_focus"], 15, 65)
    readiness_score = round(
        (brightness_score * 0.3)
        + (clarity_score * 0.3)
        + (contrast_score * 0.2)
        + (framing_score * 0.2),
        1,
    )

    insights: list[str] = []
    if brightness_score < 45:
        insights.append("Lighting is too low. Face a brighter side of the court or add more light.")
    elif brightness_score > 92:
        insights.append("The frame is a little washed out. Reducing backlight will preserve more detail.")

    if clarity_score < 45:
        insights.append("The image is soft. Hold the device steadier or let the camera refocus.")

    if contrast_score < 45:
        insights.append("Contrast is flat. Try separating yourself from the background for cleaner outlines.")

    if framing_score < 45:
        insights.append("Framing is tight. Step back so your torso and the hoop area can share the frame.")

    if not insights:
        insights.append("Camera conditions look stable enough for a live review pass.")

    status = "ready" if readiness_score >= 65 else "adjust"

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "readiness_score": readiness_score,
        "metrics": {
            "brightness": round(brightness_score, 1),
            "clarity": round(clarity_score, 1),
            "contrast": round(contrast_score, 1),
            "framing": round(framing_score, 1),
        },
        "insights": insights[:3],
    }


def analyze_video_file(
    input_path: Path,
    output_path: Path,
    *,
    max_frames: int | None = None,
) -> dict[str, Any]:
    capture = cv2.VideoCapture(str(input_path))
    if not capture.isOpened():
        raise ValueError("Could not open the uploaded video")

    fps = capture.get(cv2.CAP_PROP_FPS) or 24.0
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    stride = max(1, int(round(fps)))
    frame_index = 0
    analyzed_frames = 0
    previous_gray: np.ndarray | None = None
    events: list[dict[str, Any]] = []
    brightness_values: list[float] = []
    contrast_values: list[float] = []
    sharpness_values: list[float] = []
    motion_values: list[float] = []
    last_event_time: dict[str, float] = {}

    while True:
        ok, frame = capture.read()
        if not ok:
            break
        if max_frames is not None and frame_index >= max_frames:
            break

        timestamp = frame_index / fps if fps else 0.0
        overlay_frame = frame.copy()
        cv2.rectangle(overlay_frame, (16, 16), (260, 68), (17, 24, 39), -1)
        cv2.putText(
            overlay_frame,
            "Netly review",
            (28, 42),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            overlay_frame,
            f"{timestamp:05.1f}s",
            (28, 60),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (251, 191, 36),
            1,
            cv2.LINE_AA,
        )
        writer.write(overlay_frame)

        if frame_index % stride == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            brightness = float(np.mean(gray))
            contrast = float(np.std(gray))
            sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
            motion = (
                float(np.mean(cv2.absdiff(gray, previous_gray)))
                if previous_gray is not None
                else 0.0
            )
            previous_gray = gray

            brightness_values.append(brightness)
            contrast_values.append(contrast)
            sharpness_values.append(sharpness)
            motion_values.append(motion)
            analyzed_frames += 1

            if brightness < 60 and timestamp - last_event_time.get("low_visibility", -999) >= 8:
                events.append(
                    _event(
                        "low_visibility",
                        timestamp,
                        "The frame is under-lit here. Extra court lighting or a brighter angle would help.",
                        "warning",
                        frame_index,
                    )
                )
                last_event_time["low_visibility"] = timestamp

            if sharpness < 80 and timestamp - last_event_time.get("soft_focus", -999) >= 8:
                events.append(
                    _event(
                        "soft_focus",
                        timestamp,
                        "The camera loses detail in this stretch. Stabilizing the device should sharpen the review.",
                        "warning",
                        frame_index,
                    )
                )
                last_event_time["soft_focus"] = timestamp

            if motion > 18 and timestamp - last_event_time.get("high_activity", -999) >= 5:
                events.append(
                    _event(
                        "high_activity",
                        timestamp,
                        "Movement spikes during this sequence, making it a good clip to review for pace and spacing.",
                        "info",
                        frame_index,
                    )
                )
                last_event_time["high_activity"] = timestamp

            if (
                motion < 4
                and sharpness > 110
                and timestamp - last_event_time.get("stable_window", -999) >= 10
            ):
                events.append(
                    _event(
                        "stable_window",
                        timestamp,
                        "The camera settles here, which is useful for checking body positioning and floor balance.",
                        "info",
                        frame_index,
                    )
                )
                last_event_time["stable_window"] = timestamp

        frame_index += 1

    capture.release()
    writer.release()

    if frame_index == 0:
        raise ValueError("The uploaded video did not contain any readable frames")

    video_duration = round(frame_index / fps, 2) if fps else 0.0
    average_brightness = float(np.mean(brightness_values)) if brightness_values else 0.0
    average_contrast = float(np.mean(contrast_values)) if contrast_values else 0.0
    average_sharpness = float(np.mean(sharpness_values)) if sharpness_values else 0.0
    average_motion = float(np.mean(motion_values)) if motion_values else 0.0

    visibility_score = round((_score(average_brightness, 45, 185) * 0.6) + (_score(average_contrast, 18, 70) * 0.4), 1)
    focus_score = round(_score(average_sharpness, 40, 320), 1)
    activity_score = round(_score(average_motion, 2, 22), 1)
    stability_score = round(100.0 - _score(average_motion, 6, 24), 1)

    summary = {
        "total_events": len(events),
        "event_counts": _summarize_events(events),
        "scores": {
            "visibility": visibility_score,
            "focus": focus_score,
            "activity": activity_score,
            "stability": stability_score,
        },
    }

    metadata = {
        "fps": round(fps, 2),
        "total_frames": frame_index,
        "analyzed_frames": analyzed_frames,
        "video_duration": video_duration,
        "resolution": {"width": width, "height": height},
    }

    metrics = {
        "average_brightness": round(average_brightness, 2),
        "average_contrast": round(average_contrast, 2),
        "average_sharpness": round(average_sharpness, 2),
        "average_motion": round(average_motion, 2),
    }

    return {
        "events": events,
        "summary": summary,
        "metadata": metadata,
        "metrics": metrics,
    }
