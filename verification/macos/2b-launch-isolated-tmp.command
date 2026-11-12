#!/bin/bash
# DraftCraft Pro (1.15.3 and later) - like 2-launch-isolated.command, but the app copy and its test profile live in
# /tmp/draftcraft-<version>-test instead of this folder, so the test copy does not touch a privacy-protected folder
# (Downloads, Documents, Desktop) and macOS does not ask for folder access. Logs stay next to this script.
T="$(cd "$(dirname "$0")" && pwd)"; cd "$T"
exec > >(tee "$T/2b-launch-isolated-tmp.log") 2>&1
DMG="$(ls -1 "$T"/DraftCraft-Pro-*-arm64.dmg 2>/dev/null | sort -V | tail -1)"; VER="$(basename "$DMG" | sed -E 's/DraftCraft-Pro-(.*)-arm64.dmg/\1/')"; M="$T/mnt"; W="/tmp/draftcraft-$VER-test"; APP="$W/app/DraftCraft Pro.app"
date
echo "== DraftCraft processes before launch"; pgrep -lf "DraftCraft Pro" | cut -c1-160 || echo "  none"
echo "== attach"; mkdir -p "$M"; hdiutil attach -readonly -nobrowse -noautoopen -mountpoint "$M" "$DMG" >/dev/null 2>&1; echo "attach exit=$?"
rm -rf "$W"; mkdir -p "$W/app" "$W/profile"
echo "== ditto app to $W/app"; ditto "$M/DraftCraft Pro.app" "$APP"; echo "ditto exit=$?"
hdiutil detach "$M" >/dev/null 2>&1; echo "detach exit=$?"
echo "== copy signature"; codesign --verify --deep --strict "$APP"; echo "codesign verify exit=$?"
echo "== app.asar sha256"; shasum -a 256 "$APP/Contents/Resources/app.asar"
echo "== launch via LaunchServices (open -n) with isolated profile $W/profile"
open -n --env DRAFTCRAFT_TEST_PROFILE="$W/profile" --stdout "$T/app-stdout-tmp.log" --stderr "$T/app-stderr-tmp.log" "$APP"; echo "open exit=$?"
sleep 15
echo "== processes after launch"; pgrep -lf "$APP" | cut -c1-200 || echo "  NOT RUNNING"
echo "== profile contents"; ls -la "$W/profile"
echo "== stderr so far"; tail -20 "$T/app-stderr-tmp.log" 2>/dev/null
echo "== DONE"
