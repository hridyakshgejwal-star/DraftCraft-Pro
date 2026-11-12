# Formatting migration notes — 1.15.4

No change to the project file format (`draftcraft-project` version 1). Nothing is rewritten when an existing document is
opened, and no user setting, custom template or project is converted.

## Factory template version 3

| Rule | Template version 2 (1.15.3) | Template version 3 (1.15.4) | Applies to |
|---|---|---|---|
| Parenthetical right edge | 5.5" from the paper edge (3.0" right margin) | 5.6" (2.9" right margin) | New documents and documents switched to a template after updating |
| Transition endings | Colon for every transition (`FADE OUT:`) | Traditional: colon, except `FADE OUT.` and `FADE TO BLACK.` | Same |
| Stage-play elements | Shot offered | No Shot; Shot paragraphs convert to Stage Direction when switching to a stage template | Same |

How existing documents are treated (`src/formats/storage.ts` → `upgradeDocumentFormat`):

- **Version-2 documents (saved by 1.15.0–1.15.3) are never changed.** They keep a 3.0" parenthetical right margin and their
  transition ending rule. The writer can adopt the new rules with Writing Formats → choose the template → Apply, which is
  one ⌘Z away.
- **Version-1 documents (before the spacing rules)** upgrade exactly as they did in 1.15.3 — to the version-2 layout — and
  only when their format is byte-for-byte the old factory format. Custom formats are never touched.
- Locked pages and production page locks keep the document's format unchanged, as before.

Test: `repair-regressions.test.ts` F01 (v1 upgrades to v2 with right 2 and colon endings; a v2 document is returned
unchanged); `formatting-1154.test.ts` (new documents are v3).

## Final Draft (.fdx) files

- **Import** now reads Final Draft's own conventions: `PageLayout` margins in points, `ParagraphSpec` indents in inches from
  the paper edge, `Leading="Regular"` with `Spacing`, `SpaceBefore`, `AllCaps` in `FontSpec Style`, `StartsNewPage`, and
  `Behavior ReturnKey`. A Final Draft file's spacing is taken from its own `SpaceBefore` values (no extra DraftCraft
  speech gap is added). Files written by DraftCraft 1.15.3 and earlier (inch `PageLayout` with `Width`/`LeftMargin`,
  numeric `Leading`, `SpaceAfter`) are still recognised and read as before.
- **Export** writes Final Draft's conventions (points, edge-relative indents, `Leading="Regular"`, `SpaceBefore` only), plus
  the existing `DraftCraftMetadata` block, so DraftCraft reopens its own files with the exact DraftCraft format.
- An element whose imported width would not fit the page falls back to the default indents for that element instead of
  failing the whole import.

## Line wrapping

When a word ends exactly at the right edge of an element, the space after it now stays at the end of that line (as the
editor always showed it) instead of starting the next printed line. In rare cases a paragraph that measured one line
longer in 1.15.3 now measures the same as in the editor, so a page break can move by one line in such a script.

## Fonts

A Courier face other than Courier Prime (for example *Courier Final Draft* from an imported file, or *Courier New*) now
falls back to the bundled Courier Prime before the system monospace face, so line lengths stay 10 characters per inch when
the named face is not installed.

## PDF header

Screenplay PDFs no longer print the script title at the top of every page. The header band carries only the page number
(top right, omitted on page 1), which is the standard layout. There was no setting for the running title.

## Settings

Six new editor preferences (`autoFormatting`, `detectCharacters`, `autoDialogue`, `smartTypeSuggestions`,
`templateFormatting`, `ambiguousSuggestions`) default to on. Existing preference files without them load with those defaults;
all existing preferences keep their values.

## Rollback

Git tag `checkpoint-before-formatting-work` is the 1.15.3 release tree. Documents saved by 1.15.4 open in 1.15.3: every one of
the 96 built-in 1.15.4 formats passes 1.15.3's `validateFormat` (`verification/evidence-1.15.4/rollback-format-check.json`).
1.15.3 ignores the six new editor preferences.

**Final Draft files go one way.** An `.fdx` exported by 1.15.4 uses Final Draft's own conventions, which 1.15.3 cannot
read (the same reason 1.15.3 rejected files saved by Final Draft): opening it in 1.15.3 fails with "unsupported element or
page settings" (`verification/evidence-1.15.4/compat-1.15.3-documents.json`, `newFdxOpensIn1153`). To take work back to
1.15.3, use the `.draftcraft` project file.
