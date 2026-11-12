# DraftCraft Pro 1.16.1 — changes

1.16.1 completes the five items left open in 1.16.0's limitations. Your projects, preferences and the file format are
unchanged. The only addition is a few new fields in the per-computer workspace preferences (`draftcraft_workspace_v1`),
and older preferences load with defaults.

## 1. Long scripts: faster typing and Return

In 1.16.0, every keystroke laid out the whole script again and redrew every page. At 250 pages that cost about
170–210 ms per key, the same as 1.15.4. 1.16.1 changes four things, and none of them changes pagination.

### Incremental pagination (`src/production/layout.ts`)

* **Where it starts.** The layout keeps a checkpoint at each page start. After an edit, it starts again at the last
  checkpoint before the change.
* **Where it stops.** It stops as soon as a page start matches the previous run, with the same paragraph position,
  the same line state and the same page contents. The pages after that are reused as they are.
* **Correctness.** Reuse never changes the result. A new test (`verification/layout-incremental.test.ts`) applies
  hundreds of random edits to random scripts. The scripts include dual dialogue, long speeches split with
  MORE/CONT'D, acts, transitions, page locks and A-pages. After each edit the test compares the result with a full
  layout, field by field.

### Pages are redrawn only when they change (`src/components/ScriptEditor.tsx`)

* **What a page keeps.** Each page keeps its drawing while its layout, paragraphs, spelling marks and view settings
  are unchanged.
* **Structure Lines.** These are cached per page, so typing does not invalidate every page's lines.

### Navigator in the background

* **While you type.** The Navigator's statistics and lists follow the script in a low-priority render.
* **When you use it.** As soon as you click into it or focus it, it switches to the live document, so every rename
  or reorder acts on the latest text.

### Fragment positioning in one pass (`src/production/FragmentTextarea.tsx`)

* **What fragment positioning is.** A paragraph that spans two pages is shown by two text fields, and each one is
  scrolled to its own lines.
* **The old cost.** In 1.16.0 each field measured itself as it was drawn. That forced one full browser layout per
  field. So a change that moved every page, such as Return or a new line near the start of a long script, took about
  0.4–0.5 s.
* **The new approach.** All fields that changed are now read in one pass and measured in a hidden element that is its
  own layout root. They are then scrolled together.
* **Distant pages.** Fields on pages the browser is not drawing (far from the window) are positioned in one of three
  ways, whichever comes first:
  * when their page comes near the window
  * before the next paint, when a jump (scene, bookmark, search result) scrolls their page into view
  * in short idle slices, nearest pages first
* **Fonts.** All fields are measured again when the screenplay font finishes loading.

### Results

These were measured on the same 2-vCPU Linux container with the same probes, with p50 / p95 values; see
`TEST-RESULTS-1.16.1.md`.

| Measurement | 1.16.0 | 1.16.1 |
|---|---|---|
| Typing, 250 dense pages | 141 / 202 ms | 57 / 108 ms (42 / 88 in a second run) |
| Return in the middle, 250 pages | 213 / 243 ms | 82 / 127 ms |
| Return near the start, 250 pages | 248 / 364 ms | 88 / 112 ms |
| Element change, 250 pages | 204 ms | 52 ms |
| Worst case: Return near the start of 223 identical pages (every page moves), key handler | 372 / 436 ms | 110 / 131 ms |
| Typing, 120 pages | 72 / 134 ms | 32 / 54 ms |

### Fixes found during this work

* **Symptom.** While text was being composed with an input method (IME), the layout pauses. The page cache could
  then show the paragraph's previous text, and the composed text was lost.
* **How it was found.** The smart-save suite found it in the "close while composing" scenario.
* **Fix.** The cache now also checks the live paragraphs.

Two problems came from the new positioning itself. The release suites found both, and both were fixed before release:

* **A wrong line at the top of a split speech.** A speech continued on a later page could keep a position measured
  before the page settled. The field then showed the previous page's last lines (cross-paragraph D-09). Positions are
  now refreshed in the background and when fonts load.
