# DraftCraft Pro 1.5.0 — Writing Assistance

Implemented in the existing React/TypeScript editor and Electron desktop app. The supplied Rust prototype is unchanged.

## Using the update

Open `DraftCraft-Pro-Writing-Assistance.dmg` and double-click `Install-DraftCraft.command`. Requires Apple Silicon and macOS 13 or later. The installer verifies the supplied files, installs the app, signs the installed copy with macOS tools, preserves the previous app, and opens DraftCraft Pro.

**Edit → Writing Assistance…** opens the settings. Both English dictionaries are bundled and operate offline.

- Completed misspelled words have red wavy underlines. Left-click, secondary-click, or place the caret in the word and press Shift+F10 for suggestions.
- Arrow keys navigate; Enter accepts; Escape dismisses. The popup provides Ignore Once, Ignore All in Document, Add to Dictionary, and Disable Autocorrect for This Word.
- Space and common punctuation correct established mistakes, preserving capitalization, surrounding text, and the caret. Ambiguous words and acronyms remain manual. Aggressive mode can use a unique nearby dictionary match.
- Cmd+Z reverses a correction; immediate Backspace restores the original word. Intentional restorations are remembered for that screenplay.
- CHARACTER elements automatically supply name suggestions. Up/Down selects; Enter or Tab accepts; Escape dismisses. Unicode, multiword names, delivery extensions, duplicate prevention, usage ranking, live renames, and name protection are supported.
- Character records and document exclusions are stored with the screenplay's existing autosaves, manual backups, and crash recovery snapshots. Older scripts reconstruct records from CHARACTER elements. Custom dictionary words and assistance settings persist in the local app profile.

FDX and Fountain preserve characters as screenplay text. Extra assistance metadata travels in full project backups. Autosave is deferred briefly to avoid writing on every keypress, with a maximum one-second write interval during continuous typing and a flush when the page closes or becomes hidden. An abrupt process or operating-system failure can lose the most recent unflushed input.

## Modified files

| Files | Change |
|---|---|
| `src/writing/model.ts` | Project character index, stable identities, matching, preferences, cached word counts |
| `src/writing/spelling.ts`, `spelling.worker.ts`, `useSpelling.ts` | Unicode ranges, conservative correction rules, background dictionary analysis, suggestions, caching and stale-result guards |
| `src/writing/dictionaries/` | Unmodified US/UK Hunspell dictionaries and licenses |
| `src/components/ScriptEditor.tsx` | Assistance event handling, undo/redo, correction reversion, composition protection, multiword-name fix, cached unchanged paragraph markup |
| `SpellingLayer.tsx`, `SpellingPopover.tsx`, `WritingAssistanceSettings.tsx` | Decoration mirror, contextual popup and settings |
| `src/utils/smartType.ts` | Unicode character recognition and preservation of known custom delivery extensions |
| `src/App.tsx` | Character synchronization, autosave/backup integration, persistent settings, cached statistics, native history routing |
| `MacOsMenubar.tsx`, `SmartTypePopover.tsx`, `src/index.css`, `src/types/` | Settings entry, accessible suggestions, assistance styles and data declarations |
| `desktop/main.cjs`, `preload.cjs`, `build.cjs`, package files and instructions | Native Undo/Redo routing, guarded fallback, worker policy, licenses and version 1.5.0 |
| `verification/` and package manifests | Automated assistance tests, updated harness timing, verification results and fresh installer checksums |

The paginator, FDX/Fountain codecs, PDF export engine, Beat Board, and page-action implementation are unchanged.

## Validation

- **20 model and bridge tests passed:** 11 assistance tests, 7 existing document/resize tests, and 2 tests of the exact native history handler/menu logic with controlled sender fixtures.
- **13 assistance browser groups passed** against the files extracted from the shipped app archive, including real dictionary-worker operation, clicking, secondary click, keyboard navigation, native menu command routing, autocorrect, undo/redo, character suggestions, persistence, preferences, composition, stale results, printing, themes, and 50/100/200% zoom.
- **14 earlier editor browser groups passed,** including 90 formatting-placement combinations, page copy/cut/paste/delete and undo, selection, resize handles, zoom/pan/grid, view switches, connector geometry, and persistence.
- **10/50/120/250-page scripts checked** for typing, worker operation, autocomplete and autosave. The 250-page sample contained 1,995 paragraphs. Recorded key-event latency was 82 ms median and 105 ms at the 95th percentile, including automation round trips. Main-page JavaScript heap was approximately 94 MB; this excludes worker, native and graphics memory. These are Linux headless Chromium measurements, not Mac mini M2 benchmarks.
- TypeScript check and production desktop build passed. The existing large-bundle warning remains.
- All **47 shipped app-archive files** match the desktop build. The offline spelling worker and dictionary licenses are included.
- Independent package checks validated **13 Mach-O files, 54,394 code-page hashes, 471 resource hashes, 14 symlinks, and 249 unchanged native payload sections**. The app has ad-hoc signatures.

Physical Mac installation/launch, Gatekeeper assessment, macOS-native menu delivery, Keychain, native printing, and M2 performance remain unverified. This is a personal build, not a Developer ID signed or Apple-notarized release.

## Build and test the source

Run `npm install --legacy-peer-deps`, then `npm run lint` and `npm run build`. For the desktop payload, install the `desktop/` dependencies and run `node desktop/build.cjs`. The existing `desktop/package.mjs` packages a fresh Electron runtime; `desktop/repackage.mjs` can reuse the supplied runtime. See `desktop/README.md`.

Model checks: `node --import tsx --test verification/writing-assistance.test.ts verification/page-model.test.ts` and `node --test verification/native-history.test.cjs`.

Browser checks use Playwright and a Chromium executable supplied through `BROWSER_EXE`; set `RUN_LARGE=1` to include the four document sizes. Set `DRAFTCRAFT_DIST` to test an extracted shipped payload. Raw JSON results and logs are included in `verification/writing-results/`. Browser screenshots are retained only as internal QA material.
