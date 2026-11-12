# DraftCraft Pro 1.16.1 — implemented and repaired features

This list covers what 1.16.0 and 1.16.1 add to, or repair in, the existing DraftCraft Pro app. All earlier features are
kept. Their status is in `FINAL-DRAFT-MATRIX-1.16.1.md`, which also marks which features are verified by automated
tests and which are implemented but not separately verified.

## New in 1.16.1

1. **Faster long scripts.** Pagination is incremental: it resumes at the edit and stops when the pages rejoin the
   previous layout. Unchanged pages are not redrawn, and the Navigator updates in the background. Split paragraphs are
   positioned in one pass per change, and pages far from the window are positioned when they come near it.
2. **Navigator scene table.** The Scenes tab can be shown as a table. Columns can be resized by dragging, with the
   keyboard (← →, Shift, Home and End) or by double-clicking for the default width. Headers sort, and headings can be
   edited in place (double-click or F2). The view, the columns and the widths are saved.
3. **Structure Line settings.** Width, opacity, which levels are drawn, and a default colour per level. Open them
   from View › Show, the toolbar's Show/Hide menu, or by right-clicking a line or script text. Print and PDF use
   them.
4. **Toolbar groups.** Whole groups can be hidden and shown from the toolbar's right-click menu, the Customize
   sheet or View › Toolbar Groups. Hidden items keep their places.
5. **Developer ID signing and notarization.** `Developer-ID/Sign-and-Notarize.command` is run on the owner's Mac with
   their own certificate. It signs with the hardened runtime, notarizes, staples and checks the app and a new disk
   image. `--check` checks the setup only.
6. **Fixes.**
   * Text composed with an input method could be replaced by the previous text while the layout waited.
   * The toolbar could leave stale spaces behind when items changed.
   * The Scenes controls overflowed a 220 px Navigator.

## New in 1.16.0

### Workspace

1. **Main toolbar.** A customizable main toolbar offering 64 commands, each wired to a real command.
2. **Customize Toolbar sheet.** You can add (by double-click, Return or drag), reorder (by drag or the Move buttons) and
   remove items. Other settings:
   * display: Icon and Text, Icon Only or Text Only
   * a small size
   * show or hide the toolbar
   * Reset to Default

   Preferences are kept on each computer.
3. **Overflow menu.** On narrow windows, items that don't fit go into an overflow menu. A right-click menu on the
   toolbar opens customization.
4. **Native menus.** File, Edit, View, Format, Insert, Document, Tools, Production, Window and Help, with check marks
   for every toggle.
5. **macOS document tabs.** New Tab (⌘T), the tab bar +, Show Tab Bar, Previous/Next Tab, Move Tab to New Window and
   Merge All Windows.
6. **macOS window.** A hidden-inset title bar with the native traffic lights and drag regions. Full-screen state is
   followed.
7. **Appearance.** System, Light, Dark and Midnight.
8. **Views.** Page View, Normal View and Speed View (display only; pagination is unchanged), plus Focus Mode and
   Typewriter mode.
9. **Script tools.** Split view with Index Cards, Scene View, the Beat Board or the Outline. The Ruler shows margin and
   indent markers. Formatting marks can be shown, and outline paragraphs can be shown or hidden.
10. **Inline styles and alignment.** Bold, Italic and Underline work on any selection, including across elements, and
    are drawn without changing line wrapping. Each paragraph can be aligned left, centre or right.
11. **Right-click menus.** The script's page menu also has B/I/U, Insert ScriptNote…, Insert Bookmark… and an Element
    list. Every other text field gets the standard editing menu.
12. **Escape.** Escape closes every dialog.

### Outline Editor timeline

13. **Lanes and ruler.** Acts, Sequences and Beats lanes, plus custom lanes. A page ruler and a Script lane are drawn from
    the real pagination.
14. **Script lane and indicators.** Scenes appear with their number, location, colour and page length. The caret
    indicator follows the cursor, and the target-length line shows the planned page count.
