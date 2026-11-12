# DraftCraft Pro 1.15.2 — build and installation

This delivery includes `DraftCraft-Pro-1.15.2-arm64.dmg`, the updated source, tests, migrations and verification evidence. The application remains Electron/React/TypeScript; the separate Rust prototype is preserved. The personal build targets **Apple Silicon and macOS 13 or later**. It is ad-hoc signed, without Developer ID signing or notarization, and has not been launched on a physical Mac.

## Install the supplied DMG

Open the DMG in Finder, quit any running DraftCraft Pro, and double-click `Install-DraftCraft.command` inside the mounted disk. The installer verifies the supplied file hashes and symlinks, copies the app to a writable Applications folder, signs and verifies the installed copy using macOS codesign, preserves the previous app in a timestamped folder, and opens the update. Scripts and preferences retain their existing locations. The installer makes no network request and needs no Node.js or Rust installation.

If macOS blocks the personal installer, follow the instructions in `Getting-Started.txt` inside the disk image. The package hashes establish integrity, not an Apple-verified publisher identity. The supplied installer’s native execution, Gatekeeper behavior and physical Mac launch remain unverified here.

## Build on macOS

Use Node.js 24, Xcode Command Line Tools and the macOS SDK:

```sh
npm ci
npm --prefix desktop ci
npm run lint
node desktop/build.cjs
node desktop/package.mjs darwin arm64
```

For the full personal DMG workflow, run `bash desktop/build-dmg-macos.sh` on a Mac. The script builds, verifies the ad-hoc bundle and creates/verifies the disk image. Only shell syntax was checked here; the macOS steps remain unexecuted.

The packager prints the resulting application path. Use the actual printed path when verifying or creating a DMG with macOS hdiutil. The existing app identity is `com.draftcraft.screenplay.studio`; projects and preferences keep their existing locations. Retain a copy of the prior app and original project before replacing an installed build.

The existing packaging workflow signs ad hoc. Developer ID signing and notarization are not configured; no Apple credentials are supplied. On the Mac, verify the actual output with `codesign --verify --deep --strict`, inspect Gatekeeper results, launch it, open/save/close a copy of a real project, test native printing, dictation/IME and multiple windows. A completed public distribution needs the owner’s Apple signing/notarization setup.

The macOS build compiles the existing Swift Speech/AVFoundation dictation helper. It requires a supported installed on-device language, microphone/Speech permissions and physical microphone testing. Linux leaves the helper unavailable and reports the missing dependency; no cloud recognition fallback is silently enabled.

The first source-only delivery’s packaging guard refusal is retained in `verification/historical-1.15.1/completion-macos-build.log` as historical evidence. The follow-up DMG build recovered the previous ARM64 Electron runtime, verified it against its package manifest and native signature hashes, replaced the application ASAR, updated its integrity digest/version, and signed the changed outer bundle with the pinned rcodesign tool. The unchanged nested runtime signatures are retained. Independent Linux checks validate all native code-page/resource hashes and compare native sections with the previous runtime; these are not Apple's codesign or Gatekeeper assessment.

For that recovery route, use the versions/checksums in `verification/packaging-tools.json`, apply `verification/libdmg-permissions.patch`, and build the HFS/UDIF tools described in `verification/PACKAGING-TOOLS.md`. Stage the application with `desktop/build.cjs`, set `RCODESIGN` to the verified tool, and run `desktop/repackage.mjs` with distinct input/output `.app` paths. `verification/verify-dmg-asar.mjs` compares every packaged file and backend source with staging. `verification/build-production-dmg.py` requires the final tests plus current native/ASAR proofs before creating the image, and verifies HFS catalog permissions, all extracted bytes/links and UDIF checksums. macOS SDK compilation and native runtime checks remain separate steps.

## Reproduce checks

The application dependencies are pinned in the existing lockfiles. The esbuild/Vite peer conflict is corrected, so ordinary `npm ci` works without `--legacy-peer-deps`.

Models/backend:

```sh
node --import tsx --test verification/*.test.ts verification/advanced-suggestions.test.cjs verification/shortcut-recording.test.cjs verification/native-history.test.cjs verification/project-files.test.cjs verification/table-read-backend.test.cjs verification/document-windows.test.cjs verification/collaboration.test.mjs
```

For browser tests, provide Playwright 1.62.1 (locally or through NODE_PATH) and a Chromium executable. This run used Chromium 153.0.8010.0 on Linux. If needed, install test-only Playwright in a separate tools directory and install its browser there. Then build/stage the application and run:

```sh
BROWSER_EXE=/absolute/path/to/chromium python3 verification/run-release-tests.py
```

The runner accepts BROWSER_EXE or DRAFTCRAFT_CHROMIUM consistently and records the digest of the actual staged application payload. Current results are in `verification/story-results/final-tests.json`; each suite has a separate log. Test-native dialogs/providers are explicitly substituted. Actual PDF rendering, text extraction, file writes and two-client synchronization run independently of those substitutions. Flite through FFmpeg tests the existing audio pipeline; it is not a human-voice quality evaluation.

## Services and compatibility

`collaboration/README.md` and its Dockerfile provide the real service/configuration. Public hosting, TLS and credentials must be supplied by the operator. Production review/tag/locking metadata and private voice/API state remain local. Local writing remains available without a session.

Read `PRODUCTION-FEATURE-MATRIX.md` for partial and missing workflows. External fixtures retain their provenance/license. No Final Draft desktop application is available here, so supported codec tests do not establish complete Final Draft interoperability. OCR is not included. Existing optional speech providers/models/credits are not bundled.

## 1.15.2 repair evidence

Read REPAIR-FEATURE-MATRIX.md, REPAIR-DEFECT-LEDGER.md and migrations/layout-spacing-v2.md. The full runner now has 16 suites, including the repair-specific built-renderer/PDF suite. Native dialog choices are injected in Linux tests; the native file coordinator, actual file writes, PDF bytes and local collaboration service are exercised. The final image checksum receipt is external because it is produced after the image. Old 1.15.1 proofs are explicitly historical.

For Linux reproduction, retain the exact saved prior ARM64 runtime and its installer manifests, verify its hashes, then use the pinned tools. Known unsealed host-copy temporaries must be absent from the actual HFS catalog, baseline manifest and CodeResources before removing them; never delete sealed resources to make verification pass. The current cleanup receipt retains the two discovered host temporaries and subsequent full checks.
