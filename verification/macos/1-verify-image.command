#!/bin/bash
# DraftCraft Pro (1.15.3 and later) - native macOS check 1: read-only image and signature checks.
# Writes 1-verify-image.log next to this script. Mounts the DMG read-only inside this folder and detaches it again.
T="$(cd "$(dirname "$0")" && pwd)"; cd "$T"
exec > >(tee "$T/1-verify-image.log") 2>&1
DMG="$(ls -1 "$T"/DraftCraft-Pro-*-arm64.dmg 2>/dev/null | sort -V | tail -1)"; VER="$(basename "$DMG" | sed -E 's/DraftCraft-Pro-(.*)-arm64.dmg/\1/')"; M="$T/mnt"; A="$M/DraftCraft Pro.app"
echo "== system"; sw_vers; uname -m; date
# Expected values, if given: a file "expected.txt" next to this script with lines "dmg <sha256>" and "asar <sha256>".
EXP_DMG=$(awk '$1=="dmg"{print $2}' "$T/expected.txt" 2>/dev/null); EXP_ASAR=$(awk '$1=="asar"{print $2}' "$T/expected.txt" 2>/dev/null)
check() { if [ -z "$2" ]; then echo "  (no expected value given)"; elif [ "$1" = "$2" ]; then echo "  MATCH expected $2"; else echo "  MISMATCH: expected $2"; fi; }
echo "== dmg sha256"; H=$(shasum -a 256 "$DMG" | cut -d' ' -f1); echo "$H"; check "$H" "$EXP_DMG"
echo "== quarantine on dmg"; xattr -l "$DMG"
echo "== hdiutil imageinfo"; hdiutil imageinfo "$DMG" | grep -E "Format|Checksum Type|Checksum Value|Partition|Total Bytes" | head -20
echo "== hdiutil verify"; hdiutil verify "$DMG"; echo "hdiutil verify exit=$?"
echo "== attach (read-only, no Finder window)"; mkdir -p "$M"; hdiutil attach -readonly -nobrowse -noautoopen -mountpoint "$M" "$DMG"; echo "attach exit=$?"
echo "== volume"; diskutil info "$M" | grep -E "Volume Name|File System Personality|Type \(Bundle\)|Read-Only Volume|Volume Total Space"
ls -la "$M"
echo "== Info.plist"; plutil -p "$A/Contents/Info.plist" | grep -E "CFBundleIdentifier|CFBundleShortVersionString|CFBundleVersion|LSMinimumSystemVersion|ElectronAsarIntegrity|hash"
echo "== architectures"; lipo -archs "$A/Contents/MacOS/DraftCraft Pro"; file "$A/Contents/MacOS/DraftCraft Pro"
echo "== codesign --verify --deep --strict --verbose=4"; codesign --verify --deep --strict --verbose=4 "$A"; echo "codesign verify exit=$?"
echo "== codesign -dvvv (outer bundle)"; codesign -dvvv "$A" 2>&1 | grep -vE "^Hash choices|^CMSDigest|^CandidateCDHashFull" | head -25
echo "== codesign verify each nested framework/helper"; find "$A/Contents/Frameworks" -maxdepth 1 \( -name "*.framework" -o -name "*.app" \) -print0 | while IFS= read -r -d '' f; do codesign --verify --strict "$f" >/dev/null 2>&1; echo "  exit=$? $(basename "$f")"; done
echo "== spctl (Gatekeeper; an ad-hoc, non-notarized build is expected to be rejected)"; spctl --assess --type execute -vv "$A"; echo "spctl exit=$?"
echo "== installer manifest (Support/Package-SHA256.txt)"; (cd "$M" && n=$(wc -l < Support/Package-SHA256.txt) && bad=$(shasum -a 256 -c Support/Package-SHA256.txt 2>&1 | grep -v ': OK$' | wc -l) && echo "entries=$n not-ok=$bad")
echo "== installer pins"; for f in Package-SHA256.txt File-Paths.txt Bundle-Links.txt Sign-macOS.sh; do h=$(shasum -a 256 "$M/Support/$f" | cut -d' ' -f1); grep -q "$h" "$M/Install-DraftCraft.command" && echo "  pinned $f" || echo "  NOT PINNED $f"; done
echo "== symlinks in bundle"; find "$A" -type l | wc -l
echo "== app.asar sha256"; H=$(shasum -a 256 "$A/Contents/Resources/app.asar" | cut -d' ' -f1); echo "$H"; check "$H" "$EXP_ASAR"
echo "== existing DraftCraft installs (not modified)"; for p in "/Applications/DraftCraft Pro.app" "$HOME/Applications/DraftCraft Pro.app"; do if [ -d "$p" ]; then echo "  $p: $(defaults read "$p/Contents/Info" CFBundleShortVersionString 2>/dev/null)"; else echo "  $p: absent"; fi; done
echo "== existing profile (not modified)"; ls -ld "$HOME/Library/Application Support/DraftCraft Pro" 2>&1
echo "== detach"; hdiutil detach "$M"; echo "detach exit=$?"
echo "== DONE"
