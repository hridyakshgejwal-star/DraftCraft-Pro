# Developer ID signing and notarization

The DraftCraft Pro app on this disk image has an ad-hoc signature. `Install-DraftCraft.command` checks it and
installs it for this Mac. To get a copy that Gatekeeper accepts on any Mac, sign it with your own Developer ID and
have Apple notarize it. `Sign-and-Notarize.command` does all of this on your Mac.

## What you need

* **An Apple Developer Program membership.**
* **A "Developer ID Application" certificate in your login keychain.** To create one, open Xcode › Settings ›
  Accounts, choose your team, then Manage Certificates › + › Developer ID Application.
* **Xcode or the Command Line Tools.** To install the tools, run `xcode-select --install`.
* **An app-specific password for your Apple ID.** Create one at appleid.apple.com › Sign-In and Security ›
  App-Specific Passwords. You only need it once, when the notarytool profile is created.

## Run it

1. **First, check your setup.** In Terminal, run:

   ```
   "/Volumes/DraftCraft Pro/Developer-ID/Sign-and-Notarize.command" --check
   ```

   The check signs nothing.
2. **Run the script.** Either double-click `Sign-and-Notarize.command` in Finder, or run it in Terminal without
   `--check`.
   * If no notarytool profile exists, the script offers to create one named `DraftCraft-Notary`. Apple's
     `notarytool` then asks for your Apple ID, team ID and app-specific password and stores them in your keychain.
     The script never sees, stores or prints them.
   * If you have several Developer ID certificates, the script asks which one to use. You can also name it with
     `--identity "Developer ID Application: Name (TEAMID)"`.
3. **Find the results.** They are in `~/Downloads/DraftCraft-Pro-<version>-Developer-ID/`:
   * `DraftCraft Pro.app`: signed, notarized and stapled
   * `DraftCraft-Pro-<version>-arm64-notarized.dmg`: signed, notarized and stapled
   * `SHA256.txt`
   * `sign-and-notarize.log`, plus Apple's report if notarization is refused
4. **Install the signed copy.** Drag `DraftCraft Pro.app` from the new disk image to Applications.
   * Do not use `Install-DraftCraft.command` for this copy. It re-signs ad hoc, which would remove the Developer ID
     signature.
   * Your screenplays and settings are kept.

## What the script does

1. **Checks the app.** It compares the app with this disk image's manifest (`Support/Package-SHA256.txt` and
   `Support/File-Paths.txt`). If anything differs, it stops.
2. **Signs the app.** The script works on a copy and signs it from the inside out:
   * every Mach-O file, then each framework and helper app, then the app itself
   * always with the hardened runtime (`--options runtime`) and a secure timestamp
   * executables get `entitlements.plist`:
     * JIT for V8
     * the microphone for dictation
     * the camera, as declared in Info.plist
3. **Verifies the signature.** It runs `codesign --verify --deep --strict` and confirms the Developer ID authority
   and the runtime flag.
4. **Notarizes the app.** It zips the app, submits it with `xcrun notarytool submit --wait`, and staples the ticket.
   It then checks the result with `stapler validate` and `spctl --assess --type execute`.
5. **Builds the disk image.** It creates the disk image, signs and notarizes it, staples it, and checks it with
   `spctl --assess --type open`.

## Options

| Option | Effect |
|---|---|
| `--check` | Checks the tools, the certificate and the profile only; signs nothing |
| `--identity NAME` | Uses this certificate |
| `--profile NAME` | Uses this notarytool keychain profile (default `DraftCraft-Notary`) |
| `--app PATH` | Signs this app instead of the one on the disk image |
| `--out DIR` | Writes the results to this folder |
| `--no-dmg` | Signs and notarizes the app only |

## How this script was tested

Signing and notarization need your Apple account, so they could not be run during development. The script's flow was
tested on Linux with stand-in tools that record every call (`verification/developer-id-sign.test.cjs`). The test
checks:

* the inside-out order, the hardened runtime, timestamps and entitlements
* notarization, stapling and the Gatekeeper checks
* that the script stops with no certificate, several certificates, a missing profile, a changed app, a refused
  submission, or outside macOS

The first real run happens on your Mac.
