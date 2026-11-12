"""Assemble 1.14 only after twelve fresh suites verify the delivered payload."""
from pathlib import Path
import hashlib,json,os,plistlib,shutil,subprocess,zipfile
source=Path(__file__).resolve().parent.parent;task=source.parent.parent;release=task/'release-final';artifacts=task/'deliverables';artifacts.mkdir(exist_ok=True);v=source/'verification';payload=task/'release-payload-final-v2'
tests=json.loads((v/'story-results/final-tests.json').read_text());assert len(tests['results'])==12 and all(r['passed'] for r in tests['results']);assert not tests['recovered_after_workspace_maintenance']
h=hashlib.sha256()
for p in sorted(payload.rglob('*')):
 if p.is_file():h.update(p.relative_to(payload).as_posix().encode()+b'\0'+p.read_bytes())
assert tests['payload_sha256']==h.hexdigest(),'Tests belong to another app'
models=next(r['tests'] for r in tests['results'] if r['suite']=='models');groups=sum(r['interaction_groups'] for r in tests['results']);reading=next(r for r in tests['results'] if r['suite']=='table-read');assert reading['interaction_groups']==18 and models>=163
measure=reading['measurements'][0];native=json.loads((v/'table-read-macos-proof.json').read_text());asar=json.loads((v/'smart-save-asar-proof.json').read_text());preserved=json.loads((v/'table-read-preservation.json').read_text());assert native['passed'] and asar['passed'] and preserved['passed'] and asar['version']=='1.14.0'
app=release/'DraftCraft Pro.app';info=plistlib.loads((app/'Contents/Info.plist').read_bytes());assert info['CFBundleShortVersionString']=='1.14.0' and info['CFBundleIdentifier']=='com.draftcraft.screenplay.studio'
rows='\n'.join(f"| {r['suite']} | {r.get('tests',r['interaction_groups'])} | {r['seconds']} |" for r in tests['results'])
changed='\n'.join('- `'+name+'`' for name in preserved['new_files']+preserved['changed_files'])
report=f'''# DraftCraft Pro 1.14.0 — Integrated Table Read

This extends the delivered **DraftCraft Pro 1.13.0**, preserving its existing
Electron/React textarea editor, application identity, native projects and profile.
The macOS package is **Apple Silicon ARM64, macOS 13 or later**. It is a personal
ad-hoc-signed build, not Developer ID signed or Apple-notarized.

## Operational implementation

- **Screenplay analysis and cast:** reads actual semantic Character, Dialogue,
  Dual Dialogue, Scene Heading, Action, Parenthetical and other supported elements.
  Uppercase action is not treated as a cue. Character extensions share an actor;
  aliases, existing character-memory identities and cue IDs retain assignments.
  Full renames preserve a voice; partial renames create distinct identities.
  Removed characters keep inactive assignments for later reuse. Casting prioritizes
  language and distinct voices, with restrained explicit-age hints. No identity is
  inferred from a name. Exhausted voice inventory is disclosed.
- **Three working synthesis adapters:** installed macOS voices through `say`,
  a loopback-only MLX Audio-compatible local speech endpoint, and ElevenLabs using
  the user's own account voices and available model inventory. The cloud adapter
  supports expressive v4/v3 audio-tag directions. Other engines use neutral delivery
  and hide unsupported emotion and pitch controls. No neural model, API key or
  credits are bundled. See Table-Read.md for setup and licence requirements.
- **Delivery and timing:** conservative local parenthetical/action/conversation
  analysis, manual character and line emotion overrides, per-line pauses, voice
  speed, pronunciation replacements and bounded contextual speaker gaps. Ordinary
  conversation defaults to neutral. Neutral reading requests neutral guidance.
  These are bounded deterministic heuristics plus the speech model's delivery,
  not a comprehensive semantic AI or guaranteed emotional acting.
- **Actual player:** Play, Pause, Resume, Stop, previous/next dialogue and scene,
  restart scene, ten-second skips, segment progress seek, speed, volume, current
  actor/scene and estimated remaining duration. Scopes include full script, scene,
  dialogue and cursor. A nonspoken scene heading selects its scene; a cursor in
  skipped action starts at the next spoken line. Click-to-read is explicitly armed.
  Opening the panel never starts audio. The collapsible player occupies its own
  layout area below the editor; Voice Cast and Settings are separate native-style
  accessible dialogs. Dark/light surfaces, focus trapping, Escape and resizing use
  the existing presentation system.
- **Audio synchronization:** a real HTMLAudioElement drives dialogue highlighting
  from actual playback state. Valid matching provider timestamps enable optional
  word highlights on compatible non-v3/v4 cloud models. Invalid or transformed
  spoken text falls back to dialogue highlights. Decorations never change saved
  styles, native text selection or screenplay content. Follow Reading scrolls only
  when required. Script edits invalidate stale highlights while playback keeps a
  consistent captured version; Update Reading explicitly captures the latest.
- **Narration:** separate narrator voice, dialogue-only/action/complete modes,
  optional headings, transitions, character cues and spoken parentheticals.
  Parentheticals normally direct performance rather than being spoken. INT/EXT
  headings expand into readable speech without changing the script.
- **Responsive pipeline:** async generation, at most two concurrent jobs,
  two-segment lookahead, cancelable stale requests, per-segment content cache,
  bounded LRU storage, WAV/metadata hash verification and background PCM processing.
  The signed audio worker source is loaded by the main process and executed by a
  Node worker, avoiding ASAR startup path issues. No renderer eval is enabled.
  Gentle constrained level normalization and short edge fades avoid clipping;
  text and editor updates remain independent of audio preparation.
- **Real exports:** native save/folder dialogs, verified combined WAV and M4A when
  native encoding is available; MP3 when supported FFmpeg is installed. Separate
  scene files use scene IDs even when headings repeat. Optional character/scene/
  paragraph/time JSON cue sheets accompany audio. Combined export streams mono
  24 kHz PCM with bounded pauses; encoding is validated before reporting success.
  Cancellation cleans temporary output and preserves an existing destination.
- **Persistence and privacy:** cast, aliases, narrator, pronunciations and line
  performance save within `.draftcraft` projects. Global engine/player preferences
  persist and apply immediately. The optional API key is system-encrypted in a
  separate private profile file, never stored in scripts, exports or source.
  Exact cloud-reading approvals are checked before cache access or synthesis;
  changed requests need new consent. No automatic cloud failover or charged retry
  occurs. Only requested speech and delivery data leave the app; contextual
  analysis remains local. Provider retention terms apply. Local audio/timing
  caches can contain screenplay content and can be cleared in Settings.

## Engine choice and dependencies

| Engine | Why included | Setup / practical limits |
| --- | --- | --- |
| macOS installed voices | Immediate offline baseline and native compatibility | Installed voices only; quality varies; no emotional controls; Apple voice-recording restrictions apply. |
| Local neural server | Optional private neural synthesis, including an Apple Silicon MLX path | Separately install server, licensed model and voice presets. Neutral adapter; model/language quality varies. |
| ElevenLabs | Expressive neural account voices and multilingual synthesis | API credentials, internet, appropriate plan/voice rights and explicit in-app text consent. Voice/model support is checked with the account. |

Cartesia Sonic was evaluated as another expressive provider but is not implemented.
Core playback does not depend on a cloud subscription. English US/UK/India and Hindi
are selectable alongside available voice languages; actual pronunciation and mixed
language handling depend on the chosen voice/model. Accent/age/presentation filters
use provider metadata, not invented voice transformations. The UI reports speech
character estimates before tags, not an unverified currency estimate. 44.1 kHz cloud
PCM may require a higher provider plan. M4A uses `afconvert` on Mac; MP3 requires an
installed FFmpeg at the documented path. Neither FFmpeg nor model weights are bundled.

Primary documentation, local-server instructions, provider privacy, commercial
rights and Apple licence links are in **TABLE-READ.md**. MLX Audio's MIT licence
and Kokoro's upstream Apache 2.0 model licence do not grant universal rights to all
third-party voices/models. Use licensed or consented voices. No cloning feature
has been added. Review voice rights before sharing audio exports.

## Tests of the actual delivered app

TypeScript checking and production desktop staging passed. **{models} model,
backend, bridge and filesystem tests** and **{groups} browser interaction groups
across twelve suites passed freshly against the renderer and backend extracted
from this exact signed app**. No recovered historical summary substitutes for
this release's full raw logs. The source includes all scripts and fresh logs.

| Suite | Tests / interaction groups | Seconds |
| --- | ---: | ---: |
{rows}

The **29 new Table Read model/backend tests** cover semantic recognition, aliases,
full/partial rename consistency, language casting, engine-catalog races, saved
control validation, delivery, narration, source offsets, scopes, pronunciation,
large scripts, opt-in playback, pause/seek/cancel/stale-job behavior, local-host
validation, encrypted-key separation, exact cloud consent, concurrency, cache
corruption, PCM conversion, ordered export, cleanup and real encoding/decoding.

The **18 new browser groups** operate the actual production renderer and actual
HTMLAudioElement, PCM worker, project writer and audio export code. They cover
menus, no automatic speech, casts, actual audio-file playback, pause/resume/
speed/volume/stop, scene/dialogue navigation, scopes, snapshot edits, SmartType
rename-all, native project save/reopen, narration, consent and emotion request
payloads, pronunciation, provider failures, cancellation, WAV/cues, MP3/M4A,
validated word timing, click-to-read, settings persistence, layout and large scripts.

These integration checks substitute macOS speech enumeration/file dialogs and
provider transport. They generate real public Flite speech via installed FFmpeg,
then exercise the real audio pipeline. They are **not live ElevenLabs or local
neural quality tests**. No private screenplay was submitted to a provider. MP3 and
M4A outputs were generated and decoded with a real FFmpeg; `afconvert` itself was
not exercised. macOS secure-storage mechanics were substituted in tests.

The Table Read stress case used **{measure['paragraphs']:,} paragraphs / {measure['pages']}
pages**, with panel opening in **{measure['openMs']} ms** and **{measure['typedCharacters']}
retained typed characters in **{measure['typingTotalMs']} ms** including browser
and automation overhead, while audio/highlighting and native saves operated.
These Linux Chromium results do not establish physical Mac CPU/memory, latency
or listening quality. Existing suites retain their original performance budgets.

## Preserved application and native integrity

No application source files were removed. **{preserved['unchanged_files']} application/
build files**, including **{preserved['unchanged_rust_files']} Rust/workspace files**,
are byte-identical to 1.13.0. The native project writer, save coordinator, renderer
file hook, punctuation analyzer, automatic-formatting preferences/engine, template
catalogue/model and shortcut model are unchanged. The new feature integrates with
the same App/ScriptEditor paths and narrow sandboxed preload bridge. Existing
spellchecking, synonyms, SmartType, caret animation, pagination, template switching,
story tools, autosave and Undo/Redo are covered by the regression suites. It does
not replace the editor or migrate the existing Rust prototype.

- Same bundle identity: `{info['CFBundleIdentifier']}`.
- Same native app inventory: **{preserved['app_regular_files']} files**, **{preserved['app_symlinks']} symlinks**.
- ASAR: **{asar['files']} files**, byte-identical to staging and modified backend source.
- ASAR header SHA-256: `{asar['asarHeaderSha256']}`.
- Tested payload SHA-256: `{tests['payload_sha256']}`.
- Independent verification: **{native['mach_o_files']} ARM64 binaries**,
  **{native['code_page_hashes']:,} code-page hashes**, **{native['special_slot_hashes']}
  special slots**, **{native['resource_hashes']} resource hashes**,
  **{native['nested_code_seals']} nested code seals**, **{native['resource_seals']}
  resource seals**, **{native['symlinks']} symlinks** and
  **{native['unchanged_native_sections']} unchanged native sections** passed.
- Verified byte-identical Electron runtime retains nested signatures; the changed
  outer app is ad-hoc signed. This is not an Apple Gatekeeper/notarization result.

### Actual application files added or changed

{changed}

Tests, build verification, versioned packaging and documentation were also updated.
The preservation JSON lists exact changes and unchanged critical components.

## Remaining limitations and required Mac/provider checks

Premium neural naturalness, emotional appropriateness, pronunciation and actor-like
continuity have **not been established in listening tests**. Audio tags are best-effort
model guidance. Scene/emotion analysis is deliberately conservative and bounded;
sarcasm and complex dramatic intent are not reliably inferred. It does not create
human breathing absent model support, overlap dual dialogue, clone voices or provide
pitch/effects controls unsupported by the selected engine. Estimates are approximate.

Physical macOS launch, `/usr/bin/say` WAV generation, Keychain, `afconvert`, native
file panels, Finder mounting, VoiceOver, physical IME, 120 Hz and Apple Silicon
memory/CPU testing were unavailable. A real cloud account and installed MLX model
must be auditioned on the target Mac. Intel builds are not included because the
supplied native runtime is ARM64. The build is **unnotarized and not Developer ID
signed**; the existing personal installer verifies and locally signs it on Mac.

Existing broader limitations remain: single oversized paragraphs are not split
across editor inputs; proportional-font pagination is estimated; complete production
locked-page, continuation and dual-dialogue layout is incomplete; FDX/Fountain/RTF
compatibility is partial; PDF import is not implemented. These are not represented
as newly completed features.

## Installation and rebuild

Open **DraftCraft-Pro-Table-Read.dmg** and run **Install-DraftCraft.command** once.
It verifies package pins, backs up an existing app, installs and locally re-signs
with macOS tools, checks the result and opens it. Thereafter launch Applications →
DraftCraft Pro. Existing projects/profile remain in place. Node, Rust and a server
are unnecessary for installed-system-voice use. Optional neural engines need the
setup described in Table-Read.md; Table Read never starts without Play/Preview.

Development: `npm ci --legacy-peer-deps`, `npm ci --prefix desktop`, `npm run lint`,
`node desktop/build.cjs`. Normal Mac packaging uses `desktop/package.mjs`; a known
runtime can be updated with `desktop/repackage.mjs`. Verification uses
`extract-verify-payload.cjs`, `run-release-tests.py`, `verify-macos-package.py` and
`verify-table-read-preservation.py`. Linux assembly uses `assemble-table-read.py`
and `build-table-read-dmg.py`, with the pinned packaging tools and permission patch.
'''
(source/'TABLE-READ-REPORT.md').write_text(report);(release/'Build-Report.md').write_text(report);(artifacts/'DraftCraft-Pro-Table-Read-Report.md').write_text(report)
previous=task/'baseline-release';shutil.copytree(previous/'Third-Party-Licenses',release/'Third-Party-Licenses',dirs_exist_ok=True)
for src,dest in [('desktop/Getting-Started.txt','Getting-Started.txt'),('TABLE-READ.md','Table-Read.md'),('AUTOMATIC-FORMATTING.md','Automatic-Formatting.md'),('AUTOMATIC-PUNCTUATION.md','Automatic-Punctuation.md'),('WRITING-FORMATS.md','Writing-Formats.md'),('CARET-ANIMATION.md','Caret-Animation.md'),('SMART-SAVE.md','Smart-Save.md')]:shutil.copyfile(source/src,release/dest)
proof=release/'Verification';proof.mkdir(exist_ok=True)
for src,dest in [('table-read-macos-proof.json','macos-signatures.json'),('smart-save-asar-proof.json','asar-integrity.json'),('table-read-preservation.json','preservation.json'),('format-catalog-summary.json','format-catalog.json'),('FORMATTING-REFERENCE-NOTES.md','Formatting-References.md'),('packaging-tools.json','packaging-tools.json')]:shutil.copyfile(v/src,proof/dest)
(proof/'tests').mkdir(exist_ok=True)
for p in (v/'story-results').glob('*-tests.log'):shutil.copyfile(p,proof/'tests'/p.name)
shutil.copyfile(v/'story-results/final-tests.json',proof/'tests/final-tests.json')
for folder in ['table-read-results','automatic-formatting-results','punctuation-results','formats-results','caret-results','smart-save-results']:
 dest=proof/folder;dest.mkdir(exist_ok=True)
 for p in (v/folder).glob('*.json'):shutil.copyfile(p,dest/p.name)
