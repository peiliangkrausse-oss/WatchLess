import json
import re
import subprocess
from urllib.parse import quote_plus

import requests
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

    def fetch_metadata(self, url: str) -> dict:
        video_id = self.extract_video_id(url)
        fallback = {
            "video_id": video_id,
            "url": url.strip(),
            "title": f"YouTube video {video_id}",
        }
        command = [
            "yt-dlp",
            "--skip-download",
            "--dump-single-json",
            "--no-playlist",
            url.strip(),
        ]
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=False,
                timeout=25,
            )
            if result.returncode != 0 or not result.stdout.strip():
                return fallback
            payload = json.loads(result.stdout)
            title = payload.get("title") if isinstance(payload, dict) else ""
            return {
                "video_id": video_id,
                "url": url.strip(),
                "title": title.strip() if isinstance(title, str) and title.strip() else fallback["title"],
                "channel": payload.get("channel") if isinstance(payload, dict) else "",
                "duration": payload.get("duration") if isinstance(payload, dict) else None,
            }
        except Exception:
            pass

        try:
            response = requests.get(
                f"https://www.youtube.com/oembed?url={quote_plus(url.strip())}&format=json",
                timeout=8,
            )
            if response.ok:
                payload = response.json()
                title = payload.get("title", "")
                if isinstance(title, str) and title.strip():
                    return {
                        **fallback,
                        "title": title.strip(),
                        "channel": payload.get("author_name", ""),
                    }
        except Exception:
            pass

        return fallback

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

        metadata = self.fetch_metadata(url)

        return {
            "video_id": video_id,
            "url": url.strip(),
            "title": metadata.get("title") or f"YouTube video {video_id}",
            "text": transcript_text,
            "word_count": len(words),
            "trimmed": trimmed,
            "language": getattr(transcript, "language_code", None),
        }
