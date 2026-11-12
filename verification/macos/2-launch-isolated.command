#!/bin/bash
# DraftCraft Pro (1.15.3 and later) - native macOS check 2: copy the app out of the DMG into this folder and launch it with an
# isolated profile (DRAFTCRAFT_TEST_PROFILE). The installed /Applications copy and your normal profile are not touched.
T="$(cd "$(dirname "$0")" && pwd)"; cd "$T"
exec > >(tee "$T/2-launch-isolated.log") 2>&1
DMG="$(ls -1 "$T"/DraftCraft-Pro-*-arm64.dmg 2>/dev/null | sort -V | tail -1)"; VER="$(basename "$DMG" | sed -E 's/DraftCraft-Pro-(.*)-arm64.dmg/\1/')"; M="$T/mnt"; APP="$T/app/DraftCraft Pro.app"
date
echo "== DraftCraft processes before launch"; pgrep -lf "DraftCraft Pro" || echo "  none"
echo "== attach"; mkdir -p "$M"; hdiutil attach -readonly -nobrowse -noautoopen -mountpoint "$M" "$DMG" >/dev/null 2>&1; echo "attach exit=$?"
rm -rf "$T/app"; mkdir -p "$T/app" "$T/profile" "$T/documents"
echo "== ditto app"; ditto "$M/DraftCraft Pro.app" "$APP"; echo "ditto exit=$?"
hdiutil detach "$M" >/dev/null 2>&1; echo "detach exit=$?"
echo "== copy signature"; codesign --verify --deep --strict "$APP"; echo "codesign verify exit=$?"
echo "== quarantine on copy"; xattr -p com.apple.quarantine "$APP" 2>&1 | head -1
echo "== launch via LaunchServices (open -n) with isolated profile"
open -n --env DRAFTCRAFT_TEST_PROFILE="$T/profile" --stdout "$T/app-stdout.log" --stderr "$T/app-stderr.log" "$APP"; echo "open exit=$?"
sleep 12
echo "== processes after launch"; pgrep -lf "$T/app/DraftCraft Pro.app" || echo "  NOT RUNNING"
echo "== profile contents"; ls -la "$T/profile"
echo "== stderr so far"; cat "$T/app-stderr.log" 2>/dev/null | tail -20
echo "== DONE"
