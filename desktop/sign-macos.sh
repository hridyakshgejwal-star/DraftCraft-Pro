#!/bin/bash
# Local ad-hoc signing for a personal build. No Developer ID is claimed.
set -euo pipefail
bundle=${1:?Pass the path of the app bundle}
if [ "$(/usr/bin/uname -s)" != "Darwin" ]; then
  printf '%s\n' 'This signing helper requires macOS.' >&2
  exit 1
fi
# Sign leaf Mach-O files first, then their containing bundles, then the app.
# Verification may use --deep; signing deliberately proceeds inside out.
while IFS= read -r -d '' native_file; do
  if /usr/bin/file -b "$native_file" | /usr/bin/grep -q 'Mach-O'; then
    /usr/bin/codesign --force --sign - --timestamp=none "$native_file"
  fi
done < <(/usr/bin/find "$bundle/Contents" -type f -print0)
while IFS= read -r -d '' nested_bundle; do
  /usr/bin/codesign --force --sign - --timestamp=none "$nested_bundle"
done < <(/usr/bin/find "$bundle/Contents" -depth -type d \( -name '*.app' -o -name '*.framework' \) -print0)
/usr/bin/codesign --force --sign - --timestamp=none "$bundle"
/usr/bin/codesign --verify --deep --strict --verbose=2 "$bundle"
