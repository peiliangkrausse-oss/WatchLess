from pathlib import Path

from pypdf import PdfReader

from youtube_summary_app.errors import AppError


MAX_FILE_TEXT_CHARS = 30000


class FileIngestionService:
    def extract_text(self, uploaded_file) -> dict:
        filename = Path(uploaded_file.filename or "attachment").name
        suffix = Path(filename).suffix.lower()
        if suffix == ".pdf":
            text = self._pdf_text(uploaded_file)
        elif suffix in {".txt", ".md", ".csv", ".json"}:
            text = uploaded_file.read().decode("utf-8", errors="replace")
        else:
            raise AppError("This file type is not supported yet. Use PDF, TXT, Markdown, CSV, or JSON.", "unsupported_file", 400)

        cleaned = " ".join(text.split())
        if not cleaned:
            raise AppError("The uploaded file did not contain readable text.", "empty_file_text", 400)
        return {
            "filename": filename,
            "text": cleaned[:MAX_FILE_TEXT_CHARS],
            "truncated": len(cleaned) > MAX_FILE_TEXT_CHARS,
        }

    def _pdf_text(self, uploaded_file) -> str:
        try:
            reader = PdfReader(uploaded_file)
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            raise AppError(f"Could not read that PDF: {exc}", "pdf_read_error", 400) from exc
