# DraftCraft Pro 1.15.2 — implementation report and change log

This updates the existing Electron 44.7.0 / React / TypeScript application, retaining its identity, project/profile locations, native save workflow and separate Rust prototype. The 1.14 request was reconciled with the supplied 1.15.1 source and installer. The original baseline is recoverable; the archive includes patches against the supplied baseline and recovered repair baseline. Delivery-Manifest.json identifies the source commit and every included file.

**The complete requested desktop scope remains partial.** The matrix identifies implemented, partial, missing and dependency-blocked workflows with UI, persistence, export and verification evidence. The F01–F16 repairs and R17–R25 additional fixes are detailed in the ledger. This is not a claim of complete Final Draft parity.

## Delivered repairs

- Shared screenplay spacing and page-top handling; actual-content template previews; exact-factory versioned migration with recovery checkpoints. Custom/locked layouts are retained.
- Literal Unicode Find/Replace occurrence ranges, metadata rebasing and one-step Undo; whole-scene moves preserve bodies and links across Navigator, Scene List and Index Cards.
- Composition-aware single-flight close, late-save continuation, renewed discard decisions and quota-safe approval; actual File Manager Save As, disk Revert/checkpoint and awaited undoable snapshot restores.
- Independent document identity-graph copies; reachable Combine preview and stable element-boundary insertion with asset/planning/production merge, incompatible-lock refusal and Undo. Within-element insertion splitting remains absent.
- Actual token counts in Compare, conservative reformat inference, selectable/composable Format Doctor fixes retaining supported style runs, actual-layout history counts, reachable Scene List/Index Cards and bounded layout caches.
- Attributed same-text element/style Track Changes, styled Original/Final and correct formatting rejection; current paper/title choices in PDF. Full rich-text editing, combined text/style tracking and cross-paragraph drag workflows remain partial.

Preservation evidence covers writing assistance, shortcuts, caret, templates, Table Read, recovery and undo. Optional story-overlay defaults and existing preferences are retained. The 59 tracked Rust/Cargo files are byte-unchanged. Genuine productivity history is preserved; fresh profiles receive no fictional history. Migrations are in migrations/layout-spacing-v2.md. The first-save location and subsequent autosave workflow remain.

## Verification

All 16 release suites passed: **210 model/backend tests and 205 browser/codec interaction groups**. The fresh recovered-baseline run passed 196 tests before repairs. Baseline-defect observations use isolated baseline execution and source inspection, not a physical Mac. Current runtime: Node 24.19.0 and Linux Chromium 153.0.8010.0; some harness labels retain 151, while repair-results/runtime-environment.json records the actual executable/version/checksum.

| Suite | Passed | Tests / groups | Seconds |
|---|---|---:|---:|
| models | Yes | 210 | 2.6 |
| story | Yes | 15 | 29.0 |
| editor | Yes | 14 | 49.4 |
| shortcuts | Yes | 14 | 34.4 |
| words | Yes | 13 | 26.2 |
| spelling | Yes | 14 | 40.9 |
| smart-save | Yes | 10 | 53.1 |
| caret | Yes | 12 | 24.9 |
| formats | Yes | 18 | 29.7 |
| punctuation | Yes | 18 | 54.4 |
| automatic-formatting | Yes | 25 | 57.1 |
| table-read | Yes | 18 | 38.1 |
| production | Yes | 14 | 24.2 |
| collaboration | Yes | 1 | 2.8 |
| interchange | Yes | 8 | 3.1 |
| repair | Yes | 11 | 25.4 |

Tested staged payload SHA-256: `59e6ec301b88145e7cac990278dccd44bc8ddb1ffd689bf1b7a4f6f6db05246a`.

Evidence includes real Chromium editing/navigation/Undo, actual save/revert/checkpoint files, actual PDF bytes/geometry, external codec fixtures, real audio-pipeline output using Flite and independent concurrent local collaboration clients. Native dialogs/providers are explicitly substituted where needed. None establishes physical Mac input, premium voice quality or an actual Final Draft desktop round trip. Performance is Linux-host-specific; failed attempts and historical timing variation are retained without loosening thresholds. The final run passed the existing thresholds.

The starting assessment and defects are before-state evidence. Current results are in REPAIR-FEATURE-MATRIX.md and REPAIR-DEFECT-LEDGER.md. verification/historical-1.15.1 contains older proofs and reports, not evidence for this payload. Browser screenshots and the downloaded proprietary manual are excluded.

## Personal DMG verification and limits

