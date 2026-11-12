# DraftCraft Pro 1.18.0 — release report

1.18.0 adds a Start Window inspired by Final Draft's, with recent projects and File › Open Recent, and an emoji picker
built into the app. It also fixes the Getting Started wrapping found by the 1.17.0 Mac check. The request is
`FEATURE-PROMPT-1.18.0.md`. What 1.17.0 had before each change is recorded with file and line in `AUDIT-1.18.0.md`.

| Document | Contents |
|---|---|
| `CHANGELOG-1.18.0.md` | Each change: what was missing or its root cause, the change, and its tests |
| `TEST-RESULTS-1.18.0.md` | Results for the exact 1.18.0 payload |
| `LIMITATIONS-1.18.0.md` | What remains, and what was not verified |
| `FEATURES-1.18.0.md` | The feature list |
| `FINAL-DRAFT-MATRIX-1.18.0.md` | The Final Draft 13 comparison with honest statuses |
| `Build-and-Install-1.18.0.md` | Installing, Developer ID signing, building, testing and the Mac checklist |
| `MAC-CHECK-1.18.0.md` (next to the image) | The read-only image check and the native self-test on a Mac |

## Status by item

| # | Item | Status |
|---|---|---|
| 1 | Start Window at launch: Create (New Screenplay and six formats, More Templates…), Open…, Recent Projects (filter, Show in Finder, Remove, Clear, missing files), Learn, Continue, the launch preference | **Verified**: unit tests, browser check #41, 6 real-Electron scenarios, Linux self-test |
| 2 | File › Open Recent (and Clear Menu), File › Start Window…, macOS recent documents | **Verified** in real Electron; the macOS Dock list itself is not checked automatically |
| 3 | Emoji picker: Insert › Emoji… (⌃⌘E), toolbar, right-click; search, categories, Recently Used, keyboard, Shift-click; one Undo | **Verified**: unit tests, browser check #40, Linux self-test with real key events |
| 4 | Getting Started wraps to the window | **Verified** (a unit test checks every section) |
| — | Found in testing: `recent-projects.cjs` missing from the app's file list | **Fixed** before any image was built, with a test that checks the list |

## Verification summary

* **Release suites.** All 20 passed on the exact 1.18.0 payload, in one full run at the default budgets. That
  includes 288 unit tests and 39 workspace checks.
* **Real Electron 44.7.0 on Linux.** The new Start Window scenarios passed 6/6, lifecycle 13/13 and save scenarios
  43/43. Editor ↔ PDF parity passed.
* **Native self-test in Linux Electron.** 15 of 16 steps passed; full screen cannot run under Xvfb.
* **macOS.** The read-only image check and the native self-test run on the Mac after the image is built
  (`MAC-CHECK-1.18.0.md`).
* **Not done.** The image is **ad-hoc signed and not notarized**. Developer ID signing needs the owner's Apple
  account (`Developer-ID/`).
