"""Assemble 1.11.0 after the exact signed payload passes all release suites.

The separate verify-dmg.py validates the resulting UDIF and HFSX round trip.
This script does not claim a native Mac launch or notarization.
"""
from pathlib import Path
import hashlib,io,json,os,plistlib,shutil,struct,subprocess,zipfile

source=Path(__file__).resolve().parent.parent
task=source.parent.parent
release=task/'release'
artifacts=task/'deliverables'
artifacts.mkdir(exist_ok=True)
v=source/'verification'
payload=task/'release-payload'
tests=json.loads((v/'story-results/final-tests.json').read_text())
assert len(tests['results'])==9 and all(r['passed'] for r in tests['results'])
native=json.loads((v/'formats-macos-proof.json').read_text())
asar=json.loads((v/'smart-save-asar-proof.json').read_text())
printing=json.loads((v/'formats-results/print-proof.json').read_text())
pixels=json.loads((v/'caret-results/native-reference.json').read_text())
assert native['passed'] and asar['passed'] and printing['passed'] and pixels['passed']
assert asar['version']=='1.11.0' and asar['files']==80
models=next(r['tests'] for r in tests['results'] if r['suite']=='models')
groups=sum(r['interaction_groups'] for r in tests['results'])
assert models==96 and groups==107
catalog=json.loads((v/'format-catalog-summary.json').read_text())
assert len(catalog)==80
measure=next(r['measurements'][0] for r in tests['results'] if r['suite']=='formats')
app=release/'DraftCraft Pro.app'
info=plistlib.loads((app/'Contents/Info.plist').read_bytes())
previous=plistlib.loads((task/'baseline/DraftCraft Pro.app/Contents/Info.plist').read_bytes())
assert info['CFBundleIdentifier']==previous['CFBundleIdentifier']
assert info['CFBundleShortVersionString']=='1.11.0'
assert info['LSMinimumSystemVersion']=='13.0'
for p in app.rglob('*'):
    if not p.is_file() or p.is_symlink():continue
    with p.open('rb') as f:head=f.read(12)
    if head[:4]==b'\xcf\xfa\xed\xfe':assert struct.unpack_from('<I',head,4)[0]==0x0100000c

