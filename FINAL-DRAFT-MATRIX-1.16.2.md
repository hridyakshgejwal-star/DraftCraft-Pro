# DraftCraft Pro 1.16.2 — Final Draft 13 comparison matrix

This matrix compares DraftCraft Pro with Final Draft 13 feature by feature, using Final Draft's documentation and the
user's reference screenshots (Outline Editor, toolbar customization, Navigator and Beat Board). It states what
DraftCraft Pro does now; it does not claim Final Draft parity where there is none.

**Statuses**

| Status | Meaning |
|---|---|
| **Verified** | Implemented and verified. Automated tests passed on the exact 1.16.2 payload: renderer suites in headless Chromium, and window, file and menu behaviour in real Electron 44.7.0 on Linux (Xvfb). This does **not** mean it was tested on macOS. |
| **Implemented** | Implemented but unverified. It exists in the active UI, but no automated test exercises it directly in 1.16. |
| **Partial** | Partially implemented; what is missing is named. |
| **Missing**, **Broken**, **Blocked** | As named. "Blocked" names the dependency. |

Columns: *Before* is the status in 1.15.4 as found in the Phase 1 audit, and *1.16* is the status in 1.16.2 (rows changed
in 1.16.1 or 1.16.2 are marked ▲). *Evidence* names
the suite (`verification/run-release-tests.py`, 20 suites) or the Electron script (`verification/electron/`).

## 1. Toolbar, menus and window

| Feature | Final Draft 13 reference | Before | 1.16 | What changed / evidence | Remaining |
|---|---|---|---|---|---|
| Main toolbar with document, edit, screenplay, workspace and formatting controls | Customizable toolbar | Partial: a fixed command strip; several buttons were inert | **Verified** | 64 commands, each wired. The workspace suite's "every toolbar item is wired" check runs all of them: each changes the document, the window or opens its dialog, with no page errors. | — |
| Customize: add, remove, reorder, display mode, small size, reset, persistence | View › Customize Toolbar | Partial | **Verified** | workspace "toolbar customization" (including reload) | — |
| Drag and drop in the Customize sheet ▲ | Drag items into the toolbar | Missing | **Verified** | workspace "toolbar customization by real drag and drop": list → toolbar at the drop point, reorder, drag out, Default Set | Dragging in from the list did not work in 1.16.0–1.16.1; fixed in 1.16.2. |
| Hide/show toolbar sections ▲ | Toolbar visibility | Missing | **Verified** | workspace "toolbar groups (#29)": the toolbar menu, the Customize sheet and View › Toolbar Groups; saved; no stray gaps | Groups are fixed (seven). |
| Overflow on narrow windows; no overlap with the script | — | Missing | **Verified** | workspace "overflow" and "Phase 9 #11" (1024–1920 px; no control is cut off) | — |
| Element selector showing the current element | Elements pop-up | Implemented | **Verified** | workspace "caret stays in the script" | — |
| Native menus: File, Edit, View, Format, Insert, Document, Tools, Production, Window, Help | Final Draft menu bar | Partial: View/Format items missing; Header & Footer unreachable | **Verified** (command path) / not checked on macOS | Every item sends `ws:<id>` and check marks follow the state. Covered by workspace "native menu commands", the Electron lifecycle scenarios (File menu) and the toolbar check (the same command ids). | Looking at the menus on a Mac. |
| Traffic lights, unified title/toolbar, drag regions | macOS window chrome | Partial (drawn controls) | **Implemented** (macOS only) | `titleBarStyle: hiddenInset`, `trafficLightPosition`, drag regions in CSS. Linux Electron uses a frameless window, so this cannot be tested here. | Mac check. |
| Full screen | Enter Full Screen | Implemented | **Implemented** | State is reported to the renderer (`desktop:window-state`). | Mac check. |
| Multiple document tabs | Window tabs | Missing | **Implemented** (macOS only) | `tabbingIdentifier`, New Tab ⌘T, tab bar +, Show Tab Bar, Previous/Next Tab, Move Tab to New Window, Merge All Windows | Mac check. |
| Keyboard shortcuts | Default shortcuts, customizable | Verified | **Verified** | shortcuts suite (250-page latency budget) | — |
| Right-click menus | Context menus in text and panels | Partial: page menu in the script only; other text fields showed nothing in the desktop app | **Verified** | The script menu adds B/I/U, ScriptNote, Bookmark and an Element list. Every other field gets the native editing menu. Covered by workspace "Phase 9 #6" and Electron lifecycle "right-click". | — |
| Escape closes dialogs | Standard | Partial (a few dialogs) | **Verified** | `DialogOverlay` `onClose`; exercised by "every toolbar item is wired" | — |

