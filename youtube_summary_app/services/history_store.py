import re
from datetime import datetime, timezone
from pathlib import Path

from youtube_summary_app.config import HISTORY_DIR, MAX_HISTORY_ITEMS
from youtube_summary_app.errors import AppError


def _slugify(value: str) -> str:
    slug = re.sub(r"[^0-9A-Za-z_-]+", "-", value or "").strip("-").lower()
    return slug[:70] or "youtube-summary"


def _frontmatter_value(text: str, key: str) -> str:
    match = re.search(rf"^{re.escape(key)}:\s*(.*)$", text, re.MULTILINE)
    return match.group(1).strip().strip('"') if match else ""


class HistoryStore:
    def __init__(self, history_dir: Path = HISTORY_DIR):
        self.history_dir = history_dir

    def save(self, *, title: str, url: str, model: str, summary: str, video_id: str = "") -> dict:
        try:
            self.history_dir.mkdir(parents=True, exist_ok=True)
            created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
            history_id = f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-{_slugify(video_id or title)}"
            filename = f"{history_id}.md"
            path = self.history_dir / filename
            safe_title = (title or "YouTube Summary").replace("\n", " ").strip()
            content = (
                "---\n"
                f'id: "{history_id}"\n'
                f'title: "{safe_title}"\n'
                f'url: "{url}"\n'
                f'model: "{model}"\n'
                f'created_at: "{created_at}"\n'
                "---\n\n"
                f"# {safe_title}\n\n"
                f"Source: {url}\n\n"
                f"Model: {model}\n\n"
                f"{summary.strip()}\n"
            )
            path.write_text(content, encoding="utf-8")
            self._prune()
            return self._item_from_file(path)
        except OSError as exc:
            raise AppError(
                f"Could not save Markdown history at {self.history_dir}. Check folder permissions.",
                "history_storage_error",
                500,
            ) from exc

    def list(self) -> list[dict]:
        try:
            self.history_dir.mkdir(parents=True, exist_ok=True)
        except OSError:
            return []
        items = [self._item_from_file(path) for path in self.history_dir.glob("*.md")]
        items = [item for item in items if item]
        return sorted(items, key=lambda item: item["created_at"], reverse=True)

    def get(self, history_id: str) -> dict:
        safe_id = re.sub(r"[^0-9A-Za-z_-]+", "", history_id or "")
        path = self.history_dir / f"{safe_id}.md"
        if not path.exists():
            raise FileNotFoundError("History item not found.")
        item = self._item_from_file(path)
        item["markdown"] = path.read_text(encoding="utf-8")
        item["summary"] = re.sub(r"^---.*?---\s*", "", item["markdown"], flags=re.DOTALL).strip()
        return item

    def _item_from_file(self, path: Path) -> dict:
        try:
            text = path.read_text(encoding="utf-8")
            return {
                "id": _frontmatter_value(text, "id") or path.stem,
                "title": _frontmatter_value(text, "title") or path.stem,
                "url": _frontmatter_value(text, "url"),
                "model": _frontmatter_value(text, "model"),
                "created_at": _frontmatter_value(text, "created_at") or datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(timespec="seconds"),
                "path": str(path),
            }
        except Exception:
            return {}

    def _prune(self) -> None:
        items = sorted(
            self.history_dir.glob("*.md"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        for stale_path in items[MAX_HISTORY_ITEMS:]:
            try:
                stale_path.unlink()
            except OSError:
                pass
