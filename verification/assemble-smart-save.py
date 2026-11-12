"""Assemble the verified personal macOS release after all release tests pass.

The GUI app must already be signed and its exact ASAR extracted/tested. This
script packages files; verify-dmg.py independently checks the finished image.
Linux prerequisites: libdmg-hfsplus (mode-preserving build) and hfsprogs.
"""
from pathlib import Path
import hashlib,io,json,os,shutil,subprocess,zipfile

source=Path(__file__).resolve().parent.parent
task=source.parent.parent
release=task/'release'
artifacts=task/'deliverables'
artifacts.mkdir(exist_ok=True)
verification=source/'verification'
tests=json.loads((verification/'story-results/final-tests.json').read_text())
assert len(tests['results'])==7 and all(r['passed'] for r in tests['results'])
native=json.loads((verification/'smart-save-native-proof.json').read_text())
asar=json.loads((verification/'smart-save-asar-proof.json').read_text())
assert native['passed'] and asar['passed'] and asar['version']=='1.9.0'
groups=sum(r['interaction_groups'] for r in tests['results'])
models=next(r['tests'] for r in tests['results'] if r['suite']=='models')
report=f'''# DraftCraft Pro 1.9.0 — Smart Save & Recovery

For Apple Silicon Macs, including the Mac mini M2, running macOS 13 or later.
This enhances the existing application. The application identity, project format,
local profile, screenplay editor and previous features are preserved.

## Saving and closing

- First Save opens a native macOS file browser for a `.draftcraft` filename and folder.
- A new, edited screenplay asks **Save / Don’t Save / Cancel** before closing or switching projects. Empty unchanged new screenplays close without a prompt. Canceling either dialog keeps the editor open.
- Saved projects automatically write to their own chosen file: after a 1.5-second pause, every 15 seconds during continuous typing, on focus loss and before closing. Both intervals are configurable. Repeated unchanged writes are skipped.
- **Cmd+S**, **Cmd+Shift+S**, the File menu and Finder open requests share the same document coordinator. Save As to a new location preserves the original. Replacing an existing chosen filename uses the native confirmation.
- Disabling automatic saving restores conventional dirty-document prompts. Don’t Save discards the active unsaved changes and clears their automatic restore slots; historical backups remain available.
- The application retains its existing single screenplay window. AI settings and print windows remain auxiliary windows. Window Close, Cmd+W and app/Dock Quit use the same guarded close flow.

## Data protection

- Primary files use synced sibling temporary files and atomic rename. Writes are serialized, old sessions/revisions are rejected, and Save As supersedes older queued autosaves.
- The previous file is checked before writing and again before committing. External edits produce a conflict instead of a silent overwrite. A missing destination folder is never recreated as a phantom drive.
- **Save Failed** remains visible even when the normal indicator is hidden. Retry, Save As and Cancel Closing preserve an open document when saving fails. A writable primary can still be saved if recovery storage is unavailable.
- Per-session recovery files preserve unreviewed interrupted work. Startup also preserves a differing older local profile before loading the primary file. Review previews the screenplay; Restore and Discard Recovery are explicit actions.
- Recovery that conflicts with a newer primary opens as a separate unsaved copy. Older unique snapshots are flagged for review rather than silently deleted.
- Native `.draftcraft` files retain complete screenplay styles, metadata, character records/shortcuts, Beat Board, outline and hidden/disabled story data. Their version-1 file format is unchanged.

## Settings and existing features

**Settings → Files & Autosave** includes automatic saving, pause/continuous timing,
save-status visibility, recovery controls, review age, recovery management, Reveal
in Finder and Change Location / Save As. Preferences persist across restarts.

Contextual word suggestions for correct and misspelled words, spelling underlines,
space-triggered correction, character autocomplete, custom dictionaries, shortcut
profiles, undo/redo, page actions, Beat Board resizing, story tools, printing and
exports remain available. Story tools remain off by default. Loaded files are not
marked dirty merely because the character index is rebuilt.

## Verification

- TypeScript checking and the production desktop build passed.
- **{models} model/bridge/filesystem tests** passed, including 18 save/coordinator cases using real temporary files, interrupted/permission/full-drive failure injection, disconnected-directory simulation, external conflicts, overlapping saves, session isolation, recovery and two-phase close approval.
- **{groups} browser interaction groups** passed against the exact renderer extracted from the signed application archive. Seven groups connect that renderer to the actual packaged save coordinator and actual temporary files, with injected native-dialog choices.
- Regression checks cover existing editor/page/Beat Board controls, shortcuts, spelling, word suggestions, story structure, formatting, pagination, character memory, undo/redo and printing. Screenplays up to 250 pages were tested; the smart-save test also writes all 1,999 paragraphs and hidden planning data.
- The ASAR contains **{asar['files']} files**, byte-identical to staging and backend source. Header SHA-256: `{asar['asarHeaderSha256']}`.
- Independent checks passed for **{native['mach_o_files']} ARM64 native binaries**, **{native['code_page_hashes']:,} code-page hashes**, **{native['special_slot_hashes']} special-slot hashes**, **{native['resource_hashes']} resource hashes**, **{native['nested_code_seals']} nested code seals**, **{native['resource_seals']} resource seals**, **{native['symlinks']} symlinks** and **{native['unchanged_native_sections']} unchanged native sections**.
- Detailed results, measurements and verification scripts accompany the source and package.

## Install and scope of validation

Open **DraftCraft-Pro-Smart-Save.dmg**, then run **Install-DraftCraft.command** once.
It verifies the supplied package, preserves an existing app copy, installs and
re-signs the local app with macOS tools, verifies it and opens it. Later launches
use Applications → DraftCraft Pro. No Node.js, Rust or development server is needed.
The installer does not erase the existing screenplay profile.

This is an ad-hoc-signed personal build, not an Apple-notarized Developer ID
release. Linux checks do **not** establish physical Mac launch, native save-panel
appearance, real Dock/Cmd+Q interaction, Apple codesign/Gatekeeper approval, actual
removable-volume disconnection or native Finder mounting. Those checks still need
a Mac. Performance measurements are from Linux Chromium, not the physical M2.
The original Rust workspace remains a prototype; this existing GUI uses
Electron/React. Optional Gemini services and their model identifiers were not
validated with a provider account. Offline writing features need no API key.

The finished DMG is checked separately for its UDIF checksums, HFSX catalog modes,
complete decompression, extracted file hashes, symlinks and installer pins. Its
final image hash appears in the external delivered report after image creation.
'''
(release/'Build-Report.md').write_text(report)
(artifacts/'DraftCraft-Pro-Smart-Save-Report.md').write_text(report)
for name,target in [('smart-save-native-proof.json','macos-signatures.json'),('smart-save-asar-proof.json','asar-integrity.json')]:
    shutil.copyfile(verification/name,release/'Verification'/target)
