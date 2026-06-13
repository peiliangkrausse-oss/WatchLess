from flask import Flask
from flask_cors import CORS

from watchless_app.routes.api import api_bp, legacy_bp
from watchless_app.routes.pages import pages_bp
from watchless_app.services.chat_store import ChatStore
from watchless_app.services.history_store import HistoryStore
from watchless_app.services.file_ingestion import FileIngestionService
from watchless_app.services.job_queue import SummaryJobQueue
from watchless_app.services.lm_studio_client import LMStudioClient
from watchless_app.services.prompt_store import PromptStore
from watchless_app.services.settings_store import SettingsStore
from watchless_app.services.summarizer import Summarizer
from watchless_app.services.transcript_service import TranscriptService


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")
    CORS(app)

    prompt_store = PromptStore()
    history_store = HistoryStore()
    chat_store = ChatStore()
    settings_store = SettingsStore()
    lm_studio = LMStudioClient(settings_store=settings_store)
    transcript_service = TranscriptService()
    summarizer = Summarizer(transcript_service, lm_studio, prompt_store, history_store)

    app.services = {
        "prompt_store": prompt_store,
        "history_store": history_store,
        "chat_store": chat_store,
        "settings_store": settings_store,
        "file_ingestion": FileIngestionService(),
        "lm_studio": lm_studio,
        "transcript_service": transcript_service,
        "summarizer": summarizer,
        "job_queue": SummaryJobQueue(summarizer),
    }

    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(legacy_bp)
    return app
