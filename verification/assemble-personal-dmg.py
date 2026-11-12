"""Assemble the verified 1.15.2 installer, evidence and source archive.
Requires the already verified release-final app; no native Mac claim is made.
"""
from pathlib import Path
import hashlib, json, os, plistlib, shutil, subprocess, zipfile
source = Path(__file__).resolve().parent.parent
task = source.parent.parent
release, out, v = task/'release-final', task/'deliverables', source/'verification'
app = release/'DraftCraft Pro.app'
version = '1.15.2'
out.mkdir(exist_ok=True)
tests = json.loads((v/'story-results/final-tests.json').read_text())
native = json.loads((v/'dmg-native-proof.json').read_text())
asar = json.loads((v/'dmg-asar-proof.json').read_text())
assert len(tests['results']) == 16 and all(r['passed'] for r in tests['results'])
assert native['passed'] and native['unchanged_native_sections'] == 249
assert asar['passed'] and asar['payload_sha256'] == tests['payload_sha256']
assert hashlib.sha256((app/'Contents/Resources/app.asar').read_bytes()).hexdigest() == asar['asar_sha256']
info = plistlib.loads((app/'Contents/Info.plist').read_bytes())
assert info['CFBundleShortVersionString'] == version
assert info['CFBundleIdentifier'] == 'com.draftcraft.screenplay.studio'
model_count = sum(r.get('tests', 0) for r in tests['results'])
browser_count = sum(r['interaction_groups'] for r in tests['results'])
assert (model_count, browser_count) == (210, 205)
table = '| Suite | Passed | Tests / groups | Seconds |\n|---|---|---:|---:|\n'
table += '\n'.join(f"| {r['suite']} | Yes | {r.get('tests', r['interaction_groups'])} | {r['seconds']} |" for r in tests['results'])
lead = f'''# DraftCraft Pro {version} — implementation report and change log

This updates the existing Electron 44.7.0 / React / TypeScript application, retaining its identity, project/profile locations, native save workflow and separate Rust prototype. The 1.14 request was reconciled with the supplied 1.15.1 source and installer. The original baseline is recoverable; the archive includes patches against the supplied baseline and recovered repair baseline. Delivery-Manifest.json identifies the source commit and every included file.

**The complete requested desktop scope remains partial.** The matrix identifies implemented, partial, missing and dependency-blocked workflows with UI, persistence, export and verification evidence. The F01–F16 repairs and R17–R25 additional fixes are detailed in the ledger. This is not a claim of complete Final Draft parity.

## Delivered repairs

- Shared screenplay spacing and page-top handling; actual-content template previews; exact-factory versioned migration with recovery checkpoints. Custom/locked layouts are retained.
- Literal Unicode Find/Replace occurrence ranges, metadata rebasing and one-step Undo; whole-scene moves preserve bodies and links across Navigator, Scene List and Index Cards.
- Composition-aware single-flight close, late-save continuation, renewed discard decisions and quota-safe approval; actual File Manager Save As, disk Revert/checkpoint and awaited undoable snapshot restores.
- Independent document identity-graph copies; reachable Combine preview and stable element-boundary insertion with asset/planning/production merge, incompatible-lock refusal and Undo. Within-element insertion splitting remains absent.
- Actual token counts in Compare, conservative reformat inference, selectable/composable Format Doctor fixes retaining supported style runs, actual-layout history counts, reachable Scene List/Index Cards and bounded layout caches.
- Attributed same-text element/style Track Changes, styled Original/Final and correct formatting rejection; current paper/title choices in PDF. Full rich-text editing, combined text/style tracking and cross-paragraph drag workflows remain partial.

Preservation evidence covers writing assistance, shortcuts, caret, templates, Table Read, recovery and undo. Optional story-overlay defaults and existing preferences are retained. The 59 tracked Rust/Cargo files are byte-unchanged. Genuine productivity history is preserved; fresh profiles receive no fictional history. Migrations are in migrations/layout-spacing-v2.md. The first-save location and subsequent autosave workflow remain.

## Verification

All 16 release suites passed: **{model_count} model/backend tests and {browser_count} browser/codec interaction groups**. The fresh recovered-baseline run passed 196 tests before repairs. Baseline-defect observations use isolated baseline execution and source inspection, not a physical Mac. Current runtime: Node 24.19.0 and Linux Chromium 153.0.8010.0; some harness labels retain 151, while repair-results/runtime-environment.json records the actual executable/version/checksum.

{table}

Tested staged payload SHA-256: `{tests['payload_sha256']}`.

Evidence includes real Chromium editing/navigation/Undo, actual save/revert/checkpoint files, actual PDF bytes/geometry, external codec fixtures, real audio-pipeline output using Flite and independent concurrent local collaboration clients. Native dialogs/providers are explicitly substituted where needed. None establishes physical Mac input, premium voice quality or an actual Final Draft desktop round trip. Performance is Linux-host-specific; failed attempts and historical timing variation are retained without loosening thresholds. The final run passed the existing thresholds.

The starting assessment and defects are before-state evidence. Current results are in REPAIR-FEATURE-MATRIX.md and REPAIR-DEFECT-LEDGER.md. verification/historical-1.15.1 contains older proofs and reports, not evidence for this payload. Browser screenshots and the downloaded proprietary manual are excluded.

## Personal DMG verification and limits

`DraftCraft-Pro-{version}-arm64.dmg` targets **Apple Silicon and macOS {info['LSMinimumSystemVersion']} or later**. It contains the app, hash-checking Install-DraftCraft.command, instructions, source archive, migrations, matrix and evidence. The outer bundle is signed ad hoc, retaining unchanged nested Electron signatures. It is **not Developer ID signed or notarized**, and **has not been installed/launched on a physical Mac**. This Linux build cannot compile the Swift dictation helper; an SDK-equipped Mac and microphone/Speech permissions are required.

All {asar['files']} ASAR files match staging; packaged backend/identity-graph sources match source. ASAR SHA-256: `{asar['asar_sha256']}`. Header digest: `{asar['asarHeaderSha256']}`. Independent Linux checks passed for {native['mach_o_files']} ARM64 files, {native['code_page_hashes']:,} code-page hashes, {native['resource_hashes']} resource hashes, {native['resource_seals']} resource seals and {native['symlinks']} symlinks; {native['unchanged_native_sections']} native sections are unchanged. This is not Apple's codesign/Gatekeeper assessment.

The image pipeline checks the HFS filesystem/catalog permissions, every extracted file/link, installer pins and compressed/HFS/master UDIF checksums. The final image-hash receipt is created after the image, outside it, to avoid a circular checksum. Public collaboration hosting/TLS/credentials are operator-supplied. OCR, full standard FDX alternate/revision interchange and full production/style collaboration are not supplied; the matrix records remaining scope.

'''
report = lead + (source/'REPAIR-FEATURE-MATRIX.md').read_text() + '\n\n' + (source/'REPAIR-DEFECT-LEDGER.md').read_text() + '\n\n' + (source/'Production-Build-and-Install.md').read_text()
for name in ['Repair-Release-Notes.md', 'Production-Release-Notes.md']:
    (source/name).write_text(report)
