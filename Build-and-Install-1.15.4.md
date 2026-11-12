# DraftCraft Pro 1.15.4 — build and installation

Target: **Apple Silicon (arm64), macOS 13 or later** — the same target, runtime (Electron 44.7.0) and bundle
identity (`com.draftcraft.screenplay.studio`) as 1.15.2 and 1.15.3. Projects, preferences, recovery copies and
backups stay where they are; nothing is migrated or erased (see `migrations/formatting-1.15.4.md`: the new defaults
apply to new documents only, and existing documents keep their format).

> **Status of this build.** It was assembled on Linux with the same route as 1.15.3. It is **ad-hoc signed**, **not
> Developer ID signed** and **not notarized**. All 18 release suites and the real-Electron checks passed for the exact
> payload inside the image (FORMATTING-REPORT-1.15.4.md section E). On an Apple Silicon Mac with macOS 27.0.1 the image
> was verified, mounted read-only and signature-checked with Apple's `codesign`, and a separate test copy was launched
> (`verification/evidence-1.15.4/macos/`); the interactive steps and `Install-DraftCraft.command` were **not** run there. Test from `/tmp`
> (`verification/macos/2b-launch-isolated-tmp.command`) rather than from Downloads, so macOS does not ask a test copy for
> folder access (the answer would be stored for the app identifier and shared with an installed DraftCraft Pro).

## Install from the DMG

1. Quit DraftCraft Pro if it is running.
2. Open `DraftCraft-Pro-1.15.4-arm64.dmg` in Finder.
3. Double-click **Install-DraftCraft.command** on the mounted disk. Terminal opens.
   The installer checks every file of the app against `Support/Package-SHA256.txt` (and the file list and
   symlink manifests, whose own hashes are embedded in the installer), copies the app to `/Applications` (or
   `~/Applications` if `/Applications` is not writable), re-signs that copy locally with `codesign`, verifies it,
   removes the quarantine attribute from the installed copy only, keeps the previous app in a timestamped
   backup folder and opens the new copy. It makes no network requests and needs no administrator password.
4. If macOS blocks the installer: open it once, then **System Settings ▸ Privacy & Security ▸ Open Anyway**, or
   run `/bin/bash /Volumes/DraftCraft\ Pro/Install-DraftCraft.command` in Terminal.

Verify the download first (values in `SHA256SUMS.txt` of this delivery):

```sh
shasum -a 256 DraftCraft-Pro-1.15.4-arm64.dmg
```

To go back to the previous version, quit the app and move the timestamped backup copy back to Applications. Projects
saved by 1.15.4 still open in 1.15.3 (the file format is unchanged; all 1.15.4 formats pass 1.15.3's format validation).

## Build on macOS (normal route)

Requirements: Node.js 24, Xcode Command Line Tools (macOS SDK for the Swift dictation helper).

```sh
npm ci
npm --prefix desktop ci
npm run lint                       # tsc --noEmit
node desktop/build.cjs             # stages desktop-build/app (renderer, main process, fonts, api.cjs)
node desktop/package.mjs darwin arm64
bash desktop/build-dmg-macos.sh    # full personal DMG workflow (build, verify, hdiutil image)
```

Then verify on the Mac: `codesign --verify --deep --strict "DraftCraft Pro.app"`, `spctl --assess -vv` (expected to
reject an ad-hoc build), launch, and run the native checklist below. This route uses the exact lockfile versions
(including React 19.3.0). It was **not executed** for 1.15.3 or 1.15.4: the build host had no npm registry access, and the linked Mac was used
only to test a separate copy of the built app (nothing was installed or built on it).

## How 1.15.4 was actually built (Linux, no npm registry)

The build host had no access to the npm registry, so `build-offline/` replaces the build tools without changing
application source (details and fidelity evidence in `build-offline/README.md`, dependency provenance in
`build-offline/deps-provenance.txt`):

```sh
node build-offline/setup-vendor.mjs          # pinned GitHub sources -> vendor/node_modules
node build-offline/gen-lucide-react.mjs
node build-offline/stage-desktop.mjs --out=<stage>/app --previous=<1.15.2 extracted app.asar> \
     --serverSha=77724911e9e722441c708eb004a483acff5581a795bb0a98c2ad1a70d2bc843a \
     --vendor=<vendor/node_modules> --deps=<deps-src>
node build-offline/asar-pack.mjs <stage>/app <out>/app.asar      # prints the ASAR header SHA-256
python3 verification/build-release-dmg.py <config.json>          # assemble, ad-hoc sign, image, round-trip
```

`build-release-dmg.py` reuses the verified 1.15.2 ARM64 Electron runtime unchanged (nested signatures retained),
replaces `Contents/Resources/app.asar`, sets `CFBundleShortVersionString`/`CFBundleVersion` to 1.15.4 and the
`ElectronAsarIntegrity` header hash, re-signs only the outer bundle ad hoc with `rcodesign 0.29.0`
(`--exclude '**'`), checks that `CodeResources` seals the new app.asar, regenerates the installer manifests with
`desktop/create-installer.mjs`, writes an HFSX volume with the patched `libdmg-hfsplus` `hfsplus` tool (starting
from an emptied copy of the 1.15.2 volume, because `mkfs.hfsplus` is unavailable, and zeroing every block the
allocation bitmap marks free so no stale bytes remain), builds a zlib UDIF image with `dmg`, then extracts the image twice (7-Zip and `hfsplus extractall`) and requires both
trees to be byte-identical to the staged volume. It also runs the project's verifiers (`verify-macos-package.py`,
`verify-dmg-asar.mjs` with the read shims in `build-offline/shims`, `verify-dmg.py`) and refuses to package unless
all 18 release suites passed for the exact payload. The receipt (`dmg-receipt.json`) and proofs are delivered next to
the image and in the evidence archive (`dmg/`).

