# Garden Notes v0.13.2 architecture

The v0.13.1 modular structure is preserved. `src/core/engraving-model.js` prepares a bounded, non-DOM model of the visible MusicXML or inferred-MIDI staff voices. `src/visual/vexflow-renderer.js` uses VexFlow to draw only four nearby measures into SVG, with a notehead-anchored cursor interpolated between onset positions. `src/ui/song-notation.js` selects VexFlow if available and automatically falls back to the older Canvas guide otherwise. The fall-through is never allowed to interrupt the audio or rolling-key visualizer.

We do not parse sound into musical scores. MIDI input now carries original tick positions, avoiding tempo-to-beat guesses for imported standard MIDI files. Inferred notation is labeled as such; MusicXML retains its own meter and clef data. The VexFlow library remains version-pinned to 4.2.2 and is requested over HTTPS when the user opens the site; no CDN code is stored in the ZIP.

Risk and validation status: 38 unit tests and browser regressions pass, including an adapter test with a VexFlow-compatible mock. Because runtime internet access is unavailable here, actual VexFlow glyph rendering and iPhone Safari cannot be certified. v0.13.1 is preserved under `baseline/` as a rollback artifact.
