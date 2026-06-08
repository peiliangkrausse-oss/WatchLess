from flask import Flask
from flask_cors import CORS

from youtube_summary_app.routes.api import api_bp, legacy_bp
from youtube_summary_app.routes.pages import pages_bp
from youtube_summary_app.services.chat_store import ChatStore
from youtube_summary_app.services.history_store import HistoryStore
from youtube_summary_app.services.job_queue import SummaryJobQueue
from youtube_summary_app.services.lm_studio_client import LMStudioClient
from youtube_summary_app.services.prompt_store import PromptStore
from youtube_summary_app.services.summarizer import Summarizer
from youtube_summary_app.services.transcript_service import TranscriptService


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")
    CORS(app)

    prompt_store = PromptStore()
    history_store = HistoryStore()
    chat_store = ChatStore()
    lm_studio = LMStudioClient()
    transcript_service = TranscriptService()
    summarizer = Summarizer(transcript_service, lm_studio, prompt_store, history_store)

    app.services = {
        "prompt_store": prompt_store,
        "history_store": history_store,
        "chat_store": chat_store,
        "lm_studio": lm_studio,
        "transcript_service": transcript_service,
        "summarizer": summarizer,
        "job_queue": SummaryJobQueue(summarizer),
    }

    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(legacy_bp)
    return app
