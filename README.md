# Garden Notes v0.13.3 — Rhythm & Engraving Stabilization (candidate)

An incremental release from v0.13.1: the scrolling staff now **attempts to use VexFlow 4.2.2** for conventional musical glyphs, barlines, clefs, ledger lines, and accidentals. The existing Canvas pitch guide activates automatically if VexFlow is unavailable or cannot lay out the notes. The piano keyboard, audio engine, imported MIDI library, guided practice, kalimba, and private song exports are preserved.

## Install

1. Save a copy of your v0.13.1 deployment and your personal MIDI songs first.
2. Extract the `Garden_Notes_v0.13.3_GitHub_Ready.zip` and upload **all** files, including the `assets` folder, to GitHub Pages with `index.html` at the root.
3. Refresh Safari and load a song. The score caption says either `Engraved MusicXML score · VexFlow`, `MIDI transcription · inferred...`, or `Pitch guide fallback`.
4. For your preferred Balamb Garden MIDI, check the 0:30–0:46 passage and whether notes on both staves match the piano roll. If the caption says fallback, the score is **not** showing VexFlow.

## Third-party dependency

VexFlow v4.2.2 (MIT license; https://github.com/0xfe/vexflow) is loaded at runtime from a version-pinned jsDelivr script URL. This environment could not download the library into the GitHub ZIP, so **the engraved display requires the browser to access that CDN**. The piano and falling-note trainer do not depend on this library. A private standalone export also refers to the same CDN and retains the fallback.

## Musical accuracy

- **MusicXML**: uses the imported score's pitches, clefs, measures, meter and voices when the features fit our supported subset; straightforward durations and rests are rendered by VexFlow.
- **MIDI-only**: retains true pitch and original MIDI tick timings, but assigns treble/bass heuristically and guesses meter and notated rhythmic grouping. The display explicitly calls itself an inferred transcription. It is **not** publisher-authoritative sheet music.
- Complex multi-voice collisions, cross-staff writing, beam grouping, tuplets, slurs, grace notes, repeats, and difficult quantization still require work. Importantly, the MIDI parser now retains `startBeat`/`endBeat` for notation while unchanged seconds continue to drive audio.

## Development

- `python scripts/build.py` — build external ES modules and portable personal standalone HTML.
- `bash scripts/validate.sh` — 38 passing Node unit tests plus desktop/mobile browser regression tests, simulated audio interruptions, MIDI and MusicXML imports, private MIDI pack round-trips, and a VexFlow **adapter** test against an API-compatible test double.
- The **real third-party VexFlow bundle could not be loaded or visually tested in this offline environment**, and the app hasn't yet been checked on physical iPhone Safari. Do not treat the engraver as final until the actual device confirms the result.

No external Balamb Garden or Garden of the Gods MIDI has been bundled. Existing personally imported MIDI is preserved by the current browser storage scheme.


## v0.13.3 stabilization changes

- A 1.25-quarter-note MIDI event is now notated as tied quarter + sixteenth, **not** one sixteenth. Durations are decomposed, with explicit dots and ties where supported.
- Notes crossing measure boundaries are represented in both measures; overlapping voices are allocated separate rhythmic lanes. No silent `slice()`/`continue` note omission. Unsupported five-or-more overlapping voices / triplet subdivisions explicitly reject engraving and show the reliable pitch guide. **Playback notes are unchanged.**
- MusicXML natural/sharp/flat accidental declarations are forwarded to the engraving adapter, and per-measure accidental state is maintained. Key signatures are preserved.
- The score UI now shows an error reason whenever VexFlow rendering falls back. Browser tests cover MIDI playback, library storage/export and immersive practice; specific notation regression tests cover ties, durations, overlapping voices and unsupported rhythms.

### Important release gate — not yet passed

**The real VexFlow 4.2.2 runtime is loaded from a pinned CDN, not vendored.** This execution environment blocks CDN access (`ERR_BLOCKED_BY_ADMINISTRATOR`), so a test with real VexFlow could not be completed. The browser engraver test still uses a compatible mock. This is a **candidate**, not a signed-off production release; on an iPhone with the CDN available, check the score status and compare the 30–46 second Balamb Garden passage. If rendering fails, the on-screen pitch guide should remain usable and the reason should be visible.

The song MIDIs are not bundled in the public ZIP. Physical iPhone Safari audio and notation tests remain outstanding. Advanced tuplets, multi-staff cross-beaming, and full publisher-grade MIDI transcription are outside this fix.
