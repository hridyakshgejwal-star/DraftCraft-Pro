# DraftCraft Pro 1.18.0 — Final Draft 13 comparison matrix

This matrix compares DraftCraft Pro with Final Draft 13 feature by feature, using Final Draft's documentation and the
user's reference screenshots (Outline Editor, toolbar customization, Navigator and Beat Board). It states what
DraftCraft Pro does now; it does not claim Final Draft parity where there is none.

**Statuses**

| Status | Meaning |
|---|---|
| **Verified** | Implemented and verified. Automated tests passed on the exact 1.18.0 payload: renderer suites in headless Chromium, and window, file and menu behaviour in real Electron 44.7.0 on Linux (Xvfb). This does **not** by itself mean it was tested on macOS. |
| **Mac** | Checked on an Apple Silicon Mac. The Mac checks of this image (read-only image check and the native self-test) run after the image is built; their record is `MAC-CHECK-1.18.0.md`, delivered next to the image. Rows marked *Mac check* list what that record covers. |
| **Implemented** | Implemented but unverified. It exists in the active UI, but no automated test exercises it directly in 1.16. |
| **Partial** | Partially implemented; what is missing is named. |
| **Missing**, **Broken**, **Blocked** | As named. "Blocked" names the dependency. |

Columns: *Before* is the status before the 1.16 work (1.15.4), and *1.18* is the status in 1.18.0. Rows changed or
added in 1.18.0 are marked ✚ (◆ marks 1.17.0 changes, ▲ marks 1.16.1/1.16.2 changes). *Evidence* names the suite
(`verification/run-release-tests.py`, 20 suites), the Electron script (`verification/electron/`) or the unit test.
The 1.18.0 audit (file and line for each gap before any change) is `AUDIT-1.18.0.md`.

## 1. Toolbar, menus and window

| Feature | Final Draft 13 reference | Before | 1.18 | What changed / evidence | Remaining |
|---|---|---|---|---|---|
| Main toolbar with document, edit, screenplay, workspace and formatting controls | Customizable toolbar | Partial: a fixed command strip; several buttons were inert | **Verified** | 65 commands (1.18.0 adds Emoji ✚), each wired. The workspace suite's "every toolbar item is wired" check runs all of them: each changes the document, the window or opens its dialog, with no page errors. | — |
| Customize: add, remove, reorder, display mode, small size, reset, persistence | View › Customize Toolbar | Partial | **Verified** | workspace "toolbar customization" (including reload) | — |
| Drag and drop in the Customize sheet ▲ | Drag items into the toolbar | Missing | **Verified** | workspace "toolbar customization by real drag and drop": list → toolbar at the drop point, reorder, drag out, Default Set | Dragging in from the list did not work in 1.16.0–1.16.1; fixed in 1.16.2. |
| Hide/show toolbar sections ▲ | Toolbar visibility | Missing | **Verified** | workspace "toolbar groups (#29)": the toolbar menu, the Customize sheet and View › Toolbar Groups; saved; no stray gaps | Groups are fixed (seven). |
| Overflow on narrow windows; no overlap with the script | — | Missing | **Verified** | workspace "overflow" and "Phase 9 #11" (1024–1920 px; no control is cut off) | — |
| Element selector showing the current element | Elements pop-up | Implemented | **Verified** | workspace "caret stays in the script" | — |
| Native menus: File, Edit, View, Format, Insert, Document, Tools, Production, Window, Help ◆✚ | Final Draft menu bar | Partial: View/Format items missing; Header & Footer unreachable | **Verified** (command path); *Mac check* | Every item sends `ws:<id>` and check marks follow the state: workspace "native menu commands", Electron lifecycle (File menu). 1.17.0 adds Insert › Emoji & Symbols, View › Announce Element Number, Format › Scene Numbers › Auto-hide, Help › Getting Started and Help › Idea to Draft. 1.18.0 adds File › Open Recent, File › Start Window… and Insert › Emoji… (⌃⌘E). The self-test toggles View › Navigator and Timeline and reads their check marks in the real menu (passes in Linux Electron). | — |
| Start Window at launch: create (default template and six formats), Open…, Recent Projects, Learn, Continue, launch preference ✚ | Start Window | Missing | **Verified**; *Mac check* | Browser workspace #41 (every control). Electron `start-window-scenarios.cjs`, 6 scenarios: first launch; Open… recorded; recent open, missing, remove; preference kept across relaunch; a launch with a file skips it; unsaved changes resolved first. `recent-projects.test.cjs`. Self-test steps `start-window` and `recent-projects`. | A panel in the document window, not a separate window; no thumbnails or pinning. |
| File › Open Recent, Clear Menu; macOS recent documents ✚ | File › Open Recent | Missing | **Verified**; *Mac check* | Electron start-window scenarios (the menu updates, opens a project, Clear Menu); the self-test reads the real menu | A moved file is not followed (it shows as missing). The system list covers .draftcraft, .fdx and .fountain. |
| Traffic lights, unified title/toolbar, drag regions | macOS window chrome | Partial (drawn controls) | **Implemented**; *Mac check* | `titleBarStyle: hiddenInset`, `trafficLightPosition`, drag regions in CSS. The self-test records the traffic-light position and a window capture. | — |
| Full screen | Enter Full Screen | Implemented | **Implemented**; *Mac check* | State is reported to the renderer (`desktop:window-state`). The self-test enters and leaves full screen and waits for both events (Xvfb has no window manager, so this step cannot pass on Linux). | — |
| Multiple document tabs | Window tabs | Missing | **Implemented**; *Mac check* | `tabbingIdentifier`, New Tab ⌘T, tab bar +, Show Tab Bar, Previous/Next Tab, Move Tab to New Window, Merge All Windows. The self-test opens a tab, checks the shared tab group, calls Merge All Windows and closes the tab. | — |
| Keyboard shortcuts | Default shortcuts, customizable | Verified | **Verified** | shortcuts suite (250-page latency budget) | — |
| Right-click menus | Context menus in text and panels | Partial: page menu in the script only; other text fields showed nothing in the desktop app | **Verified** | The script menu adds B/I/U, ScriptNote, Bookmark and an Element list. Every other field gets the native editing menu. Covered by workspace "Phase 9 #6" and Electron lifecycle "right-click". | — |
| Escape closes dialogs | Standard | Partial (a few dialogs) | **Verified** | `DialogOverlay` `onClose`; exercised by "every toolbar item is wired" | — |

