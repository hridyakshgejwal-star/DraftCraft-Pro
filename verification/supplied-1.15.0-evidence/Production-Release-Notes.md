# DraftCraft Pro 1.15.0 — production workflow update

This updates the supplied **1.14.0 Electron/React/TypeScript application**, retaining the editor and the separate Rust prototype. It delivers working, tested subsets of the requested production workflows. It does **not** claim complete Final Draft parity. The accompanying `PRODUCTION-FEATURE-MATRIX.md` identifies implemented, partial, unverified and blocked scope by UI, implementation, persistence, export and evidence.

The installable personal build targets **Apple Silicon ARM64, macOS 13.0 or later**. It is **ad-hoc signed, without Developer ID signing or notarization**. No physical Mac launch, native print dialog, microphone/IME/accessibility test or actual Final Draft desktop interoperability test ran in this Linux environment.

## Working implementation

- Shared measured layout splits long Action/Dialogue into visual fragments while retaining semantic paragraph IDs and full UTF-16 source text. The editor, native HTML print/PDF, Navigator, report queries and planning index use that layout. MORE/CONT'D/scene labels remain outside editable text. A real Chromium PDF comparison verifies that a long speech lands on the same pages without lost or duplicated words.
- Production Studio operates on actual native project data: persisted page anchors and inserted labels, controlled lock levels, scene numbering/omission, named dated revision sets and ranges, authored editorial changes, reusable tag identities/aliases/categories/ranges, scene casts and saved Navigator result views. Page-range inputs support labels such as 12A. Track Changes stays separate from production revisions.
- Dual dialogue pairs focused adjacent speeches rather than modifying the script's last paragraph. Group IDs include cues, parentheticals and dialogue; independent columns handle unequal lengths and unlocked page overflow. Table Read describes and uses sequential playback.
- Alternate dialogue commits edited active takes before switching or saving. Blank add, duplicate, delete and selection share editor Undo. Take labels remain outside text; the selected take prints and reads, while unused takes stay in the native project.
- Track Changes records authors, timestamps, configured colors, text replacements and paragraph insertion/deletion. Previous/next, accept/reject/all, read-only original/markup/final review and undoable decisions work with the project. Newer overlapping changes need review first; formatting-change tracking and FDX review interoperability remain outside the verified subset.
- Literal character rename avoids ANN/ANNA and regex-punctuation errors. Current Navigator/SmartType/cast/Table Read identity paths preserve IDs and assignments. Linked beat, marker and script title/description fields propagate; Send to Script asks for element and location and never invents INT/EXT/DAY/NIGHT. Outline export preserves lane/marker hierarchy.
- External FDX/Fountain fixtures exercise standard dual-dialogue structures, ordinary text, parentheticals and Unicode. Opaque unsupported XML is retained with warnings. RTF import retains supported emphasis and colors. Export review discloses native-only and unsupported data before producing an interchange copy.
- PDF import uses a bundled PDF.js worker, real text extraction, repeated-edge detection and an editable classification review. It preserves the original file and records a source digest/warnings. Scanned PDFs have a clear no-text/OCR requirement; OCR is not included.
- Format Doctor has format-aware selectable checks, ignore/next, optional pre-print checking and composed undoable fixes. It does not invent scene locations/times or claim 100% compliance. Reports use active shared geometry, locked labels, actual tags and cast records.
- Fresh statistics start empty. Ambiguous legacy history is backed up and labelled, not silently erased. Actual deltas, undo/redo, dates, imports/project baselines, active time and sprint segments replace fictional activity. A cloud-sync preference is explicitly not an operational sync service.
- Project macros have scoped text triggers/shortcut conflict checks, expansion/caret placement and optional next elements. The command toolbar supports persistent command selection/order/removal/reset and icon/text presentation. Embedded script/title assets have real ingest, proportional width/alignment, native persistence and shared print placement. Image clipboard exchange uses a DraftCraft image record.
- Native document windows have independent save/close coordinators and local-document slots, while preferences remain shared. Two real coordinators/files verify isolation; full physical Mac multiwindow/quit/Table Read isolation remains unverified.
- An actual authenticated Yjs/WebSocket service supports host/join, approval, edit/view permissions, actual presence/messages, bounded updates, atomic state persistence and reconnect. Independent clients converge after concurrent/offline edits. Two actual production-renderer clients also share edits and undo only their local transaction. No writers or successful synchronization are simulated. Public hosting/TLS remains operator setup; production and private voice/API metadata stay local.