(out/f'DraftCraft-Pro-{version}-Implementation-Report.md').write_text(report)
(source/'REPAIR-CHECKPOINT.md').write_text(f'''# DraftCraft Pro {version} final repair checkpoint

All 16 suites passed: {model_count} model/backend tests and {browser_count} browser/codec interaction groups. Tested payload: {tests['payload_sha256']}.

The archive includes current matrix/ledger, migrations, evidence, historical baseline records and patches. Original and repair baselines remain git tags in the working repository. The image receipt is generated after packaging and is external. Physical Mac installation, Apple assessment, dictation and actual Final Draft interoperability remain unverified. Full requested scope remains partial; read the matrix.
''')
for name in ['Repair-Release-Notes.md', 'Production-Release-Notes.md', 'REPAIR-FEATURE-MATRIX.md', 'REPAIR-DEFECT-LEDGER.md', 'PRODUCTION-FEATURE-MATRIX.md', 'Production-Build-and-Install.md', 'Production-Dependencies.md']:
    shutil.copyfile(source/name, release/name)
shutil.copytree(source/'migrations', release/'Migrations', dirs_exist_ok=True)
shutil.copytree(task/'original-runtime/Third-Party-Licenses', release/'Third-Party-Licenses', dirs_exist_ok=True)
shutil.copytree(source/'licenses/production', release/'Third-Party-Licenses/Production', dirs_exist_ok=True)
proof = release/'Verification'
proof.mkdir(exist_ok=True)
for name in ['dmg-baseline-inventory.json', 'dmg-baseline-native-proof.json', 'dmg-native-proof.json', 'dmg-asar-proof.json', 'packaging-tools.json', 'PACKAGING-TOOLS.md']:
    shutil.copyfile(v/name, proof/name)
