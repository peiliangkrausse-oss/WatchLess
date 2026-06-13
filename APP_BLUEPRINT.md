# WatchLess Blueprint

This is the implementation blueprint for rebuilding the app if the codebase is lost or corrupted. It describes the app's purpose, architecture, data flow, API surface, local storage, and rebuild order.

## Product Summary

WatchLess is a local macOS desktop app for summarizing YouTube videos using LM Studio. The user pastes one or more YouTube URLs, chooses or auto-detects a loaded LM Studio model, and queues summaries. Results are rendered as Markdown, saved locally, and can be discussed with a local chat model.

The app is intentionally local-first:

- LM Studio runs the model locally.
- History is stored on the user's Mac.
- Chat history is stored on the user's Mac.
- Prompt presets and settings are stored on the user's Mac.

## Runtime Stack

- Python Flask app.
- Flask-CORS for local browser/desktop access.
- `requests` for LM Studio HTTP calls.
- `youtube-transcript-api` or equivalent transcript access.
- `pypdf` for PDF text extraction.
- Browser UI using plain HTML, CSS, and JavaScript.
- PyInstaller for macOS `.app` packaging.

## Repository Structure

```text
desktop_app.py
  Desktop entrypoint.

watchless_app/app.py
  Flask app factory. Wires all services and registers blueprints.

watchless_app/config.py
  App constants, local storage paths, LM Studio defaults, and default prompt.

watchless_app/errors.py
  User-facing AppError, TranscriptError, and ModelError types.

watchless_app/routes/pages.py
  Renders the main app page.

watchless_app/routes/api.py
  JSON and streaming API routes.

watchless_app/services/
  Business logic services.

watchless_app/templates/index.html
  Main HTML shell.

watchless_app/static/css/styles.css
  Complete visual system and responsive layout.

watchless_app/static/js/app.js
  Browser workflow orchestration.

watchless_app/static/js/modules/
  Small helpers for files, guide HTML, streaming, and text/Markdown.

tests/test_storage_and_api.py
  Focused regression tests.

publish.sh
  macOS app and DMG build script.
```

## Services

### `SettingsStore`

Purpose:

- Persist LM Studio port.
- Produce OpenAI-compatible and native LM Studio base URLs.

Storage:

```text
~/Library/Application Support/WatchLess/settings.json
```

Important behavior:

- Invalid ports fall back to `1234`.
- Valid port range is `1..65535`.

### `LMStudioClient`

Purpose:

- Talk to LM Studio's OpenAI-compatible API and native API.
- Resolve the active model.
- Load/unload models where supported.
- Summarize transcript text.
- Chat and stream chat completions.

Important endpoints:

- OpenAI-compatible: `http://127.0.0.1:{port}/v1`
- Native API: `http://127.0.0.1:{port}/api/v1`

Important guardrails:

- Prefer exactly one loaded model.
- Reject model mismatch when user selected a model that is not the only loaded model.
- Convert connection, timeout, memory, and model-load failures into `ModelError`.
- Empty chat questions raise `missing_chat_question`.

### `TranscriptService`

Purpose:

- Extract YouTube video IDs.
- Fetch metadata.
- Fetch transcript text.
- Trim transcript to configured max word count.

### `Summarizer`

Purpose:

- Orchestrate one summary:
  - validate URL
  - fetch metadata
  - resolve model
  - fetch transcript
  - load current prompt
  - call LM Studio
  - save Markdown history
  - return summary result

Progress checkpoints:

- 10: checking URL
- 16: reading title
- 20: checking model
- 35: fetching transcript
- 55: sending transcript to LM Studio
- 90: saving history
- 100: ready

### `SummaryJobQueue`

Purpose:

- Submit one job per URL.
- Run jobs on a background worker thread.
- Track status, progress, messages, errors, model metrics, and history ID.

Important states:

- `queued`
- `running`
- `succeeded`
- `failed`

Jobs are in-memory and pruned by `JOB_RETENTION_LIMIT`.

### `HistoryStore`

Purpose:

- Persist Markdown summaries.
- List recent summaries.
- Load a summary by ID.
- Hide machine metadata such as `Source:` and `Model:` from display summary content.

Storage:

```text
~/Library/Application Support/WatchLess/history/
```

### `ChatStore`

Purpose:

- Persist chat messages for a history item.
- Append user/assistant message pairs.

Storage:

```text
~/Library/Application Support/WatchLess/chat/
```

### `PromptStore`

Purpose:

- Load default prompt.
- Save/reset custom default prompt.
- Create, rename, delete, and list prompt presets.

Storage:

