# DraftCraft Pro 1.13.0 — Automatic Screenplay Formatting

An update to the existing **DraftCraft Pro 1.12.0** application for **Apple Silicon,
macOS 13 or later**. The same application identity, Electron/React textarea editor,
project format and existing profile are retained. All four automatic features are
operational and On by default. A previously saved capitalization choice is retained.

## Implemented in the real editor

- **Sentence capitalization:** a newly typed sentence initial in Action, Dialogue,
  General and supported descriptive elements becomes uppercase immediately.
  Common abbreviations, initials/acronyms, decimals, ellipses, URLs, file components,
  pasted text and composition do not become false sentence boundaries. Existing
  text and proper capitals are preserved. Undo or a deliberate lowercase replacement
  retains the writer's choice. The native caret stays at the correct UTF-16 offset.
- **Scene headings:** supported INT/EXT/INT./EXT./I/E prefixes normalize their
  periods and spacing; the active template supplies casing and the location/time
  separator. For example, `int living room evening` + Return becomes
  `INT. LIVING ROOM - EVENING`. Multiword locations, US-101-style internal hyphens,
  repeated separators and user-defined time labels are handled. No dash is inserted
  between prefix and location. The time separator waits for a completion boundary,
  protecting location words such as DAYCARE and NIGHTINGALE while typing.
- **Parentheticals:** Cmd+4, toolbar, command palette, Format menu and contextual
  Tab/Return navigation create `()` with the actual insertion selection `[1,1]`.
  Selected text is wrapped, remains selected and keeps valid inline styles.
  Existing brackets are preserved. Typing the outer closing parenthesis advances
  past it; intentional nesting remains possible. Return can leave from inside the
  final closer. Empty pairs support paired Backspace and disappear when changing
  element, returning to Dialogue or leaving an unused new pair for another paragraph.
  Parentheses that have been deliberately edited remain ordinary text.
- **Transitions:** exact recognized whole-line transitions complete in uppercase
  with their template ending. Default colon mode includes `FADE OUT:`. Conventional
  mode uses `FADE OUT.` and `FADE TO BLACK.`; punctuation-preservation mode adds no
  ending. These rules persist in the project and custom template definition.
  Existing author endings and custom transition text are preserved. Dialogue and
  ordinary phrases such as “cut to the chase” remain prose.
- **Integrated editing:** element recognition, case and structure run before prose
  punctuation. Headings, cues, parentheticals, transitions and structural labels
  remain exempt from sentence periods/questions. SmartType accepts before Return
  navigation. Heading suggestions retain their prefix, location hyphens, template
  separator and time field. Existing spell correction, synonyms, semantic styles,
  pagination, revision data, annotations and smooth visual caret remain in use.
- **Writer control:** Return plus structural completion is one undoable edit.
  Undo/Redo restores native selection and paragraph identity. Removed or undone
  structural punctuation is remembered in a bounded per-paragraph omission list,
  including native save/reopen. Changed words permit a fresh completion. Midline
  splits, selected-text deletion, paste/drop and composition remain normal editing.
  Finishing a line on blur does not steal destination focus.

| Writer input/action | Result |
| --- | --- |
| `what happened? i thought you were here.` | `What happened? I thought you were here.` |
| `where is he` + Return in Dialogue | `Where is he?` |
| `int bedroom day` + Return | `INT. BEDROOM - DAY` |
| New Parenthetical | `()` with the real caret inside |
| `cut to` + Return in Action | `CUT TO:` followed by Scene Heading |
| `fade out` + Return in conventional mode | `FADE OUT.` |

## Settings and persistence

**DraftCraft Pro → Settings → Editor → Automatic Formatting** and the renderer's
Settings menu expose the same live controls:

| Control | New-profile default |
| --- | --- |
| Automatically Capitalize Sentences | On |
| Automatically Format Scene Headings | On |
| Automatically Insert Parenthetical Brackets | On |
| Automatically Format Transitions | On |

Each switch independently stops its automatic transformation without rewriting
existing pages. Preferences persist in the existing editor-preference store and
apply immediately. Template uppercase display remains a semantic style even when
an automatic text-transform switch is Off. Explicit SmartType selections and
formatting commands remain available.

**Format → Intelligent Auto-Formatting → Transition Endings → Apply Writing
Settings** saves the transition rule in the current project. It is also available
from Format → Elements and retained by custom templates. Existing template files
without the optional rule migrate to colon mode. Explicit writer punctuation is
preserved when a template changes. Whole-document format conversion remains an
explicit existing workflow; typing never changes the selected template.

## Tests of the delivered app

TypeScript checking and the production desktop build passed. All **134 model,
bridge and filesystem tests** and **150 browser interaction groups across eleven
suites passed freshly against the renderer extracted from the signed application**.
The full raw logs are included; no recovered prior-release test summaries substitute
for checks of this payload.

| Suite | Tests / interaction groups | Seconds |
| --- | ---: | ---: |
| models | 134 | 1.2 |
| story | 15 | 26.5 |
| editor | 14 | 52.0 |
| shortcuts | 14 | 30.7 |
| words | 13 | 24.6 |
| spelling | 14 | 35.7 |
| smart-save | 7 | 46.2 |
| caret | 12 | 24.3 |
| formats | 18 | 29.4 |
| punctuation | 18 | 42.7 |
| automatic-formatting | 25 | 61.7 |