folders = ['story-results', 'editor-results', 'shortcuts-results', 'words-results', 'spelling-results', 'production-results', 'table-read-results', 'automatic-formatting-results', 'punctuation-results', 'formats-results', 'caret-results', 'smart-save-results', 'collaboration-results', 'interchange-results', 'repair-results', 'historical-1.15.1']
for folder in folders:
    if not (v/folder).exists():
        continue
    for p in sorted((v/folder).rglob('*')):
        if not p.is_file() or p.suffix.lower() not in {'.json', '.log', '.pdf', '.md', '.txt'}:
            continue
        target = proof/p.relative_to(v)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, target)
(proof/'README.md').write_text('Current 1.15.2 Linux automation and independent bundle/ASAR proofs. Older evidence is historical. No physical Mac installation/launch, Apple codesign/Gatekeeper, notarization, native dictation or actual Final Draft desktop test is claimed. The HFS/UDIF image-hash receipt is external. Browser screenshots are excluded.\n')
subprocess.run(['node', str(source/'desktop/create-installer.mjs'), str(release)], cwd=source, check=True)
for p in [release/'Install-DraftCraft.command', release/'Support/Sign-macOS.sh', source/'desktop/build-dmg-macos.sh']:
    subprocess.run(['/bin/bash', '-n', str(p)], check=True)
subprocess.run(['git', 'diff', '--check'], cwd=source, check=True)
subprocess.run(['git', 'add', '--all', '--', '.', ':!Delivery-Manifest.json', ':!DraftCraft-*.patch', ':!verification/**/*.png', ':!verification/**/*.jpg', ':!verification/**/*.webp'], cwd=source, check=True)
if subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=source).returncode:
    subprocess.run(['git', '-c', 'user.name=Codex', '-c', 'user.email=codex@local', 'commit', '-qm', 'Repair audited desktop workflows and package verified 1.15.2 installer'], cwd=source, check=True)
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=source, text=True).strip()
for filename, baseline in [(f'DraftCraft-{version}.patch', 'supplied-baseline'), (f'DraftCraft-{version}-Repair.patch', 'repair-baseline-1.15.1')]:
    (source/filename).write_bytes(subprocess.check_output(['git', 'diff', '--binary', baseline, 'HEAD'], cwd=source))
files = []
for directory, children, names in os.walk(source):
    children[:] = sorted(c for c in children if c not in {'.git', 'node_modules', 'dist', 'build', 'coverage', '__pycache__'})
    for name in sorted(names):
        p = Path(directory)/name
        rel = p.relative_to(source)
        if rel.parts[0] == 'verification' and p.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp'}:
            continue
        if name.startswith('.env') and name != '.env.example':
            continue
        if name in {'Delivery-Manifest.json', 'DraftCraft-1.15.1.patch', 'dmg-image-proof.json', 'dmg-roundtrip-native-proof.json', 'dmg-roundtrip-asar-proof.json'}:
            continue
        files.append(p)
files.sort()
manifest = {'version': version, 'source_commit': head, 'architecture': 'Electron/React/TypeScript; retained Rust prototype', 'tested_payload_sha256': tests['payload_sha256'], 'asar_sha256': asar['asar_sha256'], 'model_backend_tests': model_count, 'browser_codec_groups': browser_count, 'release_suites': 16, 'full_requested_scope_complete': False, 'new_mac_artifact': True, 'mac_artifact': f'DraftCraft-Pro-{version}-arm64.dmg', 'signing': 'ad-hoc outer bundle, retained unchanged nested signatures', 'developer_id_signed': False, 'notarized': False, 'physical_mac_tested': False, 'final_draft_app_tested': False, 'files': [{'path': p.relative_to(source).as_posix(), 'size': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
(source/'Delivery-Manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
files.append(source/'Delivery-Manifest.json')
archive = out/f'DraftCraft-Pro-{version}-Source.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in files:
        z.write(p, 'DraftCraft-Pro-Source/'+p.relative_to(source).as_posix())
with archive.open('rb+') as f:
    os.fsync(f.fileno())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert all(not ('/verification/' in n and n.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))) for n in z.namelist())
shutil.copyfile(archive, release/'DraftCraft-Pro-Source.zip')
print(json.dumps({'assembled': True, 'version': version, 'source_commit': head, 'source_bytes': archive.stat().st_size, 'source_sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'tested_payload_sha256': tests['payload_sha256']}))