(release/'Verification/tests').mkdir(exist_ok=True)
for name in ['final-tests.json','models-tests.log','story-tests.log','editor-tests.log','shortcuts-tests.log','words-tests.log','spelling-tests.log','smart-save-tests.log']:
    shutil.copyfile(verification/'story-results'/name,release/'Verification/tests'/name)
shutil.copytree(verification/'smart-save-results',release/'Verification/smart-save',dirs_exist_ok=True)
shutil.copyfile(verification/'smart-save-unit.log',release/'Verification/save-unit-tests.log')

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
    z.writestr('DraftCraft-Pro-Source/SMART-SAVE-REPORT.md',report)
zip_path=artifacts/'DraftCraft-Pro-Smart-Save-Source.zip'
zip_path.write_bytes(archive.getvalue())
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    for file in (payload/'dist').rglob('*'):
        if file.is_file():assert z.read('DraftCraft-Pro-Source/'+file.relative_to(payload).as_posix())==file.read_bytes()
shutil.copyfile(zip_path,release/'DraftCraft-Pro-Source.zip')
subprocess.run(['node',str(source/'desktop/create-installer.mjs'),str(release)],cwd=source,check=True)
subprocess.run(['/bin/bash','-n',str(release/'Install-DraftCraft.command')],check=True)
subprocess.run(['/bin/bash','-n',str(release/'Support/Sign-macOS.sh')],check=True)
summary={'version':'1.9.0','model_tests':models,'browser_groups':groups,'source_files':len(entries)+1,'source_zip_bytes':zip_path.stat().st_size,'source_sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'asar_header_sha256':asar['asarHeaderSha256']}
(task/'assembly.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary),flush=True)
