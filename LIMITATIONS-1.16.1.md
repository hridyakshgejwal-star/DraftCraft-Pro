# DraftCraft Pro 1.16.1 — known limitations

## How this build was verified

* **Automated tests.** All 20 release suites ran on the exact 1.16.1 payload (headless Chromium on Linux), together
  with the real-Electron 44.7.0 lifecycle, save and PDF-parity checks (Linux, Xvfb). Details are in
  `TEST-RESULTS-1.16.1.md`.
* **macOS.**
  * **The image.** On the user's Mac it was checked only by its SHA-256 (it matches the build). The Mac's screen was
    locked during delivery, so `hdiutil verify` and `codesign` were not run there. `1-verify-image.command` in the
    delivered Mac check kit runs them, read-only. (The 1.16.0 image passed these checks on the same Mac.)
  * **The app.** It has still **not** been launched on a Mac. Everything that only exists on macOS is **implemented
    but not verified**:
  * traffic lights and the hidden-inset title bar
  * document tabs and full screen
  * native menu check marks, including the new View › Toolbar Groups
  * the dictation helper
  * premium speech voices
* **Performance.** All numbers come from a 2-vCPU Linux container and include automation overhead. They are not
  measurements on an Apple Silicon Mac.

## Signing

* **This disk image.** It is **ad-hoc signed** and **not notarized**. Gatekeeper rejects it until it is installed
  with `Install-DraftCraft.command` or opened with *Open Anyway*.
* **Developer ID.** Developer ID signing and notarization need an Apple Developer account, a Developer ID
  certificate and Apple's notary service. None of them are available in the build environment, and entering Apple
  credentials on someone's behalf is not allowed. `Developer-ID/Sign-and-Notarize.command` does the whole job on the
  owner's Mac.
* **How the script was tested.** Its control flow is tested on Linux with stand-in tools. It has **never run against
  real `codesign`, `notarytool` or Apple's service**. The first real run may still find something Apple's tools
  reject. If that happens, the script stops and saves Apple's report beside the log.
* **The entitlements.** `entitlements.plist` (JIT, unsigned executable memory, microphone, camera) follows the usual
  Electron hardened-runtime set. It was not confirmed by a notarized launch.

## Features with remaining scope

| Area | Limitation |
|---|---|
| Long scripts | Typing at 250 dense pages is about 2.5–3× faster than 1.16.0 (57 / 108 ms against 141 / 202 ms in the test container). Return near the start, where every page moves, is about 3× faster. In that worst case the cost is still about 0.1 s per Return, mostly React comparing every page. Rendering only the pages near the window (virtualization) would remove most of that; it was not attempted, because of the risk to caret, selection and IME behaviour. |
| Long scripts: distant pages | Page fragments on pages far from the window are positioned when the page comes near the window, a few hundred pixels before it is visible. Very fast scrolling (for example, dragging the scroll bar to the end in one move) could show one page with an unpositioned split paragraph for a single frame. |
| Navigator table | Only the scene heading can be edited in place. Summary and characters come from the script and are read-only. Columns can be resized and hidden, but not reordered. Sorting is not saved across relaunches; widths, column choices and the view are. |
| Structure Lines | Width, opacity, levels and level colours are workspace settings, the same for every screenplay on this computer. Showing the lines remains a per-screenplay switch. The Google Drive PDF path (older jsPDF engine, not bundled offline) does not use them. |
| Toolbar groups | Groups are fixed (Document, Editing, Screenplay, Workspace, Formatting, Production, Tools). Custom groups cannot be made. Hiding Tools also hides Customize; it is always reachable from the toolbar's right-click menu and View › Customize Toolbar…. |
| Timeline | Unchanged from 1.16.0. These are implemented but have no direct automated test: lane colour, reorder and remove; marker colour; copy/paste; Fit Selection; trackpad panning. |
| Beat Board | Unchanged from 1.16.0. Grouping is by act only, and a drag commits on every pointer move. |
| Speed / Normal View | Page numbers in these views are display-only. |
| Saving | A project renamed or moved while open is followed during the session, but not remembered across a relaunch. |
| Collaboration | Works through DraftCraft's own relay on a local network only. |
| Table Read | Premium macOS voices were not tested. |
