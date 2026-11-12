# DraftCraft Pro 1.17.0 — release report

1.17.0 works through the gaps found against Final Draft 13. Seventeen items were in scope for building: 8 at
priority 1, 7 at priority 2 and 2 at priority 3. Each gap was confirmed in the 1.16.2 code first (`AUDIT-1.17.0.md`).
Items 18–22 need a platform, a service or an Apple account; they are planned, not built.

| Document | Contents |
|---|---|
| `CHANGELOG-1.17.0.md` | Every item, with its root cause, the fix and its tests |
| `TEST-RESULTS-1.17.0.md` | Results for the exact 1.17.0 payload, and Return latency before and after |
| `LIMITATIONS-1.17.0.md` | What remains, and what was not verified |
| `FEATURES-1.17.0.md` | The feature list |
| `FINAL-DRAFT-MATRIX-1.17.0.md` | The Final Draft 13 comparison with honest statuses |
| `PLAN-1.17.0-ITEMS-18-22.md` | Windows, iPad and cloud sync, hosted collaboration, Get Notes, Developer ID |
| `Build-and-Install-1.17.0.md` | Installing, Developer ID signing, building, testing and the Mac checklist |
| `MAC-CHECK-1.17.0.md` (next to the image) | The read-only image check and the native self-test on a Mac |

## Status by item

| # | Item | Status |
|---|---|---|
| 1 | Emoji | **Verified** (editor, interchange, Electron PDF parity) |
| 2 | Outline Editor nesting and ripple insert | **Verified** (real pointer drags) |
| 3 | Custom autocorrect | **Verified** |
| 4 | Navigator zoom | **Verified** |
| 5 | Cast List and screen time | **Verified** |
| 6 | Customizable status bar | **Verified** |
| 7 | Auto-hide right scene numbers | **Verified** |
| 8 | Netflix-style template | **Verified** |
| 9 | Beat Board: sequences, views, one save and Undo per drag | **Verified** (real pointer drags) |
| 10 | Navigator table editing, column drag, remembered sort | **Verified** (real header drags) |
| 11 | Dictation helper | **Implemented** and bundled. It was compiled on the owner's Mac and checked by test; the Mac self-test starts it. Dictating itself is manual. |
| 12 | Right-to-left and European languages | **Verified** on Linux. The macOS dictionaries are checked by the Mac self-test. |
| 13 | Accessibility | **Verified** (names, announcements, keyboard). A VoiceOver session is manual. |
| 14 | Return at the start of 250 pages under 50 ms | **Partial.** It is about 20–35 % faster on the same host, but not under 50 ms in the 2-vCPU container. The Mac measurement is in `MAC-CHECK-1.17.0.md`. |
| 15 | Moved files across relaunch | **Verified** |
| 16 | Idea to Draft tutorials | **Verified** |
| 17 | In-app searchable Getting Started | **Verified** |
| 18–22 | Windows, iPad/sync, hosted collaboration, Get Notes, notarization | **Planned**, not built (see the plan) |

## Verification summary

* **Release suites.** All 20 passed on the exact 1.17.0 payload, in one full run at the default budgets. That
  includes 278 unit tests and 37 workspace checks.
* **Real Electron 44.7.0 on Linux.** Lifecycle passed 13/13 and save scenarios 43/43. Editor ↔ PDF parity passed,
  now with emoji in the script.
* **macOS.** The read-only image check and a native self-test run on the Mac after the image is built
  (`MAC-CHECK-1.17.0.md`).
* **Not done.** The image is **ad-hoc signed and not notarized**. Developer ID signing needs the owner's Apple
  account (`Developer-ID/`).
