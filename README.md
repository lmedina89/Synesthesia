# Garden Notes v0.11 — genuine modular deployment

A personal, lightweight browser piano and 17-key kalimba trainer, continued from the **unmodified v0.10 baseline**. Its public GitHub Pages application is now a **native ES module graph**, not an HTML file containing the whole program.

## Deploy to GitHub Pages

1. Keep a backup of your personal MIDI files. Browser storage is associated with your site URL and browser, and can be cleared independently.
2. Extract `Garden_Notes_v0.11_GitHub_Ready.zip` and upload the **contents directly to the publishing root**, with `index.html` at the root. **Keep the `assets/` subfolders and filenames.** The site must be served over HTTP(S), not opened as `file://`.
3. Visit your existing site URL. Select the song, instrument, or exercise. The first loading of piano samples may require internet access.

## File structure

```text
index.html                    # HTML markup, no inlined application or style code
assets/styles.css             # stylesheet
assets/app.js                 # UI composition root / active song session
assets/core/*.js              # theory, notation, MIDI, transport, practice and catalog
assets/audio/engine.js        # samples, Web Audio, interruption recovery
assets/visual/*.js            # notation and falling-note rendering
assets/storage/song-store.js  # IndexedDB storage (unchanged data format)
assets/ui/*.js                # instrument training, keyboard, focus mode, library
standalone.html               # generated, embedded-JS/CSS version ONLY for private export
example-song.mid              # original, redistributable testing exercise
release.json                  # checksums and module count
```

`index.html` is around 14 KB; the deployed app has **15 separate JavaScript modules plus a CSS file**. The normal site does not load or execute `standalone.html`; that file is fetched **only if you choose to export a private song package**. The portable personal copy is created from those same sources, then your own MIDI data is inserted locally. Never publish your personal embedded-MIDI HTML to a public GitHub repository.

## Developer commands

No NPM dependencies are needed for the application itself. Python 3, Node 22+, and optional browser-test dependencies are required for development.

```bash
python scripts/build.py
bash scripts/validate.sh
python scripts/package.py
```

`npm run build` and `npm test` are wrappers for the above if you prefer Node commands. The production application uses native ESM, **not Vite or TypeScript**; source files are ordinary JavaScript with modular interfaces. Some non-UI modules pass static `tsc --checkJs`. We have not claimed a fully typed codebase.

## What was preserved

The MIDI parser, calibrated clef positions, 88-key piano, 17-key kalimba, guide, falling notes, audio lookahead, piano samples with fallback, iPhone immersive view, touch-to-play and chord practice, save/import/delete library features, private embedded-MIDI exports, and the original local storage keys were carried over. Balamb Garden and Garden of the Gods are **slots only**; the third-party MIDI files are **not** bundled.

## Verification and known limits

- 24 unit/module tests: music theory, notation, MIDI, timing, and direct ES module imports.
- Automated browser tests: desktop, mobile portrait, landscape, MIDI import, practice, kalimba, simulated iOS interruption and audio clock, private export and reopen.
- Public distribution contract: CSS and JS external, every relative ESM import resolves, no big inline code in `index.html`.
- Screenshot comparisons against v0.10: no material layout difference.
- **Not verified:** real iPhone Safari hardware and actual audible grand-piano quality. Real-origin IndexedDB persistence across reload was not retested here because the sandbox browser blocks local URL navigation; the old storage code and schema are preserved. Run `GARDEN_REAL_ORIGIN_TEST=1 bash scripts/validate.sh` outside that restriction to enable this additional integration check.
- Scrolling staff is not professional sheet engraving; some rhythmic notation and hand assignment are approximations from MIDI.

The source ZIP includes earlier working baselines; retain it for future changes instead of editing built assets directly.
