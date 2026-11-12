"""Assemble the tested 1.10.0 app, source, guide and personal installer.
Run after extract-verify-payload.cjs and all eight release suites pass.
The separate verify-dmg.py checks the finished disk image independently.
"""
from pathlib import Path
import hashlib,io,json,os,plistlib,shutil,struct,subprocess,zipfile

source=Path(__file__).resolve().parent.parent
task=source.parent.parent
release=task/'release'
artifacts=task/'deliverables'
artifacts.mkdir(exist_ok=True)
v=source/'verification'
tests=json.loads((v/'story-results/final-tests.json').read_text())
assert len(tests['results'])==8 and all(r['passed'] for r in tests['results'])
native=json.loads((v/'caret-native-proof.json').read_text())
asar=json.loads((v/'smart-save-asar-proof.json').read_text())
pixels=json.loads((v/'caret-results/native-reference.json').read_text())
assert native['passed'] and asar['passed'] and pixels['passed'] and asar['version']=='1.10.0'
groups=sum(r['interaction_groups'] for r in tests['results'])
models=next(r['tests'] for r in tests['results'] if r['suite']=='models')
measurement=next(r['measurements'][0] for r in tests['results'] if r['suite']=='caret')
app=release/'DraftCraft Pro.app'
info=plistlib.loads((app/'Contents/Info.plist').read_bytes())
old=plistlib.loads((task/'baseline/DraftCraft Pro.app/Contents/Info.plist').read_bytes())
assert info['CFBundleIdentifier']==old['CFBundleIdentifier'] and info['CFBundleShortVersionString']=='1.10.0'
binaries=0
for p in app.rglob('*'):
    if not p.is_file() or p.is_symlink():continue
    with p.open('rb') as f:head=f.read(12)
    if head[:4]==b'\xcf\xfa\xed\xfe':
        assert struct.unpack_from('<I',head,4)[0]==0x0100000c,p
        binaries+=1
assert binaries==13
with zipfile.ZipFile(task/'downloads/DraftCraft-Pro-Smart-Save-Source.zip') as baseline:
    for name in ['desktop/save-coordinator.cjs','desktop/project-files.cjs','desktop/preload.cjs','src/files/useProjectFiles.ts','src/writing/wordSuggestions.ts','src/shortcuts/model.ts']:
        assert baseline.read('DraftCraft-Pro-Source/'+name)==(source/name).read_bytes(),name

