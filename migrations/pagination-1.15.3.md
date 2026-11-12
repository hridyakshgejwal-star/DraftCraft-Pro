# Pagination changes — 1.15.3

**No document data is migrated.** The native project envelope stays version 1, studio metadata stays
version 2, and no paragraph text, run, label or setting is rewritten when a 1.15.2 project is opened.
Pages are computed at layout time, so the changes below take effect the first time a project is shown,
printed or exported in 1.15.3, and they are reversed by opening the same file in 1.15.2.

## What can change on the page

| Change | 1.15.2 behaviour | 1.15.3 behaviour | Defect |
|---|---|---|---|
| Speaker resumes after action in the same scene | The editor drew a small "(CONT'D)" hint below the dialogue; the PDF printed nothing | The layout generates `NAME (CONT'D)` on the cue line, after the name, in the editor, the preview and the PDF. It follows the format's existing `continuations.continued` option and is never added to the character text. A cue the writer already typed as `(CONT'D)` is not doubled. Extensions such as `(V.O.)` do not change the speaker. New scenes, different speakers and dual dialogue do not get it. | D-03 |
| `(MORE)` and the next page's `NAME (CONT'D)` | Right-aligned at the dialogue edge | Placed at the Character element's indent and alignment | D-03 |
| Character cue at the bottom of a page | One line was always reserved for `(MORE)`, even when the whole speech fitted, which could push the speech to the next page and leave the cue alone | The `(MORE)` line is reserved only when the speech really splits; a cue never stays alone at a page bottom | D-07 |
| Split element at a page break | Could leave a single line on the next page | Never leaves one widow line (moves one more line across when that is possible) | D-07 |
| Canvas text measurement | Measured with the bare font name; if the font was missing, the browser fallback for measurement and for display could differ | Measurement, editor CSS and print share one family list (`'Courier Prime', monospace`) | D-04 |

Consequences for existing scripts: page counts and page breaks can differ slightly from 1.15.2 (typically a
line or a cue moving across a break). Page locks are still honoured: locked page-break anchors and inserted
labels (12A and similar) come from the stored lock records, which are unchanged; the existing lock regression
tests pass on 1.15.3 (models suite). If an exact 1.15.2 page match is required for a production draft that is
already distributed, lock pages in 1.15.2 before upgrading.

## Verification

* Unit tests: `verification/repair-1153.test.ts` (D-03 cue placement and suppression rules, D-04 font list,
  D-07 cue/one-line-speech and widow cases, text preserved across breaks).
* Real Electron 44.7.0 export: `verification/electron/pdf-parity.cjs` opens a native project, exports through
  Export Screenplay PDF (`printToPDF`) and compares every PDF page with the editor page (count, first/last
  words, and every generated `(MORE)`/`(CONT'D)` label). Run on Linux under Xvfb; not run on macOS.
* Not verified: physical macOS fonts and printers, and comparison against Final Draft output.
