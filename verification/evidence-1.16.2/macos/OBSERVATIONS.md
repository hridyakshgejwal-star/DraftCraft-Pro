# Native macOS checks — DraftCraft Pro 1.16.2

**Machine.** Mac mini, Apple Silicon (arm64), macOS 27.0.1 (26A434). The check ran on 26 Oct 2026 at 06:05 IST.

**How the image got there.**
1. The disk image was copied to `~/Downloads` in 14 pieces.
2. Each piece was checked against its SHA-256, the pieces were joined, and the joined image was checked again.
3. The pieces were deleted.

**What was run.** `1-verify-image.command` was double-clicked in Finder, in `~/Downloads/DraftCraft-1.16.2-mac-test`,
with `expected.txt` taken from the build receipt. The account name in the log is replaced by `<user>`.

| Check | Result |
|---|---|
| Image SHA-256 | `ddb11e9c…43b3`: **MATCH** with the build receipt |
| `hdiutil verify` | **VALID**: every partition's CRC32 verified |
| Read-only mount | Mounted; the volume is "DraftCraft Pro", case-sensitive HFS+, with the 1.16.2 documents and the `Developer-ID` folder |
| Info.plist | `com.draftcraft.screenplay.studio`, 1.16.2 / 1.16.2; ASAR integrity `b88214a2…f8d2` (the tested payload); macOS 13.0 minimum |
| Architecture | arm64 |
| `codesign --verify --deep --strict` | Valid on disk and satisfies its Designated Requirement. Every nested helper and framework exits 0. The bundle is ad-hoc signed. |
| Gatekeeper `spctl --assess` | Rejected, as expected for an ad-hoc build that is not notarized |
| Installer manifest and pins | 271 entries, 0 not OK. Package-SHA256, File-Paths, Bundle-Links and Sign-macOS are pinned. |
| `Developer-ID/Sign-and-Notarize.command` | `bash -n` passes with macOS `/bin/bash` 3.2.57 |
| `Developer-ID/entitlements.plist` | `plutil -lint`: OK |
| `app.asar` SHA-256 | `a9a9666a…5bb1`: **MATCH** (the exact payload that passed the release suites) |

**Installed app (listed only, not changed).** `/Applications/DraftCraft Pro.app` is **1.16.1**; the owner installed it.
The normal profile was not opened or changed.

**Not done in this round.**
* 1.16.2 was not installed or launched: replacing the installed app is the owner's step.
* `Sign-and-Notarize.command` was not run, because it needs the owner's Apple Developer account.
