# GitHub Release Checklist

Use this checklist to publish a free unsigned Mac build for friends.

## Built Artifact

Current local artifact:

```text
dist/YouTube-Summary-App.dmg
```

Current checksum:

```text
07e877b3c1293ec913d0810787f02ba9cfd9ac6bc1caa1825f05032c2fa2d28e
```

## Create The GitHub Release

1. Open the repository on GitHub:

```text
https://github.com/peiliangkrausse-oss/Youtube-Summary
```

2. Click **Releases**.
3. Click **Draft a new release**.
4. Choose tag:

```text
v1.0.0
```

5. Release title:

```text
YouTube Summary App v1.0.0
```

6. Paste the contents of:

```text
GITHUB_RELEASE_NOTES_v1.0.0.md
```

7. Under **Attach binaries by dropping them here or selecting them**, upload:

```text
dist/YouTube-Summary-App.dmg
```

8. Click **Publish release**.

## Friend Link

After publishing, send friends the release page link, not the repository source ZIP.

The link will look like:

```text
https://github.com/peiliangkrausse-oss/Youtube-Summary/releases/tag/v1.0.0
```

## Important Friend Message

Send this short note with the link:

```text
Download YouTube-Summary-App.dmg from Assets, not Source code.
Because this is a free unsigned Mac build, open it with right-click > Open the first time.
You also need LM Studio installed, one model loaded, and the local server running on port 1234.
Instructions are in DOWNLOAD_INSTRUCTIONS.md.
```

## If macOS Blocks The App

Tell testers to run:

```bash
xattr -dr com.apple.quarantine "/Applications/YouTube Summary App.app"
```

This is the free workaround when the app is not notarized through Apple's paid developer program.
