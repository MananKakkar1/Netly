# Netly

Netly is a streamlined basketball review app with a React frontend and a single Flask backend. The current codebase focuses on dependable browser workflows instead of the older desktop-launch and multi-service setup.

## What it does

- Upload a video and generate a processed MP4 review session
- Score each session for visibility, focus, activity, and stability
- Surface timestamped review events like `high_activity`, `stable_window`, `low_visibility`, and `soft_focus`
- Use a browser-native webcam workspace that scores lighting, clarity, contrast, and framing from live snapshots
- Store users and session metadata locally so the app can run without MongoDB

## Structure

- `frontend/`: Vite + React app
- `backend/`: Flask API, lightweight OpenCV analysis, local JSON storage

## Local setup

### Backend

```bash
cd backend
pip install -r requirements.txt
python start_backend.py
```

The backend runs on `http://localhost:5002`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Notes

- User accounts are stored locally in `backend/data/users.json` at runtime.
- Session artifacts are written to `backend/data/sessions/`.
- The webcam flow now stays entirely in the browser; it no longer launches a separate desktop analysis process.