report=f'''# DraftCraft Pro 1.11.0 — Writing Formats & Intelligent Formatting

Updated working application package for **Apple Silicon, macOS 13 or later**.
It extends the existing Electron/React application, retains the existing bundle
identity and native runtime, and preserves native projects and previous features.
The Rust prototype is retained unchanged. This is an independently implemented
formatting system, not a reproduction of Final Draft's proprietary templates.

## Operational features

- **80 built-in presets** across Script, TV, Graphic Novel, Structure and Text, plus **My Templates** for custom formats. Film, theatre, musicals, episodic television, comics, prose and planning presets contain editable semantic rules. Related presets can share baseline rules; named house formats are independent adaptations unless specific public facts were verified. The complete catalogue and source notes accompany this release.
- **Template browser:** File → New from Template; Format → Apply Template / Change Screenplay Format. Search, categories, favorites, recents, supported elements, typography, page geometry and real page previews are connected to the writing engine.
- **Whole-document format conversion:** before/after preview and explicit confirmation; preserves written text, paragraph/scene identities, annotations and existing story/project metadata. Meaningful types are mapped, and incompatible classifications remain visible for review. Conversion creates an independent recoverable checkpoint and is one undoable/redoable document transaction. The chosen format, version and full style overrides persist in native project files.
- **29 semantic elements and editable styles:** font, size, emphasis, case display, alignment, left/right/first-line indents, paragraph and line spacing, page breaks, keep-with-next, Enter/Tab transitions and named custom elements. Format → Elements applies changes globally without rewriting prose. Existing customizable keyboard profiles expose the element shortcuts, including Cmd+0–7.
- **Deterministic offline auto-formatting:** Smart mode defaults to unambiguous recognition, with lightweight offers for uncertain character/shot cues. Standard and Manual modes are available. Explicit manual element choices are protected. Recognition uses the selected screenplay, TV, stage, comic or prose format and updates affected paragraphs rather than reclassifying the whole document on every keypress.
- **Contextual Enter/Tab:** screenplay heading → Action, Character → Dialogue, Dialogue → Action, parenthetical → Dialogue, transition → heading; template-specific overrides for theatre and comics. Dialogue Tab inserts matching parentheses with the insertion point inside. Scene-heading Tab advances fields. Option+Tab is literal; ordinary prose retains normal tabs and avoids screenplay inference.
- **SmartType:** character and location memory, scene introductions, times, extensions, transitions, optional scene-local next-speaker prediction, keyboard/mouse selection, usage/alphabetic sorting, per-category switches, editable entries, exclusions/rebuild and configurable acceptance keys. Document → SmartType Manager is wired into the existing autocomplete engine. Character renaming still requires confirmation before propagation.
- **Planning structures:** applying a Structure preset appends editable beats and linked Outline records without deleting or converting screenplay text. Existing Beat Board, Navigator, Story Map, Story Arc and outline workflows remain available.
- **Custom templates:** save, duplicate, rename, delete, set default, import and export `.dctemplate`. Styles, layout, title-page choice, headers/footers, continuation options, SmartType preferences, shortcut profile and planning data can be captured. Sample script text and character/location history can be excluded.
- **Template-aware pages and export:** real page dimensions/margins, scene numbering, explicit act/scene breaks, heading/cue protection, headers/footers and paragraph-boundary continuation cues. HTML printing shares editor page chunks. RTF export uses the selected body styles, page geometry and Unicode. Prose text export avoids screenplay indentation.
- **Interchange:** native `.draftcraft`; supported FDX/FDXT XML paragraph types, all direct text runs, emphasis, notes, scene numbers, title metadata and selected layout settings; Fountain core structure; TXT; text/Unicode-focused RTF import. Unknown XML element text is retained as a custom element. DraftCraft metadata supports its own FDX round trip. Unsupported fields are handled without claiming full compatibility.

## Previous functionality retained

The existing editor, page actions, Beat Board resizing, story tools, smooth caret,
spelling underlines and Space correction, contextual synonyms for correct and
misspelled words, character autocomplete, custom dictionaries, clipboard, undo/
redo, shortcut profiles, autosave, native Save/Save As, recovery and guarded close
workflows remain integrated. Existing documents without a selected writing-format
definition keep the legacy layout path until the writer explicitly applies one.
No core writing feature requires a paid AI service.

## Verification of the delivered payload

- TypeScript checking and the production desktop build passed.
- **{models} automated model/bridge/filesystem tests passed**, including 18 new format cases, persistence/conversion invariants, all template definitions, semantic recognition, Unicode RTF export/import, native save-coordinator recovery and preserved pre-conversion checkpoints. Existing spelling, synonym, caret, shortcut and project-file tests pass.
- **{groups} browser interaction groups passed in nine sequential suites**, using the exact renderer extracted from the signed application archive. The new 18 format groups cover heading/Return, character/dialogue/parentheticals, SmartType, manual protection, 20-scene conversion and atomic Undo/Redo, TV double spacing and act rules, comic numbering, shared planning structures, global element edits/reload, custom templates, FDX round trip, prose tabs, inference modes, imports, printing and long-script typing.
- Existing suites exercise page actions, Beat Board, all 29 element shortcuts, word suggestions, spelling, saving/recovery and smooth caret behavior. Scripts up to **250 pages / 1,999 paragraphs** were used. The template-aware typing check used **{measure['pages']} pages / {measure['paragraphs']:,} paragraphs**, with automation round-trip p50 **{measure['typingMs']['p50']} ms**, p95 **{measure['typingMs']['p95']} ms**, no lost test characters and one active smooth-caret layer. These are Linux Chromium measurements, not M2 hardware benchmarks.
- BBC A4 print validation produced **{printing['pdfPages']} PDF pages** from **{printing['editorPages']} editor pages plus a title page**, with the final source paragraph retained. This tests Chromium printing, not the native macOS print dialog. FDX/Fountain fixtures include independently authored examples; no exhaustive Final Draft-generated corpus was available.
- The smooth caret was compared with actual Chromium native-caret pixels for combining-script/emoji text. The native/custom position and height matched within the test tolerances. Internal screenshots are excluded from deliverables.
- ASAR: **{asar['files']} files**, byte-identical to staging and backend source. Header SHA-256: `{asar['asarHeaderSha256']}`.
- Independent signature/resource checks passed for **{native['mach_o_files']} ARM64 native binaries**, **{native['code_page_hashes']:,} code-page hashes**, **{native['special_slot_hashes']} special-slot hashes**, **{native['resource_hashes']} resource hashes**, **{native['nested_code_seals']} nested code seals**, **{native['resource_seals']} resource seals**, **{native['symlinks']} symlinks** and **{native['unchanged_native_sections']} unchanged native sections. The Electron framework bytes match the previous release.
- Full test logs, catalogue rules, reference notes, signature/ASAR proofs and verification scripts accompany the source. The finished image is independently checked for HFSX consistency/catalog modes, complete UDIF decompression and CRCs, extracted bytes/symlinks and installer pins; final image results are appended to the external report after packaging.

## Remaining limitations

This release does **not** claim complete Final Draft 13 parity. Individual long
paragraphs are kept intact rather than split across editor page inputs. Oversized
paragraphs receive preview warnings; proportional-font pagination is approximate.
Complete production dual-dialogue reflow, locked/A-B page numbering, widow/orphan
rules within a paragraph, and every MORE/CONT'D convention remain incomplete.
Continuation cues currently operate at paragraph boundaries.

BBC/Dramatists Guild/Dark Horse public facts inform selected presets. Exact
proprietary Cole and Haag, Warner Brothers, TV-show and other house layouts were
not verified; these are editable independent equivalents. Named structure beats
are adaptations with original content, not copied instructional materials.
Cast lists are semantic editable content, not a complete per-scene cast-report
generator. Language variants set metadata/fonts; they neither translate the script
nor install additional spelling dictionaries.

FDX/FDXT is a supported subset, not lossless coverage of all Final Draft fields,
assets or settings. Fountain's complete inline emphasis/edge-case syntax is not
covered. RTF import focuses on text/Unicode, not all rich styles or embedded
objects. **PDF import is not implemented.** Copied custom-template planning
anchors may need relinking; conversion within an existing project retains IDs.

The quick PDF exporter uses a limited core-font repertoire. Use system Print /
Save as PDF for installed custom fonts, CJK or oversized paragraphs. Native
macOS launch, Finder mount, Apple codesign/Gatekeeper assessment, native print/
save dialogs, physical IME, VoiceOver, a 120 Hz display and M2 memory behavior
were unavailable for testing here. The build is ad-hoc signed, not Developer ID
signed or Apple-notarized. Optional Gemini services were not account-tested.

## Install

Open **DraftCraft-Pro-Writing-Formats.dmg**, then run **Install-DraftCraft.command**
once. It checks package hashes, keeps a backup of an existing app, installs a copy,
re-signs it using native macOS tools, verifies it and opens it. Later launches use
Applications → DraftCraft Pro. No Node.js, Rust or development server is required.
Scripts and the existing profile are retained. See Getting-Started.txt for the
existing personal-build installation workflow and macOS Open Anyway guidance.

## Source and references

Install root dependencies with `npm ci --legacy-peer-deps` and desktop dependencies
with `npm ci --prefix desktop`. Run `npm run lint` and `node desktop/build.cjs`.
Use the existing macOS packaging/signing workflow. Release checks run through
`verification/run-release-tests.py` with `DRAFTCRAFT_DIST`, `BROWSER_EXE` and, when
needed, `PLAYWRIGHT_MODULE`; native-caret pixel verification also uses Pillow.

Public primary references: [Final Draft templates](https://www.finaldraft.com/support/script-templates/),
[Element Settings](https://kb.finaldraft.com/hc/en-us/articles/15575057137812-How-can-I-change-a-script-s-formatting),
[shortcuts](https://kb.finaldraft.com/hc/en-us/articles/27977488282644-What-keyboard-shortcuts-can-I-use-in-Final-Draft),
[SmartType](https://www.finaldraft.com/blog/using-final-draft-smarttype-maximizing-efficiency-and-consistency-in-your-final-draft-workflow),
[BBC screenplay](https://downloads.bbc.co.uk/writersroom/scripts/screenplay.pdf),
[BBC television](https://downloads.bbc.co.uk/writersroom/scripts/screenplaytv.pdf),
[Dramatists Guild](https://www.dramatistsguild.com/script-formats),
[Dark Horse](https://images.darkhorse.com/darkhorse08/company/submissions/DHScriptFormatGuides.pdf),
and [Fountain syntax](https://fountain.io/syntax/).
See `verification/FORMATTING-REFERENCE-NOTES.md` for source-specific boundaries.
'''
(source/'WRITING-FORMATS-REPORT.md').write_text(report)
(release/'Build-Report.md').write_text(report)
(artifacts/'DraftCraft-Pro-Writing-Formats-Report.md').write_text(report)
shutil.copytree(task/'baseline/Third-Party-Licenses',release/'Third-Party-Licenses',dirs_exist_ok=True)
for src,dst in [('desktop/Getting-Started.txt','Getting-Started.txt'),('WRITING-FORMATS.md','Writing-Formats.md'),('CARET-ANIMATION.md','Caret-Animation.md'),('SMART-SAVE.md','Smart-Save.md')]:shutil.copyfile(source/src,release/dst)
proof=release/'Verification'
proof.mkdir(exist_ok=True)
for src,dst in [('formats-macos-proof.json','macos-signatures.json'),('smart-save-asar-proof.json','asar-integrity.json'),('format-catalog-summary.json','format-catalog.json'),('FORMATTING-REFERENCE-NOTES.md','Formatting-References.md')]:shutil.copyfile(v/src,proof/dst)
(proof/'tests').mkdir(exist_ok=True)
for src in (v/'story-results').glob('*-tests.log'):shutil.copyfile(src,proof/'tests'/src.name)
shutil.copyfile(v/'story-results/final-tests.json',proof/'tests/final-tests.json')
for folder in ['formats-results','caret-results','smart-save-results']:
    dest=proof/folder;dest.mkdir(exist_ok=True)
    for src in (v/folder).glob('*.json'):shutil.copyfile(src,dest/src.name)
