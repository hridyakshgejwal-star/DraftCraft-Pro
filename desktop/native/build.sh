#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(uname -s)" != "Darwin" ]]; then echo 'The macOS SDK and Swift compiler are required.' >&2; exit 1; fi
xcrun swiftc -O -framework AVFoundation -framework Speech -target "$(uname -m)-apple-macos13.0" Dictation.swift -o DraftCraftDictation
