# DRAFTCRAFT PRO — CUSTOM KEYBOARD SHORTCUTS & SMART SCREENPLAY FORMATTING SYSTEM

## PRIMARY OBJECTIVE

Improve the **existing DraftCraft Pro screenplay writing application** by implementing a complete, customizable keyboard shortcut system.

The main goal is to allow writers to switch instantly between screenplay elements such as Action, Character, Dialogue, Parenthetical, Scene Heading, Shot, Transition, and other formatting types using keyboard shortcuts of their choice.

**Every shortcut must be customizable through a simple, beautiful settings panel.**

The entire system must be fast, accurate, easy to understand, and designed for professional screenwriters.

**IMPORTANT:** Do not recreate the application or change unrelated existing features. Integrate this functionality into the existing DraftCraft Pro editor while preserving documents, screenplay formatting, UI design, animations, and existing functionality.

---

## 1. CUSTOMIZABLE KEYBOARD SHORTCUT SYSTEM

Implement a dedicated system that lets users assign their own keyboard shortcuts to screenplay formatting actions.

Users must be able to:

- Assign a keyboard shortcut to any screenplay element.
- Change an existing shortcut.
- Use individual keyboard letters as shortcuts when appropriate.
- Use combinations such as Command + 1, Option + A, Control + D, or Command + Shift + S.
- Remove shortcuts.
- Reset shortcuts to their defaults.
- View every assigned shortcut in one place.
- Search for specific commands.
- Switch screenplay elements instantly without opening a menu.

### Supported screenplay elements

| Screenplay element | Example customizable shortcut |
|---|---|
| Scene Heading | Cmd + 1 |
| Action | Cmd + 2 |
| Character | Cmd + 3 |
| Dialogue | Cmd + 4 |
| Parenthetical | Cmd + 5 |
| Transition | Cmd + 6 |
| Shot | Cmd + 7 |
| General Text | Cmd + 8 |
| Centered Text | Cmd + 9 |
| Lyrics | User-defined |
| Dual Dialogue | User-defined |
| Script Note | User-defined |

These combinations are examples, not mandatory assignments. Users should be able to replace them with their preferred shortcuts.

## 2. INSTANT SWITCHING BETWEEN ELEMENTS

Make screenplay formatting changes immediate.

**Example:**

A writer is typing an Action paragraph.

They press their assigned Character shortcut.

The editor immediately switches the current paragraph to Character formatting.

They type:

JOHN

They press Enter.

The editor automatically switches to Dialogue formatting.

They type:

I think we should leave.

They press Enter as appropriate to begin the next writing element.

The writer can switch back to Action using their custom Action shortcut.

### Required behavior

- Switch formatting immediately without a noticeable delay.
- Keep the writing cursor active in the editor.
- Never require additional mouse clicks.
- Correctly apply alignment, margins, indentation, capitalization, and spacing.
- Preserve the existing text whenever changing its paragraph type.
- Do not create unwanted blank lines.
- Support formatting changes on existing paragraphs.
- Ensure text selection behaves correctly.
- Include changes in Undo and Redo history.

## 3. CUSTOM SHORTCUT SETTINGS PANEL

Create a dedicated settings section:

**Settings → Keyboard Shortcuts**

The panel must be clean, minimal, modern, and consistent with DraftCraft Pro's existing design.

### Suggested interface

**Keyboard Shortcuts**

Customize how you write your screenplay.

| Command | Shortcut |
|---|---|
| Action | ⌘ 2 |
| Character | ⌘ 3 |
| Dialogue | ⌘ 4 |
| Parenthetical | ⌘ 5 |
| Scene Heading | ⌘ 1 |
| Transition | ⌘ 6 |
| Shot | ⌘ 7 |

Each row must allow the user to click the current shortcut and record a replacement.

### Shortcut editing interaction

1. Open Keyboard Shortcuts settings.
2. Find the desired screenplay command.
3. Click its shortcut field.
4. Display **"Press your new shortcut…"**
5. Let the user press their desired keyboard combination.
6. Detect the pressed keys automatically.
7. Display the new combination.
8. Validate it.
9. Save the new shortcut.

