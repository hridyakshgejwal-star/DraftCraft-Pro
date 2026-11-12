# DraftCraft Pro 1.16.2 — release report

1.16.2 is 1.16.1 plus one fix. In Customize Toolbar, dragging items from the list into the toolbar did not work. It
does now, and the Default Set can be dragged onto the toolbar too.

Everything 1.16.1 delivered is unchanged and included. That covers the long-script speed work, the Navigator scene
table, the Structure Line settings, toolbar groups and the Developer ID script. It is described in
`Previous-Releases/RELEASE-REPORT-1.16.1.md` and `Previous-Releases/CHANGELOG-1.16.1.md`.

| Document | Contents |
|---|---|
| `CHANGELOG-1.16.2.md` | The fix and its root cause |
| `TEST-RESULTS-1.16.2.md` | Results for the exact 1.16.2 payload, and the drag check on 1.16.1 and 1.16.2 |
| `LIMITATIONS-1.16.2.md` | What remains, and what was not verified |
| `FEATURES-1.16.2.md` | The feature list |
| `FINAL-DRAFT-MATRIX-1.16.2.md` | The Final Draft 13 comparison; drag and drop in the Customize sheet is now **Verified** |
| `Build-and-Install-1.16.2.md` | Installing, Developer ID signing, building and testing |

## The fix

| Problem | Root cause | Fix | Verified by |
|---|---|---|---|
| In Customize Toolbar, you could drag an item *out* of the toolbar but not *in* from the list. The Default Set could not be dragged. | The list offers a *copy*, but the toolbar strip only answered *move*, so the browser refused the drop. The Default Set carried only text, which the strip ignored. | The strip and the list answer with the effect the dragged item allows. The Default Set carries its own drag data. | A new workspace check with real pointer drags. It **fails on 1.16.1 and passes on 1.16.2** (logs in the evidence folder). |

## Verification summary

* **Release suites.** All 20 passed on the exact 1.16.2 payload, at the default budgets, in a single run. That
  includes 258 unit tests and 27 workspace checks.
* **Real Electron 44.7.0 on Linux.** Lifecycle passed 13/13 and save scenarios 43/43. Editor ↔ PDF parity passed.
* **macOS.** The image check runs on the Mac after the image is built. Its record is delivered next to the image. The
  app has not been launched on a Mac.
* **Not done.** The image is **ad-hoc signed and not notarized**. Developer ID signing needs the owner's Apple account
  (`Developer-ID/`).
