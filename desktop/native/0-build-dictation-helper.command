#!/bin/bash
# DraftCraft Pro 1.17.0 - build the on-device dictation helper (Dictation.swift, next to this script) on this Mac.
# It only reads Dictation.swift and writes DraftCraftDictation, its checksum and a log into this folder.
# It does not install anything: if the Xcode command line tools are missing it says so and stops (it never starts
# the tools installer). Nothing outside this folder is changed.
T="$(cd "$(dirname "$0")" && pwd)"; cd "$T" || exit 1
exec > >(tee "$T/0-build-dictation-helper.log") 2>&1
echo "== DraftCraft dictation helper build $(date)"
sw_vers 2>/dev/null; echo "arch: $(uname -m)"
DEV="$(/usr/bin/xcode-select -p 2>/dev/null)"
echo "xcode-select path: ${DEV:-none}"
SWIFTC=""
for c in "$DEV/usr/bin/swiftc" "$DEV/Toolchains/XcodeDefault.xctoolchain/usr/bin/swiftc" /Library/Developer/CommandLineTools/usr/bin/swiftc; do [ -n "$DEV" ] && [ -x "$c" ] && { SWIFTC="$c"; break; }; done
if [ -z "$SWIFTC" ]; then echo "RESULT: NO-TOOLS (the Xcode command line tools are not installed; nothing was built)"; echo "== DONE"; exit 0; fi
SDK="$(/usr/bin/xcrun --sdk macosx --show-sdk-path 2>/dev/null)"; echo "swiftc: $SWIFTC"; "$SWIFTC" --version 2>&1 | head -2; echo "sdk: ${SDK:-none}"
[ -n "$SDK" ] || { echo "RESULT: NO-SDK"; echo "== DONE"; exit 0; }
rm -f "$T/DraftCraftDictation"
"$SWIFTC" -O -sdk "$SDK" -framework AVFoundation -framework Speech -target "$(uname -m)-apple-macos13.0" "$T/Dictation.swift" -o "$T/DraftCraftDictation"; rc=$?
echo "swiftc exit=$rc"
if [ $rc -ne 0 ] || [ ! -f "$T/DraftCraftDictation" ]; then echo "RESULT: BUILD-FAILED"; echo "== DONE"; exit 0; fi
echo "== file"; file "$T/DraftCraftDictation"; ls -l "$T/DraftCraftDictation"
echo "== signature"; codesign -dv "$T/DraftCraftDictation" 2>&1 | head -6
shasum -a 256 "$T/DraftCraftDictation" | tee "$T/DraftCraftDictation.sha256"
echo "RESULT: BUILT"
echo "== DONE"