Users should never need to manually type shortcut names such as "Command+Shift+A".

### Add these controls

- Search shortcuts
- Edit shortcut
- Clear shortcut
- Restore default
- Reset all shortcuts
- Cancel changes
- Shortcut category filtering
- Display assigned and unassigned shortcuts

All assigned shortcuts must remain saved after closing and reopening the application.

## 4. SUPPORT SINGLE-LETTER SHORTCUTS

Allow users to assign shortcuts using single letters such as:

A = Action

C = Character

D = Dialogue

S = Scene Heading

P = Parenthetical

T = Transition

However, normal screenplay typing must never be interrupted.

Implement a **Shortcut Mode** that can be activated by a user-configurable key, such as Option, or a dedicated shortcut.

When Shortcut Mode is active, the assigned letter keys switch screenplay elements.

When the user is typing normally, letters must insert text as usual.

Also support assigning an individual letter when the editor is not in an active text-entry state, such as when a dedicated command palette is open.

Ensure there are no accidental formatting changes while writing words.

## 5. SMART ENTER AND TAB BEHAVIOR

Implement intelligent formatting navigation.

### Character → Dialogue

When the writer types a Character name and presses Enter:

Automatically create a Dialogue paragraph.

### Dialogue → Action

Provide a configurable option that lets the writer move from Dialogue to Action using Enter, a repeated Enter, or a custom shortcut without creating unwanted paragraphs.

### Action → Character

Allow Tab or another assigned shortcut to switch from Action to Character.

### Character → Parenthetical

Allow a custom shortcut to switch from Character to Parenthetical.

### Parenthetical → Dialogue

Pressing Enter after a completed Parenthetical should automatically switch to Dialogue.

### Scene Heading → Action

Pressing Enter after a Scene Heading should automatically begin an Action paragraph.

These rules must work intelligently with the existing editor's behavior and must be individually configurable.

Do not replace useful existing formatting navigation unless the user explicitly changes its configuration.

## 6. QUICK INSERT FOR SCENE HEADINGS AND TRANSITIONS

Support separate keyboard commands for inserting common screenplay text.

Examples:

- INT.
- EXT.
- INT./EXT.
- CUT TO:
- FADE IN:
- FADE OUT.
- DISSOLVE TO:
- SMASH CUT TO:
- MATCH CUT TO:
- CONTINUED:
- INTERCUT:
- MONTAGE
- SERIES OF SHOTS

Users must be able to assign a shortcut to each of these commands.

**Example:**

A user assigns Option + F to FADE IN.

Pressing Option + F should immediately insert:

FADE IN:

The editor must use the correct Transition formatting, capitalization, and alignment.

Likewise, inserting CUT TO: should automatically use Transition formatting.

Make a clear distinction between:

- **Switch to element:** Changes the screenplay formatting type.
- **Insert command:** Inserts actual screenplay text using the appropriate formatting.

Support inserting these commands on new lines without overwriting existing text.

## 7. CHARACTER NAME SHORTCUTS AND AUTOCOMPLETE

Integrate this system with the screenplay's existing character database.

Whenever users create Character paragraphs, record the character names in the screenplay's existing character list.

When the writer switches to Character formatting:

- Suggest previously used character names.
- Display suggestions while typing.
- Support selecting a character using arrow keys.
- Use Enter or Tab to accept the selected suggestion.
- Automatically apply Character formatting.
- Prevent duplicate entries caused by capitalization differences.
- Update suggestions when characters are renamed.

Also allow users to assign shortcuts to frequently used characters.

Example:

Option + J → Insert JOHN as a Character paragraph.

Option + M → Insert MARY as a Character paragraph.

These assignments must be customizable for each screenplay project.

## 8. SHORTCUT CONFLICT DETECTION

Prevent overlapping shortcuts from creating unexpected behavior.

If the user tries to assign a combination already used by another command, display a dialog:

**Shortcut Already Assigned**

"This shortcut is currently assigned to Action. Would you like to replace it?"

Buttons:

- Replace Shortcut
- Choose Another
- Cancel

Protect essential macOS system combinations and existing application commands.

Never silently overwrite an assigned shortcut.

## 9. QUICK FORMATTING PANEL

