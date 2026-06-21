#!/bin/zsh
set -euo pipefail

APP_NAME="WatchLess"
DMG_NAME="WatchLess.dmg"
SIGN_IDENTITY="${SIGN_IDENTITY:-}"
NOTARY_APPLE_ID="${NOTARY_APPLE_ID:-}"
NOTARY_TEAM_ID="${NOTARY_TEAM_ID:-}"
NOTARY_PASSWORD="${NOTARY_PASSWORD:-}"
ALLOW_UNSIGNED_LOCAL=0

cd "$(dirname "$0")"

if [ "${1:-}" = "--unsigned-local" ]; then
  ALLOW_UNSIGNED_LOCAL=1
elif [ "${1:-}" = "--help" ]; then
  cat <<EOF
Usage:
  ./publish.sh                 Build a signed and notarized release DMG.
  ./publish.sh --unsigned-local Build a local-only unsigned DMG for development.

Required for release builds:
  SIGN_IDENTITY       Developer ID Application certificate name
  NOTARY_APPLE_ID     Apple ID email
  NOTARY_TEAM_ID      Apple Developer Team ID
  NOTARY_PASSWORD     App-specific password or notarytool keychain profile password
EOF
  exit 0
elif [ -n "${1:-}" ]; then
  echo "Unknown option: $1"
  echo "Run ./publish.sh --help for usage."
  exit 1
fi

if [ "$ALLOW_UNSIGNED_LOCAL" -eq 0 ]; then
  missing=()
  [ -n "$SIGN_IDENTITY" ] || missing+=("SIGN_IDENTITY")
  [ -n "$NOTARY_APPLE_ID" ] || missing+=("NOTARY_APPLE_ID")
  [ -n "$NOTARY_TEAM_ID" ] || missing+=("NOTARY_TEAM_ID")
  [ -n "$NOTARY_PASSWORD" ] || missing+=("NOTARY_PASSWORD")

  if [ "${#missing[@]}" -gt 0 ]; then
    echo "Release builds must be signed and notarized so macOS opens the app normally."
    echo "Missing: ${missing[*]}"
    echo ""
    echo "Set the missing Apple Developer values, then run ./publish.sh again."
    echo "For a local-only test build that may trigger Gatekeeper warnings, run:"
    echo "  ./publish.sh --unsigned-local"
    exit 1
  fi
fi

if [ ! -x ".venv/bin/python" ]; then
  echo "Missing .venv. Create it with: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

rm -rf build dist "$DMG_NAME"
.venv/bin/python -m PyInstaller --clean --noconfirm "WatchLess.spec"

CLEAN_APP="/private/tmp/watchless-clean.app"
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
  if [ "$ALLOW_UNSIGNED_LOCAL" -eq 1 ]; then
    codesign --force --deep --sign - "$CLEAN_APP"
  else
    codesign --force --deep --options runtime --timestamp --sign "$SIGN_IDENTITY" "$CLEAN_APP"
  fi
  codesign --verify --deep --strict --verbose=2 "$CLEAN_APP"
fi

hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "$CLEAN_APP" \
  -ov \
  -format UDZO \
  "dist/$DMG_NAME"

if [ "$ALLOW_UNSIGNED_LOCAL" -eq 0 ]; then
  codesign --force --timestamp --sign "$SIGN_IDENTITY" "dist/$DMG_NAME"
  xcrun notarytool submit "dist/$DMG_NAME" \
    --apple-id "$NOTARY_APPLE_ID" \
    --team-id "$NOTARY_TEAM_ID" \
    --password "$NOTARY_PASSWORD" \
    --wait
  xcrun stapler staple "dist/$DMG_NAME"
  xcrun stapler validate "dist/$DMG_NAME"
  spctl --assess --type open --context context:primary-signature --verbose "dist/$DMG_NAME"
fi

echo "Built app source for DMG: $CLEAN_APP"
echo "Built: dist/$DMG_NAME"
