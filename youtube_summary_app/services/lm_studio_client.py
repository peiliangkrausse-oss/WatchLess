import requests

from youtube_summary_app.config import LM_STUDIO_BASE_URL, LM_STUDIO_NATIVE_BASE_URL
from youtube_summary_app.errors import ModelError


MEMORY_ERROR_TRIGGERS = [
    "out of memory",
    "insufficient memory",
    "not enough memory",
    "vram",
    "ram",
    "failed to load",
    "could not load",
    "model loading",
    "unload",
    "loaded model",
    "no model",
    "model not found",
    "invalid model",
    "currently loaded",
]


def is_memory_or_model_load_error(message: str) -> bool:
    text = (message or "").lower()
    return any(trigger in text for trigger in MEMORY_ERROR_TRIGGERS)


class LMStudioClient:
    def __init__(self, base_url: str = LM_STUDIO_BASE_URL, native_base_url: str = LM_STUDIO_NATIVE_BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.native_base_url = native_base_url.rstrip("/")

    def list_models(self) -> list[str]:
        response = requests.get(f"{self.base_url}/models", timeout=5)
        response.raise_for_status()
        payload = response.json()
        raw_models = payload.get("data", []) if isinstance(payload, dict) else []
        models = []
        for item in raw_models:
            if isinstance(item, dict) and item.get("id"):
                models.append(str(item["id"]))
            elif isinstance(item, str):
                models.append(item)
        return models

    def list_available_models(self) -> list[dict]:
        response = requests.get(f"{self.native_base_url}/models", timeout=5)
        response.raise_for_status()
        payload = response.json()
        raw_models = payload.get("models", []) if isinstance(payload, dict) else []
        models = []
        for item in raw_models:
            if not isinstance(item, dict):
                continue
            loaded_instances = item.get("loaded_instances") or []
            models.append({
                "key": item.get("key") or item.get("id") or "",
                "display_name": item.get("display_name") or item.get("key") or "Local model",
                "type": item.get("type"),
                "publisher": item.get("publisher"),
                "params_string": item.get("params_string"),
                "quantization": item.get("quantization"),
                "size_bytes": item.get("size_bytes"),
                "max_context_length": item.get("max_context_length"),
                "loaded": bool(loaded_instances),
                "loaded_instances": [
                    {
                        "id": instance.get("id"),
                        "config": instance.get("config", {}),
                    }
                    for instance in loaded_instances
                    if isinstance(instance, dict)
                ],
            })
        return [model for model in models if model["key"]]

    def model_inventory(self) -> dict:
        try:
            available_models = self.list_available_models()
            loaded_instances = [
                instance
                for model in available_models
                for instance in model["loaded_instances"]
                if instance.get("id")
            ]
            loaded_ids = [instance["id"] for instance in loaded_instances]
            if len(loaded_ids) == 1:
                return {
                    "ok": True,
                    "status": "ready",
                    "models": available_models,
                    "loaded_models": loaded_ids,
                    "current_model": loaded_ids[0],
                    "message": f"Connected to LM Studio. Current model: {loaded_ids[0]}",
                    "source": "native_v1",
                }
            if len(loaded_ids) > 1:
                return {
                    "ok": False,
                    "status": "multiple_models",
                    "models": available_models,
                    "loaded_models": loaded_ids,
                    "current_model": None,
                    "message": "LM Studio reports more than one loaded model. Unload extras before summarizing.",
                    "source": "native_v1",
                }
            return {
                "ok": False,
                "status": "no_model",
                "models": available_models,
                "loaded_models": [],
                "current_model": None,
                "message": "LM Studio is connected. Choose one downloaded model and click Load.",
                "source": "native_v1",
            }
        except Exception as native_exc:
            fallback = self.status()
            return {
                **fallback,
                "models": [
                    {
                        "key": model,
                        "display_name": model,
                        "loaded": True,
                        "loaded_instances": [{"id": model, "config": {}}],
                    }
                    for model in fallback.get("models", [])
                ],
                "loaded_models": fallback.get("models", []),
                "source": "openai_v1",
                "details": str(native_exc),
            }

    def status(self) -> dict:
        try:
            models = self.list_models()
        except Exception as exc:
            return {
                "ok": False,
                "status": "disconnected",
                "models": [],
                "current_model": None,
                "message": f"LM Studio is not reachable at {self.base_url}. Start the local server on port 1234.",
                "details": str(exc),
            }

        if not models:
            return {
                "ok": False,
                "status": "no_model",
                "models": [],
                "current_model": None,
                "message": "LM Studio is running, but no loaded model was reported.",
            }

        if len(models) > 1:
            return {
                "ok": False,
                "status": "multiple_models",
                "models": models,
                "current_model": None,
                "message": "LM Studio reports more than one model. Unload extras so the app uses one clear model.",
            }

        return {
            "ok": True,
            "status": "ready",
            "models": models,
            "current_model": models[0],
            "message": f"Connected to LM Studio. Current model: {models[0]}",
        }

    def load_model(self, model_key: str) -> dict:
        selected = (model_key or "").strip()
        if not selected:
            raise ModelError("Choose a model to load first.", "missing_model", 400)
        inventory = self.model_inventory()
        loaded_models = inventory.get("loaded_models", [])
        if loaded_models and selected not in loaded_models:
            raise ModelError(
                "Unload the currently loaded model before loading another one. This prevents RAM overload on smaller laptops.",
                "model_load_blocked",
                409,
            )
        try:
            response = requests.post(
                f"{self.native_base_url}/models/load",
                json={"model": selected, "echo_load_config": True},
                timeout=180,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as exc:
            message = response.text if "response" in locals() else str(exc)
            if is_memory_or_model_load_error(message):
                raise ModelError(
                    "LM Studio could not load that model. Pick a smaller model or close other heavy apps.",
                    "model_memory",
                ) from exc
            raise ModelError(f"Could not load model: {message}", "model_load_error") from exc
        except Exception as exc:
            raise ModelError(f"Could not load model: {exc}", "model_load_error") from exc

    def unload_model(self, instance_id: str) -> dict:
        selected = (instance_id or "").strip()
        if not selected:
            inventory = self.model_inventory()
            loaded = inventory.get("loaded_models", [])
            if len(loaded) == 1:
                selected = loaded[0]
        if not selected:
            raise ModelError("No loaded model was selected to unload.", "missing_model", 400)
        try:
            response = requests.post(
                f"{self.native_base_url}/models/unload",
                json={"instance_id": selected},
                timeout=60,
            )
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            raise ModelError(f"Could not unload model: {exc}", "model_unload_error") from exc

    def resolve_model(self, requested_model: str | None = None) -> str:
        status = self.model_inventory()
        models = status.get("loaded_models", [])
        requested = (requested_model or "").strip()

        if not status["ok"]:
            if requested and requested in models:
                return requested
            raise ModelError(status["message"], status["status"])

        current_model = status["current_model"]
        if requested and requested != current_model:
            raise ModelError(
                f"The app will not request '{requested}' because LM Studio reports '{current_model}' as the only loaded model. Select the loaded model or refresh model status.",
                "model_mismatch",
            )
        return current_model

    def summarize(self, transcript: str, system_prompt: str, model: str) -> str:
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Transcript:\n{transcript}"},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1500,
                },
                timeout=180,
            )
        except requests.exceptions.ConnectionError as exc:
            raise ModelError(
                "Cannot connect to LM Studio. Open LM Studio, start the local server, and confirm it uses port 1234.",
                "model_disconnected",
            ) from exc
        except requests.exceptions.Timeout as exc:
            raise ModelError(
                "LM Studio took too long to answer. Try a smaller model, a shorter video, or close other heavy apps.",
                "model_timeout",
            ) from exc
        except Exception as exc:
            raise ModelError(f"LM Studio error: {exc}") from exc

        if not response.ok:
            try:
                payload = response.json()
                error_message = str(payload.get("error", payload))
            except Exception:
                error_message = response.text
            if is_memory_or_model_load_error(error_message):
                raise ModelError(
                    "LM Studio could not run the selected model. Unload extra models, keep only one model loaded, and use a model that fits your RAM.",
                    "model_memory",
                )
            raise ModelError(f"LM Studio error: {error_message}")

        try:
            payload = response.json()
            return payload["choices"][0]["message"]["content"].strip()
        except Exception as exc:
            raise ModelError("LM Studio returned an unexpected response format.") from exc
