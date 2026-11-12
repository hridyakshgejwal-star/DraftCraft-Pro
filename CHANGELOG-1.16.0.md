# DraftCraft Pro 1.16.0 — changelog

1.16.0 builds on the existing DraftCraft Pro 1.15.4 project (Electron 44.7.0, React, TypeScript). It is not a new
application, and no documents, settings, templates or recovery data are migrated or discarded. Screenplay files from
1.15.x open unchanged. The new layout preferences (toolbar, timeline, views, panels, appearance) are stored on each
computer and never inside a screenplay.

Final Draft 13 was the reference for how the features work. All icons, names and artwork are DraftCraft's own.

## Workspace and window

* **Main toolbar.** A customizable toolbar in the Final Draft style. The default set is: New, Open, Save; Undo and Redo;
  the Elements selector; Script, Beat Board, Outline Map, Timeline and Navigator; Views; Title Page and Find;
  Writing Stats, Show/Hide, Reports and Print.
  * **Available items.** The Customize sheet offers all 64 toolbar commands (the default set plus the rest), each wired to a real command: Save As, Export, Cut,
    Copy and Paste; each element; Dual Dialogue, New Scene, ScriptNote and Bookmark; Page, Normal and Speed View;
    Scene View, Index Cards, Split, Focus and Typewriter; Structure Lines; Bold, Italic and Underline; Alignment, Styles
    and Element Formatting; Scene Numbers, Highlighter, Reformat, Format Assistant and Change Case; Revision Mode,
    Track Changes, Tags, Reports, Table Read and Collaboration; Appearance; and others.
  * **Customizing.** Right-click the toolbar or use **View › Customize Toolbar…**. You can add items by double-click,
    Return or drag. You can reorder them by dragging or with the Move buttons, and remove them. The sheet also sets
    Icon and Text, Icon Only or Text Only, a small size, and whether the toolbar is shown. **Reset to Default**
    restores the default set.
  * **Narrow windows.** Items that don't fit move into a » overflow menu, and the toolbar never covers the script.
  * **Focus and state.** Clicking a toolbar item keeps the caret in the script. Toggles show their state.
* **macOS window.** The window has a hidden-inset title bar with the native traffic lights. The title row and toolbar can
  be dragged, and full-screen state is tracked. The in-window menu bar is hidden on the Mac because the native menu bar
  replaces it.
* **Native menus.** The menu bar has App, File, Edit, View, Format, Insert, Document, Tools, Production, Window and
  Help menus. Each item runs the same command as the matching toolbar item, and check marks follow the window state.
  The labels that existing tests and muscle memory rely on are unchanged.
* **Document tabs (macOS).** Document windows share a tab group. **Window › New Tab** (⌘T) and the tab bar's +
  button open a new document as a tab. The Window menu also has Show Tab Bar, Show Previous/Next Tab, Move Tab to New
  Window and Merge All Windows.
* **Appearance.** You can choose System, Light, Dark or Midnight in View › Appearance or in the status bar. The toolbar,
  Navigator, timeline, dialogs, menus and popovers all follow the choice.
* **Views.** Page View, Normal View (continuous, with page-break rules) and Speed View (flattened indents) change only
  how the script is drawn. Page numbers, the timeline and printing always use the real pagination.
* **Writing modes.** Focus Mode hides everything but the page; Escape or **Exit Focus Mode** leaves it. Typewriter mode
  keeps the line being written near the middle of the window.
* **Script tools.** Split shows the script beside Index Cards, Scene View, the Beat Board or the Outline. The Ruler
  shows margin and indent markers. Formatting Marks (invisibles) can be shown, and Show/Hide Outline Elements hides
  or reveals the outline paragraphs that were sent to the script.
* **Inline styles and alignment.** Bold, Italic and Underline (⌘B/⌘I/⌘U, the Format menu or the toolbar) apply to the
  selection, including across elements. They are stored as text runs and drawn in the editor without changing how
  lines wrap. Each paragraph can also be aligned left, centre or right. All of these are undoable and printed.
* **Right-click menus.** Right-clicking script text still opens the page menu (page copy/cut/paste/duplicate/delete,
  Copy/Cut Selected Text, Paste Text at Caret, Story Structure). The menu now also has:
  * Bold, Italic and Underline for the selection
  * Insert ScriptNote… and Insert Bookmark…
  * an **Element ▸** list with the current element checked

  Each choice applies to the text that was right-clicked and is one Undo step. In the desktop app, every other text
  field (dialogs, Beat Board titles, the Navigator filter and so on) now gets the standard Undo/Redo/Cut/Copy/Paste/
  Select All menu; before, right-clicking those fields did nothing (see Repairs).
* **Dialogs.** Escape closes the dialog it was pressed in across all the main dialogs, including Title Page, Print/PDF,
  Reports, Revisions, Templates, Format Doctor, Header and Footer, and Productivity.

