# DraftCraft Pro 1.16.1 — automated test results

## Payload and environment

* **Payload.** All tests ran on the staged payload that went into the DMG: `release-1.16.1/stage/app`. Its content
  digest is `1103fe4d9983c643…` (the full value is in `final-tests.json`).
* **Renderer suites.** Playwright with Chromium 151 on Linux, in a 2-vCPU container.
* **Desktop checks.** Real Electron 44.7.0 on Linux under Xvfb.
* **Not tested on macOS.** See `LIMITATIONS-1.16.1.md`.

The evidence is in `verification/evidence-1.16.1/`. On the disk image it is under `Verification/evidence-1.16.1/`.

## Release suites (`verification/run-release-tests.py`): 20 of 20 passed

All 20 suites passed at the **default** latency budgets: typing p95 250 ms, cached word click 500 ms, save fill
600 ms. The 1.5× scaling used for 1.16.0 was not needed.

| Suite | Result | Interaction groups | Measurements (1.16.1) |
|---|---|---|---|
| models (unit tests) | pass | 258 tests (248 in 1.16.0, plus 10 new) | — |
| story | pass | 15 | 250 pages, typing p50/p95 39/76 ms |
| editor | pass | 14 | — |
| shortcuts | pass | 14 | 250 pages, shortcut p50/p95 65/98 ms |
| words | pass | 13 | 250 pages, cached word click 233–320 ms |
| spelling | pass | 14 | 10/50/120/250 pages |
| smart-save | pass | 10 | 222 pages, typing p50/p95 54/89 ms |
| caret | pass | 12 | 222 pages, typing p50/p95 21/127 ms |
| formats | pass | 18 | 167 pages, typing p50/p95 19/43 ms |
| punctuation | pass | 18 | 223 pages, Return p50/p95 133/211 ms |
| automatic-formatting | pass | 25 | 222 pages, 120 characters typed in 2989 ms in total |
| table-read | pass | 18 | 222 pages |
| production | pass | 14 | — |
| collaboration | pass | 1 | — |
| interchange | pass | 8 | — |
| repair | pass | 11 | — |
| cross-paragraph | pass | 14 | — |
| templates | pass | 13 | — |
| enter-flow | pass | 69 checks | — |
| workspace | pass | 26 (22 in 1.16.0, plus 4 new) | — |

### New tests

* **`layout-incremental.test.ts`** (3 tests).
  * Random scripts with dual dialogue, long speeches split with MORE/CONT'D, acts, transitions, page locks and
    A-pages receive hundreds of random edits. After every edit, the incremental layout must equal a full layout field
    by field: pages, labels, fragments and the paragraph-to-page map.
  * Earlier results are never modified.
  * Most runs resume, and many stop early by reusing the previous tail.
* **`workspace-settings.test.ts`** (3 tests).
  * Structure styles: hidden levels, and level colours that replace only palette colours.
  * Print and PDF use the width, opacity, levels and colours; the defaults are unchanged.
  * Workspace preferences: defaults, limits, and loading 1.16.0 preference files.
* **`developer-id-sign.test.cjs`** (4 tests). The signing script runs against stand-in tools:
  * It signs inside out, with the hardened runtime, timestamps and entitlements on executables only.
  * It notarizes, staples and checks the app and the disk image with Gatekeeper.
  * It refuses when there is no certificate, several certificates, a missing profile, a changed app, or no macOS.
  * A rejected submission fetches Apple's report and staples nothing.
  * `--check` signs nothing.
  * **On the real volume.** The same flow was also run on a copy of the real 1.16.1 volume, using the real `file(1)`
    for Mach-O detection (`developer-id-flow-on-real-volume.txt`):
    * the manifest check passes
    * all 13 Mach-O files are found and signed before their bundles, with entitlements on the executables only
    * then the frameworks, the helper apps and the app are signed
