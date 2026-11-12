#!/bin/bash
# DraftCraft Pro: Developer ID signing and Apple notarization, run on your own Mac with your own Apple Developer
# account. The disk image ships with an ad-hoc signature; this script turns a verified copy of that app into a
# Developer ID-signed, notarized and stapled app and disk image that Gatekeeper accepts on any Mac.
#
# You need:
#   * Xcode or the Xcode Command Line Tools (codesign, notarytool, stapler).
#   * A "Developer ID Application" certificate in your login keychain (Xcode › Settings › Accounts › Manage
#     Certificates › + › Developer ID Application).
#   * A notarytool keychain profile. The script can create one for you: Apple's notarytool then asks for your
#     Apple ID, team ID and an app-specific password itself. This script never sees, stores or prints them.
#
# Usage (double-click in Finder, or from Terminal):
#   Sign-and-Notarize.command [--identity "Developer ID Application: Name (TEAMID)"] [--profile NAME]
#                             [--app PATH] [--out DIR] [--no-dmg] [--check]
#   --check   only checks the tools, the certificate and the notarytool profile; signs nothing.
set -euo pipefail
export LC_ALL=C

# Tests only: run against stand-in tools under this directory (verification/developer-id-sign.test.cjs).
T="${DC_SIGN_TEST_ROOT:-}"
CODESIGN="$T/usr/bin/codesign" XCRUN="$T/usr/bin/xcrun" SECURITY="$T/usr/bin/security" SPCTL="$T/usr/sbin/spctl"
HDIUTIL="$T/usr/bin/hdiutil" DITTO="$T/usr/bin/ditto" PLISTBUDDY="$T/usr/libexec/PlistBuddy" XATTR="$T/usr/bin/xattr"
FILE="$T/usr/bin/file" SHASUM="$T/usr/bin/shasum" UNAME="$T/usr/bin/uname"

here=$(cd "$(/usr/bin/dirname "$0")" && pwd -P)
package_dir=$(cd "$here/.." && pwd -P)
identity="" profile="DraftCraft-Notary" app="" out="" make_dmg=1 check_only=0
while [ $# -gt 0 ]; do
  case "$1" in
    --identity) identity=${2:?--identity needs a value}; shift 2;;
    --profile) profile=${2:?--profile needs a value}; shift 2;;
    --app) app=${2:?--app needs a path}; shift 2;;
    --out) out=${2:?--out needs a folder}; shift 2;;
    --no-dmg) make_dmg=0; shift;;
    --check) check_only=1; shift;;
    -h|--help) /usr/bin/sed -n '2,20p' "$0"; exit 0;;
    *) printf 'Unknown option: %s\n' "$1" >&2; exit 2;;
  esac
done
interactive=0; if [ -t 0 ] && [ -t 1 ] && [ -z "$T" ]; then interactive=1; fi
log=/dev/null
say() { printf '%s\n' "$*"; printf '%s\n' "$*" >> "$log"; }
fail() { printf '\nStopped: %s\n' "$1" >&2; if [ "$log" != /dev/null ]; then printf 'Log: %s\n' "$log" >&2; fi; exit 1; }
run() { printf '$ %s\n' "$*" >> "$log"; "$@" >> "$log" 2>&1; }

if [ "$("$UNAME" -s)" != Darwin ]; then fail 'Run this on macOS.'; fi
"$XCRUN" --find notarytool >/dev/null 2>&1 || fail 'notarytool was not found. Install Xcode or the Command Line Tools (xcode-select --install).'
"$XCRUN" --find stapler >/dev/null 2>&1 || fail 'stapler was not found. Install Xcode or the Command Line Tools (xcode-select --install).'

# 1. The signing certificate.
identities=$("$SECURITY" find-identity -v -p codesigning 2>/dev/null | /usr/bin/sed -n 's/.*"\(Developer ID Application: [^"]*\)".*/\1/p' | /usr/bin/sort -u || true)
if [ -n "$identity" ]; then
  printf '%s\n' "$identities" | /usr/bin/grep -Fxq -- "$identity" || fail "The certificate \"$identity\" is not in your keychain (or is not valid)."
