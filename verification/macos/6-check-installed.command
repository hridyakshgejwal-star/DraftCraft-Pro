#!/bin/bash
# DraftCraft Pro (1.15.3 and later) - read-only report on the installed app after Install-DraftCraft.command.
# Writes 6-check-installed.log next to this script. Changes nothing.
T="$(cd "$(dirname "$0")" && pwd)"; cd "$T"
exec > >(tee "$T/6-check-installed.log") 2>&1
date; sw_vers -productVersion
for A in "/Applications/DraftCraft Pro.app" "$HOME/Applications/DraftCraft Pro.app"; do
  [ -d "$A" ] || { echo "== $A: absent"; continue; }
  echo "== $A"
  plutil -p "$A/Contents/Info.plist" | grep -E "CFBundleShortVersionString|CFBundleVersion|\"hash\""
  echo "-- app.asar sha256: $(shasum -a 256 "$A/Contents/Resources/app.asar" | cut -d' ' -f1)"
  echo "-- codesign --verify --deep --strict"; codesign --verify --deep --strict --verbose=2 "$A" 2>&1 | tail -2; echo "   exit=${PIPESTATUS[0]}"
  echo "-- signature"; codesign -dv "$A" 2>&1 | grep -E "Identifier|Signature|TeamIdentifier|flags"
  echo "-- quarantine: $(xattr -p com.apple.quarantine "$A" 2>&1 | head -1)"
done
echo "== previous copies kept by the installer"
ls -d /Applications/DraftCraft-Previous-* "$HOME/Applications/DraftCraft-Previous-"* 2>/dev/null | while read -r B; do echo "$B: $(defaults read "$B/DraftCraft Pro.app/Contents/Info" CFBundleShortVersionString 2>/dev/null)"; done
echo "== running DraftCraft processes"; pgrep -lf "DraftCraft Pro.app/Contents/MacOS/DraftCraft Pro" | cut -c1-140 || echo "  none"
echo "== DONE"
