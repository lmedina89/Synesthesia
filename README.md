# Garden Notes v0.13.2 — VexFlow Engraving Integration (candidate)

An incremental release from v0.13.1: the scrolling staff now **attempts to use VexFlow 4.2.2** for conventional musical glyphs, barlines, clefs, ledger lines, and accidentals. The existing Canvas pitch guide activates automatically if VexFlow is unavailable or cannot lay out the notes. The piano keyboard, audio engine, imported MIDI library, guided practice, kalimba, and private song exports are preserved.

## Install

1. Save a copy of your v0.13.1 deployment and your personal MIDI songs first.
2. Extract the `Garden_Notes_v0.13.2_GitHub_Ready.zip` and upload **all** files, including the `assets` folder, to GitHub Pages with `index.html` at the root.
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
