# Dependencies — 1.15.3 note

1.15.3 adds **no runtime dependency**; the lockfiles change only in the app version field. The 1.15.3 payload was built without npm
registry access; the build-time substitutes (React/React DOM 19.2.8 instead of 19.3.0, esbuild + Tailwind
`compile()` instead of Vite, pinned GitHub sources) are listed with commit SHAs in `build-offline/README.md` and
`build-offline/deps-provenance.txt`. `build-offline/shims/` holds test-only read shims for `@electron/asar` and
`plist` used by `verification/verify-dmg-asar.mjs`; they are not part of the app. Packaging tools: rcodesign
0.29.0, patched libdmg-hfsplus (`verification/packaging-tools.json`), 7-Zip for an independent image read-back.

# Added runtime dependencies

| Component | Version | License / role |
|---|---|---|
| pdfjs-dist | 6.4.299 | Apache-2.0; bundled worker for text PDF extraction. OCR is not included. |
| yjs | 13.6.33 | MIT; replicated text and stable record data for collaboration. |
| ws | 8.22.0 | MIT; separately operated collaboration server. |
| lib0 / isomorphic.js | Pinned by package-lock.json | MIT; Yjs dependencies. |
| Apple Speech / AVFoundation | Operating-system frameworks | Optional native on-device dictation; compile on macOS. No Apple framework is redistributed. |
| Screenplain QA fixtures | abf0d0800ab0b9dfd5bbe780137641e746afbad4 | MIT; external FDX/Fountain/PDF verification fixtures with provenance and original license. |

Run `npm ci` to use the lockfile. Existing fonts and writing dictionaries retain their prior licenses. Runtime and font licenses are included in the existing build and disk image; copies for the added libraries are under `licenses/production/`. No new paid service is required for local editing, formatting, PDF text extraction, macros, images, statistics or local collaboration tests. Public collaboration hosting and optional neural speech have their own setup and cost requirements.