## 2. Outline Editor timeline (highest priority)

| Feature | Final Draft 13 reference | Before | 1.18 | Evidence | Remaining |
|---|---|---|---|---|---|
| Horizontal timeline under the toolbar, above the script | Outline Editor | Missing (Story Map ribbon only) | **Verified** | workspace timeline checks | — |
| Lanes for Acts, Sequences and Beats, plus custom lanes | Outline 1–4 lanes | Missing | **Verified** | Add, rename and collapse lanes | — |
| Lane colour, reorder, delete | Lane options | Missing | **Implemented** | Lane menu | — |
| Script lane: every scene with its number, location, colour and page length | Script lane | Missing | **Verified** | "Script lane follows the real pagination" | — |
| Ruler from the real pagination (never word counts) | Page ruler | Missing | **Verified** | Adding text moves later scenes right. | — |
| Fractional pages: zoom to about ⅛ page; ⅛-page snapping | Zoom; snapping | Missing | **Verified** | Resize snaps to 7.5; zoom range 4–640 px per page | — |
| Caret position indicator | Current position | Missing | **Verified** | "caret indicator follows the caret" | — |
| Auto-scroll to the caret | — | Missing | **Implemented** | `followCaret` | — |
| Target script length line | Target page count | Missing | **Implemented** | Settings menu | — |
| Horizontal scroll and trackpad pan | — | Missing | **Implemented** | Native overflow plus a wheel handler | A real trackpad gesture cannot be produced by the automated checks, here or in the Mac self-test. |
| Create, move, resize and change the lane of outline elements | Drag, resize, change lane | Missing | **Verified** | "create, rename, move, resize, move between lanes…" | — |
| Rename, describe, Goal pages, delete, Undo, duplicate | Element editing | Missing | **Verified** | same check | — |
| Colour; copy, cut and paste | — | Missing | **Implemented** | Context menu, ⌘C/⌘X/⌘V | — |
| Nested elements (a scene inside its sequence) ◆ | Outline Editor nesting | Missing | **Verified** | `outlineNesting.ts`; nesting unit tests; workspace #35 with real pointer drags: nest, carry the children, Option-drag moves only the parent, Undo | — |
| Ripple insert ◆ | Ripple | Missing | **Verified** | Timeline setting (default on); unit test of the shifts and a workspace check | — |
| Keyboard: Home/End, Shift+F10 / context-menu key ◆ | — | Missing | **Verified** | workspace accessibility check | — |
| Goals beyond the written pages | Planning longer than the draft | — | **Verified** | Positions beyond the script length are kept. | — |
| Open the scene or page for an element | Go to Script | Missing | **Implemented** | "Go to Script" button | — |
| Click selects; double-click opens the scene | Same | Missing | **Verified** | "double-click opens a scene" | — |
| Reorder written scenes from the timeline: explicit and undoable | Drag scenes | Missing | **Verified** | "dragging a written scene moves its text only after confirmation, as one Undo step" | — |
| Sync with the Beat Board (title, description, colour, goals) | Shared outline data | Missing | **Verified** | A Beat Board rename shows on the timeline; the goal label shows on the card. | — |
| Show/Hide; height; collapse; Fit Script; remembered zoom | View options | Missing | **Verified** (Fit Selection and remembered scroll: Implemented) | "zoom, fit, lanes, hide/show without touching the document" | — |
| Story Map / Act Breaks ribbon kept, default off | — | Verified | **Verified** | story suite (unchanged) | — |
| Performance on long scripts ◆ | — | — | **Partial** | 1.17.0: far pages render from cache and refresh in idle time, plus the per-keystroke savings in `CHANGELOG-1.17.0.md` item 14. Return at the start of 250 pages, same host and probe: p50 69 → 53 ms (1.16.2 → 1.17.0); in the mixed 250-page script, keydown → paint p50 48–56 ms (`TEST-RESULTS-1.17.0.md`). | The 50 ms target is not met in the 2-vCPU test container; *Mac check* measures it on the Mac. |

