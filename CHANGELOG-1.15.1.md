# DraftCraft Pro 1.15.1 — implementation report

**This delivers working repairs and additional workflows in the existing 1.14-derived application. The full requested feature set remains partially implemented. No new installable macOS artifact is supplied.** The matrix below identifies the remaining work; the source should not be described as complete Final Draft parity.

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
| models | Yes | 196 | 2.5 |
| story | Yes | 15 | 31.0 |
| editor | Yes | 14 | 49.4 |
| shortcuts | Yes | 14 | 37.1 |
| words | Yes | 13 | 28.8 |
| spelling | Yes | 14 | 43.4 |
| smart-save | Yes | 7 | 47.3 |
| caret | Yes | 12 | 26.1 |
| formats | Yes | 18 | 32.0 |
| punctuation | Yes | 18 | 64.0 |
| automatic-formatting | Yes | 25 | 74.1 |
| table-read | Yes | 18 | 38.4 |
| production | Yes | 14 | 25.2 |
| collaboration | Yes | 1 | 3.0 |
| interchange | Yes | 8 | 3.0 |

Tested staged payload SHA-256: `6e61d17814d27dc836f8506cbada191dacd62d1cafc148a43d2086a0a49c83fa`. Node 24.19.0, Playwright 1.62.1, Chromium 153.0.8010.0, Linux x64. No physical Mac, Apple Speech, Gatekeeper, native save/print dialog, premium provider listening or actual Final Draft desktop test is claimed.
