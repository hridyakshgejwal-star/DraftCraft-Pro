# DraftCraft Pro 1.15.0 — build and installation

The active application is Electron 44.7, React 19 and TypeScript. The retained Rust crates/workspace are preserved prototypes; building them does not build this editor.

## Install the supplied personal Mac build

The supplied DMG targets Apple Silicon ARM64 and macOS 13 or later. Quit DraftCraft, mount the image, then run `Install-DraftCraft.command` beside the app. The existing installer checks the file manifest and symlinks, stages the app, signs and verifies the installed copy using macOS tools, and preserves a previous installed app in a timestamped folder. Projects and preferences are kept in the existing profile. Direct drag-copy remains possible but the app is not Developer ID signed or notarized; normal Gatekeeper approval may be required.

This environment verified package bytes, signatures/resource seals and the disk-image structure on Linux. Mounting, launching, microphone permissions, native printing, international IME and accessibility on a physical Mac have not been verified here. Read the feature matrix for supported and partial behavior.

## Reproduce from source on macOS

Install Node.js 24 and Xcode Command Line Tools with the macOS SDK. In this source directory run:

```sh
npm ci
npm --prefix desktop ci
npm run lint
node desktop/build.cjs
node desktop/package.mjs darwin arm64
```

On macOS, the build compiles `desktop/native/Dictation.swift` using `xcrun swiftc`, AVFoundation and Speech. That helper requires microphone and Speech Recognition permissions and a supported installed on-device language. On Linux the helper remains unavailable and the app reports that dependency. No microphone recording is started until the writer presses Start. The supplied Linux-built DMG has no compiled dictation helper. Intel source packaging can be requested with `darwin x64` on a compatible Mac; the delivered runtime is ARM64 only, and Intel is not verified here.

The package workflow signs ad hoc using `desktop/sign-macos.sh`; it does not perform Developer ID signing or notarization. A distributable public release requires the owner's Apple signing identity, provisioning/entitlements where needed, `codesign --verify`, Gatekeeper assessment and notarization on macOS.

`desktop/repackage.mjs` is the existing alternative for retaining an independently verified supplied Electron runtime. On Linux it requires an explicit verified `RCODESIGN` executable. `verification/verify-macos-package.py` checks code/resource hashes independently; it is not Apple's Gatekeeper. `verification/build-production-dmg.py` requires mode-preserving Mozilla libdmg-hfsplus tools and hfsprogs; see the environment overrides in that script. No downloaded build tools are bundled into the source ZIP.

## Verify

Model/backend checks use the existing Node test workflow, plus production model tests, document-window isolation and the authenticated collaboration test. Browser checks use Playwright and a supplied Chromium executable:

```sh
BROWSER_EXE=/absolute/path/to/chromium python3 verification/run-release-tests.py
```

If Playwright is installed in a separate runtime, set NODE_PATH accordingly. The runner uses the staged `../desktop-build/app/dist` by default; DRAFTCRAFT_DIST can target the renderer extracted from the final app ASAR. It records the digest of the entire tested application payload. Timing includes Linux browser automation overhead and does not establish physical Mac performance.

The external interchange fixtures are a pinned, MIT-licensed subset of Screenplain. They are not fixtures produced by DraftCraft itself. No Final Draft desktop application is installed in this environment, so actual Final Draft opening/round trips remain unverified.

## Collaboration and audio dependencies

`collaboration/README.md` provides the authenticated Yjs/WebSocket service, Docker configuration, protocol and supported-data scope. It requires a private creation key and operator-managed hosting/TLS for remote use. Local two-client tests run the actual service without a public account. Credentials are never hardcoded. Screenplay and planning data are sent only after explicit consent and connection; unapproved participants receive no document data. Production review/locking/tag data and voice/API settings remain local.

Existing Table Read retains macOS voices, an optional loopback neural endpoint and the configured cloud adapter. Models, API credentials, paid credits and rights to voices are not supplied. Cloud use still requires exact in-app text consent. See `Table-Read.md` for engine, language, export and listening-test limitations.
