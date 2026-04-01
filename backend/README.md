# Backend

The backend is a single Flask service that handles auth, video uploads, processed session storage, and browser webcam snapshot analysis.

## Run it

```bash
pip install -r requirements.txt
python start_backend.py
```

The server listens on `http://localhost:5002`.

## Main responsibilities

- `POST /signup`
- `POST /login`
- `POST /logout`
- `POST /verify-token`
- `POST /api/analyze`
- `GET /api/events/<session_id>`
- `GET /api/video/<session_id>`
- `GET /api/sessions`
- `DELETE /api/sessions/<session_id>`
- `POST /api/webcam/analyze`

## Storage

- Users are stored in `backend/data/users.json`
- Session metadata, event JSON, and processed videos are stored under `backend/data/sessions/`

The service creates those paths automatically on first run.
