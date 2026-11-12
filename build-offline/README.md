# Offline / Linux build route (1.15.3)

The normal macOS build is unchanged: `npm ci`, `npm --prefix desktop ci`, `node desktop/build.cjs`,
`node desktop/package.mjs darwin arm64` (see `Production-Build-and-Install.md`).

DraftCraft Pro 1.15.3 was built in a Linux workspace **without access to the npm registry**. This folder
contains the reproducible substitute that was used. It never changes application source; it only replaces
the build tools that could not be installed.

| Step | Script | What it does |
|---|---|---|
| 1 | `setup-vendor.mjs` | Assembles `vendor/node_modules` from pinned GitHub sources (exact lockfile versions, commit SHAs in `deps-provenance.txt`), the pdf.js 6.4.299 release archives, and host packages (esbuild 0.28.2, tailwindcss 4.3.3, react/react-dom 19.2.8). Every version is asserted. |
| 2 | `gen-lucide-react.mjs` | Generates `lucide-react` 0.546.0 from the lucide repository's icons and `packages/lucide-react` sources (same icon nodes and hashed keys as the published package). |
| 3 | `build-renderer.mjs` | `vite build` equivalent with esbuild + Tailwind `compile()`: `?raw`, `?url`, module workers, JSON/CSS imports, hashed `/assets`, `public/` copy. Bare imports go through an explicit allow-list (`firebase` is rejected because the desktop renderer must not reach it). |
| 4 | `stage-desktop.mjs` | `desktop/build.cjs` equivalent. Reuses the previous release's offline font files (data produced by the same step) and `api.cjs` only when `server.ts` is byte-identical. |
| 5 | `asar-pack.mjs` | @electron/asar-compatible writer (per-file SHA-256 + 4 MiB block integrity). Repacking the extracted 1.15.2 payload reproduces the shipped `app.asar` **byte for byte**. |
| – | `dev-server.mjs` | Vite `createServer` stand-in for `verification/production-codecs.cjs`. |
| – | `tsconfig.offline.json` | Type-check with TypeScript 6.0.3 and DefinitelyTyped `@types/react` sources. |

## Fidelity evidence

* The unmodified 1.15.2 source rebuilt with this route rendered a **pixel-identical** first screen to the
  shipped 1.15.2 app in Electron 44.7.0, and passed the same 210 model/backend tests.
* Tailwind output contained every class the app uses; the only differences were 9 noise tokens the original
  scanner picked up from the spelling dictionaries.

## Known substitutions

* **React / React DOM 19.2.8 and scheduler 0.27.0** were used instead of the locked 19.3.0 / 0.28.0. These were the only
  React builds on the build machine, and React's GitHub releases carry no build artifacts. A macOS `npm ci` build uses
  the locked versions.
* `@babel/runtime` helpers come from Babel 7.29.10 sources; DOMPurify 3.4.16, jsPDF 4.2.1, compromise 14.18.0 and
  pako use the files committed in their tagged repositories; TypeScript sources (motion, html2canvas, canvg, fflate,
  fast-png, iobuffer, svg-pathdata) are compiled by esbuild instead of their own bundlers.
* Minification is esbuild's, not Vite 8/oxc's; chunk names differ (`src-*.js`, `chunk-*.js`).

## Reproducibility

The route is reproducible except for one esbuild behaviour: in the main chunk (`index-*.js`), the numeric suffixes
that esbuild gives to colliding top-level names (`encode`/`encode2`, `round`/`round2`, …) can differ between two
builds of the same tree, because they follow the order in which parse and plugin results arrive; the minifier then
gives many names different short forms. Every other file is identical (`dist/index.html` differs only in the chunk's
file name). None of 20 rebuilds of the committed final tree reproduced the tested payload (fingerprint
`1cdc6eea…03e2e7f0`, main chunk `index-UPMDX6ZV.js`) byte for byte; for the two earlier 1.15.3 builds 3 of 8 and 2 of
20 did. `compare-main-chunk.py <assets A> <assets B>` checks that two main chunks have the same token sequence and
punctuation and differ only by consistent identifier renames; it reported EQUIVALENT for all 20 rebuilds
(`verification/evidence-1.15.3/rebuild-reproducibility.txt`). A change that prepared workers and Tailwind before the
build did not remove the variation and was reverted. To check a delivered payload against the source: rebuild, compare
all files except `dist/index.html` and `dist/assets/index-*.js` byte for byte, and run `compare-main-chunk.py` on the
main chunks.
