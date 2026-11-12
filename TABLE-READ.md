# DraftCraft Pro 1.14 — Table Read

Open **Tools → Table Read** in the Mac menu bar, or **Story & Audio → Table Read**
inside DraftCraft Pro. The player sits below the editor and can collapse. It never
starts speech on its own. Press Play after choosing your scope and cast.

## Choose a speech engine

| Engine | Setup and supported behavior | Limits |
| --- | --- | --- |
| Installed macOS voices (default) | Works offline using voices installed on the Mac. Assign different voices, audition them, change speaking speed and language. | Quality varies by installed voice. No emotional control or word timestamps. Apple's voice licence restricts use and distribution; see below. |
| Local neural server | Install a compatible MLX Audio speech server and model separately. The app sends speech only to the configured loopback address. | No model or Python runtime is bundled. Voice presets and languages must match your model. Neutral speech adapter; emotional controls are hidden. |
| ElevenLabs | Supply your own API key in **Table Read Settings**. Refresh available account voices, choose an accessible model, cast and audition. v4/v3 receive emotional audio-tag guidance. | Internet and provider credit required. Each selected reading requires explicit approval before text is sent. Delivery depends on model and voice. |

These adapters were chosen for an offline baseline, an optional Apple Silicon local
neural path and expressive cloud synthesis. Cartesia Sonic was also evaluated as
an expressive alternative; this release contains no Cartesia adapter. There is no
claim that any engine sounds indistinguishable from actors.

For local MLX Audio, follow the upstream installation instructions for your Mac
and Python environment, download a legally licensed compatible model, then start
its server bound to this computer:

```sh
mlx_audio.server --host 127.0.0.1 --port 8000
```

In the app select **Offline · Local neural server**, use
`http://127.0.0.1:8000`, and set the installed model ID. The suggested starting ID
is `mlx-community/Kokoro-82M-bf16`; enter only voice presets actually supplied by
that model. Example presets include `af_heart`, `am_adam`, `bf_emma`, `bm_george`,
`hf_alpha`, `hm_omega`. English US/UK and Hindi language selections map to the
MLX/Kokoro language codes. Audition each voice. Initial model downloads require
internet; local synthesis can run offline after installation. Follow the server's
own supported hardware and memory requirements, especially on an 8 GB Mac.

For ElevenLabs, **Save API Key Securely** uses Electron's macOS system encryption.
The encrypted key stays in the application profile, never in the screenplay or
source. Removing it cancels generation and revokes in-memory approvals. The app
requests account voice/model metadata when refreshing; it sends no screenplay
text for that operation. Models unavailable to your plan produce an actionable
provider error. 24 kHz is the default; provider access to 44.1 kHz PCM can require
a higher plan. The consent panel gives speech-character estimates before delivery
tags; monetary costs and quotas remain in your provider dashboard.

## Cast and direct

**Voice Cast** detects semantic Character paragraphs, not arbitrary uppercase
action words. V.O./O.S./CONT'D extensions share a character identity. Cast aliases
merge alternate cues. Full character renaming through the existing SmartType
Manager retains the assignment; a partial rename remains a separate character.
Inactive assignments are retained if a character is temporarily removed.

Automatic casting favors distinct available voices and matching languages. An
explicit adjacent age description may influence a suggestion. Names never infer
gender, nationality, ethnicity or accent. Voice filters use actual provider
metadata. Select identity, speech language and speaking speed; audition before
committing. Pitch transformations and unsupported emotional controls are omitted.
When voices run out, the app clearly reports reused assignments.

Expressive cloud models expose neutral, happy, sad, angry, nervous, afraid,
excited, confused, sarcastic, whispering, shouting, calm, serious, suspicious and
emotional directions. They are synthesis guidance rather than guaranteed acting.
Manual line overrides take precedence over character overrides, then automatic
interpretation. Neutral mode requests neutral delivery. Parentheticals and a
bounded amount of scene action and preceding dialogue inform conservative local
rules; uncertain ordinary conversation stays neutral. This is not a general
language-understanding model. Parentheticals normally guide speech without being
read; enable spoken parentheticals explicitly if wanted.

Pronunciation overrides use `written term = spoken form`, one per line, followed
by **Save Pronunciation Overrides**. They affect generated speech only. Cast,
aliases, narrator, pronunciations and line instructions save inside the native
project; engine/player preferences persist in the existing app profile. API keys
are separate. Saving a project before moving it to another Mac retains its cast
IDs, but unavailable voices must be reassigned on that computer.

## Playback and editing

