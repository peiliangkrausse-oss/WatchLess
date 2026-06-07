import re

from youtube_transcript_api import YouTubeTranscriptApi

from youtube_summary_app.config import MAX_TRANSCRIPT_WORDS, SUPPORTED_TRANSCRIPT_LANGUAGES
from youtube_summary_app.errors import TranscriptError


class TranscriptService:
    def extract_video_id(self, url: str) -> str:
        cleaned = (url or "").strip()
        patterns = [
            r"(?:v=|/)([0-9A-Za-z_-]{11})",
            r"youtu\.be/([0-9A-Za-z_-]{11})",
            r"shorts/([0-9A-Za-z_-]{11})",
            r"embed/([0-9A-Za-z_-]{11})",
        ]
        for pattern in patterns:
            match = re.search(pattern, cleaned)
            if match:
                return match.group(1)
        raise TranscriptError("Paste a valid YouTube URL first.")

    def fetch(self, url: str) -> dict:
        video_id = self.extract_video_id(url)
        try:
            api = YouTubeTranscriptApi()
            transcript_list = api.list(video_id)
            try:
                transcript = transcript_list.find_manually_created_transcript(
                    SUPPORTED_TRANSCRIPT_LANGUAGES
                )
            except Exception:
                transcript = transcript_list.find_generated_transcript(
                    SUPPORTED_TRANSCRIPT_LANGUAGES
                )
            fetched = transcript.fetch()
        except Exception as exc:
            raise TranscriptError(
                "Could not fetch the transcript. Try a video with captions or auto-captions. "
                f"Details: {exc}"
            ) from exc

        lines = []
        for segment in fetched:
            text = getattr(segment, "text", None)
            if text is None and isinstance(segment, dict):
                text = segment.get("text", "")
            cleaned = re.sub(r"\s+", " ", text or "").strip()
            if cleaned:
                lines.append(cleaned)

        transcript_text = " ".join(lines).strip()
        if not transcript_text:
            raise TranscriptError("The transcript was found, but it did not contain readable text.")

        words = transcript_text.split()
        trimmed = False
        if len(words) > MAX_TRANSCRIPT_WORDS:
            transcript_text = " ".join(words[:MAX_TRANSCRIPT_WORDS])
            transcript_text += "\n\n[Transcript trimmed at 12,000 words.]"
            trimmed = True

        return {
            "video_id": video_id,
            "url": url.strip(),
            "text": transcript_text,
            "word_count": len(words),
            "trimmed": trimmed,
            "language": getattr(transcript, "language_code", None),
        }

