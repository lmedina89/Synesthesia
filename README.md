# Garden Notes v0.12 — Song session extraction & typed state foundations

This release continues directly from v0.11, preserving the *external-module* GitHub Pages app, the same UI, song library and storage key, and the standalone **personal** MIDI export.

## Install

1. Back up your personal MIDI files. The existing IndexedDB data should persist on the **same site URL and browser**, but changing origins or clearing site data can remove it.
2. Extract `Garden_Notes_v0.12_GitHub_Ready.zip`. Publish **all contents**, including the `assets/` directory, with `index.html` at the repository's GitHub Pages publishing root.
3. Open the live HTTPS page. The first grand-piano sample load requires internet. You may need to tap to unlock iOS audio.
4. Do **not** publish a personal `PRIVATE_Songs.html` file to GitHub Pages; it may contain third-party MIDI arrangements.

## What actually changed

- `src/app.js` is now a ~3.5 KB composition root, versus ~18 KB in v0.11. It wires shared Web Audio, typed persistent preferences, the beginner trainer and Song Studio.
- `src/ui/song-studio.js` independently owns transport, song selection, session progress, keyboard, song/practice mode and events. `src/ui/song-notation.js` owns the live key labels and sheet-music UI. This is a meaningful controller extraction; Song Studio is still a ~13 KB module, not a totally finished architecture.
- `src/app/preferences.ts` adds strongly typed persisted v1 preference normalization, a stable v1 storage key, safe fallback for private browsers and validated scores.
- `src/core/song-state.ts` adds pure typed helpers for note-track selection, duration, playback time bounds and display time.
- The TypeScript sources are compiled with the available `tsc` compiler to ES modules before copying to GitHub-ready assets. The other modules remain JavaScript. **This is incremental TypeScript, not a fully converted codebase.** No framework or Vite migration.
- Shared CSS and externally loaded ES module assets stay unchanged in architecture; `index.html` contains interface markup only. Generated `standalone.html` is retained specifically for personal embedded-song exports.

## Developer commands

Requires Python 3, Node.js 22+, TypeScript `tsc` 5.x, and optional Python/Chromium Playwright dependencies for browser tests.

```
python scripts/build.py
bash scripts/validate.sh
python scripts/package.py
```

`npm run build` and `npm test` call the same scripts. `tsconfig.json` uses strict type checking for two new `.ts` modules; compiled `.js` files live under `.compiled/` and are generated rather than manually edited.

## Release boundaries and validation

The tests cover MIDI, pitch/notation, song time and track selection, corruption-safe preferences, normal playback, speed, pause, simulated iOS interruption and recovery, full-screen focus, 88-key input, kalimba, MIDI import, local private-pack generation and re-opening. Chromium browser tests load the real module bytes through test-only data URLs: this environment **blocks localhost navigation**, so these checks are **not** proof of real-origin IndexedDB persistence or iPhone Safari runtime behavior. A physical-device acceptance test is still required.

The two RPG songs are not bundled as MIDI files; importing your own copies is still required. The scrolling notation is not yet an engraved MusicXML score, and the Web Audio sample backend still needs physical iPhone testing.