The **25 new browser groups** exercise the real textarea, native selection ranges,
actual key navigation, Cmd shortcuts, toolbar and palette, the menu append history,
all four On/Off controls, older capitalization preferences, prefix and dash timing,
custom separator/time SmartType, parenthetical nesting and paired deletion, Return,
Undo/Redo, manual omissions, native save/reopen, transition-rule persistence,
composition simulation, focus changes and long scripts. Fourteen new model tests
check the corresponding boundary/style/selection rules. Legacy shortcut-only text
preservation scenarios explicitly turn off automatic text transformations; default
On behavior is checked by the new interaction suite.

The other suites verify page actions, Beat Board, story tools, the 80-template
library, explicit format conversion and Undo, customizable shortcuts, spelling,
synonyms, autosave/recovery, printing/export and smooth caret behavior. Native
project file tests use the packaged project writer and real temporary `.draftcraft`
files; native panels are substituted.

The new stress case used **2,000 paragraphs / 222
pages**, retaining **120 rapidly typed characters**, one visual
caret and exact saved paragraph data. Key-handler p95 was
**0.30 ms**; total automated typing took
**6289 ms** including renderer and automation overhead.
The existing 250-page story case measured typing p50
**63 ms**, p95 **102 ms**. These are Linux
Chromium measurements, not physical Mac benchmarks or imperceptible-latency claims.
Current checks use their original default budgets; no new timing allowance was
introduced for this release.

## Native and archive integrity

- ASAR archive: **86 files**, byte-identical to staging and backend source.
- Header SHA-256: `f7c1cc0be799d7a2b8afffb93ab232692adb1338072f3572e3cbb6d913a041a0`.
- Tested payload SHA-256: `7b3cb99cca62f0465dba34ffd171d4aa897816509d76cbdecdadeb6a5e4858ee`.
- Independent checks passed for **13 ARM64 binaries**,
  **54,394 code-page hashes**, **31
  special slots**, **471 resource hashes**,
  **9 nested code seals**, **9
  resource seals**, **14 symlinks** and
  **249 unchanged native sections**.
- The verified unchanged Electron runtime retains its valid nested signatures;
  the changed outer application is ad-hoc signed. Large runtime copies are byte
  checked before signing. This is not Developer ID signing or Apple notarization.
- The DMG independently verifies decompression/checksums, HFSX consistency, stored
  permissions, extracted bytes, symlinks and installer pins. Final image results
  and checksums are appended below after assembly.

## Actual application files changed

- `src/editor/automaticFormatting.ts`
- `desktop/Getting-Started.txt`
- `desktop/build.cjs`
- `desktop/main.cjs`
- `desktop/package-lock.json`
- `desktop/package.json`
- `desktop/package.mjs`
- `src/App.tsx`
- `src/components/EditorSettings.tsx`
- `src/components/FormatStudio.tsx`
- `src/components/MacOsMenubar.tsx`
- `src/components/ScriptEditor.tsx`
- `src/editor/preferences.ts`
- `src/formats/model.ts`
- `src/types/desktop.d.ts`
- `src/types/script.ts`
- `src/utils/smartType.ts`

No application source files were removed. **128 application/build source files**, including **7
Rust/workspace files**, are byte-identical to 1.12.0. The punctuation analyzer,
shortcut model, template catalogue, native project writer, save coordinator,
preload bridge and renderer file hook are unchanged. The new integration uses
their existing APIs. Verification scripts, tests, documentation and versioned
packaging instructions were also updated. The preservation proof lists exact files.

## Remaining limits

English boundary and scene/transition rules are deterministic assistance, not
perfect understanding of grammar, location names, intent or stylization. A heading
whose location genuinely ends in DAY or NIGHT can be ambiguous at completion;
Undo/removal or the individual Off control preserves a deliberate choice. Common
supported prefixes and time labels are recognized; unknown formats stay editable.
The existing conservative English automatic punctuation engine keeps its earlier
scope. No paid or cloud language service is required for these features.

Physical macOS launch, Finder mounting, Apple codesign/Gatekeeper assessment,
native file panels, physical IME, VoiceOver, 120 Hz displays and Apple Silicon
memory/performance testing were unavailable here. Composition was simulated in
Chromium. This personal build is **not Apple-notarized or Developer ID signed**.

Existing broader layout/import limits remain: single oversized paragraphs are
not split across editor page inputs; proportional-font pagination is estimated;
complete production dual-dialogue, locked-page and continuation behavior is
incomplete; FDX/Fountain/RTF compatibility is partial; PDF import is not implemented.
The Rust workspace remains a prototype alongside the existing Electron/React GUI.
These are not represented as newly completed capabilities in this update.

## Installation and rebuilding

Open **DraftCraft-Pro-Automatic-Formatting.dmg** and run
**Install-DraftCraft.command** once. The existing installer verifies the package,
backs up an existing app, installs and locally re-signs it with macOS tools, verifies
it and opens it. Subsequent launches use Applications → DraftCraft Pro. Documents
and the existing profile are retained. No Node.js, Rust or development server is
needed to use the packaged app. Getting-Started.txt describes this personal build.

For development: `npm ci --legacy-peer-deps`, `npm ci --prefix desktop`,
`npm run lint`, `node desktop/build.cjs`. The macOS packaging workflow remains
`desktop/package.mjs`; an existing valid runtime can be updated with
`desktop/repackage.mjs`. Fresh release checks use
`verification/extract-verify-payload.cjs`, `verification/run-release-tests.py` and
`verification/verify-macos-package.py`. Linux image assembly is reproducible with
`verification/assemble-automatic-formatting.py` and
`verification/build-automatic-formatting-dmg.py`, using the documented packaging
tools and permission-preservation patch.