`DraftCraft-Pro-1.15.2-arm64.dmg` targets **Apple Silicon and macOS 13.0 or later**. It contains the app, hash-checking Install-DraftCraft.command, instructions, source archive, migrations, matrix and evidence. The outer bundle is signed ad hoc, retaining unchanged nested Electron signatures. It is **not Developer ID signed or notarized**, and **has not been installed/launched on a physical Mac**. This Linux build cannot compile the Swift dictation helper; an SDK-equipped Mac and microphone/Speech permissions are required.

All 92 ASAR files match staging; packaged backend/identity-graph sources match source. ASAR SHA-256: `01ee5f7df8a4022a0f45ed61fcf802b4b60b61764cd792d7acb16b039c5f461f`. Header digest: `1c1002e5b594147b9ec4131d77b57db2dfdcb27b362c5e401f408f224726ac42`. Independent Linux checks passed for 13 ARM64 files, 54,394 code-page hashes, 481 resource hashes, 9 resource seals and 14 symlinks; 249 native sections are unchanged. This is not Apple's codesign/Gatekeeper assessment.

The image pipeline checks the HFS filesystem/catalog permissions, every extracted file/link, installer pins and compressed/HFS/master UDIF checksums. The final image-hash receipt is created after the image, outside it, to avoid a circular checksum. Public collaboration hosting/TLS/credentials are operator-supplied. OCR, full standard FDX alternate/revision interchange and full production/style collaboration are not supplied; the matrix records remaining scope.

# DraftCraft Pro 1.15.2 — desktop feature matrix

This repairs the existing Electron 44.7.0 / React / TypeScript application. The app identity, document/profile locations and separate Rust prototype are retained. The 1.14 request was reconciled with the supplied 1.15.1 source. `REPAIR-STARTING-ASSESSMENT.md` preserves the supplied before-assessment; `REPAIR-STARTING-DEFECTS.md` preserves F01–F16. Baseline source archive SHA-256: `544ae118fad838b04533cf39b86cea28d59dd34681fcbe22db57c260a92b91c8`.

**The complete requested desktop scope is not finished.** Statuses apply to the stated subset. Verification is Linux source/model/backend execution, real Chromium interactions, real file writes, real local service clients or actual PDF bytes, as specified. No status implies physical Mac, Apple signature assessment, microphone/speech listening or an actual Final Draft desktop round trip. Cloud and Go are excluded.

The original missing audit dependencies were restored with pinned `npm ci` installations. Fresh unchanged-baseline checks passed 196 tests. The repaired model/backend run and each renderer suite are recorded in `verification/story-results/final-tests.json`, with the exact tested payload SHA-256. `verification/repair-results/baseline-defects.json` records 16 isolated observations from actual baseline functions; F02/F03 before-behavior was additionally inspected in source. Native dialog choices in browser tests are injected; file operations and PDF bytes are real. A menu or field alone is not counted as completion.

