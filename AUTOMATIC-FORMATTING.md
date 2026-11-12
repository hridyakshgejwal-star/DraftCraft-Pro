# Automatic screenplay formatting — 1.13.0

This extends the existing textarea screenplay editor, paragraph model and history.
It does not replace the editor or require an online service.

**Settings → Editor → Automatic Formatting** contains four independent controls,
all On by default. An existing explicit sentence-capitalization choice is retained.
Preferences use the existing `draftcraft_editor_preferences_v1` store.

- Newly typed Action, Dialogue and descriptive sentence initials are capitalized.
  Abbreviations, initials, numbers, URLs, ellipses, pasted content, IME composition
  and deliberate lowercase overrides are protected. This is English boundary
  assistance; it cannot infer every author's intended stylization.
- Scene headings normalize supported prefixes and use the selected template's
  uppercase rule and location/time separator. Return, Tab, trailing whitespace or
  leaving an edited line completes the fields. Separator insertion waits while
  typing a location such as DAYCARE or NIGHTINGALE. Internal location hyphens are
  preserved. Existing SmartType still supplies locations and time labels.
- Creating a Parenthetical through a shortcut, toolbar, command palette, menu or
  contextual navigation inserts `()` with the native selection at `[1,1]`.
  Converting selected text wraps that range and preserves its selection/styles.
  Existing pairs are retained; nested pairs can be typed normally. Typing the
  final outer closer advances past it. Return can leave from inside the closer.
  Backspace removes a new empty pair, element changes clear it, and leaving an
  unused automatically created pair for another paragraph restores an empty
  element. Deliberately edited parentheses remain ordinary text.
- Recognized transitions complete in uppercase with the active template ending.
  Default mode includes `FADE OUT:`. **Format → Intelligent Auto-Formatting →
  Transition Endings** offers automatic colons, conventional `FADE OUT.` / `FADE
  TO BLACK.` endings, or punctuation preservation. Apply Writing Settings stores
  the rule in the project; custom templates retain it. Existing author endings
  remain unchanged. Whole-line recognition excludes Dialogue and uncertain prose.

Element structure/case precede ordinary sentence punctuation. Structural elements
are exempt from prose sentence endings. Return plus completion is one history edit;
Undo/Redo restores native selection and paragraph identity. Deliberately removed or
undone structural punctuation is remembered in a bounded per-paragraph omission
list, retained in native project saves. A later change to its words permits a new
completion. No background result can rewrite a later revision.

Scene names ending in a time word are inherently ambiguous. Completion is a
conservative deterministic convention, not semantic certainty; Undo or disabling
the corresponding switch preserves the writer's choice. Whole-document template
changes remain explicit. Existing pages are not automatically reclassified.

## Development verification

Run `npm run lint`, then `node desktop/build.cjs`. Model tests:

```
node --import tsx --test verification/*.test.ts verification/advanced-suggestions.test.cjs verification/shortcut-recording.test.cjs verification/native-history.test.cjs verification/project-files.test.cjs
```

`verification/automatic-formatting-browser.cjs` drives the production renderer with
Playwright and the actual packaged project writer against temporary native files.
`verification/run-release-tests.py` adds this suite to the ten existing release
suites. Set `DRAFTCRAFT_DIST` to the extracted app's `dist` directory,
`PLAYWRIGHT_MODULE` to Playwright and `BROWSER_EXE` to a Chromium executable.
Tests cover typing, controls, caret ranges, actual key navigation, selection,
structural completion, history, template rules, reload, composition simulation,
long scripts and real native save files. Native dialogs are substituted.

A Linux build can verify ARM64 payload/signature structures and disk-image bytes;
it does not establish a physical macOS launch, Finder mount, Gatekeeper acceptance,
VoiceOver, physical IME, 120 Hz behavior or Apple Silicon performance. See the
release report for the actual executed results and retained limitations.
