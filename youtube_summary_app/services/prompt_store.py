import json

from youtube_summary_app.config import DEFAULT_PROMPT, PROMPT_PRESET_FILE


class PromptStore:
    def load(self) -> tuple[str, bool]:
        try:
            with PROMPT_PRESET_FILE.open("r", encoding="utf-8") as preset_file:
                payload = json.load(preset_file)
            prompt = payload.get("prompt", "") if isinstance(payload, dict) else ""
            if isinstance(prompt, str) and prompt.strip():
                return prompt.strip(), False
        except FileNotFoundError:
            pass
        except Exception:
            pass
        return DEFAULT_PROMPT, True

    def save(self, prompt: str) -> str:
        cleaned = (prompt or "").strip()
        if not cleaned:
            raise ValueError("Prompt cannot be empty.")
        PROMPT_PRESET_FILE.parent.mkdir(parents=True, exist_ok=True)
        with PROMPT_PRESET_FILE.open("w", encoding="utf-8") as preset_file:
            json.dump({"prompt": cleaned}, preset_file, ensure_ascii=False, indent=2)
        return cleaned

    def reset(self) -> str:
        try:
            PROMPT_PRESET_FILE.unlink()
        except FileNotFoundError:
            pass
        return DEFAULT_PROMPT

