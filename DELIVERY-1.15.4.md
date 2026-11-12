# Current delivery — DraftCraft Pro 1.15.4

Formatting release of the existing Electron/React/TypeScript app, on top of 1.15.3: standard US screenplay layout
fixes, Final Draft (.fdx) interchange, 96 built-in templates and intelligent auto-formatting with its own settings.
**Ad-hoc signed; not notarized.**

Read, in this order:

1. [FORMATTING-REPORT-1.15.4.md](FORMATTING-REPORT-1.15.4.md) — audit, feature-status matrix, defects and root causes, tests, known limitations
2. [Release-Notes-1.15.4.md](Release-Notes-1.15.4.md) — user-facing changes
3. [TEMPLATE-MATRIX-1.15.4.md](TEMPLATE-MATRIX-1.15.4.md) and [AUTO-FORMATTING-BEHAVIOURS-1.15.4.md](AUTO-FORMATTING-BEHAVIOURS-1.15.4.md)
4. [Build-and-Install-1.15.4.md](Build-and-Install-1.15.4.md), [migrations/formatting-1.15.4.md](migrations/formatting-1.15.4.md)

Evidence is in `verification/evidence-1.15.4/`. `AUTOMATIC-FORMATTING.md` and `AUTOMATIC-FORMATTING-REPORT.md` describe
the earlier automatic-formatting work and are kept as history; where they differ, the 1.15.4 documents are current.

## Previous delivery — 1.15.3 (historical)

Repair release of the existing Electron/React/TypeScript app (from the shipped 1.15.2 DMG), with an
installable ARM64 DMG built on Linux and checked on an Apple Silicon Mac (macOS 27.0.1). **Ad-hoc signed; not
notarized; the installer script was not run on the Mac.**

Read, in this order:

1. [RELEASE-REPORT-1.15.3.md](RELEASE-REPORT-1.15.3.md) — what was found, fixed and tested (sections A–H and acceptance criteria)
2. [Release-Notes-1.15.3.md](Release-Notes-1.15.3.md) — user-facing changes
3. [FEATURE-MATRIX-1.15.3.md](FEATURE-MATRIX-1.15.3.md) and [DEFECT-LEDGER-1.15.3.md](DEFECT-LEDGER-1.15.3.md)
4. [Build-and-Install-1.15.3.md](Build-and-Install-1.15.3.md), [migrations/pagination-1.15.3.md](migrations/pagination-1.15.3.md)
5. [UNRESOLVED-EXTERNAL-DEPENDENCIES.md](UNRESOLVED-EXTERNAL-DEPENDENCIES.md)

Evidence (logs, JSON results, PDFs, screenshots, CPU profiles) is in `verification/evidence-1.15.3/`.
The 1.15.2 documents (`REPAIR-*.md`, `Repair-Release-Notes.md`, `Production-*.md`, `PRODUCTION-*.md`) are kept
unchanged as history; where they disagree with the 1.15.3 documents, the 1.15.3 documents are current.

## Earlier delivery header — 1.15.1 (historical)

This is updated source, with verified subsets and remaining partial workflows. No new installable Mac artifact is included. Read [Production-Release-Notes.md](Production-Release-Notes.md), [PRODUCTION-FEATURE-MATRIX.md](PRODUCTION-FEATURE-MATRIX.md), and [Production-Build-and-Install.md](Production-Build-and-Install.md) before building. Earlier release/DMG proofs are historical.

## Retained earlier README (historical)

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/456ae7c7-8436-4eb3-9232-b24674943a91

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