* **Popups closing on their own.** Fields being positioned in the background fire scroll events, and the word popup
  and SmartType list treated those as the page moving, so they closed by themselves (words suite, 250 pages). Popups
  now ignore scrolling inside fields other than the one being edited.

## 2. Navigator: scene table with resizable columns

* **Cards or table.** The Scenes tab has a **Cards / Table** switch (the table icon next to the filter).
* **Columns.** The table shows #, Heading, INT/EXT, Time, Length (pages and eighths), Characters and Summary.
* **Resizing.**
  * Drag a column's right edge.
  * Or focus the edge and press ← or → (10 px; with Shift, 40 px). Home and End go to the minimum and maximum width.
  * Double-click an edge to restore the default width.
  * Wide tables scroll sideways inside the Navigator; the Navigator keeps its width.
* **Sorting.** Click a header to sort; click it again to reverse.
* **Editing.** Double-click a heading, or press F2 on a row, to edit it in place. Click a row to go to the scene.
* **Saved settings.** The view, the column choices and the widths are saved with the workspace. Column choices now
  persist in both views.

## 3. Structure Line settings

You can open **Structure Line Settings…** in four ways:

* View › Show
* the toolbar's Show/Hide menu
* right-clicking a Structure Line
* right-clicking script text

The settings are:

* **Width.** From 1 to 8 px. Scene lines are drawn at ⅔ of the width.
* **Opacity.** From 15 to 100 %. Scene lines are drawn at 60 % of the opacity.
* **Levels.** Show or hide Act, Sequence, Outline and Scene lines separately.
* **Default colours.** Each level can have a default colour for regions without a colour of their own. Colours set on
  a timeline element, a beat or a scene always win. **Automatic** goes back to the built-in palette.
* **Show Structure Lines in this screenplay.** This is the per-document switch.

The settings apply at once and never move text. They are saved with the workspace, and Print and PDF use them.

## 4. Toolbar: hide or show whole groups

There are seven groups: Document, Editing, Screenplay, Workspace, Formatting, Production and Tools. You can hide or
show them from three places:

* the toolbar's right-click menu (**Show Groups**)
* the **Customize Toolbar** sheet (a checkbox on each group)
* **View › Toolbar Groups**

How hiding works:

* Hidden items keep their places and come back where they were.
* Spaces never end up doubled or at the ends.
* **Reset to Default** shows every group.

**Fix.** Toolbar items were keyed by id, and spaces repeat, so React could leave stale spaces behind after a change.
Items are now keyed by their position.

## 5. Developer ID signing and notarization (run on your Mac)

There is a new `Developer-ID` folder on the disk image. It contains `Sign-and-Notarize.command`, `entitlements.plist`
and `README.md`.

**What the script does.** Using your own Developer ID certificate and a notarytool keychain profile, it:

* checks the app against the disk image's manifest
* signs it from the inside out with the hardened runtime and secure timestamps
* notarizes it with Apple, then staples and checks it with Gatekeeper
* builds a signed, notarized and stapled disk image

**Before signing.** `--check` checks the setup and signs nothing.

**Credentials.** Your credentials never pass through the script: Apple's `notarytool` asks for them itself.

**Testing.** The script needs your Apple account, so it could not be run here. Its control flow is tested on Linux
with stand-in tools (`verification/developer-id-sign.test.cjs`). The test covers the signing order and flags,
notarization, stapling, Gatekeeper, and every refusal case. The disk image from this build is still ad-hoc signed.

## Other

* **Narrow Navigator.** At 220 px the filter field now shrinks, so the Scenes controls fit without overflowing.
* **New and updated tests.**
  * `verification/layout-incremental.test.ts` and `verification/workspace-settings.test.ts`
  * four new workspace-suite checks: the scene table, Structure Line settings, toolbar groups and deferred
    positioning
  * Return timings in `verification/performance-scale-browser.cjs`
  * a new `verification/performance-repagination-browser.cjs` for the worst case
