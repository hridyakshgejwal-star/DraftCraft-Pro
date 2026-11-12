# DraftCraft Pro 1.16.0 — release report

This report covers two requests, both done in the existing DraftCraft Pro project (Electron 44.7.0, React,
TypeScript). It was not rebuilt from scratch, and no user data is migrated or discarded.

1. **Writing and saving.** This is the Return-key, spelling, next-element, stability and saving request. It was
   developed as 1.15.5 and ships in 1.16.0.
2. **UI redesign.** This is the "Master implementation prompt": a UI redesign with Final Draft 13 as the reference.

| Document | Contents |
|---|---|
| `CHANGELOG-1.16.0.md` | Everything that changed, and the repairs with their root causes |
| `FINAL-DRAFT-MATRIX-1.16.md` | A feature-by-feature comparison with Final Draft 13, with statuses |
| `FEATURES-1.16.0.md` | The list of implemented and repaired features |
| `TEST-RESULTS-1.16.0.md` | The automated test results for the exact 1.16.0 payload |
| `LIMITATIONS-1.16.0.md` | What remains and what was not verified |
| `Build-and-Install-1.16.0.md` | Installing, building and reproducing the tests |

## 1. Writing and saving (request A)

### Saving: root causes found and fixed

| # | Symptom | Root cause | Fix | Test |
|---|---|---|---|---|
| S-1 | A project renamed or moved in Finder while open failed **every** later save with "save location unavailable", and Retry never worked | The save path was fixed at open time; the move was never noticed | The file's identity (device + inode) is remembered. Save follows the moved file and re-associates the window. A deleted file or missing folder now gives a precise message with Save As and Retry. | Electron save scenarios (renamed while open, folder renamed, folder unplugged); `project-files.test.cjs` |
| S-2 | After another tool rewrote a project with identical content (or only a new save time), every save reported a conflict for good | The conflict check compared raw file bytes | It compares the document's content fingerprint; only a real content change is a conflict | Electron save scenarios ("same content, different bytes"; "external edit") |
| S-3 | Pressing ⌘S lost the caret, and letters typed right after ⌘S were lost | Save blurred the editor to finish the current element | The current element is finished in place, without blurring | smart-save suite; Electron save scenarios |
| S-4 | "Saving…" appeared late, so a slow save looked like nothing was happening | The status was set after the recovery copy was written | The status is set first | Electron save scenarios |

The saving checks are covered at three levels: the coordinator, the file layer and the real Electron window. They
include:

* overlapping manual saves and autosaves (the file always ends with the latest text)
* Save As, conflicts, recovery copies and crash recovery
* closing with Save / Don't Save / Cancel, where Cancel keeps the window and text unchanged

Results: Electron save scenarios **43/43** passed and Electron lifecycle **13/13** passed. The smart-save suite
passed.

### Return key, spelling and the next element

* **Full stops on Return.** A full stop is added only where a sentence needs one. None is added after a cue, a
  question, an ellipsis, a dash, an abbreviation, a scene heading or a transition, or when the text is split in the
  middle.
* **Spelling correction on Return.** Only the last word is corrected, and only when there is exactly one
  high-confidence correction. Names, informal dialogue, words used elsewhere in the script and protected screenplay
  terms are left alone. One Undo restores what was typed, and an undone correction is never repeated.
* **Next element.**
  * **Template rules.** Return follows the template's rules.
  * **Scene pattern.** In a running exchange, Return after a speech starts the next cue.
  * **Empty cue.** An empty cue becomes Action.
  * **Prose in a cue.** Prose typed into an automatic cue becomes Action, and Undo keeps the cue.
  * **Overrides.** A cue chosen with the element shortcut is respected, and Shift+Return inserts a line break.
  * **Setting.** Settings › Editor has "Choose the Element After Dialogue from the Scene".
* **Stability.** While typing and pressing Return:
  * no editor element is remounted
  * there is no unexpected layout shift
  * the caret stays in view
  * no characters are lost or duplicated

Test: enter-flow suite (68 checks) passed.

## 2. UI redesign and Final Draft feature work (request B)

### What was built

* **Toolbar and menus.** A customizable main toolbar (every item wired), native menus with check marks, macOS
  document tabs and appearance modes.
* **Views.** Page, Normal and Speed views, plus Focus, Typewriter, Split, Ruler, formatting marks and inline
  B/I/U with alignment.