Known substitutions in this route (a macOS `npm ci` build does not have them):

* React / React DOM **19.2.8** and scheduler 0.27.0 instead of the locked 19.3.0 / 0.28.0.
* esbuild 0.28.2 + Tailwind 4.3.3 `compile()` instead of Vite 8; chunk names differ.
* `api.cjs` (the bundled `server.ts` routes) and the offline font files are reused from the 1.15.2 payload; the
  build refuses to proceed unless `server.ts` is byte-identical to 1.15.2's.

## Reproduce the tests

```sh
# models / backend (node:test via tsx)
node --import tsx --test verification/*.test.ts verification/*.test.cjs verification/collaboration.test.mjs

# 17 renderer suites (incl. template-formatting) against a staged payload (Playwright + Chromium)
BROWSER_EXE=/path/to/chromium DRAFTCRAFT_DIST=<stage>/app/dist DRAFTCRAFT_MULTIPROCESS=1 \
  python3 verification/run-release-tests.py

# real Electron (Linux: under Xvfb; on macOS run without xvfb-run)
xvfb-run -a node verification/electron/lifecycle-scenarios.cjs <app dir or app.asar>
xvfb-run -a node verification/electron/pdf-parity.cjs <app dir or app.asar>
xvfb-run -a node --import tsx verification/electron/pdf-geometry.cjs <app dir or app.asar> [template names…]

# editor geometry of every template, template matrix, before/after samples, compatibility with 1.15.3 files
DRAFTCRAFT_DIST=<stage>/app/dist BROWSER_EXE=… node --import tsx verification/format-geometry-probe.cjs
node --import tsx verification/template-matrix.ts <geometry.json> <pdf-geometry-results.json> TEMPLATE-MATRIX-1.15.4.md
BUILDS="old=<dist>,new=<dist>" OUT=<dir> BROWSER_EXE=… node --import tsx verification/before-after-browser.cjs
OLD_TREE=<checkout of release-1.15.3> BROWSER_EXE=… ESBUILD=<esbuild> node verification/compat-1154.cjs <out.json>

# 250-page typing latency probe
BROWSER_EXE=/path/to/chromium DRAFTCRAFT_DIST=<stage>/app/dist node --import tsx verification/typing-latency-browser.cjs
```

`DRAFTCRAFT_MULTIPROCESS=1` runs Chromium without `--single-process` (the browser crashed with SIGILL in
single-process mode in this container during the formats suite). The Electron harness
(`verification/electron/harness.cjs`) launches the real app with an isolated profile and replaces only the
native dialog functions with scripted answers; windows, IPC, the save coordinator, file writes, crash handling
and `printToPDF` are real.

## Native macOS checklist (see `verification/macos/`; what was done for 1.15.4 is in FORMATTING-REPORT-1.15.4.md section F)

1. `shasum -a 256` the DMG; open it; run the installer; confirm the app opens from Applications.
2. Open a copy of a real 1.15.2/1.15.3 project; type, Cmd+S, close with Cmd+W, reopen; Quit with two modified windows
   (Save / Don't Save / Cancel) and confirm one prompt per window.
3. Export PDF while the preview is open; compare page count and (MORE)/(CONT'D) with the editor.
4. Cross-element editing with the trackpad: Shift+Click, drag, Cmd+A twice, Cmd+C/Cmd+V into TextEdit and back.
5. Japanese/Chinese IME composition inside and at the boundary of an element.
6. Force-quit the renderer (Activity Monitor ▸ DraftCraft Pro Helper (Renderer)) with unsaved text; confirm the
   recovery dialog and the recovery copy on relaunch.
7. Typing latency in a feature-length script on the target Mac.
8. Dictation (needs the Swift helper from the macOS build route), printing to a physical printer, VoiceOver.
9. 1.15.4: New script → type `ext/int. dock - night`, `ANGLE ON SARAH`, a cue, a parenthetical and `fade out` + Return;
   Settings → Editor → Automatic Formatting shows the master switch and nine dependent switches; Export PDF shows only the
   page number at the top of page 2.
