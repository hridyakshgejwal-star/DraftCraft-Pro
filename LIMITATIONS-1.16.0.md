# DraftCraft Pro 1.16.0 — known limitations

## How this build was verified

* **Automated tests.** All 20 release suites passed on the exact 1.16.0 payload (headless Chromium on Linux). So did
  the real-Electron 44.7.0 lifecycle and save scenarios (Linux, Xvfb). Details are in `TEST-RESULTS-1.16.0.md`.
* **macOS.** The 1.16.0 disk image was verified on the user's Mac: checksum, `hdiutil verify`, Info.plist, arm64,
  `codesign --verify --deep --strict`, the installer manifest, and the `app.asar` hash of the tested payload. The app
  itself has **not** been launched on a Mac yet. Everything that only exists on macOS is
  **implemented but not verified**:
  * traffic lights and the hidden-inset title bar
  * document tabs and the tab-related Window menu items
  * full screen
  * native menu check marks
  * the dictation helper
  * premium speech voices
* **Signing.** The app is ad-hoc signed. It is **not** Developer ID signed and **not** notarized, because no Apple
  Developer credentials are available. Gatekeeper will reject it until it is opened with *Open Anyway*, or installed
  with `Install-DraftCraft.command`.
* **Performance.** Performance numbers come from a 2-vCPU Linux container and include automation overhead. They are not
  measurements on an Apple Silicon Mac.

## Features with remaining scope

| Area | Limitation |
|---|---|
| Toolbar | There is no per-section (group) hide toggle; the whole toolbar can be hidden and individual items removed. Drag-and-drop in the Customize sheet is implemented, but the automated test uses the equivalent Move buttons. |
| Timeline | These are implemented but have no direct automated test: lane colour, reorder and remove; marker colour; copy/paste; Fit Selection; the remembered scroll position; the target-length line; trackpad panning. Scene numbers in the Script lane use production numbers when present, otherwise the scene's position. |
| Timeline ↔ script | Moving an outline element never moves script text (by design). Written scenes move only through the confirmed **Move Scene** step, Index Cards, Scene View or the Navigator. |
| Beat Board | Grouping is by act only (Arrange by Act); sequences are planned on the timeline. Distribute across/down is implemented but has no direct test. A Beat Board drag still commits on every pointer move (one Undo step, but more saves while dragging). |
| Navigator | The Scenes view is a card list: columns can be shown, hidden and sorted, but not resized. In-place editing covers scene headings only. |
| Structure Lines | Colours come from the timeline element or beat. There is no separate colour picker or width/opacity setting for the lines. |
| Speed / Normal View | Page numbers shown in these views are display-only; printing and the timeline always use Page View pagination. |
| Saving | A project renamed or moved while open is followed by file identity during the session; that identity is not remembered across a relaunch. |
| Google Drive PDF export | Pre-existing: this path uses the older jsPDF engine, which still draws a simplified structure line, and the jspdf module is not bundled in this offline build, so the path is unavailable (as in 1.15.4). Print/PDF export (the main path) draws the real Structure Lines. |
| Collaboration | Works through DraftCraft's own relay on a local network. Hosting on the internet needs a WSS/HTTPS server that the user runs. Final Draft's cloud service is not available to third-party apps. |
| Table Read | Uses the speech engines present on the computer; premium macOS voices were not tested. |
| Long scripts | At 250 dense pages, typing takes about 170–190 ms per key at p50 in the 2-vCPU test container, the same as 1.15.4. The editor rebuilds its page list on each keystroke, and rows are cached but still compared. Rendering only the pages near the viewport (virtualization) is the next step; it was not attempted in 1.16 because of the risk to caret and selection behaviour. An Apple Silicon Mac is expected to be several times faster, but this was not measured. |
| Next/Previous Bookmark | Searches from the caret's element. If the caret is in a field outside the script, it searches from the last bookmark visited. |

## Phase 9 items that were already fixed in 1.15.x

These items still have their regression suites; nothing new was found in 1.16:

* margins and templates
* the close dialog
* saving
* Beat Board card resizing
* flicker, caret and shifting text
* auto-formatting

The 1.16 audit found and fixed the repairs R-01 to R-15 listed in `CHANGELOG-1.16.0.md`.

**Phase 9 #14 (installation and launch).** In the earlier report, "unable to open the file" was caused by Gatekeeper
rejecting an ad-hoc-signed app downloaded with a quarantine flag. The DMG's `Install-DraftCraft.command` installs it
without changing system settings: it verifies every file, re-signs the copy locally and removes quarantine from the
installed copy only. 1.16.0 has not yet been installed on the user's Mac. Installing or replacing
`/Applications/DraftCraft Pro.app` was left for the user to run or approve.
