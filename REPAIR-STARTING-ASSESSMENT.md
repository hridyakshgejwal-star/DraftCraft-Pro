# Starting assessment retained from the supplied repair prompt

This is the supplied audit, not a new verification claim. C/X/S/H have the meanings given by that prompt. The existing 1.15.1 source was reconciled with this assessment.

| Feature area | Starting assessment | Evidence and practical limit |
| --- | --- | --- |
| Core paragraph editing, selection and IME | Partially implemented | C/H: paragraph and edit models pass. S: multiple clipped full-paragraph textareas leave mixed-style editing and general cross-paragraph selection incomplete. |
| Screenplay spacing, indentation and pagination | Partially implemented; defects reproduced | X: missing dialogue boundary gaps; S: separate preview approximation. C: measured fragmentation and keep-with-next models pass. |
| Template browser, apply/switch and custom templates | Partially implemented | C: catalogue validation, conversion, structure application and custom-template privacy pass. H: browser workflows. Live preview/layout parity still needs repair. |
| Enter/Tab, capitalization, headings, parentheses and transitions | Implemented and verified — model scope | C: automatic-formatting, keyboard and default-toggle models pass. Native key routing/IME must be checked in the packaged app. |
| Automatic full stops and question marks | Implemented but unverified in this audit | H: prior punctuation suite. Current punctuation test file cannot load compromise; native blur/close interaction remains unverified. |
| Spelling, space-triggered correction and personal dictionaries | Implemented but unverified in this audit | H: prior spelling suite. Current writing-assistance test cannot load nspell. Test correct names, Unicode and manual overrides. |
| Contextual synonyms and alternatives for correct/incorrect words | Implemented but unverified in this audit | H: prior word suite. Current synonyms test cannot load compromise; WordNet assets also require installation. |
| SmartType, remembered character names and shortcut identities | Implemented and verified — model scope | C: character/shortcut models pass. Duplicate-document identity references are a separate reproduced defect. |
| Custom keyboard shortcuts and profiles | Implemented and verified — model scope | C: conflict, command-routing and recording guard tests pass. H: browser recorder; real Mac accelerators need verification. |
| Smooth caret and motion preferences | Implemented and verified — motion model scope | C: caret interpolation and navigation tests pass. Native refresh-rate, IME and actual selection geometry remain unverified. |
| Inline rich text and editing/print fidelity | Partially implemented | S: run preservation/printing exist; editor textareas cannot display independently styled inline runs. C: unaffected run preservation passes. |
| Page copy, cut, paste and deletion | Implemented and verified — model/transport scope | C: page invalidation, Unicode/metadata clipboard and deletion models pass. Native pasteboard and actual page UI need retesting. |
| Find, Find Next, Replace and Replace All | Broken — source behavior reproduced | X: Replace edits the first token; literal queries act as regex; navigation records paragraphs rather than all occurrences. |
| Scene List, Index Cards and Navigator scene movement | Broken — source behavior reproduced | X/S: downward moves can split the destination scene; three UI routes contain inconsistent splice logic. |
| Navigator saved views, filters, sorting and CSV | Partially implemented | C/H: query and saved-view evidence. Reordering is broken; all live filters, suffix sorting and exported visible columns need UI checks. |
| Script notes, bookmarks and scene comments | Implemented but unverified end to end | C: project/page metadata preservation. H: editor checks. Check actual anchors, navigation and overlay collisions after pagination. |
| Beat Board, resizing, flow lines and outline links | Partially implemented | C: planning insert/link/unlink models pass. Full movement, page-span repair, card geometry and document-copy references need work. |
| Story Map, Story Arc, act markers and Beat Strip | Implemented and verified — model scope | C: defaults-off, anchors, ordering and export models pass. H: renderer checks; long-script responsiveness is inconsistent historically. |
| Native project Save, Save As, autosave and recovery | Implemented and verified — backend scope | C: atomic writes, conflicts, offline destinations, recovery and independent sessions pass. Native dialogs remain unverified. |
| Close / Quit transaction | Partially implemented; failure branches reproduced | X: late revision changes cancel close; localStorage quota errors prevent completeClose even after a native save approval. Physical Mac cause still needs reproduction. |
| File Manager Save As, Duplicate and Revert | Broken / partially implemented | X/S: Save As clones local state; duplicate leaves old character references; Revert reads live local autosave rather than a saved-file baseline. |
| Backups and recent-document information | Partially implemented | S: local snapshots exist, but page counts use paragraph-count estimates and a folder label is not proof of an actual disk destination. |
| Dual dialogue | Partially implemented | C: pairing, source offsets, unequal columns and locked overflow models pass. Complex editing, selection and native print need broader QA. |
| Alternate dialogue takes | Implemented and verified — model scope | C: edited take survives switching, serialization, duplication and deletion. Verify every editor/save/export/Table Read entry point. |
| Page locks, inserted labels and omissions | Partially implemented | C: boundary, reopen, overflow and dual-anchor models pass. Exhaustive relocking/nested insertion/omission workflows are not established. |
| Production revision sets and changed-page exports | Partially implemented | C: named/deletion/structural marks and selected-page output models pass. Full standard FDX revision interoperability is missing. |
| Track Changes and Original/Markup/Final views | Partially implemented | C/H: text/structural accept/reject exists. S: formatting-change records are missing; overlapping changes can require newer-first review. |
| Production tags, categories, aliases and reports | Partially implemented | C: literal tag-all, rebasing and exact split/join preservation pass. General selection, ambiguous structural repair and copy references remain incomplete. |
| Direct cross-paragraph selection and tagging | Missing | S: the active selection/tag command accepts one paragraph range. Later splitting an existing tag is not general multi-paragraph selection. |
| Shared character identities, cast lists and silent cast | Partially implemented | C: canonical rename, exact identity and silent-cast models pass. X: duplication breaks dependent ID references. |
| Reports and character sides | Partially implemented | C: sides membership, active takes, source labels and report counting pass. H: generated PDF checks. Every filter/print option still needs UI verification. |
| FDX and FDXT interchange | Partially implemented | C/H: supported paragraphs, styles, dual containers and retained XML. Full production/template fidelity and real Final Draft round trips remain unverified. |
| Standard FDX alternate/revision workflow decoding | Missing | S/H: native metadata or opaque XML retention does not implement Final Draft’s complete alternate/revision semantics. |
| Fountain and RTF interchange | Partially implemented | C: emphasis/literal escapes/dual pairing pass. Complex nesting, mixed fonts/layout and unsupported metadata require explicit loss handling. |
| PDF text import | Partially implemented | S/H: text extraction and editable review exist. Complex columns are approximate; scanned-image OCR is not bundled. |
| Print/PDF, title pages, headers, footers and page ranges | Partially implemented | C: shared HTML and label/range logic; H: real Chromium PDF evidence. Preview parity, all options and Mac print panels remain unverified. |
| Embedded images and native image clipboard | Partially implemented | C: asset model, resizing and actual IPC MIME/transaction guards pass. X: Combine does not merge referenced source assets; Mac pasteboard needs testing. |
| Script Compare, Combine and raw-text reformat | Broken / partially implemented | X: insert-at-cursor receives no position; image assets are omitted; equal-length replacements report zero changed words; uppercase action is misclassified. |
| Macros and customizable toolbar | Implemented and verified — model scope | C: scoped expansion, conflicts, selection and caret models pass. H: toolbar/browser evidence; verify actual current command entry points. |
| Voice Table Read, casting, playback, highlighting and export | Partially implemented | C: request/audio/cache/export/casting/queue models pass. H: browser tests use substitute speech. Real premium voice quality and Apple voices have not been heard here. |
| Native macOS dictation | Blocked by a specific dependency | S/H: Swift helper and IPC exist, but helper is absent from this Linux-built release; requires a Mac SDK build, permissions and on-device language. |
| AI research, image analysis and advanced writing suggestions | Implemented but unverified with real services | S/C: routes, configuration and selected request guards exist. Real configured-provider/model/output behavior needs testing; no paid generation was performed. |
| Live collaboration | Partially implemented | S/H: authenticated Yjs/WebSocket service and two-client evidence exist. Current test cannot load ws; deployment/TLS and complex concurrent production metadata remain incomplete. |
| Multiple native document windows | Implemented but unverified natively | C: independent coordinator/session/destination tests pass. Real Mac close/quit, clipboard, speech and window isolation remain unverified. |
| Writing statistics, sessions, goals and sprints | Partially implemented | C: real activity deltas and undo/midnight models pass. H/S: sprint records and timers exist. Native idle timing, backup counts and persistent UI accuracy need verification. |
| Cloud metrics / Google Drive integration | Missing or dependency-blocked in the active application | S: metrics explicitly say no sync service; legacy GoogleDriveModal/service code is not mounted by App.tsx. Do not count unused source as a working feature. |
| Themes, modal focus, resizing and accessibility | Implemented but unverified end to end | S/H: theme/overlay infrastructure exists. Real VoiceOver, keyboard reachability, scaling, dark/light collisions and small-window QA remain unverified. |
| Performance on long scripts | Implemented but not consistently verified | H: 274-page story timing attempts recorded 751 ms and 261 ms p95 before a passing retry against a 250 ms budget. No physical M2 benchmark here. |
| ARM64 DMG, installation, signing and migration | Implemented but unverified on a Mac | H: packaged byte/signature/image checks exist. No fresh native launch, Gatekeeper/Apple codesign assessment or notarization is established. |
| Rust information/prototype workspace | Separate prototype, not the active editor runtime | S: retain it and label capabilities accurately. Repair the Electron application that users actually launch. |

