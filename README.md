# Garden Notes v0.14 — Guided Practice Engine (release candidate)

Built incrementally from the **v0.13.4** modular developer source. All existing releases are kept unchanged as recovery baselines.

## New: Guided Lesson

The opt-in lesson panel defaults to:

- **Right hand**
- **Measures 1 through 4**
- **50% speed**
- **Automatic looping enabled**

Press **Start guided lesson** to activate these choices, then tap the green notes on the piano. When the last note in the selected measure range is completed, the app returns to the first note if looping is enabled. Optional **Strict chord checking** requires a chord's notes to be pressed within 650 ms and resets the attempt for an extra/wrong note. The default allows one-at-a-time chord practice. The 50% tempo setting applies when switching to **Watch & Listen**; the step-by-step mode waits for your input at your own pace.

For normal full-song playback, leave the lesson or use Watch & Listen outside the guided session.

### Musical honesty

- MusicXML files use the imported score's **actual measure boundaries** when available.
- MIDI files with an initial time signature use the **MIDI meter** and tick-to-second tempo mapping to determine practice sections.
- MIDI files without a time signature use an **explicitly labeled inferred 4/4 grid**. Songs with mid-song time-signature changes currently show a warning and approximate boundaries rather than claiming a perfectly accurate score.
- Hand assignment uses explicitly named right/left tracks (or MusicXML staff 1/2). Ambiguous multi-track MIDIs **will not be guessed**. You can manually select the correct MIDI track, then start the lesson.
- The lesson checks **pitches/chord inputs**, not expressive touch, fingering or precision timing. It is not a substitute for instruction on hand technique.

## New: learn notes + private MIDI diagnostics

- Tap **upcoming-note buttons** to hear the corresponding piano pitch, see its name, source track, and written beat duration when available.
- In successfully engraved VexFlow mode, tapping near a rendered notehead may identify the note. This is a new integration and still needs validation with the real VexFlow runtime on iPhone; the independent note buttons work without VexFlow.
- Tap **Copy MIDI diagnostic** after loading your Balamb Garden MIDI. Garden Notes builds a plain-text, local-only summary of its track names, pitch range, measure grid and first 80 note events. It does **not** send or upload the MIDI. Paste that text into ChatGPT for source-data validation. If clipboard access is blocked, a `.txt` copy downloads instead.
- This report allows pitch/timing/data checks **but cannot prove a transcription matches Lara6683's recording** without a comparable reference score/performance transcription.

## Existing features preserved

88-key piano and real Yamaha C5 samples with fallback, kalimba, falling notes, MIDI/MusicXML import, personal indexedDB song library and private HTML export, screen-filling responsive practice, Safari audio recovery, and sheet-music renderer/fallback.

## Development

```sh
python scripts/build.py
node --test tests/guided-lesson.test.mjs
python tests/guided_browser.py
bash scripts/validate.sh
```

Build outputs are in `dist/`. The GitHub-ready ZIP uses native ES modules and separate CSS, not a monolithic runtime HTML. The stand-alone private HTML export is built from the same modules and may embed a user's own imported MIDI songs.

### Verification completed in this environment

- 51/51 unit tests, including 7 new guided practice tests.
- Desktop and simulated iPhone Chromium: guided defaults, labeled right-hand MIDI track filtering, note feedback, 1–4 looping, note inspector, diagnostic action, and normal watch/listen regression.
- Existing desktop/mobile/landscape, MIDI/MusicXML, simulated audio interruption, engraving adapter/fallback, and private MIDI export tests completed. The combined shell suite exceeded the runner's time budget late in the run; its final public-export case passed separately.

### Outstanding gates

- Physical iPhone Safari validation of touch chords, playback, audio interruptions and saved-song persistence.
- Real VexFlow 4.2.2 integration remains CDN-loaded and was not available for testing locally; existing fallback is retained.
- Verify your **specific personal Balamb Garden MIDI** by sharing the text diagnostic; that file lives in your browser and is not included here.

This is a personal tool; third-party arrangements are **not bundled** with the public GitHub release.
