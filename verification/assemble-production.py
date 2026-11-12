"""Assemble the existing 1.15 personal build after exact-payload regression checks."""
from pathlib import Path
import hashlib,io,json,os,plistlib,shutil,subprocess,zipfile
source=Path(__file__).resolve().parent.parent;task=source.parent.parent;release=task/'release-final';out=task/'deliverables';out.mkdir(exist_ok=True);v=source/'verification';payload=task/'tested-payload-v3'
tests=json.loads((v/'story-results/final-tests.json').read_text());assert len(tests['results'])==15 and all(r['passed'] for r in tests['results']),'All final suites must pass.'
h=hashlib.sha256()
for p in sorted(payload.rglob('*')):
 if p.is_file():h.update(p.relative_to(payload).as_posix().encode()+b'\0'+p.read_bytes())
assert tests['payload_sha256']==h.hexdigest(),'Tests belong to another application payload.'
# Added library licenses are non-executable outer resources. Seal them without
# changing any byte of the tested ASAR payload.
archive=release/'DraftCraft Pro.app/Contents/Resources/app.asar';archive_hash=hashlib.sha256(archive.read_bytes()).hexdigest()
shutil.copytree(source/'licenses/production',release/'DraftCraft Pro.app/Contents/Resources/Production-Licenses',dirs_exist_ok=True)
if os.uname().sysname=='Darwin':sign=['/bin/bash',str(source/'desktop/sign-macos.sh'),str(release/'DraftCraft Pro.app')]
else:
 signer=os.environ.get('RCODESIGN',str(task/'tools/apple-codesign-0.29.0-x86_64-unknown-linux-musl/rcodesign'));assert Path(signer).is_file();sign=[signer,'sign','--config-file','/dev/null','--timestamp-url','none','--shallow',str(release/'DraftCraft Pro.app')]