* **Outline Editor timeline.** The timeline sits under the toolbar, with lanes, a page-accurate ruler and a Script
  lane. Elements can be edited fully and are synchronized with the Beat Board. Scene moves are confirmed and undoable.
* **Beat Board, Navigator and Structure Lines.**
  * Beat Board: unified undo, menus and filtering.
  * Navigator: Locations and Outline tabs, character interactions, sorting, working columns and in-place headings.
  * Structure Lines: real lines drawn from the script and the timeline.

The full details are in `CHANGELOG-1.16.0.md` and `FEATURES-1.16.0.md`.

### Phase 1 audit findings

Each finding below was reproduced, root-caused and fixed (R-01 to R-15 in the changelog):

* **Dead controls.** Status-bar view controls had no effect, Navigator column choices did nothing, Header & Footer
  could not be reached, and Next Bookmark returned to the first bookmark.
* **Fake Structure Lines.** The lines were hard-coded by page number.
* **Electron gaps.** Browser prompts and the default context menu are missing in Electron.
* **Layout.** The Navigator overflowed its column.
* **Dialogs.** Most dialogs could not be dismissed with Escape.

### Phase 9 reported problems

| # | Problem | Status in 1.16.0 |
|---|---|---|
| 1 | Margins, spacing, templates | Fixed in 1.15.4; the formats and templates suites pass on 1.16.0 |
| 2 | Close dialog | Fixed in 1.15.3; Electron lifecycle passes (Save / Don't Save / Cancel; Cancel keeps the document) |
| 3 | Saving | S-1…S-4 above; save scenarios 43/43 |
| 4 | Floating controls covering text | Paragraph controls are off by default; the element hint scrolls the line clear (R-09); workspace "Phase 9 #4" |
| 5 | Beat Board card resizing | The editor suite passes at 40/100/200 % |
| 6 | Right-click | R-01, R-13; workspace "Phase 9 #6" and Electron "right-click" |
| 7 | Flicker | The caret and enter-flow suites (no remounts, no layout shift) pass |
| 8 | Caret instability | The caret suite passes |
| 9 | Text shifting | Cross-paragraph and enter-flow pass; Structure Lines never move text (workspace) |
| 10 | Auto-format changing the wrong element | The automatic-formatting, punctuation and templates suites pass |
| 11 | Panels misaligned while resizing | R-07; workspace "Phase 9 #11" (1024–1920 px, Navigator 220–640 px, while dragging) |
| 12 | Toolbar actions | Every toolbar item is wired (workspace) |
| 13 | Crashes or freezes | No page errors in any suite; Electron crash and hang recovery scenarios pass |
| 14 | Installation and launch | `Install-DraftCraft.command` in the DMG; not yet run on the Mac (see Limitations) |

### Performance (Phase 10)

Measured in Linux Chromium in a 2-vCPU container with the default 1.16 layout (timeline, Navigator and Structure Lines
shown). This is not a measurement on a Mac. Details are in `TEST-RESULTS-1.16.0.md`.

* **No regression against 1.15.4.** At 20, 120 and 250 pages, opening and typing are as fast or faster than 1.15.4 on
  the same probe and host.
* **Word clicks.** These had regressed by about 100 ms during development (R-14). The cause was found with CPU
  profiles and fixed before release.
* **Remaining cost.** Long-document cost is dominated by re-rendering the editor's page list on each keystroke, as in
  1.15.4. Rendering only the pages near the viewport would be the next step (listed in the limitations).

## 3. Verification summary

* **Release suites.** 20 release suites passed on the exact 1.16.0 payload, including the new **workspace** suite
  (22 checks). story and words needed re-runs with budgets scaled 1.5× after the build host slowed down. This is
  calibrated against 1.15.4 on the same host, which also misses the default word-click budget there; see
  `TEST-RESULTS-1.16.0.md`.
* **Real Electron 44.7.0 on Linux.** Lifecycle 13/13, save scenarios 43/43, and editor ↔ PDF parity passed.
* **macOS.** After the image was built, it was verified on the user's Mac (macOS 27.0.1, Apple Silicon): checksum,
  `hdiutil verify`, Info.plist 1.16.0, arm64, `codesign --verify --deep --strict` and the tested `app.asar` hash. The
  record is in `verification/evidence-1.16.0/macos/`. The app itself was not launched there.
* **Not done.** There is no Developer ID signing and no notarization.
