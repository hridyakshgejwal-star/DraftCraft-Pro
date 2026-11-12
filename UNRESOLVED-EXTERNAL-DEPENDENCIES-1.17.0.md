# DraftCraft Pro 1.17.0 — unresolved external dependencies

Updated for 1.17.0. Row 1 covers the macOS-only checks, now run by a native self-test after the image is built. Row 3
is resolved for the dictation helper (compiled on the owner's Mac). Rows 7, 8 and 2 are planned in
`PLAN-1.17.0-ITEMS-18-22.md`, with a new row 12 for Windows.

Items that could not be completed or fully verified in this delivery. Each names what is needed and what is
affected. Only the parts stated as done in the "Current state" column are claimed anywhere else.

| # | Dependency | What it blocks | What is needed | Current state |
|---|---|---|---|---|
| 1 | **Native macOS checks for 1.17.0** | Verifying the window chrome, tabs, full screen, menu check marks, the macOS spellchecker, voices, the Speech helper, VoiceOver labels and latency on Apple Silicon | A Mac where a test copy may run from `/tmp` | The image check and `7-self-test.command` run on the Mac after the image is built; the record is `MAC-CHECK-1.17.0.md` next to the image. Still manual: a VoiceOver session, dictating speech, premium voice quality, trackpad panning, `Install-DraftCraft.command` on a fresh account. |
| 2 | **Apple Developer ID certificate and notarization credentials** | A release that opens without Gatekeeper warnings; distribution to other people | The owner's Developer ID Application certificate and a `notarytool` keychain profile | The delivered image is still **ad-hoc signed** and **not notarized**. `Developer-ID/Sign-and-Notarize.command` (since 1.16.1; it also signs the 1.17.0 Speech helper) does the whole job on the owner's Mac: it checks the manifest, signs with the hardened runtime and timestamps, notarizes, staples, checks with Gatekeeper and builds the disk image. Its flow is tested with stand-in tools only, so the first real run is on the owner's Mac. |
| 3 | **macOS SDK / Xcode toolchain** | Rebuilding the Swift dictation helper, and a normal `npm ci` + `desktop/package.mjs` build | Xcode Command Line Tools on a Mac | **Resolved for 1.17.0:** the helper was compiled on the owner's Mac (`desktop/native/bin/`, `build-on-mac.log`) and is bundled in `Contents/Resources`. Dictating still needs an installed on-device language, permission and a microphone. |
| 4 | **npm registry access** | Building with the exact lockfile (React 19.3.0, Vite 8, @electron/asar, @fontsource) | A build machine with registry access (any Mac with `npm ci`) | 1.15.3 was built with the offline route in `build-offline/` using React 19.2.8 / scheduler 0.27.0 and esbuild + Tailwind compile. 1.16.0 and 1.16.1 use the same offline route; 1.17.0 uses the same route; all 20 suites ran against the exact 1.17.0 payload. A registry build should be re-tested before distribution. |
| 5 | `server.ts` bundle (`api.cjs`) dependencies (`@google/genai`, `express`) | Rebuilding the local API bundle | Registry access | `server.ts` is byte-identical to 1.15.2, so the 1.15.2 `api.cjs` was reused (the build refuses otherwise). |
| 6 | **AI provider accounts** (Gemini or configured provider) | Verifying AI research, image analysis and suggestions end to end | A user API key and network access | Request guards and key storage tested only; no request made. |
| 7 | **Collaboration hosting** (public host, TLS certificate, credentials) | Live collaboration outside a local test | Operator-supplied hosting per `collaboration/README.md` | Local real-client convergence tested; public deployment not available. See plan item 20. |
| 8 | **Cloud sync with conflict handling; iPad companion** | Merging edits from two computers; an iPad app | Test accounts (iCloud, Dropbox); Apple Developer Program, Xcode, an iPad | Saving into a synced folder works as plain files; conflicts are not merged. See plan item 19. |
| 9 | **Final Draft desktop application** | Interchange round trips and page-break comparison against Final Draft | A licensed Final Draft installation | Only independent fixtures used. Pagination parity is verified editor ↔ DraftCraft PDF, not against Final Draft. |
| 10 | **OCR engine** | Importing image-only PDFs | An OCR component | Not included (unchanged). |
| 11 | **Premium / provider speech voices** | Table Read quality with provider voices | Provider accounts | Local/substitute speech tested only. |
| 12 | **Windows build host and certificate** | A Windows version | A Windows x64 machine, the Electron win32-x64 runtime, an Authenticode certificate | Not built. See plan item 18. |
| 13 | **A notes service** | An equivalent of Final Draft's Get Notes | A service to send scripts to | Not built, by design. See plan item 21. |
