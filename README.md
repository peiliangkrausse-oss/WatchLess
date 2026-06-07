# YouTube Summary App

A local macOS desktop app that summarizes YouTube videos with LM Studio.

## Architecture

- `desktop_app.py` - small launcher kept for compatibility.
- `youtube_summary_app/app.py` - Flask app factory and dependency wiring.
- `youtube_summary_app/routes/` - page and API routes.
- `youtube_summary_app/services/` - transcript fetching, LM Studio access, prompt storage, Markdown history, and the summary queue.
- `youtube_summary_app/templates/index.html` - app shell.
- `youtube_summary_app/static/css/styles.css` - UI styles.
- `youtube_summary_app/static/js/app.js` - browser app, tabs, queue polling, history loading.

The old Streamlit prototype remains in `app.py`, but the shippable desktop app now runs through `desktop_app.py`.

## One-Time Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Install LM Studio, load exactly one chat/instruct model, and start the OpenAI-compatible local server on port `1234`.

## Run Locally

```bash
.venv/bin/python desktop_app.py
```

Or double-click:

```text
Start YouTube Summarizer.command
```

## Local Data

Prompt preset:

```text
~/Library/Application Support/YouTube Summary App/prompt_preset.json
```

Markdown summary history:

```text
~/Library/Application Support/YouTube Summary App/history/
```

## Publish DMG

From this folder:

```bash
chmod +x publish.sh
./publish.sh
```

Output:

```text
dist/YouTube Summary App.app
dist/YouTube-Summary-App.dmg
```

Friends may need to right-click the app and choose **Open** the first time because this is locally signed, not Apple notarized.
