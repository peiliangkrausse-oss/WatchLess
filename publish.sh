#!/bin/zsh
set -euo pipefail

APP_NAME="YouTube Summary App"
DMG_NAME="YouTube-Summary-App.dmg"

cd "$(dirname "$0")"

if [ ! -x ".venv/bin/python" ]; then
  echo "Missing .venv. Create it with: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

rm -rf build dist "$DMG_NAME"
.venv/bin/python -m PyInstaller --clean --noconfirm "YouTube Summary App.spec"

if command -v xattr >/dev/null 2>&1; then
  xattr -cr "dist/$APP_NAME.app" || true
fi

if command -v codesign >/dev/null 2>&1; then
  codesign --force --deep --sign - "dist/$APP_NAME.app"
fi

hdiutil create \
  -volname "$APP_NAME" \
  -srcfolder "dist/$APP_NAME.app" \
  -ov \
  -format UDZO \
  "dist/$DMG_NAME"

echo "Built: dist/$APP_NAME.app"
echo "Built: dist/$DMG_NAME"
