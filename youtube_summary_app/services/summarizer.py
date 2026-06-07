from youtube_summary_app.errors import AppError
from youtube_summary_app.services.history_store import HistoryStore
from youtube_summary_app.services.lm_studio_client import LMStudioClient
from youtube_summary_app.services.prompt_store import PromptStore
from youtube_summary_app.services.transcript_service import TranscriptService


class Summarizer:
    def __init__(
        self,
        transcript_service: TranscriptService,
        lm_studio: LMStudioClient,
        prompt_store: PromptStore,
        history_store: HistoryStore,
    ):
        self.transcript_service = transcript_service
        self.lm_studio = lm_studio
        self.prompt_store = prompt_store
        self.history_store = history_store

    def summarize(self, url: str, requested_model: str | None = None, progress=None) -> dict:
        def update(percent: int, message: str) -> None:
            if progress:
                progress(percent, message)

        update(10, "Checking YouTube URL...")
        self.transcript_service.extract_video_id(url)

        update(20, "Checking LM Studio model...")
        model = self.lm_studio.resolve_model(requested_model)

        update(35, "Fetching YouTube transcript...")
        transcript = self.transcript_service.fetch(url)

        update(55, "Sending transcript to LM Studio...")
        system_prompt, _ = self.prompt_store.load()
        summary = self.lm_studio.summarize(transcript["text"], system_prompt, model)

        if not summary:
            raise AppError("LM Studio returned an empty summary.", "empty_summary", 500)

        update(90, "Saving Markdown history...")
        title = f"YouTube video {transcript['video_id']}"
        history = self.history_store.save(
            title=title,
            url=transcript["url"],
            model=model,
            summary=summary,
            video_id=transcript["video_id"],
        )

        update(100, "Summary ready.")
        return {
            "summary": summary,
            "title": title,
            "url": transcript["url"],
            "video_id": transcript["video_id"],
            "model": model,
            "transcript": {
                "word_count": transcript["word_count"],
                "trimmed": transcript["trimmed"],
                "language": transcript["language"],
            },
            "history": history,
        }