```text
~/Library/Application Support/WatchLess/prompt_preset.json
~/Library/Application Support/WatchLess/prompt_presets/
```

### `FileIngestionService`

Purpose:

- Extract bounded text from supported chat attachment files.

Supported:

- `.pdf`
- `.txt`
- `.md`
- `.csv`
- `.json`

Unsupported:

- images
- audio
- video
- arbitrary binary files

## API Surface

### Health

- `GET /api/health`

Returns app health.

### Models And Settings

- `GET /api/models`
- `POST /api/models/load`
- `POST /api/models/unload`
- `GET /api/settings`
- `POST /api/settings/lm-studio-port`
- `POST /api/settings/test-lm-studio`

### Prompt Presets

- `GET /api/prompt`
- `POST /api/prompt`
- `POST /api/prompt/reset`
- `GET /api/prompt/presets`
- `POST /api/prompt/presets`
- `GET /api/prompt/presets/<preset_id>`
- `PUT /api/prompt/presets/<preset_id>`
- `POST /api/prompt/presets/<preset_id>/rename`
- `DELETE /api/prompt/presets/<preset_id>`
- `POST /api/prompt/presets/<preset_id>/delete`

### Video And Jobs

- `POST /api/videos/metadata`
- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/<job_id>`

### History

- `GET /api/history`
- `GET /api/history/<history_id>`

### Chat And Files

- `POST /api/chat`
- `POST /api/chat/stream`
- `GET /api/chat/history/<history_id>`
- `POST /api/files/ingest`

### Support

- `POST /api/feedback/email`
- `POST /api/support/donation`

## Frontend State Model

Main state lives in `watchless_app/static/js/app.js`.

```js
state = {
  tabs: [],
  activeTabId: "",
  jobs: new Map(),
  pollTimer: null,
  progressTimer: null,
  modelInventory: null,
  promptPresets: [],
  chatHistory: new Map()
}
```

Important tab fields:

- `id`
- `title`
- `type`: `draft`, `guide`, `job`, `history`
- `url`
- `markdown`
- `statusText`
- `jobId`
- `historyId`
- `progress`
- `jobStatus`
- `startedAt`
- `tokensPerSecond`
- `completionTokens`
- `elapsedSeconds`
- `error`

## Core User Flows

### Summarize One Or More URLs

1. User pastes URLs into sidebar textarea.
2. Frontend extracts unique `http` or `https` URLs.
3. Frontend fetches titles via `/api/videos/metadata`.
4. Frontend creates or reuses tabs.
5. Frontend calls `POST /api/jobs`.
6. Backend queues one job per URL.
7. Frontend polls `GET /api/jobs/<job_id>`.
8. Summary tab shows loading card and progress.
9. On success, tab becomes history tab with Markdown content.
10. Summary is saved locally.

### Chat With Summary

1. User opens chat panel.
2. Frontend loads chat memory if summary has `historyId`.
3. User asks a question.
4. Frontend calls `/api/chat/stream`.
5. Backend streams LM Studio deltas as SSE.
6. Frontend updates assistant message live.
7. Backend saves user/assistant pair when done.

### Attach File To Chat

1. User clicks file attachment.
2. Frontend posts file to `/api/files/ingest`.
3. Backend extracts text.
4. Frontend stores extracted text in `attachedFiles`.
5. Next chat question appends attached file text to the prompt.

### Prompt Preset Management

1. User opens Prompt Preset section.
2. User edits default prompt.
3. Save writes `/api/prompt`.
4. Presets are managed through `/api/prompt/presets`.

### LM Studio Setup

1. User starts LM Studio server.
2. User confirms or changes port.
3. App tests connection.
4. App displays available models.
5. User loads/unloads one model if native API supports it.
6. Summaries use the resolved loaded model.

## Rebuild Order

1. Build Flask app factory and config.
2. Implement errors.
3. Implement services in this order:
   - settings
   - LM Studio
   - transcript
   - history
   - prompt
   - chat
   - file ingestion
   - summarizer
   - job queue
4. Implement API routes.
5. Implement `index.html`.
6. Implement CSS visual system from `DESIGN.md`.
7. Implement frontend workflows in `app.js`.
8. Add helper modules.
9. Add tests.
10. Add macOS launcher and packaging.

## Validation Commands

```bash
.venv/bin/python -m pytest -q tests/test_storage_and_api.py
```

For manual browser preview:

```bash
.venv/bin/python - <<'PY'
from watchless_app.app import create_app
app = create_app()
app.run(host="127.0.0.1", port=5055, debug=False, use_reloader=False)
PY
```

Open:

```text
http://127.0.0.1:5055
```