## Outline Editor timeline (new)

A horizontal planning timeline sits under the toolbar, above the script and the Beat Board.

* **Lanes and ruler.** The lanes are Acts, Sequences and Beats, and you can add your own. Below them are a page ruler
  and the **Script lane**. The Script lane shows every scene, with its number, location, colour and real page length.
  * **Positions.** Everything is placed by the screenplay's real pagination, never by word counts. Positions are
    measured from where each scene starts and ends on the page.
  * **Indicators.** The ruler shows a caret indicator that follows the writing position and a target-length line.
* **Outline elements.**
  * **Creating.** Double-click a lane to create an element. An element created there is also a Beat Board beat.
  * **Editing.** Drag to move it, drag an edge to resize it, or drag it to another lane. Snapping is to ⅛ page, to
    whole pages, or off, and Alt drags freely. You can rename, describe, recolour, duplicate, copy and paste, delete,
    and set Goal pages by typing.
  * **Using elements in the script.** **Go to Script** jumps to the page or the text an element was sent to. **Send to
    Script** inserts the element as an outline paragraph.
  * **Keyboard.** Arrows move an element, Shift+arrows resize it, ↑/↓ change its lane, ⌘D duplicates, ⌘C/⌘X/⌘V copy,
    cut and paste, Delete removes it, Return renames it, and ⌘Z/⇧⌘Z undo and redo timeline edits.
* **Script lane.**
  * **Navigating.** Click a scene to select it. Double-click a scene to open it in the editor, or click the ruler to go
    to that page.
  * **Moving scenes.** Dragging a scene shows where it would go. **Nothing moves until you confirm** "Move scene…".
    Once confirmed, the whole scene's text moves as one undoable change. Moving an outline element never moves
    script text.
* **Layout.**
  * **Zoom.** Zoom runs from the whole script down to about ⅛ page, using the slider, the buttons, or ⌘/Ctrl with the
    scroll wheel or trackpad. **Fit Script** and **Fit Selection** fit the view to the content.
  * **Scrolling.** Horizontal and trackpad scrolling both work, and the last horizontal position is remembered.
  * **Panel and lanes.** The panel's height can be adjusted, lanes can be collapsed, and lanes can be renamed,
    recoloured, reordered, added and removed. The timeline can be shown or hidden with ⌥⌘T, the toolbar or the View
    menu. Hiding it never changes the document.
* **Planning beyond the script.** Goals can sit beyond the pages written so far, for example a 110-page plan on a
  12-page draft. They are not squeezed into the current length.
* **Kept separate.** The existing Story Map / Act Breaks ribbon is unchanged and keeps its own saved visibility, which is
  off by default.

## Beat Board

* **Undo.** Undo and Redo cover every Beat Board change in one history (cards, text, colour, resizing, moving, flow
  lines and arrangement), with buttons and ⌘Z/⇧⌘Z.
* **Keyboard and menus.** ⌘A, ⌘C, ⌘V, ⌘D and Delete work on the selection, and cards and the canvas have right-click
  menus.
* **Arranging.** You can distribute cards across or down, **Arrange by Act** (one row per act), and filter beats.
* **Link to the timeline.** A card shows its **Goal pages** when it is on the timeline, and **Place on Timeline** puts
  any beat there. Titles, descriptions and colours are the same data in both places.
* **Notices.** Messages appear in the board itself instead of browser alerts.

## Navigator

* **New tabs.**
  * **Locations.** Scenes grouped by location with INT./EXT., scene count, pages and times of day. The tab can be sorted
    and expanded, and a location jumps to its scenes.
  * **Outline.** Timeline elements by lane with their goal pages, followed by the acts, sequences and outline paragraphs
    in the script.
* **Cast.** Each character shows the characters they share scenes with, and how many words they speak.
* **Scenes.**
  * **Sorting and columns.** Scenes can be sorted by number, heading, INT/EXT, time or length, ascending or descending.
    The **Customize Columns** choices now take effect; they were ignored before.
  * **Editing headings.** Double-click a heading to edit it in place; the change goes to the script.
* **Custom tabs.** Custom tabs are created and renamed in place; Electron could not show the old browser prompts.
* **Layout.** The Navigator can be resized from 220 to 640 px and fills its column exactly. The tabs wrap instead of
  hiding off the edge.

## Structure Lines

* **Real structure.** Structure Lines are drawn from the script's own structure:
  * New Act / Outline Level 1 for acts
  * Sequence / Outline Level 2 for sequences
  * Outline Level 3 for outline beats
  * Scene Headings for scenes

  Where the script has no paragraphs at a level, the timeline lane of that kind supplies the regions instead.
* **Drawing and printing.** Each level has its own colour, taken from the element or beat where one is set. Clicking a
  line goes to the start of that region. The lines sit outside the text column, so they never move text or change
  pagination. Print/PDF draws the same lines when they are turned on.