| Feature | Current status | Active UI and implementation | Persistence | Export behavior | Evidence and remaining scope |
|---|---|---|---|---|---|
| Core screenplay editing | Partially implemented | Existing ScriptEditor, split/join, Return/Tab and source fragments | Stable paragraph IDs and complete native text | Supported text/semantic formats | Models/editor/production suites. General cross-paragraph drag selection and mixed-style caret editing remain incomplete. |
| Shared pagination and spacing | Partially implemented | production/layout, actual font widths and template boundary gaps; long speech fragmentation | Semantic IDs/ranges; continuation labels stay outside text | Same fragments in editor, preview and native PDF/print | F01–F02 actual DOM/HTML/PDF coordinates, page ranges and 2,000 speech tokens. Full inline mixed-font editing and every custom-font case remain partial/unverified. |
| Template browser/apply/switch/custom formats | Implemented and verified | Existing 80-preset browser; actual-content shared-layout preview with page controls | Factory-only versioned spacing migration and checkpoint; custom/locked layouts retained | Complete native format; supported template subset | Formats suite and migration models; preview includes element 15. House presets are independent adaptations, not proprietary Final Draft template files. |
| Enter/Tab and automatic element formatting | Implemented and verified | Existing intelligent formatting and custom navigation | Existing toggles, profiles and manual element choices retained | Semantic text/types retained | Automatic-formatting/formats/shortcuts suites; manual unsupported types display correctly instead of showing a different dropdown value. Native IME remains unverified. |
| Capitalization, punctuation, headings, parentheses, transitions | Implemented and verified | Existing local rules and independent controls retained | Existing defaults and deliberate punctuation omissions retained | Normal screenplay text | Punctuation/automatic-formatting browser and model tests. Conservative English inference is not perfect semantic understanding. |
| Spelling and personal vocabulary | Implemented and verified | Existing Space correction, click menus and name exclusion | Existing dictionaries and preferences | Chosen replacements enter ordinary text | Real nspell/dictionary assets; spelling suite. Actual Mac input testing pending. |
| Contextual synonyms | Implemented and verified | Existing worker and correct/incorrect-word menus | Writer choices retained | Replacement text exports normally | Real compromise/WordNet assets; words suite. Writer review remains necessary for meaning. |
| SmartType/character memory | Implemented and verified | Existing category/history/extension lists and manager | Project identities, exclusions and shortcuts | Current semantic cues/takes retained | Models/editor/formats/shortcuts suites. Full imported identity workflows remain under the separate partial cast row. |
| Custom shortcut profiles | Implemented and verified | Existing recorder, conflict resolution, modes and routing | Existing profile settings retained | UI excluded from script exports | Shortcut/recording/native-history tests. Native Mac accelerators unverified. |
| Caret, reduced motion and animations | Implemented and verified | Existing mirror, interpolation and presentation layers retained | Existing preferences | UI excluded from exports | Caret/browser tests; no physical high-refresh display or VoiceOver claim. |
| Inline rich-text editing | Partially implemented | Supported runs retained/printed; uniform textareas remain | Native runs and supported style data | Supported FDX/RTF/Fountain emphasis | Models/codecs and unaffected-run tests. Displayed mixed-style text/selection/caret geometry is unfinished. |
| Cross-paragraph selection and clipboard | Partially implemented | Existing paragraph selections, page actions and fragment mapping | Exact split/join and supported clipboard metadata | Page/selected supported content | Editor/page/production tests. General multi-paragraph drag editing/IME selection and direct tagging are unfinished; native pasteboard unverified. |
| Find/next/previous/Replace/Replace All | Implemented and verified | Exact literal UTF-16 occurrences; Unicode boundaries, stale-result guard | Runs, takes, tags, revisions and pending changes rebased; one Undo | Selected take/final text exports | F04–F06 model/UI regressions including repeated terms, punctuation and literal dollar signs. Very large replacement batches require narrowing instead of unbounded work. |
| Scene List/Index Cards/Navigator reorder | Implemented and verified | View menu reaches both previously dormant views; all three use one whole-scene command | Original IDs, bodies and links retained | Scheduling uses real scene spans | F07 unequal-body models and real list/card UI with Undo; Navigator calls the same verified helper. |
| Saved Navigator views | Implemented and verified | Actual sources, saved filters/sort/visible columns/width/order and CSV | Project configuration retained | Visible-column CSV | Production UI/query/reopen tests. Every large custom configuration is not a native test. |
| Notes/bookmarks/summaries/comments | Implemented and verified | Existing editor, navigation and overlay routes retained | Paragraph/scene records retained through tested edits | Supported reports/exports | Editor/story/page/production tests. Physical accessibility and all overlay collisions remain unverified. |
| Beat Board/flow lines/resize/outline links | Partially implemented | Existing planning and Send to Script/link routes retained | Stable IDs/hierarchy; graph-safe copies and detach-on-delete | Hierarchical outline Markdown/JSON | Story/planning/resize tests. Every page-span/movement/repair combination is not complete. No invented scene prefix/time. |
| Story Map/arcs/acts/Beat Strip | Implemented and verified | Existing displays and toggles retained | New-profile optional overlays remain off; enabled settings retained | Existing outline/story exports | Story suite with long scripts and four enabled tools. Performance is environment-specific. |
| Native Save/Save As/autosave/recovery | Implemented and verified | Existing atomic writer/coordinator; first location per project | Native envelopes, destination registry and recoveries | Complete native project | Actual file/coordinator and smart-save tests, including offline destinations and two sessions. Native panels are injected choices, not Mac verification. |
| Close/Quit transaction | Implemented and verified | Composition/blur completion, one flight, valid Save continuation and renewed Discard | Latest approved revision saved/discarded; cache quota cannot revoke durable approval | Complete native project before approval | F03 model and built-renderer real-file tests. Actual window close/Cmd+W/Cmd+Q and parented native dialogs still need a Mac. |
| File Manager Save As/Duplicate/Revert | Implemented and verified | Await actual Save As; graph remapping; disk Revert with checkpoint | Save As preserves title/ID; independent copies; recoverable pre-revert work | Native file written/read, not just cache | F08 graph tests and F09/F10 actual UI/file/recovery tests. Native dialog execution unverified. |
| Browser snapshots/Restore | Implemented and verified | Await adoption; same-project restore uses one transaction, foreign snapshot opens a copy | Checkpoint first; clearly local browser records | Restored native document supplies later exports | Actual Restore Version/Undo UI regression; snapshot folder field is a label, not a filesystem destination. |
| Backups/recents/productivity page counts | Implemented and verified | Shared active layout replaces paragraph estimates | New records persist pageLabels; old backup counts say legacy estimate | Real metrics/labels in supported outputs | F16 long-paragraph/locked-label model and active layout integration. Old history is retained. |
| Dual dialogue | Partially implemented | Existing focused adjacent groups and genuine unequal columns | Group/column/speaker IDs and locks retained | Side-by-side PDF, FDX container and Fountain caret | Production/models/external codec tests. General cross-paragraph editing and all locked edge cases remain unfinished. Table Read is sequential. |
| Alternate dialogue | Implemented and verified | Existing add/select/duplicate/delete routes, including dual dialogue | Active edits committed; unused takes retained natively | Selected take printed/read; labels outside text | B→A→B→reopen and operation/Undo tests. Standard Final Draft alternate interchange absent. |
| Page/scene locks/inserted labels/omissions | Partially implemented | Production anchors/levels/companion anchors and omission/restore controls | Locked identities/labels survive tested reopen/edits | Label ranges and native PDF, including 12A | Layout/production/revision tests. Exhaustive nested insertion/relocking/omitted schedules and real Final Draft parity unverified. |
| Production revisions | Partially implemented | Existing named/dated/colored sets and range/deletion marks | Native sets/metadata separate from Track Changes | Selected-set/revised-page filtering | Revision/report/deletion/PDF tests. Full standard FDX revision workflow absent. |
| Track Changes | Partially implemented | Authors/dates/colors/navigation/review; new same-text element/run-format records and styled Original/Final views | Pending native records; Undoable decisions | Final screenplay; separate read-only review | Two-author/reopen/Undo and serialize/reject-formatting regressions. Combined text+format changes, overlapping dependencies and FDX review remain limited. |
| Production tags | Partially implemented | Real identities/categories/aliases/merge/tag-all and character association | Range rebasing and exact split/join logical groups | Actual scene/tag reports | Models/browser tests. General direct multi-paragraph selection and ambiguous orphan repair remain incomplete. |
| Direct multi-paragraph drag tagging | Missing | No completed general selection-to-range UI | Later-split tag ranges are preserved | Logical split parts count as one occurrence | Not counted as implemented from the data model alone. |
| Shared character identity/aliases/cast/silent cast | Partially implemented | Literal rename/merge, safe ANN/ANNA distinction and cast/order controls | Copy remaps memory/shortcuts/beats/tags/cast/images/voice cues | Cast reports/sides include explicit silent members | Identity/cast/copy/sides tests. Exhaustive imported identity merges and native workflows unverified. |
| Reports and character sides | Partially implemented | Active project geometry/labels, real tags/cast/takes, measured eighths | Source records retained | Sides preserve original page labels; scheduling uses measured spans | Models/UI/actual sides PDF. Every general report option/print combination is not verified. |
| FDX/FDXT | Partially implemented | Existing supported XML subset, retained unknown XML and loss review | Supported settings/styles/notes/dual data retained | Supported standard subset, with limits | Unmodified external Screenplain fixtures. Actual Final Draft desktop round trips unavailable. |
| Standard FDX alternates/revisions | Missing | Full standard semantic decoding/export not implemented | Native extensions/opaque XML are not substitutes | Specific compatibility limits disclosed | Requires supported independent fixtures/implementation and real application validation. |
| Fountain/RTF/TXT | Partially implemented | Existing emphasis/escapes/dual pairing and supported rich RTF | Supported runs/text; original inputs unchanged | Unsupported metadata disclosed by existing review | External codecs/import/export tests. Complex delimiter/font/layout fidelity remains limited. |
| Text PDF import | Partially implemented | Real extraction, repeated header/footer detection and review | Source digest/warnings and editable reconstruction | Reconstructed supported content | External extractable PDF tests. Complex columns approximate; image-only documents require separately provided OCR. |
| Print/PDF/title pages/headers/ranges | Partially implemented | Shared fragments; current paper and saved title choice honored; false specs checklist removed | Document layout/labels retained | Actual PDF bytes, locked ranges, supported images/options | F01–F02 geometry/token/page checks, custom 7×9 PDF, A4 and sides tests. Physical print/save panels and every installed-font/glyph case unverified. |
| Embedded script/title images | Partially implemented | Existing assets/resize/alignment/clipboard guards; graph-safe Combine | Native assets/placements retained | Shared print/PDF geometry | Pixel/reopen/clipboard and F12 tests. Native pasteboard and all title/dual-image combinations unverified. |
| Compare/Combine/Reformat | Partially implemented | Token edits, actual element-boundary insertion, preview/stale check, conservative classification | Linked assets/records merged; source globals retained as native provenance; one Undo | Current base title/format remains active | F11–F14 model/UI tests. Within-element insertion absent; incompatible production lock schedules blocked. Source provenance is native-only. |
| Format Doctor | Partially implemented | Format-aware selectable checks/fix/ignore/next/pre-print; actual boundary repair | Preferences and Undo retained; fixes compose against latest paragraph and preserve supported runs | No guessed locations/times or compliance certification | F15 and multi-issue/rich-run tests. Targeted checks are not exhaustive production certification. |
| Writing history/sessions/goals/sprints | Partially implemented | Existing genuine activity tracking and actual layout counts | Genuine history retained; ambiguous legacy backup/provenance | Existing productivity export | Fresh/import/paste/delete/undo/midnight/project models. Physical idle/session/sprint lifecycle unverified; cloud sync not operational. |
| Macros and toolbar customization | Implemented and verified | Existing scoped triggers/conflicts/caret/next element and real commands | Project macros/profile toolbar order and presentation | Expanded text exports normally | Models and production expansion/Undo/reopen/customization tests. Native accessibility pending. |
| Table Read | Partially implemented | Existing engines/cast/scopes/playback/pronunciation/cache/audio export retained | Native cast/performance/takes; credentials remain private | Existing WAV and configured codec routes | Real audio-pipeline/backend/browser tests. Flite/substitute speech is not premium human acting or Apple voice verification; no real provider listening here. |
| macOS dictation | Blocked by a specific dependency | Existing Swift helper/IPC; absent helper shown unavailable | Permission/language requirements disclosed | Recognized text would become normal script text | Needs macOS SDK build, supported installed on-device language, permissions and physical microphone testing. Not compiled on Linux. |
| AI research/image analysis/suggestions | Implemented but unverified | Existing configured provider routes/request guards retained | User key encrypted locally; no included credentials | Selected result becomes normal text | Model/request checks only. Real account/model/endpoint/quality not verified; no paid request made. |
| Live collaboration | Partially implemented | Actual authenticated Yjs/WebSocket service, approvals/roles/presence/messages/reconnection | Atomic service state and local projects; credentials private | Local export of converged content | Real independent clients and renderer convergence. Public hosting/TLS/credentials not supplied; complex structure/style/production metadata and concurrent IME remain incomplete. |
| Multiple native document windows | Implemented but unverified | Existing independent Electron windows/coordinators retained | Independent destinations/recovery/Undo/state; shared preferences | Per-document export | Two-file/session/window-registry tests. Physical Mac window/quit/clipboard/speech isolation pending. |
| Cloud/Drive synchronization | Missing | Metrics explicitly say no service; legacy Drive modal remains unmounted | No operational document sync service claimed | No simulated cloud success | Requires an active integration, authentication and real service, not merely a preference. |
| Themes/focus/scaling/accessibility | Implemented but unverified | Existing themes/portals/focus layers retained | Existing preferences | UI excluded from exports | Browser suites check practical dialogs/editor. VoiceOver, physical scaling and every small-window collision unverified. |
| Long-script performance | Implemented but unverified | Removed full-fragment serialization and repeated font/style setup | No screenplay data change | Layout remains shared | Current suite measurements retained; older 751/261 ms p95 failures against 250 ms remain historical evidence. No M2/8 GB benchmark or claim of consistent timing. |
| ARM64 DMG/install/signing | Implemented but unverified | Genuine HFS/UDIF image and hash-checking installer | Same identity/profile; installer retains previous app | Exact tested ASAR/backend and verified runtime | Linux byte/native-section/signature/catalog/checksum proofs. No physical Mac install/launch, Apple codesign/Gatekeeper, Developer ID or notarization claim. |
| Rust workspace | Implemented but unverified | Preserved separate prototype, outside actual runtime | Original Rust files retained | Not linked into this Electron build | Preservation hashes; no Rust/Metal desktop capability claim. |

