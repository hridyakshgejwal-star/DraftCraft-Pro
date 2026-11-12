# DraftCraft Pro 1.17.0 — plan for items 18–22

These five items need a platform, a service or an account that this build environment does not have. Nothing below
was built or claimed as working in 1.17.0. Each section states what exists today, what is needed, the work, and how it
would be verified.

| # | Item | Status in 1.17.0 | Blocked by |
|---|---|---|---|
| 18 | Windows version | **Blocked** | A Windows x64 machine, the Windows Electron runtime, an Authenticode certificate |
| 19 | iPad companion and cloud sync | **Missing** (sync), **Blocked** (iPad) | iCloud/Dropbox accounts to test with; Apple Developer Program, Xcode and an iPad for the app |
| 20 | Hosted real-time collaboration | **Blocked** | A server with a domain and TLS certificate, and an account system |
| 21 | Get Notes | **Not built (by design)** | Final Draft's service has no public API; no equivalent service exists to send scripts to |
| 22 | Developer ID notarization | **Ready to run; not run** | The owner's Apple Developer account, certificate and notary profile |

## 18. Windows version

**Today.** The app is built only for Apple Silicon Macs (`desktop/package.mjs`, `platform: 'darwin'`, `arch: 'arm64'`).
Most of the code is platform-neutral (React renderer, Electron main process, file saving, PDF). The macOS-only parts are:

| Part | macOS today (file) | Windows replacement |
|---|---|---|
| Window chrome and tabs | `titleBarStyle: 'hiddenInset'`, `tabbingIdentifier`, Window › Merge All Windows (`desktop/main.cjs`) | Standard frame; one window per document (no native tabs) |
| Menus | macOS app menu, Services, Hide (`buildMenu`) | Window menu bar; Settings under Edit or Tools |
| Dictation | Swift helper with Apple Speech (`desktop/native/Dictation.swift`) | `Windows.Media.SpeechRecognition` helper, or hide Dictation |
| Table Read voices | `/usr/bin/say -v ?` (`desktop/table-read.cjs`) | SAPI / OneCore voices through a small helper, or browser `speechSynthesis` |
| Spelling languages | System spellchecker; `setSpellCheckerLanguages` is ignored on macOS | Hunspell dictionaries with `setSpellCheckerLanguages` (already implemented for non-Mac platforms in `desktop/main.cjs`, `desktop:spelling-language`) |
| Installer and signing | DMG, `Install-DraftCraft.command`, ad-hoc or Developer ID signature | NSIS or MSIX installer, Authenticode signature, `.draftcraft`/`.fdx`/`.fountain` file associations |
| Secure storage | Keychain through `safeStorage` | DPAPI through `safeStorage` (no code change) |

**Needed.** (1) The Electron 44.7.0 `win32-x64` runtime. This environment cannot download it (the registry and GitHub
are blocked here). (2) A Windows 10/11 x64 machine to build the installer and test. (3) An Authenticode code-signing
certificate (OV or EV); without it SmartScreen warns on every install.

**Work.** Platform switches in `main.cjs` for the rows above; `package.mjs` win32 target plus an installer
configuration; replacing or hiding the two macOS helpers; running the 20 renderer suites unchanged (they are
platform-neutral) and the Electron lifecycle, save and PDF-parity scripts on Windows; a Windows smoke checklist
(install, open from Explorer, save, print, high-DPI, keyboard shortcuts with Ctrl).

**Verified when.** The signed installer installs on a clean Windows 11 machine, the Electron scripts pass there, and
PDF parity holds with Windows fonts.

## 19. iPad companion and cloud sync

**Today.** Projects are single `.draftcraft` files saved with atomic writes. A file changed on disk by something else
while open is not merged; the save coordinator protects the newer primary file and recovery snapshots
(`desktop/save-coordinator.cjs`), and a project moved while the app is closed is found again (1.17, item 15).

