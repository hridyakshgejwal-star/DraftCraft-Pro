# DraftCraft Pro 1.15.1 — implementation report

**This delivers working repairs and additional workflows in the existing 1.14-derived application. The full requested feature set remains partially implemented. An installable personal ARM64 DMG is supplied with this follow-up delivery.** The matrix below identifies the remaining work; the source should not be described as complete Final Draft parity.

The supplied source was already 1.15.0. Its 182 model/backend tests passed before editing. Its original application/runtime identity and separate Rust workspace were retained; the current pass continues that work rather than recreating the app.

## Changes in this pass

- Shared dual-dialogue layout now honors persisted boundaries for both columns and retains source ranges through overflow/reopen. Inserted labels stay unique. Embedded dual-column images retain proportional bounds.
- Deletion-only and whole-paragraph production revisions retain point/deletion metadata and appear in selected revision-page exports. Locked boundary deletions retain revision-set information.
- Real character sides are available from the Reports workspace: cast selection, explicit non-speaking membership, preview, text/HTML export and native PDF/print. Sides retain original labels, scene geometry and active dialogue takes.
- Tags follow exact paragraph splits/joins, including a range crossing a split; reports count its parts as one logical occurrence. Ordinary rich-text edits retain unaffected supported emphasis.
- Fountain retains supported emphasis and escaped literals, forces character/action identities where needed, exports outline levels and pairs a dual caret with the preceding speech even when a third speaker follows. RTF retains supported colors and strikeout as well as emphasis. Remaining losses are explicitly disclosed.
- System-image copy/paste uses a bounded MIME allowlist and one clipboard transaction containing the real image and reusable project record. The existing project-asset pipeline normalizes/persists pasted pixels.
- Reports receive the active native document in both entry routes. Unnumbered scene counts, locked CSV labels, title-page credits and sides labels are corrected. Deleted planning links detach without deleting script text; orphaned markers remain exportable and outline children retain hierarchy.
- The clean-install esbuild/Vite conflict is fixed. Application version is 1.15.1; core identity/defaults are retained. Metadata migration and explicit build/test instructions accompany the source.

## Verification

All 15 release suites passed. Recorded so far: 196 model/backend tests and 191 browser/codec interaction groups.

| Suite | Passed | Tests / groups | Seconds |
|---|---|---:|---:|
| models | Yes | 196 | 9.5 |
| story | Yes | 15 | 38.4 |
| editor | Yes | 14 | 69.4 |
| shortcuts | Yes | 14 | 57.9 |
| words | Yes | 13 | 34.8 |
| spelling | Yes | 14 | 52.1 |
| smart-save | Yes | 7 | 50.8 |
| caret | Yes | 12 | 29.5 |
| formats | Yes | 18 | 37.1 |
| punctuation | Yes | 18 | 68.9 |
| automatic-formatting | Yes | 25 | 80.6 |
| table-read | Yes | 18 | 44.5 |
| production | Yes | 14 | 30.7 |
| collaboration | Yes | 1 | 4.0 |
| interchange | Yes | 8 | 4.1 |

Tested staged payload SHA-256: `2da447fc9cce4f41bc62c66ca05c49a0e3415385c06e32fa86cbe292890ff118`. Node 24.19.0, Playwright 1.62.1, Chromium 153.0.8010.0, Linux x64. No physical Mac, Apple Speech, Gatekeeper, native save/print dialog, premium provider listening or actual Final Draft desktop test is claimed.

## Personal DMG verification

`DraftCraft-Pro-1.15.1-arm64.dmg` contains the updated application, `Install-DraftCraft.command`, current instructions, feature matrix, source archive and verification records. It requires Apple Silicon and macOS 13.0 or later. The changed outer app is signed ad hoc; the unchanged nested Electron runtime signatures are retained. Developer ID signing and notarization are not configured. The native dictation helper is not compiled in this Linux build.

Every one of the 91 ASAR files matches the staged payload. All packaged backend sources match source. The ASAR header integrity digest in Info.plist is `07ae1cb6ad7b8750ab76a6a37d1a129bdb832d0aaf36b7bbd398a297acd46e20`. Independent Linux checks pass for 13 ARM64 native files, 54,394 code-page hashes, 481 resource hashes, 9 resource seals and 14 symlinks. All 249 native sections match the previous runtime. These checks do not establish Apple's codesign/Gatekeeper assessment or a physical Mac launch.

The image builder verifies the HFS filesystem, stored catalog modes, every extracted file/link, installer pins and compressed/HFS/master UDIF checksums. Its final image-hash receipt is generated after the image, outside that image. The previous source-only packaging refusal and old native proofs remain explicitly historical. Current evidence uses the `dmg-` prefix.

