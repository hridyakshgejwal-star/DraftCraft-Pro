# DraftCraft Pro 1.16.0 — unresolved external dependencies

Updated for 1.16.0. Rows 2–11 are unchanged from 1.15.3/1.15.4; row 1 now covers the 1.16 macOS-only features.

Items that could not be completed or fully verified in this delivery. Each names what is needed and what is
affected. Only the parts stated as done in the "Current state" column are claimed anywhere else.

| # | Dependency | What it blocks | What is needed | Current state |
|---|---|---|---|---|
| 1 | **Native macOS checks for 1.16.0** | Verifying traffic lights and the hidden-inset title bar, document tabs (New Tab, Merge All Windows), full screen, native menu check marks, running `Install-DraftCraft.command`, IME, VoiceOver, trackpad timeline panning, typing latency on Apple Silicon | A Mac where installing 1.16.0 (or a separate test copy) is acceptable, and the checklist in `Build-and-Install-1.16.0.md` | NOT TESTED for 1.16.0. The 1.15.3/1.15.4 macOS checks (image verification, `codesign`, launch of a test copy) are recorded under `Verification/evidence-1.15.x/macos/`. All 1.16 behaviour that does not depend on macOS was verified in Chromium and real Electron on Linux. |
| 2 | **Apple Developer ID certificate and notarization credentials** | A release that opens without Gatekeeper warnings; distribution to other people | Developer ID Application certificate, `notarytool` credentials, then `codesign --options runtime --timestamp` and `xcrun notarytool submit … --wait` + `stapler staple` | Not available. The app is **ad-hoc signed** (outer bundle re-signed with rcodesign 0.29.0; nested Electron signatures from 1.15.2 kept). **Not notarized.** |
| 3 | **macOS SDK / Xcode toolchain** | The Swift on-device dictation helper (`desktop/native`) and a normal `npm ci` + `desktop/package.mjs` build with the locked dependency versions | Build on a Mac with Xcode Command Line Tools | The 1.15.3 payload reuses the 1.15.2 runtime; the dictation helper status is unchanged from 1.15.2 (unavailable without the helper). Dictation itself also needs an installed on-device language, permissions and a microphone. |
| 4 | **npm registry access** | Building with the exact lockfile (React 19.3.0, Vite 8, @electron/asar, @fontsource) | A build machine with registry access (any Mac with `npm ci`) | 1.15.3 was built with the offline route in `build-offline/` using React 19.2.8 / scheduler 0.27.0 and esbuild + Tailwind compile. 1.16.0 uses the same offline route; all 20 suites ran against the exact 1.16.0 payload. A registry build should be re-tested before distribution. |
| 5 | `server.ts` bundle (`api.cjs`) dependencies (`@google/genai`, `express`) | Rebuilding the local API bundle | Registry access | `server.ts` is byte-identical to 1.15.2, so the 1.15.2 `api.cjs` was reused (the build refuses otherwise). |
| 6 | **AI provider accounts** (Gemini or configured provider) | Verifying AI research, image analysis and suggestions end to end | A user API key and network access | Request guards and key storage tested only; no request made. |
| 7 | **Collaboration hosting** (public host, TLS certificate, credentials) | Live collaboration outside a local test | Operator-supplied hosting per `collaboration/README.md` | Local real-client convergence tested; public deployment not available. |
| 8 | **Cloud / Drive synchronization service** | Any cloud sync claim | A real integration and service | Missing (unchanged). |
| 9 | **Final Draft desktop application** | Interchange round trips and page-break comparison against Final Draft | A licensed Final Draft installation | Only independent fixtures used. Pagination parity is verified editor ↔ DraftCraft PDF, not against Final Draft. |
| 10 | **OCR engine** | Importing image-only PDFs | An OCR component | Not included (unchanged). |
| 11 | **Premium / provider speech voices** | Table Read quality with provider voices | Provider accounts | Local/substitute speech tested only. |
