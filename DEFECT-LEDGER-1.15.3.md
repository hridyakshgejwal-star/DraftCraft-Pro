# DraftCraft Pro 1.15.3 — defect ledger

Scope: the existing Electron 44.7.0 / React / TypeScript application from `DraftCraft-Pro-1_15_2-arm64.dmg`
(SHA-256 `8909652da2a7ea227513929d20618ff0722ca931cfd4aa632a4c45ffb8139343`). Every "before" result
below was produced by running the same test against the **shipped 1.15.2 payload** extracted from that DMG
(`app.asar` SHA-256 `01ee5f7d…5f461f`), and every "after" result against the 1.15.3 payload. Test
environments are Linux: real Electron 44.7.0 under Xvfb for lifecycle and PDF tests, headless Chromium for
renderer suites. **No row has been verified on macOS.**

Priority: **P0** = data loss, crash or a failed save/export; **P1** = materially wrong workflow or layout;
**P2** = degraded experience (performance, cosmetic overlap that hides text counts as P1).

Evidence paths are relative to the source tree; release-run logs are under `verification/evidence-1.15.3/`.

## Closing, saving and recovery

| ID | Pri | Before (1.15.2, reproduced) | Root cause | Fix (1.15.3) | Regression evidence (after) |
|---|---|---|---|---|---|
| D-01 | P0 | Closing **any** document window raised `TypeError: Object has been destroyed at DocumentWindows.remove` in the main process. 5 of the 6 original lifecycle scenarios failed with main-process exceptions: close unmodified window, Cancel/Don't Save, Save + reopen, Quit with two windows, close during autosave (`evidence-1.15.3/baseline-1.15.2/lifecycle-baseline.log`). (Each of those failures is the same uncaught exception, recorded by the harness from the main process.) | The `closed` handler called `win.webContents.id` after Electron had destroyed the window; the registry looked windows up by live `webContents`. | `desktop/window-registry.cjs` records the webContents id at registration, skips destroyed windows in `live()`, `byFile` and `slots`; `main.cjs` removes the record (not the window) on `closed`, recomputes the main window from live windows, and guards state pushes with `isDestroyed()`. | `verification/document-windows.test.cjs` (+2 tests); real-Electron `verification/electron/lifecycle-scenarios.cjs` — all 12 scenarios pass on 1.15.3 (`electron-lifecycle-final.json`); 11 of 12 fail on the shipped payload (`electron-lifecycle-shipped.json`). |
| D-01b | P0 | Shipped payload, real Electron (`electron-lifecycle-shipped.json`): after a renderer crash **no dialog appeared and the window could not be closed** (scenarios time out waiting for the crash dialog / the close); with a hung editor, Close never completed (no watchdog, 40 s timeout); after the last window closed, Dock `activate` created **no window** (the destroyed window was still referenced as the main window, after the D-01 exception). | No `render-process-gone` handling; close transaction waited on a renderer that could never answer; `activate` did not check `isDestroyed()`. | `render-process-gone` → recovery copy written immediately + dialog **Reload Editor / Close Window**; close of a dead renderer preserves recovery then closes; watchdog dialog **Keep Waiting / Close Window** for a hung editor; recovery restored on relaunch; failed write to an unavailable folder offers a rescue location. | Lifecycle scenarios 7–12 (crash → Reload Editor, crash → Close Window keeps a recovery copy, relaunch restores the recovery copy, unavailable-folder rescue, hung-editor watchdog, Dock activate after the last close) pass on 1.15.3. On the shipped payload 11 of the 12 scenarios fail. |
| D-06 | P0 | **Export PDF failed** while the live preview was still rendering: the second print request was rejected with "Another print job is being prepared" and no file was written (reproduced in real Electron on the shipped payload: `electron-pdf-parity-shipped.json`). | `production-print.cjs` rejected any request while a job was busy. | Requests are queued; superseded preview jobs are skipped; exports always run. | `verification/print-queue.test.cjs` (2 tests); real-Electron PDF parity export writes the PDF on 1.15.3. |

## Page layout and pagination

