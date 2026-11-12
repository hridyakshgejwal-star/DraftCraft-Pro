# DraftCraft Pro 1.16.2 — automated test results

## Payload and environment

* **Payload.** The tests ran on the staged payload that went into the DMG: `release-1.16.2/stage/app`. Its content
  digest is `0d5683a12dcdfa6e…`; the full value is in `final-tests.json`.
* **Renderer suites.** Run with Playwright and Chromium 151 on Linux, in a 2-vCPU container.
* **Desktop checks.** Run in real Electron 44.7.0 on Linux under Xvfb.
* **Not tested on macOS.** See `LIMITATIONS-1.16.2.md`.

Evidence is in `verification/evidence-1.16.2/`. On the disk image it is under `Verification/evidence-1.16.2/`.

## The fix: Customize Toolbar drag and drop

The new workspace check is "toolbar customization by real drag and drop". It uses real pointer drags, not the Move
buttons, and checks the following:

* an item dragged from the list lands in the toolbar where it is dropped (before Undo)
* the list marks that item as being in the toolbar
* an item can be reordered by dragging it to the end
* dragging an item out removes it
* the same space can be dragged in twice
* dragging the Default Set restores the default toolbar

| Build | Result | Log |
|---|---|---|
| 1.16.1 (delivered before) | **fails**: "dragging from the list adds the item" (nothing was added) | `toolbar-drag-check-1.16.1.log` |
| 1.16.2 | **passes** | `toolbar-drag-check-1.16.2.log` |

## Release suites (`verification/run-release-tests.py`): 20 of 20 passed

All 20 suites passed in a single full run on this payload, with no re-runs. They ran at the default latency
budgets:

* typing p95: 250 ms
* cached word click: 500 ms
* save fill: 600 ms

| Suite | Result | Interaction groups | Measurements |
|---|---|---|---|
| models (unit tests) | pass | 258 tests | — |
| story | pass | 15 | 250 pages, typing p50/p95 43/89 ms |
| editor | pass | 14 | — |
| shortcuts | pass | 14 | 250 pages, shortcut p50/p95 53/81 ms |
| words | pass | 13 | 250 pages, cached word click 210–271 ms |
| spelling | pass | 14 | 10/50/120/250 pages |
| smart-save | pass | 10 | 222 pages, typing p50/p95 52/125 ms |
| caret | pass | 12 | 222 pages, typing p50/p95 20/175 ms |
| formats | pass | 18 | 167 pages, typing p50/p95 17/37 ms |
| punctuation | pass | 18 | 223 pages, Return p50/p95 132/201 ms |
| automatic-formatting | pass | 25 | 222 pages |
| table-read | pass | 18 | 222 pages |
| production | pass | 14 | — |
| collaboration | pass | 1 | — |
| interchange | pass | 8 | — |
| repair | pass | 11 | — |
| cross-paragraph | pass | 14 | — |
| templates | pass | 13 | — |
| enter-flow | pass | 69 checks | — |
| workspace | pass | **27** (26 in 1.16.1, plus the drag-and-drop check) | — |

## Real Electron 44.7.0 (Linux, Xvfb)

| Check | Result |
|---|---|
| Lifecycle scenarios (`lifecycle-scenarios.cjs`) | **13/13** |
| Save scenarios (`save-scenarios.cjs`, on `app.asar`) | **43/43** |
| Editor ↔ PDF parity (`pdf-parity.cjs`) | **pass**: 7 pages, 18 generated labels agree page by page |

## Performance

The editor code is unchanged from 1.16.1; only `src/workspace/Toolbar.tsx` changed. The before/after measurements
(1.16.0 against 1.16.1, same host, same probes) are in `TEST-RESULTS-1.16.1.md` and `evidence-1.16.1/`. The suites
above measure about the same as 1.16.1.

## Type check

`tsc --noEmit` against the third-party baseline shows **no new errors**.
