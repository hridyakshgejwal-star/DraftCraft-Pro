# DraftCraft Pro 1.15.3 — verification evidence

Host: Linux x64 container, 2 CPUs. Renderer suites: headless Chromium 141.0.7390.37 (Playwright). Window, file and
PDF tests: real Electron 44.7.0 (Chromium 152.0.7977.130) under Xvfb. Only `macos/` is evidence of macOS
behaviour.

"final" = the 1.15.3 payload packaged in the DMG (fingerprint `1cdc6eea…03e2e7f0`).
"shipped" = the 1.15.2 payload extracted from `DraftCraft-Pro-1_15_2-arm64.dmg` (fingerprint `59e6ec30…db05246a`,
the same value 1.15.2's own checkpoint reports as its tested payload).

| Path | What it is |
|---|---|
| `release-suites-final/`, `release-suites-final.log` | All 17 release suites on the final payload: per-suite logs, `final-tests.json` (payload fingerprint, results, measurements), cross-paragraph `browser.json` |
| `release-suites-shipped/`, `release-suites-shipped.log`, `release-suites-shipped-rerun.log` | The same suites on the shipped payload; spelling and cross-paragraph re-run after their test files changed (the merged `final-tests.json` holds the re-run results) |
| `electron-lifecycle-{final,shipped}.{json,log}` | 12 real-Electron window lifecycle scenarios (`../electron/lifecycle-scenarios.cjs`) |
| `electron-pdf-parity-{final,shipped}.{json,log}`, `electron-pdf-parity-final.pdf` | Native-project open → Export Screenplay PDF → page-by-page comparison (`../electron/pdf-parity.cjs`); the shipped run wrote no PDF |
| `typing-latency-250-pages.txt` | 3 alternating runs per build of `../typing-latency-browser.cjs` (per-key times and p50/p95/max) |
| `release-suites-shipped-rerun2.log`, `release-suites-shipped-rerun3.log` | Shipped payload, cross-paragraph suite re-run after the D-09/E-09 groups were added and after the Escape test was strengthened (1 of 14 pass each time; `release-suites-shipped/cross-paragraph-results/` holds the last run) |
| `word-click-latency.txt` | Synonym-menu click latency, run alone, alternating builds |
| `typing-latency-development-run.txt` | The first comparison made while developing P-01 |
| `cpu-profiles/` | Chrome DevTools CPU profiles of 30 keystrokes in the 250-page script, before and after the row-cache fix (open in Chrome DevTools ▸ Performance) |
| `screens/` | Editor screenshots of the same document on both builds, the overlap-probe output for each (`../overlap-probe-browser.cjs`), and the shipped build's PDF-export error |
| `typecheck-src-1.15.3.txt`, `baseline-1.15.2/tsc-src-before.txt` | `src/` type-check errors after/before (identical sets) |
| `baseline-1.15.2/` | First runs on the untouched 1.15.2 build: 6-scenario lifecycle, cross-element suite, 1.15.2 source unit tests (210/210), two full suite runs |
| `rebuild-reproducibility.txt` | 20 rebuilds of the committed tree: payload fingerprints, main-chunk names and `build-offline/compare-main-chunk.py` results |
| `superseded/` | `release-suites-final-prejoinfix*`: the first final-suite run, made before defect E-08 was found (kept because it shows that failure); `first-build-7692a51a/` and `second-build-789a5858/`: suites, Electron runs, latency and rebuild checks of the two earlier DMG builds (before D-09/E-09, and before the second E-09 fix), each with the strengthened Escape test failing on that build |
| `macos/` | Native macOS runs on a Mac mini (Apple Silicon, macOS 27.0.1): `OBSERVATIONS.md` (rounds 1–3), script logs per round (`build-premac/`, `round2/`, `round3/`), exported PDF, saved project, screenshots |
| `dmg/` | DMG build log, receipt and the three verifier proofs (added by the packaging step) |