## 3. Beat Board and outlining

| Feature | Final Draft 13 | Before | 1.18 | Evidence |
|---|---|---|---|---|
| Coloured cards, free positioning, resizing, zoom/pan, grid snap | Beat Board | Verified | **Verified** | editor suite (card resizing at 40/100/200 %) |
| Undo/Redo for every board change | Undo | Partial (resize only) | **Verified** | workspace "Beat Board" |
| Copy, paste, duplicate, delete; right-click menus | Card commands | Partial | **Verified** | workspace "Beat Board" |
| Select All, multi-select | — | Implemented | **Implemented** | ⌘A |
| Distribute across/down; Arrange by Act; Arrange by Sequence ◆ | Arrange | Missing | **Verified** (Arrange by Act and by Sequence) / **Implemented** (distribute) | workspace "Beat Board", #36 |
| Sequence grouping ◆ | Sequences | Missing | **Verified** | Arrange by Sequence uses the Outline Editor's sequences; parent badges on cards (workspace #36) |
| Saved board views ◆ | Board views | Missing | **Verified** | Save, show, update, rename and delete; saved in the project (workspace #36) |
| One change and one Undo per drag ◆ | — | Partial (a document change per pointer move) | **Verified** | Real pointer drag: one document change, one Undo, Escape cancels (workspace #36) |
| Keyboard control ◆ | — | Missing | **Verified** | Arrows move, `[` `]` select, Return edits, Shift+F10 menu (workspace accessibility check) |
| Filter / search | — | Missing | **Verified** | workspace "Beat Board" |
| Flow lines | Connect beats | Verified | **Verified** | story suite |
| Target page ranges on cards | Goal pages | Missing | **Verified** | timeline check (goal label) |
| Place on Timeline / Send to Script | Send to Script | Partial (Send to Script only) | **Verified** | workspace "Beat Board"; `production-completion.test.ts` |
| Hide/show outline paragraphs without deleting them | Show/Hide Outline Elements | Missing | **Verified** | workspace "Show/Hide Outline Elements" |
| Persistence when saved and reopened | — | Verified | **Implemented** (format unchanged) | `outlineLanes`, `outlineMarkers` and `beats` are saved as in 1.15; no new round-trip test was written for 1.16 data. |

## 4. Navigator

| Feature | Final Draft 13 Navigator 2.0 | Before | 1.18 | Evidence / remaining |
|---|---|---|---|---|
| Scenes, Cast, Notes, Bookmarks and Tags tabs | Navigator tabs | Verified | **Verified** | story and production suites |
| Locations tab | Locations | Missing | **Verified** | workspace "Navigator" |
| Outline / script-structure tab | Outline | Missing | **Verified** | workspace "Navigator" |
| User-created and renameable tabs | Custom tabs | **Broken** in the desktop app (`window.prompt`) | **Verified** | inline fields |
| Configurable columns | Columns | **Broken** (the choices were ignored) | **Verified** | workspace "Navigator Scenes" |
| Sorting and filtering | Sort / filter | Partial (filter only) | **Verified** | scene sort; locations sort |
| Resizable and reorderable columns ◆ | Column widths and order | Missing | **Verified** | workspace #27 and #30: drag a header to reorder (real drag), Alt+←/→, widths and order saved | — |
| Sort remembered across relaunch ◆ | — | Missing | **Verified** | workspace preferences; reload check | — |
| In-cell editing ◆ | Edit in place | Missing | **Verified** | Heading, summary and comment in place; scene colour picker (workspace #30) |
| Scene reordering | Drag rows | Implemented (Move Up/Down) | **Implemented** | Also from the timeline (Verified) |
| Character statistics, interactions, colour, rename everywhere | Characters | Partial (no interactions) | **Verified** (interactions) / **Implemented** (others) | — |
| CSV export | Export | Implemented | **Implemented** (Cast List CSV: **Verified**) | — |
| Cast List with screen time ◆ | Cast List / reports | Missing | **Verified** | Scenes, pages, eighths, estimated screen time (one page a minute); sort; jump; CSV (unit tests and workspace #33) |
| Navigator text size ◆ | Navigator zoom | Missing (unused state) | **Verified** | 80–150 %, saved; works at 220 px (workspace #30) |
| Keyboard tabs ◆ | — | Missing | **Verified** | `role=tablist`, arrows, Home/End (workspace accessibility check) |
| Navigator resize, hide, restore | Dock/resize | Partial (it overflowed its column) | **Verified** | "Phase 9 #11" (220–640 px, while dragging) |

## 5. Structure Lines

| Feature | Final Draft 13 | Before | 1.18 | Evidence / remaining |
|---|---|---|---|---|
| Lines for acts, sequences, outline levels and scenes | Structure Lines | **Broken** (hard-coded by page number) | **Verified** | workspace "structure lines" |
| Navigate by clicking a line | — | Missing | **Verified** | same |
| Show/hide | — | Implemented | **Verified** | same |
| Never shift text or margins | — | — | **Verified** | The text column position is unchanged with lines on and off. |
| Colours ▲ | Assign colours | Missing | **Verified** | Element, beat and scene colours, plus a default colour per level (Structure Line Settings); workspace "Structure Line settings (#28)" |
| Width, opacity and per-level visibility ▲ | — | Missing | **Verified** | workspace "Structure Line settings (#28)"; Print and PDF use them (`workspace-settings.test.ts`) |
| Include/exclude in PDF | — | Fake line | **Implemented** | `print.ts` `structureLines` option, drawn from the same regions |

## 6. Screenplay editor, layout and production (Phase 7)

These areas were repaired and verified in 1.15.x and are re-verified on the 1.16.0 payload by their suites. Items newly
done in 1.16 are marked ★.

| Area | Final Draft 13 | 1.18 | Evidence | Remaining |
|---|---|---|---|---|
| Automatic elements; Enter/Tab flow; SmartType; extensions; INT./EXT.; separators; transition colons; parentheses | Element flow | **Verified** | automatic-formatting, punctuation, enter-flow, templates | — |
| Return-key spelling correction (single high-confidence fix, protected names, one-step Undo) | — | **Verified** | enter-flow, spelling | — |
| Format Assistant, custom element formats | Format Assistant | **Verified** | repair, formats | — |
| Bold/Italic/Underline runs ★; paragraph alignment ★ | Text styles | **Verified** | workspace "styles" | — |
| Page, Normal and Speed View ★; Focus ★; Typewriter ★; Ruler ★; invisibles ★; Split ★ | View modes | **Verified** (Split: Implemented) | workspace "views" | — |
| Margins, pagination, keeping elements together, MORE/CONT'D, dual dialogue, widows/orphans | Pagination | **Verified** | formats, repair, models, `layout-incremental.test.ts`; Electron PDF parity on the 1.18.0 payload (7 pages, 16 generated labels agree) | Unchanged in 1.17.0 for text without emoji, and unchanged in 1.18.0. PDF parity not run on a Mac. |
| Emoji ◆✚ | Emoji | **Verified**; *Mac check* (picker) | Line breaks at the renderer's break opportunities; FDX/Fountain round trip; Electron PDF parity with emoji. 1.18.0: the in-app emoji picker (Insert › Emoji…, toolbar, right-click; search, nine categories, Recently Used, keyboard, Shift-click, one Undo): workspace #40, `features-1180.test.ts`, self-test `emoji-picker` (real key events). Insert › Emoji & Symbols (Character Viewer) is kept (workspace #34). | No skin-tone chooser; English search names. The Character Viewer itself is macOS UI. |
| Custom autocorrect ◆ | Auto-correct pairs | **Verified** | writing suite; unit tests | — |
| Spelling languages and right-to-left text ◆ | Dictionaries, RTL | **Verified** (Linux: language list, the system-spellchecker bridge with a stand-in, RTL editing and print) | unit tests, writing suite, workspace #38 | The macOS dictionaries themselves: *Mac check* asks the system spellchecker about English, French and German words. No dictionaries are downloaded. |
| Streaming Feature (Netflix-style) template ◆ | Netflix template | **Verified** | templates suite | An independent adaptation, not an official Netflix file. |
| Auto-hide right scene numbers ◆ | Auto-hide scene numbers | **Verified** | unit tests; editor, print and PDF share one rule | — |
| Customizable status bar ◆ | Status bar items | **Verified** | workspace #31 | — |
| Scene numbers, A/B numbers, locked pages, revisions, title page, header/footer ★ (now reachable) | Production | **Verified** (header/footer: Implemented) | production | — |
| Revision mode, sets and colours, Track Changes, omitted scenes, reports, tags, breakdown | Production tools | **Verified** | production, repair | — |
| Index Cards, Scene View, alternative dialogue, ScriptNotes, bookmarks ★ (Next/Prev fixed), character highlighting, goals, sprint timer, statistics | Writing tools | **Verified** | story, production, workspace "Bookmark" | — |
| Table Read: voices per character, pacing, controls, start from a scene, follow along | Table Read | **Verified** with the speech engines present | table-read | Premium macOS voices: *Mac check* lists the installed voices and which are Premium or Enhanced; listening quality is not judged automatically. |
| Dictation ◆ | Dictation | **Implemented**; *Mac check* | The Speech helper was compiled on the owner's Mac and is packaged in `Contents/Resources` (`dictation-helper.test.cjs`). The self-test starts it with an unknown language (no permission prompt). | Dictating speech needs the writer's microphone and Speech Recognition permission; not automated. |
| VoiceOver ◆ | Accessibility | **Verified** (labels, live region, keyboard paths: workspace #37, Linux Electron self-test); *Mac check* | Element names, Ctrl+Shift+Period announcement, Navigator tabs, timeline and Beat Board keyboard use | Listening with VoiceOver itself is a manual check. |
| Moved projects across relaunch ◆ | — | **Verified** | `project-files.test.cjs` (3 relaunch tests) | — |
| Help: searchable Getting Started; Idea to Draft tutorials ◆; text wraps to the window ✚ | Help, Idea to Draft | **Verified** | `help-1170.test.ts`, `features-1180.test.ts` (no mid-sentence breaks), workspace #39 and #41 (What's New), smart-save tutorial check | Tutorial prompts are original DraftCraft text, not Final Draft's. |
| Collaboration | Final Draft collaboration | **Verified** for a local/LAN relay | collaboration | Internet hosting needs a WSS/HTTPS server the user runs (documented in the panel). |
| FDX, FDXT, Fountain, TXT, RTF, PDF, HTML, `.draftcraft` | Import/export | **Verified** | interchange, production | Unsupported features are listed in the review dialog before export. |
| System, Light, Dark and Midnight appearance ★ | Appearance | **Verified** | workspace "appearance" | — |

## 7. Not matched

| Final Draft 13 feature | Status | Note |
|---|---|---|
| Final Draft's own cloud collaboration service; hosted collaboration over the internet ◆ | **Blocked** | Needs a hosted WSS server, accounts and someone to run it (`PLAN-1.17.0-ITEMS-18-22.md`, item 20). DraftCraft's relay works on a local network. |
| Windows version ◆ | **Blocked** | Needs a Windows machine, the Windows Electron runtime and an Authenticode certificate (plan item 18). |
| iPad companion; cloud sync with conflict handling ◆ | **Missing** (sync conflicts) / **Blocked** (iPad) | Plan item 19. Saving into iCloud Drive or Dropbox folders works as plain files; conflicts are not merged. |
| Get Notes ◆ | **Not built** | Final Draft's service has no public API and no equivalent service exists (plan item 21). |
| Developer ID signing and notarization | **Owner runs it** | `Developer-ID/Sign-and-Notarize.command` signs (now including the Speech helper), notarizes and staples on the owner's Mac with their certificate. Tested with stand-in tools and syntax-checked on the Mac; never run against Apple's service. The delivered image is ad-hoc signed (plan item 22). |
