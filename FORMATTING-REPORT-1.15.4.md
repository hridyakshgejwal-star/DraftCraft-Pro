# DraftCraft Pro 1.15.4 — screenplay formatting, template engine and intelligent auto-formatting

Work on the **existing** DraftCraft Pro app, continuing from the delivered 1.15.3 release (git tag `release-1.15.3`; the
rollback checkpoint is tag `checkpoint-before-formatting-work`, the same tree). Nothing was rebuilt from scratch: the
editor is still the per-element `FragmentTextarea` editor with the shared `layoutScript` pagination, and every change below
is a targeted change in the existing format model, inference rules, Final Draft codec, settings and print code, each with a
regression test. Builds and automated tests ran in the Linux workspace against the exact packaged payload.

Companion documents:

- [TEMPLATE-MATRIX-1.15.4.md](TEMPLATE-MATRIX-1.15.4.md) — every built-in template, with measured results
- [AUTO-FORMATTING-BEHAVIOURS-1.15.4.md](AUTO-FORMATTING-BEHAVIOURS-1.15.4.md) — every automatic rule and its switch
- [Release-Notes-1.15.4.md](Release-Notes-1.15.4.md) — user-facing summary
- [migrations/formatting-1.15.4.md](migrations/formatting-1.15.4.md) — what happens to existing documents, settings and files
- Evidence: `verification/evidence-1.15.4/`

**Result.** 15 formatting defects fixed at their root (section C), 16 templates added (96 in all), all 11 requested Auto
Formatting controls present and on by default, Final Draft files read and written in Final Draft's own conventions. On the
exact packaged payload (`payload_sha256 f6d59849…`, commit `255d5a4`): **all 18 release suites pass** with the standard
performance budgets (240 model tests; 13 template-formatting groups), real-Electron lifecycle 12/12, editor/PDF parity
passes, editor geometry matches the template definition in **75 of 75** page-layout templates, the PDF geometry and
page-header check passes for **11 of 12** measured templates (the 12th is known limitation L-3, a 6 pt half-leading offset
in double-spaced multi-camera dialogue), all **7** Final Draft files open, and all **80** document formats of 1.15.3 open
unchanged. On the Mac: image, signature, payload and launch verified; the interactive steps were not run natively (section F). There is no two-column A/V layout (L-1).

---

## A. Method

1. **Inspected before changing.** Read the format model (`src/formats/model.ts`), catalog (`catalog.ts`), migration
   (`storage.ts`), inference (`inference.ts`), the editor's completion rules (`src/editor/automaticFormatting.ts`) and key
   handling (`ScriptEditor.tsx`), the editor preferences and settings UI, the Final Draft codec (`src/utils/fdxCodec.ts`) and
   both PDF paths (`src/production/print.ts` for the desktop export, `pdfExportEngine.ts` for the browser fallback).
2. **Measured the 1.15.3 build** before editing:
   - `verification/format-geometry-probe.cjs` renders every page-layout template in the built renderer and measures where each
     element really sits (inches from the paper edge), the gap above it and the line pitch;
   - `verification/electron/pdf-geometry.cjs` exports real PDFs through Electron's "Export Screenplay PDF" and measures the same
     things in the PDF;
   - a new browser suite, `verification/template-formatting-browser.cjs`, was written against the requirements first and run on
     the 1.15.3 build (baseline: 4 of its first 9 groups failed; the 3 groups added later test features that did not exist);
   - six Final Draft files written by Final Draft itself (testdata of github.com/rsdoiel/fdx, AGPL — read for testing, not copied
     into this repository) were opened with the 1.15.3 codec.
3. **Fixed root causes** in the model, codec, rules, layout and editor styles. Each fix has a test that fails on 1.15.3
   (FMT-11, FMT-13 and FMT-14 were also confirmed failing on the intermediate 1.15.4 commits) and passes now.
4. **Re-ran everything** on the packaged 1.15.4 payload: all release suites (now 18), the real-Electron lifecycle, PDF parity
   and PDF geometry checks, the editor geometry probe for all templates, and the real Final Draft files.

