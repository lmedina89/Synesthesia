# Garden Notes v0.4 — Light-up Song Studio

An iPhone-friendly, no-build-tools-required **piano and kalimba learning app**. All of v0.3's features are preserved: playable octave piano, 17-key kalimba, real recorded Yamaha C5 piano samples when online, note finding, ear training, staff reading, and warmups.

## New in v0.4

- Scrollable **88-key** piano and falling-note visualization.
- **Watch & listen**: light up the right keys and play the MIDI performance on the piano samples.
- **Wait for my notes**: green keys show the next note or chord. Tap them yourself; the timeline waits until you hit all required notes. Chord notes can be tapped one by one.
- **MIDI import**: load a local `.mid` or `.midi` file (standard MIDI formats 0 and 1, with pulse-per-quarter-note timing) directly in the browser; notes and tracks stay local to the webpage.
- **Track selection**: learn right hand / left hand separately if they are exported as different MIDI tracks. (Some MIDI files have everything on one track.)
- **Speed control** (25–125%), timeline seeking, pause and restart, keyboard auto-centering.
- **Demo songs**: Twinkle Twinkle Little Star, C-major scale, chords & melody.
- **Existing 17-key kalimba** can also be used in step practice for matching notes in its range.

## Quick start on iPhone

1. Put `index.html` at the root of a GitHub repository and enable GitHub Pages under **Settings → Pages → Deploy from a branch → main / root**. Visit the published HTTPS URL in Safari.
2. Tap **Open light-up song trainer** near the top, or scroll to **Follow the glowing keys**.
3. Choose a demo, then press **Play song** in Watch mode.
4. Try **Wait for my notes**, press Start, and tap green keys to move forward.
5. To learn your own music, download a **piano MIDI** arrangement from a source you're authorized to use, then tap **Import a MIDI song** and select the `.mid` file from the Files app.
6. If the music has separate tracks, select **Practice part** to learn one hand at a time.

We include `example-song.mid`, a short, original, two-track demonstration that you can use to test the import process without downloading anything else.

### Important limitations

- **MIDI files are not MP3s.** The app cannot transcribe an MP3, YouTube link, live stream, or microphone recording automatically into accurate piano-key instructions. A score or MIDI transcription is required.
- The app plays MIDI **note events on its sampled piano**; it doesn't reproduce every original instrument, pedal event, acoustic nuance, or mixer effect in the file. If the MIDI includes multiple instruments, use track selection.
- The software keyboard **does not listen to your physical keyboard**. Step mode recognizes taps on the onscreen keys. External MIDI hardware input is not supported in this version.
- The full 88 keys require **horizontal swiping** on phones; the piano scrolls toward the next key automatically.
- The sample audio requires internet access to load its real grand-piano recordings from a third-party host. While loading, or if samples fail, synthesized notes are used. iOS Safari needs a user gesture to unlock Web Audio.
- Imported files have a 5 MB size limit, a 200,000 event safeguard, and a four-hour length cap. MIDI format 2 and SMPTE-timed files aren't supported.
- We tested in headless Chromium, including iPhone-sized mobile emulation. **This is not the same as hands-on Safari testing on an actual iPhone.**

## Deployment and structure

No npm packages or build step. The only page is `index.html` (plus optional docs and test MIDI). ZIP contents are at the repository root rather than inside a nested directory. MIDI parsing and visualization run entirely in the browser with no JavaScript dependencies.

## Attributions

Piano samples: Salamander Grand Piano V3, recorded by Alexander Holm, CC BY 3.0. Samples are fetched from Tone.js' public demo CDN and are *not* included in the ZIP. Read `LICENSE_SAMPLES.md` for links and details.

Garden Notes is an independently built learning tool and isn't affiliated with Final Fantasy, Square Enix, Nobuo Uematsu, Lara6683, or the Salamander sample host.