with (v/'production-license-signing.log').open('w') as log:subprocess.run(sign,stdout=log,stderr=subprocess.STDOUT,check=True)
assert hashlib.sha256(archive.read_bytes()).hexdigest()==archive_hash
subprocess.run(['python3',str(v/'verify-macos-package.py'),str(release/'DraftCraft Pro.app'),'--baseline',str(task/'original-runtime/DraftCraft Pro.app'),'--output',str(v/'production-macos-proof.json')],check=True)
native=json.loads((v/'production-macos-proof.json').read_text());asar=json.loads((v/'smart-save-asar-proof.json').read_text());assert native['passed'] and asar['passed'] and asar['version']=='1.15.0'
subprocess.run(['python3',str(v/'verify-production-preservation.py')],cwd=source,check=True);preserved=json.loads((v/'production-preservation.json').read_text());assert not preserved['removed_files']
info=plistlib.loads((release/'DraftCraft Pro.app/Contents/Info.plist').read_bytes());assert info['CFBundleShortVersionString']=='1.15.0' and info['CFBundleIdentifier']=='com.draftcraft.screenplay.studio'
models=next(r['tests'] for r in tests['results'] if r['suite']=='models');groups=sum(r['interaction_groups'] for r in tests['results']);rows='\n'.join(f"| {r['suite']} | {r.get('tests',r['interaction_groups'])} | {r['seconds']} |" for r in tests['results']);changes='\n'.join('- `'+p+'`' for p in preserved['changed_files']+preserved['new_files'])
report=f'''# DraftCraft Pro 1.15.0 — production workflow update

This updates the supplied **1.14.0 Electron/React/TypeScript application**, retaining the editor and the separate Rust prototype. It delivers working, tested subsets of the requested production workflows. It does **not** claim complete Final Draft parity. The accompanying `PRODUCTION-FEATURE-MATRIX.md` identifies implemented, partial, unverified and blocked scope by UI, implementation, persistence, export and evidence.

The installable personal build targets **Apple Silicon ARM64, macOS {info['LSMinimumSystemVersion']} or later**. It is **ad-hoc signed, without Developer ID signing or notarization**. No physical Mac launch, native print dialog, microphone/IME/accessibility test or actual Final Draft desktop interoperability test ran in this Linux environment.

## Working implementation

- Shared measured layout splits long Action/Dialogue into visual fragments while retaining semantic paragraph IDs and full UTF-16 source text. The editor, native HTML print/PDF, Navigator, report queries and planning index use that layout. MORE/CONT'D/scene labels remain outside editable text. A real Chromium PDF comparison verifies that a long speech lands on the same pages without lost or duplicated words.
- Production Studio operates on actual native project data: persisted page anchors and inserted labels, controlled lock levels, scene numbering/omission, named dated revision sets and ranges, authored editorial changes, reusable tag identities/aliases/categories/ranges, scene casts and saved Navigator result views. Page-range inputs support labels such as 12A. Track Changes stays separate from production revisions.
- Dual dialogue pairs focused adjacent speeches rather than modifying the script's last paragraph. Group IDs include cues, parentheticals and dialogue; independent columns handle unequal lengths and unlocked page overflow. Table Read describes and uses sequential playback.
- Alternate dialogue commits edited active takes before switching or saving. Blank add, duplicate, delete and selection share editor Undo. Take labels remain outside text; the selected take prints and reads, while unused takes stay in the native project.
- Track Changes records authors, timestamps, configured colors, text replacements and paragraph insertion/deletion. Previous/next, accept/reject/all, read-only original/markup/final review and undoable decisions work with the project. Newer overlapping changes need review first; formatting-change tracking and FDX review interoperability remain outside the verified subset.
- Literal character rename avoids ANN/ANNA and regex-punctuation errors. Current Navigator/SmartType/cast/Table Read identity paths preserve IDs and assignments. Linked beat, marker and script title/description fields propagate; Send to Script asks for element and location and never invents INT/EXT/DAY/NIGHT. Outline export preserves lane/marker hierarchy.
- External FDX/Fountain fixtures exercise standard dual-dialogue structures, ordinary text, parentheticals and Unicode. Opaque unsupported XML is retained with warnings. RTF import retains supported emphasis and colors. Export review discloses native-only and unsupported data before producing an interchange copy.
- PDF import uses a bundled PDF.js worker, real text extraction, repeated-edge detection and an editable classification review. It preserves the original file and records a source digest/warnings. Scanned PDFs have a clear no-text/OCR requirement; OCR is not included.
- Format Doctor has format-aware selectable checks, ignore/next, optional pre-print checking and composed undoable fixes. It does not invent scene locations/times or claim 100% compliance. Reports use active shared geometry, locked labels, actual tags and cast records.
- Fresh statistics start empty. Ambiguous legacy history is backed up and labelled, not silently erased. Actual deltas, undo/redo, dates, imports/project baselines, active time and sprint segments replace fictional activity. A cloud-sync preference is explicitly not an operational sync service.
- Project macros have scoped text triggers/shortcut conflict checks, expansion/caret placement and optional next elements. The command toolbar supports persistent command selection/order/removal/reset and icon/text presentation. Embedded script/title assets have real ingest, proportional width/alignment, native persistence and shared print placement. Image clipboard exchange uses a DraftCraft image record.
- Native document windows have independent save/close coordinators and local-document slots, while preferences remain shared. Two real coordinators/files verify isolation; full physical Mac multiwindow/quit/Table Read isolation remains unverified.
- An actual authenticated Yjs/WebSocket service supports host/join, approval, edit/view permissions, actual presence/messages, bounded updates, atomic state persistence and reconnect. Independent clients converge after concurrent/offline edits. Two actual production-renderer clients also share edits and undo only their local transaction. No writers or successful synchronization are simulated. Public hosting/TLS remains operator setup; production and private voice/API metadata stay local.

## Remaining acceptance gaps

- Mixed inline-font textarea/caret geometry, physical IME/accessibility and cross-fragment drag selections need more work/verification. Complete locked boundaries inside dual-dialogue groups, deletion-only revision marks and complex omission/relocking cases are not complete production parity.
- Full Final Draft alternate/revision/template interoperability, Fountain rich emphasis and complete RTF font/layout fidelity are unverified or incomplete. Multi-column PDF reconstruction is approximate.
- Cross-paragraph tag anchoring, every structural split/merge case, character-side output, every report option and planning deletion-link repair need further work. The matrix distinguishes these from tested text/identity workflows.
- Native multiple-window behavior and all image/title/clipboard/print gestures need Mac QA. Collaboration covers screenplay/planning text and stable records; production metadata, complex concurrent structural/global-format changes and collaborative IME behavior are not claimed complete.
- **Dictation is blocked in this delivered Linux-built DMG:** the Apple Speech/AVFoundation helper source and IPC/editor integration exist, but the helper must be compiled with the macOS SDK and tested with microphone/Speech permissions and an on-device language. Start is unavailable with that specific reason. No online recognition fallback is silently enabled.
- Existing Table Read neural models, premium API keys/credits and listening quality are not bundled or newly validated. Existing real audio/export regressions use substituted provider/macOS transport and actual Flite/FFmpeg audio.

## Verification

**{models} model/backend tests and {groups} browser/codec interaction groups passed across all 15 final suites.** The unchanged 1.14 baseline was separately tested before modification. Timing includes browser automation on Linux and does not establish Apple Silicon or 120 Hz performance.

| Suite | Tests / groups | Seconds |
|---|---:|---:|
{rows}

Exact tested application payload SHA-256: `{tests['payload_sha256']}`. ASAR header SHA-256: `{asar['asarHeaderSha256']}`. All **{asar['files']}** ASAR files match staging; backend sources match the packaged payload.

Independent native integrity checks passed for {native['mach_o_files']} ARM64 Mach-O files, {native['code_page_hashes']:,} code-page hashes, {native['resource_hashes']} resource hashes, {native['resource_seals']} resource seals, {native['symlinks']} symlinks and {native['unchanged_native_sections']} unchanged native sections. These checks are not Apple's codesign/Gatekeeper assessment. The supplied runtime's unchanged nested signatures are retained; the changed outer application is signed ad hoc.

Source preservation: **no application source files removed**, {preserved['unchanged_files']} application/build files unchanged, including all {preserved['unchanged_rust_files']} Rust/workspace files. The punctuation analyzer, automatic-formatting engine/preferences, template catalog/model, shortcut model and core Table Read synthesis/audio modules remain byte-identical to the baseline. Regression suites cover their integration with the changed editor.

## Install and reproduce

Mount `DraftCraft-Pro-Table-Read.dmg` and run `Install-DraftCraft.command`. The existing installer verifies hashes/links, preserves the previous installed app, installs and locally signs/verifies the copy on the Mac. Project files and preferences remain in their existing locations. See `Production-Build-and-Install.md`, `Production-Dependencies.md`, `collaboration/README.md` and `Table-Read.md` for reproducible builds, optional dependencies, privacy and service setup.

Core build: `npm ci`, `npm --prefix desktop ci`, `npm run lint`, `node desktop/build.cjs`. On a Mac, `node desktop/package.mjs darwin arm64` uses the existing packaging/signing workflow and compiles the optional Speech helper. This environment used `desktop/repackage.mjs` with the verified supplied runtime and rcodesign, then independent ASAR/native/HFS/UDIF checks.

### Application/build files changed or added

{changes}

Additional deliverables include the deployable `collaboration/` service/configuration, versioned studio metadata and legacy normalization, production/reference fixtures and regression tests, dependency licenses, feature matrix and build documentation. Full test logs/proofs are in `Verification/` on the disk image and `verification/` in the source archive. Browser screenshots are internal QA only and are excluded.
'''
(source/'Production-Release-Notes.md').write_text(report);(release/'Production-Release-Notes.md').write_text(report);(out/'DraftCraft-Pro-Table-Read-Report.md').write_text(report)
for name in ['PRODUCTION-FEATURE-MATRIX.md','Production-Build-and-Install.md','Production-Dependencies.md']:shutil.copyfile(source/name,release/name)
for src,dest in [('TABLE-READ.md','Table-Read.md'),('AUTOMATIC-FORMATTING.md','Automatic-Formatting.md'),('AUTOMATIC-PUNCTUATION.md','Automatic-Punctuation.md'),('WRITING-FORMATS.md','Writing-Formats.md'),('CARET-ANIMATION.md','Caret-Animation.md'),('SMART-SAVE.md','Smart-Save.md')]:
 if (source/src).is_file():shutil.copyfile(source/src,release/dest)
