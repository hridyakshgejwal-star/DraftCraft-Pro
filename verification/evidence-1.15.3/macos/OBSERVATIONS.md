# Native macOS run — what was done and seen

Mac: Mac mini, Apple Silicon (arm64), **macOS 27.0.1 (26A434)**, linked to this session on 17 Oct 2026.
The DMG was copied to `~/Downloads/DraftCraft-1.15.3-mac-test/` and checked there with the scripts in
`verification/macos/`. The app was always a **separate copy** in that folder, launched through LaunchServices with
`DRAFTCRAFT_TEST_PROFILE` pointing at a profile inside the folder. The installed `/Applications/DraftCraft Pro.app`
(1.15.2) and the normal profile in `~/Library/Application Support/DraftCraft Pro` were reported but never opened,
changed or launched. `Install-DraftCraft.command` was **not** run, because it would replace the installed app.

Interactive steps used the Claude desktop app's computer-use tools (screenshots, clicks, typing) on the test copy.
Screenshots are in `screens/`. Whole-screen captures were cropped to the DraftCraft window (or to the system prompt), the save
panel's sidebar location entries were masked, and `macos-after-quit.jpg` (no app window left) is blurred, so that no
desktop files, other windows or account names show. The script logs are unchanged and contain the Mac's user name and
computer name in file paths.

## Round 1 — first DMG (payload 7692a51a…, `build-premac/`)

