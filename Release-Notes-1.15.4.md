# DraftCraft Pro 1.15.4 — release notes

Formatting release of the existing DraftCraft Pro desktop app (Electron 44.7.0, Apple Silicon), on top of 1.15.3. Same app,
bundle identity, project format and data locations. **Ad-hoc signed, not notarized.**

## Screenplay format

* New scripts use the standard US parenthetical width: 3.1" from the paper edge with a 2.9" right margin (text to 5.6").
* New scripts end transitions the traditional way: `CUT TO:`, `DISSOLVE TO:`, `FADE IN:` … but `FADE OUT.` and
  `FADE TO BLACK.`. Writing Formats → Transition endings still offers *Colon* and *Preserve writer punctuation*.
* Scripts you already have keep their layout and their ending rule. Apply a template in Writing Formats to adopt the new
  rules (⌘Z undoes it).
* In the editor, an element changed in place (Tab on an empty line, ⌘1–⌘9) now sits at its template position. Before, a new
  character cue could appear about 2" too far right and a parenthetical typed after Tab could show one letter per line
  (the saved text and PDFs were always correct).
* When a word ends exactly at the right edge, the next printed line no longer starts with a space (wrapped lines in PDFs
  were indented by one character).
* PDF pages carry only the page number at the top right (none on page 1), in the script's own font and size. The script
  title is no longer forced into the header, and your Header & Footer settings are used when you have set them.

## Templates

New: **A4 Screenplay, International Screenplay, Animation Screenplay, Custom Screenplay Format, Custom Studio Format,
Documentary Script, Commercial Script, Music Video Script, Radio Drama, Audio Drama, Half-Hour TV Drama, Single-Camera
Comedy, TV Shooting Script**, and the structures **Five-Act Structure, Freytag's Pyramid and Hero's Journey** (17 stages).
96 built-in templates in all; see TEMPLATE-MATRIX-1.15.4.md. Stage-play templates no longer offer the camera-only Shot
element (Shot lines become Stage Directions when a script is switched to a stage format).

## Intelligent auto-formatting

* **Settings → Editor → Automatic Formatting** now has a master switch, *Enable Intelligent Auto Formatting*, and separate
  switches for scene headings, character names, dialogue after a cue, parentheses, transitions, SmartType suggestions,
  capitalisation, template-specific rules and suggestions for ambiguous lines. All are on by default and remembered.
* Camera directions (`ANGLE ON SARAH`, `CLOSE ON:`, `INSERT: THE LETTER`, `WIDE SHOT`, `TRACKING SHOT`, `P.O.V.` …) are
  offered as Shot and are no longer mistaken for a new character.
* Transitions are recognised with or without their ending, including `JUMP CUT TO`, `FLASH CUT TO`, `TIME CUT`, `WIPE TO`,
  `FADE TO`, and never get a doubled ending.
* `EXT./INT.`, `EXT/INT.` and `I/E` are suggested as scene headings in every path (typing already handled them).
* Radio, audio, podcast, documentary and commercial scripts recognise `SFX:` / `MUSIC:` / `SOUND:` cues, `SUPER:` /
  `LOWER THIRD:` / `TITLE CARD:` captions and `NARRATOR:` lines.
* The full list is in AUTO-FORMATTING-BEHAVIOURS-1.15.4.md.

## Final Draft files

* `.fdx` files saved by Final Draft now open with their page layout, element positions and spacing (1.15.3 refused them with
  "unsupported element or page settings").
* `.fdx` export now writes Final Draft's own units and conventions, so the layout carries over to Final Draft; DraftCraft
  still reopens its own exports exactly.

## Known limitations

No two-column (video / audio) layout for documentary or commercial scripts; radio speaker names sit on their own line; see
FORMATTING-REPORT-1.15.4.md section H.
