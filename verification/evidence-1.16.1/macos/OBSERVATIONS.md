# Native macOS checks — DraftCraft Pro 1.16.1

**Machine.** Mac mini, Apple Silicon (arm64), the same Mac that checked 1.16.0.

**Delivery.**
1. The disk image was copied to `~/Downloads` in 14 pieces.
2. Each piece was checked against its SHA-256, and the pieces were joined.
3. The joined image's SHA-256 is `972925f7…baf5`, which **matches** `SHA256SUMS.txt` and `dmg-receipt.json`.
4. The pieces were then deleted. A copy of the image and the check kit (`1-verify-image.command`, `expected.txt` with
   the image and `app.asar` hashes) are in `~/Downloads/DraftCraft-1.16.1-mac-test/`.

**Not run.** The Mac's screen was locked when the image arrived, so the read-only native checks could not be started
from Finder:

* `hdiutil verify`
* the read-only mount
* Info.plist
* `codesign --verify --deep --strict`
* the installer manifest
* the macOS `bash -n` and `plutil -lint` checks of the Developer-ID files
* the `app.asar` hash

To run them, double-click `1-verify-image.command` in that folder. It writes `1-verify-image.log` next to itself and
changes nothing outside the folder. The installed `/Applications/DraftCraft Pro.app` and the profile were not touched.