**Cloud sync (desktop).** Saving into an iCloud Drive or Dropbox folder already works as plain files. What is missing
is conflict handling when two computers edit the same project:

1. Record the file's identity and content hash at every load and save (the identity part exists in
   `desktop/project-files.cjs`).
2. Before each save, compare with the file on disk. If another device changed it, do not overwrite: save this
   version as "*name* (conflict, *computer*, *date*).draftcraft" and tell the writer.
3. Offer Compare Screenplays (exists, File › Compare Screenplays…) between the two, and a merge of non-overlapping
   scene edits.
4. Treat iCloud "evicted" placeholders (not downloaded) as unavailable until downloaded.

Needed: two Macs signed in to the same iCloud account (and a Dropbox account) to test real sync delays and conflict
files. Without them only simulated conflicts can be tested.

**iPad companion.** A separate app. Options: a SwiftUI app that reads and writes `.draftcraft` (JSON) through the Files
app, or a progressive web app. Either needs the Apple Developer Program, Xcode on a Mac, an iPad to test on, and App
Store review for distribution. The editor's pagination engine (TypeScript) would have to run in a web view to keep page
breaks identical. This is a project of its own, not a feature of the desktop app.

## 20. Hosted real-time collaboration

**Today.** Collaboration uses DraftCraft's own relay on the local network (Tools › Live Collaboration…). There is no
server on the internet.

**Needed.** A hosted WebSocket server reachable over `wss://` (a domain and a TLS certificate), an account or invite
system so only invited writers can join, persistent storage of the shared document and its history, and someone to
run it (cost, uptime, security updates, data-protection obligations).

**Work.** Deploy the existing relay protocol behind TLS; add per-session invite tokens and roles (the read-only role
exists in the renderer); rate limiting and size limits; a server URL setting in the app; end-to-end encryption of
script text as an option. Tests: two clients on different networks, reconnect after network loss, conflicting edits,
a revoked invite.

**Verified when.** Two machines on different networks edit the same script through the hosted server, and the
lifecycle tests for disconnect and rejoin pass against it.

## 21. Get Notes

Final Draft's Get Notes sends a script to Final Draft's own service for feedback. That service has no public API, and
no equivalent service exists for DraftCraft to send scripts to. **It is not built**, and nothing in the app pretends to
offer it.

What exists instead: export a PDF or a Final Draft file (File › Export…) to send to readers by any means, and
ScriptNotes and scene comments for notes inside the project. If a notes service is chosen later, the work is an
upload with the writer's consent, a link for readers, and an import of their notes as ScriptNotes.

## 22. Developer ID signing and notarization

**Today.** The disk image is ad-hoc signed. `Developer-ID/Sign-and-Notarize.command` (on the disk image) signs a
verified copy of the app with the hardened runtime and `entitlements.plist`, notarizes it with `notarytool`, staples
the ticket and builds a signed disk image. The 1.17.0 Speech helper (`Contents/Resources/DraftCraftDictation`) is a
Mach-O executable, so the script signs it too, with the same entitlements (microphone included).

**Needed.** The owner's Apple Developer Program membership, a *Developer ID Application* certificate in the login
keychain, and a `notarytool` keychain profile. Signing on someone else's behalf, or entering their Apple credentials,
is not something this build can do.

**What was checked.** The script's logic is tested on Linux with stand-in tools (`verification/developer-id-sign.test.cjs`),
and on the Mac its syntax and entitlements file are checked read-only by `1-verify-image.command`. It has never run
against Apple's real `codesign`, `notarytool` and notary service.

**How to run it.** On the Mac, double-click `Developer-ID/Sign-and-Notarize.command` on the mounted disk image (first
with `--check` from Terminal to confirm the tools, certificate and profile without signing anything). The signed,
notarized app and disk image are written to the output folder with a log. If Apple rejects something, the script stops
and saves Apple's report beside the log.
