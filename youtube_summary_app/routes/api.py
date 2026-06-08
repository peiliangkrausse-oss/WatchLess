from flask import Blueprint, current_app, jsonify, request

from youtube_summary_app.errors import AppError
from youtube_summary_app.services.job_queue import serialize_job


api_bp = Blueprint("api", __name__, url_prefix="/api")
legacy_bp = Blueprint("legacy_api", __name__)


def _json_error(exc: Exception, status_code: int = 500):
    if isinstance(exc, AppError):
        return jsonify({"ok": False, "error": exc.message, "error_type": exc.error_type}), exc.status_code
    return jsonify({"ok": False, "error": str(exc), "error_type": "unexpected_error"}), status_code


@api_bp.route("/health")
def health():
    return jsonify({"ok": True})


@api_bp.route("/models")
def models():
    return jsonify(current_app.services["lm_studio"].model_inventory())


@api_bp.route("/models/load", methods=["POST"])
def load_model():
    try:
        payload = request.json or {}
        result = current_app.services["lm_studio"].load_model(payload.get("model", ""))
        return jsonify({"ok": True, "result": result, "models": current_app.services["lm_studio"].model_inventory()})
    except Exception as exc:
        return _json_error(exc)


@api_bp.route("/models/unload", methods=["POST"])
def unload_model():
    try:
        payload = request.json or {}
        result = current_app.services["lm_studio"].unload_model(payload.get("instance_id") or payload.get("model", ""))
        return jsonify({"ok": True, "result": result, "models": current_app.services["lm_studio"].model_inventory()})
    except Exception as exc:
        return _json_error(exc)


@api_bp.route("/prompt")
def get_prompt():
    prompt, is_default = current_app.services["prompt_store"].load()
    return jsonify({"ok": True, "prompt": prompt, "is_default": is_default})


@api_bp.route("/prompt", methods=["POST"])
def set_prompt():
    try:
        prompt = current_app.services["prompt_store"].save((request.json or {}).get("prompt", ""))
        return jsonify({"ok": True, "prompt": prompt, "is_default": False})
    except Exception as exc:
        return _json_error(AppError(f"Could not save prompt preset: {exc}", "prompt_save_error", 400))


@api_bp.route("/prompt/reset", methods=["POST"])
def reset_prompt():
    try:
        prompt = current_app.services["prompt_store"].reset()
        return jsonify({"ok": True, "prompt": prompt, "is_default": True})
    except Exception as exc:
        return _json_error(AppError(f"Could not reset prompt preset: {exc}", "prompt_reset_error", 500))


@api_bp.route("/prompt/presets")
def prompt_presets():
    presets = current_app.services["prompt_store"].list_presets()
    return jsonify({"ok": True, "presets": presets})


@api_bp.route("/prompt/presets", methods=["POST"])
def save_prompt_preset():
    try:
        payload = request.json or {}
        preset = current_app.services["prompt_store"].save_preset(
            payload.get("name", ""),
            payload.get("prompt", ""),
        )
        return jsonify({"ok": True, "preset": preset})
    except Exception as exc:
        return _json_error(AppError(f"Could not save prompt preset: {exc}", "prompt_preset_save_error", 400))


@api_bp.route("/prompt/presets/<preset_id>")
def get_prompt_preset(preset_id):
    try:
        preset = current_app.services["prompt_store"].get_preset(preset_id)
        return jsonify({"ok": True, "preset": preset})
    except FileNotFoundError:
        return jsonify({"ok": False, "error": "Prompt preset not found.", "error_type": "not_found"}), 404
    except Exception as exc:
        return _json_error(exc)


@api_bp.route("/prompt/presets/<preset_id>", methods=["PUT"])
def rename_prompt_preset(preset_id):
    try:
        payload = request.json or {}
        preset = current_app.services["prompt_store"].rename_preset(preset_id, payload.get("name", ""))
        return jsonify({"ok": True, "preset": preset})
    except FileNotFoundError:
        return jsonify({"ok": False, "error": "Prompt preset not found.", "error_type": "not_found"}), 404
    except Exception as exc:
        return _json_error(AppError(f"Could not rename prompt preset: {exc}", "prompt_preset_rename_error", 400))


@api_bp.route("/prompt/presets/<preset_id>", methods=["DELETE"])
def delete_prompt_preset(preset_id):
    try:
        current_app.services["prompt_store"].delete_preset(preset_id)
        return jsonify({"ok": True})
    except FileNotFoundError:
        return jsonify({"ok": False, "error": "Prompt preset not found.", "error_type": "not_found"}), 404
    except Exception as exc:
        return _json_error(AppError(f"Could not delete prompt preset: {exc}", "prompt_preset_delete_error", 400))


@api_bp.route("/videos/metadata", methods=["POST"])
def video_metadata():
    payload = request.json or {}
    raw_urls = payload.get("urls", [])
    if isinstance(raw_urls, str):
        raw_urls = [raw_urls]
    urls = [url.strip() for url in raw_urls if isinstance(url, str) and url.strip()]
    items = []
    for url in urls:
        try:
            items.append(current_app.services["transcript_service"].fetch_metadata(url))
        except Exception:
            items.append({"url": url, "title": "New Summary"})
    return jsonify({"ok": True, "items": items})


@api_bp.route("/jobs", methods=["POST"])
def create_jobs():
    payload = request.json or {}
    raw_urls = payload.get("urls")
    if raw_urls is None:
        raw_urls = [payload.get("url", "")]
    if isinstance(raw_urls, str):
        raw_urls = [raw_urls]

    urls = [url.strip() for url in raw_urls if isinstance(url, str) and url.strip()]
    model = payload.get("model", "")
    title_map = payload.get("titles", {}) if isinstance(payload.get("titles", {}), dict) else {}
    if not urls:
        return _json_error(AppError("Paste at least one YouTube URL first.", "missing_url", 400))
    try:
        jobs = [current_app.services["job_queue"].submit(url, model, title_map.get(url, "")) for url in urls]
        return jsonify({"ok": True, "jobs": [serialize_job(job) for job in jobs]})
    except Exception as exc:
        return _json_error(exc)


@api_bp.route("/jobs")
def list_jobs():
    jobs = current_app.services["job_queue"].list()
    return jsonify({"ok": True, "jobs": [serialize_job(job) for job in jobs]})


@api_bp.route("/jobs/<job_id>")
def get_job(job_id):
    job = current_app.services["job_queue"].get(job_id)
    if not job:
        return jsonify({"ok": False, "error": "Job not found.", "error_type": "not_found"}), 404
    return jsonify({"ok": True, "job": serialize_job(job)})


@api_bp.route("/history")
def history():
    items = current_app.services["history_store"].list()
    return jsonify({"ok": True, "items": items})


@api_bp.route("/history/<history_id>")
def history_item(history_id):
    try:
        item = current_app.services["history_store"].get(history_id)
        return jsonify({"ok": True, "item": item})
    except FileNotFoundError:
        return jsonify({"ok": False, "error": "History item not found.", "error_type": "not_found"}), 404
    except Exception as exc:
        return _json_error(exc)


# Backward-compatible aliases for the previous single-file UI.
@legacy_bp.route("/models")
def legacy_models():
    return models()


@legacy_bp.route("/prompt")
def legacy_get_prompt():
    return get_prompt()


@legacy_bp.route("/prompt", methods=["POST"])
def legacy_set_prompt():
    return set_prompt()


@legacy_bp.route("/prompt/reset", methods=["POST"])
def legacy_reset_prompt():
    return reset_prompt()
