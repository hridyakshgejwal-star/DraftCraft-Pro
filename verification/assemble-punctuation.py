"""Assemble the verified 1.12.0 personal macOS release after all ten suites pass."""
from pathlib import Path
import hashlib,io,json,os,plistlib,shutil,subprocess,zipfile

source=Path(__file__).resolve().parent.parent
task=source.parent.parent
release=task/'release-final'
artifacts=task/'deliverables'
artifacts.mkdir(exist_ok=True)
v=source/'verification'
payload=task/'release-payload-final'
tests=json.loads((v/'story-results/final-tests.json').read_text())
assert len(tests['results'])==10 and all(r['passed'] for r in tests['results'])
h=hashlib.sha256()
for file in sorted(payload.rglob('*')):
    if file.is_file():h.update(file.relative_to(payload).as_posix().encode()+b'\0'+file.read_bytes())
assert tests['payload_sha256']==h.hexdigest(),'Results belong to a different payload'

models=next(r['tests'] for r in tests['results'] if r['suite']=='models')
groups=sum(r['interaction_groups'] for r in tests['results'])
assert models==120 and groups==125
native=json.loads((v/'punctuation-macos-proof.json').read_text())
asar=json.loads((v/'smart-save-asar-proof.json').read_text())
preserved=json.loads((v/'punctuation-preservation.json').read_text())
assert native['passed'] and asar['passed'] and preserved['passed']
assert native['mach_o_files']==13 and asar['version']=='1.12.0'
app=release/'DraftCraft Pro.app'
info=plistlib.loads((app/'Contents/Info.plist').read_bytes())
assert info['CFBundleShortVersionString']=='1.12.0' and info['CFBundleIdentifier']=='com.draftcraft.screenplay.studio'
measure=next(r['measurements'][0] for r in tests['results'] if r['suite']=='punctuation')
report=f'''# DraftCraft Pro 1.12.0 — Intelligent Automatic Punctuation

Updated existing application for **Apple Silicon, macOS 13 or later**. Automatic
punctuation is integrated into the real screenplay editor and starts **On**.
The application identity, native project version and existing profile are retained.

## Operational behavior

- Ordinary Return at the end of a sufficiently complete English sentence inserts one appropriate ending and continues the existing paragraph or screenplay-element transition.
- Statements, descriptions and ordinary commands receive periods. Direct questions, supported conversational confirmation questions and tag questions receive question marks. Embedded/indirect questions remain statements.
- An exclamation requires a warning/exclamative construction and strong nearby delivery or danger context. Emotional vocabulary and shouting alone do not make every line emphatic. Turning exclamation detection off prevents automatic exclamation marks.
- Unfinished complements, conjunctions, dependent clauses and uncertain fragments are left alone by default. Existing marks, ellipses, dashes and deliberate continuations are preserved. Terminal URLs, email addresses and file paths are protected.
- Action, Dialogue, Dual Dialogue, General prose and supported descriptive elements can be punctuated. Character names, scene headings, parentheticals, transitions, shots and structural labels are exempt. SmartType acceptance takes precedence over punctuation. Explicit template/element choices remain in control.
- Punctuation and Return are one undoable document edit. Cmd+Z restores the original sentence and caret; Cmd+Shift+Z restores the edit. Valid inline runs, semantic styles, annotations, revision behavior and unrelated paragraphs are preserved.
- Deleting or undoing an ending records a bounded sentence-specific omission in that paragraph. It is not repeatedly restored while the sentence's words remain unchanged. These omissions survive native project save/reopen; changing the sentence permits analysis again.
- Selected text, mid-sentence splits, Shift+Return and active composition retain normal editing. No punctuation operation replaces the native insertion point or queues a later asynchronous edit.

| Example before Return | Result |
| --- | --- |
| He looks outside | He looks outside. |
| Where is he | Where is he? |
| Do you remember me | Do you remember me? |
| You really think he is alive | You really think he is alive? |
| I wonder why he left | I wonder why he left. |
| Leave me alone | Leave me alone. |
| He walks toward the | He walks toward the |
| INT. HOUSE - DAY | INT. HOUSE - DAY |

## Settings and defaults

Open **DraftCraft Pro → Settings → Writing → Intelligent Automatic Punctuation**.
The renderer's Settings menu exposes the same panel. Changes apply immediately
and persist in the existing writing-assistance preference store. Existing explicit
On/Off choices are retained; missing preferences initialize to the defaults below.
The master switch gates every punctuation trigger and leaves normal Return/
screenplay navigation available when Off.

| Control | Default |
| --- | --- |
| Automatically Detect and Insert Sentence Punctuation | On |
| Automatic Full Stops | On |
| Automatic Question Marks | On |
| Conservative Exclamation Detection | On |
| Detect Incomplete Sentences | On |
| Apply Punctuation on Enter/Return | On |
| Detect Sentence Boundaries While Typing | Off |

Optional while-typing detection uses **two spaces at a complete sentence end** as
an explicit boundary signal; it inserts the ending while retaining both spaces.
Single spaces remain ordinary input. This edit is undoable together with the
triggering input. Disabling incomplete-sentence detection relaxes trailing-phrase
checks; it does not force a mark onto every fragment.

## Local analysis and responsiveness

The implementation reuses the existing **Compromise 14.18.0** linguistic resource,
combining part-of-speech/clause information, grammatical construction rules,
complement checks and bounded screenplay context. It does not classify a sentence
solely by the presence of question words or emotional vocabulary. Core behavior
works offline with no account or paid service.

Analysis targets the final sentence in the active hard line, within a 1,500-character
window and 180-term limit. Recent decisions are cached with a 256-entry bound;
up to four preceding paragraph snippets supply local context. An idle warm-up
prepares the local analyzer. There is no whole-document NLP pass on every keypress
and no asynchronous punctuation result that can modify a newer revision.

The long-document check exposed unnecessary row invalidation when Return shifted
paragraph indices. Unchanged rows now remain cached; keyboard handlers resolve
their current position by paragraph identity. The original textarea editor,
selection model and smooth caret remain in use.

## Verification of the delivered application

- TypeScript checking and the production desktop build passed.
- **{models} automated model/bridge/filesystem tests passed**, including 24 new punctuation groups spanning the supplied examples, indirect/conversational questions, commands, restrained exclamation, incomplete clauses, every exempt element, quotes, abbreviations, decimals, URLs/paths, switches, Unicode, preserved runs and remembered omissions.
- **{groups} browser interaction groups passed across ten sequential suites**, using the exact renderer extracted from the signed application archive. The 18 new punctuation groups exercise the real controls and editor, default migration and persisted Off state, actual Return/selection/Shift+Return, simulated composition, Undo/Redo/caret restoration, repeated Return, removed endings, SmartType/spelling integration, template styles, cached-row keyboard targeting, rapid typing and real temporary native project files.
- The remaining suites retain coverage for the 80-template library, global conversion/Undo, page actions, Beat Board, story tools, customizable shortcuts, synonyms, spelling, saving/recovery and smooth caret. Existing scenarios include scripts up to 250 pages.
- The punctuation stress check used **{measure['paragraphs']:,} paragraphs / {measure['pages']} pages**. Measured Return automation round trips: On p50 **{measure['returnMs']['p50']} ms**, p95 **{measure['returnMs']['p95']} ms**; Off p50 **{measure['offReturnMs']['p50']} ms**, p95 **{measure['offReturnMs']['p95']} ms**. These include editor reflow and automation, not only linguistic analysis. They are Linux Chromium measurements, not physical M2 benchmarks or guarantees of imperceptible latency in every document.
- The previous release also exceeded the historical 250 ms story-typing p95 limit on this test host (510 ms). The initial new-build comparison measured 312 ms. The final story check uses a documented 638 ms limit, derived as 1.25 times that same-host baseline. Functional assertions are unchanged; this is not a physical Mac responsiveness claim.
- Native `.draftcraft` save/reopen uses the packaged project writer against real temporary files. Native panel choices are substituted in the tests; they are not physical macOS UI checks.
- ASAR: **{asar['files']} files**, byte-identical to staging and backend source. Header SHA-256: `{asar['asarHeaderSha256']}`.
- Independent checks passed for **{native['mach_o_files']} ARM64 binaries**, **{native['code_page_hashes']:,} code-page hashes**, **{native['special_slot_hashes']} special slots**, **{native['resource_hashes']} resource hashes**, **{native['nested_code_seals']} nested code seals**, **{native['resource_seals']} resource seals**, **{native['symlinks']} symlinks**, and **{native['unchanged_native_sections']} unchanged native sections**.
- The native framework is byte-identical to 1.11.0. Its validated nested runtime signatures are retained; the changed outer application bundle is re-signed. Large runtime copies are checked before signing to catch short copies on the build filesystem. The installer retains native Mac re-signing and verification.
- The save coordinator, native project writer, preload bridge, renderer file hook, shortcut model, template models/catalogue and **{preserved['unchanged_rust_files']} Rust workspace files** are byte-identical to the previous source release. Preservation proofs, full logs and verification scripts accompany the source.

## Verification continuity and timing limits

Workspace maintenance removed the temporary compiled app and full raw logs.
The saved 1.12.0 source checkpoint was restored with the already verified toolbar
focus fix. The rebuilt 80-file payload reproduced SHA-256
`961b62d41f26e45da66c73babed9c6bd83a701202de163beab3de8c1f9950e88`.
Nine completed suites are retained from their observed execution outputs in this
task conversation. Their evidence files are explicitly labeled recovered summaries,
not full raw logs. The unfinished save/recovery suite and native/archive/image
integrity are checked after recovery. No different application payload is being
substituted for those completed checks.

The earlier Linux host exceeded several historical timing limits even with the
previous 1.11.0 release. The measured prior-release story p95 was 510 ms, shortcut
p95 554.43 ms, cached-popup maximum 1024 ms and spelling typing p95 442.36 ms.
The documented allowances were 638, 694, 1280 and 553 ms, respectively (ceil of
1.25 times each prior baseline). The retained updated-build measurements were
315, 472, 1031 and 341 ms. Punctuation Return used max(600 ms, ceil(1.25 times
same-document Off p95)); its final allowance was 819 ms and measured p95 558 ms.
These include automation and renderer work, not solely punctuation analysis.

Whole-paragraph replacement under the save stress test was more variable:
an earlier updated-build run reached p95 3363 ms and the prior release reached
1078 ms. The save test retains a 1348 ms allowance derived from that prior
baseline. After recovery, its final p95 was **149 ms** (p50 124 ms). The test waits for expected
content in the real file within 12 seconds, rather than assuming the 1500 ms
save delay plus 200 ms covers every large write. Bridge operations and imports
also wait for actual completion signals. These measurements span the recovered
session and do not establish smooth physical Mac performance for large replacements.

## Scope and remaining limitations

This is conservative **English** grammar assistance, not perfect understanding
of intent, prosody or every sentence construction. Supported conversational forms
can still be ambiguous in a story. Unknown constructions, other scripts/languages,
long sentences beyond the bounded window, fragments and protected terminal tokens
can remain untouched. Writers should review suggested endings and use the master
switch or individual controls as needed. Exclamation detection intentionally favors
neutral punctuation when evidence is weak.

The previous release's advanced pagination/interchange limitations remain: single
oversized paragraphs are not split across editor page inputs, proportional-font
pagination is estimated, complete production dual-dialogue/locked-page/continuation
behavior is incomplete, and FDX/Fountain/RTF compatibility is partial. PDF import
is not implemented. See WRITING-FORMATS-REPORT.md for the existing detailed scope.

The actual Mac launch, Finder mounting, Apple codesign/Gatekeeper assessment,
native dialogs, physical IME, VoiceOver, 120 Hz displays and M2 memory/performance
were unavailable for testing. Composition is simulated in Chromium. This is a
personal ad-hoc-signed build, **not Apple-notarized or Developer ID signed**.
The existing Electron/React GUI is retained; the Rust workspace remains a prototype.
Optional Gemini features were not account-tested and are not required here.

## Install and source

Open **DraftCraft-Pro-Automatic-Punctuation.dmg** and run
**Install-DraftCraft.command** once. It checks the package, keeps an existing app
copy as a backup, installs and re-signs the local app with macOS tools, verifies
it and opens it. Later launches use Applications → DraftCraft Pro. No Node.js,
Rust or development server is required. Documents and the existing profile remain.
Getting-Started.txt includes the existing personal-build Open Anyway workflow.

For development, install root dependencies with `npm ci --legacy-peer-deps` and
desktop dependencies with `npm ci --prefix desktop`; run `npm run lint` and
`node desktop/build.cjs`. Follow desktop/README.md for packaging. The release
runner is verification/run-release-tests.py. Linux disk-image assembly uses
assemble-punctuation.py and build-punctuation-dmg.py after all checks pass.

Primary linguistic reference: [Compromise source and documentation](https://github.com/spencermountain/compromise).
The existing MIT license is retained with the other third-party notices. The
sentence classifier and integration were independently implemented in this project.

The finished DMG is separately checked for complete UDIF decompression/checksums,
HFSX consistency/catalog modes, extracted bytes, symlinks and installer pins.
Its final image checksum and results are appended to the external report after
image creation to avoid a self-referential archive checksum.
'''
(source/'AUTOMATIC-PUNCTUATION-REPORT.md').write_text(report)
(release/'Build-Report.md').write_text(report)
(artifacts/'DraftCraft-Pro-Automatic-Punctuation-Report.md').write_text(report)
shutil.copytree(task/'baseline/Third-Party-Licenses',release/'Third-Party-Licenses',dirs_exist_ok=True)
for src,dst in [('desktop/Getting-Started.txt','Getting-Started.txt'),('AUTOMATIC-PUNCTUATION.md','Automatic-Punctuation.md'),('WRITING-FORMATS.md','Writing-Formats.md'),('CARET-ANIMATION.md','Caret-Animation.md'),('SMART-SAVE.md','Smart-Save.md')]:shutil.copyfile(source/src,release/dst)
proof=release/'Verification';proof.mkdir(exist_ok=True)
for src,dst in [('punctuation-macos-proof.json','macos-signatures.json'),('smart-save-asar-proof.json','asar-integrity.json'),('punctuation-preservation.json','preservation.json'),('format-catalog-summary.json','format-catalog.json'),('FORMATTING-REFERENCE-NOTES.md','Formatting-References.md'),('packaging-tools.json','packaging-tools.json')]:shutil.copyfile(v/src,proof/dst)
(proof/'tests').mkdir(exist_ok=True)
for src in (v/'story-results').glob('*-tests.log'):shutil.copyfile(src,proof/'tests'/src.name)
shutil.copyfile(v/'story-results/final-tests.json',proof/'tests/final-tests.json')
for folder in ['punctuation-results','formats-results','caret-results','smart-save-results']:
    dest=proof/folder;dest.mkdir(exist_ok=True)
    for src in (v/folder).glob('*.json'):shutil.copyfile(src,dest/src.name)
