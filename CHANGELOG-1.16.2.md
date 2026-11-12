# DraftCraft Pro 1.16.2 — changes

1.16.2 is a fix release on top of 1.16.1. Everything in `CHANGELOG-1.16.1.md` is included. The project files,
preferences and file format are unchanged.

## Fixed: dragging items into the toolbar in Customize Toolbar

**Symptom (reported on 1.16.1).** In Customize Toolbar you could drag an item **out** of the toolbar, but dragging an
item **from the list into** the toolbar did nothing. Dragging the "Default Set" onto the toolbar did not work either.

**Root cause.** The two ends of the drag disagreed about what kind of drag it was:

* **The list.** Items dragged from the list are offered as a *copy* (`effectAllowed = 'copy'`).
* **The toolbar strip.** The strip answered every drag as a *move* (`dropEffect = 'move'`). The browser only drops
  when the target's answer is one the source allows, so it refused every drop from the list.
* **Dragging out.** This worked because toolbar items are offered as a move.
* **Default Set.** This button carried only plain text, which the strip ignored.

**Fix (`src/workspace/Toolbar.tsx`).**

* **Matching answers.** The strip and the list now answer with the effect the dragged item allows: copy from the
  list, move within the toolbar.
* **Default Set.** It carries its own drag data, and dropping it restores the default toolbar.

**Why the tests missed it.** The workspace suite added items with double-click and used the Move buttons. The
feature matrix listed drag and drop as "Implemented" and not "Verified" for that reason. There is now a check that
uses real pointer drags. It fails on 1.16.1 and passes on 1.16.2, and it covers:

* list → toolbar, landing where the item is dropped (before Undo)
* the list marking the item as in the toolbar
* reordering by dragging
* dragging out
* the same space dragged in twice
* the Default Set

Adding items by double-click, by Return and with the Move buttons is unchanged.

## Other

* Version 1.16.2; Help › Getting Started mentions the fix.
