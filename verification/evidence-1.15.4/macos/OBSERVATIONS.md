# Native macOS checks — DraftCraft Pro 1.15.4

Mac mini, Apple Silicon (arm64), macOS 27.0.1 (26A434), 18 Oct 2026, 21:59–22:02 IST. The disk image was copied to the Mac
in six pieces, joined there and checked against its SHA-256 before use. Everything ran on a **separate test copy**: the
image was mounted read-only inside the test folder, the app was copied to `/tmp/draftcraft-1.15.4-test/app` and launched
with its own profile (`DRAFTCRAFT_TEST_PROFILE`). The installed `/Applications/DraftCraft Pro.app` and the normal profile
were not opened or changed (no DraftCraft process was running before the launch). In the logs the account name and host
name are replaced by `<user>` and `<host>`.

| Check | Script / log | Result |
|---|---|---|
| Image checksum | `1-verify-image.log` | `f19ac7a7…13a3` — MATCH with the build receipt |
| UDIF checksums | `hdiutil verify` | VALID (all partitions CRC32 verified) |
| Read-only mount | `hdiutil attach -readonly` | mounted; volume "DraftCraft Pro", case-sensitive HFS+, 1.15.4 documents present |
| Version and identity | Info.plist | `com.draftcraft.screenplay.studio`, 1.15.4 / 1.15.4, ASAR integrity `bf70aa28…7e28`, macOS 13.0 minimum |
| Architecture | `lipo`/`file` | arm64 |
| Signature | `codesign --verify --deep --strict` | valid on disk, satisfies its Designated Requirement; every nested helper and framework exit 0; outer bundle ad hoc |
| Gatekeeper | `spctl --assess` | rejected — expected for an ad-hoc, non-notarized build |
| Installer pins | `Support/` manifests | Package-SHA256, File-Paths, Bundle-Links and Sign-macOS pinned |
| Payload | `app.asar` SHA-256 | `2158985d…11df` — MATCH (the tested payload) |
| Test copy | `2b-launch-isolated-tmp.log` | copied, `codesign --verify` exit 0 on the copy, app.asar hash identical, launched through LaunchServices; main, GPU, network and renderer processes running; isolated profile created; no errors on stderr |
| First window | `test-copy-launched.jpg` | editor opened with the bundled sample script, Blue Revision draft, page view |

**Not done on the Mac in this round.** The screen locked right after the launch (22:02), and macOS blocks window input while
it is locked, so the interactive steps — new script, the keystroke sequence of FORMATTING-REPORT section D, the Automatic
Formatting settings, PDF export and header check — were not performed natively. They are covered on Linux with the same
Electron runtime and the same `app.asar` (report section E). The installer (`Install-DraftCraft.command`) was not run:
it replaces the installed app and needs the owner's go-ahead.
