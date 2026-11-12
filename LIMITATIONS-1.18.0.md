# DraftCraft Pro 1.18.0 — known limitations

## How this build was verified

* **Automated tests.** All 20 release suites ran on the exact 1.18.0 payload (headless Chromium on Linux), with the
  real-Electron 44.7.0 Start Window (6), lifecycle (13), save (43) and PDF-parity checks (Linux, Xvfb). See
  `TEST-RESULTS-1.18.0.md`.
* **macOS.** Two checks run on the Mac after the image is built. They are recorded in `MAC-CHECK-1.18.0.md`, delivered
  next to the image.
  * **The image check** (`1-verify-image.command`) is read-only: SHA-256, `hdiutil verify`, `codesign`, Info.plist,
    the `app.asar` hash, the Speech helper and its signature.
  * **The native self-test** (`7-self-test.command`) runs a copy from `/tmp` with its own profile. It checks the
    window and tabs, full screen, menu check marks, the macOS spellchecker, installed voices, the Speech helper,
    VoiceOver labels, the guide, the Start Window and a recent project, the emoji picker (real key events, insert and
    Undo), and Return latency with real key events.
  * **Still manual on a Mac:**
    * listening with VoiceOver
    * dictating speech (it needs microphone and Speech Recognition permission)
    * judging premium voice quality
    * trackpad panning on the timeline
    * a real Developer ID run
* **Performance numbers.** These come from a 2-vCPU Linux container and include automation overhead, unless they are
  labelled as Mac measurements.

## Signing

* **This disk image.** It is **ad-hoc signed** and **not notarized**. Install it with `Install-DraftCraft.command`
  or use *Open Anyway*.
* **Developer ID** (plan item 22). `Developer-ID/Sign-and-Notarize.command` needs the owner's Apple Developer account,
  certificate and notary profile. It also signs the new Speech helper with the hardened runtime and microphone
  entitlement. It has been tested only with stand-in tools, and has never run against Apple's real `codesign`,
  `notarytool` and notary service.

## Items not built (still planned in `PLAN-1.17.0-ITEMS-18-22.md`)

| Item | Status | Why |
|---|---|---|
| 18 Windows version | Blocked | Needs a Windows x64 machine, the Windows Electron runtime and an Authenticode certificate |
| 19 iPad companion; cloud sync with conflict handling | Missing / Blocked | Saving into iCloud Drive or Dropbox folders works as plain files, but conflicting edits from two computers are not merged. The iPad app needs the Apple Developer Program and Xcode. |
| 20 Hosted collaboration | Blocked | Needs a hosted WSS server, accounts and operation. Collaboration works on a local network only. |
| 21 Get Notes | Not built | Final Draft's service has no public API, and there is no equivalent service to send scripts to |
| 22 Developer ID notarization | Owner runs it | See *Signing* |

## Features with remaining scope

| Area | Limitation |
|---|---|
| Long scripts (item 14) | **The 50 ms target for Return at the start of a 250-page script is not met in the test container.** Same probe, 1.16.2 → 1.17.0: p50 69 → 53 ms, p95 72 → 72 ms. In the mixed 250-page script, keydown → paint has a median of 48–56 ms. The remaining cost is mostly React reconciling the pages near the caret, the textarea values that move between pages, and two forced browser layouts. When a Return changes the page count, the whole script is laid out again (about 25 ms). The 1.17.0 Mac measurement is in `Previous-Releases/MAC-CHECK-1.17.0.md`; the 1.18.0 self-test measures it again (`MAC-CHECK-1.18.0.md`). |
| Long scripts: far pages | Pages more than about one and a half screens from the window show their previous drawing until idle time refreshes them, nearest first. Every jump (Navigator, search, Go To Page, bookmarks, scene links) refreshes the target page first. A very fast scroll-bar drag could show one stale page for a moment. |
| Start Window | It is a panel inside the document window, not a separate window as in Final Draft. It opens at launch in the first window only; File › New Document Window opens straight into a new script. There are no thumbnails and no pinned projects. |
| Recent projects | The list holds paths. A project moved or renamed in Finder is shown as Missing and is not followed (no macOS bookmarks); open it from its new place with Open… and it is listed again. Imported files (Final Draft, Fountain, text, PDF) are listed under their original file, and opening one imports it again. The macOS Dock and Apple menu recent lists show only the types the app declares (.draftcraft, .fdx, .fountain). |
| Emoji picker | 1,427 emoji from Unicode 15.1 in nine categories, with 61 flags. There is no skin-tone chooser, and skin-tone variants are not listed (the macOS Character Viewer has them). Search uses English names and keywords. An emoji newer than the Mac's emoji font shows as a box. Recently Used is kept per profile on this computer. |
| Emoji | Line breaks follow the renderer's ICU line breaker. Where it is missing (plain Node), simpler rules are used; they agree for common emoji but not for every Unicode case. Emoji colour and glyphs in PDF come from the system emoji font. |
| Spelling languages | English uses the bundled dictionaries. The other 21 languages use the system spellchecker. On macOS that follows macOS's own language detection and the languages in System Settings, so a language whose macOS dictionary is missing gets no spelling marks. No dictionaries are downloaded. Grammar-aware punctuation remains English only. |
| Right-to-left text | Each field and printed line takes its direction from its first strong character (`dir="auto"`). A paragraph mixing directions follows the Unicode bidirectional algorithm; there is no manual direction override. |
| Dictation | The helper is the arm64 build compiled on the owner's Mac (macOS 27.0.1, Swift 6.4, Command Line Tools; it reports one Swift 6 concurrency warning). It needs on-device recognition for the chosen language. The first use asks for Microphone and Speech Recognition permission. Dictating was not tested automatically. |
| Accessibility | Labels, the live region and keyboard paths are tested in Chromium and Electron. A full VoiceOver session (rotor, reading order across page fragments) was not performed. |
| Custom autocorrect | Pairs replace whole words only (no phrases spanning a space), up to 1,000 pairs. |
| Cast List | Screen time is an estimate: the length of the scenes a character appears in, at one page per minute. It is not the character's own lines. |
| Idea to Draft | Three tutorials (feature, pilot, stage play). Their prompts are original text, not Final Draft's tutorials. |
| Templates | The Easy-Write, Micro Drama and ReelShort templates exist only in an older, unused template list (`src/utils/screenplayTemplates.ts`); they are not in the File › New from Template gallery. |
| Navigator table | Characters remain read-only (they come from the script). |
| Timeline | Lane colour, reorder and remove, marker colour, copy/paste, Fit Selection and trackpad panning have no direct automated test. |
| Speed / Normal View | Page numbers in these views are display-only. |
| Collaboration | Works through DraftCraft's own relay on a local network only. |