## 2. Outline Editor timeline (highest priority)

| Feature | Final Draft 13 reference | Before | 1.16 | Evidence | Remaining |
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
| Horizontal scroll and trackpad pan | — | Missing | **Implemented** | Native overflow plus a wheel handler | — |
| Create, move, resize and change the lane of outline elements | Drag, resize, change lane | Missing | **Verified** | "create, rename, move, resize, move between lanes…" | — |
| Rename, describe, Goal pages, delete, Undo, duplicate | Element editing | Missing | **Verified** | same check | — |
| Colour; copy, cut and paste | — | Missing | **Implemented** | Context menu, ⌘C/⌘X/⌘V | — |
| Goals beyond the written pages | Planning longer than the draft | — | **Verified** | Positions beyond the script length are kept. | — |
| Open the scene or page for an element | Go to Script | Missing | **Implemented** | "Go to Script" button | — |
| Click selects; double-click opens the scene | Same | Missing | **Verified** | "double-click opens a scene" | — |
| Reorder written scenes from the timeline: explicit and undoable | Drag scenes | Missing | **Verified** | "dragging a written scene moves its text only after confirmation, as one Undo step" | — |
| Sync with the Beat Board (title, description, colour, goals) | Shared outline data | Missing | **Verified** | A Beat Board rename shows on the timeline; the goal label shows on the card. | — |
| Show/Hide; height; collapse; Fit Script; remembered zoom | View options | Missing | **Verified** (Fit Selection and remembered scroll: Implemented) | "zoom, fit, lanes, hide/show without touching the document" | — |
| Story Map / Act Breaks ribbon kept, default off | — | Verified | **Verified** | story suite (unchanged) | — |
| Performance on long scripts ▲ | — | — | **Verified** (Linux) | Incremental pagination, page cache, batched fragment positioning. At 250 pages, typing is about 4× faster than 1.16.0; Return with every page moving is about 3.5× faster (`TEST-RESULTS-1.16.1.md`) | Not virtualized; not benchmarked on a Mac. |

## 3. Beat Board and outlining

| Feature | Final Draft 13 | Before | 1.16 | Evidence |
|---|---|---|---|---|
| Coloured cards, free positioning, resizing, zoom/pan, grid snap | Beat Board | Verified | **Verified** | editor suite (card resizing at 40/100/200 %) |
| Undo/Redo for every board change | Undo | Partial (resize only) | **Verified** | workspace "Beat Board" |
| Copy, paste, duplicate, delete; right-click menus | Card commands | Partial | **Verified** | workspace "Beat Board" |
| Select All, multi-select | — | Implemented | **Implemented** | ⌘A |
| Distribute across/down; Arrange by Act | Arrange | Missing | **Verified** (Arrange by Act) / **Implemented** (distribute) | workspace "Beat Board" |
| Sequence grouping | Sequences | Missing | **Partial** | Acts only; sequences live on the timeline. |
| Filter / search | — | Missing | **Verified** | workspace "Beat Board" |
| Flow lines | Connect beats | Verified | **Verified** | story suite |
| Target page ranges on cards | Goal pages | Missing | **Verified** | timeline check (goal label) |
| Place on Timeline / Send to Script | Send to Script | Partial (Send to Script only) | **Verified** | workspace "Beat Board"; `production-completion.test.ts` |
| Hide/show outline paragraphs without deleting them | Show/Hide Outline Elements | Missing | **Verified** | workspace "Show/Hide Outline Elements" |
| Persistence when saved and reopened | — | Verified | **Implemented** (format unchanged) | `outlineLanes`, `outlineMarkers` and `beats` are saved as in 1.15; no new round-trip test was written for 1.16 data. |

## 4. Navigator

