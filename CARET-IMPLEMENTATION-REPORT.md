# DraftCraft Pro 1.10.0 — Smooth Caret & Fluid Typing

The existing screenplay editor now displays a thin caret that glides to the
native insertion position while text appears immediately. This enhances the
released 1.9.0 application; the application identity, documents and save format
are preserved. Built for Apple Silicon, including Mac mini M2, macOS 13 or later.

## Implemented behavior

- One interruptible, time-based trajectory follows the latest caret target. Fast typing and reversal replace the current target; animations never queue. Movement changes only the visual portal transform, without per-frame React updates or text-layout reads.
- Ordinary moves use Fast **60 ms**, Normal **80 ms**, or Slow **100 ms**. Choose **Ease-Out / Spring / Linear**. The spring is critically damped, normalized to finish exactly, and does not bounce or overshoot. Existing custom duration values are retained.
- Nearby arrows and line moves can glide. Wrapping, page changes, distant jumps, scrolling and zoom reposition immediately, avoiding long sweeps across unrelated text. Positions use the focused textarea’s real font, alignment, wrapping, scroll offset and zoom.
- The caret stays visible during activity, then starts blinking after **650 ms** of inactivity. Smooth opacity and stepped blinking are available, with adjustable **400–2400 ms** cycles. Blinking can be disabled for a steady caret. Focus restores immediate visibility; selection and app switching keep normal native behavior.
- **Settings → Editor → Caret Animation** exposes the controls and reset action. Smooth movement is on for new profiles; existing saved On/Off choices and custom speeds remain. Settings persist using the existing application preference key. The older Cursor & Typing panel remains available.
- Reduced motion, forced colors, IME composition and bidirectional text use the native caret. Native textareas continue to own input, selection, clipboard, undo/redo, accessibility and screen-reader semantics; visual layers are hidden from accessibility APIs and cannot receive pointer input.
- Only the active paragraph has a reusable measurement mirror. Measurement invalidations are batched to display frames. Settled movement stops requesting frames; listeners, observers, timers and animations are cleaned up when preferences change or the editor unmounts.

## Existing features retained

Screenplay formatting, automatic capitalization, pagination, custom shortcuts,
spellcheck, contextual word suggestions, character autocomplete, dictionaries,
copy/cut/paste, undo/redo, Beat Board, Story Map, Story Arc, Navigator, Outline,
printing and exports remain available. Story tools remain off by default.

The save coordinator, project writer, preload bridge, renderer save hook,
word-suggestion engine and shortcut engine are byte-identical to the released
1.9.0 source. The native menu gains only a Caret Animation entry. Smart autosave,
native Save/Save As and close decisions, recovery and existing project files are
covered by the full regressions.

## Verification results

- TypeScript checking and the production desktop build passed.
- **77 model/bridge/filesystem tests** passed. Eight new motion tests cover monotonic curves, no overshoot, exact completion, rapid redirection, safe jumps, malformed/legacy preferences, 10,000 retargets and equivalent 60/120 Hz elapsed-time sampling. The 18 existing save/coordinator cases still pass.
- **89 browser interaction groups** passed against the exact renderer extracted from the signed app. Twelve caret groups cover intermediate positions, fast typing, deletion, arrows/Home/End, undo/redo, element alignment, wrapping, pages, zoom, selection/replacement, composition events, autocomplete, spelling and synonym replacements, Unicode, settings persistence, blinking/focus, reduced motion, forced colors, cleanup, no idle animation loop and long-screenplay autosave.
- A combining-script/emoji paragraph was compared with the actual Chromium native caret pixels. The animated layer and native caret matched at **x=916, y=584.0625, height=18 CSS pixels**. This uses native rendered pixels rather than assuming Canvas font fallback has identical text shaping. Screenshots were used internally and are not included as deliverables.
- The dedicated caret check used **222 pages / 1,999 paragraphs**, with typing p50 **38 ms** and p95 **60 ms**, including the automation round trip. Other existing regressions exercise scripts up to 250 pages. These are Linux Chromium measurements, not physical M2 performance claims.
- ASAR: **80 files**, byte-identical to staging and backend source. Header SHA-256: `c9c42f5d777c09a44a76e461edf70520f267ebcabbbb7c8405cca9fbf968c5e3`.
- Independent signature/resource checks passed for **13 ARM64 binaries**, **54,394 code-page hashes**, **31 special-slot hashes**, **471 resource hashes**, **9 nested code seals**, **9 resource seals**, **14 symlinks** and **249 unchanged native sections**.

## Install and validation limits

Open **DraftCraft-Pro-Smooth-Caret.dmg**, then run **Install-DraftCraft.command**
once. It checks the supplied app, preserves any existing app copy, installs and
re-signs the local bundle using macOS tools, verifies it and opens it. Later,
launch DraftCraft Pro from Applications. No Node.js, Rust, Python or development
server is needed to run the app. Existing screenplay/profile data is retained.

This is an ad-hoc-signed personal build, not an Apple-notarized Developer ID
release. A physical Mac launch, native save panels, Dock/Cmd+Q behavior, Apple
codesign/Gatekeeper assessment, physical IME/screen-reader use and a real 120 Hz
display were not available here. Composition events were simulated in Chromium;
120 Hz support was checked mathematically using timestamp-based sampling, not
claimed as a hardware refresh-rate benchmark. Finder mounting and launch still
need validation on a Mac. The existing GUI remains Electron/React; the retained
Rust workspace is a prototype. Optional Gemini services were not account-tested.

The disk image is checked separately for complete UDIF decompression/checksums,
HFSX consistency/catalog modes, extracted file hashes, symlinks and installer
pins. Its final checksum appears in the external report after image creation.

## Source checks

Install root and desktop dependencies, run `npm run lint`, then
`node desktop/build.cjs`. Package using the existing macOS workflow. The release
runner is `verification/run-release-tests.py`; provide `DRAFTCRAFT_DIST`,
`BROWSER_EXE` and, if needed, `PLAYWRIGHT_MODULE`. The native pixel reference
test additionally uses Python 3 with Pillow. Full results accompany the source.