shutil.copytree(task/'original-runtime/Third-Party-Licenses',release/'Third-Party-Licenses',dirs_exist_ok=True);shutil.copytree(source/'licenses/production',release/'Third-Party-Licenses/Production',dirs_exist_ok=True)
proof=release/'Verification';proof.mkdir(exist_ok=True)
for file in ['production-macos-proof.json','smart-save-asar-proof.json','production-preservation.json','packaging-tools.json']:shutil.copyfile(v/file,proof/file)
(proof/'tests').mkdir(exist_ok=True)
for p in (v/'story-results').glob('*-tests.log'):shutil.copyfile(p,proof/'tests'/p.name)
shutil.copyfile(v/'story-results/final-tests.json',proof/'tests/final-tests.json')
for folder in ['production-results','table-read-results','automatic-formatting-results','punctuation-results','formats-results','caret-results','smart-save-results']:
 if not (v/folder).exists():continue
 dest=proof/folder;dest.mkdir(exist_ok=True)
 for p in (v/folder).glob('*.json'):shutil.copyfile(p,dest/p.name)
(source/'PRODUCTION-CHECKPOINT.md').write_text('This checkpoint is superseded by the 1.15.0 verified subset delivery. Read Production-Release-Notes.md and PRODUCTION-FEATURE-MATRIX.md for exact implemented, partial and blocked scope. No full Final Draft parity or physical Mac verification is claimed.\n')
entries={};excluded={'node_modules','.git','target','__pycache__','dist','ui-qa','story-qa','UI-refinement','ui-refinement'}
for directory,folders,files in os.walk(source):
 folders[:]=[n for n in folders if n not in excluded]
 for name in files:
  p=Path(directory)/name;rel=p.relative_to(source)
  if name=='.env' or name.startswith('.env.') and name!='.env.example':continue
  if 'verification' in rel.parts and p.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.wav','.mp3','.m4a'}:continue
  entries[Path('DraftCraft-Pro-Source')/rel]=p
