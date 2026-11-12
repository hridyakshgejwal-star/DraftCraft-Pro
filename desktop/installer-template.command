#!/bin/bash
# One-time installation of the supplied personal DraftCraft Pro build.
# Package hashes establish integrity, not an Apple-verified publisher identity.
set -euo pipefail
export LC_ALL=C
package_dir=$(cd "$(/usr/bin/dirname "$0")" && pwd -P)
source_app="$package_dir/DraftCraft Pro.app"
support_dir="$package_dir/Support"
scratch_dir=""
staging_dir=""
completed=0
cleanup() {
  if [ -n "$staging_dir" ] && [ -d "$staging_dir" ]; then /bin/rm -rf "$staging_dir"; fi
  if [ "$completed" = 1 ] && [ -n "$scratch_dir" ]; then /bin/rm -rf "$scratch_dir"; fi
}
trap cleanup EXIT
fail() {
  printf '\nInstallation stopped: %s\n' "$1" >&2
  if [ -n "$scratch_dir" ]; then printf 'Details: %s/install.log\n' "$scratch_dir" >&2; fi
  exit 1
}
if [ "$(/usr/bin/uname -s)" != Darwin ]; then fail 'Run this installer on macOS.'; fi
if [ "$(/usr/bin/uname -m)" != arm64 ] && [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null || true)" != 1 ]; then
  fail 'This package needs an Apple Silicon Mac (M1, M2, or newer).'
fi
mac_version=$(/usr/bin/sw_vers -productVersion)
mac_major=${mac_version%%.*}
if [ "$mac_major" -lt 13 ]; then fail 'This app needs macOS 13 or later.'; fi
if [ ! -d "$source_app" ] || [ -L "$source_app" ]; then fail 'Keep the installer beside the supplied DraftCraft Pro.app.'; fi
if /usr/bin/pgrep -x 'DraftCraft Pro' >/dev/null 2>&1; then fail 'Quit DraftCraft Pro, then run this installer again.'; fi
scratch_dir=$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/DraftCraft-Install.XXXXXX")
log="$scratch_dir/install.log"
printf '%s\n' 'Checking the downloaded app...'
check_hash() {
  local file=$1
  local expected=$2
  local actual
  if [ ! -f "$file" ] || [ -L "$file" ]; then fail 'A required support file is missing.'; fi
  actual=$(/usr/bin/shasum -a 256 "$file")
  actual=${actual%% *}
  if [ "$actual" != "$expected" ]; then fail 'The package is incomplete or changed. Download a fresh copy.'; fi
}
check_hash "$support_dir/Package-SHA256.txt" '@@MANIFEST_HASH@@'
check_hash "$support_dir/File-Paths.txt" '@@FILES_HASH@@'
check_hash "$support_dir/Bundle-Links.txt" '@@LINKS_HASH@@'
check_hash "$support_dir/Sign-macOS.sh" '@@SIGNER_HASH@@'
(
  cd "$package_dir"
  /usr/bin/find 'DraftCraft Pro.app' -type f ! -name '.DS_Store' -print | /usr/bin/sort > "$scratch_dir/actual-files.txt" || exit 1
  /usr/bin/find 'DraftCraft Pro.app' -type l -print | /usr/bin/sort > "$scratch_dir/actual-links.txt" || exit 1
  /usr/bin/cmp "$support_dir/File-Paths.txt" "$scratch_dir/actual-files.txt" || exit 1
  /usr/bin/cut -f 1 "$support_dir/Bundle-Links.txt" | /usr/bin/sort > "$scratch_dir/expected-links.txt" || exit 1
  /usr/bin/cmp "$scratch_dir/expected-links.txt" "$scratch_dir/actual-links.txt" || exit 1
  while IFS=$'\t' read -r link_path link_target; do
    if [ "$(/usr/bin/readlink "$link_path")" != "$link_target" ]; then exit 1; fi
  done < "$support_dir/Bundle-Links.txt"
  /usr/bin/shasum -a 256 -c "$support_dir/Package-SHA256.txt"
) > "$log" 2>&1 || fail 'The downloaded app failed its integrity check. Download a fresh copy.'

if [ -d '/Applications' ] && [ -w '/Applications' ]; then
  install_parent='/Applications'
else
  install_parent="$HOME/Applications"
fi
/bin/mkdir -p "$install_parent"
target_app="$install_parent/DraftCraft Pro.app"
staging_dir=$(/usr/bin/mktemp -d "$install_parent/.DraftCraft-Install.XXXXXX")
staged_app="$staging_dir/DraftCraft Pro.app"
printf '%s\n' 'Installing and signing the app for this Mac...'
/usr/bin/ditto "$source_app" "$staged_app" >> "$log" 2>&1 || fail 'Could not copy the app into Applications.'
/bin/bash "$support_dir/Sign-macOS.sh" "$staged_app" >> "$log" 2>&1 || fail 'macOS could not sign or verify this app. See the installation log.'
# Only after integrity and Apple's signature verification have passed:
# clear the quarantine attribute on this newly installed copy, not its parent.
/usr/bin/xattr -r -d com.apple.quarantine "$staged_app" >> "$log" 2>&1 || true
/usr/bin/codesign --verify --deep --strict --verbose=2 "$staged_app" >> "$log" 2>&1 || fail 'macOS signature verification failed.'
backup_parent=""
if [ -e "$target_app" ] || [ -L "$target_app" ]; then
  backup_parent=$(/usr/bin/mktemp -d "$install_parent/DraftCraft-Previous-$(/bin/date +%Y%m%d-%H%M%S).XXXXXX")
  /bin/mv "$target_app" "$backup_parent/DraftCraft Pro.app" || fail 'Could not preserve the previous app.'
fi
if ! /bin/mv "$staged_app" "$target_app"; then
  if [ -n "$backup_parent" ]; then /bin/mv "$backup_parent/DraftCraft Pro.app" "$target_app"; fi
  fail 'Could not finish installation.'
fi
/usr/bin/codesign --verify --deep --strict --verbose=2 "$target_app" >> "$log" 2>&1 || fail 'The installed copy did not pass signature verification.'
printf 'Installed: %s\n' "$target_app"
if [ -n "$backup_parent" ]; then printf 'Previous app preserved: %s\n' "$backup_parent"; fi
/usr/bin/open "$target_app" >> "$log" 2>&1 || fail 'Installation finished, but macOS could not open the app. See the log.'
completed=1
printf '%s\n' 'DraftCraft Pro is opening. You can close this Terminal window.'
