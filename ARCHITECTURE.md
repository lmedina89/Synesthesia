# Garden Notes v0.11 — architecture and refactor record

## Why this release exists

The v0.10 deploy combined all JS and CSS into one ~114 KB HTML file and used a ~41 KB `src/app.js` controller. Despite some separate source files, this was misleadingly described as fully production-refactored. v0.11 fixes those **two specific problems** without changing the user's preferred interface or rewriting the audio engine.

## Real module boundaries

- `src/app.js` — composition root, audio transport, song session orchestration, and UI wiring, **~18 KB** versus previous ~41 KB; further controller cleanup is possible.
- `src/ui/beginner-trainer.js` — introductory lessons, note drills, instrument switching and score.
- `src/ui/song-keyboard.js` — 88-key keyboard creation and pointer inputs.
- `src/ui/focus-mode.js` — immersive viewport sizing, zoom and keyboard centering.
- `src/ui/song-library.js` — song selection, IndexedDB MIDI import/delete, private export.
- `src/visual/roll-renderer.js` — falling note frame painter.
- `src/visual/staff-renderer.js` — treble/bass staff drawing, already isolated in v0.10.
- `src/core/{theory,notation,session,transport,catalog,midi}.js` — musical and timing logic.
- `src/audio/engine.js` — Web Audio, piano samples, interruption recovery.
- `src/storage/song-store.js` — same IndexedDB schema and keys as before.

Components communicate using **explicit ES module imports** and small injected callbacks rather than untracked global concatenation order. Modules that need song-session feedback receive callbacks at initialization; pure modules do not depend on DOM or playback.

## Two build targets, one source of truth

`scripts/build.py` validates module parseability, copies source modules and CSS to `dist/assets`, and creates `dist/index.html` with external CSS and a native `<script type="module">` reference. Separately, it compiles those **same modules** into `dist/standalone.html` for private embedded-MIDI export, preserving the existing feature without dictating the deploy architecture.

No third-party build system or external compilation service is required. The reference deployment needs HTTP(S) to load browser modules; GitHub Pages supports it. This is not yet a bundled/minified production optimization, and we make no false TypeScript/Vite claims.

## Test gates

1. Unit tests for MIDI/theory/notation/scheduling and native ESM imports.
2. Distribution checks for external assets, import graph, no big inline script/style.
3. Automated Chromium tests (desktop / portrait / landscape) and simulated audio interruptions.
4. Private packed-song export tests for both standalone and modular-to-standalone paths.
5. Regression visual comparison against v0.10 screenshots.

The current execution environment blocks direct navigation to localhost and file URLs in Chromium. Tests therefore load the **same release module bytes** through test-only data-URL imports to check runtime functionality. This validates the module graph and browser behavior but is not a substitute for a real HTTP origin and physical-device check.

## Next technical work (not claimed complete)

- Further split song-session/application state and input controls from the 18 KB composition root.
- Add strict TypeScript type coverage and incremental migration if it delivers practical value.
- Verify real-origin IndexedDB migration, file downloads and sample fetches on a physical iPhone.
- Accurate MusicXML notation, hand/chord practice scoring, practice sections and MIDI keyboard hardware input.
- Improve test harness for network/CSP error cases and high-polyphony performance.