Official desktop references: [FD13 macOS manual](https://www.finaldraft.com/downloads/manuals/fd13-user-guide-mac-exported.pdf), especially sections 1.7.9 (Track Changes), 1.9.15 (paragraph spacing), 1.9.18–19 (dual dialogue), and the page/scene locking chapters; [official heading/Shot blank-line guidance](https://kb.finaldraft.com/hc/en-us/articles/15575250899732-Should-there-be-two-blank-lines-between-transitions-and-scenes). The manual was downloaded from its publisher and inspected; its digest/section evidence is recorded without redistributing the manual. Additional preserved official functional links are in verification/historical-1.15.1/PRODUCTION-FEATURE-MATRIX.md. These references do not certify interoperability.


# DraftCraft Pro 1.15.2 — defect ledger

Before-source observations come from the preserved version-13 source archive and supplied audit, not a physical Mac. After evidence is in `verification/repair-regressions.test.ts`, `repair-browser.cjs`, `smart-save-browser.cjs` and release-suite logs. **Every row still lacks physical Mac verification.** P0 denotes potential incorrect edits/data loss; P1 denotes materially incorrect workflow/layout. This ledger describes concrete repairs, not complete Final Draft parity.

| ID / priority | Before / reproduction fixture | Delivered behavior and active route | Implementation / migration | Regression evidence |
|---|---|---|---|---|
| F01 P1 | Successive speakers/action after dialogue had zero gap; heading/Shot spacing inconsistent | Actual writing pages count boundary gaps once; cues/parentheticals stay attached | Shared paragraphGap/layout; factory spacing version 2, exact-match old-factory migration with checkpoint; custom/locks skipped | Actual DOM gaps/indents, migration models; same PDF coordinates/source fragments/pages |
| F02 P1 | Template preview used a separate first-12-element approximation | Writing Formats previews actual shared-layout content with page controls | FormatStudio uses documentLayout/layoutPageHtml and font invalidation | Existing element 15 geometry vs editor; actual exported PDF comparison |
| F03 P0 | Close canceled on late revision or redundant cache failure after native approval | One close flight awaits composition/blur; valid Save consent follows later work; Discard renewed; cache quota cannot revoke durable approval | Hook/main/coordinator session/revision/token guards retained; legitimate close acknowledgement clears watchdog; cancel restores work/focus | Late Save/Discard models; actual files with quota, composition, repeated close, cancel/offline/retry; native window events unverified |
| F04 P0 | Find train in The train arrives.; Replace changed The | Selected exact occurrence replaced | UTF-16 source ranges plus complete source-text stale guard; transaction Undo | Actual first/second occurrences and Undo; unaffected runs/tags/takes/change records |
| F05 P0 | Replace All . in A.B produced ___; [ threw regex error | Default search/replacement is literal, including replacement dollars | Escaped search expression; Unicode boundaries; no advertised regex mode | Isolated before functions; punctuation/Unicode/dollar model and UI cases |
| F06 P1 | train train train counted as one match | Every occurrence navigates/selects independently | Occurrence list; synchronous visible selection and safe refresh | Repeated same-paragraph match ranges and next/replace UI |
| F07 P0 | Unequal scene downward moves separated the destination heading/body | All routes move whole scene spans | One shared command used by Navigator, Scene List and Index Cards; stable IDs | Unequal-body before functions, object-preservation model, reachable list/card UI and Undo |
| F08 P0 | Duplicate remapped memory but left beat/tag/cast references | Independent project copies remap full known identity graph | Shared renderer/native graph clone; recovery copies use it too | Character/beat/tag/cast/shortcut/image reference checks and deep ownership |
| F09 P0 | File Manager Save As only changed local state and announced success | Native picker/write result awaited; canceled operation reports no success | Suggested filename is separate from title/ID; native location retained only after actual save | Actual File Manager UI writes second file; original unchanged on cancel/save; title/ID/hint verified |
| F10 P0 | Revert loaded live autosave cache | Revert reads actual saved disk file and preserves current work first | Native atomic checkpoint labeled Before Revert; new coordinator session adopts disk | Model/file/recovery and actual Revert UI tests |
| F11 P0 | Insert mode had no insertion position and could do nothing; mode was not exposed | Reachable mode inserts at the saved focused element boundary after preview | Stable source anchor; offset zero inserts before, otherwise after; one full-document Undo | Missing-anchor error and actual middle-script insertion/Undo. Within-element splitting remains absent |
| F12 P0 | Combined image paragraphs retained missing asset IDs; unnumbered scenes could disappear | Graph-safe asset/identity/planning/production merge and explicit loss/block policy | Deep imported IDs; aliases/cast/voice merges; native source-global provenance; incompatible lock schedules blocked | Imported actual image reference survives UI Combine; models verify native refs/unnumbered text/lock refusal |
| F13 P1 | He walks home. vs She runs away. reported zero words changed | Reports 3 additions/3 deletions from actual token edits | Bounded exact token distance; oversized comparisons fail with an explanation | Exact-count/unchanged models; existing comparison UI retained |
| F14 P1 | A DOOR OPENS silently became Character | Ambiguous uppercase text stays Action with review; known names and active format used | Shared inference; no invented prefix/time; preview before appending, one Undo | Ambiguous/known-name/prose models; original input unchanged |
| F15 P1 | Spacing check only trimmed whitespace | Explicit screenplay boundary repair changes actual layout; other fixes compose | Selectable doctor rules; custom fonts/indents retained; rich runs preserved; latest-state transaction | Multi-fix/rich-run/layout model and actual doctor control |
| F16 P1 | One oversized paragraph reported one backup page | New backup/recent/productivity counts use actual layout/labels | Optional pageLabels persisted; old backup counts explicitly legacy estimates | Long paragraph/12A model; active page-count integration |
| R17 P1 | Scene List/Index Cards existed only as dormant source | Both reachable under View | Existing components retained; editor remains mounted for Undo/state | Both live menu/reorder/Undo regressions |
| R18 P0 | Comparison/Combine import spread the destination’s private records into a new source | Source imported into a fresh blank document or validated native envelope | One importer; original source untouched; supported parsed metadata retained | Native source/image Combine and independent import/codecs suites; exhaustive malformed-source fields remain limited |
| R19 P1 | Formatting changes had no attributed pending review record | Same-text element/run edits now have author/time/color and review | Optional native formatting payload; explicit absent-run restoration; styled Original/Final | Save/serialize/reject restores original type/text/runs; combined text+format tracking remains partial |
| R20 P1 | Full fragments/styles repeatedly serialized during typing | Layout measurement/fragment identities cached; repeated canvas font assignment avoided | Bounded weak caches, no text/persistence change | Long-script suite measurements retained; no target-Mac consistency claim; further row-cache pruning work remains |
| R21 P0 | Implicit format materialization could create a dirty document merely on opening | Missing format stays implicit on unchanged open; explicit saves materialize current settings | Only exact explicit legacy factories auto-upgrade with checkpoint | Blank/new/unchanged save/recovery cases and migration models |
| R22 P0 | Browser Restore could announce success before adoption | Restore awaited; same project Undoable, foreign snapshot independent | Pre-restore checkpoint; await boolean adoption | Actual Create Snapshot→edit→Restore Version→Undo |
| R23 P1 | Print controls could reset custom paper/title choice; static FD specs checklist was misleading | Current document paper and title choice honored; output describes actual settings | Per-export layout override remains explicit; no project reset | Actual 7×9-inch PDF dimensions/title suppression and editor/PDF page agreement |
| R24 P1 | Out-of-template shortcut could leave dropdown displaying the first supported type | Inspector includes the active manually selected type | Preserve manual choices, no document migration | Full element-shortcut suite passes |
| R25 P0 | Meaningful nontext work could be mistaken for untouched blank | Images/notes/bookmarks/macros/review/title metadata count as meaningful work | Coordinator content decision expanded; default empty project remains silent | Blank decision model, file/window suites; full native metadata-only close matrix remains unverified |

Remaining independent gaps are listed by feature in `REPAIR-FEATURE-MATRIX.md`: general cross-paragraph editing/tagging, full inline rich text, complete standard FDX alternates/revisions, full production/style collaboration, exhaustive locked/dual/image cases, real premium-voice listening and native Mac validation are not declared complete.


# DraftCraft Pro 1.15.2 — build and installation

This delivery includes `DraftCraft-Pro-1.15.2-arm64.dmg`, the updated source, tests, migrations and verification evidence. The application remains Electron/React/TypeScript; the separate Rust prototype is preserved. The personal build targets **Apple Silicon and macOS 13 or later**. It is ad-hoc signed, without Developer ID signing or notarization, and has not been launched on a physical Mac.

## Install the supplied DMG

Open the DMG in Finder, quit any running DraftCraft Pro, and double-click `Install-DraftCraft.command` inside the mounted disk. The installer verifies the supplied file hashes and symlinks, copies the app to a writable Applications folder, signs and verifies the installed copy using macOS codesign, preserves the previous app in a timestamped folder, and opens the update. Scripts and preferences retain their existing locations. The installer makes no network request and needs no Node.js or Rust installation.

If macOS blocks the personal installer, follow the instructions in `Getting-Started.txt` inside the disk image. The package hashes establish integrity, not an Apple-verified publisher identity. The supplied installer’s native execution, Gatekeeper behavior and physical Mac launch remain unverified here.

## Build on macOS

Use Node.js 24, Xcode Command Line Tools and the macOS SDK:

```sh
npm ci
npm --prefix desktop ci
npm run lint
node desktop/build.cjs
node desktop/package.mjs darwin arm64
```

For the full personal DMG workflow, run `bash desktop/build-dmg-macos.sh` on a Mac. The script builds, verifies the ad-hoc bundle and creates/verifies the disk image. Only shell syntax was checked here; the macOS steps remain unexecuted.

The packager prints the resulting application path. Use the actual printed path when verifying or creating a DMG with macOS hdiutil. The existing app identity is `com.draftcraft.screenplay.studio`; projects and preferences keep their existing locations. Retain a copy of the prior app and original project before replacing an installed build.

The existing packaging workflow signs ad hoc. Developer ID signing and notarization are not configured; no Apple credentials are supplied. On the Mac, verify the actual output with `codesign --verify --deep --strict`, inspect Gatekeeper results, launch it, open/save/close a copy of a real project, test native printing, dictation/IME and multiple windows. A completed public distribution needs the owner’s Apple signing/notarization setup.

The macOS build compiles the existing Swift Speech/AVFoundation dictation helper. It requires a supported installed on-device language, microphone/Speech permissions and physical microphone testing. Linux leaves the helper unavailable and reports the missing dependency; no cloud recognition fallback is silently enabled.

The first source-only delivery’s packaging guard refusal is retained in `verification/historical-1.15.1/completion-macos-build.log` as historical evidence. The follow-up DMG build recovered the previous ARM64 Electron runtime, verified it against its package manifest and native signature hashes, replaced the application ASAR, updated its integrity digest/version, and signed the changed outer bundle with the pinned rcodesign tool. The unchanged nested runtime signatures are retained. Independent Linux checks validate all native code-page/resource hashes and compare native sections with the previous runtime; these are not Apple's codesign or Gatekeeper assessment.

For that recovery route, use the versions/checksums in `verification/packaging-tools.json`, apply `verification/libdmg-permissions.patch`, and build the HFS/UDIF tools described in `verification/PACKAGING-TOOLS.md`. Stage the application with `desktop/build.cjs`, set `RCODESIGN` to the verified tool, and run `desktop/repackage.mjs` with distinct input/output `.app` paths. `verification/verify-dmg-asar.mjs` compares every packaged file and backend source with staging. `verification/build-production-dmg.py` requires the final tests plus current native/ASAR proofs before creating the image, and verifies HFS catalog permissions, all extracted bytes/links and UDIF checksums. macOS SDK compilation and native runtime checks remain separate steps.

## Reproduce checks

The application dependencies are pinned in the existing lockfiles. The esbuild/Vite peer conflict is corrected, so ordinary `npm ci` works without `--legacy-peer-deps`.

Models/backend:

```sh
node --import tsx --test verification/*.test.ts verification/advanced-suggestions.test.cjs verification/shortcut-recording.test.cjs verification/native-history.test.cjs verification/project-files.test.cjs verification/table-read-backend.test.cjs verification/document-windows.test.cjs verification/collaboration.test.mjs
```

For browser tests, provide Playwright 1.62.1 (locally or through NODE_PATH) and a Chromium executable. This run used Chromium 153.0.8010.0 on Linux. If needed, install test-only Playwright in a separate tools directory and install its browser there. Then build/stage the application and run:

```sh
BROWSER_EXE=/absolute/path/to/chromium python3 verification/run-release-tests.py
```

The runner accepts BROWSER_EXE or DRAFTCRAFT_CHROMIUM consistently and records the digest of the actual staged application payload. Current results are in `verification/story-results/final-tests.json`; each suite has a separate log. Test-native dialogs/providers are explicitly substituted. Actual PDF rendering, text extraction, file writes and two-client synchronization run independently of those substitutions. Flite through FFmpeg tests the existing audio pipeline; it is not a human-voice quality evaluation.

## Services and compatibility

`collaboration/README.md` and its Dockerfile provide the real service/configuration. Public hosting, TLS and credentials must be supplied by the operator. Production review/tag/locking metadata and private voice/API state remain local. Local writing remains available without a session.

Read `PRODUCTION-FEATURE-MATRIX.md` for partial and missing workflows. External fixtures retain their provenance/license. No Final Draft desktop application is available here, so supported codec tests do not establish complete Final Draft interoperability. OCR is not included. Existing optional speech providers/models/credits are not bundled.

## 1.15.2 repair evidence

Read REPAIR-FEATURE-MATRIX.md, REPAIR-DEFECT-LEDGER.md and migrations/layout-spacing-v2.md. The full runner now has 16 suites, including the repair-specific built-renderer/PDF suite. Native dialog choices are injected in Linux tests; the native file coordinator, actual file writes, PDF bytes and local collaboration service are exercised. The final image checksum receipt is external because it is produced after the image. Old 1.15.1 proofs are explicitly historical.

For Linux reproduction, retain the exact saved prior ARM64 runtime and its installer manifests, verify its hashes, then use the pinned tools. Known unsealed host-copy temporaries must be absent from the actual HFS catalog, baseline manifest and CodeResources before removing them; never delete sealed resources to make verification pass. The current cleanup receipt retains the two discovered host temporaries and subsequent full checks.