Long-script timing varied on this Linux host: the initial concurrent run measured 751 ms p95 and the first isolated retry measured 261 ms against the unchanged 250 ms target. Every attempt and the final isolated result are retained in `verification/dmg-test-attempts.json`; a passing retry is not a guarantee of consistent timing. `dmg-code-equivalence-proof.json` establishes that only Getting-Started.txt changed in the staged payload since the earlier complete passing run: all executable code and assets are identical. This is Linux automation, not a Mac performance claim.

# DraftCraft Pro 1.15.1 — feature matrix

This is a continuation of the supplied Electron/React/TypeScript application. The requested audit baseline was 1.14.0; the current supplied source was already 1.15.0, derived from that baseline. The existing implementation was retained and repaired. The Rust workspace remains a separate prototype.

**The complete requested Final Draft-style scope is not finished.** Working subsets, additional fixes and remaining gaps are distinguished below. “Verified” means the stated automated Linux/Chromium evidence, rather than a physical Mac or an actual Final Draft application test. Menu presence alone is not evidence.

| Feature | Status | UI and implementation | Persistence | Export behavior | Evidence and remaining scope |
|---|---|---|---|---|---|
| Existing editing, templates and writing assistance | Implemented and verified | Existing editor, template browser, SmartType, spelling, synonyms, punctuation and element automation | Existing profile and project preferences retained | Existing supported interchange subset | Model and editor/formats/words/spelling/punctuation/automatic-formatting suites. Defaults and optional story overlay choices retained. |
| Caret, shortcuts, themes and animation | Implemented and verified | Existing caret mirror, shortcut routing and theme controls | Existing preferences retained | Caret/UI excluded from exports | Caret and shortcuts suites. Physical Mac IME, accessibility and high-refresh behavior remain unverified. |
| First-save location, autosave, recovery, undo | Implemented and verified | Existing native file coordinator, atomic writer, first-location and close decisions; transaction history | Native project, recovery and per-window destinations | Complete native project | Project-file, native-history and smart-save suites exercise actual files with substituted native dialogs. Physical Mac close/quit remains unverified. |
| Shared measured pagination | Partially implemented | Shared layout in editor, print/PDF, Navigator and reports; long paragraphs retain semantic IDs and fragment ranges | Source text and UTF-16 offsets retained; generated labels outside text | Chromium PDF uses the same fragments | Real multi-page PDF/source-boundary comparison passes. Inline mixed-style textarea/caret geometry and long cross-fragment drag selection are not complete. Physical IME remains unverified. |
| Production page locking | Partially implemented | Pages & Scenes captures identities/anchors, inserted pages and unlock levels; new companion anchors retain both dual columns | Version-2 studio page locks, levels, companion anchors and omission/revision data | Locked labels and label ranges retained, including visible labels in sides PDF | Overflow/reopen models, actual lock UI and dual-column regressions pass. Exhaustive nested insertion-level/relocking/omission combinations are not established production parity. |
| Scene numbers and reversible omission | Partially implemented | Stable scene IDs, locked numbers, inserted suffixes and omission/restore controls | Original scene text retained | Omitted heading shown; omitted body excluded | Scene numbering/omission models. Complex imported production numbering still needs Final Draft/Mac testing. |
| Named production revisions | Partially implemented | Named/date/color sets and changed ranges; deletion-only and whole-paragraph deletion marks now retained | Native sets, range marks and deletion text; separate editorial review records | Set-filtered pages, including point/deletion marks and omitted-page revision metadata | Revision and deletion regressions pass. Complete standard FDX revision interchange remains absent. |
| Dual dialogue | Partially implemented | Focused adjacent speech groups, real unequal-length columns and new locked-column anchors | Stable group, column and speech IDs | Side-by-side native PDF; standard FDX container and corrected Fountain caret pairing | Middle-script, long-source, lock/reopen and external codec tests. Overlapping/complex manual edits still need broader native QA. Table Read remains sequential. |
| Alternate takes | Implemented and verified | Add/select/duplicate/delete; active text committed before switching/saving; controls also available in dual dialogue | All takes retained in native project | Selected take printed/read; labels excluded from text | B → A → B → reopen browser regression and undoable operation models. Unused takes in Final Draft itself are not verified. |
| Track Changes | Partially implemented | Real authors, dates/colors, previous/next, individual/all accept/reject and original/markup/final review | Pending text/structural change records survive reopening; review decisions undoable | Final screenplay text; separate read-only review views | Two-author and structural review regressions pass. Earlier overlapping changes require newer-first review; formatting-change tracking and FDX review interchange are incomplete. |
| Production tags | Partially implemented | Real identities/categories, selected ranges, aliases, merge, tag-all, character associations and removal | Anchors follow ordinary edits and exact split/join transactions; split parts share one logical range identity | Real scene/tag reports and logical occurrence counts | Tag-all/reopen and split/join/Unicode models. Ambiguous structural edits and direct multi-paragraph range selection remain incomplete. |
| Direct cross-paragraph drag tagging | Missing | The editor selection route currently supplies one paragraph range | Existing tags spanning an exact later split are retained | Split records report as one logical occurrence | No completed general multi-paragraph selection-to-tag UI in this delivery. |
| Saved Navigator views | Implemented and verified | Actual result sources, filters, sorting, column visibility/width/order and CSV | Project configuration retained | Visible result CSV | Saved view/reopen browser regression. Reports workspace now receives the active project rather than a reconstructed default-layout document. |
| Shared character identities and scene casts | Partially implemented | Literal canonical rename, ANN/ANNA protection, punctuation-safe identity, explicit silent cast and ordering | Memory IDs, aliases, assignments and cast membership retained | Cast reports and character sides include explicit silent membership | Identity/cast models and sides tests pass. Exhaustive imported identity merges/native workflows remain unverified. |
| Beat/outline/script links | Partially implemented | Linked field propagation, lanes, insertion locations and chosen elements; deletion now detaches stale links while retaining text | Stable beat/marker/scene IDs; retained content and orphaned marker export | Hierarchical Markdown/JSON; correct child outline level; no invented slugline details | Planning models and story suite. Full page-span/deletion repair UI and every movement case remain incomplete. |
| FDX / FDXT | Partially implemented | Existing importer/exporter, standard paragraphs/runs/dual containers, opaque retention and loss review | Supported native data and retained unsupported XML | Supported standard subset and explicit limits | Unmodified external Screenplain fixtures. Actual Final Draft desktop round trips and full template/production interchange are unverified. |
| Standard FDX alternate/revision decoding | Missing | DraftCraft metadata and opaque XML retention do not implement Final Draft’s full alternate/revision workflow | Original/native data preserved where available | Specific loss/compatibility report | No new genuine Final Draft application interoperability claim is made. |
| Fountain / RTF | Partially implemented | Fountain caret now pairs the preceding speech even with a third speaker; emphasis and literal marker round trips; RTF emphasis/color/strikeout | Supported runs survive ordinary edits | Supported emphasis retained; unsupported element identities/colors disclosed for Fountain | External codecs plus new rich round trips. Complex delimiter nesting, mixed RTF font/layout fidelity and all third-party applications are not fully supported. |
| Text PDF import | Partially implemented | Bundled PDF.js extraction, header/footer removal, preview and element review | Source digest/warnings; editable reconstructed text | Reconstructed supported elements export normally | External text PDF extraction passes. Multi-column reconstruction is approximate. OCR is not included; no-text PDFs report that requirement. |
| Reports and character sides | Partially implemented | Existing reports use active layout/labels and real tags/casts; new whole-scene sides in Reports | Source project retained; side selection is a per-view choice | Sides text, self-contained HTML, native PDF/print; original page labels and selected takes retained | Actual browser sides and actual Chromium sides PDF pass. Unnumbered scene counts and CSV labels corrected. Every general report print/option combination is not verified. |
| Whole-scene character sides | Implemented and verified | Select one/more real character identities, optional silent cast, preview, text/HTML/PDF/print commands | Native project data supplies content and original geometry | Unrelated scenes blanked on shared source pages; dual dialogue and active take preserved | Source model, built-renderer UI and real PDF checks. Native print/save dialogs themselves are substituted. |
| Format Doctor | Partially implemented | Format-aware selectable checks, fix/ignore/next, composed fixes and pre-print option | Check/ignore preferences and undo retained | No compliance certification or guessed locations/times | Multi-issue and format models; existing UI integration retained. Checks are targeted, not exhaustive production certification. |
| Writing statistics | Partially implemented | Empty fresh history, actual deltas/session activity/goals/sprint records | Genuine history retained; ambiguous legacy backup/provenance | Existing productivity export | Fresh/import/paste/deletion/undo/midnight/project models. Sprint UI/physical idle timing need further QA. Cloud synchronization is not operational. |
| Macros and toolbar | Implemented and verified | Scoped triggers, conflict checks, caret/next element, real toolbar commands and customization | Project macros; existing profile toolbar preferences | Expanded text exports normally | Actual editor expansion/Undo/reopen and toolbar browser checks. Existing defaults retained. |
| macOS dictation | Blocked by a specific dependency | Existing Swift Speech/AVFoundation helper source and narrow IPC/editor commands | Language/session behavior in native integration | Recognized text would enter the screenplay | Requires macOS SDK/helper build, installed on-device language, permissions and a physical Mac. No compiled helper or microphone verification is supplied from Linux. |
| Multiple documents | Implemented but unverified | Existing independent Electron windows, save/close coordinators, renderer slots and local state | Independent projects, recovery, destinations and undo; shared preferences | Each document exports independently | Actual two-file/coordinator isolation tests pass. Full native window/quit/Table Read isolation remains unverified on a Mac. |
| Embedded images | Partially implemented | Persistent assets, width/alignment and new system-image clipboard route; dual-column image placement retained | Native assets and placements; copy includes reusable project metadata and real image bytes | Shared print/PDF geometry and proportional bounds | Actual browser pixels/reopen and exact IPC-source transport/guard tests. Native macOS pasteboard and all title-page layout cases remain unverified. |
| Collaboration service | Partially implemented | Actual authenticated Yjs/WebSocket host/join, approval, roles, presence/messages and reconnection | Atomic server state, credential hashes and local projects | Local export of converged content | Independent real clients and two real renderers converge; view role is checked. Public hosting/TLS is not deployed; complex structural/IME concurrency and production metadata sync remain incomplete. No simulated writers. |
| Installable Mac artifact and signing | Implemented but unverified | 1.15.1 ARM64 DMG with a hash-checking installer; existing Electron runtime and app identity retained | Existing projects/profile locations retained; installer preserves prior app | Genuine HFS/UDIF disk image; changed outer app signed ad hoc | Current ASAR/native/image proofs verify packaged bytes, native signatures/sections, catalog modes, links and image checksums on Linux. Physical Mac install/launch, Apple's signature assessment and Gatekeeper remain unverified. No Developer ID signing or notarization; native dictation helper still requires a Mac build. |

