# DraftCraft Pro 1.17.0 — build and installation

* **Target.** Apple Silicon (arm64), macOS 13 or later.
* **Unchanged from 1.15.x.** The runtime is still Electron 44.7.0 and the bundle identity is still
  `com.draftcraft.screenplay.studio`.
* **Your data.** Projects, preferences, recovery copies and backups stay where they are, and nothing is migrated or
  erased.
* **New preferences.** 1.17.0 adds fields to the per-computer workspace preferences (`draftcraft_workspace_v1`:
  Navigator text size, column order and sort, status bar items, Ripple Insert) and to the writing settings (custom
  autocorrect pairs, spelling language). Older preferences load with defaults.
* **Project files.** New optional fields: `autoHideRightSceneNumbers`, `beatBoardViews` and an outline element's
  `parentId`. Older projects open unchanged. A project saved by 1.17.0 should open in 1.16.2, which ignores these
  fields; this was not tested with the installed 1.16.2 app, so keep a copy before going back.
* **New file next to the locations file.** `project-identities.json` in the profile folder remembers project files
  across relaunches (item 15).

> **Status of this build**
>
> * **How it was built.** It was assembled on Linux by the same route as 1.15.3 to 1.16.2 (see below). The new
>   Speech helper was compiled on an Apple Silicon Mac and added to `Contents/Resources`.
> * **Signing.** It is **ad-hoc signed**. It is **not Developer ID signed** and **not notarized**.
> * **Tests.** All 20 release suites and the real-Electron lifecycle, save and PDF-parity checks passed on the exact
>   payload inside the image (`TEST-RESULTS-1.17.0.md`).
> * **Mac checks.** The read-only image check and the native self-test run on a Mac after the image is built. Their
>   record is `MAC-CHECK-1.17.0.md`, next to the image.
> * **Developer ID.** To sign and notarize with your own Apple Developer account, see the `Developer-ID` folder on
>   the disk image and the section below.

## Install from the DMG

1. Quit DraftCraft Pro if it is running.
2. Open `DraftCraft-Pro-1.17.0-arm64.dmg` in Finder.
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
shasum -a 256 DraftCraft-Pro-1.17.0-arm64.dmg
```

**Going back.** Quit the app and move the timestamped backup copy back to Applications. Keep a copy of any project
you edit in 1.17.0 before going back (see *Project files* above).

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
  builds a signed, notarized and stapled disk image in `~/Downloads/DraftCraft-Pro-1.17.0-Developer-ID/`.
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

## How 1.17.0 was actually built (Linux, no npm registry)

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
xvfb-run -a node verification/electron/lifecycle-scenarios.cjs <stage>/app   # 13 scenarios incl. right-click
xvfb-run -a node verification/electron/save-scenarios.cjs <app.asar>        # 43 save checks
xvfb-run -a node verification/electron/pdf-parity.cjs <stage>/app
DRAFTCRAFT_TEST_PROFILE=/tmp/p DRAFTCRAFT_SELF_TEST=/tmp/p/report.json xvfb-run -a <electron> <stage>/app   # native self-test
DRAFTCRAFT_DIST=<stage>/app/dist BROWSER_EXE=… node --import tsx verification/performance-scale-browser.cjs out.json
```

## Native macOS checks for 1.17.0

The scripts are in `mac-test-1.17.0` next to the image (see its README). `1-verify-image.command` is read-only.
`7-self-test.command` runs a copy from `/tmp` with its own profile and quits; your installed app and profile are not
used. By hand, with `2b-launch-isolated-tmp.command`:

1. **Help.** Help › Getting Started: search "cast list". Help › Idea to Draft › Feature Screenplay: the Beat Board shows
   16 numbered cards.
2. **Emoji.** Insert › Emoji & Symbols; type a line with emoji glued to words; export a PDF and compare.
3. **Outline Editor.** Drag a scene element under a sequence, move the sequence (the scene follows), Option-drag.
4. **Navigator.** Text size buttons; Cast List; in the table, drag a column header, edit a summary, relaunch (sort and
   order stay).
5. **VoiceOver.** Turn VoiceOver on (Cmd+F5), move through script fields, press Ctrl+Shift+Period.
6. **Dictation.** Edit › Dictation… with an installed on-device language. Answer the permission prompts only for the
   installed app, not for a test copy.
7. **Tabs and full screen.** File › New Tab (Cmd+T), Window › Merge All Windows, View › Enter Full Screen.
8. **Trackpad.** Pan the Outline Editor sideways with two fingers.
9. **Moved project.** Save a project, quit, rename it in Finder, relaunch: it opens from the new name.
