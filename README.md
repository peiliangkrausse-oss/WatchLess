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
  Main browser behavior orchestration.

youtube_summary_app/static/js/modules/
  Focused frontend helpers for streaming, files, guide content, feedback, and Markdown/text rendering.

yt_summarizer_final_readability_updated.html
  Legacy design reference from the original single-file prototype. Keep it only as a reference until you explicitly decide to archive or delete it.

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
4. Open **Developer** > **Local Server** in LM Studio.
5. Start the OpenAI-compatible local server on port `1234`.
6. Confirm LM Studio shows `Reachable at: http://127.0.0.1:1234`.
7. In this app, keep the port as `1234` and click **Test Connection**.
8. If your LM Studio server uses a different port, edit the port field in the app and test again.

LM Studio commonly defaults to port `1234`, including on other Macs, but users can change it. That is why the app has an editable port field.

Model guidance:

```text
16 GB RAM and below: Gemma E4B or Gemma 4 12B
24 GB+ RAM: ChatGPT OSS 20B or Gemma 4 12B
32 GB+ RAM: Gemma 4, Qwen 3.6, or 26B-27B class models
```

Small machines should use smaller quantized models. If the app says no model is loaded, start LM Studio's local server and load exactly one model.

## App Versus DMG

`dist/YouTube Summary App.app` is the actual macOS application bundle.

`dist/YouTube-Summary-App.dmg` is the shareable installer-style disk image. Send the DMG to friends, not the raw app bundle.

Technically, friends can download a DMG from email, open it, and run the app. Practically, email providers often block or warn on app attachments, and macOS Gatekeeper may warn if the app is not signed and notarized. For a smoother friend test, share the DMG through GitHub Releases, Google Drive, Dropbox, or a website, and use Apple notarization before a wider public release.

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

## Signed And Notarized Builds

Local unsigned/ad-hoc builds work with:

```bash
./publish.sh
```

For Developer ID signing and Apple notarization, export these values first:

```bash
export SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export NOTARY_APPLE_ID="you@example.com"
export NOTARY_TEAM_ID="TEAMID"
export NOTARY_PASSWORD="app-specific-password"
./publish.sh
```

`publish.sh` signs the app, creates the DMG, signs the DMG, submits it to Apple, and staples the notarization ticket when credentials are present.

## Versioning

Use Git tags for app versions:

```bash
git tag -a v0.1.0 -m "YouTube Summary App v0.1.0"
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

## Release Checklist

1. Run `git status` and confirm only intended files changed.
2. Run `.venv/bin/python -m pytest -q`.
3. Run `node --check youtube_summary_app/static/js/app.js`.
4. Run `./publish.sh`.
5. Open `dist/YouTube Summary App.app` and smoke test guide, model status, feedback, donation, chat, and summarize flow.
6. Commit the changes.
7. Create an annotated release tag.
8. Push `main` and the tag.
9. Upload the DMG to GitHub Releases.
