# DraftCraft Pro 1.18.0 — build and installation

* **Target.** Apple Silicon (arm64), macOS 13 or later.
* **Unchanged from 1.15.x.** The runtime is still Electron 44.7.0 and the bundle identity is still
  `com.draftcraft.screenplay.studio`.
* **Your data.** Projects, preferences, recovery copies and backups stay where they are, and nothing is migrated or
  erased.
* **New files in the profile folder.** 1.18.0 adds `recent-projects.json` (the Start Window's recent list: file paths
  and titles only, private to your account) and `start-window.json` (whether the Start Window opens at launch). Both
  are created when first needed. Recently used emoji are kept with the other per-computer preferences.
* **Project files.** Unchanged from 1.17.0: no field was added or changed, so a project saved by 1.18.0 is the same
  format 1.17.0 reads.
* **Earlier changes.** 1.17.0 added optional project fields (`autoHideRightSceneNumbers`, `beatBoardViews`, an
  outline element's `parentId`) and `project-identities.json`; see `Previous-Releases/Build-and-Install-1.17.0.md`.

> **Status of this build**
>
> * **How it was built.** It was assembled on Linux by the same route as 1.15.3 to 1.17.0 (see below). The Speech
>   helper is the one compiled on an Apple Silicon Mac for 1.17.0, in `Contents/Resources`.
> * **Signing.** It is **ad-hoc signed**. It is **not Developer ID signed** and **not notarized**.
> * **Tests.** All 20 release suites and the real-Electron Start Window, lifecycle, save and PDF-parity checks passed
>   on the exact payload inside the image (`TEST-RESULTS-1.18.0.md`).
> * **Mac checks.** The read-only image check and the native self-test run on a Mac after the image is built. Their
>   record is `MAC-CHECK-1.18.0.md`, next to the image.
> * **Developer ID.** To sign and notarize with your own Apple Developer account, see the `Developer-ID` folder on
>   the disk image and the section below.

## Install from the DMG

1. Quit DraftCraft Pro if it is running.
2. Open `DraftCraft-Pro-1.18.0-arm64.dmg` in Finder.
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
shasum -a 256 DraftCraft-Pro-1.18.0-arm64.dmg
```

**Going back.** Quit the app and move the timestamped backup copy back to Applications. Keep a copy of any project
you edit in 1.18.0 before going back (see *Project files* above).

**First dictation.** Edit › Dictation… uses the bundled Speech helper. macOS asks once for Microphone and Speech
Recognition access for DraftCraft Pro.

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
  builds a signed, notarized and stapled disk image in `~/Downloads/DraftCraft-Pro-1.18.0-Developer-ID/`.
* **Installing the result.** Drag the new app to Applications. Do not use `Install-DraftCraft.command` for this
  copy: it re-signs ad hoc.

## Build on macOS (normal route)

Requirements: Node.js 24 and the Xcode Command Line Tools. The Speech helper is compiled by `desktop/native/build.sh`
(`desktop/native/0-build-dictation-helper.command` does the same by double-click and writes a log).

```sh
npm ci && npm --prefix desktop ci
npm run lint                       # tsc --noEmit
node desktop/build.cjs             # stages desktop-build/app
node desktop/package.mjs darwin arm64
bash desktop/build-dmg-macos.sh
```

## How 1.18.0 was actually built (Linux, no npm registry)

This is the same route as 1.15.4 (`Build-and-Install-1.15.4.md`, `build-offline/README.md`):

```sh
node build-offline/stage-desktop.mjs --out=<stage>/app --previous=<1.15.2 extracted app.asar> \
     --serverSha=77724911e9e722441c708eb004a483acff5581a795bb0a98c2ad1a70d2bc843a \
     --vendor=<vendor/node_modules> --deps=<deps-src>
node build-offline/asar-pack.mjs <stage>/app <out>/app.asar
python3 verification/build-release-dmg.py <config.json>     # gate: all 20 release suites passed on this payload;
                                                           # app_resources adds Getting-Started.txt and the Speech helper
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
xvfb-run -a node verification/electron/start-window-scenarios.cjs <stage>/app # 6 Start Window scenarios
xvfb-run -a node verification/electron/lifecycle-scenarios.cjs <stage>/app   # 13 scenarios incl. right-click
xvfb-run -a node verification/electron/save-scenarios.cjs <app.asar>        # 43 save checks
xvfb-run -a node verification/electron/pdf-parity.cjs <stage>/app
DRAFTCRAFT_TEST_PROFILE=/tmp/p DRAFTCRAFT_SELF_TEST=/tmp/p/report.json xvfb-run -a <electron> <stage>/app   # native self-test
DRAFTCRAFT_DIST=<stage>/app/dist BROWSER_EXE=… node --import tsx verification/performance-scale-browser.cjs out.json
```

## Native macOS checks for 1.18.0

The scripts are in `mac-test-1.18.0` next to the image (see its README). `1-verify-image.command` is read-only.
`7-self-test.command` runs a copy from `/tmp` with its own profile and quits; your installed app and profile are not
used. It now also checks the Start Window at launch, a recent project (File › Open Recent and the Start Window), and
the emoji picker (search, Return, Undo). By hand, with `2b-launch-isolated-tmp.command`:

1. **Start Window.** It opens at launch. Click Television Pilot; then File › Start Window…, Open… a script; quit and
   relaunch: the script is first under Recent Projects and in File › Open Recent. Untick "Show this window when
   DraftCraft Pro opens", relaunch: the app opens straight into the script.
2. **Emoji picker.** Click in an Action line, press ⌃⌘E, type "rain", press Return: the emoji is at the caret and
   Cmd+Z removes it. Right-click a line › Insert Emoji…; Shift-click two emoji; Escape.
3. **Help.** Help › Getting Started: resize the window; paragraphs wrap to the width with no mid-sentence breaks.
4. **Earlier checks.** The 1.17.0 list in `Previous-Releases/Build-and-Install-1.17.0.md` still applies (VoiceOver,
   dictation, tabs and full screen, trackpad, moved project).