What the 1.15.3 measurements showed was already right (and is unchanged): US Letter, Courier 12 pt at 10 characters per inch,
margins 1.5" left / 1" right / 1" top / 1" bottom, Scene Heading and Action 1.5"–7.5", Character at 3.7", Dialogue
2.5"–6.0", Transition flush right at 7.5", 12 pt line pitch (6 lines per inch), blank-line rules between elements, page number
top right and none on page 1, `(MORE)`/`(CONT'D)` and keep-together pagination. Editor and PDF agreed for every template that
was measured.

## B. Feature-status matrix

Status in 1.15.3 → 1.15.4. "Existing" = already present and verified, kept unchanged.

| Requirement (prompt section) | 1.15.3 | 1.15.4 | Evidence |
|---|---|---|---|
| Letter paper, Courier 12, margins L1.5/R1/T1/B1 | Correct | Unchanged | template suite group 1; geometry probes |
| Character 3.7" | Correct | Unchanged | same |
| Dialogue 2.5" with 2.5" right margin (to 6.0") | Correct | Unchanged | same |
| Parenthetical 3.1" with 2.9" right margin (to 5.6") | **3.0" right margin (to 5.5")** | Fixed (FMT-01) | unit + group 1; PDF geometry |
| Transitions right-aligned | Correct | Unchanged | group 1, 4 |
| Page number top right, not on page 1 | Correct position; **10 pt; title forced into the header** | Fixed (FMT-11) | unit "print header"; PDF header-band check |
| Element spacing (blank line before cues, after speeches, two before headings) | Correct (spacing rules v2) | Unchanged | unit test 1; geometry probes |
| Transition endings CUT TO: / FADE OUT. / FADE TO BLACK. | **FADE OUT: by default** (rule existed, not default) | Fixed (FMT-02) | group 4; automatic-formatting suite |
| Film/TV templates | 80 templates in all (62 film, TV, stage, comic and text + 18 structures) | Kept; 96 in all | matrix |
| Radio, audio, documentary, commercial, music video, animation | **Missing** | Added (FMT-09) | matrix; groups 11–12; unit |
| A4 / international, custom, custom studio | A4 only as BBC | Added | matrix |
| Cole & Haag, Warner | Existing | Unchanged | matrix |
| Three-Act, Eight-Sequence, Save the Cat, Story Circle | Existing | Unchanged | matrix |
| Five-Act, Hero's Journey, Freytag | Five-Act Pyramid only | Added Five-Act Structure, Hero's Journey (17 stages), Freytag's Pyramid | matrix; unit |
| Scene headings INT. EXT. INT./EXT. INT/EXT. EXT./INT. EXT/INT. I/E. | Typing path correct; **suggestion path missed EXT./INT., EXT/INT., dot-less I/E** | Aligned (FMT-07) | group 3; unit |
| Character recognition | Existing; **shot lines offered as cues** | Fixed (FMT-05) | group 5 |
| Dialogue after a cue | Existing | Kept; now has its own switch | group 2, 10 |
| Automatic parentheses | Existing | Unchanged | automatic-formatting suite |
| Transition recognition (CUT TO:, DISSOLVE TO:, FADE IN:, FADE OUT., SMASH CUT TO:, MATCH CUT TO:, FADE TO BLACK.) | **Exact punctuation only**; FADE OUT: / JUMP CUT TO: / WIPE TO: not recognised by inference | Fixed (FMT-06, FMT-13) | group 4; unit |
| Shots (CLOSE ON:, INSERT:, POV:, ANGLE ON:, WIDE SHOT, TRACKING SHOT) | **Exact keyword only; ANGLE ON SARAH → character cue** | Fixed (FMT-05) | group 5; unit |
| Template-specific rules | Acts, stage scenes, comics | Kept; audio cues, captions, narration added; switchable | groups 8, 11, 12 |
| Template switching: searchable, preview, Undo, no content loss | Existing (Writing Formats) | Unchanged; tested across all 96 templates | group 8; unit "conversion keeps every paragraph" |
| Enter/Tab behaviour | Existing (template `next`/`tab`) | Kept; new templates define their own flow | group 2; matrix "Return key flow" |
| Pagination | Existing (1.15.3) | Unchanged | release suites |
| Format Settings panel | Existing (Writing Formats: page layout, element styles, transition endings, separator, mode, custom elements) | Unchanged | formats suite |
| Auto Formatting controls (11 listed) | 5 of 11 (scene headings, parentheses, transitions, capitalisation, contextual punctuation), plus character-name autocomplete under Writing Assistance | **All 11**; master switch; defaults on; persisted | group 10; unit |
| Document model with semantic elements | Existing | Unchanged (no schema change) | — |
| Final Draft FDX import | DraftCraft-written files only; **real Final Draft files failed** | Fixed (FMT-03) | group 6; real-file probe |
| Final Draft FDX export | **DraftCraft's private units** | Final Draft conventions (FMT-04) | group 7 |
| Fountain, RTF, text, PDF import/export | Existing | Unchanged | interchange suite |
| Existing files still open | — | Proven (section G) | section G |
| Performance | Existing budgets | Re-measured | section E |

## C. Defects found and fixed

| ID | Defect (1.15.3) | Root cause | Fix | Test |
|---|---|---|---|---|
| FMT-01 | Parenthetical text ran to 5.5" (3.0" right margin) instead of 5.6" (2.9") | `baseFormat` set Parenthetical `right: 2` | Template version 3: `right: 1.9`. Version-2 documents keep 2 (no silent change) | `formatting-1154.test.ts` test 1; template suite group 1; `repair-regressions.test.ts` F01 (v2 unchanged) |
| FMT-02 | New scripts wrote `FADE OUT:` and `FADE TO BLACK:` | Factory `transitionPunctuation: 'colon'`; the existing *Traditional* rule was not the default | Default *Traditional* for template version 3; old documents keep their rule | template group 4; `automatic-formatting.test.ts` (default assertions added); `automatic-formatting-browser.cjs` |
| FMT-03 | Opening a `.fdx` saved by Final Draft failed: "unsupported element or page settings" | Importer assumed DraftCraft's own `PageLayout` (inches, `Width`/`LeftMargin`) and numeric `Leading`; Final Draft writes margins in points and `Leading="Regular"`, giving NaN line heights and 72-inch margins | New `importElementSettings`: detects DraftCraft vs Final Draft conventions; reads points, edge-relative indents, `Spacing`, `SpaceBefore`, `AllCaps` style tokens, `StartsNewPage`, `ReturnKey`; an element that would not fit falls back to default indents instead of failing the file | template group 6 (fixture `verification/fixtures/final-draft-style/standard-layout.fdx`); real Final Draft files (section G) |
| FMT-04 | Exported `.fdx` used DraftCraft's private units (Final Draft would read `TopMargin="1"` as 1 pt) | Exporter mirrored the internal model | Export writes Final Draft conventions: points, indents from the paper edge, `Leading="Regular"` + `Spacing`, `SpaceBefore` (from the real paragraph gaps), `StartsNewPage`, `ReturnKey`, `AllCaps`; `DraftCraftMetadata` keeps an exact DraftCraft round trip | template group 7 (export, plain re-import without metadata, same layout) |
| FMT-05 | `ANGLE ON SARAH`, `CLOSE ON THE CLOCK` were offered as a new character; `CLOSE ON:` / `INSERT: THE LETTER` were not recognised as shots | Shot rule matched only bare keywords; the capitals-line cue rule ran first for anything else | `isShot` (keyword + colon, or an all-capitals line starting with a shot keyword), checked before cues; structural capitals list (`NOT_A_CUE`) | template group 5; unit inference cases |
| FMT-06 | Inference recognised only `CUT TO:`-style exact forms; `FADE OUT:`, `JUMP CUT TO:`, `WIPE TO:` were not transitions; `CUT TO` without a colon was not offered | One literal regex | Shared vocabulary with optional ending: with an ending → Transition; without → offered | template group 4; unit |
| FMT-07 | Suggestion path missed `EXT./INT.`, `EXT/INT.`, dot-less `INT/EXT`, `I/E` | `inferElement` had its own narrower regex than the typing path (`sceneIntro`) | Same prefix set in both | template group 3; unit |
| FMT-08 | Only 5 of the 11 requested Auto Formatting controls existed; no master switch | — | Six preferences added (`autoFormatting`, `detectCharacters`, `autoDialogue`, `smartTypeSuggestions`, `templateFormatting`, `ambiguousSuggestions`), defaults on, normalised on load; `effectivePreferences` applies the master switch; the editor gates each rule; Settings shows all of them with the dependent controls disabled while the master is off | template group 10; unit "option flags" |
| FMT-09 | No radio, audio, documentary, commercial, music-video, animation, A4, international, custom-studio, half-hour drama, single-camera comedy or TV shooting templates; no Five-Act, Hero's Journey, Freytag structures | — | 16 templates built from the existing `make()` variants with their own element sets, flows and samples | matrix; unit catalog tests; groups 11–12 |
| FMT-10 | Stage-play templates offered the Shot element | Base element list was shared with screenplays | Stage plays drop Shot; conversion already maps Shot → Stage Direction | template groups 5, 8 |
| FMT-11 | PDF pages after page 1 carried the script title at top left; a configured header was overridden by it; the page number was 10 pt | The PDF dialog passed the title as `headerText`, which replaces the header's left slot; header font hard-coded at 10 pt | The dialog passes no header text, so the document's Header & Footer settings apply (default: page number only); header uses the script font and size | unit "print header…"; PDF header-band check (pdf-geometry) |
| FMT-12 | An imported Courier face that is not installed (e.g. *Courier Final Draft*) fell back to the system monospace face | Font stack went straight to `monospace` | Non-Prime Courier faces fall back to the bundled Courier Prime first | unit `fontStack` |
| FMT-13 | `TIME CUT`, `FLASH CUT TO`, `FADE TO` were recognised but got no ending on completion | Completion list shorter than the inference list | One vocabulary | unit "every transition the inference recognizes…" |
| FMT-14 | When a word ended exactly at the right edge of an element, the printed next line started with a space: continuation lines were indented one character (seen in the 1.15.3 sample PDF: a parenthetical's second line at 3.2" instead of 3.1"), and the measured layout could wrap one word differently from the editor | `measureLines` broke *before* the space, moving it to the next line; the editor's pre-wrap textarea lets the space hang at the end of the line | Spaces that do not fit hang at the end of the line (`MeasuredLine.trail`, not drawn); the next line starts with the next word, in the editor's layout, the desktop PDF and the browser PDF fallback | unit "a word that exactly fills the line…"; before/after PDF sample |
| FMT-15 | In the editor, a paragraph whose type changed in place — Tab on an empty Action line (→ Character), Tab on an empty Dialogue line (→ Parenthetical), a ⌘-number shortcut — showed its text in the wrong place: the new cue 2.2" too far right, a parenthetical one letter wide with most of its text hidden. Saved text and PDFs were correct. Same in 1.15.2 and 1.15.3; found in the before/after editor screenshots | The editor textareas combined the element indents (`paddingLeft`/`paddingRight` from `elementCss`) with the shorthand `padding: 0`. React re-sets only the longhand that changed on an update, so after a type change the indents were applied as padding inside the already indented column | Longhand paddings only (`ScriptEditor.tsx`, `FragmentTextarea.tsx`) | template suite group 13 (measures the text's own position, column width and hidden lines after in-place conversions; fails on 1.15.3) |

Two existing assertions changed **because the factory default changed** (disclosed, intent kept):
`automatic-formatting-browser.cjs` now expects `FADE OUT.` for `fade out` under the default, and its "transition endings are
editable template rules" test now switches to the *Colon* rule (and expects `FADE OUT:`), since *Traditional* is the
default; `automatic-formatting.test.ts` names the colon rule explicitly where it tests it. `repair-regressions.test.ts` F01's
synthetic version-1 document is the version-1 factory format (right 2, colon), and the test now also asserts that a
version-2 document is never changed. No test was removed or weakened.

**Correction to an earlier statement.** In my first audit summary I listed "EXT./INT., EXT/INT. and I/E are not recognised"
as a missing feature. That was wrong: typing those prefixes in an Action line already produced a Scene Heading in 1.15.3
(the typing path). Only the suggestion path (`inferElement`) lacked them — FMT-07 above.

## D. Before / after (same keystrokes, each version's own defaults)

`verification/before-after-browser.cjs` types the same keystrokes into a new script (File ▸ New, so each build uses its own
default format) in the 1.15.3 and 1.15.4 renderers; `verification/electron/before-after-pdf.cjs` then exports each build's
document, plus the same 60 lines of filler so it runs to 4 pages, through the real Electron "Export Screenplay PDF". Files in
`verification/evidence-1.15.4/before-after/` (`compare-editor-page1.png`, `compare-pdf-page1.png`, `compare-pdf-page2.png`,
both PDFs, `before-after.json`).

Keystrokes: `ext/int. dock - night` ⏎ · an action line ⏎ · `ANGLE ON SARAH` ⏎ · Tab · `sarah` ⏎ · Tab · `barely audible,
turning away from the window toward the door` ⏎ · a dialogue line ⏎ · `fade out` ⏎.

| | 1.15.3 | 1.15.4 |
|---|---|---|
| Default format of a new script | template v2, parenthetical right margin 3.0", colon endings | template v3, 2.9", traditional endings |
| `ANGLE ON SARAH` | offered as "Possible new character cue" | offered as "Possible camera direction · Use Shot"; stays Action unless accepted |
| `fade out` ⏎ | `FADE OUT:` | `FADE OUT.` |
| Editor: cue after Tab | `SARAH` drawn at 5.9" (2.2" too far right) | at 3.7" |
| Editor: parenthetical after Tab | one letter per line, most of the text hidden | wraps normally at 3.1"–5.6" |
| PDF page 2 header | `THE LAST KEEPER` at the left and `2.` at the right, both 10 pt | `2.` only, 12 pt, right edge 539.9 pt (7.5") |
| PDF wrapped lines after a word that fills the line | start one character in (230.4 pt instead of 223.2 pt; 115.2 instead of 108) | start at the indent (223.2 pt, 108 pt) |

The 1.15.3 app exporting the 1.15.4 measurement documents (`electron-pdf-geometry-on-1.15.3.log`, PDFs in
`pdf-samples-1.15.3/`) shows the same header difference on every page after the first.

## E. Test results (1.15.4 payload)

Payload: `build-1154-final/app`, `payload_sha256 f6d59849040109fddc3c13c4242b97495b88ba75ed002e7d87d18a4781ea3e8b` (the
digest `run-release-tests.py` computes; it equals the digest of the staged app), packed as `app.asar` (93 files, ASAR header
SHA-256 `bf70aa28dee3252c5b2cf7795b616856ff61025235daf24cfd73f3c747a1034b`). Built from commit `255d5a4`; commit `e09dd8f`
changes only one test assertion (formats suite, see below), not application code.

**Release suites** — `release-suites/final-tests.json`, logs beside it. All 18 pass with the standard budgets (typing p95
250 ms, shortcut p95 250 ms, cached word click 500 ms, spelling p95 250 ms, save p95 600 ms):

| Suite | Result | Groups / tests | Measured (Linux Chromium, automation included) |
|---|---|---|---|
| models (node:test) | pass | 240 tests | — |
| story | pass | 15 | 250 pages, typing p50 53 / p95 90 ms |
| editor | pass | 14 | — |
| shortcuts | pass | 14 | p95 99 ms |
| words | pass | 13 | cached word click 227–310 ms |
| spelling | pass | 14 | key event p95 23–34 ms |
| smart-save | pass | 10 | typing p95 116 ms |
| caret | pass | 12 | typing p95 141 ms |
| formats | pass (re-run, see below) | 18 | typing p95 58 ms |
| punctuation | pass | 18 | Return p95 559 ms (budget 843) |
| automatic-formatting | pass | 25 | key handler p95 0.4 ms |
| table-read | pass | 18 | open 597 ms |
| production, collaboration, interchange, repair | pass | 14, 1, 8, 11 | — |
| cross-paragraph | pass | 14 | — |
| templates (new) | pass | 13 | — |

What happened on the way (nothing is hidden by the final table):

- **formats** failed once on the final payload: its check of a changed element indent read the textarea's `paddingLeft`
  (expecting 120 px). That value only existed because of FMT-15. The check now measures where the dialogue text starts
  (page left + 1.25") and that there is no indent padding, and was re-run alone on the same payload
  (`release-suites-formats-rerun.log`).
- **cross-paragraph** D-09 required a page continuation that *starts with a space*; FMT-14 removes exactly that case. It now
  requires a break between two words and asserts that no continuation starts with a space.
- **words** and **story** missed their latency budgets in two earlier runs on this 2-vCPU workspace (cached click 502 ms;
  typing p95 258 ms). Alternating 1.15.3 and 1.15.4 on the same host showed both versions over budget at that time, with no
  difference between them (`latency-investigation/`); a rotation of 1.15.3, 1.15.4 before FMT-14 and 1.15.4 after it gave
  typing p95 medians 88, 85 and 94 ms, after which the whitespace test in the line breaker was made cheaper. On the final
  payload, alternating again: cached word click median 285 ms (1.15.4) vs 289 ms (1.15.3); typing p95 89–115 ms vs
  100–111 ms (`word-click-latency-ab.txt`, `typing-latency-ab.txt`). Physical Mac latency was not benchmarked.
- Two assertions in `automatic-formatting-browser.cjs` and one in `automatic-formatting.test.ts` now name the Colon rule
  where they test it, because Traditional is the new default (section C).

**Real Electron 44.7.0** (under Xvfb, the packed `app.asar`): lifecycle scenarios 12/12 (`electron-lifecycle.log`); editor
and exported PDF agree page by page (7 pages, 18 generated labels; `electron-pdf-parity.*`); PDF geometry for 12 templates
(`electron-pdf-geometry.*`, PDFs in `pdf-samples-1.15.4/`): every element of 11 templates within 2 pt horizontally and 3 pt
vertically of the template, and the header band of every page correct (none on page 1, only the right-aligned page number
on pages 2+, 4–5 pages each); Multi-Camera Sitcom: horizontal positions exact, 8 elements ±6 pt vertically (L-3).

**Editor geometry** (`format-geometry/geometry.json`): every element of every page-layout template (75) is where the template
puts it — box edges within 0.02", gaps within 1.5 pt, line pitch within 0.3 pt, capitals as defined.

**Type check**: the same 23 pre-existing `src` errors as the 1.15.2 baseline, none new.

## F. Native macOS verification

On the Apple Silicon Mac mini (macOS 27.0.1), with a separate test copy (record: `verification/evidence-1.15.4/macos/`):

| Check | Result |
|---|---|
| DMG SHA-256 `f19ac7a7…13a3`, `hdiutil verify` | match; image VALID |
| Read-only mount, Info.plist | 1.15.4, `com.draftcraft.screenplay.studio`, ASAR integrity hash `bf70aa28…` |
| `codesign --verify --deep --strict` (bundle and every nested helper/framework) | valid; ad-hoc outer signature |
| `spctl` | rejected, as expected for an ad-hoc, non-notarized build |
| `app.asar` SHA-256 `2158985d…11df` | identical to the tested payload |
| Test copy in `/tmp` with its own profile, launched through LaunchServices | runs (main, GPU, network, renderer processes); opens the editor; no stderr output |

**Not verified on macOS:** the interactive steps (keystroke sequence of section D, Automatic Formatting settings, PDF
export and its header). The Mac's screen locked right after the launch and macOS blocks window input while locked. They
were run on Linux against the same Electron runtime and `app.asar` (section E). The installer was not run; it replaces the
installed app and needs the owner's go-ahead. IME, VoiceOver, printing and dictation were not tested.

## G. Existing files still open

| What | How | Result |
|---|---|---|
| Documents in every 1.15.3 format | `compat-1154.cjs` builds a document from each of the 80 templates of tag `release-1.15.3` (its own sample text) and opens it with the 1.15.4 model and migration | 80/80 formats valid; 80/80 opened unchanged (no silent migration) |
| `.fdx` files exported by 1.15.3 | same probe: 1.15.3 `exportToFdx`, 1.15.4 `parseFdx` | 80/80 reopen with identical paragraphs and the identical format (DraftCraft metadata); without the metadata 80/80 keep every paragraph and 43/43 screenplay/TV/stage layouts match within 0.01" |
| `.fdx` files saved by Final Draft | six files from rsdoiel/fdx testdata and the Final Draft-style fixture, through the 1.15.4 codec in Chromium (`fdx-real-files.log`) | 7/7 open with their page layout and element positions; the 1.15.3 codec rejects all 7 (`fdx-real-files-on-1.15.3.log`) |
| External FDX / Fountain / RTF / PDF fixtures | interchange suite | 8/8 groups pass |
| Version-1 documents (before spacing rules) | `repair-regressions.test.ts` F01 | upgrade exactly as in 1.15.3; a version-2 document is never changed |
| Going back to 1.15.3 | 1.15.3's `validateFormat` on all 96 1.15.4 formats (`rollback-format-check.json`) | 96/96 accepted; `.draftcraft` projects move both ways. `.fdx` exported by 1.15.4 does **not** open in 1.15.3 (L-6) |

## H. Known limitations and open defects (with reproduction steps)

| ID | Limitation | Reproduce |
|---|---|---|
| L-1 | No two-column (video / audio) layout. Documentary and Commercial use single-column elements (Shot, Caption, Narration, Sound Effect) instead. The layout engine places one element per row; a split-column page needs a new layout mode. | New → Documentary Script; there is no left video / right audio column. |
| L-2 | Radio and Audio Drama put the speaker name on its own line above the speech (BBC radio style prints the name and the first line of the speech on one line). Same reason as L-1. | New → Radio Drama; type a name, press Return, type the speech: the speech starts on the next line at 3.0". |
| L-3 | Multi-Camera Sitcom double-spaced dialogue: the text sits 6 pt lower inside each 24 pt line (CSS half-leading). Editor and PDF agree, so pagination and content are unaffected. | New → Multi-Camera Sitcom; measure the first dialogue baseline against the cue (+6 pt compared with single spacing). |
| L-4 | International Screenplay is the A4 layout with UK English settings; there is no separate international layout standard to follow. Custom Screenplay Format and Custom Studio Format are editable starting points (standard layout; the studio one adds scene numbers), not a particular studio's guide. | Writing Formats → compare A4 Screenplay and International Screenplay. |
| L-6 | An `.fdx` exported by 1.15.4 does not open in 1.15.3 (1.15.3 cannot read Final Draft's conventions — the reason it also rejected files saved by Final Draft). `.draftcraft` projects move between the versions in both directions. | Export FDX in 1.15.4, open it in 1.15.3: "unsupported element or page settings". |
| L-5 | Final Draft header/footer definitions, revision colours and Smart Type lists in an `.fdx` are not converted into DraftCraft layout; unknown sections are kept and reported (existing behaviour). | Open a Final Draft file with a custom header; the header is DraftCraft's default. |
| D-10 | (from 1.15.3) Undo after typing removes one character per ⌘Z. Undo of an automatic change and of a template switch are single steps. | Type a sentence, press ⌘Z repeatedly. |
| D-11 | (from 1.15.3, macOS only, cosmetic) Double-click in the gap after a dual-dialogue block shows a stray system highlight. | See DEFECT-LEDGER-1.15.3.md. |
| — | One user script ("the best ever") was reported without blank lines between speeches. Not reproduced with any built-in template (all speech gaps measured 12 pt). Most likely an older stored format without spacing rules; the file is needed to confirm. | Attach the `.draftcraft` file. |

## I. Deliverables

| Item | Where |
|---|---|
| Repaired source (git history, tags `release-1.15.3`, `checkpoint-before-formatting-work`) | `DraftCraft-Pro-Source.zip` on the disk image; this repository |
| Changelog | `Release-Notes-1.15.4.md`, commit messages from `aae5b53` to the release commit |
| Template-by-template matrix | `TEMPLATE-MATRIX-1.15.4.md` (generated by `verification/template-matrix.ts`) |
| Auto-formatting behaviours | `AUTO-FORMATTING-BEHAVIOURS-1.15.4.md` |
| Test results, including the failures on the way | section E; `verification/evidence-1.15.4/` |
| Before/after samples | section D; `verification/evidence-1.15.4/before-after/` |
| Proof that existing files open | section G |
| Known defects with reproduction steps | section H |
| macOS build | `DraftCraft-Pro-1.15.4-arm64.dmg` (Apple Silicon, ad-hoc signed, not notarized); `SHA256SUMS.txt`, `dmg-receipt.json` and the DMG proofs next to it |
| Build and install | `Build-and-Install-1.15.4.md`; migration notes in `migrations/formatting-1.15.4.md` |
