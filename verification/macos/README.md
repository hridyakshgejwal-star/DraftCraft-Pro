# Native macOS checks (used for 1.15.3 and 1.15.4)

Put the DMG (`DraftCraft-Pro-<version>-arm64.dmg`; with several, the highest version is used) and these scripts in one new folder on the Mac and double-click them in
order from Finder. Each writes a `.log` next to itself. Optionally add `expected.txt` with the lines `dmg <sha256>` and `asar <sha256>`
(from `SHA256SUMS.txt` and `dmg-receipt.json`); `1-verify-image.command` then reports MATCH or MISMATCH.

| Script | What it does | Changes anything outside the folder? |
|---|---|---|
| `1-verify-image.command` | SHA-256 of the DMG, `hdiutil verify`, read-only mount, Info.plist, `lipo`, `codesign --verify --deep --strict`, `codesign -dvvv`, nested signatures, `spctl` (expected to reject an ad-hoc build), installer manifest and pins, detaches | No (reports, but does not touch, an installed `/Applications/DraftCraft Pro.app` and the normal profile) |
| `2-launch-isolated.command` | Copies the app out of the DMG into `app/`, re-verifies it, and launches it through LaunchServices (`open -n`) with `DRAFTCRAFT_TEST_PROFILE=profile/` | No — the copy uses its own profile; saves and exports go wherever you choose in the save panel |
| `3-reopen.command` | Sends the Dock "reopen" event to the running test copy (only if it is running) | No |
| `4-crash-renderer.command` | `kill -9` of the test copy's renderer process only, to exercise crash recovery | No |
| `2b-launch-isolated-tmp.command` | Like `2-launch-isolated`, but puts the app copy and its profile in `/tmp/draftcraft-<version>-test`, so the test copy does not touch a privacy-protected folder (Downloads, Documents, Desktop) and macOS does not ask for folder access | Writes only `/tmp/draftcraft-1.15.3-test` (removed by macOS on restart) |
| `5-stop-test-copy.command` | Stops only the test copies these scripts started (this folder's `app/` and the `/tmp` copy): SIGTERM, then SIGKILL after 5 s | No |

If the test copy lives in `~/Downloads` (or Documents/Desktop), macOS may ask whether "DraftCraft Pro" may access that
folder. That setting is stored per app identifier and is shared with an installed DraftCraft Pro, so use
`2b-launch-isolated-tmp.command` instead of answering it for a test copy.

The interactive steps (typing, Save, Cmd+W, Cmd+Q, PDF export) are done in the running test copy; see
`verification/evidence-1.15.3/macos/` and `verification/evidence-1.15.4/macos/` for what was run and observed.
