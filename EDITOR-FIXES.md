# DraftCraft Pro 1.4.2 — editor interaction fixes

This update applies the supplied Editor / Beat Board / Page Actions prompt to
the React renderer that actually runs in the existing Electron desktop app.
The bundled Rust prototype is retained and remains separate from this runtime.

## Using the updated app

On an Apple Silicon Mac running macOS 13 or later, extract
`DraftCraft-Pro-macOS-Editor-Fixed.zip` and double-click
`Install-DraftCraft.command`. Keep the installer beside the supplied app and
Support folder. The installer checks the package, preserves an existing app
copy, signs and verifies the installed bundle with Apple's tools, then opens it.
Your existing local screenplay profile is retained.

## What changed

- Paragraph controls use one stable target. They appear outside the paper in a
  measured left gutter with a 20-pixel gap, or in a reserved row above the
  scrolling editor. Focus takes precedence over incidental hover while moving
  to the controls. Element changes retain text selection and are undoable.
  Paper dimensions, indentation and the existing paginator are unchanged.
  SmartType closes when its anchor moves, and places suggestions above the
  active input when there is insufficient room below it.
- Selected beat cards have width, height and corner handles. Pointer capture
  and zoom-adjusted deltas support panning, 40–200% zoom and grid snapping.
  The description area scrolls internally. Legacy natural-height cards retain
  their automatic height. Connectors follow measured dimensions. Preview
  gestures do not write document state; release saves one size patch. Undo
  Resize/Redo survive view switches and preserve later title, color, position
  and screenplay edits. Arrow keys on focused handles resize in 20-unit steps.
  Canceling a pointer gesture or pressing Escape discards its preview.
- Every page, including Page 1, has an Actions button and a secondary-click
  menu. Control-click and Shift+F10 are supported. Shared handlers implement
  copy, cut, before/after paste, duplicate, select contents and confirmed delete.
  Selected-text commands are separately labeled. Normal text shortcuts remain
  text commands. Page operations act on paragraph IDs and captured insertion
  boundaries; stale dialogs require an explicit refresh. Delete leaves an
  editable empty paragraph when no content remains. Existing locked scene
  numbers survive; inserted scene headings receive new IDs and no locked
  number. The status bar now uses the same paginator and the focused paragraph.
- The sandboxed, isolated preload exposes only narrow clipboard methods.
  Electron 44 uses asynchronous ClipboardItem reads/writes, so the bridge
  awaits a native write before Cut can delete. Page copies contain readable
  plain text and a versioned HTML payload for lossless DraftCraft paste.
  Paragraph, note, bookmark and dual-dialogue group IDs are regenerated for
  inserted copies. Unsupported or corrupt clipboard content is reported.
  No clipboard cache is substituted for the OS clipboard.

## Verification

See `verification/Validation.md`, the fresh JSON results and screenshots.
The original `UI-refinement` and `desktop/Validation` folders remain historical
evidence and are not used to claim that these new changes passed.

Build/type checks, seven document-model tests, fourteen production-renderer
interaction groups and six Electron clipboard/IPC checks passed. Signature
and resource checks are independent Linux checks, not Apple's verification.
Launch, Gatekeeper, Apple codesign, native printing, M2 performance and macOS
clipboard persistence across application restart remain unverified here.

## Rebuilding

The supplied dependency ranges have an existing optional peer conflict
between Vite and the separately declared esbuild version. No dependency was
upgraded to fix it. Install the locked dependencies with
`npm ci --legacy-peer-deps`, and do the same in `desktop/`.

Run `npm run lint`, `npm run build` and `node desktop/build.cjs`. The last
command builds and stages the actual desktop renderer, API and offline fonts.
For a fresh Electron distribution, retain `desktop/package.mjs`.
To reuse the supplied signed runtime, run `desktop/repackage.mjs` with separate
input/output app paths. On Linux set RCODESIGN to the verified rcodesign binary;
on macOS it uses `desktop/sign-macos.sh`. The repackager updates ASAR integrity
and bundle versions and refuses distribution if signing fails. Regenerate the
installer's integrity manifests after any payload changes.

Run model checks with `node --import tsx --test verification/page-model.test.ts`.
The browser suite needs Playwright and a Chromium executable, a freshly staged
desktop build and, optionally, DRAFTCRAFT_CHROMIUM pointing to that executable.
The native clipboard test runs with Electron and an available desktop display.
It exercises clipboard content and should be run in a test session.