## Remaining acceptance gaps

- Mixed inline-font textarea/caret geometry, physical IME/accessibility and cross-fragment drag selections need more work/verification. Complete locked boundaries inside dual-dialogue groups, deletion-only revision marks and complex omission/relocking cases are not complete production parity.
- Full Final Draft alternate/revision/template interoperability, Fountain rich emphasis and complete RTF font/layout fidelity are unverified or incomplete. Multi-column PDF reconstruction is approximate.
- Cross-paragraph tag anchoring, every structural split/merge case, character-side output, every report option and planning deletion-link repair need further work. The matrix distinguishes these from tested text/identity workflows.
- Native multiple-window behavior and all image/title/clipboard/print gestures need Mac QA. Collaboration covers screenplay/planning text and stable records; production metadata, complex concurrent structural/global-format changes and collaborative IME behavior are not claimed complete.
- **Dictation is blocked in this delivered Linux-built DMG:** the Apple Speech/AVFoundation helper source and IPC/editor integration exist, but the helper must be compiled with the macOS SDK and tested with microphone/Speech permissions and an on-device language. Start is unavailable with that specific reason. No online recognition fallback is silently enabled.
- Existing Table Read neural models, premium API keys/credits and listening quality are not bundled or newly validated. Existing real audio/export regressions use substituted provider/macOS transport and actual Flite/FFmpeg audio.

## Verification

**182 model/backend tests and 186 browser/codec interaction groups passed across all 15 final suites.** The unchanged 1.14 baseline was separately tested before modification. Timing includes browser automation on Linux and does not establish Apple Silicon or 120 Hz performance.

| Suite | Tests / groups | Seconds |
|---|---:|---:|
| models | 182 | 2.4 |
| story | 15 | 32.5 |
| editor | 14 | 52.6 |
| shortcuts | 14 | 40.0 |
| words | 13 | 30.4 |
| spelling | 14 | 45.7 |
| smart-save | 7 | 48.7 |
| caret | 12 | 27.0 |
| formats | 18 | 30.4 |
| punctuation | 18 | 61.0 |
| automatic-formatting | 25 | 68.6 |
| table-read | 18 | 37.7 |
| production | 11 | 23.0 |
| collaboration | 1 | 3.3 |
| interchange | 6 | 3.3 |

Exact tested application payload SHA-256: `cfefd8d71dacae95ce33a0bb601d9b33ee24b7e22f85a579c581d728ccdfe495`. ASAR header SHA-256: `042ee5dc90975f901bf7c6124e098bc0ca6940a8993b33f981dd6411eb5ef58c`. All **91** ASAR files match staging; backend sources match the packaged payload.

Independent native integrity checks passed for 13 ARM64 Mach-O files, 54,394 code-page hashes, 481 resource hashes, 9 resource seals, 14 symlinks and 249 unchanged native sections. These checks are not Apple's codesign/Gatekeeper assessment. The supplied runtime's unchanged nested signatures are retained; the changed outer application is signed ad hoc.

Source preservation: **no application source files removed**, 162 application/build files unchanged, including all 61 Rust/workspace files. The punctuation analyzer, automatic-formatting engine/preferences, template catalog/model, shortcut model and core Table Read synthesis/audio modules remain byte-identical to the baseline. Regression suites cover their integration with the changed editor.

## Install and reproduce

