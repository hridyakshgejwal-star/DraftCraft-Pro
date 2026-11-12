# Desktop build

The shipped `.app` includes the runtime and starts directly on Apple Silicon macOS. Users do not need to run these commands.

For development, install the root dependencies with `npm install --legacy-peer-deps`, then run `npm install` in `desktop/`. From the project root, run `node desktop/build.cjs` and `node desktop/package.mjs`. The app is written into the adjacent `desktop-build/packages/` directory. Electron 44.7.0 and Packager 20.3.0 are pinned. After finishing all bundle changes and signing, run `node desktop/create-installer.mjs` from the project root (or pass a folder containing the app) to generate the one-time installer and fresh manifests beside the app. Regenerate these manifests after every app change. A locally rebuilt app can be opened directly without using the downloadable-build installer.

The build stages the existing React editor and its service routes. A standard, secure custom protocol gives the editor a stable storage origin; an authenticated loopback service hosts the existing optional AI routes. The renderer is sandboxed, with Node integration disabled and context isolation enabled. Native menus, window controls, import, and save dialogs use narrow preload APIs. The optional Gemini key is encrypted using `safeStorage`; no credentials are bundled. The service model identifiers remain those in the supplied project and have not been validated against a provider account.

Fonts are bundled for offline use, with their licenses. The original Rust executable is a console prototype, so it is not used as the GUI runtime. The desktop runtime badge identifies the wrapper accurately. Title-page Apply now uses the correct save callback. The disconnected Google Drive component's PDF import and partial-document merges were corrected so the source passes TypeScript checking; the cloud component remains disconnected.

Personal macOS builds are signed as complete bundles with ad-hoc signatures. On a Mac, package.mjs runs sign-macos.sh, which signs leaf Mach-O files and nested bundles inside out, then verifies the app with Apple's codesign tool. On another platform, set RCODESIGN to a verified apple-codesign 0.29.0 executable to sign recursively. Packaging fails rather than silently shipping a macOS app with only linker signatures. Run signing after all changes to Info.plist, ASAR, icons, and resources.

The downloadable personal build includes Install-DraftCraft.command. It checks package hashes, installs a copy, rebuilds signatures with macOS's native tools, verifies the app, and clears only that installed copy's download quarantine attribute. It preserves any existing app in a backup folder and does not alter the screenplay profile. The installer and Mac launch have not been exercised on physical Mac hardware here.

Ad-hoc signatures check integrity but do not establish a Developer ID identity or satisfy Apple notarization. A release intended for general distribution needs your own Apple Developer ID and notarization configuration, plus launch testing on the target Mac. This package makes no claim to be Apple-approved.

## Smart saving (1.9.0)

`save-coordinator.cjs` owns the active document session, content revision, primary-file fingerprint, serialized saves, close approval and per-session recovery snapshots. Renderer revisions exclude timestamp-only changes. Save As invalidates queued older autosaves. Primary writes use a synced sibling temporary file and rename without creating missing destination folders. Existing files are checked before the write and again before rename. Settings and recovery use the trusted app data folder. The renderer must acknowledge a revision-bound close token after clearing any explicitly discarded local profile; the main process verifies the final snapshot before closing. All IPC is restricted to the editor main frame.

`verification/project-files.test.cjs` tests actual filesystem operations and failure cases. `verification/smart-save-browser.cjs` connects the production renderer to the actual coordinator over a local test bridge, with injected dialog choices. Native panels, Dock quit, physical drive disconnection and macOS launch require validation on a Mac; headless Linux checks are not those tests. The application has one screenplay window; the existing AI settings and print windows remain auxiliary windows.

## Caret animation (1.10.0)

`EditorCaret.tsx` retains native textarea editing and uses one invisible mirror for the active paragraph. Batched input/selection/layout invalidations measure the actual font, wrapping, alignment and zoom. Paint frames sample one interruptible time-based trajectory (`editor/caretMotion.ts`) and update only the portal transform, without layout reads or React state changes on those frames. Large/wrap/page/scroll/zoom jumps snap. Blinking is a separate compositor opacity animation, starts after 650 ms of inactivity and restarts visibly on input or focus. Reduced motion, forced colors, composition and bidirectional text use the native caret. Event listeners, observers, animations, frame requests and timers are disposed on settings changes and unmount.

Controls reuse Editor Settings and the existing preference key. New profiles enable smooth movement; explicit previous choices remain. Existing custom speed values are preserved and malformed values are bounded. Motion curve tests compare 60 Hz and 120 Hz timestamp sampling, interruption, reversal, finite completion and no overshoot. Browser tests exercise intermediate frames, alignment, wrapping, Unicode, composition events, focus, existing writing actions and long-screenplay autosave. Physical Mac/IME/screen reader and actual 120 Hz display tests remain separate manual checks.

## Writing formats (1.11.0)

The existing Electron/React editor now reads embedded `writingFormat` and `smartType`
project fields. `src/formats` contains the catalog, style model, deterministic parser,
custom-template storage and print interchange. This extends the existing editor;
the retained Rust workspace remains a separate prototype.

Run `npm run lint`, `node desktop/build.cjs`, and the release verifier described in
`verification/run-release-tests.py`. The new `formats-browser.cjs` covers the primary
format workflows and renders an A4 print PDF for page-count/text-retention checks.
See Getting-Started.txt and the release report for supported subsets and limitations.

## 1.12.0 automatic punctuation

The existing editor integrates `src/writing/punctuation.ts` into the shared
Return transaction; `punctuationPreferences.ts` provides persistent defaults in
the existing writing-assistance settings. The new settings dialog is available
through the native and renderer Writing menus. Per-paragraph punctuation omissions
retain deliberate removals without changing the native project version.

Unchanged rows remain cached when insertion shifts their indices; keyboard
handlers resolve the latest index by paragraph identity. Test this with the
full release runner, which now includes `punctuation-browser.cjs`.

`repackage.mjs` verifies large runtime copies before signing. On Linux,
`DRAFTCRAFT_REUSE_NATIVE_SIGNATURES=1` selects shallow outer-bundle signing only
when reusing an independently verified, unchanged native runtime. The delivered
release validates every nested signature and native section against its baseline.
Normal macOS builds retain native inside-out signing. Never distribute a bundle
that fails ASAR, native signature/resource, installer or disk-image verification.

After all ten suites pass, run `verification/assemble-punctuation.py` and
`verification/build-punctuation-dmg.py` for this personal Linux packaging route.
The installed app requires no development tools or paid service for punctuation.

Recovered release verification: the rebuilt application payload SHA-256 is
961b62d41f26e45da66c73babed9c6bd83a701202de163beab3de8c1f9950e88.
Nine completed suites are retained from observed execution outputs because
workspace maintenance removed their full raw scratch logs. Recovered log files
are clearly labeled summaries. The final save suite and native/archive/image
checks run after recovery. A subset run reuses results only with the same payload
digest. The performance allowances used in the earlier session were:
DRAFTCRAFT_STORY_TYPING_P95_MS=638 DRAFTCRAFT_SHORTCUT_P95_MS=694
DRAFTCRAFT_WORD_CACHED_MS=1280 DRAFTCRAFT_SPELLING_P95_MS=553
DRAFTCRAFT_SAVE_FILL_P95_MS=1348. These are Linux automation allowances based on
previous-release comparisons, not physical Mac latency guarantees. Save tests
wait for bridge requests and expected file content; import tests wait for a
changed document identity instead of assuming fixed short delays.
