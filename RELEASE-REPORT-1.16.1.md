# DraftCraft Pro 1.16.1 — release report

1.16.1 completes the five items left open in 1.16.0's limitations. It was built on the existing project (Electron
44.7.0, React, TypeScript), and no user data is migrated or discarded.

| Document | Contents |
|---|---|
| `CHANGELOG-1.16.1.md` | What changed and why, with root causes |
| `TEST-RESULTS-1.16.1.md` | Automated results for the exact 1.16.1 payload, and the before/after performance numbers |
| `LIMITATIONS-1.16.1.md` | What remains, and what was not verified |
| `FEATURES-1.16.1.md`, `FINAL-DRAFT-MATRIX-1.16.1.md` | Feature list and Final Draft 13 comparison (changed rows marked ▲) |
| `Build-and-Install-1.16.1.md` | Installing, Developer ID signing, building and reproducing the tests |
| `Developer-ID/` (on the disk image) | `Sign-and-Notarize.command`, `entitlements.plist`, `README.md` |

## The five items

| # | Item (from 1.16.0's limitations) | 1.16.1 | Verified by |
|---|---|---|---|
| 1 | Long scripts: typing at 250 pages was as slow as 1.15.4 | Typing and Return are several times faster (table below). Pagination is incremental, unchanged pages are not redrawn, the Navigator updates in the background, and split paragraphs are positioned in one pass. | `layout-incremental.test.ts` (incremental pagination equals a full layout after random edits, including page locks); all editor suites; scaling and worst-case probes |
| 2 | Navigator columns could not be resized | A Scenes table with resizable (drag, keys, double-click), sortable columns and in-place headings. Widths and columns are saved. | workspace "Navigator scene table (#27)" |
| 3 | Structure Lines had no width or opacity settings | Structure Line Settings: width, opacity, levels and level colours. They are reachable from the View menu, the toolbar and right-click, and print uses them. | workspace "Structure Line settings (#28)"; `workspace-settings.test.ts` |
| 4 | The toolbar could not hide whole groups | Groups are hidden and shown from the toolbar menu, the Customize sheet and View › Toolbar Groups. | workspace "toolbar groups (#29)" |
| 5 | No Developer ID signature, not notarized | `Developer-ID/Sign-and-Notarize.command` signs, notarizes, staples and checks the app and a new disk image on the owner's Mac, with the owner's certificate. | `developer-id-sign.test.cjs` (stand-in tools). It **cannot** be run here: it needs the owner's Apple Developer account. The delivered image remains ad-hoc signed. |

## Performance

All values are p50 / p95, with both versions measured by the same probes in the same 2-vCPU Linux container (not a
Mac). The full table is in `TEST-RESULTS-1.16.1.md`.

| | 1.16.0 | 1.16.1 |
|---|---|---|
| Typing, 250 dense pages (timeline, Navigator, Structure Lines shown) | 141 / 202 ms | 57 / 108 ms (42 / 88 ms in a second run) |
| Return near the start, 250 pages | 248 / 364 ms | 88 / 112 ms |
| Worst case: Return near the start of 223 identical pages, where every later page moves (key handler) | 372 / 436 ms | 110 / 131 ms |

## Defects found and fixed during the work

* **IME composition.** Text composed with an input method could be replaced by the previous text while the layout
  waited (found by the smart-save suite). The page cache now also compares the live paragraphs.
* **Toolbar keys.** Repeated spaces shared a key, so stale spaces could stay after a change. Items are now keyed by
  their position.
* **Narrow Navigator.** The Scenes controls overflowed a 220 px Navigator; the filter field now shrinks.
* **Split speeches (from the new positioning).** A split speech could keep a stale, clamped position on a page that
  was not being drawn (cross-paragraph D-09). Positions are now refreshed on font load, before paint on scroll, and
  in idle time.
* **Word popup and SmartType (from the new positioning).** Background positioning fired scroll events that closed
  them (words suite). Popups now ignore scrolling inside fields other than the one being edited.

## Verification summary

* **Release suites.** All 20 passed on the exact 1.16.1 payload, at the default latency budgets. Unit tests: 258.
  The workspace suite has 26 checks, 4 of them new.
* **Real Electron 44.7.0 on Linux.** Lifecycle 13/13, save scenarios 43/43, and editor ↔ PDF parity passed.
* **Earlier full runs.** Two earlier full runs each found a defect in the new positioning code: the D-09 split speech,
  and the word popup closing. Both were fixed, and every run is kept with the evidence.
* **macOS.**
  * **The image.** It reached the user's Mac intact (SHA-256 matches). The Mac's screen was locked during delivery,
    so the read-only native checks (`hdiutil verify`, `codesign`) were not run there; the check kit for them is
    delivered with the image. On Linux, the image builder's own verifiers passed: UDIF/HFS checksums, two independent
    extractions identical to the staged volume, Mach-O signatures and seals, and the tested `app.asar` bytes.
  * **The app.** It has not been launched on a Mac.
* **Not done.** The delivered image is **ad-hoc signed and not notarized**. Developer ID signing needs the owner's
  Apple account; the script for it is in `Developer-ID/`.