| Feature | Final Draft 13 Navigator 2.0 | Before | 1.16 | Evidence / remaining |
|---|---|---|---|---|
| Scenes, Cast, Notes, Bookmarks and Tags tabs | Navigator tabs | Verified | **Verified** | story and production suites |
| Locations tab | Locations | Missing | **Verified** | workspace "Navigator" |
| Outline / script-structure tab | Outline | Missing | **Verified** | workspace "Navigator" |
| User-created and renameable tabs | Custom tabs | **Broken** in the desktop app (`window.prompt`) | **Verified** | inline fields |
| Configurable columns | Columns | **Broken** (the choices were ignored) | **Verified** | workspace "Navigator Scenes" |
| Sorting and filtering | Sort / filter | Partial (filter only) | **Verified** | scene sort; locations sort |
| Resizable columns ▲ | Column widths | Missing | **Verified** | workspace "Navigator scene table (#27)": drag, keys and double-click; header sorting; in-place headings; widths saved | Columns cannot be reordered. |
| In-cell editing | Edit in place | Missing | **Partial** | Scene headings only |
| Scene reordering | Drag rows | Implemented (Move Up/Down) | **Implemented** | Also from the timeline (Verified) |
| Character statistics, interactions, colour, rename everywhere | Characters | Partial (no interactions) | **Verified** (interactions) / **Implemented** (others) | — |
| CSV export | Export | Implemented | **Implemented** | — |
| Navigator resize, hide, restore | Dock/resize | Partial (it overflowed its column) | **Verified** | "Phase 9 #11" (220–640 px, while dragging) |

## 5. Structure Lines

| Feature | Final Draft 13 | Before | 1.16 | Evidence / remaining |
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

| Area | Final Draft 13 | 1.16 | Evidence | Remaining |
|---|---|---|---|---|
| Automatic elements; Enter/Tab flow; SmartType; extensions; INT./EXT.; separators; transition colons; parentheses | Element flow | **Verified** | automatic-formatting, punctuation, enter-flow, templates | — |
| Return-key spelling correction (single high-confidence fix, protected names, one-step Undo) | — | **Verified** | enter-flow, spelling | — |
| Format Assistant, custom element formats | Format Assistant | **Verified** | repair, formats | — |
| Bold/Italic/Underline runs ★; paragraph alignment ★ | Text styles | **Verified** | workspace "styles" | — |
| Page, Normal and Speed View ★; Focus ★; Typewriter ★; Ruler ★; invisibles ★; Split ★ | View modes | **Verified** (Split: Implemented) | workspace "views" | — |
| Margins, pagination, keeping elements together, MORE/CONT'D, dual dialogue, widows/orphans | Pagination | **Verified** | formats, repair, models; Electron PDF parity (1.15.x) | PDF parity was not re-run on Mac for 1.16. |
| Scene numbers, A/B numbers, locked pages, revisions, title page, header/footer ★ (now reachable) | Production | **Verified** (header/footer: Implemented) | production | — |
| Revision mode, sets and colours, Track Changes, omitted scenes, reports, tags, breakdown | Production tools | **Verified** | production, repair | — |
| Index Cards, Scene View, alternative dialogue, ScriptNotes, bookmarks ★ (Next/Prev fixed), character highlighting, goals, sprint timer, statistics | Writing tools | **Verified** | story, production, workspace "Bookmark" | — |
| Table Read: voices per character, pacing, controls, start from a scene, follow along | Table Read | **Verified** with the speech engines present | table-read | macOS premium voices not tested. |
| Collaboration | Final Draft collaboration | **Verified** for a local/LAN relay | collaboration | Internet hosting needs a WSS/HTTPS server the user runs (documented in the panel). |
| FDX, FDXT, Fountain, TXT, RTF, PDF, HTML, `.draftcraft` | Import/export | **Verified** | interchange, production | Unsupported features are listed in the review dialog before export. |
| System, Light, Dark and Midnight appearance ★ | Appearance | **Verified** | workspace "appearance" | — |

## 7. Not matched

| Final Draft 13 feature | Status | Note |
|---|---|---|
| Final Draft's own cloud collaboration service | **Blocked** | It needs Final Draft's servers; DraftCraft uses its own relay. |
| Developer ID signing and notarization ▲ | **Owner runs it** | `Developer-ID/Sign-and-Notarize.command` signs, notarizes and staples on the owner's Mac with their certificate. It is tested only with stand-in tools; the delivered image is still ad-hoc signed. |
