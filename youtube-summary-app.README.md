# YouTube Summary App

Local macOS desktop app for summarizing YouTube videos with LM Studio.

## Current Structure

- `desktop_app.py` launches the desktop app.
- `youtube_summary_app/routes/` contains Flask page/API routes.
- `youtube_summary_app/services/` contains business logic and storage.
- `youtube_summary_app/templates/index.html` is the HTML shell.
- `youtube_summary_app/static/css/styles.css` and `youtube_summary_app/static/js/app.js` hold frontend code.
- `publish.sh` builds the shippable `.app` and `.dmg`.

## Features

- Queue multiple YouTube URLs.
- Process LM Studio summaries one at a time to protect low-RAM machines.
- Detect the model currently exposed by LM Studio.
- Warn when no model or multiple models are available.
- Store summary history as local Markdown files.
- Show recent summaries in a bookmark-style top tab bar.
- Include first-run LM Studio instructions in the home screen.
- Store editable prompt presets locally.

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python desktop_app.py
```

## Publish

```bash
chmod +x publish.sh
./publish.sh
```

The DMG is written to:

```text
dist/YouTube-Summary-App.dmg
```
