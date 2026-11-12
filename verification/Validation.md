# Fresh verification — DraftCraft Pro 1.4.2

Performed on 11 October 2026. This records the new editor fixes, separately
from the historical validation retained in the original source archive.

| Check | Result |
| --- | --- |
| `npm run lint` (TypeScript) | Pass, zero diagnostics |
| `npm run build` / `desktop/build.cjs` | Pass; existing large-chunk warning retained |
| Document/page/sizing model tests | 7/7 pass |
| Production-renderer interaction groups | 14/14 pass |
| Native Electron clipboard/IPC checks | 6/6 pass |
| Independent macOS code/resource integrity | Pass; see `macos-signatures.json` |

Renderer testing used the production desktop assets and offline fonts in
Chromium 151 headless shell on Linux. The viewport/zoom matrix covered 1024,
1440 and 1920 pixels, Navigator open/closed, 50/100/200% screenplay zoom and
five paragraph types (90 combinations). Visible input bounds were clipped to
the scrolling workspace when checking intersections with the toolbar. The
paper remains 816 CSS pixels wide with 144/96/96-pixel left/right/top margins
at 100%; the original paginator source is unchanged.

Interaction groups cover selection retention and element undo; left-click
confirmation/cancel; first/middle/last/only page operations; exact neighbor and
metadata preservation; copy, paste before/after, duplicate, cut and repeated
undo/redo; clipboard failure and external text; keyboard and Control-click
menus; selected text and focus; all three resize axes at 40/100/200% with pan
and grid on/off; minima and captured pointer motion; preview without writes;
undo retaining later title edits and view switching; persisted dimensions on
reload; cancellation; stale dialog refresh; connector endpoints and dragging;
and controls excluded from print media. No renderer exceptions were observed.

The browser suite used a clipboard test bridge to isolate interaction cases.
The exact shipped clipboard handler source was separately exercised with
Electron 44.7.0 / Chromium 152.0.7977.130 and the native Linux clipboard. This
confirmed atomic plain-text/HTML writes, asynchronous snapshot reads returning
serializable strings, external text clearing old HTML, trusted sender/frame
guards, invalid input rejection and propagated asynchronous write failures.
Sender/frame identities were test fixtures. This was not a complete native
Electron UI launch test. A full launch attempt in this environment was blocked
by its native socket restrictions and produced no passing launch evidence.

The macOS app payload is rebuilt by `desktop/build.cjs` and the supplied-runtime
`desktop/repackage.mjs`. ASAR per-file hashes and the Info.plist ASAR header
digest are checked. Ad-hoc bundle signatures were regenerated with rcodesign
0.29.0, whose download checksum was verified. Independent checks validate all
13 Mach-O signatures, 54,394 code pages, 31 special-slot hashes, 471 resource
hashes, 9 nested code seals, 9 resource seals and 14 framework links. All 249
native payload sections remain byte-identical to the supplied runtime.

Not tested: a physical Mac launch, Apple's codesign/Gatekeeper, notarization,
macOS clipboard retention across application restart, native print dialogs,
Keychain integration, Finder associations and M2 performance. The retained
installer performs Apple's local signing and strict verification on the target
Mac before opening the app. This remains an ad-hoc personal build, not an
Apple-notarized or Developer ID release.

Fresh evidence is under `verification/results/`. Screenshots show the actual
rendered formatting controls, selected card handles and page context menu.
