# Verification evidence for 1.15.1

Current automated results are recorded in `story-results/final-tests.json`, its suite logs, `completion-lint.log`, `completion-build.log`, `completion-environment.json`, and `completion-preservation.json`. The environment record contains the actual browser version and executable hash; a few inherited performance message strings still contain a fixed older Chromium label.

`production-results/browser.json` covers actual built-renderer controls. `production-results/codecs.json`, `shared-layout.pdf`, and `character-sides.pdf` cover real interchange/PDF rendering. New model tests are `production-completion.test.ts` and `production-clipboard.test.ts`. The clipboard source test substitutes transport objects; its pixels/asset normalization are independently exercised in the browser. It does not establish macOS pasteboard behavior.

`completion-macos-build.log` records the initial source-only delivery's packaging guard refusal. The follow-up DMG delivery supersedes that packaging limitation: `dmg-baseline-native-proof.json`, `dmg-native-proof.json`, `dmg-asar-proof.json` and `dmg-image-proof.json` record current independent Linux bundle/ASAR/HFS/UDIF verification. The image proof is generated after the disk image, so it is an external receipt rather than a self-referential file inside that image. No Apple codesign/Gatekeeper assessment, notarization or physical Mac test is claimed.

Earlier `*-macos-proof.json`, ASAR/signing/disk-image files and legacy reports in this source tree describe prior releases. They are retained as history and do not validate 1.15.1. Supplied 1.15.0 summary documents are copied under `supplied-1.15.0-evidence/`.

Browser screenshots are internal QA and excluded from the deliverable. Existing external fixtures retain their original provenance and licenses. No actual Final Draft desktop round trip or premium-voice listening test is claimed.
