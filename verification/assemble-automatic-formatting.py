"""Assemble 1.13.0 from the exact verified app and eleven fresh release suites."""
from pathlib import Path
import hashlib,io,json,os,plistlib,shutil,subprocess,zipfile
source=Path(__file__).resolve().parent.parent
task=source.parent.parent;release=task/'release-final';artifacts=task/'deliverables';artifacts.mkdir(exist_ok=True)
v=source/'verification';payload=task/'release-payload-final'
tests=json.loads((v/'story-results/final-tests.json').read_text())
assert len(tests['results'])==11 and all(r['passed'] for r in tests['results'])
assert not tests['recovered_after_workspace_maintenance'],'This release requires fresh full logs'
h=hashlib.sha256()
for p in sorted(payload.rglob('*')):
 if p.is_file():h.update(p.relative_to(payload).as_posix().encode()+b'\0'+p.read_bytes())
assert tests['payload_sha256']==h.hexdigest(),'Tests belong to a different app'
models=next(r['tests'] for r in tests['results'] if r['suite']=='models');groups=sum(r['interaction_groups'] for r in tests['results'])
auto=next(r for r in tests['results'] if r['suite']=='automatic-formatting');assert models==134 and auto['interaction_groups']==25
measure=auto['measurements'][0];story=next(r['measurements'][0] for r in tests['results'] if r['suite']=='story')
native=json.loads((v/'automatic-formatting-macos-proof.json').read_text());asar=json.loads((v/'smart-save-asar-proof.json').read_text());preserved=json.loads((v/'automatic-formatting-preservation.json').read_text())
assert native['passed'] and asar['passed'] and preserved['passed'] and native['mach_o_files']==13 and asar['version']=='1.13.0'
app=release/'DraftCraft Pro.app';info=plistlib.loads((app/'Contents/Info.plist').read_bytes());assert info['CFBundleShortVersionString']=='1.13.0' and info['CFBundleIdentifier']=='com.draftcraft.screenplay.studio'
changed='\n'.join('- `'+s+'`' for s in preserved['new_files']+preserved['changed_files'])
rows='\n'.join(f"| {r['suite']} | {r.get('tests',r['interaction_groups'])} | {r['seconds']} |" for r in tests['results'])
report=f'''# DraftCraft Pro 1.13.0 — Automatic Screenplay Formatting

An update to the existing **DraftCraft Pro 1.12.0** application for **Apple Silicon,
macOS 13 or later**. The same application identity, Electron/React textarea editor,
project format and existing profile are retained. All four automatic features are
operational and On by default. A previously saved capitalization choice is retained.

## Implemented in the real editor

- **Sentence capitalization:** a newly typed sentence initial in Action, Dialogue,
  General and supported descriptive elements becomes uppercase immediately.
  Common abbreviations, initials/acronyms, decimals, ellipses, URLs, file components,
  pasted text and composition do not become false sentence boundaries. Existing
  text and proper capitals are preserved. Undo or a deliberate lowercase replacement
  retains the writer's choice. The native caret stays at the correct UTF-16 offset.
- **Scene headings:** supported INT/EXT/INT./EXT./I/E prefixes normalize their
  periods and spacing; the active template supplies casing and the location/time
  separator. For example, `int living room evening` + Return becomes
  `INT. LIVING ROOM - EVENING`. Multiword locations, US-101-style internal hyphens,
  repeated separators and user-defined time labels are handled. No dash is inserted
  between prefix and location. The time separator waits for a completion boundary,
  protecting location words such as DAYCARE and NIGHTINGALE while typing.
- **Parentheticals:** Cmd+4, toolbar, command palette, Format menu and contextual
  Tab/Return navigation create `()` with the actual insertion selection `[1,1]`.
  Selected text is wrapped, remains selected and keeps valid inline styles.
  Existing brackets are preserved. Typing the outer closing parenthesis advances
  past it; intentional nesting remains possible. Return can leave from inside the
  final closer. Empty pairs support paired Backspace and disappear when changing
  element, returning to Dialogue or leaving an unused new pair for another paragraph.
  Parentheses that have been deliberately edited remain ordinary text.
- **Transitions:** exact recognized whole-line transitions complete in uppercase
  with their template ending. Default colon mode includes `FADE OUT:`. Conventional
  mode uses `FADE OUT.` and `FADE TO BLACK.`; punctuation-preservation mode adds no
  ending. These rules persist in the project and custom template definition.
  Existing author endings and custom transition text are preserved. Dialogue and
  ordinary phrases such as “cut to the chase” remain prose.
- **Integrated editing:** element recognition, case and structure run before prose
  punctuation. Headings, cues, parentheticals, transitions and structural labels
  remain exempt from sentence periods/questions. SmartType accepts before Return
  navigation. Heading suggestions retain their prefix, location hyphens, template
  separator and time field. Existing spell correction, synonyms, semantic styles,
  pagination, revision data, annotations and smooth visual caret remain in use.
- **Writer control:** Return plus structural completion is one undoable edit.
  Undo/Redo restores native selection and paragraph identity. Removed or undone
  structural punctuation is remembered in a bounded per-paragraph omission list,
  including native save/reopen. Changed words permit a fresh completion. Midline
  splits, selected-text deletion, paste/drop and composition remain normal editing.
  Finishing a line on blur does not steal destination focus.

| Writer input/action | Result |
| --- | --- |
| `what happened? i thought you were here.` | `What happened? I thought you were here.` |
| `where is he` + Return in Dialogue | `Where is he?` |
| `int bedroom day` + Return | `INT. BEDROOM - DAY` |
| New Parenthetical | `()` with the real caret inside |
| `cut to` + Return in Action | `CUT TO:` followed by Scene Heading |
| `fade out` + Return in conventional mode | `FADE OUT.` |

## Settings and persistence

**DraftCraft Pro → Settings → Editor → Automatic Formatting** and the renderer's
Settings menu expose the same live controls:

| Control | New-profile default |
| --- | --- |
| Automatically Capitalize Sentences | On |
| Automatically Format Scene Headings | On |
| Automatically Insert Parenthetical Brackets | On |
| Automatically Format Transitions | On |

Each switch independently stops its automatic transformation without rewriting
existing pages. Preferences persist in the existing editor-preference store and
apply immediately. Template uppercase display remains a semantic style even when
an automatic text-transform switch is Off. Explicit SmartType selections and
formatting commands remain available.

**Format → Intelligent Auto-Formatting → Transition Endings → Apply Writing
Settings** saves the transition rule in the current project. It is also available
from Format → Elements and retained by custom templates. Existing template files
without the optional rule migrate to colon mode. Explicit writer punctuation is
preserved when a template changes. Whole-document format conversion remains an
explicit existing workflow; typing never changes the selected template.

## Tests of the delivered app

TypeScript checking and the production desktop build passed. All **{models} model,
bridge and filesystem tests** and **{groups} browser interaction groups across eleven
suites passed freshly against the renderer extracted from the signed application**.
The full raw logs are included; no recovered prior-release test summaries substitute
for checks of this payload.

| Suite | Tests / interaction groups | Seconds |
| --- | ---: | ---: |
{rows}

The **25 new browser groups** exercise the real textarea, native selection ranges,
actual key navigation, Cmd shortcuts, toolbar and palette, the menu append history,
all four On/Off controls, older capitalization preferences, prefix and dash timing,
custom separator/time SmartType, parenthetical nesting and paired deletion, Return,
Undo/Redo, manual omissions, native save/reopen, transition-rule persistence,
composition simulation, focus changes and long scripts. Fourteen new model tests
check the corresponding boundary/style/selection rules. Legacy shortcut-only text
preservation scenarios explicitly turn off automatic text transformations; default
On behavior is checked by the new interaction suite.

The other suites verify page actions, Beat Board, story tools, the 80-template
library, explicit format conversion and Undo, customizable shortcuts, spelling,
synonyms, autosave/recovery, printing/export and smooth caret behavior. Native
project file tests use the packaged project writer and real temporary `.draftcraft`
files; native panels are substituted.

The new stress case used **{measure['paragraphs']:,} paragraphs / {measure['pages']}
pages**, retaining **{measure['characters']} rapidly typed characters**, one visual
caret and exact saved paragraph data. Key-handler p95 was
**{measure['keyHandlerP95Ms']:.2f} ms**; total automated typing took
**{measure['totalTypingMs']} ms** including renderer and automation overhead.
The existing 250-page story case measured typing p50
**{story['typingMs']['p50']} ms**, p95 **{story['typingMs']['p95']} ms**. These are Linux
Chromium measurements, not physical Mac benchmarks or imperceptible-latency claims.
Current checks use their original default budgets; no new timing allowance was
introduced for this release.

## Native and archive integrity

- ASAR archive: **{asar['files']} files**, byte-identical to staging and backend source.
- Header SHA-256: `{asar['asarHeaderSha256']}`.
- Tested payload SHA-256: `{tests['payload_sha256']}`.
- Independent checks passed for **{native['mach_o_files']} ARM64 binaries**,
  **{native['code_page_hashes']:,} code-page hashes**, **{native['special_slot_hashes']}
  special slots**, **{native['resource_hashes']} resource hashes**,
  **{native['nested_code_seals']} nested code seals**, **{native['resource_seals']}
  resource seals**, **{native['symlinks']} symlinks** and
  **{native['unchanged_native_sections']} unchanged native sections**.
- The verified unchanged Electron runtime retains its valid nested signatures;
  the changed outer application is ad-hoc signed. Large runtime copies are byte
  checked before signing. This is not Developer ID signing or Apple notarization.
- The DMG independently verifies decompression/checksums, HFSX consistency, stored
  permissions, extracted bytes, symlinks and installer pins. Final image results
  and checksums are appended below after assembly.

## Actual application files changed

{changed}

No application source files were removed. **{preserved['unchanged_files']} application/build source files**, including **{preserved['unchanged_rust_files']}
Rust/workspace files**, are byte-identical to 1.12.0. The punctuation analyzer,
shortcut model, template catalogue, native project writer, save coordinator,
preload bridge and renderer file hook are unchanged. The new integration uses
their existing APIs. Verification scripts, tests, documentation and versioned
packaging instructions were also updated. The preservation proof lists exact files.

## Remaining limits

English boundary and scene/transition rules are deterministic assistance, not
perfect understanding of grammar, location names, intent or stylization. A heading
whose location genuinely ends in DAY or NIGHT can be ambiguous at completion;
Undo/removal or the individual Off control preserves a deliberate choice. Common
supported prefixes and time labels are recognized; unknown formats stay editable.
The existing conservative English automatic punctuation engine keeps its earlier
scope. No paid or cloud language service is required for these features.

Physical macOS launch, Finder mounting, Apple codesign/Gatekeeper assessment,
native file panels, physical IME, VoiceOver, 120 Hz displays and Apple Silicon
memory/performance testing were unavailable here. Composition was simulated in
Chromium. This personal build is **not Apple-notarized or Developer ID signed**.

Existing broader layout/import limits remain: single oversized paragraphs are
not split across editor page inputs; proportional-font pagination is estimated;
complete production dual-dialogue, locked-page and continuation behavior is
incomplete; FDX/Fountain/RTF compatibility is partial; PDF import is not implemented.
The Rust workspace remains a prototype alongside the existing Electron/React GUI.
These are not represented as newly completed capabilities in this update.

## Installation and rebuilding

Open **DraftCraft-Pro-Automatic-Formatting.dmg** and run
**Install-DraftCraft.command** once. The existing installer verifies the package,
backs up an existing app, installs and locally re-signs it with macOS tools, verifies
it and opens it. Subsequent launches use Applications → DraftCraft Pro. Documents
and the existing profile are retained. No Node.js, Rust or development server is
needed to use the packaged app. Getting-Started.txt describes this personal build.

For development: `npm ci --legacy-peer-deps`, `npm ci --prefix desktop`,
`npm run lint`, `node desktop/build.cjs`. The macOS packaging workflow remains
`desktop/package.mjs`; an existing valid runtime can be updated with
`desktop/repackage.mjs`. Fresh release checks use
`verification/extract-verify-payload.cjs`, `verification/run-release-tests.py` and
`verification/verify-macos-package.py`. Linux image assembly is reproducible with
`verification/assemble-automatic-formatting.py` and
`verification/build-automatic-formatting-dmg.py`, using the documented packaging
tools and permission-preservation patch.
'''
(source/'AUTOMATIC-FORMATTING-REPORT.md').write_text(report)
(release/'Build-Report.md').write_text(report)
(artifacts/'DraftCraft-Pro-Automatic-Formatting-Report.md').write_text(report)
previous=Path(os.environ.get('DRAFTCRAFT_PREVIOUS_RELEASE',str(task.parent/'punctuation/release-final')))
shutil.copytree(previous/'Third-Party-Licenses',release/'Third-Party-Licenses',dirs_exist_ok=True)
for src,dest in [('desktop/Getting-Started.txt','Getting-Started.txt'),('AUTOMATIC-FORMATTING.md','Automatic-Formatting.md'),('AUTOMATIC-PUNCTUATION.md','Automatic-Punctuation.md'),('WRITING-FORMATS.md','Writing-Formats.md'),('CARET-ANIMATION.md','Caret-Animation.md'),('SMART-SAVE.md','Smart-Save.md')]:shutil.copyfile(source/src,release/dest)
proof=release/'Verification';proof.mkdir(exist_ok=True)
for src,dest in [('automatic-formatting-macos-proof.json','macos-signatures.json'),('smart-save-asar-proof.json','asar-integrity.json'),('automatic-formatting-preservation.json','preservation.json'),('format-catalog-summary.json','format-catalog.json'),('FORMATTING-REFERENCE-NOTES.md','Formatting-References.md'),('packaging-tools.json','packaging-tools.json')]:shutil.copyfile(v/src,proof/dest)
(proof/'tests').mkdir(exist_ok=True)
for p in (v/'story-results').glob('*-tests.log'):shutil.copyfile(p,proof/'tests'/p.name)
shutil.copyfile(v/'story-results/final-tests.json',proof/'tests/final-tests.json')
for folder in ['automatic-formatting-results','punctuation-results','formats-results','caret-results','smart-save-results']:
 dest=proof/folder;dest.mkdir(exist_ok=True)
 for p in (v/folder).glob('*.json'):shutil.copyfile(p,dest/p.name)
