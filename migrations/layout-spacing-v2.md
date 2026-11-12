# Layout spacing and repair metadata — 1.15.2

The native project envelope remains version 1 and studio metadata remains version 2. Optional `writingFormat.spacingRules` version 1 defines collapsed boundary gaps, a 12 pt completed-speech boundary and page-top trimming. Screenplay/TV factory templates now use templateVersion 2 and 24 pt before scene headings/Shots. Paragraphs are not padded with blank editable text.

`upgradeDocumentFormat` reconstructs the exact previous factory from the retained per-template spacing table and compares the complete canonical format. Only an exact old factory upgrades, after a recoverable checkpoint. Custom overrides, missing/implicit formats and locked documents are not silently rewritten. Explicit Elements/template/doctor commands remain Undoable. Explicit native Save materializes a missing format without resetting preferences.

`combinedSources` retains source-global settings as native provenance; current title/layout remain active. New copies regenerate known document/paragraph/character/planning/tag/cast/revision/asset identities and references, never prose or provider voice IDs. Revert checkpoints actual unsaved work before adopting disk. Snapshot restores use the existing transaction system or create an independent foreign-project copy.

Pending same-text formatting changes add an optional formatting payload to existing authored review records. Explicit restoration of absent runs is required because JSON omits undefined properties. Review combined with later text/style edits may require newer-first decisions; complete style/text dependency review remains partial. Older DraftCraft versions do not implement these new review semantics. Keep the previous project/app and use 1.15.2 to review these records.

New backup/recent records store actual pageLabels; old records remain intact and their page estimates are labeled. Existing productivity history/preferences, story-overlay choices, native destinations and assets are not reset. Genuine activity initialization and ambiguous-history provenance remain the previous separate migration.

Baseline source archive version 13 is retained as an earlier file version. The source delivery includes full and repair-only patches. A transient workspace rollback during continuation was recovered from that exact archive; recoverable source checkpoints were saved before completing the release. See the report for current versus historical evidence.
