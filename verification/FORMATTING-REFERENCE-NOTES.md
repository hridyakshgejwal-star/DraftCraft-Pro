# Formatting references and implementation boundaries

DraftCraft Pro 1.11.0 extends the existing Electron/React editor. The following
public primary sources inform the workflow and selected formatting facts.
No proprietary template files, screenplay examples, or instructional passages
are included. Sample text and structure descriptions were independently written.

- [Final Draft template catalogue](https://www.finaldraft.com/support/script-templates/): category and preset-name reference. A matching name does not imply a verified identical proprietary layout.
- [Final Draft Element Settings](https://kb.finaldraft.com/hc/en-us/articles/15575057137812-How-can-I-change-a-script-s-formatting): semantic element styles and document-wide formatting workflow.
- [Final Draft keyboard shortcuts](https://kb.finaldraft.com/hc/en-us/articles/27977488282644-What-keyboard-shortcuts-can-I-use-in-Final-Draft): Command+0 through Command+7 element mappings and contextual navigation reference.
- [Final Draft SmartType workflow](https://www.finaldraft.com/blog/using-final-draft-smarttype-maximizing-efficiency-and-consistency-in-your-final-draft-workflow): category memory and optional next-speaker suggestions. DraftCraft uses its own deterministic implementation.
- [BBC screenplay guide](https://downloads.bbc.co.uk/writersroom/scripts/screenplay.pdf) and [BBC television guide](https://downloads.bbc.co.uk/writersroom/scripts/screenplaytv.pdf): public layout examples; BBC presets use A4. Other unverified house details remain editable independent adaptations.
- [Dramatists Guild format guidance](https://www.dramatistsguild.com/script-formats), [modern](https://www.dramatistsguild.com/sites/default/files/2019-12/modernformat-New.pdf), [traditional](https://www.dramatistsguild.com/sites/default/files/2020-01/traditionalformat-New.pdf), and [musical](https://www.dramatistsguild.com/sites/default/files/2019-12/musicalformat-New.pdf): 12-point typography, 1.5-inch binding and 1-inch other margins, distinct direction/dialogue/lyric styles. These are submission guidelines, not universal requirements.
- [Dark Horse script-format guide](https://images.darkhorse.com/darkhorse08/company/submissions/DHScriptFormatGuides.pdf): flush-left production text and page/panel organization. DraftCraft provides an editable independent layout with original sample content.
- [Fountain syntax](https://fountain.io/syntax/): context-sensitive character/dialogue, scene headings, forced elements, notes, sections, and page-break parsing reference. Full Fountain syntax parity is not claimed.

Cole and Haag, Warner Brothers, Image Comics, NYFA, additional TV variants, and
named story-structure approaches are independently designed equivalents. They
are not official templates, exact house-format reproductions, or certifications.
Language presets set document metadata and fonts; they do not translate text or
add language-specific spelling dictionaries. All 80 presets expose editable
style rules. Related presets can intentionally share baseline page geometry.

The selected format controls editor styles, incremental element recognition,
Enter/Tab transitions, and pagination. Whole-document conversion requires a
preview and explicit confirmation. Structure templates append planning records
without replacing screenplay content. Conversion preserves paragraph identities
and flags unsupported classifications for review.

Current pagination protects related paragraphs and provides continuation cues
at paragraph boundaries. It does not split a single long paragraph across editor
pages. Proportional-font metrics are estimates. Complete production page-lock,
dual-dialogue reflow, and all continuation conventions remain limitations.
FDX/FDXT compatibility covers a documented implementation subset; unknown element
text is retained for review. RTF import recovers text and Unicode, not every
embedded object or rich style. PDF import is not implemented.

References consulted on 15 October 2026. See the release report and automated
test results for the distinction between operational behavior and unverified
macOS hardware integration.
