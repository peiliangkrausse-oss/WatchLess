import json
import re
from datetime import datetime, timezone
from pathlib import Path

from watchless_app.config import CHAT_DIR


def _safe_id(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z_-]+", "", value or "")[:120]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class ChatStore:
    def __init__(self, chat_dir: Path = CHAT_DIR):
        self.chat_dir = chat_dir

    def load(self, history_id: str) -> list[dict]:
        safe_id = _safe_id(history_id)
        if not safe_id:
            return []
        path = self.chat_dir / f"{safe_id}.json"
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return []
        except Exception:
            return []
        messages = payload.get("messages", []) if isinstance(payload, dict) else []
        return [message for message in messages if self._valid_message(message)]

    def append_pair(self, history_id: str, question: str, answer: str) -> list[dict]:
        safe_id = _safe_id(history_id)
        if not safe_id:
            return []
        self.chat_dir.mkdir(parents=True, exist_ok=True)
        messages = self.load(safe_id)
        messages.extend([
            {"role": "user", "content": (question or "").strip(), "created_at": _now()},
            {"role": "assistant", "content": (answer or "").strip(), "created_at": _now()},
        ])
        path = self.chat_dir / f"{safe_id}.json"
        path.write_text(
            json.dumps({"history_id": safe_id, "messages": messages}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return messages

    def _valid_message(self, message: object) -> bool:
        if not isinstance(message, dict):
            return False
        return message.get("role") in {"user", "assistant"} and isinstance(message.get("content"), str)
