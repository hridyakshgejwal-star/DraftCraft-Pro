MASTER PROMPT — DRAFTCRAFT PRO: CLOSE THE REMAINING GAPS WITH FINAL DRAFT 13 (target version 1.17.0)

CONTEXT
- Project: DraftCraft Pro 1.16.2, a macOS (Apple Silicon) screenwriting app built with Electron 44.7.0, React and
  TypeScript.
- Work in the existing code. Do not restart or rebuild from scratch.
- Do not lose or migrate away any user data. Projects, settings and recovery copies must keep working, and 1.16.x
  project files must open unchanged.
- Reference: Final Draft 13 (13.0 to 13.5), from its documentation, release notes and App Store description.
- Already done, do not redo: the customizable toolbar (with groups and drag and drop), the Outline Editor timeline,
  the Beat Board, Navigator 2.0 (custom tabs, Locations, Outline, the scene table with resizable columns), Structure
  Lines with settings, Page/Normal/Speed views, Focus, Typewriter, Midnight/Dark/Light/System appearance, writing
  stats and streaks, the sprint timer, revisions, Track Changes, page locking, reports, tagging, Table Read,
  collaboration over a local network, FDX/Fountain/PDF import and export, the templates (Easy-Write, beginners,
  micro/vertical drama, Acts & Sequences, and others), and Developer ID signing on the owner's Mac.

PRIORITY 1: missing writing features (Final Draft has them; DraftCraft does not)
1. Emoji support
   - Final Draft 13 supports emoji in the script, Beats, ScriptNotes and Outline Editor previews.
   - Emoji must type, display, measure and paginate correctly; the layout engine must measure emoji width.
   - They must survive PDF export, FDX/Fountain export and Undo.
2. Outline Editor: nested elements and ripple insert (Final Draft 13.1)
   - Elements can have child elements.
   - Dragging a parent moves its children; a modifier key leaves the children in place.
   - Inserting an element pushes the following elements in that lane to the right (ripple insert).
   - Undo, Beat Board sync and saving must all work with nesting.
3. Custom autocorrect (Final Draft 13.2)
   - The user keeps a list of "replace X with Y" pairs: add, edit, delete, import and export.
   - The pairs apply while typing and can be undone in one step.
   - They are separate from the spelling autocorrect, which today is only On/Off plus "don't correct" words.
4. Navigator zoom (Final Draft 13.2)
   - Add text-size control for the Navigator (smaller/normal/larger, or a slider), saved with the workspace.
   - Note: the code already has an unused `zoomLevel` state in `NavigatorSidebar.tsx`.
5. Navigator Cast List panel and character screen-time (Final Draft 13 / 13.1)
   - For each character: the scenes, pages and eighths they appear in, and an estimate of their screen time.
   - The panel must be sortable and exportable.
6. Customizable status bar
   - Right-click the status bar to show or hide each item: page, scene number, word count, timer, zoom, view, and so on.
   - The choices are saved with the workspace.
7. "Auto-hide right scene numbers" (Final Draft 13.3.3)
   - A per-document option, off by default, saved in the document.
   - The editor, print and PDF all respect it.
8. Netflix-style feature film template (Final Draft 13.5)
   - Add a feature screenplay template that follows the Netflix delivery formatting.
   - Document exactly which rules it applies.

PRIORITY 2: partial features to finish
9. Beat Board
   - Group cards by sequence as well as by act. Today Arrange by Act works, but sequences exist only on the timeline.
   - Add saved, customizable board views (Final Draft 13 "customizable Beat Board views").
   - A drag must create one save and one Undo step, not one per pointer move.
10. Navigator scene table
    - In-place editing for summary, notes and colour; today only the heading can be edited.
    - Columns can be reordered by dragging.
    - The sort order is remembered after a relaunch.
11. Dictation (Speech to Script)
    - Build and bundle the Swift on-device dictation helper (`desktop/native`) in the Mac build, so dictation works
      out of the box.
    - The microphone and speech-recognition permission prompts must appear correctly.
12. Writing languages
    - Final Draft supports writing in 95+ languages, including right-to-left scripts.
    - DraftCraft's spelling and punctuation are English (US/UK) only, and right-to-left text is not supported.
    - Add right-to-left editing (Hebrew and Arabic) with correct caret, selection and pagination.
    - Add spelling dictionaries for at least the main European languages.
13. Accessibility
    - VoiceOver: element names and an element number read aloud (Final Draft 13.5 added this for JAWS).
    - Full keyboard access to the timeline, Beat Board and Navigator.
14. Long scripts
    - Render only the pages near the window (virtualization), keeping caret, selection, IME, find and print exactly
      as they are.
    - Target: under 50 ms for Return near the start of a 250-page script.
15. Saving
    - Remember a moved or renamed project file across relaunches (today it is followed only during the session).

PRIORITY 3: help and onboarding
16. "Idea to Draft" guided tutorials (Help menu)
    - Each tutorial opens a new document with a Beat Board and walks the writer through building a screenplay,
      series or stage play.
17. Help → Getting Started
    - Turn it into an in-app guide with search; it is a plain text file today.

NEEDS AN EXTERNAL SERVICE OR PLATFORM: plan it and say what is needed; do not fake it
18. Windows version. Final Draft runs on Windows and Mac; DraftCraft builds only for Apple Silicon Mac.
    Build, sign and test a Windows x64 installer.
19. Mobile/iPad companion and cloud sync (iCloud Drive or Dropbox) with conflict handling.
20. Hosted real-time collaboration over the internet. Today it works on a local network only; internet use needs a
    WSS server.
21. "Get Notes" (request feedback on a script). This is a Final Draft service. Only build an equivalent if a
    service exists to send the script to; otherwise leave it out and say so.
22. Developer ID notarization. The script exists; the owner must run it with their Apple account.

STILL TO VERIFY ON A REAL MAC: built, but never checked on macOS
- traffic lights and the title bar
- document tabs (⌘T, Merge All Windows)
- full screen
- native menu check marks, including View › Toolbar Groups
- trackpad panning on the timeline
- premium speech voices
- VoiceOver
- the Developer ID script, run for real

RULES FOR EVERY ITEM
- Before building anything, reproduce or confirm the gap in the current code, with the file and line.
- Add an automated test for every new or changed feature: unit tests in `verification/*.test.ts` and browser checks
  in the relevant suite. A feature is "Verified" only when a test exercises it. Test drags with real pointer drags,
  not buttons.
- Keep all 20 release suites passing at their default latency budgets.
- Keep the real-Electron lifecycle (13), save scenarios (43) and editor ↔ PDF parity passing.
- Never change pagination. Margins, MORE/CONT'D, dual dialogue and locked pages must stay identical; the
  `layout-incremental` test must stay green.
- Bump the version to 1.17.0 and build the DMG only from the exact payload that passed every suite.
- Report:
  - CHANGELOG with root causes
  - TEST-RESULTS
  - LIMITATIONS
  - an updated FINAL-DRAFT-MATRIX with honest statuses (Verified / Implemented / Partial / Missing / Blocked)
- Deliver the DMG to ~/Downloads and in chat, then run the read-only Mac image check.
