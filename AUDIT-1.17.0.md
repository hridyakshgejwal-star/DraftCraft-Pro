# DraftCraft Pro 1.17.0 — gap audit (before any change)

Each item from the 1.17.0 prompt was confirmed against the 1.16.2 source (commit `6a0151f`). Paths are relative to
the repository.

| # | Item | What the 1.16.2 code shows |
|---|---|---|
| 1 | Emoji | Text is measured with canvas `measureText` per grapheme (`src/production/layout.ts:17–24, 41–43`). Emoji therefore go through the same path as other text. Nothing tests them: typing, wrapping against the editor, PDF, FDX/Fountain or Undo. There is no Insert › Emoji command (`desktop/main.cjs:110`, Insert menu). |
| 2 | Nested outline elements; ripple insert | `OutlineMarker` has no parent field (`src/types/script.ts:297–309`). Timeline moves change one element only (`src/workspace/Timeline.tsx`), and a new element never pushes the following ones. |
| 3 | Custom autocorrect | `WritingSettings.autocorrect` is a boolean (`src/writing/model.ts:33`). Correction comes only from the dictionary (`src/writing/spelling.ts:46, 91`). There are no user replacement pairs. |
| 4 | Navigator zoom | `const [zoomLevel, setZoomLevel] = useState('normal')` (`src/components/NavigatorSidebar.tsx:89`). `setZoomLevel` is never called, and there is no control. |
| 5 | Cast List and screen time | The Cast tab shows lines, words, voice and highlight (`NavigatorSidebar.tsx`, characters tab). It has no per-character scene, page or eighth totals and no screen-time estimate. The "Cast List" in `ScriptEditor.tsx:1304` is a stage-play element, not a Navigator panel. |
| 6 | Customizable status bar | `<footer className="dc-statusbar">` has no context menu, and every item is always shown (`src/components/StatusBar.tsx:94`). |
| 7 | Auto-hide right scene numbers | Placement is only left, right, both or none (`ScriptEditor.tsx:112, 1745`; `src/production/print.ts`). There is no option to hide a right number that would run into a long heading. |
| 8 | Netflix feature template | The templates (`src/utils/screenplayTemplates.ts`) include feature, short, beginners, Easy-Write, TV and others, but no Netflix-style feature template. |
| 9 | Beat Board | Cards can only be arranged by act (`src/components/BeatBoard.tsx:335`), and there are no saved board views. A card drag calls `onBeatsChange` on every pointer move (`BeatBoard.tsx:177–198`): one Undo step, but a document change (and an autosave) per move. |
| 10 | Navigator table | Only the heading can be edited in place (`NavigatorSidebar.tsx`, `SceneTable`). Columns have a fixed order (`NAVIGATOR_COLUMNS`), and the sort is local state (`sortField`/`sortAsc`), lost on relaunch. |
| 11 | Dictation helper | `desktop/native/Dictation.swift` and `build.sh` exist. The offline build reuses the 1.15.2 runtime, which has no helper, so dictation reports it is unavailable. |
| 12 | Languages, right to left | Spelling supports only `language: 'en-US' \| 'en-GB'` (`src/writing/model.ts:39`), with dictionaries for those two only. The editor sets no text direction (`ScriptEditor.tsx`: no `dir` attribute), so right-to-left paragraphs follow the page's left-to-right direction. |
| 13 | Accessibility | The script's text fields have no accessible name: there is no `aria-label` with the element (`ScriptEditor.tsx`, the `FragmentTextarea` props), so VoiceOver says only "text area". There is no element-number announcement. |
| 14 | Long scripts | All pages are rendered. Off-screen pages are skipped by `content-visibility`, but React still compares every page (`ScriptEditor.tsx`, `pages.map`). |
| 15 | Moved file across relaunch | File identities are kept only in memory: `this.identities = new Map()` with `remember()` (`desktop/project-files.cjs:19–27`). They are not saved, so a project moved while the app was closed is "missing" at the next launch. |
| 16 | Idea to Draft tutorials | Not present. Help has Getting Started (a plain text file), Keyboard Shortcuts and Show Local Data Folder (`desktop/main.cjs:117`). |
| 17 | In-app guide | Getting Started opens `Getting-Started.txt` in an external editor (`desktop/main.cjs:117–120`). |