else
  count=$(printf '%s' "$identities" | /usr/bin/grep -c . || true)
  if [ "$count" = 0 ]; then
    fail 'No "Developer ID Application" certificate was found. Create one in Xcode › Settings › Accounts › Manage Certificates, then run this again.'
  elif [ "$count" = 1 ]; then identity=$identities
  elif [ "$interactive" = 1 ]; then
    printf 'Several Developer ID certificates were found:\n'; printf '%s\n' "$identities" | /usr/bin/nl -w2 -s') '
    printf 'Number of the certificate to use: '; read -r choice
    identity=$(printf '%s\n' "$identities" | /usr/bin/sed -n "${choice}p")
    [ -n "$identity" ] || fail 'No certificate was chosen.'
  else
    fail "Several Developer ID certificates were found; choose one with --identity. Found: $(printf '%s' "$identities" | /usr/bin/tr '\n' ';')"
  fi
fi
printf 'Certificate: %s\n' "$identity"

# 2. The notarytool keychain profile (credentials stay in your keychain; only the profile name is used here).
if ! "$XCRUN" notarytool history --keychain-profile "$profile" >/dev/null 2>&1; then
  if [ "$interactive" = 1 ] && [ "$check_only" = 0 ]; then
    printf '\nNo working notarytool profile named "%s".\n' "$profile"
    printf 'Create it now? Apple'"'"'s notarytool will ask for your Apple ID, team ID and an app-specific password\n(appleid.apple.com › Sign-In and Security › App-Specific Passwords). [y/N] '
    read -r answer
    case "$answer" in y|Y|yes|YES) "$XCRUN" notarytool store-credentials "$profile" || fail 'The notarytool profile was not created.';; *) fail 'A notarytool profile is needed for notarization.';; esac
    "$XCRUN" notarytool history --keychain-profile "$profile" >/dev/null 2>&1 || fail "The notarytool profile \"$profile\" does not work."
  else
    fail "No working notarytool profile named \"$profile\". Create it with: xcrun notarytool store-credentials \"$profile\" (Apple asks for your Apple ID, team ID and an app-specific password)."
  fi
fi
printf 'Notarytool profile: %s\n' "$profile"
if [ "$check_only" = 1 ]; then printf '\nReady: the tools, the certificate and the notarytool profile all work.\n'; exit 0; fi

# 3. The app to sign: by default the DraftCraft Pro.app beside this folder, checked against the disk image's manifest.
if [ -z "$app" ]; then
  app="$package_dir/DraftCraft Pro.app"
  [ -d "$app" ] || fail 'DraftCraft Pro.app was not found beside the Developer-ID folder. Pass it with --app.'
  manifest="$package_dir/Support/Package-SHA256.txt"
  if [ -f "$manifest" ]; then
    printf 'Checking the app against the disk image manifest...\n'
    ( cd "$package_dir" && "$SHASUM" -a 256 -c "$manifest" >/dev/null 2>&1 ) || fail 'The app does not match its manifest. Use a fresh copy of the disk image.'
    ( cd "$package_dir" && /usr/bin/find 'DraftCraft Pro.app' -type f ! -name '.DS_Store' -print | /usr/bin/sort | /usr/bin/cmp -s - Support/File-Paths.txt ) || fail 'The app has extra or missing files. Use a fresh copy of the disk image.'
  fi
fi
app=$(cd "$app" && pwd -P)
version=$("$PLISTBUDDY" -c 'Print CFBundleShortVersionString' "$app/Contents/Info.plist")
[ -n "$out" ] || out="$HOME/Downloads/DraftCraft-Pro-$version-Developer-ID"
/bin/mkdir -p "$out"; out=$(cd "$out" && pwd -P)
log="$out/sign-and-notarize.log"; : > "$log"
say "DraftCraft Pro $version → $out"
work="$out/DraftCraft Pro.app"
[ ! -e "$work" ] || fail "$work already exists. Move it away or choose another --out folder."
run "$DITTO" "$app" "$work" || fail 'Could not copy the app.'
run "$XATTR" -cr "$work" || true
entitlements="$here/entitlements.plist"
[ -f "$entitlements" ] || fail 'entitlements.plist is missing beside this script.'

# 4. Sign inside out with the hardened runtime and a secure timestamp: every Mach-O file, then nested frameworks
#    and helper apps (deepest first), then the app. Executables get the entitlements; libraries and frameworks do not.
say 'Signing...'
sign() { run "$CODESIGN" --force --timestamp --options runtime --sign "$identity" "$@" || fail "codesign failed for ${!#}"; }
while IFS= read -r -d '' f; do
  kind=$("$FILE" -b "$f" || true)
  case "$kind" in *Mach-O*) ;; *) continue;; esac
  case "$kind" in *executable*) sign --entitlements "$entitlements" "$f";; *) sign "$f";; esac
done < <(/usr/bin/find "$work/Contents" -type f -print0 | /usr/bin/sort -z)
while IFS= read -r -d '' bundle; do
  case "$bundle" in *.app) sign --entitlements "$entitlements" "$bundle";; *) sign "$bundle";; esac
