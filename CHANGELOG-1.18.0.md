# DraftCraft Pro 1.18.0 — changes

1.18.0 adds a Start Window like Final Draft's, File › Open Recent, and an emoji picker built into the app. It also fixes
the Getting Started text wrapping found by the 1.17.0 Mac check. The request is `FEATURE-PROMPT-1.18.0.md`.
`AUDIT-1.18.0.md` records, with file and line, what 1.17.0 had before each change.

Your projects open unchanged: no project field was added or changed. Two small files are new in the app's profile
folder: `recent-projects.json` (the recent list) and `start-window.json` (whether the Start Window opens at launch).
Both are created when first needed. **Pagination is unchanged.**

## 1. Start Window

* **What was missing.** At launch the app opened straight into the last document (`desktop/main.cjs`, the startup
  path at line 351 in 1.17.0). There was no welcome screen, no recent-projects list, and File had no Open Recent.
  macOS's own recent list was never filled.
* **What it does now.** When DraftCraft Pro opens, a Start Window appears over the editor (`src/start/StartWindow.tsx`):
  * **Create.** New Screenplay (your default template), and six formats in one click: Feature Screenplay, Television
    Pilot, Multi-Camera Sitcom, Stage Play, Streaming Feature and Short Film. More Templates… opens File › New from
    Template.
  * **Open.** Open… shows the normal open dialog for DraftCraft, Final Draft (.fdx, .fdxt), Fountain, text, RTF and PDF
    files.
  * **Recent Projects.** The last 20 projects you opened or saved, newest first. Each row has the title, file name,
    folder and when you last opened it, plus Show in Finder and Remove from List (the file itself is never touched).
    There is a filter box, Clear Recent List, and arrow-key navigation. A project that was moved or deleted shows as
    "Missing" and explains what to do. Opening a project goes through the normal project switch, so unsaved changes
    are resolved first.
  * **Learn.** The three Idea to Draft tutorials, Getting Started, and What's New (the guide, already searched for this
    version's notes).
  * **Continue with "…"** (or Escape, or the close button) keeps the current script.
  * **"Show this window when DraftCraft Pro opens."** Untick it and the app opens straight into your script, as
    before. File › Start Window… opens it at any time.
* **When it does not appear.** Opening DraftCraft Pro by double-clicking a script (or dropping one on the Dock icon)
  opens that script directly.
* **File › Open Recent** lists the same projects (up to 12), greys out a missing one, and has Clear Menu. On macOS the
  list is also handed to the system for the Dock menu and Apple menu › Recent Items (for the file types the app
  declares: .draftcraft, .fdx and .fountain).
* **Privacy and safety.** `desktop/recent-projects.cjs` keeps file paths and titles only, never script contents, in a
  private file (mode 0600, written atomically). The editor page never sees a path: it asks for a recent project by a
  short id, and the main process looks the path up, so a page cannot ask the app to open any other file.
* **Tests.**
  * Unit tests: `verification/recent-projects.test.cjs` (order, one entry per file, limit, ids, missing files, damaged
    files, the preference) and `verification/features-1180.test.ts` (Start Window formats and dates).
  * Browser check #41 (every control on the window).
  * Real Electron: `verification/electron/start-window-scenarios.cjs`, 6 scenarios. They cover:
    * the first launch;
    * Open… recording the project;
    * opening a recent project;
    * a missing project marked and removed;
    * the preference kept across a relaunch;
    * a launch with a file skipping the window;
    * File › Open Recent and Clear Menu;
    * unsaved changes resolved before a new format replaces the script.

## 2. Emoji picker

* **What was missing.** Insert › Emoji & Symbols only opened the macOS character viewer (`desktop/main.cjs`,
  line 109 in 1.17.0). That window floats outside the app, and it does not know which field you were typing in.
  There was no emoji button on the toolbar and no emoji entry on the script's right-click menu.
* **What it does now.** DraftCraft Pro has its own emoji picker (`src/emoji/EmojiPicker.tsx`). It opens from:
  * Insert › Emoji… (⌃⌘E);
  * the new **Emoji** toolbar button;
  * **Insert Emoji…** on the script's right-click menu (it inserts where you right-clicked).
