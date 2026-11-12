"""Assemble, sign (ad hoc) and image DraftCraft Pro (1.15.3 and later) on Linux.

Route (same as 1.15.2, see verification/PACKAGING-TOOLS.md): the verified previous
ARM64 Electron runtime is reused unchanged; only the application ASAR, Info.plist
(version + ASAR integrity digest), the outer bundle signature and the support
files change. Nested runtime signatures are retained (rcodesign --exclude '**').

The project's own verifiers are run on the result: verify-macos-package.py
(Mach-O code pages, special slots, resource seals, unchanged native sections
against the template), verify-dmg-asar.mjs (every packaged byte equals the tested
stage; Info.plist version and ASAR integrity), and verify-dmg.py (UDIF/HFS CRCs,
stored catalog modes, round-trip inventory, installer pins). mkfs.hfsplus/fsck
(hfsprogs) are unavailable on the build host, so instead of build-production-dmg.py
the image starts from an empty copy of the previous release's own HFSX volume.

usage: python3 build-release-dmg.py <config.json>
config keys: template_app, asar, asar_header_sha256, version, stage (tested app
payload directory), tests (final-tests.json of the release run), suites (expected
suite count), volume_files (dir to copy into the volume root), app_resources,
clean_hfs (empty HFSX volume image), hfsplus, dmg, rcodesign, sevenzip, out_dmg,
work, shims (NODE_PATH for verify-dmg-asar.mjs)
"""
import hashlib, json, os, plistlib, shutil, stat, subprocess, sys
from pathlib import Path

cfg = json.loads(Path(sys.argv[1]).read_text())
work = Path(cfg['work']); work.mkdir(parents=True, exist_ok=True)
volume = work / 'volume'
log = open(work / 'build-release-dmg.log', 'w')
def run(*args, **kw):
    log.write('$ ' + ' '.join(map(str, args)) + '\n'); log.flush()
    return subprocess.run([str(a) for a in args], stdout=log, stderr=subprocess.STDOUT, check=True, **kw)
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

source = Path(__file__).resolve().parent.parent
# 0. Gate: every release suite passed on exactly this payload.
# A pre-release check image (for running the native self-test on a Mac before the final suites) skips this gate and
# must carry PRECHECK in its name; it is never delivered as a release.
prerelease = bool(cfg.get('prerelease'))
if prerelease:
    assert 'PRECHECK' in Path(cfg['out_dmg']).name, 'A pre-release check image must be named ...PRECHECK...'
    tests = {'payload_sha256': None}
else:
    tests = json.loads(Path(cfg['tests']).read_text())
    assert len(tests['results']) == cfg['suites'] and all(r['passed'] for r in tests['results']), 'All final release suites must pass.'

# 1. Volume tree: previous runtime + new payload.
if volume.exists(): shutil.rmtree(volume)
volume.mkdir()
app = volume / 'DraftCraft Pro.app'
shutil.copytree(cfg['template_app'], app, symlinks=True)
for p in [app, *app.rglob('*')]:
    if not p.is_symlink(): os.chmod(p, (p.lstat().st_mode | stat.S_IWUSR))
shutil.copyfile(cfg['asar'], app / 'Contents/Resources/app.asar')
os.chmod(app / 'Contents/Resources/app.asar', 0o644)
plist_path = app / 'Contents/Info.plist'
info = plistlib.loads(plist_path.read_bytes())
assert info['CFBundleIdentifier'] == 'com.draftcraft.screenplay.studio'
info['CFBundleShortVersionString'] = cfg['version']; info['CFBundleVersion'] = cfg['version']
info['ElectronAsarIntegrity']['Resources/app.asar']['hash'] = cfg['asar_header_sha256']
plist_path.write_bytes(plistlib.dumps(info, fmt=plistlib.FMT_XML, sort_keys=False))
for name, src in cfg.get('app_resources', {}).items():
    shutil.copyfile(src, app / 'Contents/Resources' / name)
    # Executables (the 1.17.0 Speech helper) keep their executable mode; documents stay 0644.
    os.chmod(app / 'Contents/Resources' / name, 0o755 if os.access(src, os.X_OK) else 0o644)

# 2. Ad-hoc signature for the changed outer bundle only.
run(cfg['rcodesign'], 'sign', '--exclude', '**', app)
info_after = subprocess.run([cfg['rcodesign'], 'print-signature-info', str(app / 'Contents/MacOS/DraftCraft Pro')], capture_output=True, text=True, check=True).stdout
assert 'ADHOC' in info_after and 'com.draftcraft.screenplay.studio' in info_after, 'main executable must carry an ad-hoc signature with the app identifier'
code_resources = plistlib.loads((app / 'Contents/_CodeSignature/CodeResources').read_bytes())
asar_entry = code_resources['files2']['Resources/app.asar']
import base64
seal = asar_entry['hash2'] if isinstance(asar_entry['hash2'], bytes) else base64.b64decode(asar_entry['hash2'])  # plistlib returns <data> as bytes
assert seal.hex() == sha(app / 'Contents/Resources/app.asar'), 'CodeResources seals the new app.asar'

# 2b. Project verifiers for the bundle.
added = [x for name, src in cfg.get('app_resources', {}).items() if os.access(src, os.X_OK) for x in ('--added', 'Contents/Resources/' + name)]
run('python3', source / 'verification/verify-macos-package.py', app, '--baseline', cfg['template_app'], '--output', work / 'dmg-native-proof.json', *added)
native = json.loads((work / 'dmg-native-proof.json').read_text())
assert not native['errors'] and native['unchanged_native_sections'] > 0, native['errors'][:5]
assert sorted(native.get('added_native_files', [])) == sorted(added[1::2]), 'every added native file was verified'
run('node', source / 'verification/verify-dmg-asar.mjs', app, cfg['stage'], work / 'dmg-asar-proof.json', env={**os.environ, 'NODE_PATH': cfg['shims'], 'DRAFTCRAFT_EXPECT_VERSION': cfg['version']})
asar_proof = json.loads((work / 'dmg-asar-proof.json').read_text())
assert asar_proof['passed'] and (prerelease or asar_proof['payload_sha256'] == tests['payload_sha256']), 'The packaged payload is the tested payload.'

