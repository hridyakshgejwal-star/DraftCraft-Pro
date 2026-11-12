# Final Draft-style FDX fixture

`standard-layout.fdx` was written for DraftCraft's tests. Its text is original. Its structure follows the attribute
conventions observed in FDX files saved by Final Draft:

* `PageLayout` margins in points (`TopMargin="72"`), with no left/right margin or paper size;
* `ParagraphSpec` indents in inches from the paper's left edge, `Leading="Regular"` with a `Spacing` multiplier,
  `SpaceBefore` in points and no `SpaceAfter`, capitalized `Alignment`, `StartsNewPage="Yes|No"`;
* capitals as the `AllCaps` token in `FontSpec Style`, and the Return-key element in `Behavior ReturnKey`;
* scene metadata (`SceneProperties`) inside paragraphs.

These conventions were checked against six FDX files saved by Final Draft in the public test data of
https://github.com/rsdoiel/fdx (`testdata/sample-0[1-6].fdx`, AGPL-3.0). Those files are not copied into this
repository; the import check against them is recorded in `verification/evidence-1.15.4/`.
