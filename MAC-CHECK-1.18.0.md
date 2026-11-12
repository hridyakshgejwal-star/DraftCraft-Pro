# DraftCraft Pro 1.18.0 — Mac check

* **Image.** `DraftCraft-Pro-1.18.0-arm64.dmg`, SHA-256 `c1cf0456e13b7a69b78ef562fdd5e2b494a7e8ac99e5330d85ddab0718d2d084`.
* **Mac.** Apple M2 Mac mini, 8 GB, macOS 27.0.1 (26A434), on AC power. Checked on 31 Oct 2026.
* **How.** The two scripts from `mac-test-1.18.0` ran from `~/Downloads/DraftCraft-1.18.0`, by double-click in Finder.
  * `1-verify-image.command` is read-only.
  * `7-self-test.command` copies the app to `/tmp/draftcraft-1.18.0-selftest` and runs it with its own profile.
  * The installed app (`/Applications/DraftCraft Pro.app`, still 1.16.2) and your profile were not opened or changed.
  * The test copy adds nothing to the macOS recent-documents list.
* **Logs.** The logs, the report and the window captures are next to the image. Redacted copies are in
  `verification/evidence-1.18.0/macos/`, with the account and host names replaced.

## 1. Image check (`1-verify-image.command`, read-only): passed

| Check | Result |
|---|---|
| DMG SHA-256 | **MATCH** with `expected.txt` |
| `hdiutil verify` | checksum **VALID**, CRC32 `$C1FE33F2` |
| Read-only mount | Case-sensitive HFS+, volume "DraftCraft Pro", with the 1.18.0 documents, `Verification/`, `Previous-Releases/` and the source zip |
| Info.plist | `com.draftcraft.screenplay.studio`, version **1.18.0**, `ElectronAsarIntegrity` `5c5ef3c8…`, minimum macOS 13.0 |
| Architecture | arm64 |
| `codesign --verify --deep --strict` | valid on disk; it satisfies its Designated Requirement. All 8 nested helpers and frameworks verify. |
| Signature | ad-hoc (`flags=0x2(adhoc)`, no Team ID), as built |
| Gatekeeper (`spctl`) | rejected, as expected for an ad-hoc, non-notarized build |
| Installer manifest | 272 entries, 0 not OK; all 4 pins present |
| Developer-ID folder | `bash -n` exit 0; `entitlements.plist` lints OK |
| Speech helper | `Contents/Resources/DraftCraftDictation`, arm64, mode 755, valid signature (unchanged from 1.17.0) |
| `app.asar` SHA-256 | **MATCH** `7ff1676c…51bdf`, the tested payload |

## 2. Native self-test (`7-self-test.command`): 16 of 16 steps passed

The app checked itself in 81 seconds and quit on its own.

| Step | Result on the Mac |
|---|---|
| Editor ready | Window rendered (1440 × 900) |
| **Start Window** (new) | It opened at launch: "Welcome to DraftCraft Pro 1.18.0", with New Screenplay focused, six format tiles, the empty-list message, five Learn buttons and "Show this window…" ticked. File has Open Recent ("No Recent Projects", Clear Menu) and Start Window…. Escape closed it and returned to the script. Capture: `self-test-01b-start-window.png`. |
| **Recent projects** (new) | A sample project was recorded. File › Open Recent listed "SELF TEST SAMPLE — Self Test Sample.fountain", enabled. File › Start Window… showed it under Recent Projects, opened today. Clicking the row opened the script and closed the window. Capture: `self-test-01c-start-window-recent.png`. |
| Environment | Electron 44.7.0, Chrome 152, packaged, Apple M2, 8 cores |
| Full screen | Both macOS events arrived (entered, left). Capture: `self-test-02-full-screen.png`. |
| Tabs | A new tab opened and closed. Window › Merge All Windows was called. |
| Menu check marks | View › Navigator and Timeline toggled and restored; 55 check items, 21 checked |
| Spelling (macOS) | "teh" and "qwrtzxv" were flagged. French and German words were accepted. Suggestions for "recieve": receive, relieve. |
| Voices | 185 system voices; no Premium or Enhanced voice installed |
| Speech helper | It runs from `Resources/`, refuses the unknown language as designed (no permission asked), and its signature verifies |
| Accessibility | Fields are named by element type; Ctrl+Shift+Period announced "Element 1 of 4: Scene Heading, page 1, scene 1" in a polite live region |
| **Getting Started** | 38 sections. "cast list csv" found 2. **The paragraphs now wrap to the window**, which the 1.17.0 Mac check had found broken. Capture: `self-test-03-getting-started.png`. |
| **Emoji picker** (new) | Insert › Emoji… opened with the search box focused. Real key events typed "clapper", which gave 1 result, 🎬. Return inserted it at the end of the Action line, focus went back to that line, and one Undo removed it. The Character Viewer… button is there. Capture: `self-test-04-emoji-picker.png`. |
| Return latency, mixed 250-page script | 256 pages, 5,462 elements. Keydown → second frame p50/p95 **52/59 ms**; keydown → paint p50/p95 72/80 ms |
| Return latency, uniform worst case | 250 pages. Keydown → second frame p50/p95 **48/60 ms**; keydown → paint p50/p95 72/88 ms |

The 1.17.0 Mac run measured 47–51 ms to the second frame on the same Mac. 1.18.0 does not change this path, and the
difference is within run-to-run variation. The 50 ms target for Return at the start of a 250-page script is still
not met in every run (`LIMITATIONS-1.18.0.md`).

`stderr` shows the usual macOS notices for a copy run from `/tmp`: a sandbox extension notice, and two
`NSSpellServer` timeouts during the first spelling request. Both are harmless; the spelling step passed.

## Still manual on a Mac

* Start Window: clicking each format tile, and Show in Finder (both checked in Linux Electron)
* the Dock's recent-documents menu
* VoiceOver listening
* dictating speech
* premium voice quality
* trackpad panning
* `Install-DraftCraft.command` on the installed copy
* a real Developer ID run