report=f'''# DraftCraft Pro 1.10.0 — Smooth Caret & Fluid Typing

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
- **{models} model/bridge/filesystem tests** passed. Eight new motion tests cover monotonic curves, no overshoot, exact completion, rapid redirection, safe jumps, malformed/legacy preferences, 10,000 retargets and equivalent 60/120 Hz elapsed-time sampling. The 18 existing save/coordinator cases still pass.
- **{groups} browser interaction groups** passed against the exact renderer extracted from the signed app. Twelve caret groups cover intermediate positions, fast typing, deletion, arrows/Home/End, undo/redo, element alignment, wrapping, pages, zoom, selection/replacement, composition events, autocomplete, spelling and synonym replacements, Unicode, settings persistence, blinking/focus, reduced motion, forced colors, cleanup, no idle animation loop and long-screenplay autosave.
- A combining-script/emoji paragraph was compared with the actual Chromium native caret pixels. The animated layer and native caret matched at **x={pixels['custom']['x']}, y={pixels['custom']['y']}, height={pixels['custom']['height']} CSS pixels**. This uses native rendered pixels rather than assuming Canvas font fallback has identical text shaping. Screenshots were used internally and are not included as deliverables.
- The dedicated caret check used **{measurement['pages']} pages / {measurement['paragraphs']:,} paragraphs**, with typing p50 **{measurement['typingMs']['p50']} ms** and p95 **{measurement['typingMs']['p95']} ms**, including the automation round trip. Other existing regressions exercise scripts up to 250 pages. These are Linux Chromium measurements, not physical M2 performance claims.
- ASAR: **{asar['files']} files**, byte-identical to staging and backend source. Header SHA-256: `{asar['asarHeaderSha256']}`.
- Independent signature/resource checks passed for **13 ARM64 binaries**, **{native['code_page_hashes']:,} code-page hashes**, **{native['special_slot_hashes']} special-slot hashes**, **{native['resource_hashes']} resource hashes**, **{native['nested_code_seals']} nested code seals**, **{native['resource_seals']} resource seals**, **{native['symlinks']} symlinks** and **{native['unchanged_native_sections']} unchanged native sections**.

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
'''
(release/'Build-Report.md').write_text(report)
(artifacts/'DraftCraft-Pro-Smooth-Caret-Report.md').write_text(report)
shutil.copytree(task/'baseline/Third-Party-Licenses',release/'Third-Party-Licenses',dirs_exist_ok=True)
shutil.copyfile(source/'CARET-ANIMATION.md',release/'Caret-Animation.md')
shutil.copyfile(source/'SMART-SAVE.md',release/'Smart-Save.md')
proofdir=release/'Verification'
proofdir.mkdir(exist_ok=True)
for name,target in [('caret-native-proof.json','macos-signatures.json'),('smart-save-asar-proof.json','asar-integrity.json')]:shutil.copyfile(v/name,proofdir/target)
platform={'passed':True,'version':'1.10.0','bundle_identifier':info['CFBundleIdentifier'],'identity_preserved':True,'architecture':'arm64','minimum_macos':info['LSMinimumSystemVersion'],'physical_mac_launch_tested':False}
(proofdir/'platform.json').write_text(json.dumps(platform,indent=2)+'\n')
(proofdir/'tests').mkdir(exist_ok=True)
for name in ['final-tests.json','models-tests.log','story-tests.log','editor-tests.log','shortcuts-tests.log','words-tests.log','spelling-tests.log','smart-save-tests.log','caret-tests.log']:shutil.copyfile(v/'story-results'/name,proofdir/'tests'/name)
shutil.copytree(v/'caret-results',proofdir/'caret',dirs_exist_ok=True)
shutil.copytree(v/'smart-save-results',proofdir/'smart-save',dirs_exist_ok=True)

entries={}
excluded={'node_modules','.git','target','__pycache__','dist','ui-qa','story-qa','ui-refinement'}
for directory,folders,files in os.walk(source):
    folders[:]=[name for name in folders if name not in excluded]
    for name in files:
        file=Path(directory)/name;rel=file.relative_to(source)
        if name=='.env' or name.startswith('.env.'):continue
        if 'verification' in rel.parts and file.suffix.lower() in {'.png','.jpg','.jpeg','.webp'}:continue
        entries[Path('DraftCraft-Pro-Source')/rel]=file
payload=task/'verified-payload'
for folder in ['dist','Font-Licenses','Spelling-Licenses']:
    for file in (payload/folder).rglob('*'):
        if file.is_file():entries[Path('DraftCraft-Pro-Source')/file.relative_to(payload)]=file
archive=io.BytesIO()
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,9) as z:
    for name,file in sorted(entries.items()):z.write(file,name)
    z.writestr('DraftCraft-Pro-Source/CARET-IMPLEMENTATION-REPORT.md',report)
zip_path=artifacts/'DraftCraft-Pro-Smooth-Caret-Source.zip'
zip_path.write_bytes(archive.getvalue())
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    for file in (payload/'dist').rglob('*'):
        if file.is_file():assert z.read('DraftCraft-Pro-Source/'+file.relative_to(payload).as_posix())==file.read_bytes()
shutil.copyfile(zip_path,release/'DraftCraft-Pro-Source.zip')
subprocess.run(['node',str(source/'desktop/create-installer.mjs'),str(release)],cwd=source,check=True)
subprocess.run(['/bin/bash','-n',str(release/'Install-DraftCraft.command')],check=True)
subprocess.run(['/bin/bash','-n',str(release/'Support/Sign-macOS.sh')],check=True)
summary={'version':'1.10.0','model_tests':models,'browser_groups':groups,'source_files':len(entries)+1,'source_zip_bytes':zip_path.stat().st_size,'source_sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'asar_header_sha256':asar['asarHeaderSha256']}
(task/'assembly.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary),flush=True)
