# DraftCraft Pro 1.15.3 — feature matrix

The application is the existing Electron 44.7.0 / React / TypeScript DraftCraft Pro (bundle id
`com.draftcraft.screenplay.studio`), repaired in place from the shipped 1.15.2 build. The separate Rust
prototype is preserved and is not part of the runtime.

**How to read the statuses**

* *Implemented and verified* — the behaviour exists in the active UI and automated tests on the exact 1.15.3
  payload passed: renderer suites in headless Chromium, window/file/PDF behaviour in **real Electron 44.7.0 on
  Linux (Xvfb)**. It does **not** mean verified on macOS.
* *Implemented but not fully verified* — implemented; tests cover a subset, or only a model/request path.
* *Partially implemented*, *Broken*, *Missing*, *Blocked* — as named; "Blocked" names the dependency.
* **Native macOS:** only the items in the "Native macOS" section below were checked on a Mac (macOS 27.0.1,
  Apple Silicon). Everything else is NOT TESTED on macOS.

Suite names refer to `verification/run-release-tests.py` (17 suites) and the Electron scripts in
`verification/electron/`. Results: `verification/evidence-1.15.3/`.

## Areas changed in 1.15.3

| Feature | 1.15.2 status (as shipped) | 1.15.3 status | What changed | Evidence on the 1.15.3 payload | Remaining scope |
|---|---|---|---|---|---|
| Window close, Cmd+W, Quit with several windows | Listed "Implemented and verified"; **Broken** in real Electron (D-01: main-process TypeError on every close) | Implemented and verified | Destroyed-window-safe registry and close cleanup | Electron lifecycle scenarios 1–6 and 12 (close unmodified, Cancel/Don't Save, Save + reopen, Quit two windows, double close, close during autosave, Dock activate after the last close); 1.15.2: 1 of 12 pass | Parented native sheets and macOS Dock/menu behaviour on a Mac |
| Renderer crash / hung editor recovery | Missing | Implemented and verified | Crash dialog (Reload Editor / Close Window) with immediate recovery copy; watchdog for a hung editor; recovery restored on relaunch; rescue location when the folder is unavailable | Electron lifecycle scenarios 7–11; all fail on 1.15.2 | macOS crash reporter interaction untested |
| Multiple native document windows | Implemented but not fully verified | Implemented and verified | Same registry fix; main window recomputed from live windows | Electron lifecycle (two windows, quit sequence); `document-windows.test.cjs` | macOS window restoration/Spaces untested |
| Native Save / Save As / autosave / recovery | Implemented and verified (renderer + coordinator tests) | Implemented and verified | No change in the coordinator; now also exercised through real Electron windows | smart-save suite; lifecycle Save + reopen, close during autosave, relaunch recovery, unavailable folder rescue | Native save panels are scripted in tests |
| PDF export | Partially implemented; **export failed while the preview was rendering** (D-06) | Implemented and verified for the export path | Print jobs queued; stale previews superseded | Electron PDF parity (real `printToPDF`, real file); `print-queue.test.cjs` | Physical printers, macOS print panel, installed-font variations |
| Editor ↔ PDF page agreement | Partially implemented | Implemented and verified for the tested scripts | Shared font family list (D-04); generated labels printed (D-03) | Electron PDF parity: 7 script pages + title page, each page's first/last words, all 18 editor (MORE)/(CONT'D) labels found on the same PDF page, US Letter 612×792 | macOS font rasterization; custom fonts; Final Draft comparison |
| (MORE) / (CONT'D) | Partially implemented (editor-only hint, not printed) | Implemented and verified | Layout-generated resumed-speaker (CONT'D) on the cue line; (MORE) and continued cue at character indent; respects `continuations` options; never written into text | `repair-1153.test.ts` D-03 (placement, suppression for other speaker/new scene/typed/dual, extensions, option off); PDF parity | Dual-dialogue page splits not covered by the parity script |
| Widows / orphans / keep-with-next | Partially implemented (cue could be orphaned, one-line widows) | Implemented and verified | MORE reserve only when the speech splits; one-line widows prevented; long spoken followers keep a reserve line | `repair-1153.test.ts` D-07 (cue + one-line speech at 4 fill levels; 20 widow fill levels; text preserved) | Not compared with Final Draft page breaks |
| Shared pagination and spacing (overall) | Partially implemented | Implemented but not fully verified | Above changes; pagination can differ slightly from 1.15.2 (`migrations/pagination-1.15.3.md`) | models, formats, production, repair suites; PDF parity | Inline mixed-font display and every custom-font case |
| Notes, scene comments, review prompts placement | Listed "Implemented and verified"; drawn **over script text** (D-02) | Implemented and verified | Right-margin markers that open an editor below the element; ribbon no longer sticky (D-05) | cross-paragraph suite D-02/D-03 geometry (no marker intersects any text box); screenshots | VoiceOver labels reviewed in code only |
| Take controls, scene numbers, bookmark ribbon | Overlapped text / each other (D-08) | Implemented and verified | Compact left-margin take bar; scene number clear of the ribbon | cross-paragraph suite D-08 at 1440 and 1024 px (fails on 1.15.2: take bar covers text) | — |
| Floating formatting toolbar | Implemented and verified | Implemented and verified | Element-suggestion and conversion-review prompts moved into the toolbar instead of floating over text | editor suite "formatting geometry" (1024/1440/1920 px, 50/100/200 %, Navigator open/closed: no textarea collision) | — |
| Core screenplay editing | Partially implemented | Implemented and verified | Cross-element editing below; empty-element joins keep the neighbour's type | models, editor, cross-paragraph, shortcuts, automatic-formatting suites | Mixed-style display: see Inline rich-text row |
| Editing across elements (join, arrows, selection, clipboard, Select All) | Partially implemented | Implemented and verified | E-01…E-07: Backspace/Delete joins, arrow navigation across elements, Shift+Arrow/Shift+Click/drag selection with highlight, type-over/delete/Enter/cut/copy/paste with element types, two-step Select All, Return keeps inline styles | `cross-paragraph.test.ts` (8 tests); cross-paragraph browser suite (14 groups; the shipped 1.15.2 renderer passes 1 of 14) | IME composition across elements; macOS pasteboard; direct multi-element tagging still missing |
| Long-script typing performance | Implemented but not fully verified (story suite budget failed on 1.15.2 in some runs) | Implemented and verified (Linux) | Row cache fixed (P-01), stable marker identity, cached word counts, narrower DOM lookups | 250-page script, 3 alternating runs: p95 104–124 ms vs 205–252 ms on 1.15.2 (`typing-latency-250-pages.txt`); story, shortcuts and spelling latency budgets pass | No Apple Silicon benchmark; numbers are environment-specific |
| ARM64 DMG / install / signing | Implemented but not fully verified | Implemented but not fully verified | New DMG built with the same verified ARM64 Electron runtime; app.asar, Info.plist (version, ASAR integrity) and outer ad-hoc signature changed | DMG round trips through 7-Zip and hfsplus extract identical to the staged volume; CodeResources seals the new app.asar; installer manifests regenerated | On macOS 27.0.1 the image was verified and mounted, Apple `codesign` passed and a copy of the app was launched and exercised (section below); **`Install-DraftCraft.command` not run. Not Developer ID signed. Not notarized.** |