| # | Step | Observed | Result |
|---|---|---|---|
| 1 | `1-verify-image.command` | SHA-256 `98cace0e…` matches; no quarantine attribute; `hdiutil verify`: checksum VALID (UDIF zlib, CRC32 per partition); read-only attach; volume "DraftCraft Pro", case-sensitive HFS+; Info.plist 1.15.3 / `com.draftcraft.screenplay.studio` / ASAR hash `668ae028…`; arm64 Mach-O | PASS |
| 2 | Apple `codesign --verify --deep --strict --verbose=4` | "valid on disk", "satisfies its Designated Requirement"; every helper app and framework validated; `Signature=adhoc`, `TeamIdentifier=not set` | PASS |
| 3 | `spctl --assess --type execute` | "rejected" (exit 3) — expected: ad-hoc, not notarized | as expected |
| 4 | Installer manifest | 271/271 entries OK; all four support files pinned in `Install-DraftCraft.command`; 14 symlinks; `app.asar` SHA-256 `c237771c…` | PASS |
| 5 | `2-launch-isolated.command` | copy re-verified by `codesign`; `open -n` launched main, GPU, network and renderer processes with `--user-data-dir=<test>/profile`; editor rendered | PASS |
| 6 | Editor view | Courier rendering; scene numbers, locks and bookmark ribbons in the left margin; scene-comment and note markers in the right margin; nothing overlaps text (`macos-editor-margin-markers.jpg`) | PASS |
| 7 | Typing + Undo | text inserted where clicked; Undo restored it, **one character per Cmd+Z** (D-10, same as 1.15.2) | PASS / known limitation |
| 8 | Backspace at element start | joined into the previous Action with the caret at the join; Cmd+Z restored both (`macos-backspace-join.jpg`) | PASS |
| 9 | Shift+Down ×5 | selection highlight across Action → Scene Heading → Action; Escape cancelled (`macos-shift-arrow-cross-selection.jpg`) | PASS |
| 10 | Cmd+A, Cmd+A | element, then whole script (`macos-select-all-second-press.jpg`); **Escape then jumped to the end of the script** → E-09 (first fix checked in round 2, see below) | FAIL |
| 11 | Cmd+S | native save panel; saved `documents/THE CYBERNETICIST.draftcraft` (draftcraft-project v1, 27 elements) | PASS |
| 12 | Edit + Cmd+W on the saved document | closed without a prompt after saving the edit to the file (the document has a location; 1.15.x saves automatically) | PASS |
| 13 | After the last window closed | app kept running with no windows; `3-reopen.command` (Dock reopen event) opened a new window | PASS |
| 14 | Export PDF while the preview showed "Rendering…" | native save panel; "Verified PDF exported: …/THE CYBERNETICIST.pdf"; 3 pages, 612×792, Skia/PDF m152; `(MORE)` and `MARCUS (CONT'D)` on the same pages as in the editor | PASS |
| 15 | Page 2 of the editor | continuation of MARCUS's speech repeated the previous page's last line and hid "morning." (`macos-D09-before.jpg`); the PDF was correct → D-09 (fix checked in round 2) | FAIL |
| 16 | `4-crash-renderer.command` (kill -9 of the test renderer) | native alert "The editor stopped unexpectedly" with **Close Window / Reload Editor**; Reload restored the editor with the latest text (it had already been autosaved to the file) | PASS |
| 17 | New Document Window + typing, then Quit | native "Save Your Screenplay?" (Save / Don't Save / Cancel); Cancel kept the app and text; Quit → Don't Save quit the app; the saved project kept its last edit | PASS |
| 18 | stderr of the whole session | two Chromium native log lines (`sandbox_extension_issue_file`, `task_policy_set`), no JavaScript or main-process errors | PASS |

The crash alert says the changes "are kept as a recovery copy". In step 16 the edit had already been autosaved to the
project file, so no separate recovery copy was written; the wording is slightly broader than what happened.

## Round 2 — second DMG (payload 789a5858…, image 18837d6f…, `round2/`)

Same Mac, new folder `~/Downloads/DraftCraft-1.15.3-mac-test/round2/` with a new test profile. `expected.txt` held the
image and `app.asar` hashes from the Linux build receipt.

| # | Step | Observed | Result |
|---|---|---|---|
| 1 | `1-verify-image.command` | image SHA-256 MATCH `18837d6f…`; `hdiutil verify` VALID; case-sensitive HFS+; Info.plist 1.15.3 with ASAR hash `50c8f8e5…`; arm64; `codesign --verify --deep --strict` valid, every nested helper/framework exit 0; `spctl` rejected (expected); 271/271 manifest entries; four support files pinned; 14 symlinks; `app.asar` MATCH `a229b382…`; installed `/Applications` copy (1.15.2) and normal profile reported, not changed | PASS |
| 2 | `2-launch-isolated.command` (new profile) | copy verified by `codesign`; launched through LaunchServices with the test profile; built-in sample script shown | PASS |
| 3 | Page break in the sample script | page 1 ends "…Pack the drive. The" + `(MORE)`; page 2 starts `MARCUS (CONT'D)` / "board convenes in Geneva tomorrow morning." (`screens/macos-round2-D09-after.jpg`, `macos-round2-page-break-window.jpg`) | PASS (D-09 fixed) |
| 4 | Test copy between sessions | it was closed outside the test steps overnight; its profile showed no open windows and an empty recovery folder afterwards | — |
| 5 | Second launch (same profile) | opened an untitled script; typed a heading and two Action elements | PASS |
| 6 | Click inside "Alpha line…", type `Q`, Cmd+A, Cmd+A, Escape, type `Z` | first Cmd+A selected the element's text, the second the whole script; Escape cancelled the selection and kept the caret in the same element, but **at its start** (`Z` landed before "Alpha", not after `Q`) (`screens/macos-round2-E09-*.jpg`) | PARTIAL → fixed again (E-09, commit `7dbae17`), PASS in round 3 |
| 7 | Quit with the unsaved untitled script | native "Save Your Screenplay?" with Save / Don't Save / Cancel (`screens/macos-round2-quit-prompt.jpg`); Don't Save quit the test copy | PASS |
| 8 | First launch: double-click (imprecise position) in the blank line under a dual-dialogue block in the sample script | the right-hand speech (MARCUS cue and speech) showed a selection highlight (`screens/macos-round2-dual-dblclick.jpg`). The click position was not controlled; a Linux probe double-clicking that gap selected nothing, and a double-click on a word selected the word | reproduced in round 3 (D-11) |
| 9 | stderr of both launches | only Chromium's `sandbox_extension_issue_file` line | PASS |

## Round 3 — final payload (1cdc6eea…, image 9fd7de8c…, `round3/`)

| # | Step | Observed | Result |
|---|---|---|---|
| 1 | `1-verify-image.command` | image SHA-256 MATCH `9fd7de8c…`; `hdiutil verify` VALID; Info.plist 1.15.3 with ASAR hash `00fa3eaf…`; `codesign --verify --deep --strict` valid and every nested helper/framework exit 0; `spctl` rejected (expected); 271/271 manifest entries; four support files pinned; `app.asar` MATCH `5c01e790…`; installed `/Applications` copy (1.15.2) and normal profile reported, not changed | PASS |
| 2 | `2-launch-isolated.command` (copy and profile inside `~/Downloads/…/round3`) | the copy was verified and launched, but macOS showed **"DraftCraft Pro" would like to access files in your Downloads folder** (`screens/macos-round3-downloads-access-prompt.jpg`); the app's main process waited for the answer, no renderer started and the window stayed blank. The prompt was **not answered**: macOS keeps one Files & Folders entry per app identifier, so either answer could also change the setting of the installed 1.15.2 app. `5-stop-test-copy.command` stopped that copy (it ignored SIGTERM while waiting, so SIGKILL was used) | not a test of the app; see note below |
| 3 | `2b-launch-isolated-tmp.command` (copy and profile in `/tmp/draftcraft-1.15.3-test`) | copy verified, `app.asar` `5c01e790…`; main, GPU, network and renderer processes started; built-in sample script shown | PASS |
| 4 | Page break in the sample script | page 1 ends "…Pack the drive. The" + `(MORE)`; page 2 starts `MARCUS (CONT'D)` / "board convenes in Geneva tomorrow morning." (`screens/macos-round3-D09-page-break.jpg`) | PASS |
| 5 | Double-click on the word "limbic" | the word is selected inside its element (`screens/macos-round3-word-dblclick.jpg`) | PASS |
| 6 | Double-click in the blank line between the dual-dialogue block and the next Action | the system selection highlight appeared on two *other* elements above ("board convenes…" and the ELENA cue) although no element had focus (`screens/macos-round3-dual-gap-dblclick.jpg`); the next click cleared it. Cosmetic; no text changed | FAIL (D-11, known limitation) |
| 7 | Click after "Elena's ", type `Q`, Cmd+A, Cmd+A, Escape, type `Z` | first Cmd+A selected the element's text; the second the whole script; after Escape `Z` landed directly after `Q` ("Elena's QZfingers") (`screens/macos-round3-E09-*.jpg`) | PASS (E-09 fixed) |
| 8 | Quit with the edited sample | native "Save Your Screenplay?" with Save / Don't Save / Cancel (`screens/macos-round3-quit-prompt.jpg`); Don't Save quit the copy; no DraftCraft process left | PASS |
| 9 | stderr | only Chromium's `sandbox_extension_issue_file` line | PASS |

**Downloads access prompt.** It appears because the test copy and its profile were inside `~/Downloads`, a folder macOS
protects. The same request was most likely behind the hidden system alert in round 2. An installed copy in
`/Applications` keeps its data in `~/Library/Application Support`, so this prompt is not expected in normal use, but it
was not verified. After the test copy was stopped the prompt stayed on screen; it was left for the Mac's owner to
answer or dismiss.
