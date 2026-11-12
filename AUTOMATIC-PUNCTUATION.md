# Intelligent automatic punctuation

DraftCraft Pro 1.12.0 adds sentence-ending punctuation to the existing screenplay
editor. It starts **On**. Open **Settings → Writing → Intelligent Automatic
Punctuation** to change it. Preferences apply immediately and persist after
restarting. Existing spelling, template, shortcut and caret settings are retained.

Press ordinary **Return** at the end of a sentence. When sufficiently confident,
the local English classifier inserts a single ending and continues the existing
paragraph/element transition.

| Text before Return | Result |
| --- | --- |
| He looks outside | He looks outside. |
| Where is he | Where is he? |
| Do you remember me | Do you remember me? |
| You really think he is alive | You really think he is alive? |
| I wonder why he left | I wonder why he left. |
| Leave me alone | Leave me alone. |
| He walks toward the | He walks toward the |
| INT. HOUSE - DAY | INT. HOUSE - DAY |

Emotional vocabulary and commands normally receive periods. A warning such as
`Watch out` can receive `!` when nearby delivery/danger context strongly supports
it. A shouting parenthetical alone does not turn every line into an exclamation.
Existing endings, ellipses, interruption dashes and intentional continuations
are retained. Names, parentheticals, headings, transitions, shots and structural
elements are exempt. Complete Action, Dialogue, General prose and supported
descriptive elements can receive punctuation.

Return and the inserted ending share **one Undo step**. Cmd+Z restores the original
text and insertion point; Cmd+Shift+Z restores the edit. Deliberately deleting or
undoing an ending is remembered for that unchanged sentence in its paragraph.
Those omissions persist in native `.draftcraft` projects. Changing the sentence's
words allows it to be analyzed again.

Selected text, a caret inside an unfinished line, Shift+Return and active IME
composition keep normal editing behavior. SmartType acceptance happens first.
Automatic punctuation does not switch the document's template or replace the
native insertion point, screenplay formatting, spelling or smooth caret.

The master switch disables every punctuation trigger. Advanced controls are:

| Control | Default |
| --- | --- |
| Automatically Detect and Insert Sentence Punctuation | On |
| Automatic Full Stops | On |
| Automatic Question Marks | On |
| Conservative Exclamation Detection | On |
| Detect Incomplete Sentences | On |
| Apply Punctuation on Enter/Return | On |
| Detect Sentence Boundaries While Typing | Off |

Turning exclamation detection off prevents automatically inserted exclamation
marks. Turning incomplete-sentence detection off relaxes trailing-phrase checks;
it does not force punctuation on every fragment. Optional while-typing detection
uses **two spaces at the end of a complete sentence** as an explicit boundary
signal. It inserts the ending and retains both spaces. Single spaces stay normal.
This optional insertion is also undoable with its triggering input.

Essential analysis works offline without an API key. The engine uses the existing
Compromise linguistic resource, part-of-speech and clause information, grammatical
construction rules and bounded local screenplay context. It analyzes the final
sentence, caches recent decisions and never sends asynchronous punctuation edits.

This is conservative English assistance, not perfect interpretation of intent or
prosody. Supported conversational question patterns can still be ambiguous in a
particular story. Other languages, complex fragments, terminal URLs/paths and
sentences beyond the bounded analysis window can remain untouched. Review the
result as you write. The previous release's advanced pagination and interchange
limitations remain documented in WRITING-FORMATS-REPORT.md.
