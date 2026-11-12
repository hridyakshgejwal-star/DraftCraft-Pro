# DraftCraft Pro 1.17.0 — changes

1.17.0 works through the gaps found against Final Draft 13 (`FINAL-DRAFT-GAPS-PROMPT.md`). Each gap was first confirmed
in the 1.16.2 code; `AUDIT-1.17.0.md` records the file and line for each one. Items 18–22 need a platform, a service or
an Apple account and are planned, not built (`PLAN-1.17.0-ITEMS-18-22.md`).

Your projects open unchanged. New project fields are optional (`autoHideRightSceneNumbers`, `beatBoardViews`,
`OutlineMarker.parentId`), and older files load without them. New workspace and writing preferences load with
defaults. **Pagination is unchanged** for every script without emoji (see item 1); `verification/layout-incremental.test.ts`
and the PDF-parity check pass.

## Priority 1

### 1. Emoji

* **Root cause.** Line breaking split text only at spaces. Browsers also break before and after an emoji that touches
  a word ("wow😀wow"), following the Unicode line-breaking rules. The editor's text field could therefore wrap such a
  line differently from the page layout used for print and PDF. Nothing tested emoji, and there was no menu command to
  insert them.
* **Fix.** `src/production/layout.ts` splits a word that contains emoji at the same break opportunities the renderer
  uses: Chromium's ICU line breaker (`Intl.v8BreakIterator`), with a rule-based fallback where it is missing.
  Words without emoji take the old path, so their pagination cannot change. Insert › Emoji & Symbols opens the macOS
  character viewer (`desktop/main.cjs`).
* **Tests.** `verification/features-1170.test.ts` (break positions and measured parts). The production codecs check an
  FDX and Fountain round trip with emoji. `verification/electron/pdf-parity.cjs` puts emoji (spaced, glued to words,
  ZWJ families) in the script and compares the PDF with the editor.

### 2. Outline Editor: nesting and ripple insert

* **Root cause.** `OutlineMarker` had no parent (`src/types/script.ts`). Moving an element moved only that element, and a
  new element never pushed the following ones along.
* **Fix.** `OutlineMarker.parentId` and `src/workspace/outlineNesting.ts`. That module has the parent and child maps, the
  parent rule, descendants, and ripple shifts. The parent rule: the parent is the element in the nearest lane above that
  covers the child's start, and point markers are never parents.
  * **Timeline** (`src/workspace/Timeline.tsx`): an element created or dropped under a longer element in a lane above
    is nested in it. Nested elements move with their parent. Option moves only the parent, and Cmd turns snapping off.
    The element menu has Nest Inside / Remove from.
  * **Ripple Insert** is a timeline setting, on by default. With it on, a new element pushes later elements in its
    lane along.
  * **Deleting** a parent keeps its children and detaches them.
* **Tests.** The unit tests cover the nesting rules and ripple shifts. Workspace browser checks use real pointer drags:
  nest, carry, Option-drag, ripple, and Undo.

### 3. Custom autocorrect

* **Root cause.** Autocorrect was a single on/off switch, and corrections came only from the dictionary
  (`src/writing/model.ts`, `src/writing/spelling.ts`).
* **Fix.** Writing settings gain *Use Custom Autocorrect* and a list of replacement pairs. The limits are 40 characters
  per word, 200 per replacement, and 1,000 pairs.
  * **How a pair applies.** It replaces a whole typed word at a word boundary or at Return, matching the typed word's
    capitals. The longest match wins.
  * **Undo.** One Undo restores what was typed. Undoing a custom pair does not block it later; for dictionary
    corrections it does.
  * **Managing pairs.** Settings › Writing › Writing Assistance… has a *Custom Autocorrect* section for adding,
    editing and deleting pairs, and for importing or exporting them as text.
* **Tests.** Unit tests (parse, format, case, limits). Writing-suite browser checks (typing, Return, Undo, the settings
  editor).

### 4. Navigator zoom

* **Root cause.** `zoomLevel` state existed in `NavigatorSidebar.tsx` but nothing set it, and there was no control.
* **Fix.** Smaller and larger text buttons and a 100% reset in the Navigator header. There are six steps from 80% to
  150%. The setting is saved in the workspace preferences and applies to everything below the header.
* **Tests.** Workspace suite: the buttons, the reset, persistence after reload, and a 220 px Navigator.

### 5. Cast List and screen time

* **Root cause.** The Cast tab counted only lines and words. Nothing totalled scenes, pages or eighths per character
  or estimated screen time.
* **Fix.** A *Cast List* tab (`castList` in `src/production/queries.ts`). For each character it shows the scenes (with
  numbers), pages, eighths and estimated screen time. Screen time is the eighths of the scenes the character appears
  in, at one page per minute. The tab can sort by any column, jumps to the character's first scene, and exports a CSV
  file. Omitted scenes are excluded.
* **Tests.** Unit tests (totals, sorting, CSV) and a workspace check.

### 6. Customizable status bar

* **Root cause.** The status bar had no menu, and every item was always shown (`src/components/StatusBar.tsx`).
* **Fix.** Right-click the status bar to choose any of its 15 items, or Show All. The choice is saved in the
  workspace preferences.
