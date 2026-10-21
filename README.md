# Garden Notes v0.10 — Audio Clock & Playback Reliability

Garden Notes is a **personal**, lightweight browser piano/kalimba trainer with an 88-key keyboard, falling-note practice, scrolling treble/bass staff, MIDI import, full-viewport iPhone practice, and sample-based Yamaha grand-piano sounds (with synthesizer fallback).

## Install

**GitHub Pages:** extract the `Garden_Notes_v0.10_GitHub_Ready.zip` directly to the site's publishing root, with `index.html` at the root. Keep the existing site URL to retain imported songs in that browser's IndexedDB. Make a backup of your MIDI files first; private and browser storage can be cleared independently.

**Developer build:** `python scripts/build.py` generates `dist/index.html` deterministically; `bash scripts/validate.sh` runs regression tests. `python scripts/package.py` makes both release ZIPs. No JavaScript runtime packages are needed for production. Development tests require Node, `tsc` (optional), Python Playwright, Chromium and `mido`.

## Changes since v0.9

- `src/core/transport.js`: independent Web Audio look-ahead transport. A 25 ms timer schedules events up to 160 ms in advance on the AudioContext clock. The visual frame loop consumes position data instead of starting notes.
- `src/audio/engine.js`: accepts absolute start times for both recorded piano notes and synthesized fallback. Tracks song voices to stop them when pausing/seeking/changing speed; exposes clock and an interruption callback.
- `src/app.js`: uses the unified clock for song position, transport starts, pausing, seeking, switching rates, and pauses on audio interruption. Mute/unmute never mixes timestamp epochs.
- Preserves the existing UI, kalimba, 88-key canvas and touch controls, custom MIDI imports, private MIDI HTML export, and existing browser song storage keys.

## Known limitations

- Real piano samples are fetched on demand from an external server; first-use internet access is needed. Synthetic piano tones play when samples cannot load. Real external samples and their CC BY attribution are listed in `LICENSE_SAMPLES.md`.
- Backgrounded iOS Safari may require tapping **Restore sound** and **Play** after returning. Playback pauses rather than silently continuing out of sync. Actual physical-device verification is still outstanding.
- Scrolling notation is pitch-accurate but not complete engraved sheet music: MIDI rhythms, ties, rests, proper enharmonics and editorial hand assignments require further work (MusicXML candidate).
- No real physical MIDI keyboard input; touch/onscreen only.
- Third-party RPG MIDI files are **not bundled**. Balamb Garden and Garden of the Gods remain one-time personal import slots. You can create a personal copy with embedded song bytes using the existing private HTML export. Do not deploy your private embedded song version publicly on GitHub Pages.
- The browser simulator verifies clock scheduling and recovery, not audible sound quality on a physical iPhone.

## Validation

- **23/23** Node unit tests for theory, MIDI, notation, practice, and transport.
- Static TypeScript `checkJs` on non-UI modules.
- Browser regressions on desktop, portrait mobile and landscape UI, MIDI import, kalimba, practice buttons, sample recovery UI.
- Additional simulated Web Audio test checks scheduling timestamps, playback progress, speed change, mute/unmute and interruption recovery.
- Private HTML MIDI export/reopen verification.
- Previous v0.7, v0.8, and v0.9 single-file baselines preserved in `baseline/`.

See `ARCHITECTURE.md` for module boundaries and design decisions.