## Official functional references

Final Draft 13 desktop scope only; Cloud and Go are excluded. Existing proprietary assets/templates are not copied.

- [FD13 macOS manual](https://www.finaldraft.com/downloads/manuals/fd13-user-guide-mac-exported.pdf)
- [Page locking](https://kb.finaldraft.com/hc/en-us/articles/27817054455828-How-do-I-lock-or-unlock-script-pages-and-use-the-locking-tools)
- [Dual dialogue](https://kb.finaldraft.com/hc/en-us/articles/27675427097748-How-do-I-use-dual-dialogue-side-by-side-dialogue)
- [Alternate dialogue](https://kb.finaldraft.com/hc/en-us/articles/27710778760852-How-do-I-add-alternate-dialogue)
- [Mores and continueds](https://kb.finaldraft.com/hc/en-us/articles/27747514444180-How-do-I-modify-or-remove-Mores-and-Continueds-CONT-Ds)
- [Track Changes](https://kb.finaldraft.com/hc/en-us/articles/15573791756180-Can-Final-Draft-track-changes-when-more-than-one-person-works-on-a-script)
- [Production tagging](https://kb.finaldraft.com/hc/en-us/articles/27796033807124-How-do-I-tag-an-item-in-a-script)
- [Cast lists](https://kb.finaldraft.com/hc/en-us/articles/27674105947028-How-do-I-generate-and-modify-a-Cast-List)
- [Fountain syntax](https://fountain.io/syntax/)
- [Electron ClipboardItem](https://www.electronjs.org/docs/latest/api/clipboard-item)


# DraftCraft Pro 1.15.1 — build and installation

This delivery includes `DraftCraft-Pro-1.15.1-arm64.dmg`, the updated source, tests, migrations and verification evidence. The application remains Electron/React/TypeScript; the separate Rust prototype is preserved. The personal build targets **Apple Silicon and macOS 13 or later**. It is ad-hoc signed, without Developer ID signing or notarization, and has not been launched on a physical Mac.

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

The first source-only delivery’s packaging guard refusal is retained in `verification/completion-macos-build.log` as historical evidence. The follow-up DMG build recovered the previous ARM64 Electron runtime, verified it against its package manifest and native signature hashes, replaced the application ASAR, updated its integrity digest/version, and signed the changed outer bundle with the pinned rcodesign tool. The unchanged nested runtime signatures are retained. Independent Linux checks validate all native code-page/resource hashes and compare native sections with the previous runtime; these are not Apple's codesign or Gatekeeper assessment.

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