* **Tests.** Workspace suite (menu, persistence, order).

### 7. Auto-hide right scene numbers

* **Root cause.** Scene numbers could only be placed left, right, both or none. A long heading could run into the
  right-hand number.
* **Fix.** Format › Scene Numbers › Auto-hide Right Scene Numbers (saved in the project). The right number is hidden
  only when the heading's last line reaches it. One shared rule (`src/production/sceneNumbers.ts`) drives the editor,
  print and PDF, so all three agree.
* **Tests.** Unit tests for the collision rule. Browser and print checks.

### 8. Streaming Feature (Netflix-style) template

* **Root cause.** No such template existed (`src/formats/catalog.ts`).
* **Fix.** *Streaming Feature (Netflix-style)* in File › New from Template…. It has scene numbers on both sides,
  MORE/CONT'D continuations, page numbers top right with a period and none on page 1, and title page defaults. It is an
  independently written adaptation, not an official Netflix file.
* **Tests.** Template-formatting suite.

## Priority 2

### 9. Beat Board

* **Root cause.**
  * **Grouping.** Cards could only be arranged by act.
  * **Views.** There were no saved views.
  * **Dragging.** A drag called `onBeatsChange` on every pointer move. That was one Undo step, but many document
    changes and autosaves (`src/components/BeatBoard.tsx`).
* **Fix.**
  * **Dragging.** A drag now shows a preview and commits once on release. Escape cancels it.
  * **Arrange by Sequence** groups cards by the sequences of the Outline Editor.
  * **Board Views** save, show, update, rename and delete named arrangements (positions, zoom, pan and filter). They
    are saved in the project.
  * **Nesting badges** show a card's parent sequence.
  * **Keyboard.** Arrows move the selected card (Shift for larger steps). `[` and `]` select the previous and next
    card, Return edits the title, and Shift+F10 opens the menu.
* **Tests.** Workspace checks with real pointer drags: one document change per drag, one Undo, and Escape. Also views,
  sequence arrangement and keyboard moves.

### 10. Navigator table

* **Root cause.** Only the heading could be edited. Columns had a fixed order, and the sort was component state, lost
  on relaunch.
* **Fix.**
  * **Editing.** Double-click a summary or comment to edit it in place, and pick a scene colour in the colour column.
  * **New columns.** Colour and comment (comment is hidden by default).
  * **Column order.** Drag a header to reorder the columns, or use Alt+←/→.
  * **Saved.** The sort, the column order and the column widths are saved in the workspace preferences.
* **Tests.** Workspace suite with real header drags. Persistence after reload.

### 11. Dictation helper

* **Root cause.** `desktop/native/Dictation.swift` existed but was never compiled: the offline build has no Swift
  compiler. So dictation always said the helper was missing. Also, a helper copied into `app.asar` could not have run,
  because a file inside an asar archive cannot be executed.
* **Fix.**
  * **The build.** The helper was compiled on the owner's Mac (macOS 27.0.1, arm64, Command Line Tools' `swiftc`) by
    `0-build-dictation-helper.command`. That script writes a log and a checksum and never installs anything. The
    binary and its log are in `desktop/native/bin/`.
  * **Packaging.** `desktop/package.mjs` and the release image put it in `Contents/Resources/DraftCraftDictation`.
  * **Lookup.** `desktop/dictation-ipc.cjs` finds the helper there (never inside `app.asar`) and checks that it is
    executable.
  * **Permissions.** Info.plist carries the microphone and speech-recognition usage text.
  * **Developer ID.** `Sign-and-Notarize.command` signs the helper with the hardened runtime and microphone
    entitlement.
* **Tests.** `verification/dictation-helper.test.cjs`: the lookup rules, and the bundled file is an arm64 Mach-O whose
  checksum matches the Mac build log. On the Mac the self-test starts the helper. Dictating speech needs the writer's
  permission and is not automated.

### 12. Languages and right-to-left text

* **Root cause.** Spelling supported only US and UK English. The editor set no text direction, so Arabic or Hebrew
  paragraphs ran left to right.
* **Fix.**
  * **Spelling in 23 languages.** English uses the bundled dictionaries. The others use the system spellchecker
    through the preload's `webFrame` bridge (`src/writing/platformSpelling.ts`). On macOS that is the macOS
    dictionaries; no dictionaries are downloaded.
  * **The English dictionary** no longer flags words in other scripts.
  * **Right-to-left text.** Each field uses `dir="auto"` with start alignment, so right-to-left paragraphs run and
    align correctly. Print and PDF set the direction per line (`rtlAt` in `src/production/print.ts`).
* **Tests.** Unit tests (language list, direction detection, print). Workspace checks with Arabic and Hebrew paragraphs:
  selection, typing and Undo. On the Mac the self-test asks the system spellchecker about English, French and German
  words.

### 13. Accessibility

* **Root cause.** The script's text fields had no accessible name, so VoiceOver said only "text area". There was no
  element-number announcement. Navigator tabs, timeline elements and Beat Board cards needed the mouse.
