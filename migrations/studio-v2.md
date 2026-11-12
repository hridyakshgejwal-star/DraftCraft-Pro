# Production metadata migration 1 → 2

The native project envelope remains version 1. Studio metadata is version 2, loaded through `migrateStudio`; existing version-1 studio fields are retained with the version advanced. A project without studio records still migrates conservative paragraph tags and legacy Navigator tabs. A newer unrecognized studio version raises a specific error rather than resetting production metadata in the migration function.

Version 2 adds optional companion anchors to page locks, revision-set IDs for deleted locked boundaries, deletion text on point revision marks, and logical range IDs for tags crossing an exact split/join. Existing user preferences, optional overlay state, assets, character identities, alternate takes and file destinations are not reset. Unknown native document fields remain in the project.

`reconcileStudio` transforms both primary and companion anchors. Exact adjacent split/join projections preserve tag parts; ambiguous structural edits are not guessed across the script. Linked planning deletions detach stale references while retaining screenplay text. Rich text outside an ordinary edit remains in supported text runs.

Atomic native writes and recovery use the existing file coordinator. Keep original project backups before overwriting with a newer build; older DraftCraft versions do not understand all version-2 production records. Recovery/history migration remains distinct from real writing activity, and fresh productivity profiles remain empty.

Baseline supplied archive SHA-256: `805601bed66f40930ec9ae673123ba04b42ead8c79872ec532618125ed4725d3`.
Git baseline tag in this workspace: `supplied-baseline`. A complete reverse-applicable patch is included as `DraftCraft-1.15.1.patch`; the original source archive is also retained as the prior file version. Historical supplied reports/proofs are under `verification/supplied-1.15.0-evidence/` and are not current verification claims.
