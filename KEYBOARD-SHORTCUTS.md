# DraftCraft Pro 1.6.0 — Custom Keyboard Shortcuts

This update integrates the supplied shortcut requirements into the existing DraftCraft Pro application. It retains the editor, offline spelling assistance, character memory, document storage, page actions, Beat Board, Outline Map, Navigator, and native desktop runtime.

## Install and use

Open **DraftCraft-Pro-Custom-Shortcuts.dmg** and double-click **Install-DraftCraft.command**. The installer checks the application files, preserves an existing installation in a timestamped backup, and installs and opens DraftCraft Pro. No Node.js or Rust installation is needed. The target is Apple Silicon, with macOS 13 or later as declared by the existing application.

Open **Settings → Keyboard Shortcuts**, or use **Customize Shortcuts** in the paragraph toolbar. Click a shortcut, press the new keys, and the assignment saves automatically. A conflicting assignment requires Replace Shortcut, Choose Another, or Cancel. Clear removes an assignment; Default restores it. Undo Settings Change reverses a settings edit, and Cancel Changes restores the settings from when the panel opened.

The default element keys stay unchanged:

| Key | Element |
| --- | --- |
| ⌘1 | Scene Heading |
| ⌘2 | Action |
| ⌘3 | Character |
| ⌘4 | Parenthetical |
| ⌘5 | Dialogue |
| ⌘6 | Transition |
| ⌘7 | Shot |
| ⌘8 | New Act |
| ⌘9 | End of Act |

All 18 elements are available, including General Text, Centered Text, Lyrics, Dual Dialogue, Scene Summary, Cast List, the outline levels, and User Defined. Added Centered Text and Lyrics have editor styling, PDF layout, and explicit Fountain/FDX import support. Script Note is an annotation command and uses the existing note interface.

## Implemented behavior

- Element shortcuts preserve the current paragraph text and selection, maintain keyboard focus, apply formatting immediately, and enter the editor's undo/redo history. Capitalization for an existing paragraph is displayed through formatting; changing its type does not rewrite manuscript text.
- Thirteen quick inserts cover INT., EXT., INT./EXT., CUT TO:, FADE IN:, FADE OUT., DISSOLVE TO:, SMASH CUT TO:, MATCH CUT TO:, CONTINUED:, INTERCUT:, MONTAGE, and SERIES OF SHOTS. Inserts reuse an empty paragraph or add a paragraph after a nonempty one, retaining existing text and annotations.
- Plain-letter assignments run only in Shortcut Mode. Its default activator is ⌘⇧Space; it executes one command and returns to typing. Escape exits. The activator is editable or removable. Recording a press and release of Option enables held-Option mode. Normal typing, selection keys, and IME composition retain their roles.
- The searchable **Commands** palette supports mouse selection, arrow-key navigation and Return. Assigned letters run commands when a command button has focus. Typing in its search field filters the list.
- Enter and Tab rules are individually editable for all elements. Defaults keep Character → Dialogue, Parenthetical → Dialogue, Scene Heading → Action, and Action + Tab → Character. Dialogue can follow its normal Enter rule, exit to Action on Enter, exit after repeated Enter, or stay Dialogue until an Action shortcut. Repeated Enter reuses the empty dialogue line. Enter splits at the cursor/selection; Shift+Return inserts a line break and Shift+Tab moves focus.
- Character suggestions open when switching to an empty Character paragraph and remain available while typing. Arrow keys select a name; Return or Tab accepts it. Project character assignments use stable character identities, follow a sole-character rename, retain an assigned unused character, and survive document backups, reload, Save As, and Duplicate.
- Profiles include Default DraftCraft Pro and Custom, plus user-created profiles. Duplicate, rename, switch, export and import are functional. New profiles start with unassigned keys. Profile switching/import refuses conflicts with project character assignments. Profile exports contain application keys and navigation; character keys remain in the screenplay.
- Application settings store profiles, removed assignments, mode activators, and Enter/Tab rules. Character shortcuts store with the project document. The formatting selector displays current assignments.
- Application and essential editing/system shortcuts are protected. Native menu accelerators are temporarily bypassed during shortcut recording and restored when recording ends. The bridge accepts only boolean state from the trusted main frame. Option combinations retain a physical key code because macOS can produce an alternate glyph; Command and Control recordings remain distinct.

## Validation

| Check | Result |
| --- | --- |
| TypeScript check and production desktop build | Passed |
| Model and trusted desktop bridge tests | 30 passed |
| Shortcut browser workflows | 14 groups passed, including 250-page editing |
| Spelling/character assistance regressions | 14 groups passed, including long-script checks |
| Editor/page/Beat Board regressions | 14 groups passed |
| Native bundle verification | 13 Mach-O files; 54,394 code-page hashes; 31 special-slot hashes; 471 resource hashes; 9 nested code seals; 14 symlinks; no errors |
| Native runtime comparison | 249 native sections unchanged from the verified 1.5.0 bundle |
| Packaged application payload | 47 files; header integrity verified; every shipped file matches the tested payload |

Browser checks exercised all element commands, all quick inserts, recording and conflict choices, clear/default/reset/cancel, selection and history, normal letter typing, held Option, composition, character renaming, persistence, profiles and JSON transfers, the command palette, annotation history, and confinement to the screenplay editor. Beat Board, Outline Map, and Navigator inputs retained normal text entry. Toolbar checks covered 1024/1440/1920 widths, 50/100/200% zoom, and Navigator open/closed; print omitted editor controls.

Long-script typing checks covered 10, 50, 120 and 250 pages. In the recorded Linux Chrome run, typing p95 was 26/102/70/74 ms respectively, including automation round trips. The packaged-renderer custom-shortcut run on 250 pages preserved all typed characters and stayed below the 250 ms test threshold. JSON results include the measured values. These measurements are not Mac mini M2 benchmarks.

The source archive contains the changed source, offline renderer assets, build scripts, dependencies' lockfiles and licenses, and the verification harnesses/results. It excludes node_modules and browser screenshots. The Rust prototype is retained and is not required by the desktop app.

## Verification limits

The browser and package checks ran on Linux. This build has not been mounted or launched on a physical Mac. Native macOS key delivery/layouts, Gatekeeper prompts, printing, Keychain, and M2 performance remain unverified. The bundle is ad-hoc signed, with the existing local-signing installer; it is not Developer ID signed or notarized. The native menu-capture bridge was tested with the exact handler source and controlled sender fixtures, not an actual macOS window. The unchanged native clipboard backend retains its prior validation; browser clipboard regressions used a test bridge.

The existing autosave debounce can lose the most recent unflushed input during an abrupt process kill. Project character bindings travel in native project storage/backups; external screenplay text formats do not store application shortcut profiles. Build output still has the existing large-chunk warning.