Choose entire screenplay, selected scene, selected dialogue or current cursor.
The starting-line selector also selects a target. Dialogue clicks start reading
only after you enable **Click dialogue to play**. Ordinary editing remains normal.
Controls include Play/Pause/Resume/Stop, previous/next dialogue and scene, restart
scene, ten-second skips, segment progress, speed and volume. Remaining duration is
an estimate until audio has been prepared. The current character and scene stay
visible. Follow Reading scrolls only when needed.

Highlights decorate the editor without saving formatting or moving text selection.
Dialogue highlighting follows actual audio playback. Compatible non-v3/v4
ElevenLabs models can provide word timing; validated matching timings enable word
highlighting. Changed pronunciation, invalid timings or unsupported models fall
back to dialogue highlighting. Timing is not invented from word counts.

Playback captures a consistent version. Editing a line removes a stale highlight
and shows **Update Reading**; it does not redirect playing audio into newer text.
Update explicitly captures the new version. Cache keys include speech, engine,
voice and supported performance controls; only changed segments regenerate.
Two synthesis jobs and two-segment lookahead bound preparation. Stop cancels
outdated jobs. Failures do not silently upload to a different engine or retry
charged requests; Retry Current Line is explicit.

Narrator options include dialogue only, dialogue plus action and complete
screenplay, with separate switches for scene headings, transitions, character
cues and parentheticals. The narrator has its own voice. Dialogue-only mode skips
nonspoken action; cursor playback there starts at the next spoken line. Dual dialogue is sequenced by stored paragraph order; simultaneous
overlapping actor mixing is not implemented.

## Export, privacy and licences

**Export Table Read Audio** uses the player's scope. Choose WAV, M4A when the
native encoder is available, or MP3 when FFmpeg is installed at a supported path
(`/opt/homebrew/bin/ffmpeg` or `/usr/local/bin/ffmpeg`). FFmpeg is optional and not
bundled. A native save/folder picker chooses the destination. Export combines
speech with the same bounded pauses; separate-scene exports use scene identities,
including repeated headings. Optional JSON cue sheets contain character, scene,
paragraph and time offsets. Success appears only after file generation and audio
verification. Cancellation preserves an existing destination and cleans temporary
output. Audio and cue sheets reveal screenplay content; share them deliberately.

Generated audio is cached locally; validated word timing can contain transcript
characters. Clear it in Settings. No private screenplay is uploaded until an
explicit approval for the exact cloud reading. Only requested speech, pronunciation
replacements and delivery controls are sent; scene context stays local. Provider
retention terms apply. This app does not promise enterprise zero retention.

Voice rights differ. Apple's macOS Ventura licence restricts system voices and
recordings to its permitted personal, noncommercial uses and restricts public
sharing; check the agreement for your installed macOS before distributing an
export. ElevenLabs commercial rights depend on plan, voice and applicable terms;
the free plan is not a blanket commercial licence. MLX Audio's MIT code licence
does not license every model or voice; Kokoro's upstream model card identifies
Apache 2.0 weights. Independently check your installed conversion, preset and
intended use. No voice cloning feature is provided; use licensed/consented voices.

## Verified scope and remaining checks

The release report records automated checks of the actual packaged renderer,
speech sequencing, cancellation, casting, save/reopen, live highlighting, audio
exports, large scripts and existing editing features. Integration tests use real
Flite-generated audio through the real audio worker, HTMLAudioElement and export
pipeline while substituting native speech/file panels and cloud transport.
They do not evaluate premium voice quality. No paid provider credentials or
downloaded neural model were available for a live listening test. Physical Mac
launch, `/usr/bin/say`, Keychain, `afconvert`, VoiceOver and native dialogs require
Mac validation. The build remains ARM64, macOS 13+, ad-hoc signed and unnotarized;
Intel packaging is not included. The existing installer workflow is retained.

## Primary references (checked 15 October 2026)

- [ElevenLabs speech endpoint, models, formats and retention](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [ElevenLabs expressive prompting](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices)
- [ElevenLabs publishing rights](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform)
- [MLX Audio API server setup](https://github.com/Blaizzy/mlx-audio/blob/main/docs/guides/web-ui-api-server.md)
- [MLX Audio licence](https://github.com/Blaizzy/mlx-audio/blob/main/LICENSE)
- [Kokoro model, languages and licence](https://huggingface.co/hexgrad/Kokoro-82M)
- [Apple macOS Ventura licence, section 2F](https://www.apple.com/legal/sla/docs/macOSVentura.pdf)
- [Cartesia Sonic models](https://docs.cartesia.ai/build-with-cartesia/tts-models/sonic-3-6)