## Writing and saving (from the 1.15.5 work, now shipped)

* **Saving.**
  * **Moved or renamed files.** Saving follows a project file that was renamed or moved while open (file identity, not
    path).
  * **Clear failures.** A missing folder or a deleted file now gives a precise message with Save As and Retry.
  * **Conflict check.** It compares content instead of bytes, so rewriting identical content is no longer a permanent
    conflict.
  * **Status and focus.** "Saving…" appears immediately, and Save keeps the caret and every keystroke typed after ⌘S.
* **Return key.**
  * **Full stops.** Full stops are added only where a sentence needs one.
  * **Spelling correction.** Only a single high-confidence correction of the last word is made. Names, slang and words
    used elsewhere in the script are protected. One Undo restores what was typed, and an undone correction is
    remembered.
  * **Next element.** The next element follows the scene's pattern: an empty cue becomes Action, and a running
    exchange continues with the next cue. Prose typed into a cue becomes Action, and Shift+Return inserts a line break.

## Repairs found during the 1.16 audit (Phase 9)

| # | Problem | Root cause | Fix | Regression test |
|---|---|---|---|---|
| R-01 | Right-clicking a text field outside the script (dialogs, Beat Board, Navigator, timeline fields) did nothing in the desktop app, and the script's right-click menu had no element or style choices | Electron shows no default context menu and the app installed none; the page menu only had page and clipboard actions | Standard native editing menu for every other field (`webContents` `context-menu`); styles, notes and an Element list added to the script's page menu | workspace suite "Phase 9 #6"; Electron lifecycle "right-click" |
| R-02 | Status-bar View, Typewriter, Split, Ruler and Invisibles controls did nothing | The settings were never passed to the editor | Wired through the workspace preferences | workspace suite "views" |
| R-03 | Structure Lines did not reflect the script | They were hard-coded by page number, in both the editor and print | Computed from the script and the timeline (`src/story/structure.ts`) | workspace suite "structure lines" |
| R-04 | Header and Footer settings could not be opened | The dialog was never reachable | Document › Header and Footer… | workspace suite "native menu commands" |
| R-05 | Next Bookmark returned to the first bookmark once the 2-second highlight faded | The search started from the temporary highlight, not from the caret | Next/Previous search from the caret (or the last bookmark jumped to) and wrap | workspace suite "Next/Previous Bookmark" |
| R-06 | Renaming in the Navigator, SmartType and Format Studio did nothing in the desktop app | `window.prompt()` is not implemented by Electron | In-app name fields | workspace suite "Navigator"; table-read suite rename |
| R-07 | The Navigator drew wider than its column and hid its last tabs | A fixed 336 px width from presentation.css overrode the resizable frame | It fills the frame and the tabs wrap | workspace suite "Phase 9 #11" |
| R-08 | Customize Columns in the Navigator did nothing | The settings were never applied to the scene list | The columns follow the settings | workspace suite "Navigator Scenes" |
| R-09 | The element hint could cover the line being typed at the bottom of the window | A fixed chip with no room left below the last page | The editor scrolls the line clear, and space was added below the last page | workspace suite "Phase 9 #4" |
| R-10 | Dragging a timeline element into another lane could leave the drag stuck | The element that held the pointer was re-created in the new lane | Drags listen on the window | workspace suite "timeline: create…" |
| R-11 | Most dialogs ignored Escape | There was no shared Escape handling | `DialogOverlay` closes on Escape | "every toolbar item is wired" (it dismisses every dialog it opens) |
| R-12 | The Beat Board used `alert()` and had no general Undo | — | In-board notices and a single history | workspace suite "Beat Board" |
| R-13 | The page right-click menu closed by itself when the timeline scrolled to follow the caret | Any scroll anywhere in the window closed the menu | Only scrolling that moves the page closes it | workspace suite "Phase 9 #6" |
| R-14 | Word clicks on a 250-page script were about 100 ms slower than in 1.15.4 (found during 1.16 testing, fixed before release) | Structure Lines rendered as ~750 accessible buttons, rebuilt and re-diffed on every editor update | Segments and line elements are memoized and kept out of the accessibility tree | words suite (A/B against 1.15.4 on an idle host: medians 373/379 ms vs 353/417 ms) |
| R-15 | "Send Planning to Script", Live Collaboration, Dictation, PDF import review, interchange review and Production Studio could not be dismissed with Escape | Same as R-11 | Same as R-11 | "every toolbar item is wired" (it dismisses every dialog it opens) |

Earlier repairs to the reported problems are still covered by their suites:

| Problem | Suites |
|---|---|
| Margins and templates | formats, templates |
| Close dialog | Electron lifecycle |
| Saving | smart-save, Electron save scenarios |
| Card resizing | editor |
| Flicker, caret and shifting text | caret, cross-paragraph, enter-flow |
| Auto-formatting | automatic-formatting, punctuation |

The test results file lists each run.
