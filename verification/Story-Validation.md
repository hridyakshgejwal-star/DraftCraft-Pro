# DraftCraft Pro 1.8.0 — Story Structure and Writing Assistance

Built for Apple Silicon macOS 13 or later, including the Mac mini M2. This enhances the supplied application and preserves the existing document format, application identity and editor workflows. It retains the 1.7 contextual word suggestions, 1.6 shortcut customization, existing spellcheck/autocomplete, page actions and Beat Board fixes.

## Implemented behavior

- Story Map, Story Arc, Act Breaks and Beat Sheet are independent optional tools, off by default. Visibility, collapse, page attachments/exceptions, colors, opacity, size and placement persist with the project.
- Scene lengths follow the existing editor pagination. Outline sections and markers, shared Beat Board cards, scene links, sequences, notes and filters use the existing project data. Planning drags do not rewrite or reorder screenplay scenes. Linked scene navigation also works in Navigator and Outline.
- Arc models include Three Act, Freytag, Syd Field, Five Act and Custom. Initial curves are labeled editable templates. No dramatic tension is inferred. Points support pointer/keyboard editing, labels, colors, intensity scales and scene anchors. Reset and deletion require explicit confirmation.
- Standard print/PDF output excludes story visuals. Annotated Presentation exports a separate, escaped HTML presentation with the chosen planning sections and screenplay pages.
- Cursor and typing preferences persist. Smooth Cursor and character highlights are optional and off by default; Reduce Motion retains native cursor behavior. Sentence capitalization starts on for normal Action/Dialogue typing and respects abbreviations, initials, numbers, ellipses, quotations, pasted text, composition and manual overrides. Assisted case changes support Undo/Redo.
- Native `.draftcraft` files preserve the full project. First close offers Save / Don't Save / Cancel and a location picker. Subsequent edits autosave to the selected file and closing flushes the latest project. Cancel/error leaves the editor open. Existing local recovery and FDX/Fountain exchange remain available.
- Left-click Word Suggestions remains available for correctly and incorrectly spelled words. Offline WordNet and part-of-speech heuristics rank alternatives; misspellings can also show corrections. Replacement preserves punctuation, capitalization, element metadata and undo history. Grammar-changing phrases use a preview. Names, locations and screenplay terminology remain protected.

## Validation of the packaged app payload

All 54 model/native bridge tests and 70 browser interaction groups passed against the renderer extracted from the finished app's ASAR. TypeScript checking and the production desktop build passed. Browser suites ran sequentially in Linux Chromium 151 with real offline dictionaries/fonts and test bridges for native dialogs.

| Suite | Result | Tests / interaction groups |
| --- | --- | ---: |
| Models | Pass | 54 |
| Story | Pass | 15 |
| Editor | Pass | 14 |
| Shortcuts | Pass | 14 |
| Words | Pass | 13 |
| Spelling | Pass | 14 |

The interaction checks cover story settings/data persistence, dragging and keyboard graph editing, shared beats, scene links, current Navigator actions after cached rendering, capitalization/manual overrides/Undo/Redo, caret wrapping and zoom, Reduce Motion, printing, annotated export, close/save snapshots, page actions, clipboard failure handling, card resizing, existing shortcuts, context-sensitive alternatives, protected names, spelling correction and autocomplete. Stress fixtures contain up to 250 pages and about 2,000 paragraphs.

Measured values include automation round trips and are not physical M2 benchmarks:

