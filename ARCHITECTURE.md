## v0.15.1 small UI hotfix

Replaces the ambiguous mode toggle with two explicit buttons, each wired to `selectLayout(next)` with `aria-pressed` synchronization. A no-op selection keeps transport and lesson state intact. CSS grants Balanced score more vertical room in short landscape screens without altering shared X-coordinates for roll/keyboard.

# Garden Notes v0.13.4 architecture

The v0.13.1 modular structure is preserved. `src/core/engraving-model.js` prepares a bounded, non-DOM model of the visible MusicXML or inferred-MIDI staff voices. `src/visual/vexflow-renderer.js` uses VexFlow to draw only four nearby measures into SVG, with a notehead-anchored cursor interpolated between onset positions. `src/ui/song-notation.js` selects VexFlow if available and automatically falls back to the older Canvas guide otherwise. The fall-through is never allowed to interrupt the audio or rolling-key visualizer.

We do not parse sound into musical scores. MIDI input now carries original tick positions, avoiding tempo-to-beat guesses for imported standard MIDI files. Inferred notation is labeled as such; MusicXML retains its own meter and clef data. The VexFlow library remains version-pinned to 4.2.2 and is requested over HTTPS when the user opens the site; no CDN code is stored in the ZIP.

Risk and validation status: 38 unit tests and browser regressions pass, including an adapter test with a VexFlow-compatible mock. Because runtime internet access is unavailable here, actual VexFlow glyph rendering and iPhone Safari cannot be certified. v0.13.1 is preserved under `baseline/` as a rollback artifact.


## v0.13.4 correctness contract

`core/engraving-model.js` prepares quarter-beat timeline events on a sixteenth-note grid. For MusicXML, non-representable rhythms are rejected, not rounded. For MIDI, inferred notation is quantized (up to 1/8 beat); source note playback times remain untouched. Note durations are decomposed into VexFlow base values with dots and tie links. More than four independent simultaneous voices triggers fallback instead of omission. Explicit MusicXML accidentals are passed through; renderer maintains per-measure pitch accidental state.

The `visual/vexflow-renderer.js` is a progressive enhancement; failures are surfaced through `getLastFailure()` and `ui/song-notation.js`. Real third-party library validation is still blocked in this sandbox; this release is not a claim of fully validated engraving.

## v0.14 isolated guided lesson selector

`src/core/guided-lesson.js` provides pure deterministic measure resolution, hand-track selection, section filtering, grouped chord validation, and local diagnostic report generation. The existing `src/ui/song-studio.js` composes lesson state with song playback and steps. The existing MIDI parser now preserves a bounded practice-measure table from time-signature and tempo metadata; MIDI with missing/changing meter is explicitly marked approximate. Note help uses the same normalized song events as the keyboard/audio; no fake user scores.

Avoid adding UI/DOM dependencies to `core/guided-lesson.js`. Retain original v0.13.4 as a protected rollback. `v0.14` is deliberately not a new sheet-engraving implementation.


## v0.15 landscape presentation boundary

`src/ui/focus-mode.js` now owns the immersive layout state (`balanced` or `piano-first`), settings-drawer DOM relocation with comment-anchor restoration, and horizontal zoom/navigation. `src/styles.css` owns a single-column landscape grid for both layouts; `src/template.html` provides the one mode switch, settings drawer and score summary. Neither playback scheduling, note grouping, midi timing, staff assignment nor instrument rendering was rewritten.

The `song-scroll` viewport is the full screen width in landscape. `song-scroll-inner`, `songRoll` and `songKeys` remain in the same native 1,508-unit coordinate space and receive a single `scaleX`. A single zoom value controls key widths and roll alignment, with keyboard view recentering upon significant resize. The visible keyboard does not claim all 88 keys are simultaneously visible.

Private export (`src/ui/song-library.js`) restores a transient focus layout in a cloned standalone document before exporting, preventing controls being stranded inside a settings drawer on reload.

Validation: 51 existing Node unit tests plus Playwright landscape 844x390, 667x375, 932x430; browser song-guided lesson, import/MusicXML/notation/audio, renderer adapter, responsive score, and portable-song export regression. Physical iPhone Safari/real CDN VexFlow are pending manual smoke testing.
