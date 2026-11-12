# DraftCraft Pro 1.18.0 — automated test results

## Payload and environment

* **Payload.** The tests ran on the staged payload that went into the DMG: `release-1.18.0/stage/app`. Its content
  digest is `37a369adc9943baa…` (full value in `final-tests.json`), and its `app.asar` header digest is
  `5c5ef3c83e5f800c…`.
* **Renderer suites.** Playwright with Chromium on Linux, in a 2-vCPU container (Intel Xeon, 2.1 GHz).
* **Desktop checks.** Real Electron 44.7.0 on Linux under Xvfb.
* **macOS.** The Mac checks of this image run after it is built. Their record is `MAC-CHECK-1.18.0.md`, delivered next
  to the image. See also `LIMITATIONS-1.18.0.md`.

Evidence is in `verification/evidence-1.18.0/`, and on the disk image under `Verification/evidence-1.18.0/`.

## Release suites (`verification/run-release-tests.py`): 20 of 20 passed

All 20 suites passed in one full run on this payload, at the default latency budgets:

* typing p95: 250 ms
* cached word click: 500 ms
* save fill: 600 ms

| Suite | Result | Checks | Measurements (250-page or large documents) |
|---|---|---|---|
| models (unit tests) | pass | **288 tests** (278 in 1.17.0) | — |
| story | pass | 15 | 250 pages: typing p50/p95 34/55 ms |
| editor | pass | 14 | — |
| shortcuts | pass | 14 | 250 pages: shortcut p50/p95 57/85 ms |
| words | pass | 13 | 250 pages: cached word click 179–344 ms |
| spelling | pass | 16 | 10–250 pages: key events p95 23–56 ms |
| smart-save | pass | 11 | 222 pages: typing p50/p95 35/92 ms |
| caret | pass | 12 | 222 pages: typing p50/p95 20/46 ms |
| formats | pass | 18 | 167 pages: typing p50/p95 15/35 ms |
| punctuation | pass | 18 | 223 pages: Return p50/p95 50/85 ms (punctuation off: 46/80) |
| automatic-formatting | pass | 25 | 222 pages |
| table-read | pass | 18 | 222 pages |
| production | pass | 14 | — |
| collaboration | pass | 1 | — |
| interchange | pass | 9 | — |
| repair | pass | 11 | — |
| cross-paragraph | pass | 14 | — |
| templates | pass | 14 | — |
| enter-flow | pass | 69 checks | — |
| workspace | pass | **39** (37 in 1.17.0) | — |

The latency figures are from a shared 2-vCPU container with automation overhead. They move by roughly ±10–20 ms
between runs, and 1.18.0 does not change the typing or pagination paths.

**New and changed checks in 1.18.0.**

* **Unit tests.**
  * `features-1180.test.ts`:
    * emoji data (1,427 entries, no duplicates, every entry a real emoji, every category filled);
    * search ranking;
    * the recently used list, including damaged and blocked storage;
    * Getting Started reflow, with no mid-sentence break in any guide section;
    * the Start Window formats and dates, and the home folder shown as `~`;
    * a toolbar on the 1.17.0 default gaining Emoji.
  * `recent-projects.test.cjs`:
    * order, one entry per file, and the limit of 20;
    * ids only;
    * missing files;
    * damaged files;
    * the 0600 file mode, with no temporary files left;
    * the launch preference.
  * `desktop-stage-list.test.cjs`: every module the main process loads is on both app file lists.
* **Workspace checks.**
  * **#40 Emoji picker.** It covers:
    * the toolbar button;
    * search;
    * the keyboard;
    * insertion at the caret;
    * focus going back to the field;
    * Undo;
    * Recently Used;
    * the Tab trap;
    * Shift-click;
    * Escape;
    * Insert Emoji… from the right-click menu;
    * a Beat Board title.
  * **#41 Start Window.** It covers:
    * recent rows;
    * the missing-file message;
    * the filter;
    * Remove, Show in Finder and open by id;
    * the launch checkbox;
    * Escape and Continue;
    * the Television Pilot tile;
    * What's New;
    * Idea to Draft;
    * New Screenplay.

## Real Electron 44.7.0 (Linux, Xvfb)

| Check | Result |
|---|---|
| Start Window scenarios (`start-window-scenarios.cjs`, new) | **6/6**: first launch (version, focus, six formats, empty list, Escape); Open… records the project with a private file and updates File › Open Recent; a recent project opens, a missing one is marked and removed, the launch preference is kept across a relaunch and File › Start Window… still opens it; a launch with a file skips the window; File › Open Recent opens a project and Clear Menu empties it; unsaved changes are resolved (Cancel keeps text and window, Don't Save creates the Television Pilot) |
| Lifecycle scenarios (`lifecycle-scenarios.cjs`) | **13/13** |
| Save scenarios (`save-scenarios.cjs`, on `app.asar`) | **43/43** |
| Editor ↔ PDF parity (`pdf-parity.cjs`, with emoji in the script) | **pass**: 7 pages, 16 generated labels agree page by page |
| Native self-test (`desktop/self-test.cjs`) in Linux Electron | **15 of 16 steps pass**, including the new `start-window`, `recent-projects` and `emoji-picker` steps. Full screen cannot pass under Xvfb, which has no window manager. Linux has no macOS voices, Speech helper or system dictionary, and the self-test records that. |

The other scenario sets start with the Start Window switched off (as if the writer had unticked it), so they see the
editor exactly as before. The Start Window scenarios and the self-test use a fresh profile, where it opens.

**Return latency in the Linux self-test** (real key events, 10 Returns after 2 warm-ups), for reference:

| 250-page script | keydown → paint (Event Timing), p50 / p95 | keydown → second frame, p50 / p95 |
|---|---|---|
| Mixed, dialogue-heavy (5,462 elements, 256 pages) | 56 / 72 ms | 62 / 81 ms |
| Uniform worst case (every page moves) | 56 / 72 ms | 62 / 78 ms |

These are in the range measured for 1.17.0 on the same host (48–64 / 72–88 ms); 1.18.0 does not change this path. The
Mac self-test measures it again (`MAC-CHECK-1.18.0.md`).

## Found during testing and fixed before the final run

* **The packaged app could not start.** `recent-projects.cjs` was missing from the app's file list. The first run of
  the real-Electron checks on a staged app found it: no window opened. It was fixed before any release build, and
  `desktop-stage-list.test.cjs` now guards the list.
* **Three timing problems in the new Electron scenarios.** The Start Window's version, recent list and checkbox load
  a moment after it opens, and the first scenarios read them too early. The scenarios now wait for the loaded state.
  The app now also disables the checkbox until the saved preference has loaded.
* **A toolbar change during the first release run.** Toolbars still on the 1.17.0 default now gain the Emoji button.
  That run was stopped, and every result above comes from the rebuilt payload.

## Type check

`tsc --noEmit` against the third-party baseline shows **no new errors**.
