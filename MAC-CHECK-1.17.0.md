# DraftCraft Pro 1.17.0 — Mac check of the delivered image

* **The Mac.** Apple M2 Mac mini, 8 GB, macOS 27.0.1 (26A434), on AC power. The owner's apps were running.
* **The image.** `DraftCraft-Pro-1.17.0-arm64.dmg`, SHA-256 `618f71cbae6146d7c0e820be353357fefeb2b3d0ee7b0fc32d5115209a7a5e9f`.
* **How it was run.** Both scripts were started by double-click in Finder, on 27 October 2026. The logs and the report
  are in `verification/evidence-1.17.0/macos/`, with the account and host names redacted.
* **Nothing else was touched.** The installed `/Applications/DraftCraft Pro.app` (1.16.2) and the normal profile were
  only read: the image check reports them without changing them, and the test copy ran from `/tmp` with its own
  profile.

## 1. Image check (`1-verify-image.command`, read-only): passed

| Check | Result |
|---|---|
| DMG SHA-256 | **MATCH** with the expected value |
| `hdiutil verify` | **VALID** (CRC32 `$FF415CC4`) |
| Read-only mount, volume | Case-sensitive HFS+, "DraftCraft Pro" |
| Info.plist | 1.17.0; ASAR integrity `b003f70d…`; macOS 13.0 minimum |
| Architecture | arm64 |
| `codesign --verify --deep --strict` | **valid on disk**, satisfies its Designated Requirement. All 8 nested helpers and frameworks verify. |
| Gatekeeper (`spctl`) | rejected, as expected for an ad-hoc, non-notarized build |
| Installer manifest | 272 entries, 0 mismatches; all four support files pinned in the installer |
| Developer-ID folder | `bash -n` passes on macOS bash 3.2; `entitlements.plist` passes `plutil -lint` |
| **Speech helper** (new) | `Contents/Resources/DraftCraftDictation`: mode 755, arm64 Mach-O, SHA-256 `a383e20e…` (the binary built on this Mac), `codesign` **valid** |
| Usage descriptions | Microphone and Speech Recognition texts present |
| `app.asar` SHA-256 | **MATCH** (`10ff3f91…`) |

## 2. Native self-test (`7-self-test.command`): 13 of 13 steps passed

The test copy ran from `/tmp/draftcraft-1.17.0-selftest` with its own profile and quit by itself after 75 seconds.

| Step | Result on the Mac |
|---|---|
| Window | Traffic lights at (13, 9), the configured position. 1440 × 900. Full screen allowed. |
| Full screen | Entered and left: both macOS events arrived. Capture: `self-test-02-full-screen.png` (1920 × 1080). |
| Tabs | File › New Tab opened a second document window, Window › Merge All Windows ran, and the tab closed cleanly. Electron does not report tab-group membership, so **the tab bar itself was not seen**. |
| Menu check marks | View › Navigator and View › Timeline toggled and restored their check marks in the real macOS menu. 23 of 55 checkable items were checked and matched the state (for example View › Toolbar Groups ›, Format › Scene Numbers › Both). |
| Spelling (macOS spellchecker) | Flagged: `recieve`, `teh`, `qwrtzxv`. Accepted: `receive`, `colour`, `color`, and also French `bonjour` and German `Straße` and `Wohnung` (macOS detects the language). Suggestions for `recieve`: receive, relieve. |
| Voices | 185 `say` voices and 180 browser voices. **No Premium or Enhanced voice is installed on this Mac**, so premium quality could not be checked. |
| Speech helper | Found in `Contents/Resources` and started: it answered "This recognition language is unavailable." for the deliberate test language and listed the Mac's supported locales. No permission was asked, because the test stops before recognition starts. Signature: ad hoc, linker-signed. |
| VoiceOver labels | Script fields are named "Scene Heading, scene 1", "Action", and so on. Ctrl+Shift+Period (a real key event) announced "Element 1 of 27: Scene Heading, page 1, scene 1" in the polite live region. The Navigator tab list was correct. |
| Getting Started | It opened with 36 sections. "cast list csv" found 2 sections, highlighted. Capture: `self-test-03-getting-started.png`. |
| Return latency | See below. |

### Return at the start of a 250-page script (real key events, 10 Returns after 2 warm-ups)

| Script | keydown → second frame, p50 / p95 | keydown → presented paint (Event Timing), p50 / p95 | handler time (Event Timing processing) | typing, input → second frame, p50 / p95 |
|---|---|---|---|---|
| Mixed, dialogue-heavy (5,462 elements, 256 pages) | **51 / 60 ms** | 72 / 88 ms | 14–42 ms | 30 / 78 ms |
| Uniform worst case (4,250 elements, 250 pages) | **47 / 67 ms** | 64 / 96 ms | 19–48 ms | 26 / 64 ms |

* **The two measures.** "Keydown → second frame" is the measure the release suites use. Event Timing counts from
  the input event to the frame macOS presents. On this Mac about 30 ms of every Event Timing duration comes after the
  handler (rendering, compositing, waiting for the display).
* **Result.** The target (under 50 ms) is reached at the median only for the uniform script, by the second-frame
  measure. **Item 14 stays Partial.**

## 3. Statuses this check changes

| Row (`FINAL-DRAFT-MATRIX-1.17.0.md`) | Was | Now |
|---|---|---|
| Traffic lights and title bar | Implemented; Mac check | **Verified on the Mac** (position). The look of the title row is in the capture. |
| Full screen | Implemented; Mac check | **Verified on the Mac** |
| Native menu check marks | Verified (command path); Mac check | **Verified on the Mac** (toggle and restore in the real menu) |
| Document tabs | Implemented; Mac check | **Partial on the Mac**: a tab window opens and Merge All Windows runs, but the tab bar was not seen |
| Spelling languages | Verified on Linux; Mac check | **Verified on the Mac** for English, French and German words |
| Dictation helper | Implemented; Mac check | **Verified on the Mac** that it is present, signed and runs. Dictating speech is still manual. |
| VoiceOver | Verified; Mac check | Labels and the announcement **verified on the Mac**. A session with VoiceOver itself is still manual. |
| Premium voices | Mac check | **Blocked on this Mac**: none are installed (System Settings › Accessibility › Spoken Content can download them) |
| Return latency (item 14) | Partial | **Partial**. Mac median 47–51 ms (second frame), 64–72 ms (presented paint). |

## 4. Seen on the Mac but not fixed in this image

* **Getting Started line breaks.** In the task-guide sections, the guide window keeps the hard line breaks of its
  source text, so some sentences break mid-line ("…number, length and / characters;"). The words are correct; only
  the wrapping is untidy. It is cosmetic and is listed for the next build.

## 5. Not checked on the Mac

These still need a person at the Mac:

* the tab bar itself
* a VoiceOver session
* dictating speech (it needs permission prompts, which belong to the owner)
* premium voice quality
* trackpad panning on the timeline
* a real Developer ID run

The test copy shares the app identifier with the installed app, so no permission prompt was answered for it.