| ID | Pri | Before (1.15.2) | Root cause | Fix (1.15.3) | Regression evidence |
|---|---|---|---|---|---|
| D-02 | P1 | Script notes, scene production comments and review prompts were drawn **over the screenplay text** (scene comment box over the first action paragraph, note pill over the character cue — `evidence-1.15.3/screens/before-annotation-overlap.png`). | Annotations were absolutely positioned inside the text column. | Notes, scene comments and review prompts are small markers in the right page margin; a click opens the comment/note editor below the element. Pagination is unaffected. | Browser geometry check: no margin marker intersects any text box (`cross-paragraph-browser.cjs`, D-02/D-03 group); `screens/after-annotation-margin.png`. |
| D-05 | P1 | The sticky annotations ribbon floated over the pages while scrolling and covered text. | `position: sticky` on the ribbon. | Ribbon scrolls with the document. | Same browser group; screenshots. |
| D-08 | P1 | Alternate-take controls overlapped the dialogue: on the shipped payload the take bar intersects the dialogue text box at 1440 px, and the **Duplicate take** button cannot be clicked because the dialogue textarea receives the click (Playwright: "textarea#input-d intercepts pointer events"). Left scene numbers sat on the bookmark ribbon. | Controls positioned inside the text column. | Compact take bar in the left margin; scene numbers moved clear of the ribbon. | cross-paragraph suite D-08 (fails on 1.15.2, passes on 1.15.3, at 1440 and 1024 px); P-01 clicks the take button through the UI. |
| D-03 | P1 | `(CONT'D)` for a speaker resuming after action existed only as an editor hint below the dialogue — never on the cue line and **never printed**; `(MORE)`/page-break `NAME (CONT'D)` were right-aligned at the dialogue edge. | Editor-only span; labels positioned from the dialogue style. | Layout generates a `resumed` label after the cue name (same speaker, same scene, not dual, not already typed, extensions ignored), honouring `continuations.continued`; `(MORE)` and page-break cue use the Character indent. Shared by editor, preview and PDF. | `repair-1153.test.ts` (3 tests); real-Electron PDF parity confirms every editor `(MORE)`, `(CONT'D)` and resumed `(CONT'D)` appears on the same PDF page. |
| D-04 | P1 | Canvas measurement used the bare font name while the editor and print used a fallback list, so a missing font could measure and display differently (line breaks drift between editor and PDF). | Three different font strings. | `fontStack()` in `src/formats/model.ts` is used by measurement, editor CSS and print. | `repair-1153.test.ts` D-04. |
| D-07 | P1 | A character cue could be left **alone at the bottom of a page** (the `(MORE)` line was reserved even when the whole speech fitted), and a split element could leave a single widow line. Found by the editor-vs-PDF comparison. | MORE reserve always subtracted; no widow rule. | Reserve only when the speech splits; keep-next adds a reserve line for long spoken followers; never leave one line of a split element. | `repair-1153.test.ts` (D-07 orphan and widow tests, text preserved across breaks). |

## Found by the native macOS run (fixed in the final 1.15.3 build)

| ID | Pri | Before | Root cause | Fix | Regression evidence |
|---|---|---|---|---|---|
| D-09 | P1 | When a speech continued on the next page and the break fell on the space between two words, the editor's next page repeated the previous page's last line and hid the fragment's own last line (sample script: page 2 showed "consciousness. Pack the drive. The" again and hid "morning."). The exported PDF was correct. Seen on macOS 27.0.1 (`macos/screens/macos-D09-before.jpg`), then reproduced on Linux; present in 1.15.2. | Layout lines can begin with the space at which a line wrapped; `FragmentTextarea` measured that space to scroll the fragment, and browsers keep that space at the end of the previous visual line, so the scroll position was one line too small. | Scroll to the fragment's first visible character. | cross-paragraph suite D-09 (built-in sample script + a speech split over several pages): fails on 1.15.2 and on the first 1.15.3 build (`7692a51a…`), passes on later builds; on macOS fixed in round 2 (`macos/screens/macos-round2-D09-after.jpg`). |
| E-09 | P2 | Escape after Cmd+A Cmd+A (whole script selected) moved the caret to the end of the script, scrolling away from where the writer was (macOS round 1). The first fix put it at the start of the element instead of where it had been (macOS round 2). | Escape always moved to the selection's focus; the first fix read the caret after the first Cmd+A had already selected the element's text. | The caret is noted before the first Select All press (keyboard and menu command) and restored on Escape. | cross-paragraph group "Escape after Select All…" asserts the original offset; it fails on 1.15.2 and on both earlier 1.15.3 builds (`7692a51a…`, `789a5858…`; logs in `superseded/`) and passes on the final build |

## Known, not fixed

| ID | Pri | Behaviour | Why not changed in 1.15.3 |
|---|---|---|---|
| D-10 | P2 | Undo after typing removes one typed character per Cmd+Z (15 presses for "` Mac test line.`"). Same in 1.15.2 and 1.15.3, on Linux Chromium and on macOS. | The editor's own history is shared with revision marks, Track Changes and assisted edits, and several suites assert its current step boundaries. Grouping typing is a separate change that needs its own tests. |
| D-11 | P3 | macOS only: a double-click in the blank space between a dual-dialogue block and the next element shows the system selection highlight on two other elements above the click, although no element has focus; the next click clears it and no text changes (`macos/screens/macos-round3-dual-gap-dblclick.jpg`). Not reproduced in Linux Chromium (a double-click in the same gap selects nothing). Seen on the second and final 1.15.3 builds (rounds 2 and 3); the first build and 1.15.2 were not checked for it. | The selection comes from macOS's word selection for a click outside any text field, which the Linux test browser does not reproduce; a fix could not be checked without another Mac round. Cosmetic. |

