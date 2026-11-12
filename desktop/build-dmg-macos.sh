#!/bin/bash
# Reproducible personal Mac build. No Developer ID or notarization is implied.
set -euo pipefail
if [[ "$(uname -s)" != "Darwin" ]]; then
  printf '%s\n' 'Build this disk image on macOS with Node 24 and Xcode Command Line Tools.' >&2
  exit 1
fi
cd "$(dirname "$0")/.."
command -v node >/dev/null
command -v npm >/dev/null
xcrun --find swiftc >/dev/null
test -x /usr/bin/codesign
test -x /usr/bin/hdiutil
npm ci
npm --prefix desktop ci
npm run lint
node desktop/build.cjs
node desktop/package.mjs darwin arm64
draftcraft_bundle="../desktop-build/packages/DraftCraft Pro-darwin-arm64/DraftCraft Pro.app"
test -d "$draftcraft_bundle"
/usr/bin/codesign --verify --deep --strict --verbose=2 "$draftcraft_bundle"
draftcraft_version=$(node -p "require('./desktop/package.json').version")
draftcraft_output="../macOS-Releases"
mkdir -p "$draftcraft_output"
draftcraft_stage=$(mktemp -d "${TMPDIR:-/tmp}/draftcraft-dmg.XXXXXX")
trap 'rm -rf "$draftcraft_stage"' EXIT
/usr/bin/ditto "$draftcraft_bundle" "$draftcraft_stage/DraftCraft Pro.app"
ln -s /Applications "$draftcraft_stage/Applications"
node desktop/create-installer.mjs "$draftcraft_stage"
cp Production-Build-and-Install.md "$draftcraft_stage/Production-Build-and-Install.md"
cp PRODUCTION-FEATURE-MATRIX.md "$draftcraft_stage/PRODUCTION-FEATURE-MATRIX.md"
cp Production-Release-Notes.md "$draftcraft_stage/Production-Release-Notes.md"
draftcraft_image="$draftcraft_output/DraftCraft-Pro-${draftcraft_version}-arm64.dmg"
/usr/bin/hdiutil create -volname 'DraftCraft Pro' -srcfolder "$draftcraft_stage" -ov -format UDZO "$draftcraft_image"
/usr/bin/hdiutil verify "$draftcraft_image"
printf 'Created personal ad-hoc-signed build: %s\n' "$draftcraft_image"
printf '%s\n' 'Native launch, printing, microphone/IME, multiple windows and Gatekeeper/notarization remain separate verification steps.'
