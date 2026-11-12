# DraftCraft Pro 1.17.0 — automated test results

## Payload and environment

* **Payload.** The tests ran on the staged payload that went into the DMG: `release-1.17.0/stage/app`. Its content
  digest is `4641a87391c53786…` (full value in `final-tests.json`), and its `app.asar` header digest is
  `b003f70d4c8d0bc8…`.
* **Renderer suites.** Playwright with Chromium on Linux, in a 2-vCPU container (Intel Xeon, 2.1 GHz).
* **Desktop checks.** Real Electron 44.7.0 on Linux under Xvfb.
* **macOS.** The Mac checks of this image run after it is built. Their record is `MAC-CHECK-1.17.0.md`, delivered next
  to the image. See also `LIMITATIONS-1.17.0.md`.

Evidence is in `verification/evidence-1.17.0/`, and on the disk image under `Verification/evidence-1.17.0/`.

## Release suites (`verification/run-release-tests.py`): 20 of 20 passed

All 20 suites passed in one full run on this payload, at the default latency budgets:

* typing p95: 250 ms
* cached word click: 500 ms
* save fill: 600 ms

| Suite | Result | Checks | Measurements (250-page or large documents) |
|---|---|---|---|
| models (unit tests) | pass | **278 tests** (258 in 1.16.2) | — |
| story | pass | 15 | 250 pages: typing p50/p95 **27/62 ms** (1.16.2: 43/89) |
| editor | pass | 14 | — |
| shortcuts | pass | 14 | 250 pages: shortcut p50/p95 44/80 ms |
| words | pass | 13 | 250 pages: cached word click 197–409 ms |
| spelling | pass | 16 | 10–250 pages: key events p95 19–40 ms (to 120 pages) |
| smart-save | pass | 11 | 222 pages: typing p50/p95 **31/73 ms** (1.16.2: 52/125) |
| caret | pass | 12 | 222 pages: typing p50/p95 19/91 ms |
| formats | pass | 18 | 167 pages: typing p50/p95 15/40 ms |
| punctuation | pass | 18 | 223 pages: Return p50/p95 **46/74 ms** (1.16.2: 132/201) |
| automatic-formatting | pass | 25 | 222 pages |
| table-read | pass | 18 | 222 pages |
| production | pass | 14 | — |
| collaboration | pass | 1 | — |
| interchange | pass | 9 | — |
| repair | pass | 11 | — |
| cross-paragraph | pass | 14 | — |
| templates | pass | 14 | — |
| enter-flow | pass | 69 checks | — |
| workspace | pass | **37** (27 in 1.16.2) | — |

**New and changed checks in 1.17.0.**

* **Unit tests.** `features-1170.test.ts`, `help-1170.test.ts`, `structure-segments-equivalence.test.ts`,
  `dictation-helper.test.cjs`, `self-test-fixtures.test.cjs`, three relaunch tests in `project-files.test.cjs`, and the
  updated `workspace-settings.test.ts`.
* **Workspace checks #30 to #39.**
  * #30 Navigator: text size, column reorder by real drag, sort kept, in-place editing.
  * #31 Status bar.
  * #32 Auto-hide right scene numbers.
  * #33 Cast List.
  * #34 Emoji.
  * #35 Outline nesting and ripple, with real drags.
  * #36 Beat Board, with a real drag committing once.
  * #37 Accessibility.
  * #38 Right-to-left text.
  * #39 Getting Started and Idea to Draft.
* **Other suites.**
  * Writing suite: custom autocorrect and languages.
  * Templates suite: the Netflix-style template.
  * Production codecs: emoji round trip.
  * Smart-save suite: the tutorial switching projects through the real save coordinator.

**Two test selectors were updated** for 1.17.0 UI changes:

* **Saved Navigator views.** They are now tabs (`role=tab`) in the production suite.
* **Scene heading editor.** The Navigator's editor is selected by its exact name, because script fields are now named
  "Scene Heading" for VoiceOver.

**A first full run found one product issue, fixed before the final run.** An added `aria-label` had renamed the
spelling-language list. The fix restored its name, "Select Spelling Language".

## Real Electron 44.7.0 (Linux, Xvfb)

| Check | Result |
|---|---|
| Lifecycle scenarios (`lifecycle-scenarios.cjs`) | **13/13** |
| Save scenarios (`save-scenarios.cjs`, on `app.asar`) | **43/43** |
| Editor ↔ PDF parity (`pdf-parity.cjs`), now with emoji in the script | **pass**: 7 pages, 16 generated labels agree page by page |
| Native self-test (`desktop/self-test.cjs`) in Linux Electron | 10 of 11 steps pass. Full screen cannot pass under Xvfb, which has no window manager. Linux has no macOS voices, Speech helper or system dictionary, and the self-test records that. |

## Long scripts: Return at the start (item 14)

**Same host, same probe** (`verification/performance-scale-browser.cjs`, keydown to the second animation frame),
1.16.2 payload against 1.17.0 payload:

| Script | Return at the start, p50 / p95 | Return in the middle, p50 / p95 | Typing, p50 / p95 |
|---|---|---|---|
| 120 pages | 55 / 64 → **37 / 45 ms** | 44 / 73 → 34 / 52 ms | 27 / 45 → 28 / 35 ms |
| 250 pages | 69 / 72 → **53 / 72 ms** | 68 / 110 → 53 / 81 ms | 45 / 107 → 38 / 64 ms |

**Native self-test in Linux Electron** (real key events, 10 Returns after 2 warm-ups):

| 250-page script | keydown → paint (Event Timing), p50 / p95 | keydown → second frame, p50 / p95 |
|---|---|---|
| Mixed, dialogue-heavy (5,462 elements, 256 pages) | 48–56 / 72–80 ms | 54–65 / 70–88 ms |
| Uniform worst case (every page moves) | 56–64 / 80–88 ms | 52–59 / 80–88 ms |

The ranges cover one run on the final payload and earlier runs of the same editor code. **The "under 50 ms" target
is not met in this container.** The Mac numbers are in
`MAC-CHECK-1.17.0.md`.

## Type check

`tsc --noEmit` against the third-party baseline shows **no new errors**.
