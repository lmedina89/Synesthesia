# Garden Notes v0.13.1 — music notation module architecture

## Boundary: normalized timed notes vs printed musical score

`MusicXML.parseMusicXML(xml)` returns `song = {name,source,notes,tracks,duration,score}`:

- `notes[]` follows the pre-existing transport contract `{midi,start,end,track,velocity}`. Starts/ends are in **seconds** after a piecewise tempo-map conversion. Tied attacks are joined for audio.
- `score.notes[]` retains note-by-note pitch spellings, original written duration in quarter beats, clef, voice, part, staff track, measures, and tie status.
- `score.rests[]` retains original rests and durations.
- `score.measures[]` carries index/number, start/end, written meter and fifths in the key signature.
- UI chooses the score-aware renderer **only when `song.score.type === 'MusicXML'`**; the original MIDI renderer is preserved as-is. Both use the same `songPosition` computed from the Web Audio transport, including pause/seek/speed.

## Source files

```
src/core/musicxml.js              # pure timeline/notation parsing after DOMParser
src/visual/score-renderer.js      # score-aware canvas, independent from MIDI renderer
src/visual/staff-renderer.js      # preserved existing MIDI pitch guide
src/ui/song-notation.js           # presentation router
src/ui/song-library.js            # MusicXML or MIDI import
src/ui/song-studio.js             # unchanged transport/session owner
scripts/build.py                 # real native ESM public build + portable standalone
```

## Invariants and checks

- Original 30 unit tests pass, plus existing desktop/mobile, audio timing, simulated iOS interruption, personal-song export, and public-to-private roundtrip tests.
- The new `tests/musicxml_browser.py` verifies dual staff import, four-quarter meter, one-sharp key signature, half/whole/eighth note values, rests, 90 BPM piece timing, standard MusicXML DTD handling, entity rejection, mobile rendering, seek, and guided practice.
- Public deploy still loads separate JS modules. The private standalone bundle is generated from the same files. No third-party RPG arrangements are distributed.
- Original local song storage keys unchanged. Save a backup of personal MIDI files before upgrading.

## Next work (not completed here)

1. Evaluate and vendor a proper notation engraving library for beaming, tuplets, voices, horizontal spacing, and page breaking; retain the score/MIDI timeline adapters and tests.
2. Add compressed `.mxl` input and score persistence, with file-size and parser security tests.
3. Enable section-loop learning, strict chord recognition and physical-keyboard capture (when the browser supports it).
4. Validate on a real iPhone Safari and an actual GitHub Pages origin. These remain explicit unverified acceptance gates.