* **In the picker:**
  * **Search.** Type a word ("laugh", "rain", "clapper", "flag india"). Every word must match. The closest names come
    first.
  * **Categories.** Nine tabs: Smileys, People, Animals & Nature, Food, Activities, Travel, Objects, Symbols, Flags. The
    set is about 1,400 emoji from Unicode 15.1 (`src/emoji/emojiData.ts`).
  * **Recently Used** comes first, up to 24 emoji.
  * **Keyboard.** Arrow keys, Home/End, Return or Space to insert, Escape to close. Tab stays inside the picker.
  * **Shift-click** (or Shift+Return) inserts and keeps the picker open.
  * The emoji goes in at the caret, or replaces the selection, and the field gets the focus back. One Undo removes it.
    This works in any text field, not only the script: Beat Board cards, notes and titles too.
  * **Character Viewer…** at the bottom still opens the macOS viewer, and Insert › Emoji & Symbols (Character Viewer)
    is kept.
* **How it inserts.** It uses the browser's own text-insertion command, so the editor treats the emoji like typing:
  its input handling, autosave and Undo see an ordinary insertion. Emoji pagination is the 1.17.0 work and is unchanged.
* **Tests.**
  * Unit tests in `verification/features-1180.test.ts`: the data (no duplicates, every entry a real emoji, every
    category filled), search ranking, and the recently used list.
  * Browser check #40 covers:
    * the toolbar button;
    * search;
    * keyboard insertion at the caret;
    * focus going back to the field;
    * Undo;
    * Recently Used;
    * the Tab trap;
    * Shift-click;
    * Escape;
    * the right-click entry;
    * a Beat Board title.
  * The native self-test's `emoji-picker` step: real key events into the search box, Return inserts 🎬, and Undo
    removes it.

## 3. Getting Started text wrapping

* **Root cause.** The 1.17.0 Mac check found that guide paragraphs broke in mid-sentence. The reference text is stored
  with hard line breaks at about 118 characters, and the guide showed them with `white-space: pre-line`
  (`src/workspace/workspace.css` line 323 and `src/help/GettingStartedGuide.tsx` line 42 in 1.17.0). So every stored
  break became a visible break, whatever the window width.
* **Fix.** `reflowText` in `src/help/guide.ts` joins the lines of a paragraph. Blank lines stay paragraph breaks, and
  numbered or bulleted lines still start on a new line. The guide now wraps to the window. A unit test checks every
  guide section for mid-sentence breaks.

## 4. Smaller changes

* The default toolbar has the Emoji button after Elements. A toolbar still exactly on the 1.17.0 default gets it
  automatically; a toolbar you customised keeps your layout, and Emoji can be added from Customize Toolbar.
* Getting Started has a new section, "Start Window and recent projects", and the emoji section describes the picker.
* The Getting Started reference (`desktop/Getting-Started.txt`) has a "What's New in 1.18.0" section.
* The native self-test has three new steps: `start-window`, `recent-projects` and `emoji-picker`.

## 5. Found and fixed during testing

* **The packaged app could not start.** `recent-projects.cjs` was not on the list of desktop files copied into the
  app (`build-offline/stage-desktop.mjs`, `desktop/build.cjs`). The main process failed while loading, so no window
  opened. The real-Electron checks caught it before any image was built. A new test,
  `verification/desktop-stage-list.test.cjs`, follows every local `require` from the main process and fails if a
  module is missing from either list.
* **The emoji picker lost Escape after a Shift-click insert.** The script editor gives its field focus back one frame
  after an insertion, which took the focus out of the picker. The picker now returns to its search box two frames
  later.
* **The Start Window's checkbox showed "on" for a moment** before the saved preference loaded. It is now disabled
  until the preference has loaded.
* **The electron test harness** starts with the Start Window switched off, unless a scenario asks for it. Older
  scenarios therefore see the editor exactly as before.
