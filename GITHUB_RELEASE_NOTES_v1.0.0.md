# YouTube Summary App v1.0.0

Local Mac app for summarizing YouTube videos with LM Studio.

## Download

Download this file from the release assets:

```text
YouTube-Summary-App.dmg
```

Artifact details from the local build:

```text
File: dist/YouTube-Summary-App.dmg
Size: 33 MB
SHA-256: 07e877b3c1293ec913d0810787f02ba9cfd9ac6bc1caa1825f05032c2fa2d28e
```

## Important First Launch Note

This is an unsigned, non-notarized friend-test build. macOS may warn that it cannot verify the app.

To open it:

1. Move the app to Applications.
2. Right-click or Control-click **YouTube Summary App**.
3. Choose **Open**.
4. Confirm **Open** again.

If macOS still blocks it, run:

```bash
xattr -dr com.apple.quarantine "/Applications/YouTube Summary App.app"
```

Then open the app again.

## LM Studio Required

This app does not include an AI model. It uses LM Studio as the free local AI runtime.

Before summarizing:

1. Install LM Studio from `https://lmstudio.ai/`.
2. Download one chat/instruct model.
3. Load exactly one model.
4. Start LM Studio's local server on port `1234`.
5. Open this app and click **Test Connection**.

## What's Included

- Paste one or more YouTube URLs.
- Queue multiple summaries.
- Summarize locally through LM Studio.
- Save Markdown history on your Mac.
- Chat with your local model about a summary.
- Edit and save prompt presets.
- Attach readable files to chat context.
- Built-in LM Studio setup guide.

## Known Limitations

- macOS only.
- Not signed or notarized.
- Requires LM Studio setup.
- Windows build is not included.
- Image upload is not supported yet.
- Summary speed depends on your Mac and model size.

## Best Model Advice

Start small:

```text
Gemma 3 4B
Qwen 2.5 7B Instruct
Llama 3.2 3B Instruct
```

If your Mac has more memory, try larger models later.

## Friend Test Checklist

Please tell me:

- Did the app open?
- Did LM Studio connect?
- Which Mac and model did you use?
- Did summary generation work?
- Was anything confusing?
- Screenshot any error messages.