# 3. Support manifests + installer (desktop/create-installer.mjs), then volume documents.
run('node', Path(__file__).resolve().parent.parent / 'desktop/create-installer.mjs', volume)
for entry in sorted(Path(cfg['volume_files']).iterdir()):
    dst = volume / entry.name
    if entry.is_dir(): shutil.copytree(entry, dst, symlinks=True, dirs_exist_ok=True)
    else: shutil.copyfile(entry, dst)
os.chmod(volume / 'Install-DraftCraft.command', 0o755)
for command in volume.rglob('*.command'):
    if not command.is_symlink(): os.chmod(command, 0o755)  # e.g. Developer-ID/Sign-and-Notarize.command (1.16.1)

# 4. HFSX volume and zlib UDIF image.
raw = work / 'volume.hfs'
shutil.copyfile(cfg['clean_hfs'], raw)
run(cfg['hfsplus'], raw, 'addall', volume, '--symlinks=clone_link')
# The empty template volume still holds the previous release's bytes in its free blocks
# (hfsplus rmall only updates the catalog and allocation bitmap). Zero every block that
# the allocation bitmap marks free, so the image carries no stale data and compresses well.
def zero_free_blocks(image):
    import struct
    with open(image, 'r+b') as f:
        f.seek(1024); vh = f.read(512)
        assert vh[:2] in (b'H+', b'HX'), 'HFS+ volume header'
        block_size, total_blocks = struct.unpack_from('>II', vh, 40)
        extents = [struct.unpack_from('>II', vh, 128 + 8 * i) for i in range(8)]
        bitmap = bytearray()
        for start, count in extents:
            if count: f.seek(start * block_size); bitmap += f.read(count * block_size)
        zero, zeroed, i = bytes(block_size), 0, 0
        while i < total_blocks:
            if not bitmap[i >> 3] & (0x80 >> (i & 7)):
                f.seek(i * block_size); f.write(zero); zeroed += 1
            i += 1
        return {'block_size': block_size, 'total_blocks': total_blocks, 'zeroed_free_blocks': zeroed}
free_space = zero_free_blocks(raw)
log.write('zeroed free blocks: ' + json.dumps(free_space) + '\n'); log.flush()
out = Path(cfg['out_dmg']); out.parent.mkdir(parents=True, exist_ok=True)
if out.exists(): out.unlink()
run(cfg['dmg'], '-c', 'zlib', '-l', '9', 'build', raw, out)

# 5. Independent round trips: 7-Zip reading the UDIF image, and hfsplus extractall.
def tree(root):
    root = Path(root); result = {}
    for p in sorted(root.rglob('*')):
        rel = p.relative_to(root).as_posix()
        if p.is_symlink(): result[rel] = ('link', os.readlink(p))
        elif p.is_dir(): result[rel] = ('dir',)
        else: result[rel] = ('file', sha(p), bool(p.stat().st_mode & 0o111))
    return result
expected = tree(volume)
checks = {}
seven = work / 'roundtrip-7z'
if seven.exists(): shutil.rmtree(seven)
run(cfg['sevenzip'], 'x', '-y', f'-o{seven}', out)
vol7 = next(p for p in seven.iterdir() if p.is_dir())
checks['7z_roundtrip_identical'] = tree(vol7) == expected
hfsx = work / 'roundtrip-hfsplus'
if hfsx.exists(): shutil.rmtree(hfsx)
hfsx.mkdir(); part = work / 'roundtrip.hfs'
run(cfg['dmg'], 'extract', out, part, '2')
run(cfg['hfsplus'], part, 'extractall', '/', hfsx)
checks['hfsplus_roundtrip_identical'] = tree(hfsx) == expected
run('python3', source / 'verification/verify-dmg.py', out, raw, volume, hfsx, cfg['hfsplus'], work / 'dmg-image-proof.json', env={**os.environ, 'DRAFTCRAFT_EXPECT_VERSION': cfg['version']})
checks['verify_dmg_py'] = json.loads((work / 'dmg-image-proof.json').read_text())['passed']
checks['verify_macos_package_py'] = not native['errors']
checks['verify_dmg_asar_mjs'] = asar_proof['passed']
if not all(checks.values()):
    got = tree(vol7); diff = sorted(set(expected.items()) ^ set(got.items()))[:20]
    print(json.dumps({'checks': checks, 'diff': diff}, indent=1)); sys.exit(1)
receipt = {'dmg': str(out), 'dmg_sha256': sha(out), 'dmg_bytes': out.stat().st_size, 'asar_sha256': sha(app / 'Contents/Resources/app.asar'), 'asar_header_sha256': cfg['asar_header_sha256'], 'version': cfg['version'], 'entries': len(expected), 'symlinks': sum(1 for v in expected.values() if v[0] == 'link'), 'checks': checks, 'tested_payload_sha256': tests['payload_sha256'], 'free_space': free_space, 'native_proof': {k: native[k] for k in ['mach_o_files', 'code_page_hashes', 'special_slot_hashes', 'resource_hashes', 'nested_code_seals', 'symlinks', 'resource_seals', 'unchanged_native_sections']}, 'signing': 'ad-hoc (rcodesign 0.29.0, outer bundle only); not Developer ID signed; not notarized', 'native_mac_validated': False}
(work / 'dmg-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