(proof/'platform.json').write_text(json.dumps({'passed':True,'version':'1.14.0','bundle_identifier':info['CFBundleIdentifier'],'identity_preserved':True,'architecture':'arm64','minimum_macos':info['LSMinimumSystemVersion'],'physical_mac_launch_tested':False,'live_cloud_tested':False},indent=2)+'\n')
entries={};excluded={'node_modules','.git','target','__pycache__','dist','ui-qa','story-qa','UI-refinement','ui-refinement'}
for directory,folders,files in os.walk(source):
 folders[:]=[n for n in folders if n not in excluded]
 for name in files:
  p=Path(directory)/name;rel=p.relative_to(source)
  if name=='.env' or name.startswith('.env.'):continue
  if 'verification' in rel.parts and p.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.wav','.mp3','.m4a'}:continue
  entries[Path('DraftCraft-Pro-Source')/rel]=p
for folder in ['dist','Font-Licenses','Spelling-Licenses']:
 for p in (payload/folder).rglob('*'):
  if p.is_file():entries[Path('DraftCraft-Pro-Source')/p.relative_to(payload)]=p
zip_path=artifacts/'DraftCraft-Pro-Table-Read-Source.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,9) as z:
 for name,p in sorted(entries.items()):z.write(p,name)
with zipfile.ZipFile(zip_path) as z:
 assert z.testzip() is None
 for p in (payload/'dist').rglob('*'):
  if p.is_file():assert z.read('DraftCraft-Pro-Source/'+p.relative_to(payload).as_posix())==p.read_bytes()
shutil.copyfile(zip_path,release/'DraftCraft-Pro-Source.zip');subprocess.run(['node',str(source/'desktop/create-installer.mjs'),str(release)],cwd=source,check=True)
for p in [release/'Install-DraftCraft.command',release/'Support/Sign-macOS.sh']:subprocess.run(['/bin/bash','-n',str(p)],check=True)
summary={'version':'1.14.0','model_tests':models,'browser_groups':groups,'source_files':len(entries),'source_zip_bytes':zip_path.stat().st_size,'source_sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(),'asar_header_sha256':asar['asarHeaderSha256']};(task/'assembly.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary),flush=True)