## Native macOS (macOS 27.0.1, Mac mini, Apple Silicon — separate test copy, own profile)

Three rounds: round 1 on the first build, round 2 on the second, round 3 on the final build (`OBSERVATIONS.md`).

| Check | Result | Evidence |
|---|---|---|
| DMG checksum, `hdiutil verify`, read-only mount, volume format | PASS (all three images, final image in round 3) | `macos/*/1-verify-image.log` |
| Apple `codesign --verify --deep --strict` (bundle + all nested helpers/frameworks) | PASS — valid, satisfies Designated Requirement; ad-hoc (all three) | same |
| Gatekeeper `spctl --assess` | Rejected (expected: not notarized) | same |
| Installer manifest (271 files) and pins | PASS (all three) | same |
| Launch through LaunchServices | PASS (final build: from `/tmp`, see the Files & Folders note) | `round3/2b-launch-isolated-tmp.log` |
| Editor rendering; margin markers clear of text | PASS (round 1) | `screens/macos-editor-margin-markers.jpg` |
| Backspace join + Undo; Shift+Arrow cross-element selection | PASS (round 1) | `OBSERVATIONS.md` |
| Two-step Cmd+A; Escape after Select All returns the caret | PASS on the final build (round 3); FAIL in round 1, PARTIAL in round 2 (E-09) | `screens/macos-round3-E09-*.jpg` |
| Continued speech shown correctly at a page break | PASS on the final build (rounds 2 and 3); FAIL in round 1 (D-09, also in 1.15.2) | `screens/macos-D09-before.jpg`, `macos-round3-D09-page-break.jpg` |
| Double-click on a word | PASS (round 3) | `screens/macos-round3-word-dblclick.jpg` |
| Double-click in blank space under a dual-dialogue block | FAIL — stray selection highlight on other elements (D-11, cosmetic) | `screens/macos-round3-dual-gap-dblclick.jpg` |
| Native save panel, real project file; Cmd+W on a saved document | PASS (round 1) | `build-premac/macos-saved-project.draftcraft` |
| App stays open after the last window; Dock reopen creates a window | PASS (round 1) | `build-premac/3-reopen.log` |
| PDF export while the preview renders; (MORE)/(CONT'D) in the PDF | PASS (round 1) | `build-premac/macos-export.pdf`, `macos-export-text.txt` |
| Renderer crash → Reload Editor / Close Window; Reload restores text | PASS (round 1) | `build-premac/4-crash-renderer.log`, `screens/macos-crash-*.jpg` |
| Quit with unsaved changes → Save / Don't Save / Cancel | PASS (rounds 1–3) | `screens/macos-quit-*.jpg`, `macos-round2-quit-prompt.jpg`, `macos-round3-quit-prompt.jpg` |
| Undo granularity after typing | One character per Cmd+Z (D-10, same as 1.15.2) | `OBSERVATIONS.md` |
| macOS Files & Folders prompt when the test copy lives in `~/Downloads` | Shown; not answered (shared per app identifier with the installed app); the copy waited for it | `screens/macos-round3-downloads-access-prompt.jpg` |
| `Install-DraftCraft.command`, quarantined download, IME, VoiceOver, printing, dictation, Apple Silicon timing | NOT TESTED | — |

Round-1-only items ran on the first build. Since then the application changed only in two renderer files (D-09, E-09);
all 17 suites and the Electron lifecycle and PDF checks passed again on the final payload on Linux.

## Areas carried from 1.15.2 (re-run on the 1.15.3 payload)

These rows did not change in 1.15.3. Their status is carried from 1.15.2 and the named suites were re-run on the
1.15.3 payload.

| Feature | Status | 1.15.3 re-run | Remaining scope (from 1.15.2, still applies) |
|---|---|---|---|
| Template browser / apply / switch / custom formats | Implemented and verified | formats | House presets are adaptations, not Final Draft template files |
| Enter/Tab and automatic element formatting | Implemented and verified | automatic-formatting, formats, shortcuts | Native IME |
| Capitalization, punctuation, headings, parentheses, transitions | Implemented and verified | punctuation, automatic-formatting, story | Conservative English rules |
| Spelling and personal vocabulary | Implemented and verified | spelling | Mac input methods |
| Contextual synonyms | Implemented and verified | words | Writer review of meaning |
| SmartType / character memory | Implemented and verified | spelling, editor, formats | Imported identity workflows (see cast row) |
| Custom shortcut profiles | Implemented and verified | shortcuts | Native Mac accelerators |
| Caret, reduced motion, animations | Implemented and verified | caret | High-refresh display, VoiceOver |
| Inline rich-text editing | Partially implemented | models, interchange | Displayed mixed-style text, selection and caret geometry unfinished (runs are kept and printed) |
| Find / Replace / Replace All | Implemented and verified | repair, models | Very large batches must be narrowed |
| Scene List / Index Cards / Navigator reorder | Implemented and verified | repair, story | — |
| Saved Navigator views | Implemented and verified | production | — |
| Bookmarks and scene summaries | Implemented and verified | editor, story, production | — |
| Beat Board / flow lines / outline links | Partially implemented | story | Every page-span/movement combination |
| Story Map / arcs / acts / Beat Strip | Implemented and verified | story | — |
| File Manager Save As / Duplicate / Revert | Implemented and verified | repair, smart-save | Native dialogs scripted |
| Browser snapshots / Restore | Implemented and verified | repair | — |
| Backups / recents / productivity page counts | Implemented and verified | models | — |
| Dual dialogue | Partially implemented | production, models, interchange | Locked edge cases; Table Read is sequential |
| Alternate dialogue | Implemented and verified | production, cross-paragraph (take bar) | Standard Final Draft alternate interchange |
| Page / scene locks, inserted labels, omissions | Partially implemented | models, production | Exhaustive nested insertion/relocking |
| Production revisions | Partially implemented | production | Full FDX revision workflow |
| Track Changes | Partially implemented | production, models | Combined text+format dependencies, FDX review |
| Production tags | Partially implemented | production | Ambiguous orphan repair |
| Direct multi-element drag tagging | Missing | — | Cross-element selection now exists; tagging from it is not implemented |
| Character identity / aliases / cast | Partially implemented | models | Imported identity merges |
| Reports and character sides | Partially implemented | production | Every report option combination |
| FDX / FDXT | Partially implemented | interchange | No Final Draft desktop round trip available |
| Standard FDX alternates / revisions | Missing | — | Needs independent fixtures and a real application |
| Fountain / RTF / TXT | Partially implemented | interchange | Complex delimiter/font fidelity |
| Text PDF import | Partially implemented | interchange | OCR not included |
| Print options: title pages, headers, ranges | Partially implemented | formats, repair | Physical print panels |
| Embedded script / title images | Partially implemented | production | Native pasteboard |
| Compare / Combine / Reformat | Partially implemented | repair | Within-element insertion |
| Format Doctor | Partially implemented | repair | Not a compliance certification |
| Writing history / sessions / goals / sprints | Partially implemented | models | Cloud sync not operational |
| Macros and toolbar customization | Implemented and verified | production | Native accessibility |
| Table Read | Partially implemented | table-read | No premium/provider voices tested |
| macOS dictation | Blocked — needs a macOS SDK build, an installed on-device language, permissions and a microphone | — | Swift helper not compiled on Linux |
| AI research / image analysis / suggestions | Implemented but not fully verified | models (request guards) | No provider account or paid request used |
| Live collaboration | Partially implemented | collaboration | Public hosting/TLS/credentials not supplied |
| Cloud / Drive synchronization | Missing | — | Needs a real integration and service |
| Themes / focus / scaling / accessibility | Implemented but not fully verified | editor, story (both themes) | VoiceOver, physical scaling |
| Rust workspace | Implemented but not fully verified | preservation only | Not linked into the Electron build |