## Editing across elements

Before: on the shipped 1.15.2 renderer the cross-paragraph browser suite passes only its "no renderer errors" group
(13 of 14 groups fail; `release-suites-shipped/cross-paragraph-results/browser.json`). After: all 14 groups pass on 1.15.3.

| ID | Pri | Before (1.15.2) | Fix (1.15.3) | Evidence |
|---|---|---|---|---|
| E-01/E-02 | P1 | Backspace at the start of an element and Delete at its end did nothing (shipped run: both elements unchanged; Delete in an empty element also did nothing) | Exact structural join (`src/editor/crossParagraph.ts`) keeping the first element's identity; one Undo restores both with their ids | `cross-paragraph.test.ts`, browser group E-01/E-02 |
| E-03 | P1 | ArrowRight at the end of an element stayed in that element (shipped run: caret remained at offset 18 of the first element) | Left/Right cross boundaries; Up/Down keep the column using measured lines | browser group E-03 |
| E-04 | P1 | Pasting screenplay text inserted one Action paragraph containing literal line breaks (heading, action and cue all inside it) | Copied elements keep types; screenplay text is parsed into typed elements | browser group E-04 |
| E-05 | P1 | No selection across elements: Shift+Arrow, Shift+Click and drag produced no cross-element selection or highlight | Cross-element selection with highlight from the shared layout lines; type-over, Delete/Backspace, Enter, Cut/Copy; Escape cancels; locked headings protected | browser groups E-05 (2) |
| E-06 | P1 | Select All could select only the current element; there was no way to select the script | Cmd/Ctrl+A selects the element, a second press selects the whole script; Edit ▸ Select All routed to the editor | browser group E-06; story suite capitalization test (single-element Select All) |
| E-07 | P1 | Return inside bold text dropped the inline styles of the new second half (shipped run: second half `runs` undefined) | `enterParagraph` slices runs for both halves | browser group E-07 |
| E-08 | P1 | *Introduced and fixed during this work, before release:* the first join implementation kept the first element even when it was empty, so Delete in an empty Character line pulled the next Action into it and turned it into a character cue (and Backspace after an empty element did the same). Found by the existing spelling suite, whose helper presses Delete through Playwright's `fill('')`. Not present in 1.15.2 (which had no Delete join). | An empty element is removed; the element with text keeps its id, type and runs; the empty element's notes, tags, bookmark and comment move across | `cross-paragraph.test.ts` (empty-element join test); browser group "Delete in an empty element, or Backspace after one, removes only the empty element"; spelling suite |

## Performance

| ID | Pri | Before (1.15.2) | Root cause | Fix (1.15.3) | Evidence |
|---|---|---|---|---|---|
| P-01 | P2 | Typing in a 250-page script with the four story tools enabled: shipped 1.15.2 **failed** the story suite's own 250 ms p95 budget (`baseline-1.15.2/run-shipped.log`: p50 177 ms, p95 349 ms). Every keystroke re-rendered all ~2,100 editor rows. | The editor's row cache evicted entries by comparing compound row keys (`id:page:start`) with paragraph ids, so every edit discarded the whole cache; `reconcileStudio` returned a new `outlineMarkers` array on every edit, defeating the memo on ~500 per-page story panels; whole-script word recount and DOM scans on every keystroke. | Prune the row cache to rows rendered in the latest commit; all handlers in cached rows read live implementations (take buttons were the only direct closure); keep the marker array when no marker changed; cache word counts per paragraph object; reuse unchanged story geometry; skip fragment DOM scans when the caret stays in its fragment. | Same measurement, three alternating runs (`typing-latency-250-pages.txt`); story suite passes its budget on 1.15.3; regression tests for the stale-handler risk (`cross-paragraph-browser.cjs` P-01, which fails when a cached take button keeps a stale closure) and for marker identity / word counts (`repair-1153.test.ts`). CPU profiles before/after in the evidence folder. |

## Corrected 1.15.2 claims

* 1.15.2's matrix listed **Close/Quit transaction — Implemented and verified**. That verification used
  renderer tests with injected dialogs; in real Electron every window close raised D-01. 1.15.3's statuses
  for window lifecycle are based on real Electron runs.
* 1.15.2's matrix listed **Notes/bookmarks/summaries/comments — Implemented and verified**; the overlap of
  notes and comments with script text (D-02) was not covered by those tests.
