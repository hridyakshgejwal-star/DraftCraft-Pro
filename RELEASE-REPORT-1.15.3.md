# DraftCraft Pro 1.15.3 — restoration report

Repair of the **existing** DraftCraft Pro desktop application supplied as `DraftCraft-Pro-1_15_2-arm64.dmg`.
The app was not recreated: every change is a targeted fix in the existing Electron/React/TypeScript source, with
a regression test. Builds and automated tests ran in a Linux workspace; the DMG and app were then checked natively on
an Apple Silicon Mac (macOS 27.0.1) for the items listed in section F. Anything not listed there is **not verified on
macOS**.

Evidence paths are relative to the source tree. `verification/evidence-1.15.3/` holds the release-run logs and
JSON (`release-suites-final/`, `release-suites-shipped/`), real-Electron results (`electron-*.json|log`), the
exported PDFs, screenshots, CPU profiles and the type-check output. The DMG receipt and the three DMG verifier proofs
are produced after the source archive has been sealed into the image, so they are in the delivered evidence archive
(`dmg/`) and next to the DMG, not inside the source tree.
"Shipped" always means the original 1.15.2 payload extracted from the supplied DMG; "final" means the 1.15.3 payload
inside the new DMG.

---

## A. Identification

| Item | Value |
|---|---|
| Application | DraftCraft Pro — screenplay editor (Electron 44.7.0 / Chromium 152.0.7977.130, React, TypeScript) |
| Bundle identifier | `com.draftcraft.screenplay.studio` (unchanged) |
| Target | macOS 13+ on Apple Silicon (arm64); `LSMinimumSystemVersion` 13.0 |
| Supplied artifact | `DraftCraft-Pro-1_15_2-arm64.dmg`, 150,188,246 bytes, SHA-256 `8909652da2a7ea227513929d20618ff0722ca931cfd4aa632a4c45ffb8139343` |
| Supplied app payload | `app.asar` SHA-256 `01ee5f7df8a4022a0f45ed61fcf802b4b60b61764cd792d7acb16b039c5f461f` (92 files; ASAR header hash matches Info.plist `ElectronAsarIntegrity`) |
| Supplied source | `DraftCraft-Pro-Source.zip` inside the DMG, SHA-256 `e556b5679eb8ddec0f8453347a8f256080f2e0d7832efa8326482f3ecf269449`, 616 files |
| Checkpoint | `checkpoint/original-checksums.txt`, `original-dmg-volume-manifest.sha256` (409 entries), `original-source-manifest.sha256` (616 entries); git tag `baseline-1.15.2` = unmodified source. All 271 app-bundle files of the reused runtime were re-verified against the volume manifest before packaging. The original DMG was never modified. |
| Not the app | The separate Rust prototype in `crates/` is preserved unchanged and is not part of the runtime. |
| Result | DraftCraft Pro **1.15.3** (`CFBundleShortVersionString`/`CFBundleVersion` 1.15.3) |

## B. Initial findings (reproduced on the shipped 1.15.2 payload)

1. **Package integrity.** The supplied DMG, its app bundle (271 files, 14 symlinks), `app.asar` (92 files) and source
   archive (616 files) were hashed and recorded before any work (`checkpoint/`). The ASAR header hash matches the
   bundle's `ElectronAsarIntegrity`. The unmodified source became git tag `baseline-1.15.2`; 109 of its 616 files
   (logs and result files) are excluded by its own `.gitignore` and were kept in the working tree and in the new
   source archive.
2. **Model/backend tests on the 1.15.2 source:** 210 / 210 pass (`baseline-1.15.2/unit-baseline-2.log`).
3. **Real Electron 44.7.0 window lifecycle on the shipped payload** (`baseline-1.15.2/lifecycle-baseline.log`, and the
   full 12-scenario run in `electron-lifecycle-shipped.json`): every window close raised
   `uncaughtException: TypeError: Object has been destroyed at DocumentWindows.remove (window-registry.cjs:7)`.
   5 of the original 6 scenarios failed on that exception (close unmodified window, Cancel/Don't Save, Save + reopen,
   Quit with two windows, close during autosave). → D-01.
