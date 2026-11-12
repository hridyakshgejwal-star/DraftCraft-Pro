# DraftCraft Pro 1.7.0 — Contextual Word Suggestions

The existing DraftCraft Pro editor now offers word suggestions through a normal left-click on correctly spelled and misspelled words. The update retains custom shortcut profiles, screenplay formatting, spelling/autocorrect, character memory, page actions, Beat Board, Outline Map, Navigator, and the existing desktop runtime.

## Install and use

Open **DraftCraft-Pro-Contextual-Writing.dmg** and double-click **Install-DraftCraft.command**. The installer verifies the files, preserves an existing installation in a timestamped backup, and installs and opens the application. No Node.js or Rust installation is needed. This build targets Apple Silicon and macOS 13 or later, as declared by the existing bundle.

Left-click a word to open **Word Suggestions**. A misspelled word also shows **Spelling Corrections**. Click a single-word suggestion to replace only that word. Multiword alternatives and changes requiring “a”/“an” agreement display a preview; **Apply Replacement** commits the edits together. **Cmd+Z** and **Cmd+Shift+Z** undo/redo them.

The cursor remains in the screenplay after a normal click. Keep typing to dismiss the popup, or use **Option+Down** to browse its buttons. **Shift+F10** at a collapsed caret opens it for keyboard use. Arrow keys, Tab, Return, and Escape work in the popup. Double-clicking and dragging still select text. A selected text range retains the existing page context menu. Scrolling, resizing, zoom changes, and changes to the source text dismiss an obsolete popup.

Open **Settings → Writing Assistance** to change synonyms, contextual analysis, left-click behavior, suggestion count, explanations, vocabulary style, autocorrect, language, and the custom dictionary. These preferences persist in the existing application profile.

## Implementation

- Correct-word suggestions are independent of red underlines and spelling detection. Spelling can be disabled while synonyms continue to work. When spelling suggestions are hidden, intended-word correction still supports the synonym analysis.
- The popup identifies the complete word at its actual rendered location. Measurement happens only for the clicked paragraph; the feature does not add a span for every word in a long screenplay. The original textarea retains native typing, selection, composition, and layout.
- Offline vocabulary comes from **Princeton WordNet 3.1**, with **77,619 single-word lemmas** and **132,689 word senses** in the bundled data. Shards load on demand, with bounded caches. WordNet and Compromise licenses are included. The reproducible data builder uses pinned package versions.
- Sentence analysis runs in a dedicated worker using English part-of-speech tagging and morphology. It ranks word senses against the selected sentence, weights nearby context less strongly, and retains verb tense, plural forms, and adjective degree where supported. WordNet adjective position restrictions filter unsuitable attributive/predicative alternatives.
- Common screenplay vocabulary has additional context/tone alternatives. For example, “slowly” distinguishes relaxed pacing from caution or hesitation; anger alternatives explain their intensity. River-bank and financial-bank contexts return different choices. Movement and management uses of “run” differ.
- Suggestions use the selected word’s capitalization. Replacements retain punctuation, Unicode, paragraph type, revisions, bookmarks, notes, and synchronized style runs. The edit shares the existing history and pagination system.
- Character names, established locations in scene headings, transitions, and technical shot terms are protected from inappropriate synonym replacements. Spelling corrections remain available for misspelled heading/transition wording. Grammatical function words and words without a suitable alternative receive a clear explanation instead of invented synonyms.
- Recent analyses are cached. Moving to another word, editing, or closing the popup invalidates the earlier request. Worker responses carry request identities; a replacement also checks that the captured paragraph and range still match. Optional remote requests are abortable and bounded by timeouts.

## Optional advanced analysis

**Use Optional Advanced Analysis** is off by default. When enabled with a configured Gemini key, it sends the selected sentence and up to 1,000 characters of nearby screenplay text to that service. The entire screenplay is not sent. The settings panel describes this behavior before enabling it.

The new authenticated desktop route requests bounded structured alternatives and short explanations. It validates source ranges, protects structural elements, rejects malformed output, and limits text size and response length. Local results appear first. Missing credentials, service errors, malformed responses, or timeouts leave offline suggestions available.

The provider path was exercised with controlled route/response fixtures and browser simulations. A live Gemini request with a real key was not performed.

## Verification

| Check | Result |
| --- | --- |
| TypeScript and production desktop build | Passed |
| Model and desktop/advanced-route tests | 42 passed |
| Packaged word-suggestion workflows | 13 groups passed |
| Existing spelling/character assistance workflows | 14 groups passed, including long scripts |
| Custom shortcuts/profile workflows | 14 groups passed |
| Editor/page/Beat Board workflows | 14 groups passed |
| Packaged payload | 78 files verified; ASAR header integrity matched |
| Native bundle signatures | 13 Mach-O files, 54,394 code-page hashes, 31 special-slot hashes, 471 resource hashes, 9 nested code seals, 14 symlinks; no errors |
| Native runtime comparison | 249 native sections unchanged from the verified 1.6.0 application |

The word-popup checks cover correctly spelled words, misspellings without underlines, different sentence meanings, phrase/article previews, cancellation, capitalization, Unicode, style runs, metadata, pagination, protected words, heading corrections, typing, double-click selection, keyboard access, rapid switching, settings reload, missing/available advanced responses, zoom, scrolling, print exclusion, and large scripts.

Tests used the production renderer extracted from the actual finished application. On a 250-page synthetic screenplay, its first word-click result took **315 ms**; cached word-click results took **183–207 ms**, including browser automation. Normal typing p95 in recorded 10/50/120/250-page checks was **24/31/57/110 ms**. These are Linux Chrome measurements, not physical Mac mini M2 benchmarks. The results and verification harnesses are included in the source archive and disk image.

## Practical limits

Offline sentence analysis uses lexical and grammar heuristics. It cannot reliably infer every metaphor, specialized meaning, or character intention. Ambiguous meanings and related alternatives are identified as choices to review; the app does not claim every suggestion is an exact equivalent. Local resources cover English; some function words, names, specialist words, and other languages have no safe local alternatives. Optional advanced results also require judgment.

The application has not been mounted or launched on a physical Mac. Native macOS keyboard layouts, Gatekeeper interaction, printing, Keychain, and M2 performance remain unverified. The bundle is ad-hoc signed and uses the existing local-signing installer; it is not Developer ID signed or notarized. The existing autosave debounce can lose the latest unflushed input during an abrupt process kill. The pre-existing large-bundle warning remains.

The source archive retains the unused Rust prototype, existing editor systems, lockfiles, offline renderer, licenses, and verification results. It excludes node_modules and browser screenshots.
