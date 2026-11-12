# DraftCraft Pro 1.16.2 — build and installation

* **Target.** Apple Silicon (arm64), macOS 13 or later.
* **Unchanged from 1.15.x.** The runtime is still Electron 44.7.0 and the bundle identity is still
  `com.draftcraft.screenplay.studio`.
* **Your data.** Projects, preferences, recovery copies and backups stay where they are, and nothing is migrated or
  erased.
* **New preferences.** 1.16 adds one new browser-storage key per computer, `draftcraft_workspace_v1`, which holds the
  toolbar, timeline, view and appearance preferences. Screenplay files are not changed by it.
  * 1.16.1 adds the Navigator table, Structure Line and toolbar-group settings to that key. 1.16.2 adds nothing.
  * Preferences saved by 1.16.0 load with defaults for the new fields.

> **Status of this build**
>
> * **How it was built.** It was assembled on Linux by the same route as 1.15.3 and 1.15.4 (see below).
> * **Signing.** It is **ad-hoc signed**. It is **not Developer ID signed** and **not notarized**.
> * **Tests.** All 20 release suites and the real-Electron lifecycle, save and PDF-parity checks passed on the exact
>   payload inside the image (`TEST-RESULTS-1.16.2.md`).
> * **Developer ID.** To sign and notarize the app with your own Apple Developer account, see the `Developer-ID`
>   folder on the disk image and the section below.
> * **Not yet done on a Mac.** 1.16.2 has **not** been launched on a Mac. The macOS-only parts are implemented but
>   not verified: traffic lights, tabs, full screen and native menus.

## Install from the DMG

1. Quit DraftCraft Pro if it is running.
2. Open `DraftCraft-Pro-1.16.2-arm64.dmg` in Finder.
3. Double-click **Install-DraftCraft.command** on the mounted disk. Terminal opens and the installer does the following
   (it makes no network requests and needs no administrator password):
   1. checks every file of the app against `Support/Package-SHA256.txt`
   2. copies the app to `/Applications`, or to `~/Applications` if `/Applications` is not writable
   3. re-signs that copy locally and verifies it
   4. removes quarantine from the installed copy only
   5. keeps the previous app in a timestamped backup folder
   6. opens the new copy
4. If macOS blocks the installer, open it once, then use **System Settings ▸ Privacy & Security ▸ Open Anyway**.
   Alternatively, run `/bin/bash /Volumes/DraftCraft\ Pro/Install-DraftCraft.command` in Terminal.

Verify the download first. The expected value is in `SHA256SUMS.txt`:

```sh
shasum -a 256 DraftCraft-Pro-1.16.2-arm64.dmg
```

**Going back.** To go back, quit the app and move the timestamped backup copy back to Applications. The project file
format is unchanged apart from one new optional paragraph field (`align`). In a renderer check, the 1.15.4 editor opened a
1.16 document with alignment, styled text runs and timeline elements without errors, and it kept those fields. Opening
a 1.16 project file in the installed 1.15.4 app (including its file validation) was **not tested**, so keep a copy of
any project you edit in 1.16 before going back.

## Developer ID signing and notarization (your Mac, your account)

The disk image has a `Developer-ID` folder containing `Sign-and-Notarize.command`, `entitlements.plist` and
`README.md`.

```sh
"/Volumes/DraftCraft Pro/Developer-ID/Sign-and-Notarize.command" --check   # tools, certificate, notarytool profile
"/Volumes/DraftCraft Pro/Developer-ID/Sign-and-Notarize.command"           # sign, notarize, staple, disk image
```

* **What you need.** A "Developer ID Application" certificate in your keychain and the Xcode Command Line Tools.
* **The notarytool profile.** The script offers to create one with `xcrun notarytool store-credentials`. Apple's
  tool asks for your Apple ID, team ID and app-specific password. The script never handles them.
* **What it does.** It checks the app against the disk image manifest, then signs a copy from the inside out with the
  hardened runtime and secure timestamps. It notarizes and staples that copy and checks it with `spctl`. Finally, it
  builds a signed, notarized and stapled disk image in `~/Downloads/DraftCraft-Pro-1.16.2-Developer-ID/`.
* **Installing the result.** Drag the new app to Applications. Do not use `Install-DraftCraft.command` for this
  copy: it re-signs ad hoc.

## Build on macOS (normal route)