4. **PDF export in real Electron on the shipped payload:** Export Screenplay PDF while the live preview was rendering
   showed "Error invoking remote method 'desktop:production-print': Error: Another print job is being prepared" and
   wrote no file (`screens/before-D06-export-error.png`, `electron-pdf-parity-shipped.json`). → D-06.
5. **Visual inspection of the editor on the shipped renderer:** the scene production comment box and the note pill were
   drawn over the action text and the character cue; the resumed-speaker "(CONT'D)" hint sat under the dialogue and was
   never printed (`screens/before-annotation-overlap.png`). The take bar covered the dialogue: Playwright could not
   click **Duplicate take** because the dialogue textarea received the click. → D-02, D-03, D-05, D-08.
6. **Editor-vs-PDF comparison** (after D-06 was fixed) found a character cue left alone at a page bottom because a
   `(MORE)` line was always reserved. → D-07. Font measurement used a different family string from display/print. → D-04.
7. **Editing across elements was absent:** on the shipped renderer the cross-element browser suite passes only its
   "no renderer errors" group. Backspace/Delete at element boundaries did nothing, arrows stopped at boundaries,
   pasted screenplay text became one paragraph, Return dropped inline styles. → E-01…E-07.
8. **Performance:** on the shipped payload, release suites with latency budgets fail intermittently on this 2-CPU
   host: story typing p95 349 ms and 269 ms in two runs (budget 250 ms; 202 ms in a third), custom-shortcut p95
   265 ms (budget 250), spelling typing 273 ms (budget 250; passed on a re-run). A CPU profile showed every keystroke
   re-rendering all ~2,100 editor rows. → P-01.
9. **Release-suite run of the shipped payload with the 1.15.3 test files:** 14 of 17 suites pass; failures are
   shortcuts (latency budget), spelling (latency budget; passed on re-run) and the new cross-paragraph suite (features
   absent) — `release-suites-shipped/final-tests.json`.
10. **Type check** (`tsc --noEmit` through `build-offline/tsconfig.offline.json`): 23 errors in `src/` on the 1.15.2
    source (e.g. missing `firebase/auth` declarations, `MotionStyle` `top`), recorded as the baseline.
11. **Prior documentation was inaccurate in two places:** 1.15.2's matrix listed Close/Quit and Notes/comments as
    "Implemented and verified", contradicted by items 3 and 5.

## C. Corrections

Each row: root cause → fix → regression test. Full detail in `DEFECT-LEDGER-1.15.3.md`.

