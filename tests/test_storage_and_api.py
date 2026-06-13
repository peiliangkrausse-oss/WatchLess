from pathlib import Path

import watchless_app.services.prompt_store as prompt_store_module
from watchless_app.app import create_app
from watchless_app.services.chat_store import ChatStore
from watchless_app.services.file_ingestion import FileIngestionService
from watchless_app.services.history_store import HistoryStore
from watchless_app.services.prompt_store import PromptStore
from watchless_app.services.settings_store import SettingsStore


def test_chat_store_persists_messages(tmp_path: Path):
    store = ChatStore(tmp_path)

    messages = store.append_pair("history-1", "What matters?", "The useful takeaway.")

    assert len(messages) == 2
    assert store.load("history-1")[-1]["content"] == "The useful takeaway."


def test_history_store_hides_source_and_model_from_summary(tmp_path: Path):
    store = HistoryStore(tmp_path)

    saved = store.save(
        title="A Video",
        url="https://youtu.be/example12345",
        model="local-model",
        summary="Essence:\nThis is useful.",
        video_id="example12345",
    )
    item = store.get(saved["id"])

    assert "Source:" not in item["summary"]
    assert "Model:" not in item["summary"]
    assert "Essence:" in item["summary"]


def test_prompt_store_rename_and_delete(tmp_path: Path):
    original_dir = prompt_store_module.PROMPT_PRESETS_DIR
    prompt_store_module.PROMPT_PRESETS_DIR = tmp_path
    try:
        store = PromptStore()
        preset = store.save_preset("Study", "Summarize this for studying.")
        renamed = store.rename_preset(preset["id"], "Research")

        assert renamed["name"] == "Research"
        assert renamed["id"] == "research"

        store.delete_preset(renamed["id"])
        assert [item["id"] for item in store.list_presets()] == ["built-in-default"]
    finally:
        prompt_store_module.PROMPT_PRESETS_DIR = original_dir


def test_app_health_and_empty_chat_question():
    app = create_app()
    client = app.test_client()

    assert client.get("/api/health").status_code == 200
    response = client.post("/api/chat", json={"summary": "A summary", "question": ""})

    assert response.status_code == 400
    assert response.json["error_type"] == "missing_chat_question"


def test_feedback_email_endpoint_opens_mailto(monkeypatch):
    opened_urls = []

    def fake_open(url):
        opened_urls.append(url)
        return True

    monkeypatch.setattr("watchless_app.routes.api._open_external_url", fake_open)
    app = create_app()
    client = app.test_client()

    response = client.post("/api/feedback/email", json={"body": "Bug report: special chars äöü", "subject": "Feedback"})

    assert response.status_code == 200
    assert response.json["opened"] is True
    assert response.json["email"] == "peiliangkrausse@gmail.com"
    assert opened_urls
    assert opened_urls[0].startswith("mailto:peiliangkrausse@gmail.com")
    assert "Bug%20report" in opened_urls[0]


def test_settings_store_saves_valid_port(tmp_path: Path):
    store = SettingsStore(tmp_path / "settings.json")

    settings = store.save_lm_studio_port("4321")

    assert settings["lm_studio_port"] == 4321
    assert store.lm_studio_base_url() == "http://127.0.0.1:4321/v1"


def test_file_ingestion_reads_text_file():
    class Uploaded:
        filename = "notes.txt"

        def read(self):
            return b"These are useful notes."

    result = FileIngestionService().extract_text(Uploaded())

    assert result["filename"] == "notes.txt"
    assert result["text"] == "These are useful notes."
