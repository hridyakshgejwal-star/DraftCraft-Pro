# Evidence — DraftCraft Pro 1.15.4

Everything here was produced by the scripts in `verification/` against the packaged 1.15.4 payload
(`payload_sha256 f6d59849040109fddc3c13c4242b97495b88ba75ed002e7d87d18a4781ea3e8b`, commit `255d5a4`), on Linux (headless
Chromium 141 / Electron 44.7.0 under Xvfb, 2 vCPU), unless a file says otherwise. Start with FORMATTING-REPORT-1.15.4.md.

| Path | What |
|---|---|
| `run-steps.log`, `stage.log`, `asar-pack.log` | build of the tested payload and the order of the checks |
| `release-suites/` | `final-tests.json` (18 suites, all passed, budgets recorded) and every suite log; `release-suites.log` is the first pass, `release-suites-formats-rerun.log` the formats re-run after its assertion was corrected |
| `electron-lifecycle.*`, `electron-pdf-parity.*` | real Electron: window lifecycle scenarios, editor vs exported PDF |
| `electron-pdf-geometry.*`, `pdf-samples-1.15.4/` | element positions and the page-header band in real exported PDFs, 12 templates |
| `electron-pdf-geometry-on-1.15.3.*`, `pdf-samples-1.15.3/` | the 1.15.3 app exporting the same measurement documents (title in the header) |
| `format-geometry/geometry.json`, `format-geometry.log` | editor geometry of all 75 page-layout templates |
| `fdx-real-files.log`, `fdx-real-files-on-1.15.3.log` | six `.fdx` files saved by Final Draft (testdata of github.com/rsdoiel/fdx, AGPL; read at test time, not copied here) and the Final Draft-style fixture, through the 1.15.4 and 1.15.3 codecs |
| `compat-1.15.3-documents.*` | documents in all 80 1.15.3 formats and their 1.15.3 `.fdx` exports, opened with 1.15.4; 1.15.4 `.fdx` exports opened with 1.15.3 |
| `rollback-format-check.*` | the 96 1.15.4 formats validated by 1.15.3 |
| `before-after/` | same keystrokes in 1.15.3 and 1.15.4: editor screenshots, each version's PDF, side-by-side images, `before-after.json` |
| `word-click-latency-ab.txt`, `typing-latency-ab.txt` | 1.15.3 and 1.15.4 alternating on the same host, final payload |
| `latency-investigation/` | the same comparisons on intermediate commits (62e8623, 165b8eb) while the host was slow, and a three-way typing rotation |
| `extras-steps.log` | order of the comparison runs |
| `macos/` | native Apple Silicon checks of the disk image (added after the image was built) |
| `dmg/` | the DMG receipt, the three verifier proofs and `SHA256SUMS.txt` of the delivery (added after the image was built) |
