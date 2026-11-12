# DraftCraft Pro 1.18.0 — gap audit (before any change)

Each point of `FEATURE-PROMPT-1.18.0.md` was confirmed against 1.17.0 (commit `fd079bd`). Paths are relative to the
repository.

| Item | What the 1.17.0 code shows |
|---|---|
| **Start window at launch** | At startup, `app.whenReady` restores the saved window slots and calls `createWindow(slot)` for each (`desktop/main.cjs:351`). Nothing else is shown: the editor opens straight into the last document. There is no start or welcome component in `src/`. `WelcomeStatsModal.tsx` is a writing-statistics dashboard opened from Document › Welcome Dashboard, not a launcher. |
| **Recent projects** | `project-files.cjs` keeps document-to-file locations and file identities (`project-locations.json`, `project-identities.json`), but there is no ordered list of recently opened projects. `app.addRecentDocument` is never called. |
| **File › Open Recent** | The File menu (`desktop/main.cjs:105`) has New Screenplay, New Document Window, New from Template, Open…, Import PDF…, Save… and the exports. There is no Open Recent. |
| **Emoji** | Insert › Emoji & Symbols calls `app.showEmojiPanel()` (`desktop/main.cjs:109`), which opens only the macOS character viewer. The toolbar catalog (`src/workspace/commands.ts`) has no emoji item. The script's right-click menu (`src/components/ScriptEditor.tsx:513`) has no emoji entry. There is no emoji data or picker in `src/`. |
| **Getting Started line breaks** | Section text is rendered with `white-space: pre-line` (`src/workspace/workspace.css:323`, class `dc-guide-text` in `src/help/GettingStartedGuide.tsx:42`). The source text is hard-wrapped at about 120 columns (`src/help/guide.ts`) and 78 columns (`desktop/Getting-Started.txt`), so each source line break shows as a line break mid-sentence. Seen in the 1.17.0 Mac check. |