for folder in ['dist','Font-Licenses','Spelling-Licenses']:
 for p in (payload/folder).rglob('*'):
  if p.is_file():entries[Path('DraftCraft-Pro-Source')/p.relative_to(payload)]=p
buffer=io.BytesIO()
with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED,6) as z:
 for name,p in sorted(entries.items()):z.writestr(zipfile.ZipInfo.from_file(p,str(name)),p.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=6)
zip_path=out/'DraftCraft-Pro-Table-Read-Source.zip';data=buffer.getvalue()
with zip_path.open('wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
with zipfile.ZipFile(zip_path) as z:
 assert z.testzip() is None
 for p in (payload/'dist').rglob('*'):
  if p.is_file():assert z.read('DraftCraft-Pro-Source/'+p.relative_to(payload).as_posix())==p.read_bytes()
with (release/'DraftCraft-Pro-Source.zip').open('wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
subprocess.run(['node',str(source/'desktop/create-installer.mjs'),str(release)],cwd=source,check=True)
for p in [release/'Install-DraftCraft.command',release/'Support/Sign-macOS.sh']:subprocess.run(['/bin/bash','-n',str(p)],check=True)
summary={'version':'1.15.0','model_tests':models,'interaction_groups':groups,'source_files':len(entries),'source_zip_bytes':len(data),'source_sha256':hashlib.sha256(data).hexdigest(),'asar_header_sha256':asar['asarHeaderSha256'],'tested_payload_sha256':tests['payload_sha256']};(task/'production-assembly.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary),flush=True)
