# Native macOS checks — DraftCraft Pro 1.16.0

**Machine.** Mac mini, Apple Silicon (arm64), macOS 27.0.1 (26A434). The check ran on 25 Oct 2026 at 22:39 IST.

**How the image got there.** The disk image was copied to the Mac in 13 pieces. The pieces were checked against their
SHA-256 values, joined, and the joined image was checked again. The pieces were then deleted.

**What was run.** `1-verify-image.command` ran from Finder in `~/Downloads/DraftCraft-1.16.0-mac-test`, with
`expected.txt` taken from the build receipt. The installed `/Applications/DraftCraft Pro.app` (1.15.4) and the normal
profile were only listed, not opened or changed. In the log, the account and host names are replaced by `<user>` and
`<host>`.

| Check | Result |
|---|---|
| Image SHA-256 | `0cfc38e1…c7bd`, which MATCHES the build receipt |
| `hdiutil verify` | VALID: every partition's CRC32 verified |
| Read-only mount | Mounted. The volume is "DraftCraft Pro", case-sensitive HFS+, with the 1.16.0 documents present. |
| Info.plist | `com.draftcraft.screenplay.studio`, 1.16.0 / 1.16.0, ASAR integrity `c85960be…f5fe` (the tested payload), macOS 13.0 minimum |
| Architecture | arm64 |
| `codesign --verify --deep --strict` | Valid; satisfies its Designated Requirement. Every nested helper and framework exits 0. The outer bundle is ad hoc. |
| Gatekeeper `spctl --assess` | Rejected, as expected for an ad-hoc build that is not notarized |
| Installer manifest and pins | 271 entries, 0 not OK; Package-SHA256, File-Paths, Bundle-Links and Sign-macOS are pinned |
| `app.asar` SHA-256 | `70e12c4e…f512`, which MATCHES the receipt (the exact payload that passed the release suites) |

**Not done in this round.** The next step was to launch an isolated test copy (`2b-launch-isolated-tmp.command`). It
could not be started, because the Finder window was on another Space while the user was working in a full-screen app,
and the window cannot be moved into a full-screen Space. So the 1.16.0 window was not launched on the Mac.

The following are therefore still **not tested** natively:

* traffic lights and the title row
* document tabs and full screen
* menu check marks
* the timeline, using a trackpad

The installer (`Install-DraftCraft.command`) was not run: it replaces the installed app, which needs the owner's
go-ahead.