15. **Editing elements.**
    * Create by double-click.
    * Drag to move, drag an edge to resize, or move to another lane, with ⅛-page, whole-page or no snapping.
    * Rename, describe, recolour, duplicate, copy, cut, paste and delete.
    * Set Goal pages by typing.
    * Keyboard editing and Undo/Redo.
16. **Planning ahead.** Goals can extend beyond the pages written so far.
17. **Navigating and moving scenes.** Double-click a scene to open it, or click the ruler to go to a page. Drag a
    written scene to move it; it moves only after you confirm, as one Undo step.
18. **Zoom and fit.** Zoom down to about ⅛ page, Fit Script, Fit Selection, and horizontal and trackpad scrolling.
    The last horizontal position is remembered.
19. **Lane options.** Show or hide the timeline, resize it, and collapse, rename, recolour, reorder, add or remove
    lanes.
20. **Beat Board link.** Every timeline element is also a Beat Board beat, so titles, descriptions, colours and goals
    are shared.

### Beat Board

21. **Undo.** One Undo/Redo history for all board changes.
22. **Keyboard.** ⌘A, ⌘C, ⌘V, ⌘D and Delete.
23. **Menus.** Right-click menus on cards and the canvas.
24. **Arranging.** Distribute across/down, Arrange by Act and Filter beats.
25. **Timeline link.** Goal pages appear on cards, and Place on Timeline puts a beat there.

### Navigator

26. **New tabs.** A Locations tab (grouped scenes, INT./EXT., counts, pages, times; sortable) and an Outline tab
    (timeline elements and the outline paragraphs in the script).
27. **Cast.** Shows the characters each character shares scenes with, and the words they speak.
28. **Scenes.** Scenes can be sorted by number, heading, INT/EXT, time or length. The column choices now take effect,
    and scene headings can be edited in place.
29. **Custom tabs and resizing.** Custom tabs are created and renamed in place. The Navigator resizes from 220 to
    640 px and its tabs wrap.

### Structure Lines

30. **Lines from the script.** Acts, sequences, outline levels and scenes are drawn from the script's own structure,
    with the timeline as a fallback. They are clickable, never move text, and are printed when turned on.

### Saving and Return (first shipped in 1.16.0)

31. **Moved or renamed projects.** Saving follows a project that was renamed or moved while open, and failures give
    precise messages with Retry and Save As.
32. **Conflict check and status.** The conflict check compares content, so an identical rewrite is not a conflict.
    "Saving…" shows immediately, and the caret and keystrokes typed after ⌘S are kept.
33. **Return key.**
    * Full stops are added only where a sentence needs one.
    * Spelling is corrected with a single high-confidence fix, and names and slang are protected.
    * The next element follows the scene's pattern.
    * Shift+Return inserts a line break.

## Repaired in 1.16.0

The table lists each repair; root causes and tests are in `CHANGELOG-1.16.0.md`.

| # | Repair |
|---|---|
| R-01 | Right-clicking a text field in the desktop app did nothing (outside the script). The script menu also had no element or style choices. |
| R-02 | The status-bar View, Typewriter, Split, Ruler and Invisibles controls had no effect. |
| R-03 | Structure Lines were hard-coded by page number. |
| R-04 | Header and Footer could not be opened. |
| R-05 | Next Bookmark returned to the first bookmark. |
| R-06 | Renaming in the Navigator, SmartType and Format Studio did nothing in the desktop app (`window.prompt`). |
| R-07 | The Navigator overflowed its column and hid its last tabs. |
| R-08 | The Navigator's Customize Columns did nothing. |
| R-09 | The element hint could cover the line being typed. |
| R-10 | Timeline drags across lanes could get stuck. |
| R-11 | Dialogs ignored Escape. |
| R-15 | Six further dialogs ignored Escape. |
| R-12 | The Beat Board used `alert()` and had no general Undo. |
| R-13 | The page right-click menu closed by itself when the timeline followed the caret. |
| R-14 | Word clicks on long scripts had slowed down. This was found and fixed before release. |
