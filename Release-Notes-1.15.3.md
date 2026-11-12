# DraftCraft Pro 1.15.3 — release notes

Repair release of the existing DraftCraft Pro desktop app (Electron 44.7.0, Apple Silicon). Same app, same
bundle identity, same project format and data locations as 1.15.2. Built and tested on Linux, then checked on an
Apple Silicon Mac running macOS 27.0.1 (image, signature, launch, editing, save, close/quit, crash recovery, PDF
export). **Ad-hoc signed, not notarized**; the installer script itself was not run on the Mac.

## Fixed

**Closing and quitting** (P0)
* Closing any document window no longer raises a main-process error (`Object has been destroyed`). This
  affected every close, Cmd+W and Quit in 1.15.2.
* Clicking the Dock icon after the last window was closed opens a new window instead of failing.
* If the editor crashes, your text is written to a recovery copy immediately and a dialog offers **Reload
  Editor** or **Close Window**. If the editor stops responding during Close, a dialog offers **Keep Waiting**
  or **Close Window** (a recovery copy is kept). Recovery copies are offered again on the next launch.

**PDF export** (P0)
* Export PDF no longer fails with "Another print job is being prepared" when the live preview is still
  rendering; export requests now wait their turn and outdated previews are skipped.

**Page layout**
* Notes, scene comments and review prompts no longer cover script text. They are small markers in the right
  page margin; click one to open it. The annotations bar no longer floats over the pages.
* Alternate-take controls and left scene numbers no longer cover dialogue or the bookmark ribbon.
* `NAME (CONT'D)` for a speaker who resumes after action is now generated on the cue line and printed in
  PDFs. `(MORE)` and the next page's `NAME (CONT'D)` sit at the character indent.
* A character cue is no longer left alone at the bottom of a page, and a split element never leaves a single
  line on the next page.
* Text is measured with the same font family list that the editor and the PDF use.
* A speech that continues on the next page no longer repeats the previous page's last line at the top of the new
  page (and no longer hides its own last line) when the page break falls between two words. Found on macOS; 1.15.2
  had the same problem. PDFs were not affected.

**Editing across elements**
* Backspace at the start of an element joins it to the previous element; Delete at the end joins the next one.
  Joining with an empty element removes the empty element and keeps the other element's type.
* Arrow keys move between elements; Up/Down keep the horizontal position.
* Shift+Arrow, Shift+Click and dragging select across elements. Type over the selection, delete it, press
  Return, cut, copy or paste; element types are kept. Escape cancels.
* Pasting copied elements or screenplay-formatted text creates real elements.
* Command-A selects the current element; press it again to select the whole script (also Edit ▸ Select All).
  Escape cancels it and leaves the caret where you were.
* Return inside bold, italic or underlined text keeps the style on both halves.

**Typing speed**
* In long scripts only the element being edited is redrawn on each keystroke; 1.15.2 redrew every element of
  the script. In the 250-page test script with all four story tools enabled (three runs each), median keystroke
  latency fell from 119–149 ms to 59–68 ms and p95 from 205–252 ms to 104–124 ms (Linux container, headless
  Chromium; Mac timing not measured).

## Behaviour changes to be aware of

* Pagination of existing scripts can differ slightly from 1.15.2 (generated `(CONT'D)`, cue/widow rules).
  No document data changes. See `migrations/pagination-1.15.3.md`.
* Delete at the end of an element now joins the next element (it did nothing in 1.15.2).
* Command-A now has two steps (element, then whole script).

## Known limitations

See `FEATURE-MATRIX-1.15.3.md` and `UNRESOLVED-EXTERNAL-DEPENDENCIES.md`. In short: native macOS checks cover the
items above but not the installer script, IME, VoiceOver or printing; Undo after typing still removes one character
per press (as in 1.15.2); on macOS a double-click in the blank space under a dual-dialogue block shows a stray
selection highlight on other lines until the next click (cosmetic); no Developer ID signature or notarization, dictation needs a macOS build, mixed-style inline display remains
partial, IME composition across elements is untested, and AI/collaboration/cloud services need external
accounts or hosting.
