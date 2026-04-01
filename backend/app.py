from __future__ import annotations

import json
import os
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from typing import Any, Callable, TypeVar

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

import jwt

from analysis_service import analyze_video_file, analyze_webcam_snapshot, allowed_file, decode_data_url_image
from auth_store import UserStore

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SESSIONS_DIR = DATA_DIR / "sessions"
USERS_FILE = DATA_DIR / "users.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

JWT_EXPIRATION_HOURS = 24
FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

user_store = UserStore(USERS_FILE)
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "netly-dev-secret")
CORS(app, origins=FRONTEND_ORIGINS, supports_credentials=True)

RouteHandler = TypeVar("RouteHandler", bound=Callable[..., Any])


def serialize_user(user: dict[str, Any]) -> dict[str, str]:
    return {
        "id": user["id"],
        "email": user["email"],
        "firstName": user["first_name"],
        "lastName": user["last_name"],
    }


def generate_token(user: dict[str, Any]) -> str:
    payload = {
        "user_id": user["id"],
        "email": user["email"],
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")


def resolve_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1]
    return request.args.get("token")


def token_required(handler: RouteHandler) -> RouteHandler:
    @wraps(handler)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        token = resolve_token()
        if not token:
            return jsonify({"error": "Token is missing"}), 401

        try:
            payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        user = user_store.get_by_email(payload.get("email", ""))
        if user is None:
            return jsonify({"error": "User not found"}), 401

        return handler(user, *args, **kwargs)

    return wrapped  # type: ignore[return-value]


def session_dir(session_id: str) -> Path:
    return SESSIONS_DIR / session_id


def session_events_path(session_id: str) -> Path:
    return session_dir(session_id) / "events_data.json"


def session_meta_path(session_id: str) -> Path:
    return session_dir(session_id) / "session.json"


def session_video_path(session_id: str) -> Path:
    return session_dir(session_id) / "analyzed_video.mp4"


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2)


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health_check() -> Any:
    return jsonify(
        {
            "status": "healthy",
            "message": "Netly backend is running",
            "storage": str(DATA_DIR),
        }
    )


@app.route("/status", methods=["GET"])
def status_check() -> Any:
    session_count = len([entry for entry in SESSIONS_DIR.iterdir() if entry.is_dir()])
    return jsonify(
        {
            "server_status": "ok",
            "storage_ready": DATA_DIR.exists(),
            "sessions": session_count,
        }
    )


