from pathlib import Path

import youtube_summary_app.services.prompt_store as prompt_store_module
from youtube_summary_app.app import create_app
from youtube_summary_app.services.chat_store import ChatStore
from youtube_summary_app.services.history_store import HistoryStore
from youtube_summary_app.services.prompt_store import PromptStore


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