| ID | Problem (P0 = crash/data loss/failed save or export) | Root cause | Fix | Regression test |
|---|---|---|---|---|
| D-01 (P0) | Every window close raised `TypeError: Object has been destroyed` in the main process | `closed` handler read `webContents` of the destroyed window | `window-registry.cjs` keys records by the id captured at registration and skips destroyed windows; `main.cjs` removes the record and recomputes the main window | `document-windows.test.cjs`; Electron lifecycle 1–6 |
| D-01b (P0) | Dock activate after the last close did nothing (stale destroyed `mainWindow`); renderer crash or hang during Close had no recovery path | No `render-process-gone` handling; `activate` checked only for `null` | Crash dialog + immediate recovery copy, hang watchdog, relaunch recovery, rescue location; `activate` checks `isDestroyed()` | Electron lifecycle 7–12 |
| D-06 (P0) | Export PDF failed ("Another print job is being prepared") while the preview rendered | Print IPC rejected concurrent jobs | FIFO job queue; superseded previews skipped | `print-queue.test.cjs`; Electron PDF parity |
| D-02/D-05 (P1) | Notes, scene comments, review prompts and the annotations ribbon covered script text | Absolutely positioned in the text column; sticky ribbon | Right-margin markers with a click-to-open editor; ribbon scrolls | cross-paragraph suite D-02/D-03 geometry |
| D-08 (P1) | Alternate-take controls covered dialogue; scene numbers collided with the bookmark ribbon | Controls inside the text column | Left-margin compact take bar; scene numbers moved | cross-paragraph suite D-08 (1440/1024 px) |
| D-03 (P1) | Resumed-speaker `(CONT'D)` only an editor hint, never printed; `(MORE)`/`(CONT'D)` misaligned | Editor-only span; labels used dialogue geometry | Layout-generated label on the cue line, shared by editor/preview/PDF; character-indent alignment | `repair-1153.test.ts`; PDF parity |
| D-04 (P1) | Measurement font string differed from editor/print fallback list | Three font strings | One `fontStack()` | `repair-1153.test.ts` |
| D-07 (P1) | Cue stranded at a page bottom; one-line widows | MORE line always reserved; no widow rule | Reserve only on a real split; widow rule; keep-next reserve | `repair-1153.test.ts` |
| E-01…E-07 (P1) | No editing across elements (join, arrows, selection, clipboard, Select All, style-keeping Return) | Each element was an isolated textarea | `src/editor/crossParagraph.ts` + `ScriptEditor` keyboard/pointer/clipboard routing over the shared layout | `cross-paragraph.test.ts` (8); cross-paragraph browser suite |
| E-08 (P1, found during this work) | Delete in an empty element pulled the next element into it and changed that element's type (e.g. Action became a Character cue); Backspace after an empty element did the same | The first join implementation always kept the first element | An empty element is removed; the element with text keeps its id, type and runs; annotations move across | `cross-paragraph.test.ts`; browser group "Delete in an empty element…"; found by the spelling suite |
| D-09 (P1, found on macOS) | A speech continued on the next page repeated the previous page's last line at the top of the new page and hid its own last line, when the break fell on a space (1.15.2 too; the PDF was correct) | The fragment was scrolled to its start offset, which can be the space at which the line wrapped; browsers keep that space on the previous visual line | Scroll to the fragment's first visible character (`FragmentTextarea`) | cross-paragraph group D-09 |
| E-09 (P2, found on macOS) | Escape after Cmd+A, Cmd+A jumped to the end of the script (round 1); the first fix returned to the start of the element (round 2) | Escape moved to the selection's focus; then the caret was read after the first press had selected the element text | Caret noted before the first press (keyboard and menu) and restored on Escape | cross-paragraph group "Escape after Select All…" (asserts the exact offset) |
| P-01 (P2) | Each keystroke re-rendered every element of the script | Row-cache eviction compared `id:page:start` keys with paragraph ids; `reconcileStudio` replaced the marker array on every edit (defeating ~500 per-page story-panel memos); full word recount and DOM scans per key | Prune to rows of the latest commit; live handlers in cached rows; stable marker identity; cached word counts; reused story geometry; scoped DOM lookups | `repair-1153.test.ts` (marker identity, word counts); browser P-01 (fails if a cached take button keeps a stale closure — mutation-tested) |

Test-suite changes (none weakens an assertion):
* `verification/story-browser.cjs` — unchanged. The earlier whole-script-on-first-press Select All broke its
  single-element test; Select All was changed to two steps instead of changing the test.