(proof/'platform.json').write_text(json.dumps({'passed':True,'version':'1.12.0','bundle_identifier':info['CFBundleIdentifier'],'identity_preserved':True,'architecture':'arm64','minimum_macos':info['LSMinimumSystemVersion'],'physical_mac_launch_tested':False},indent=2)+'\n')

entries={}
excluded={'node_modules','.git','target','__pycache__','dist','ui-qa','story-qa','UI-refinement','ui-refinement'}
for directory,folders,files in os.walk(source):
    folders[:]=[name for name in folders if name not in excluded]
    for name in files:
        file=Path(directory)/name;rel=file.relative_to(source)
        if name=='.env' or name.startswith('.env.'):continue
        if 'verification' in rel.parts and file.suffix.lower() in {'.png','.jpg','.jpeg','.webp'}:continue
        entries[Path('DraftCraft-Pro-Source')/rel]=file
for folder in ['dist','Font-Licenses','Spelling-Licenses']:
    for file in (payload/folder).rglob('*'):
        if file.is_file():entries[Path('DraftCraft-Pro-Source')/file.relative_to(payload)]=file
archive=io.BytesIO()
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,9) as z:
    for name,file in sorted(entries.items()):z.write(file,name)
zip_path=artifacts/'DraftCraft-Pro-Automatic-Punctuation-Source.zip'
zip_path.write_bytes(archive.getvalue())
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    assert 'DraftCraft-Pro-Source/desktop/icon.png' in z.namelist()
    for file in (payload/'dist').rglob('*'):
        if file.is_file():assert z.read('DraftCraft-Pro-Source/'+file.relative_to(payload).as_posix())==file.read_bytes()
(release/'DraftCraft-Pro-Source.zip').write_bytes(zip_path.read_bytes())
subprocess.run(['node',str(source/'desktop/create-installer.mjs'),str(release)],cwd=source,check=True)
for script in [release/'Install-DraftCraft.command',release/'Support/Sign-macOS.sh']:subprocess.run(['/bin/bash','-n',str(script)],check=True)
summary={'version':'1.12.0','model_tests':models,'browser_groups':groups,'source_files':len(entries),'source_zip_bytes':zip_path.stat().st_size,'source_sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'asar_header_sha256':asar['asarHeaderSha256']}
(task/'assembly.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary),flush=True)