(proof/'platform.json').write_text(json.dumps({'passed':True,'version':'1.11.0','bundle_identifier':info['CFBundleIdentifier'],'identity_preserved':True,'architecture':'arm64','minimum_macos':info['LSMinimumSystemVersion'],'physical_mac_launch_tested':False},indent=2)+'\n')

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
zip_path=artifacts/'DraftCraft-Pro-Writing-Formats-Source.zip'
zip_path.write_bytes(archive.getvalue())
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    assert 'DraftCraft-Pro-Source/desktop/icon.png' in z.namelist()
    for file in (payload/'dist').rglob('*'):
        if file.is_file():assert z.read('DraftCraft-Pro-Source/'+file.relative_to(payload).as_posix())==file.read_bytes()
(release/'DraftCraft-Pro-Source.zip').write_bytes(zip_path.read_bytes())
subprocess.run(['node',str(source/'desktop/create-installer.mjs'),str(release)],cwd=source,check=True)
for script in [release/'Install-DraftCraft.command',release/'Support/Sign-macOS.sh']:subprocess.run(['/bin/bash','-n',str(script)],check=True)
summary={'version':'1.11.0','model_tests':models,'browser_groups':groups,'built_in_templates':80,'semantic_elements':29,'source_files':len(entries),'source_zip_bytes':zip_path.stat().st_size,'source_sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'asar_header_sha256':asar['asarHeaderSha256']}
(task/'assembly.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary),flush=True)