* **Fix.**
  * **Names.** Each field is named by its element ("Scene Heading, scene 12", "Dialogue").
  * **Announce Element Number.** Ctrl+Shift+Period (View › Announce Element Number) speaks the element type, its
    number, the page and the scene through a polite live region. Element changes are announced too.
  * **Navigator tabs** are a real tab list: arrow keys, Home and End.
  * **Timeline elements:** Home and End select the first and last; Shift+F10 or the context-menu key opens the menu.
  * **Beat Board** keyboard control is described in item 9.
* **Tests.** Workspace checks (names, announcements, keyboard paths). On the Mac, the self-test reads the labels and the
  announcement.

### 14. Long scripts: Return near the start

* **Root cause.** A Return near the top of a 250-page script moves text on every following page. Profiling found where
  the time went:
  * every page was compared and many redrawn;
  * `pageSegments` built about 6 MB of temporary arrays per edit;
  * a document-wide `querySelectorAll` ran on every render, at 14–18 ms;
  * the Navigator rebuilt every scene row, because each row's cache key included the paragraph index, and that shifts
    for every scene after the edit;
  * the Return punctuation analysis ran an English grammar parse inside the keystroke.
* **Fix (pagination itself is unchanged).**
  * **Pages far from the window.** In scripts over 40 pages they keep their last drawing and are refreshed in idle
    time, nearest first. Any jump (Navigator, search, Go To Page, bookmarks) brings the target page up to date first.
  * **`pageSegments`** uses an index. A test proves the output is identical.
  * **The page observer** watches only the page container.
  * **Navigator rows** look up the current index when clicked, so their cache survives insertions above them.
  * **Character and word-count indexes** skip unchanged work.
  * **Activity recording** moved to idle time.
  * **Focus updates** after a Return run as a transition.
  * **Punctuation analysis** for the sentence at the caret runs while the writer pauses, so Return usually finds it
    ready.
* **Result (test container, 2 vCPU).** Return in a 250-page mixed script:
  * keydown to paint: median 48 ms (Event Timing);
  * keydown to second frame: median 54–58 ms.

  Mac measurements are in `TEST-RESULTS-1.17.0.md`.
* **Tests.** `verification/structure-segments-equivalence.test.ts`, the layout-incremental test, and the performance
  checks in the story and editor suites. Jumps to far pages are covered in the workspace suite.

### 15. Projects moved while the app was closed

* **Root cause.** File identities lived only in memory (`desktop/project-files.cjs`). A project moved or renamed in
  Finder while the app was closed was "missing" at the next launch.
* **Fix.**
  * **Identities are saved.** They (device and inode as exact 64-bit strings) go to `project-identities.json` next to
    the locations file, written atomically and capped at 200 entries.
  * **At startup.** If the associated file is missing, the save coordinator looks for the same file by identity,
    checks it, and follows it. Otherwise it forgets the stale identity.
* **Tests.** Three relaunch tests in `verification/project-files.test.cjs`:
  * a renamed project is followed;
  * a project in a renamed folder is followed, while one moved elsewhere is reported and never recreated;
  * old or damaged identity files are ignored.

## Priority 3

### 16. Idea to Draft tutorials

* **Root cause.** The Help menu had no tutorials.
* **Fix.** Help › Idea to Draft › Feature Screenplay, Television Pilot or Stage Play (`src/help/ideaToDraft.ts`) opens a
  new project in the matching format.
  * **The Beat Board** holds numbered step cards in four rows: idea, characters, structure and draft. Each card has a
    written prompt, and flow lines link the cards in order.
  * **The Outline Editor** gets a lane with one section per structure card, at its target page.
  * **The current project** goes through the normal switch, which resolves unsaved changes first.
  * **The prompts** are original DraftCraft text.
* **Tests.** `verification/help-1170.test.ts` (each tutorial's cards, links, sections, format and graph). Workspace #39
  and a smart-save check through the real save coordinator.

### 17. In-app Getting Started

* **Root cause.** Help › Getting Started opened a plain text file in another app.
* **Fix.** It now opens a window inside the app (`src/help/GettingStartedGuide.tsx`).
  * **Contents.** A short task guide, followed by the full Getting Started reference that ships with the app.
  * **Search** needs every word and ignores case and accents. Title matches rank first, and matches are highlighted.
    Return jumps to the first result.
  * **Idea to Draft** tutorials can be started from the guide.
  * **The text file** is still available as Help › Getting Started (Text File).
* **Tests.** Unit tests (parsing keeps every line, search, highlighting). Workspace #39 (focus, filtering, highlight,
  Return, Escape, starting a tutorial).

## Other changes

* **Native self-test.** A self-test runs on the Mac only when both an isolated test profile and a report path are given
  (`desktop/self-test.cjs`). It checks the window and its tabs, full screen, menu check marks, system spelling, voices,
  the Speech helper, accessibility labels, the guide, and Return latency with real key events. It never runs in a
  normal launch.
* **Tests.** Test selectors for the Navigator's "Scene heading" editor are now exact. The script fields are now named
  "Scene Heading" too.