(proof/'platform.json').write_text(json.dumps({'passed':True,'version':'1.13.0','bundle_identifier':info['CFBundleIdentifier'],'identity_preserved':True,'architecture':'arm64','minimum_macos':info['LSMinimumSystemVersion'],'physical_mac_launch_tested':False},indent=2)+'\n')
entries={};excluded={'node_modules','.git','target','__pycache__','dist','ui-qa','story-qa','UI-refinement','ui-refinement'}
for directory,folders,files in os.walk(source):
 folders[:]=[name for name in folders if name not in excluded]
 for name in files:
  p=Path(directory)/name;rel=p.relative_to(source)
  if name=='.env' or name.startswith('.env.'):continue
  if 'verification' in rel.parts and p.suffix.lower() in {'.png','.jpg','.jpeg','.webp'}:continue
  entries[Path('DraftCraft-Pro-Source')/rel]=p
for folder in ['dist','Font-Licenses','Spelling-Licenses']:
 for p in (payload/folder).rglob('*'):
  if p.is_file():entries[Path('DraftCraft-Pro-Source')/p.relative_to(payload)]=p
zip_path=artifacts/'DraftCraft-Pro-Automatic-Formatting-Source.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,9) as z:
 for name,p in sorted(entries.items()):z.write(p,name)
with zipfile.ZipFile(zip_path) as z:
 assert z.testzip() is None
 for p in (payload/'dist').rglob('*'):
  if p.is_file():assert z.read('DraftCraft-Pro-Source/'+p.relative_to(payload).as_posix())==p.read_bytes()
shutil.copyfile(zip_path,release/'DraftCraft-Pro-Source.zip')
subprocess.run(['node',str(source/'desktop/create-installer.mjs'),str(release)],cwd=source,check=True)
for script in [release/'Install-DraftCraft.command',release/'Support/Sign-macOS.sh']:subprocess.run(['/bin/bash','-n',str(script)],check=True)
summary={'version':'1.13.0','model_tests':models,'browser_groups':groups,'source_files':len(entries),'source_zip_bytes':zip_path.stat().st_size,'source_sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'asar_header_sha256':asar['asarHeaderSha256']}
(task/'assembly.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary),flush=True)