* **Workspace suite, four new checks.**
  * **Navigator scene table (#27).** Dragging a column edge: the column follows the pointer and keeps its width, and
    the Navigator keeps its own width. The keyboard moves the edge by 10 or 40 px, with minimum and maximum widths.
    Double-click restores the default. Headers sort both ways. Widths and the view survive a reload. Hidden columns
    leave the table. A heading can be edited in place, and a row goes to its scene.
  * **Structure Line settings (#28).** The width and opacity apply at once: scene lines are drawn at ⅔ of the width
    and 60 % of the opacity. A level can be hidden, and a level colour replaces the palette. The text never moves.
    The settings survive a reload. They open from the toolbar, by right-clicking a line, by right-clicking text, and
    from the View menu command. Escape, Automatic, Restore Defaults and the per-screenplay switch all work.
  * **Toolbar groups (#29).** Groups are hidden from the toolbar menu, View › Toolbar Groups and the Customize sheet,
    and survive a reload. There are no leading or doubled gaps. Reset shows every group.
  * **Deferred positioning.** In a long script, after a change that moves every page, split paragraphs on far pages
    show their own lines once they are scrolled into view.

### Earlier full runs on 1.16.1 candidates

Every full run is kept in `release-suites/`. The first two each found a defect, which was fixed before the final
payload was built.

| Log | Result | Cause and fix |
|---|---|---|
| `run-1-cross-paragraph-D09.log` | 19/20: cross-paragraph D-09 failed | A split speech on page 3 kept a scroll position clamped while its page was still settling. Positions are now refreshed when fonts load, before paint when a scroll brings the page near, and in idle time. |
| `run-2-words-popup.log` | 18/20: words and smart-save failed | **words:** fields positioned in the background fired scroll events, which closed the word popup. This reproduced twice on that payload. Popups now ignore scrolls inside fields other than the one being edited. **smart-save:** the first check timed out once under parallel load. It passed in 2 of 2 standalone re-runs on the same payload, and in the final run. |
| `run-3-final.log` | **20/20** | The final payload. |

## Real Electron 44.7.0 (Linux, Xvfb), final payload

| Check | Result |
|---|---|
| Lifecycle scenarios (`lifecycle-scenarios.cjs`) | **13/13** |
| Save scenarios (`save-scenarios.cjs`, on `app.asar`) | **43/43** |
| Editor ↔ PDF parity (`pdf-parity.cjs`) | **pass**: 7 pages, 18 generated labels agree page by page |

## Performance: 1.16.0 and 1.16.1 on the same host, same probes

These values come from a 2-vCPU Linux container; they are not measurements on a Mac. Latency is measured inside the
page, from the key to two animation frames later. The 1.16.0 payload is the released `release-1.16.0/stage/app`.

### Scaling probe (`performance-scale-browser.cjs`)

The probe uses the default 1.16 layout: timeline, Navigator and Structure Lines shown, with a dense script. Values
are p50 / p95 in ms. "Return (start)" is Return near the start of the script, where every later page moves.

| Pages | Version | Typing | Return (middle) | Return (start) | Element change | Caret → last page | Heap after GC |
|---|---|---|---|---|---|---|---|
| 20 | 1.16.0 | 32 / 49 | 49 / 129 | 52 / 77 | 20 | 13 | 31 MB |
| 20 | **1.16.1** | **25 / 43** | **37 / 53** | **34 / 41** | 18 | 12 | 30 MB |
| 120 | 1.16.0 | 72 / 134 | 112 / 142 | 132 / 169 | 65 | 36 | 82 MB |
| 120 | **1.16.1** | **32 / 54** | **47 / 82** | **47 / 57** | 29 | 17 | 71 MB |
| 250 | 1.16.0 | 141 / 202 | 213 / 243 | 248 / 364 | 204 | 41 | 147 MB |
| 250 | **1.16.1** | **57 / 108** | **82 / 127** | **88 / 112** | 52 | 25 | 123 MB |

Values vary between runs. An earlier 1.16.1 run at 250 pages measured typing at 42 / 88 ms, and an earlier 1.16.0
run measured 140 / 263 ms. Both are in `performance-scale.log` and `performance-scale-1.16.0.log`.

### Worst case (`performance-repagination-browser.cjs`)

The script is 223 pages of identical Action paragraphs, and Return is pressed twelve times near the start. Every later
page break moves, so no page can be reused.

| Version | Key handler p50 / p95 | To the second frame p50 / p95 |
|---|---|---|
| 1.16.0 (two runs) | 372 / 436 and 367 / 526 ms | 435 / 499 and 427 / 590 ms |
| **1.16.1** (two runs) | **110 / 131 and 111 / 193 ms** | **124 / 178 and 124 / 211 ms** |

## Type check

`tsc --noEmit` against the third-party baseline shows **no new errors**.