- {"pages": 250, "paragraphs": 1999, "enabledTools": 4, "allPageArc": true, "typingMs": {"p50": 71, "p95": 119, "max": 146}, "renderedArcPoints": 16, "environment": "Linux Chromium; physical M2 not benchmarked"}
- {"pages": 250, "paragraphs": 1997, "shortcutP50Ms": 97, "shortcutP95Ms": 163, "environment": "Linux Chromium 151; includes automation round trip; physical Mac not benchmarked"}
- {"pages": 250, "firstWordClickMs": 504, "cachedWordClickMs": [276, 271, 297, 359, 419, 321, 356], "environment": "Linux Chromium 151; includes automation; physical M2 not benchmarked"}
- {"pages": 10, "paragraphs": 75, "startupMs": 755, "keyEventP50Ms": 13, "keyEventP95Ms": 19, "usedJSHeapBytes": 13998876}
- {"pages": 50, "paragraphs": 395, "startupMs": 1015, "keyEventP50Ms": 25, "keyEventP95Ms": 46, "usedJSHeapBytes": 17533776}
- {"pages": 120, "paragraphs": 955, "startupMs": 1282, "keyEventP50Ms": 30, "keyEventP95Ms": 48, "usedJSHeapBytes": 51330088}
- {"pages": 250, "paragraphs": 1995, "startupMs": 2375, "keyEventP50Ms": 55, "keyEventP95Ms": 102, "usedJSHeapBytes": 61051576}

Unchanged planning geometry and Navigator rows skip unnecessary rendering. Offscreen page graphics are deferred. Background spellcheck responses are batched, and correct paragraphs do not cause underline redraws. Direct keyboard stress tests keep the same 250 ms p95 target without repeatedly scanning all input labels or performing locator scrolling checks per character.

## Package integrity and installation

- Application version: 1.8.0.
- Application identifier: com.draftcraft.screenplay.studio.
- Runtime: existing Electron 44.7.0, macOS ARM64. The original Rust prototype is not linked into this GUI.
- All 79 ASAR files match the staged build; desktop main entry matches the supplied source.
- ASAR header SHA-256: `31790178df226b466f6dcd18118e52efc46223d37e44661418558606198efaff`.
- Independent signatures: 13 Mach-O files, 54394 code-page hashes, 31 special-slot hashes, 471 resource hashes, 9 nested seals, 14 symlinks and 249 unchanged native sections verified; zero errors.
- Installer syntax passed. It pins four support files, verifies the 266-file app manifest and symbolic links, installs a copy, rebuilds/verifies local macOS signatures, preserves a previous app copy, and clears quarantine only from the verified installed copy. No administrator password or network request is needed by the installer.
- The DMG contains the application, installer, guide, editable source, license notices and verification records. Its UDIF/HFS contents receive an independent decompression, checksum, catalog-mode, symlink and file-hash round-trip check before delivery. Final DMG hash and results are recorded in the external report after image assembly.

Open `DraftCraft-Pro-Story-Structure.dmg` and double-click `Install-DraftCraft.command`. If macOS blocks that command, use the supplied Getting-Started instructions. Later open DraftCraft Pro from Applications. Story tools start off; Settings → Editor → Story Structure enables them. Settings → Writing Assistance controls word suggestions, spelling and the custom dictionary.

## Practical limits

This is a personal ad-hoc signed build, without Developer ID signing or Apple notarization. It was rebuilt on Linux and has not been mounted or launched on a physical Mac. Native dialogs, Gatekeeper, Keychain, macOS printing and actual M2 performance remain unverified. The installer performs macOS verification on the installed copy.

Offline language analysis is heuristic; ambiguous meanings can lack safe alternatives, especially names, technical terms and grammatical function words. Every word can be inspected, but the app does not invent interchangeable words when none fit. Optional advanced Gemini analysis is off by default; enabling it sends the selected sentence and nearby text through the existing configured service. No provider account, paid call or API key was used for validation.

## Rebuilding and inspecting

Extract the source ZIP, read `desktop/README.md` and `STORY-STRUCTURE.md`, install the existing locked dependencies with the documented legacy-peer-deps option, and use the desktop build/package scripts. The ZIP's `dist/` is the exact tested desktop renderer. `verification/run-release-tests.py` runs the model and browser suites against a specified extracted renderer; browser setup is supplied through environment variables. Historical validation files are retained separately from the 1.8 records in `verification/story-results/`.
