# Linux packaging prerequisites

The normal macOS build uses the existing `desktop/package.mjs` and native
`codesign` workflow. This release was assembled on Linux using the verified
previous ARM64 Electron runtime, then tested by extracting the exact new ASAR.
No native Mac launch is implied by these checks.

`packaging-tools.json` records the pinned tool versions and checksums. For Linux
disk-image assembly, build the Mozilla `libdmg-hfsplus` revision recorded there
after applying `libdmg-permissions.patch`. The patch preserves the source mode of
symlinks when cloning them, changes leaf chmod to address the link record itself,
and explicitly reapplies regular-file modes after extraction. The first image
check detected the upstream tool's default 0644 link mode; the corrected tool
and image were rebuilt and all stored modes verified independently.

Install hfsprogs and the library build prerequisites, then set `HFSPLUS`,
`DMG_TOOL`, `MKFS_HFSPLUS` and `FSCK_HFSPLUS` if the tools are outside the paths
expected by `build-production-dmg.py`. The 1.15.1 recovery used GCC 13, CMake
3.31.6 and the pinned bzip2 1.0.8 source. Where system bzip2 development files
are unavailable, build its `libbz2.a` with `-fPIC`, set `BZIP2_INCLUDE_DIR` and
`BZIP2_LIBRARY_RELEASE` in CMake, and add its directory to the executable
linker search path. Only zlib-compressed UDIF output is selected here.

Recover the prior app from its immutable disk image, verify every entry in
its `Support/Package-SHA256.txt` and symlink manifest, and run the independent
native verifier before reusing it. Do not copy partial temporary files left by
an interrupted extraction/signing operation into a release. The actual HFS
catalog and package inventory determine which files belong to the prior app;
never discard a sealed resource to make verification pass.

Stage the application and run all 16 release suites, `desktop/repackage.mjs`,
`verify-macos-package.py` with `--baseline`, and `verify-dmg-asar.mjs`. Retain
their current `dmg-` proof files and the exact tested payload digest. With the
app in `release-final/DraftCraft Pro.app`, run `assemble-personal-dmg.py`, then
`build-production-dmg.py`. The latter requires a fresh round-trip extraction
folder and verifies every stored catalog mode, byte, symlink target, UDIF
checksum and installer pin. The image-hash receipt is external to the image.

The complete external packaging tools are not shipped inside the application.
Their licenses and build instructions remain with their respective upstream
projects. The delivered app retains its Electron, font, dictionary and other
existing third-party license files.
