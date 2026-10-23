# Garden Notes v0.14.1 — Guided Practice Engine (stability update)

Built incrementally from the **v0.13.4** modular developer source, with the v0.14 guided-practice additions. The prior uploaded v0.14 ZIP remains a separate recovery baseline.

**v0.14.1 correction:** An exact-end-of-measure MIDI could add an empty measure after its last playable event. This update prevents that off-by-one condition in both the modular site and the standalone file. It also corrects the private export filename version. No lesson controls or audio logic have been redesigned.

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

## Testing this distribution

This is the **GitHub-ready distribution**, not the full developer repository: the original `scripts/build.py` and browser regression scripts were not supplied in the uploaded v0.14 ZIP. These new, independently authored checks are included so this package can be tested with Node 22+ without installing dependencies.

```sh
npm test
bash scripts/validate.sh
```

The suite checks MIDI parsing, note/track selection, measure boundaries (including the v0.14.1 regression), chords, diagnostics and transport scheduling. `validate.sh` also checks JavaScript syntax, distribution file integrity and the standalone bug fix. **Neither tool simulates the iPhone Safari touch/audio environment.**

### Earlier v0.14 verification, per original release documentation

- The original v0.14 README reported 51/51 unit tests and desktop/simulated-iPhone Chromium validation. Their test code was **not included** in that ZIP, so that result was not independently reproducible from the upload alone.
- Real iPhone Safari touch chords, audio interruptions and saved-song persistence still require physical-device validation.
- VexFlow 4.2.2 is loaded from a CDN and has not been independently runtime-tested in this offline package.
- Your **personal Balamb Garden MIDI** is not bundled here. Import it into the app and use **Copy MIDI diagnostic** to confirm real measure and track structure.

This is a personal tool; third-party arrangements are **not bundled** with the public GitHub release.
