# Garden Notes v0.13.1 — MusicXML Score Foundations

This is a focused follow-up based directly on the preserved v0.13 developer source. It is an **incremental, tested music-notation update**, not a rewrite or a completed commercial engraving system.

## Install / use

1. Download `Garden_Notes_v0.13.1_GitHub_Ready.zip`; extract and publish **all contents** at the root of your existing GitHub Pages deployment. Retain the `assets/` directory and `index.html`.
2. Try an uncompressed **MusicXML `.musicxml` / `.xml`** score using **Import MIDI or MusicXML**. One small, original `score-demo.musicxml` test score is included in the ZIP; download it from the files you extracted and import it for a working example.
3. MusicXML imports display written measure boundaries, rests, note durations, clefs, key/time signatures and pitches in a score-aware scrolling view. The same events drive the audio, falling notes, keyboard highlights and note-by-note practice. MIDI files still use the existing *pitch-and-timing* guide: MIDI does not encode a faithful printed score.
4. To continue using the personal RPG library, re-use your previously saved MIDI arrangements. The shared release does **not** include third-party RPG MIDI content. Personal MIDI exports remain private standalone HTML files; don't publish those exports.

## v0.13.1 notation accuracy and layout fixes

- Added a separately tested **pure score-layout module** for pitch geometry, collision-resistant note spacing, chords, and accidentals. Audio timings are never modified; horizontal visual positions are stretched only to make notes legible.
- Reworked the MIDI pitch guide and the MusicXML score view: wider space between treble and bass, protected clef/label gutters, single shared stems for simple chords, better ledger lines, and more legible notehead spacing.
- Corrected MusicXML accidental scope by track/staff within a measure.
- The live key readout now identifies the **last key touched**, rather than incorrectly implying it shows the most recently sounding playback note.
- Added unit tests for chord collisions, accidentals, staff positions and note timing, plus a dense two-hand MIDI visual regression on an iPhone-sized viewport.
- Preserved the existing audio playback, song import, MIDI storage, kalimba, immersive mode and single-file personal song export.

## Exactly what changed

- `src/core/musicxml.js` — bounded browser MusicXML parser handling uncompressed `score-partwise` documents, two or more staves, voices, chords, rest events, key/time changes, tempo changes and ties for audible note durations. It normalizes notation to the existing timed MIDI-shaped note model without losing score metadata. Standard MusicXML external DTD declarations are stripped safely, not fetched; custom entities are rejected.
- `src/visual/score-renderer.js` — separate, scrolling canvas renderer for imported MusicXML with true staff pitch positions, ledger lines, printed measure boundaries/numbers, simple rest glyphs and notehead values, meter/key display and current-note highlighting. It culls offscreen events and caches track filters.
- `src/ui/song-notation.js` — switches between the MusicXML score-aware renderer and the previous MIDI pitch guide automatically.
- `src/ui/song-library.js` — recognizes `.musicxml` and `.xml` in generic song import while retaining all previous MIDI personal library features.
- New example MusicXML file and headless desktop/mobile regression checks; existing v0.12 unit and browser tests are still part of the gate.

## Important limitations (don't mistake this for finished engraving)

- This is **NOT VexFlow or equivalent professional engraving**. A proven library could not be vendored within this build environment, so this release focuses on verified layout corrections rather than claiming full engraving. Printed beams, multi-voice collision avoidance, tuplets, slurs, articulations, layout breaks and repeat signs are not rendered fully. Basic notes, flags and rests are drawn; the score view is designed to be useful and synchronized, not to replace publisher notation.
- Compressed `.mxl` is **not supported yet**. In MuseScore, export **uncompressed MusicXML**. Lyrics, instrument transposition, percussion, measure-repeat directives and complex scores are not fully supported.
- The private-song HTML exporter embeds downloaded **MIDI**, not imported MusicXML; importing MusicXML currently lasts for the open browser session.
- Actual iPhone Safari audio, touch behavior and real-origin IndexedDB persistence still require physical-device acceptance testing. Headless mobile emulation isn't an iPhone.

## Developer workflow

Requires Python 3, Node 22+, TypeScript compiler 5.x. Browser tests also require Playwright and Chromium, plus the pre-existing Python test requirements.

```bash
python scripts/build.py
bash scripts/validate.sh
python scripts/package.py
```

The released `index.html` is a small shell loading **22 real ES modules and external CSS**. The generated `standalone.html` is a separate private-export artifact built from the same source modules. TypeScript migration remains incremental (two existing `.ts` files). No VexFlow runtime package or network dependency has been added for sheet music.
