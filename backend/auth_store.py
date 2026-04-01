from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class UserStore:
    def __init__(self, file_path: Path) -> None:
        self.file_path = file_path
        self._lock = threading.Lock()
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists():
            self._write([])

    def _read(self) -> list[dict[str, Any]]:
        with self.file_path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def _write(self, users: list[dict[str, Any]]) -> None:
        with self.file_path.open("w", encoding="utf-8") as file:
            json.dump(users, file, indent=2)

    def get_by_email(self, email: str) -> dict[str, Any] | None:
        normalized_email = email.strip().lower()
        with self._lock:
            for user in self._read():
                if user["email"] == normalized_email:
                    return user
        return None

    def create_user(
        self,
        *,
        first_name: str,
        last_name: str,
        email: str,
        password_hash: str,
    ) -> dict[str, Any]:
        normalized_email = email.strip().lower()
        with self._lock:
            users = self._read()
            for user in users:
                if user["email"] == normalized_email:
                    raise ValueError("User already exists")

            new_user = {
                "id": str(uuid.uuid4()),
                "first_name": first_name.strip(),
                "last_name": last_name.strip(),
                "email": normalized_email,
                "password_hash": password_hash,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            users.append(new_user)
            self._write(users)
            return new_user