* `verification/writing-browser.cjs` — helper `typeEnd` no longer "clears" an element that is already empty
  (Playwright's `fill('')` presses Delete, which now joins elements by design). Assertions unchanged.
* `verification/cross-paragraph-browser.cjs` E-06 — now expects the two-step Select All. The Escape-after-Select-All
  group first asserted only that the caret returned to the starting element (offset 0); after the macOS round 2 it
  asserts the original offset and that typing continues there (stronger).
* `verification/verify-dmg-asar.mjs` — expected version read from the environment/package instead of `'1.15.2'`.
* Harness switches added earlier: `DRAFTCRAFT_MULTIPROCESS=1` (Chromium without `--single-process`), seeding scripts
  skip `data:` frames, codec suite falls back to the offline dev server.

## D. Before / after

Same tests, same host, shipped 1.15.2 payload vs 1.15.3 payload.

| Check | 1.15.2 (shipped) | 1.15.3 |
|---|---|---|
| Real-Electron window lifecycle (12 scenarios) | **1 / 12 pass**; main-process `TypeError` on every close; no crash dialog; hung Close never completes; no window after Dock activate | **12 / 12 pass**, no main-process exceptions |
| Real-Electron PDF export with the preview open | **No PDF written** ("Another print job is being prepared") | PDF written; 7 script pages + title page, US Letter; every page's first/last words and all 18 generated labels (2 `(MORE)`, 2 page-break `NAME (CONT'D)`, 14 resumed-speaker `(CONT'D)`) found on the same PDF page as in the editor |
| Annotation overlap probe (row content intruding into the next row) | 20 intrusions (the probe lists at most 20), e.g. the scene-comment box into the action by 89 px | none |
| Take controls / scene number / bookmark ribbon vs text (1440 & 1024 px) | take bar intersects dialogue text; Duplicate take not clickable | no intersections; button clickable |
| Cross-element editing browser suite (14 groups) | 1 / 14 (only "no renderer errors") | 14 / 14 |
| 250-page typing latency, 4 story tools (3 alternating runs per build) | p50 119–149 ms, p95 205–252 ms | p50 59–68 ms, p95 104–124 ms (earlier builds' sessions: 118–145 / 207–286 vs 61–76 / 89–112) |
| Story-suite typing budget (p95 < 250 ms) | failed in 2 of 3 runs (349, 269; 202 ms) | passed (116 ms in the release run) |
| Custom-shortcut latency budget (p95 < 250 ms) | failed (265 ms) | passed (121 ms) |
| Smart-save typing, 222 pages | p50 158 / p95 204 ms | p50 64 / p95 153 ms |
| Automatic-formatting typing, 2,000 elements (120 keys, total) | 13,272 ms | 5,415 ms |
| Return with punctuation assistance, 223 pages | p50 829 / p95 1,693 ms | p50 421 / p95 531 ms |
| Word-click synonym menu, 250 pages (cached clicks) | 242–387 ms (run alone) | 244–388 ms (unchanged within noise) |
| Release suites (17) | 14 / 17 in the full run (shortcuts and spelling latency budgets, cross-element suite); spelling passed on a re-run | 17 / 17 |
| `src/` type errors (offline tsconfig) | 23 | 23 — the identical set; no new errors |

Screenshots: `screens/before-annotation-overlap.png` / `screens/after-annotation-margin.png`,
`screens/before-D06-export-error.png`. Timings come from headless Chromium 141 / Electron 44.7.0 on a 2-CPU Linux
container and include automation round trips; they are comparable with each other, not with a Mac.

## E. Test results (1.15.3 payload)

Payload tested: `build-final2/app` → packed as the DMG's `app.asar` (SHA-256 `5c01e790…65ffee`, ASAR header
`00fa3eaf…9156b9`); payload fingerprint `1cdc6eea67edc87c5431bd723225d34864469fb4abd417e64c1992d903e2e7f0`
(`release-suites-final/final-tests.json`). Two earlier 1.15.3 builds passed the same 17 suites and were then
corrected after native macOS checks: `7692a51a…` (before D-09/E-09) and `789a5858…` (before the second E-09 fix).
Their results are kept in `superseded/first-build-7692a51a/` and `superseded/second-build-789a5858/`; the
strengthened Escape test fails on both (`cross-paragraph-strengthened-escape-test.log` in each).
The DMG build refuses to package unless all 17 suites passed for exactly this fingerprint and every packaged byte
equals the tested stage (`verify-dmg-asar.mjs`).

**Release suites — `verification/run-release-tests.py` (17/17 pass, 230 model/backend tests, 219 interaction groups)**

| Suite | 1.15.3 | Groups / tests | 1.15.2 shipped | Groups |
|---|---|---|---|---|
| models (node:test) | pass | 230 tests | — | 1.15.2 source: 210 / 210 |
| story | pass | 15 | pass* | 15 |
| editor | pass | 14 | pass | 14 |
| shortcuts | pass | 14 | **FAIL** (latency 265 ms > 250) | 13 |
| words | pass | 13 | pass | 13 |
| spelling | pass | 14 | **FAIL** then pass on re-run (latency 273 ms > 250) | 14 |
| smart-save | pass | 10 | pass | 10 |
| caret | pass | 12 | pass | 12 |
| formats | pass | 18 | pass | 18 |
| punctuation | pass | 18 | pass | 18 |
| automatic-formatting | pass | 25 | pass | 25 |
| table-read | pass | 18 | pass | 18 |
| production | pass | 14 | pass | 14 |
| collaboration | pass | 1 | pass | 1 |
| interchange | pass | 8 | pass | 8 |
| repair | pass | 11 | pass | 11 |
| cross-paragraph (new) | pass | 14 | **FAIL** (features absent; 1 of 14 groups pass) | 14 |

\* story failed its latency budget on the shipped payload in two earlier runs (`baseline-1.15.2/run-shipped*.log`).

**New and changed tests in 1.15.3:** `repair-1153.test.ts` (8), `cross-paragraph.test.ts` (8),
`document-windows.test.cjs` (+2), `print-queue.test.cjs` (2), `cross-paragraph-browser.cjs` (14 groups),
`electron/lifecycle-scenarios.cjs` (12 scenarios), `electron/pdf-parity.cjs`, `typing-latency-browser.cjs`,
`overlap-probe-browser.cjs`. Two mutation checks confirmed that the new tests detect the defects they guard: restoring
the stale take-button closure fails P-01, and restoring the new-array marker return fails the marker-identity test.

**Real Electron 44.7.0 (linux-x64, Xvfb) on the packaged `app.asar`:** lifecycle 12 / 12; PDF parity pass
(`electron-lifecycle-final.json`, `electron-pdf-parity-final.json`, `electron-pdf-parity-final.pdf`).

**Type check:** 23 errors in `src/`, the same set as the 1.15.2 baseline (`typecheck-src-1.15.3.txt`,
`baseline-1.15.2/tsc-src-before.txt`). `npm run lint` therefore still does not pass, as in 1.15.2; none of the
errors is in code changed by this release.

**Rebuild check:** none of 20 rebuilds of the committed tree reproduced the final payload byte for byte. In all 20 the
only differing files were the main chunk and `dist/index.html` (which names it), and
`build-offline/compare-main-chunk.py` found each main chunk token-for-token equivalent to the tested one: identical
punctuation and token count, every difference a consistent identifier rename (about 5,000 names), caused by esbuild's
numbering of colliding top-level names (`rebuild-reproducibility.txt`, `build-offline/README.md`). For the two earlier
builds 3 of 8 and 2 of 20 rebuilds were byte-identical.

**DMG:** see section H and `dmg/` (round trips and verifiers).

A first full run of the final suites (`superseded/`) failed one spelling group. The cause was the empty-element join
defect E-08 introduced during this work; it was fixed, the helper adjusted as described in C, and every suite re-run.

## F. Native macOS verification

A Mac was linked to the session after the first build: **Mac mini, Apple Silicon, macOS 27.0.1 (26A434)**. Each DMG
was copied to its own folder under `~/Downloads/DraftCraft-1.15.3-mac-test/` and checked with the scripts in
`verification/macos/`. The app was always a separate copy, launched through LaunchServices with its own test profile.
The installed `/Applications/DraftCraft Pro.app` (1.15.2) and the normal profile were reported by the scripts but never
opened or changed. `Install-DraftCraft.command` was not run because it would replace the installed app.
Step-by-step record: `macos/OBSERVATIONS.md`; logs per round, the exported PDF, the saved project and screenshots are
in `macos/`.

| Round | Build (payload / image) | Result |
|---|---|---|
| 1 | first build `7692a51a…` / `98cace0e…` | image, signature, launch, editing, save, close, Dock reopen, PDF export, crash recovery and Quit verified; **D-09** and **E-09** found |
| 2 | `789a5858…` / `18837d6f…` | image and signature verified again; D-09 fixed; E-09 only partly fixed (caret went to the element start); Quit prompt verified; the dual-dialogue double-click highlight (D-11) first seen |
| 3 | **final** `1cdc6eea…` / `9fd7de8c…` | image and signature verified again; D-09 and E-09 fixed; word double-click and Quit prompt verified; D-11 reproduced (cosmetic, not fixed) |

**Verified natively on the final build (round 3, PASS):** image SHA-256, `hdiutil verify` VALID, read-only mount,
case-sensitive HFS+ volume, Info.plist 1.15.3 with the new ASAR hash, arm64; Apple
`codesign --verify --deep --strict` valid for the bundle and every nested helper and framework (`spctl` rejects it,
as expected for an ad-hoc, non-notarized build); all 271 installer-manifest entries and the four installer pins;
`app.asar` hash; launch with all four process types; continued speech at a page break; word double-click; two-step
Cmd+A with Escape returning to the original caret; Quit with unsaved edits → Save / Don't Save / Cancel; no JavaScript
or main-process errors in stderr.

**The delivered image** is a rebuild of the round-3 image that differs only in the documents on the volume (they now
record round 3). Its app bundle is compared byte for byte with the round-3 bundle on Linux, and the delivered image
itself is checked on the Mac with `1-verify-image.command` after it is built; both results are delivered next to the
image (`dmg/` in the evidence archive), because an image cannot contain its own checksum.

**Verified natively on the first build only (round 1, PASS):** editor rendering with margin markers clear of the
text; Backspace join and Undo; Shift+Arrow cross-element selection; native save panel and a real `.draftcraft` file;
Cmd+W on a saved document; the app staying open after the last window and reopening a window on the Dock event; PDF
export while the preview is still rendering (3-page US Letter PDF with matching `(MORE)`/`(CONT'D)`); renderer crash
→ "The editor stopped unexpectedly" with Reload Editor / Close Window, Reload restoring the text; Quit with an unsaved
second window, Cancel keeping it. Since that build the application code changed in two renderer files only
(`src/production/FragmentTextarea.tsx` for D-09, `src/components/ScriptEditor.tsx` for E-09); the main process, save,
print and crash-recovery code is unchanged, and all 17 suites, the 12 Electron lifecycle scenarios and the PDF parity
check passed again on the final payload on Linux. These items were not repeated on the Mac for the final build.

**Found on the Mac and fixed:** D-09 (a continued speech repeated the previous page's last line in the editor) and
E-09 (Escape after Select All did not return the caret to where it was). Both were reproduced on Linux, fixed, and covered by browser
tests that fail on 1.15.2 and on the earlier 1.15.3 builds. **Found and not fixed:** D-11 (cosmetic selection
highlight after a double-click in blank space; macOS only).

**macOS Files & Folders prompt.** Because the test copy and its profile were inside `~/Downloads`, macOS asked whether
"DraftCraft Pro" may access the Downloads folder (rounds 2 and 3); while the question was open, the round-3 copy's main
process waited and its window stayed blank. The prompt was not answered from this session, because macOS stores one
such setting per app identifier, shared with the installed 1.15.2 app. The round-3 checks were then run with the copy
and profile in `/tmp` (`2b-launch-isolated-tmp.command`). Whether an installed 1.15.3 in `/Applications` asks for
any folder access was not verified.

**Still not tested on macOS:** running `Install-DraftCraft.command` (the documented install route, including its
local re-signing and quarantine removal), launching a copy that carries the download quarantine attribute (the images
on the Mac had none), Developer ID/notarization (unavailable), IME composition, VoiceOver, trackpad gestures, the
macOS print panel to a physical printer, dictation, and timing on Apple Silicon.

## G. Remaining limitations

* **Native macOS testing is partial** (section F): the installer route, a quarantined download, IME, VoiceOver,
  printing, dictation and Apple Silicon timing are not tested.
* **Undo after typing removes one character per Cmd+Z** (D-10, unchanged from 1.15.2).
* **macOS double-click in blank space** between a dual-dialogue block and the next element shows a stray selection
  highlight on other elements (D-11, cosmetic, not fixed).
* **Ad-hoc signature only; not Developer ID signed; not notarized.** Gatekeeper will warn; the installer explains
  the override. Distribution to other people needs credentials (see `UNRESOLVED-EXTERNAL-DEPENDENCIES.md`).
* **Built without the npm registry:** React 19.2.8 instead of the locked 19.3.0, esbuild/Tailwind instead of Vite,
  reused 1.15.2 `api.cjs` and font files. A normal macOS `npm ci` build should be re-tested before distribution.
* **Pagination differs slightly from 1.15.2** for existing scripts (by design; no data changes —
  `migrations/pagination-1.15.3.md`). Not compared with Final Draft.
* **Editing across elements:** IME composition across element boundaries, macOS pasteboard exchange with other
  apps and multi-element production tagging are not implemented or not tested.
* **Inline mixed-style display** (bold/italic shown inside the editor, caret geometry within mixed runs) remains
  partial, as in 1.15.2; runs are kept, edited structurally and printed.
* **Unchanged partial areas** carried from 1.15.2: FDX/Fountain/RTF fidelity limits, standard FDX
  alternates/revisions, locks/revisions/Track Changes edge cases, reports, Table Read provider voices, live
  collaboration hosting, cloud sync (missing), OCR (missing), AI features (unverified without an account),
  dictation (needs a macOS build).
* `npm run lint` reports 23 pre-existing type errors (unchanged).
* Latency numbers are from a 2-CPU Linux container; Apple Silicon timing is unmeasured.

## H. Deliverables

Produced in `/home/claude/draftcraft/deliverables-1.15.3/` (SHA-256 of every file in `SHA256SUMS.txt` there; a
file cannot carry its own hash, so the image checksum and the image receipt are outside the image):

| File | Contents |
|---|---|
| `DraftCraft-Pro-1.15.3-arm64.dmg` | Installable disk image: `DraftCraft Pro.app` 1.15.3, `Install-DraftCraft.command`, `Support/` manifests, `Getting-Started.txt`, the documents below, `Migrations/`, `Third-Party-Licenses/`, `Verification/` (1.15.3 evidence + 1.15.2 history), `DraftCraft-Pro-Source.zip` |
| `DraftCraft-Pro-1.15.3-arm64-app.zip` | The same `DraftCraft Pro.app` (symlinks preserved) |
| `DraftCraft-Pro-1.15.3-Source.zip` | Complete updated source tree incl. tests, `build-offline/`, manifests, migrations, evidence, and the git history (`.git`, tags `baseline-1.15.2`, `release-1.15.3`) |
| `DraftCraft-1.15.3.patch` | `git diff baseline-1.15.2 release-1.15.3` |
| `RELEASE-REPORT-1.15.3.md`, `FEATURE-MATRIX-1.15.3.md`, `DEFECT-LEDGER-1.15.3.md`, `Release-Notes-1.15.3.md`, `Build-and-Install-1.15.3.md`, `UNRESOLVED-EXTERNAL-DEPENDENCIES.md` | Documents |
| `DraftCraft-Pro-1.15.3-Verification-Evidence.zip` | `verification/evidence-1.15.3/` plus the DMG proofs |
| `dmg-receipt.json` | Image size and SHA-256, ASAR hashes, round-trip and verifier results |
| `SHA256SUMS.txt` | Checksums of all of the above |

Manifests and build scripts in the source: `desktop/package.json` (1.15.3), `desktop/build.cjs`,
`desktop/package.mjs`, `desktop/create-installer.mjs`, `build-offline/*`, `verification/build-release-dmg.py`,
`verification/verify-*.{py,mjs}`, `verification/packaging-tools.json`.

## Acceptance criteria

Statuses come only from the evidence above. "PASS (Linux)" means verified in real Electron or Chromium on Linux;
macOS is a separate row (17).

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Existing app inspected and checkpointed before changes; nothing recreated or discarded | PASS | `checkpoint/`, tag `baseline-1.15.2`, 616/616 original files present |
| 2 | Full functional audit with feature matrix using the required statuses | PASS | `FEATURE-MATRIX-1.15.3.md` |
| 3 | Editor and PDF pagination agree | PASS (Linux) | Electron PDF parity, 7/7 pages |
| 4 | (MORE)/(CONT'D) correct and printed | PASS (Linux) | `repair-1153.test.ts`; 18/18 labels on matching PDF pages |
| 5 | Widow/orphan control | PASS | D-07 unit tests |
| 6 | Closing a window never crashes or loses work | PASS (Linux) | Electron lifecycle 1–6, 12 |
| 7 | Saving, autosave and crash/hang recovery | PASS (Linux) | Electron lifecycle 3, 6–11; smart-save suite |
| 8 | Editing across elements (join, arrows, selection, clipboard, Select All, styles) | PASS (Linux) | cross-paragraph unit + browser suites |
| 9 | Floating toolbar and annotations never cover text | PASS (Linux) | editor-suite geometry; D-02/D-08 groups; overlap probe |
| 10 | Writing assistance (spelling, synonyms, capitalization, punctuation, SmartType) works | PASS (Linux) | spelling, words, punctuation, automatic-formatting suites |
| 11 | Keyboard shortcuts | PASS (Linux); native accelerators NOT TESTED | shortcuts suite |
| 12 | Advanced production features | PARTIAL | production suite passes; several areas remain Partially implemented (matrix) |
| 13 | Import / export | PARTIAL | interchange suite passes; FDX/Fountain/RTF limits, OCR missing |
| 14 | Performance measured with real numbers | PASS (Linux) | `typing-latency-250-pages.txt`, suite measurements, CPU profiles |
| 15 | Root-cause fixes with regression tests; no weakened tests; no hidden errors | PASS | section C (test changes disclosed); mutation checks |
| 16 | Automated test suites pass on the release payload | PASS | 17/17 suites, 230 tests, 219 groups, Electron 12/12 + PDF parity |
| 17 | Native macOS testing | PARTIAL | macOS 27.0.1, Apple Silicon, three rounds (section F): final build — image, `codesign`, launch, page break, Select All/Escape, Quit prompt; first build — editing, save, close, Dock reopen, PDF export, crash recovery. Installer, quarantine, IME, VoiceOver, printing, dictation NOT TESTED; D-11 open |
| 18 | Final installable DMG built with the project's pipeline | PARTIAL | Linux route reusing the verified runtime; project verifiers pass; `mkfs.hfsplus` unavailable, so `build-production-dmg.py` itself was not run; on macOS the round-3 image was verified and mounted and its app launched; the delivered image (same app bundle) is image-checked on the Mac after the build (`dmg/`); `Install-DraftCraft.command` was not run |
| 19 | Developer ID signing and notarization | BLOCKED | no Apple credentials; ad-hoc only |
| 20 | Deliverables: DMG, .app, source, manifests/scripts, tests, matrix, report, install guide, checksums, dependency list | PASS | section H |
| 21 | Type check clean | FAIL (pre-existing) | 23 errors, identical to 1.15.2 |