done < <(/usr/bin/find "$work/Contents" -depth -type d \( -name '*.app' -o -name '*.framework' \) -print0)
sign --entitlements "$entitlements" "$work"
run "$CODESIGN" --verify --deep --strict --verbose=2 "$work" || fail 'The signed app did not verify.'
details=$("$CODESIGN" -dvvv "$work" 2>&1 || true)
printf '%s\n' "$details" >> "$log"
printf '%s\n' "$details" | /usr/bin/grep -q 'Authority=Developer ID Application' || fail 'The app is not signed with the Developer ID certificate.'
printf '%s\n' "$details" | /usr/bin/grep -q 'flags=.*runtime' || fail 'The hardened runtime is not enabled.'

# 5. Notarize (Apple scans the app), then staple the ticket so the app opens offline too.
notarize() { # $1: file to submit, $2: label
  local result="$out/notary-$2.json" status id
  say "Submitting the $2 to Apple for notarization (this usually takes a few minutes)..."
  "$XCRUN" notarytool submit "$1" --keychain-profile "$profile" --wait --output-format json > "$result" 2>> "$log" || true
  /bin/cat "$result" >> "$log"
  status=$(/usr/bin/sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$result" | /usr/bin/head -1)
  id=$(/usr/bin/sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$result" | /usr/bin/head -1)
  if [ "$status" != Accepted ]; then
    if [ -n "$id" ]; then "$XCRUN" notarytool log "$id" --keychain-profile "$profile" "$out/notary-$2-log.json" >> "$log" 2>&1 || true; fi
    fail "Apple did not accept the $2 (status: ${status:-no answer}). Apple's report: $out/notary-$2-log.json"
  fi
  say "Notarization accepted ($2, submission $id)."
}
zip="$out/DraftCraft-Pro-$version-notarize.zip"
run "$DITTO" -c -k --sequesterRsrc --keepParent "$work" "$zip" || fail 'Could not zip the app for notarization.'
notarize "$zip" app
/bin/rm -f "$zip"
run "$XCRUN" stapler staple "$work" || fail 'Could not staple the notarization ticket to the app.'
run "$XCRUN" stapler validate "$work" || fail 'The stapled ticket did not validate.'
assessment=$("$SPCTL" --assess --type execute --verbose=4 "$work" 2>&1) || { printf '%s\n' "$assessment" >> "$log"; fail 'Gatekeeper did not accept the signed app.'; }
printf '%s\n' "$assessment" >> "$log"
say "Gatekeeper: $(printf '%s' "$assessment" | /usr/bin/tr '\n' ' ')"

# 6. A signed, notarized and stapled disk image with the app (drag it to Applications).
if [ "$make_dmg" = 1 ]; then
  stage="$out/.dmg-stage"; /bin/rm -rf "$stage"; /bin/mkdir -p "$stage"
  run "$DITTO" "$work" "$stage/DraftCraft Pro.app" || fail 'Could not prepare the disk image.'
  /bin/ln -s /Applications "$stage/Applications"
  printf '%s\n' "DraftCraft Pro $version, signed with $identity and notarized by Apple." '' 'Install: drag DraftCraft Pro.app onto Applications.' 'Your screenplays and settings are kept.' > "$stage/Read Me.txt"
  dmg="$out/DraftCraft-Pro-$version-arm64-notarized.dmg"; /bin/rm -f "$dmg"
  run "$HDIUTIL" create -volname 'DraftCraft Pro' -srcfolder "$stage" -fs HFS+ -format UDZO -ov "$dmg" || fail 'Could not create the disk image.'
  /bin/rm -rf "$stage"
  run "$CODESIGN" --force --timestamp --sign "$identity" "$dmg" || fail 'Could not sign the disk image.'
  notarize "$dmg" disk-image
  run "$XCRUN" stapler staple "$dmg" || fail 'Could not staple the notarization ticket to the disk image.'
  run "$SPCTL" --assess --type open --context context:primary-signature --verbose=4 "$dmg" || fail 'Gatekeeper did not accept the disk image.'
fi
( cd "$out" && for f in *.dmg; do [ -f "$f" ] && "$SHASUM" -a 256 "$f"; done > SHA256.txt ) || true
say ''
say "Done. Signed, notarized and stapled: $work"
if [ "$make_dmg" = 1 ]; then say "Disk image: $dmg"; fi
say 'Install it by dragging the app to Applications (Install-DraftCraft.command signs ad hoc, so do not use it for this copy).'
