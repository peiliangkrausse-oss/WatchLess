#!/bin/zsh
set -euo pipefail

APP_NAME="YouTube Summary App"
DMG_NAME="YouTube-Summary-App.dmg"
SIGN_IDENTITY="${SIGN_IDENTITY:-}"
NOTARY_APPLE_ID="${NOTARY_APPLE_ID:-}"
NOTARY_TEAM_ID="${NOTARY_TEAM_ID:-}"
NOTARY_PASSWORD="${NOTARY_PASSWORD:-}"

cd "$(dirname "$0")"

if [ ! -x ".venv/bin/python" ]; then
  echo "Missing .venv. Create it with: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

rm -rf build dist "$DMG_NAME"
.venv/bin/python -m PyInstaller --clean --noconfirm "YouTube Summary App.spec"

CLEAN_APP="/private/tmp/youtube-summary-clean.app"
rm -rf "$CLEAN_APP"
if command -v ditto >/dev/null 2>&1; then
  ditto --norsrc --noextattr "dist/$APP_NAME.app" "$CLEAN_APP"
elif command -v xattr >/dev/null 2>&1; then
  xattr -cr "dist/$APP_NAME.app" || true
  cp -R "dist/$APP_NAME.app" "$CLEAN_APP"
else
  cp -R "dist/$APP_NAME.app" "$CLEAN_APP"
fi
xattr -cr "$CLEAN_APP" || true

if command -v codesign >/dev/null 2>&1; then
  if [ -n "$SIGN_IDENTITY" ]; then
    codesign --force --deep --options runtime --timestamp --sign "$SIGN_IDENTITY" "$CLEAN_APP"
  else
    codesign --force --deep --sign - "$CLEAN_APP"
  fi
  codesign --verify --deep --strict --verbose=2 "$CLEAN_APP"
fi

hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "$CLEAN_APP" \
  -ov \
  -format UDZO \
  "dist/$DMG_NAME"

if [ -n "$SIGN_IDENTITY" ]; then
  codesign --force --timestamp --sign "$SIGN_IDENTITY" "dist/$DMG_NAME"
fi

if [ -n "$NOTARY_APPLE_ID" ] && [ -n "$NOTARY_TEAM_ID" ] && [ -n "$NOTARY_PASSWORD" ]; then
  xcrun notarytool submit "dist/$DMG_NAME" \
    --apple-id "$NOTARY_APPLE_ID" \
    --team-id "$NOTARY_TEAM_ID" \
    --password "$NOTARY_PASSWORD" \
    --wait
  xcrun stapler staple "dist/$DMG_NAME"
fi

echo "Built app source for DMG: $CLEAN_APP"
echo "Built: dist/$DMG_NAME"