Improve the existing screenplay formatting toolbar.

Provide a compact formatting selector that displays the current screenplay element.

Example:

**Character  ⌘3  ▾**

Clicking it should display:

- Scene Heading
- Action
- Character
- Dialogue
- Parenthetical
- Transition
- Shot
- General Text
- Other supported screenplay elements

Show the user's current shortcut beside each option.

Selecting an element must immediately apply its formatting.

Ensure the toolbar never covers screenplay text, blocks the cursor, or interferes with writing.

Add a **Customize Shortcuts** command to open the shortcut settings panel directly.

## 10. KEYBOARD SHORTCUT PROFILES

Allow writers to create shortcut profiles.

Include:

- Default DraftCraft Pro
- Custom
- Additional user-created profiles

Users must be able to duplicate, rename, switch, export, and import profiles.

Changes to shortcuts should update the active profile automatically.

Profiles must survive application restarts.

## 11. PERFORMANCE, RELIABILITY AND MACOS SUPPORT

The shortcut system must be responsive during long screenplay-writing sessions.

Ensure:

- Immediate shortcut response.
- Smooth transitions between screenplay elements.
- No keyboard input lag.
- No missed characters during fast typing.
- No duplicate characters.
- No unexpected formatting changes.
- No conflicts with text-selection shortcuts.
- No broken Undo/Redo behavior.
- Correct operation with macOS keyboard layouts.
- Proper support for Command, Option, Control, Shift, Return, Tab, and Escape.
- Keyboard accessibility and full navigation of the settings panel.

Use the existing application's architecture and settings storage wherever possible.

Do not introduce a second, conflicting keyboard-event handling system.

## 12. SAVE AND RESTORE CUSTOM SHORTCUTS

The application must persist:

- Assigned shortcuts
- Removed shortcuts
- Custom profiles
- Shortcut Mode settings
- Enter and Tab behavior
- Character-specific shortcuts

General shortcut preferences should be stored as application-level settings, while screenplay-specific character shortcuts should remain associated with their respective projects.

All settings must restore correctly after restarting DraftCraft Pro.

## 13. TESTING REQUIREMENTS

Thoroughly test the functionality using real screenplay editing scenarios.

Verify that:

1. Users can assign and change shortcuts through the settings panel.
2. Every screenplay element can be selected through a shortcut.
3. Shortcuts work when the editor has keyboard focus.
4. Single-letter shortcuts never interfere with normal text entry.
5. Character paragraphs automatically transition into Dialogue.
6. Scene Headings correctly transition into Action.
7. Parentheticals correctly transition into Dialogue.
8. CUT TO:, FADE IN:, and other commands use correct formatting.
9. Character suggestions work with the shortcut system.
10. Shortcut conflicts are detected.
11. Settings persist after restarting the application.
12. Shortcut changes can be undone or reset.
13. Long scripts do not experience additional typing lag.
14. Existing document formatting is not corrupted.
15. Existing keyboard commands continue working unless explicitly reassigned.

Test interactions with the Beat Board, Outline Editor, Navigator, and other panels to ensure their keyboard operations are not broken.

## 14. FINAL IMPLEMENTATION REQUIREMENTS

Implement this functionality directly within the existing DraftCraft Pro application.

Do not deliver only a visual mockup, static interface, or incomplete settings page.

The implementation must include:

- A working keyboard shortcut management system.
- Fully editable shortcut assignments.
- Immediate screenplay element switching.
- Context-aware Enter and Tab navigation.
- Quick insertion of scene and transition commands.
- Integration with existing character suggestions.
- Conflict detection.
- Persistent shortcut settings.
- A minimal, polished settings panel.
- Functional tests for all supported keyboard commands.

**MOST IMPORTANT GOAL:**

Make DraftCraft Pro feel like a professional, keyboard-first screenplay writing application.

A writer should be able to write an entire screenplay, switch between Action, Character, Dialogue, Parenthetical, Scene Heading, Transition, and Shot, and insert commands like CUT TO: or FADE IN: without needing to touch the mouse.

The experience must be **simple, instantaneous, customizable, accurate, and effortless**, while preserving all existing DraftCraft Pro features and user documents.