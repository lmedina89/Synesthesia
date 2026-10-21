# Garden Notes v0.6 — Scrolling Staff & Personal Song Export

Static, offline-capable HTML/JS interface (grand-piano samples still load from Tone.js on the internet when available).

## What's new
- Real-time **treble and bass pitch notation** that scrolls across a fixed playhead as MIDI music plays; moving noteheads, accidentals and ledger lines.
- Large **key-name readout** and options for revealing pressed, all, or no keyboard labels.
- Shows touched notes on staff even when playback is stopped.
- **Save permanent personal copy**: after importing your legally obtained MIDI files once in the song library, save an HTML file with the actual binary MIDI data embedded as Base64. The embedded file requires no separate MIDI imports on future opens; piano samples may still require the internet.
- Previous MIDI import, stored song library, real recorded piano samples, kalimba, guided practice, tempos, and hand selection remain.

## Songs and rights
This shared release does **not** contain the copyrighted MIDI arrangements. Free-to-download is not a redistribution license. It includes song slots and links to original sources. **Personal use does not make a publicly hosted GitHub Pages website private.** Keep the exported MIDI-containing HTML file private and do not commit it to a public repository without permissions. On iPhone, use the deployed app for active practice; the standalone export is also a portable backup, but the Files preview may not execute its JavaScript.

Original sources:
- Balamb Garden (Cerulean Pictures): https://www.vgmusic.com/file/b7167903bf8deb1195e96a8b0c1eba7a.html
- Garden of the Gods (Riulyn): https://www.riulynrpg.info/ (see Chrono Cross)

## Accurate notation limitation
Scrolling staff displays MIDI pitches and approximate note lengths; it is **not** an engraved rhythmically precise printed score. Track labels determine treble/bass where possible, otherwise register is used.

Upload `index.html`, `example-song.mid`, and `LICENSE_SAMPLES.md` to a static website, or open the standalone HTML locally. For iPhone Safari, use a secure host for consistent sound and IndexedDB behavior.
