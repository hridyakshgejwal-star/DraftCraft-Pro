# Intelligent auto-formatting — DraftCraft Pro 1.15.4

Every rule the editor applies on its own, what sets it off, which setting controls it, how the writer reverses it, and which
test exercises it. "Auto Formatting settings" means **Settings → Editor → Automatic Formatting**; all of them are on by
default and are saved with the editor preferences (`draftcraft_editor_preferences_v1`), so they survive a restart.

Three principles hold for all of them:

- **The writer's words are not rewritten.** Rules only change an element's type, add a missing structural mark (a heading
  prefix's period, a transition ending, the parentheses of a parenthetical, the heading separator) or show capitals through the
  element style. Prose, dialogue and punctuation inside a sentence are never edited by these rules (contextual punctuation is a
  separate feature with its own switch; see the end of this page).
- **A manual choice wins.** An element picked with a shortcut (⌘1–⌘9), the element menu or the toolbar is marked manual and
  is never reclassified. Undoing an automatic change (⌘Z) restores the typed text and remembers the reversal for that
  paragraph, so the same rule does not fire again there.
- **Ambiguity is offered, not applied.** When a line could be two things, the editor shows a suggestion chip
  (`Possible new character cue · Use Character`) and leaves the element as it is until the writer accepts it.

## Settings

| Setting | Default | Turns off |
|---|---|---|
| Enable Intelligent Auto Formatting (master) | On | Every rule below at once. The individual choices are kept and come back when the master is turned on. Shortcuts, Return/Tab navigation and manual element choice keep working. |
| Automatically Format Scene Headings | On | Heading prefix normalisation, time-of-day separator, heading Tab completion |
| Detect Character Names | On | Character cue suggestions and the Return-key confirmation of a known name typed in Action |
| Automatic Dialogue Formatting | On | Return after a character cue goes to Action (or General) instead of Dialogue |
| Automatically Insert Parenthetical Brackets | On | `()` insertion, wrapping, and removal of an empty `()` |
| Automatically Format Transitions | On | Transition endings and Return-key conversion of a transition typed in Action |
| SmartType Suggestions | On | The character / location / time-of-day / transition pop-up lists |
| Automatically Capitalize Sentences | On | Capitalising the first letter of a sentence while typing |
| Template-Specific Formatting | On | Rules that only exist in some templates (acts, stage scenes, comic pages and panels, audio cues, captions, narration) |
| Show Suggestions for Ambiguous Elements | On | All suggestion chips (only certain rules still apply) |
| Contextual Punctuation (Settings → Writing → Intelligent Automatic Punctuation) | per that panel | Independent of the master switch above, as requested |

Test: `template-formatting-browser.cjs` group 10 (labels, defaults, persistence across reload, master switch disables the
dependent controls and the rules); `formatting-1154.test.ts` "option flags and effectivePreferences".

## Scene headings

| Writer types | Result | Notes |
|---|---|---|
| `int. kitchen` (in Action or Scene Heading) | Scene Heading `INT. KITCHEN` | Prefix becomes canonical once a space follows it |
| `ext.`, `int./ext.`, `int/ext.`, `int/ext`, `ext./int.`, `ext/int`, `i/e`, `i/e.` | `EXT.`, `INT./EXT.`, `EXT./INT.`, `I/E.` | The combined forms accept a missing dot; `INT`/`EXT` alone need the dot, so words such as *Interior* or *Extra* stay Action |
| `INT. KITCHEN NIGHT` + space or Return | `INT. KITCHEN - NIGHT` | Known times of day (DAY, NIGHT, MORNING, CONTINUOUS, LATER, MOMENTS LATER, SAME TIME, DAWN, DUSK…) plus the SmartType list; separator is the template's (`" - "` by default) |
| Tab in a Scene Heading | Adds a missing prefix, then (second Tab) the separator, ready for the time of day | `kitchen` + Tab → `INT. KITCHEN`; Tab again → `INT. KITCHEN - ` |
| Return after a heading | Next element per template (Action; Sound Effect in Radio Drama; Shot in Documentary/Commercial; Stage Direction in stage plays) | |
| `SCENE 2` in a stage-play template | Scene Heading | Template-specific |

In screenplay and TV templates the prefix rule applies to Action lines as you type; elements whose style is capitals (Scene
Heading, Character, Transition, Shot) store their text in capitals.
Tests: `template-formatting-browser.cjs` groups 2–3; `automatic-formatting-browser.cjs` heading groups; `formatting-1154.test.ts` inference cases.

## Character cues and dialogue

| Writer types | Result |
|---|---|
| A short all-capitals line in Action (`MAREN`, `DR. OKAFOR`, `JEAN-LUC`) | Suggestion chip `Possible new character cue`; Return accepts it as Character |
| A name already used as a cue in the script (any case) | Suggestion `Established character cue`; Return at the end of the line makes it Character |
| Return after Character | Dialogue (if Automatic Dialogue Formatting is on) |
| Return after Dialogue | Action (Character in Radio Drama/Audio Drama, Stage Direction in stage plays) |

Never treated as cues: structural capitals (`SCENE`, `ACT ONE`, `LATER`, `CONTINUOUS`, `MONTAGE`, `FLASHBACK`, `INTERCUT`,
`TITLE`, `SUPER`, `CHYRON`, `THE END`, transition words), lines ending in `.`, `!` or `?`, lines over 31 characters, and
camera directions (below). Non-Latin scripts (Devanagari, Chinese, Arabic…) have no case, so they are never reclassified by
the capitals rule. Tests: `template-formatting-browser.cjs` groups 2, 5, 9; `automatic-formatting-browser.cjs`.

## Parentheticals

| Writer does | Result |
|---|---|
| Tab in Dialogue (or Return after Character, then Tab) | New Parenthetical containing `()` with the caret inside |
| Types `(` … `)` on a Dialogue line after a cue | Offered/converted to Parenthetical |
| Types `)` before an automatic `)` | Steps over it instead of doubling it |
| Converts a selection or line to Parenthetical | Wraps it in parentheses, without doubling existing ones |
| Return in an empty `()` | Removes the empty brackets instead of leaving `()` behind |

## Transitions

| Writer types | Result (default "Traditional" endings) |
|---|---|
| `cut to`, `dissolve to`, `smash cut to`, `match cut to`, `jump cut to`, `flash cut to`, `time cut`, `wipe to`, `back to`, `fade in`, `fade to`, `intercut` + Return in Action | Transition `CUT TO:` / `DISSOLVE TO:` / … / `FADE IN:` (flush right) |
| `fade out`, `fade to black` | `FADE OUT.` / `FADE TO BLACK.` |
| Any of these with the writer's own ending already typed | Kept as typed; never `CUT TO::` or `FADE OUT.:` |
| A transition word typed without Return (still typing) | Offered as `Possible transition`, not converted |
| A transition word inside a sentence (`Cut to the chase.`) | Stays Action |

The ending rule is a template setting (**Writing Formats → Transition endings**): *Traditional* (default for new documents),
*Colon* (`FADE OUT:`), or *Preserve writer punctuation*. Documents saved before 1.15.4 keep the rule they had.
Tests: `template-formatting-browser.cjs` group 4; `automatic-formatting-browser.cjs` "recognized transitions…" and "transition
endings are editable template rules…" (now switches to Colon, since Traditional is the default).

## Shots (camera directions)

| Writer types | Result |
|---|---|
| `CLOSE ON:`, `INSERT:`, `POV:`, `ANGLE ON:` (any case, colon after the keyword) | Shot suggestion |
| An all-capitals line starting with a shot keyword (`ANGLE ON SARAH`, `WIDE SHOT`, `TRACKING SHOT`, `CLOSE ON THE CLOCK`, `EXTREME CLOSE-UP`, `ESTABLISHING SHOT`, `OVER THE SHOULDER`, `P.O.V.`…) | Shot suggestion, never a character cue |
| Mixed-case prose (`Close on the edge of the table, a cup trembles.`) | Stays Action |
| Stage-play templates | No Shot element; existing Shot paragraphs convert to Stage Direction when a script is switched to a stage format |

Tests: `template-formatting-browser.cjs` group 5; `formatting-1154.test.ts`.

## Template-specific rules (Template-Specific Formatting)

| Template family | Rule |
|---|---|
| TV (all) | `ACT ONE`…`ACT SIX`, `ACT I`…, `TEASER`, `COLD OPEN`, `TAG` → New Act; `END OF ACT …`, `END OF TEASER` → End of Act |
| Stage plays | `SCENE 1`, `SCENE II`, `SCENE ONE` → Scene Heading; Return after Dialogue → Stage Direction |
| Comics / graphic novels | `PAGE 3` → Comic Page (renumbered), `PANEL 2` → Panel (renumbered, reset per page), `CAPTION:` → Caption, `SFX:` → Sound Effect; Return after a page starts `PANEL n` |
| Radio Drama, Audio Drama, Podcast, Documentary, Commercial | `SFX:`, `F/X:`, `FX:`, `SOUND:`, `MUSIC:`, `ATMOS:` → Sound Effect (also from a speaker line that the writer turns into a cue); Radio Drama flows Character → Dialogue → Character |
| Documentary, Commercial | `SUPER:`, `LOWER THIRD:`, `TITLE CARD:`, `ON SCREEN:`, `CHYRON:` → Caption |
| Documentary, Podcast, Radio/Audio Drama | `NARRATOR:`, `NARRATION:`, `ANNOUNCER:` → offered as Narration |
| Music Video | Lyrics element |
| Animation | Scene numbers on; centred underlined Sequence headings |

A manual element choice is never overridden by these rules (for example `MUSIC:` typed in an element chosen with ⌘2 stays
Action). Tests: `template-formatting-browser.cjs` groups 8, 11, 12.

## Switching templates

**Writing Formats** (Format Studio) lists every template with search and a Conversion Preview; applying a template converts
each paragraph to the nearest element the new template supports (Shot → Stage Direction for stage plays, and so on), keeps
every paragraph's id and text, and is one ⌘Z away from the previous format. Auto-formatting follows the new template's rules
immediately. Tests: `template-formatting-browser.cjs` group 8; `formatting-1154.test.ts` "conversion keeps every paragraph id
and text across all templates".

## Not automatic by design

- Typos, grammar and word choice: the spelling and grammar features suggest, they do not change text on their own.
- Pasted, dictated or IME text is never re-capitalised or reclassified.
- Contextual punctuation (closing quotes, spacing after a full stop, etc.) is the separate *Intelligent Automatic
  Punctuation* feature; it keeps its own switch and is not affected by the master switch, as the request specified.
