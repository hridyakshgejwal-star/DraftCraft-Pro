# Writing formats in DraftCraft Pro 1.11.0

Open **File → New from Template** to create a document, or **Format → Apply
Template / Change Screenplay Format** to preview a change to the current one.
The browser has six categories, search, favorites, recents, and editable custom
templates. Its page previews use the selected format's actual element rules.

Applying a writing format preserves the document's text and identities. Review
the before/after preview and conversion warnings, then confirm. An independent
recovery checkpoint is retained before a major change. Cmd+Z and Cmd+Shift+Z
undo and redo the document conversion. Structure templates instead append
editable Beat Board cards and linked Outline sections; they preserve script text.

**Format → Elements** edits fonts, capitalization, alignment, indents, paragraph
spacing, line height, page-break and keep-with-next rules, Enter/Tab transitions,
page dimensions, margins, numbering and custom element definitions. Changes
apply to all paragraphs with that semantic element. The project stores the
selected template version and full style definition, including custom overrides.

In screenplay formats, type `int. bedroom - night` to recognize a scene heading;
Return moves to Action. Tab from Action chooses Character. Return from Character
creates Dialogue; Tab from Dialogue creates a parenthetical with matching
parentheses and the caret inside. Return continues Dialogue, then Action.
Scene-heading Tab advances through introduction, location and time fields.
Option+Tab inserts a literal tab. Prose formats use ordinary paragraphs and tabs.
Explicit element choices are respected by automatic recognition.

**Settings → Writing → Intelligent Auto-Formatting** selects Smart, Standard or
Manual behavior. Smart applies unambiguous patterns and offers uncertain cues;
Standard retains recognized patterns and contextual navigation; Manual disables
text-based inference. Essential behavior works offline. Automatic recognition
never switches the whole document's template.

**Document → SmartType Manager** manages characters, extensions, scene intros,
locations, times and transitions. Lists support manual entries, editing,
exclusions, rebuild, category switches, alphabetic/usage sorting, Tab/Return
acceptance, and optional next-speaker suggestions. Character names are learned
from the screenplay. Rename propagation requires confirmation.

Default element shortcuts include Cmd+0 General, Cmd+1 Scene Heading, Cmd+2
Action, Cmd+3 Character, Cmd+4 Parenthetical, Cmd+5 Dialogue, Cmd+6 Transition
and Cmd+7 Shot. Existing custom profiles remain available in Keyboard Shortcuts.
All 29 elements can be assigned keys there. Saved custom template profiles are
applied as document preferences without replacing the global profile.

**File → Save as Template** captures the current editable styles and associated
settings. Sample text and character/location history can be excluded. My Templates
supports duplicate, rename, delete, default selection and `.dctemplate` import/
export. Importing a supported `.fdxt` file opens its supported content and format
settings; save it as a DraftCraft template to reuse it.

Native `.draftcraft` files preserve full project data. FDX/FDXT import/export
supports core semantic paragraphs, text runs, notes, title metadata, numbering
and supported layout settings. Unknown element text is retained for review.
Fountain, plain text and text-focused RTF import are also available. RTF export
uses the selected body styles and page geometry. PDF import is not implemented.

The page engine protects related headings and cues and supports explicit act/
scene breaks. It currently keeps a single oversized paragraph intact rather
than splitting it across editor pages. Proportional-font pagination is estimated.
Complete production dual-dialogue, locked-page and continuation conventions are
not implemented. Use Print / Save as PDF for installed custom fonts, Unicode,
or oversized paragraphs; the quick PDF exporter has a smaller font repertoire.

Named house and structure presets are independent editable adaptations. They
are not exact reproductions of proprietary template files or certified submission
formats. Language presets do not translate content or install new dictionaries.
See the release report for verification results and remaining platform limits.