Requirements: Node.js 24 and the Xcode Command Line Tools.

```sh
npm ci && npm --prefix desktop ci
npm run lint                       # tsc --noEmit
node desktop/build.cjs             # stages desktop-build/app
node desktop/package.mjs darwin arm64
bash desktop/build-dmg-macos.sh
```

## How 1.16.2 was actually built (Linux, no npm registry)

This is the same route as 1.15.4 (`Build-and-Install-1.15.4.md`, `build-offline/README.md`):

```sh
node build-offline/stage-desktop.mjs --out=<stage>/app --previous=<1.15.2 extracted app.asar> \
     --serverSha=77724911e9e722441c708eb004a483acff5581a795bb0a98c2ad1a70d2bc843a \
     --vendor=<vendor/node_modules> --deps=<deps-src>
node build-offline/asar-pack.mjs <stage>/app <out>/app.asar
python3 verification/build-release-dmg.py <config.json>     # gate: all 20 release suites passed on this payload
```

* **Runtime.** The verified 1.15.2 ARM64 Electron runtime is reused unchanged, and only the outer bundle is
  re-signed ad hoc.
* **Image checks.** The image is extracted twice (7-Zip and `hfsplus`) and must be byte-identical to the staged
  volume.
* **Receipts.** The receipt and proofs (`dmg-receipt.json`, `dmg-*-proof.json`) are delivered next to the image.

## Reproduce the tests

```sh
BROWSER_EXE=/path/to/chromium DRAFTCRAFT_DIST=<stage>/app/dist DRAFTCRAFT_MULTIPROCESS=1 \
  python3 verification/run-release-tests.py                     # 20 suites incl. the new "workspace" suite
xvfb-run -a node verification/electron/lifecycle-scenarios.cjs <stage>/app   # 13 scenarios incl. right-click
xvfb-run -a node verification/electron/save-scenarios.cjs <app.asar>        # 43 save checks
xvfb-run -a node verification/electron/pdf-parity.cjs <stage>/app
DRAFTCRAFT_DIST=<stage>/app/dist BROWSER_EXE=… node --import tsx verification/performance-scale-browser.cjs out.json
```

## Native macOS checklist for 1.16.2 (new items first)

1. **Long script.** Open a 200-page script and type, and press Return, near the start and in the middle. Check that
   the caret, pages and Structure Lines keep up. Scroll quickly to the end and check that split paragraphs show the
   right lines.
2. **Navigator table.** Switch Scenes to the table, drag a column edge with the trackpad, sort, edit a heading, and
   relaunch: the widths stay.
3. **Structure Line Settings.** Open them from View › Show and from a right-click on a line, and change the width,
   opacity, levels and colour. Print a page with lines.
4. **Toolbar.** Use View › Toolbar Groups (check marks), the toolbar right-click › Show Groups, and Customize. In
   Customize, drag an item from the list into the toolbar between two items, then drag it out again (fixed in 1.16.2).
5. **Developer ID (if you have an account).** Run `Sign-and-Notarize.command --check`, then the full run, and open the
   notarized copy.

### Carried over from 1.16.0

1. `shasum -a 256` the DMG, run the installer, and confirm the app opens from Applications.
2. **Window.** Traffic lights sit in the title row, the title row drags the window, full screen works, and the
   toolbar does not overlap the script in a narrow window.
3. **Menu bar.** Open each menu and check that the toggles show check marks (View › Timeline, Navigator, Structure
   Lines, appearance).
4. **Tabs.** Window › New Tab (⌘T) opens a second document as a tab. Show Tab Bar, Previous/Next Tab and Merge All
   Windows work.
5. **Timeline.** Double-click a lane, type a name, then drag, resize and move the element to another lane. ⌘Z undoes
   in the timeline. Double-click a scene in the Script lane. Drag a scene and confirm Move Scene, then ⌘Z.
6. **Right-click.** Right-click script text to see the page menu with B/I/U, ScriptNote, Bookmark and Element ▸.
   Right-click a Beat Board title or the Navigator filter to see Undo/Redo/Cut/Copy/Paste/Select All.
7. **Appearance.** System, Light, Dark and Midnight, including following the system setting.
8. **Earlier checks.** Run the 1.15.4 checklist items 2–8 (save and close, PDF, cross-element editing, IME, crash
   recovery, latency, dictation, VoiceOver).