@app.route("/signup", methods=["POST"])
def signup() -> Any:
    data = request.get_json(silent=True) or {}
    first_name = str(data.get("firstName", "")).strip()
    last_name = str(data.get("lastName", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not all([first_name, last_name, email, password]):
        return jsonify({"error": "Missing required fields"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400

    try:
        user = user_store.create_user(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 409

    token = generate_token(user)
    return (
        jsonify(
            {
                "message": "User created successfully",
                "token": token,
                "user": serialize_user(user),
            }
        ),
        201,
    )


@app.route("/login", methods=["POST"])
def login() -> Any:
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = user_store.get_by_email(email)
    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_token(user)
    return jsonify(
        {
            "message": f"Welcome back, {user['first_name']}",
            "token": token,
            "user": serialize_user(user),
        }
    )


@app.route("/logout", methods=["POST"])
@token_required
def logout(current_user: dict[str, Any]) -> Any:
    return jsonify({"message": f"Logged out {current_user['email']}"})


@app.route("/profile", methods=["GET"])
@token_required
def profile(current_user: dict[str, Any]) -> Any:
    return jsonify({"user": serialize_user(current_user)})


@app.route("/verify-token", methods=["POST"])
def verify_token() -> Any:
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    if not token:
        return jsonify({"error": "Token is required"}), 400

    try:
        payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return jsonify({"valid": False, "error": "Token has expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"valid": False, "error": "Invalid token"}), 401

    user = user_store.get_by_email(payload.get("email", ""))
    if user is None:
        return jsonify({"valid": False, "error": "User not found"}), 401

    return jsonify({"valid": True, "user": serialize_user(user)})


@app.route("/api/analyze", methods=["POST"])
@token_required
def analyze_video(current_user: dict[str, Any]) -> Any:
    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    video_file = request.files["video"]
    if not video_file.filename:
        return jsonify({"error": "No video file selected"}), 400

    if not allowed_file(video_file.filename):
        return jsonify({"error": "Unsupported file type. Use mp4, mov, avi, or mkv."}), 400

    max_frames_value = request.form.get("max_frames")
    max_frames: int | None = None
    if max_frames_value:
        try:
            max_frames = int(max_frames_value)
        except ValueError:
            return jsonify({"error": "max_frames must be an integer"}), 400

    session_id = str(uuid.uuid4())
    current_session_dir = session_dir(session_id)
    current_session_dir.mkdir(parents=True, exist_ok=True)

    original_name = secure_filename(video_file.filename)
    input_path = current_session_dir / original_name
    output_path = session_video_path(session_id)
    video_file.save(input_path)

    try:
        analysis = analyze_video_file(input_path, output_path, max_frames=max_frames)
    except Exception as error:
        shutil.rmtree(current_session_dir, ignore_errors=True)
        return jsonify({"error": f"Analysis failed: {error}"}), 500

    write_json(session_events_path(session_id), analysis)
    write_json(
        session_meta_path(session_id),
        {
            "session_id": session_id,
            "owner_email": current_user["email"],
            "original_filename": original_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "video_duration": analysis["metadata"]["video_duration"],
            "summary": analysis["summary"],
        },
    )

    return jsonify(
        {
            "success": True,
            "session_id": session_id,
            "events": analysis,
            "output_video_url": f"/api/video/{session_id}",
            "video_duration": analysis["metadata"]["video_duration"],
            "message": "Analysis completed successfully",
        }
    )


@app.route("/api/events/<session_id>", methods=["GET"])
@token_required
def get_events(current_user: dict[str, Any], session_id: str) -> Any:
    meta_path = session_meta_path(session_id)
    events_path = session_events_path(session_id)
    if not meta_path.exists() or not events_path.exists():
        return jsonify({"error": "Session not found"}), 404

    metadata = read_json(meta_path)
    if metadata["owner_email"] != current_user["email"]:
        return jsonify({"error": "Forbidden"}), 403

    return jsonify(read_json(events_path))


@app.route("/api/video/<session_id>", methods=["GET"])
@token_required
def get_video(current_user: dict[str, Any], session_id: str) -> Any:
    meta_path = session_meta_path(session_id)
    video_path = session_video_path(session_id)
    if not meta_path.exists() or not video_path.exists():
        return jsonify({"error": "Video not found"}), 404

    metadata = read_json(meta_path)
    if metadata["owner_email"] != current_user["email"]:
        return jsonify({"error": "Forbidden"}), 403

    return send_file(video_path, mimetype="video/mp4", conditional=True)


@app.route("/api/sessions", methods=["GET"])
@token_required
def list_sessions(current_user: dict[str, Any]) -> Any:
    sessions: list[dict[str, Any]] = []
    for entry in sorted(SESSIONS_DIR.iterdir(), reverse=True):
        if not entry.is_dir():
            continue
        metadata_file = entry / "session.json"
        if not metadata_file.exists():
            continue

        metadata = read_json(metadata_file)
        if metadata["owner_email"] != current_user["email"]:
            continue

        sessions.append(
            {
                "session_id": metadata["session_id"],
                "created_at": metadata["created_at"],
                "original_filename": metadata["original_filename"],
                "video_duration": metadata["video_duration"],
                "summary": metadata["summary"],
            }
        )

    return jsonify({"sessions": sessions})


@app.route("/api/sessions/<session_id>", methods=["DELETE"])
@token_required
def delete_session(current_user: dict[str, Any], session_id: str) -> Any:
    metadata_file = session_meta_path(session_id)
    current_session_dir = session_dir(session_id)
    if not metadata_file.exists() or not current_session_dir.exists():
        return jsonify({"error": "Session not found"}), 404

    metadata = read_json(metadata_file)
    if metadata["owner_email"] != current_user["email"]:
        return jsonify({"error": "Forbidden"}), 403

    shutil.rmtree(current_session_dir, ignore_errors=True)
    return jsonify({"message": "Session deleted successfully"})


@app.route("/api/webcam/analyze", methods=["POST"])
@token_required
def analyze_webcam(current_user: dict[str, Any]) -> Any:
    _ = current_user
    data = request.get_json(silent=True) or {}
    image = data.get("image")
    if not image:
        return jsonify({"error": "Image payload is required"}), 400

    try:
        frame = decode_data_url_image(image)
        snapshot = analyze_webcam_snapshot(frame)
    except Exception as error:
        return jsonify({"error": f"Could not analyze webcam frame: {error}"}), 400

    return jsonify({"success": True, "snapshot": snapshot})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