Mount `DraftCraft-Pro-Table-Read.dmg` and run `Install-DraftCraft.command`. The existing installer verifies hashes/links, preserves the previous installed app, installs and locally signs/verifies the copy on the Mac. Project files and preferences remain in their existing locations. See `Production-Build-and-Install.md`, `Production-Dependencies.md`, `collaboration/README.md` and `Table-Read.md` for reproducible builds, optional dependencies, privacy and service setup.

Core build: `npm ci`, `npm --prefix desktop ci`, `npm run lint`, `node desktop/build.cjs`. On a Mac, `node desktop/package.mjs darwin arm64` uses the existing packaging/signing workflow and compiles the optional Speech helper. This environment used `desktop/repackage.mjs` with the verified supplied runtime and rcodesign, then independent ASAR/native/HFS/UDIF checks.

### Application/build files changed or added

- `desktop/Getting-Started.txt`
- `desktop/build.cjs`
- `desktop/main.cjs`
- `desktop/package-lock.json`
- `desktop/package.json`
- `desktop/package.mjs`
- `desktop/preload.cjs`
- `desktop/repackage.mjs`
- `desktop/save-coordinator.cjs`
- `desktop/table-read-ipc.cjs`
- `src/App.tsx`
- `src/components/EditorCaret.tsx`
- `src/components/FormatDoctorModal.tsx`
- `src/components/MacOsMenubar.tsx`
- `src/components/NavigatorSidebar.tsx`
- `src/components/OutlineEditor.tsx`
- `src/components/PageActions.tsx`
- `src/components/PrintAndPdfModal.tsx`
- `src/components/ProductionReportsModal.tsx`
- `src/components/ProductivityModal.tsx`
- `src/components/ScriptEditor.tsx`
- `src/files/model.ts`
- `src/files/useProjectFiles.ts`
- `src/formats/interchange.ts`
- `src/main.tsx`
- `src/story/model.ts`
- `src/tableRead/model.ts`
- `src/types/desktop.d.ts`
- `src/types/productivity.ts`
- `src/types/script.ts`
- `src/utils/fdxCodec.ts`
- `src/utils/formatDoctor.ts`
- `src/utils/fountainCodec.ts`
- `src/utils/pageActions.ts`
- `src/utils/pagination.ts`
- `src/utils/pdfExportEngine.ts`
- `src/utils/productivityStorage.ts`
- `src/utils/reportsGenerator.ts`
- `src/utils/screenplayFormats.ts`
- `desktop/dictation-ipc.cjs`
- `desktop/native/Dictation.swift`
- `desktop/native/build.sh`
- `desktop/production-print.cjs`
- `desktop/window-registry.cjs`
- `src/collaboration/CollaborationPanel.tsx`
- `src/collaboration/document.ts`
- `src/collaboration/useCollaboration.ts`
- `src/production/CommandToolbar.tsx`
- `src/production/DictationPanel.tsx`
- `src/production/FragmentTextarea.tsx`
- `src/production/ImagePanel.tsx`
- `src/production/InterchangeReview.tsx`
- `src/production/MacroPanel.tsx`
- `src/production/PdfImportDialog.tsx`
- `src/production/ProductionPanel.tsx`
- `src/production/SendToScriptDialog.tsx`
- `src/production/TrackPreview.tsx`
- `src/production/activity.ts`
- `src/production/images.ts`
- `src/production/layout.ts`
- `src/production/macros.ts`
- `src/production/model.ts`
- `src/production/pdfImport.ts`
- `src/production/planning.ts`
- `src/production/print.ts`
- `src/production/production.css`
- `src/production/queries.ts`
- `src/production/rtf.ts`

Additional deliverables include the deployable `collaboration/` service/configuration, versioned studio metadata and legacy normalization, production/reference fixtures and regression tests, dependency licenses, feature matrix and build documentation. Full test logs/proofs are in `Verification/` on the disk image and `verification/` in the source archive. Browser screenshots are internal QA only and are excluded.
