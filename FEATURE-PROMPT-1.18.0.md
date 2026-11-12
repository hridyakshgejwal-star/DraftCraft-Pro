# MASTER PROMPT — DraftCraft Pro 1.18.0: Start Window and Emoji

You are working on DraftCraft Pro 1.17.0: an Electron 44.7.0 desktop app with a React 19 / TypeScript renderer, built
for Apple Silicon Macs. Add the two features below. Take the inspiration from Final Draft, but write original text,
layout and artwork; do not copy Final Draft's assets or wording.

## What 1.17.0 does today (confirm each point in the code first, with file and line)

* **Launch.** The app opens straight into the last document. There is no start window and no list of recent projects.
* **File menu.** There is no File › Open Recent.
* **Emoji.** Insert › Emoji & Symbols only opens the macOS character viewer (`app.showEmojiPanel()`). DraftCraft has no
  emoji picker of its own, no toolbar button and no right-click entry. Many writers never find the macOS viewer.

## A. Start Window (the dialog box shown when the app opens)

**1. When it appears.**
* It appears once, when DraftCraft Pro is launched normally.
* It does **not** appear in these cases:
  * when the app is opened by a file (double-click in Finder, Open With, drag to the Dock icon);
  * for File › New Tab or New Document Window;
  * when the writer has switched it off.

**2. What it offers.** Arrange it in clear sections, like Final Draft's start screen.

| Section | Contents |
|---|---|
| Create | *New Screenplay*, with the default template. Quick-start tiles for common formats: Feature Screenplay, Television Pilot, Multi-Camera Sitcom, Stage Play, Streaming Feature (Netflix-style), Short Film. *More Templates…* opens File › New from Template. |
| Open | *Open…*: the native Open dialog for .draftcraft, .fdx, .fountain, .txt, .rtf and .pdf. |
| Recent | The projects opened or saved most recently: title, file name, folder and date. Each row has a menu: Open, Show in Finder, Remove from List. A missing file is shown as missing and can be removed. The list has a filter and a *Clear Recent List* command. |
| Continue | Return to the document that is already open, by title. |
| Learn | Idea to Draft (feature, pilot, stage play), Getting Started, and What's New in 1.18.0. |

**3. Settings.**
* A checkbox, *Show this window when DraftCraft Pro opens*, is on by default and saved on this computer.
* File › Start Window… reopens the window at any time.

**4. Open Recent in the File menu.**
* File › Open Recent shows the same recent projects, with Clear Menu.
* On macOS, use the system recent-documents list so the Dock menu shows them too.

**5. Safety and data.**
* Every create or open goes through the existing save workflow. Unsaved changes are resolved first: Save, Don't
  Save or Cancel.
* The renderer never sends a file path to the main process. It asks for a recent entry by id, and the main process
  checks that id against its own list.
* The recent list is stored atomically in the profile folder, at most 20 entries, with no file contents.
* A file that is already open in another window brings that window to the front instead.
* The window makes no network requests.

**6. Keyboard and VoiceOver.**
* It is a real dialog, and focus starts on New Screenplay.
* Tab moves between sections. The arrow keys move through the recent list and the tiles. Return opens, Escape
  continues with the current document.
* Every control has a VoiceOver name, and the recent rows read their title, folder and date.

## B. Emoji

**1. DraftCraft's own emoji picker.**
* Open it from:
  * Insert › Emoji…
  * a toolbar button (*Emoji*, in the default toolbar)
  * the script's right-click menu (*Insert Emoji…*)
  * a keyboard shortcut that does not clash with existing ones
* Keep Insert › Emoji & Symbols for the macOS character viewer.

**2. Picker contents.**
* Search by name and keyword.
* Categories: Smileys, People, Animals & Nature, Food & Drink, Activities, Travel & Places, Objects, Symbols, Flags.
* A *Recently Used* row, saved on this computer.
* Keyboard navigation of the grid, and a VoiceOver name for every emoji.

**3. Where emoji go.**
* The picker inserts at the caret of the text field that had focus: script elements, Beat Board cards, ScriptNotes,
  the title page and other text fields.
* Each insertion is one Undo step, exactly like typing.
* Focus returns to that field.

**4. Layout.** Emoji keep 1.17.0's line breaking, Final Draft/Fountain round trip and PDF parity. Pagination of text
without emoji must not change.

## C. Also fix

* **Getting Started window.** It shows the hard line breaks of its source text, so sentences break mid-line. Reflow
  paragraphs, but keep lists and blank-line paragraph breaks. This was found in the 1.17.0 Mac check.

## Rules

* **Before building anything,** reproduce or confirm each gap in the current code, with the file and line.
* **Tests for every feature.**
  * Unit tests: the recent-list store, emoji data integrity and search, guide reflow.
  * Browser checks with real interactions: clicks, keys, real pointer use.
  * A real-Electron scenario for the Start Window: launch shows it; launch with a file does not; a recent project
    opens; a missing one is shown and removable; the checkbox is respected at the next launch.
* **Keep everything passing.**
  * All 20 release suites, at their default latency budgets.
  * Electron lifecycle (13 plus the new scenarios), save scenarios (43) and editor ↔ PDF parity.
  * The `layout-incremental` test stays green.
* **Release.** Version 1.18.0. Build the DMG only from the exact payload that passed every check.
* **Report.**
  * CHANGELOG with root causes
  * TEST-RESULTS
  * LIMITATIONS
  * an updated FINAL-DRAFT-MATRIX with honest statuses (Verified / Implemented / Partial / Missing / Blocked)
* **Deliver and check on the Mac.**
  * Deliver the DMG to ~/Downloads and in chat.
  * Run the read-only Mac image check.
  * Run the native self-test, extended with Start Window and emoji-picker checks, from a `/tmp` test copy with its
    own profile.
  * Never touch the installed app or the normal profile.
