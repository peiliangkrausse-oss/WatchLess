# YouTube Summary App

A local macOS desktop app that summarizes YouTube videos with LM Studio.

The app runs locally. You paste YouTube links, LM Studio runs the model on your machine, and summaries plus chat memory are saved on your Mac.

## Active Project Folder

Use this folder:

```bash
/Users/sam/Documents/Youtube Summary App
```

The older Desktop folder is not the active source of truth.

## What Is In This Repo

```text
desktop_app.py
  Desktop launcher.

youtube_summary_app/app.py
  Flask app factory and service wiring.

youtube_summary_app/routes/
  Page routes and JSON/SSE API routes.

youtube_summary_app/services/
  Business logic: LM Studio, transcripts, summaries, queue, history, prompt presets, chat memory.

youtube_summary_app/templates/index.html
  Main app HTML shell.

youtube_summary_app/static/css/styles.css
  App styling.

youtube_summary_app/static/js/app.js
  Browser behavior: tabs, queue polling, chat, feedback, zoom.

tests/
  Automated tests for storage and core API behavior.

publish.sh
  Builds the shippable macOS app and DMG.
```

## Local Data

User data is stored outside the repo:

```text
~/Library/Application Support/YouTube Summary App/
```

Important folders:

```text
history/          Markdown summaries
chat/             Saved chat memory
prompt_presets/   Saved prompt presets
prompt_preset.json default prompt
```

## Setup For Developers

Create the virtual environment:

```bash
python3 -m venv .venv
```

Install dependencies:

```bash
.venv/bin/pip install -r requirements.txt
```

Run tests:

```bash
.venv/bin/python -m pytest -q
```

Run the desktop app:

```bash
.venv/bin/python desktop_app.py
```

Run browser preview only:

```bash
.venv/bin/python - <<'PY'
from youtube_summary_app.app import create_app
app = create_app()
app.run(host="127.0.0.1", port=5055, debug=False, use_reloader=False)
PY
```

Open:

```text
http://127.0.0.1:5055
```

## LM Studio Setup

1. Install LM Studio.
2. Download one chat/instruct model.
3. Load one model only.
4. Start the OpenAI-compatible local server on port `1234`.
5. Use the app.

Small machines should use smaller models. If the app says no model is loaded, start LM Studio's local server and load one model.

## Build A DMG

From the repo root:

```bash
chmod +x publish.sh
./publish.sh
```

Expected output:

```text
dist/YouTube Summary App.app
dist/YouTube-Summary-App.dmg
```

Friends can download the DMG, open it, drag the app into Applications, then right-click the app and choose **Open** the first time.

## Versioning

Use Git tags for app versions:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Recommended version format:

```text
vMAJOR.MINOR.PATCH
```

Examples:

```text
v0.1.0 first usable test build
v0.2.0 new feature release
v0.2.1 bug fix release
v1.0.0 stable public release
```

## GitHub Workflow

Check changes:

```bash
git status
```

Stage changes:

```bash
git add .
```

Commit:

```bash
git commit -m "Describe the change"
```

Push:

```bash
git push origin main
```

If SSH asks about GitHub, accept the host key once:

```bash
ssh -T git@github.com
```

## Notes For Future Engineers

Keep backend behavior in `services/`.

Keep HTTP concerns in `routes/`.

Keep UI shell in `templates/index.html`.

Keep browser interaction in `static/js/app.js`. If this file grows much more, split it into focused modules:

```text
tabs.js
chat.js
models.js
presets.js
queue.js
feedback.js
```

Do not reintroduce root-level prototype apps. `desktop_app.py` is the entrypoint.
