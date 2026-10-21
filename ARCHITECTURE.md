# Garden Notes v0.12 architecture decisions

### Baseline and constraints
v0.11 remains unchanged in the provided previous release ZIPs. v0.12 maintains the native ES module deploy, no mandatory runtime framework, consistent private standalone export, identical IndexedDB/localStorage schema, no redistributed commercial MIDI arrangements, and the existing UI and iPhone-sized immersive view.

### Dependency direction

```
src/app.js (composition root, DOM bindings, shared preferences)
    |-- app/preferences.ts (typed, pure validation/persistence)
    |-- audio/engine.js
    |-- ui/beginner-trainer.js
    |-- ui/song-studio.js (session owner)
          |-- core/song-state.ts (typed, pure song helpers)
          |-- core/{transport,session,catalog,notation,theory}.js
          |-- visual/{roll-renderer,staff-renderer}.js
          |-- ui/{song-notation,song-keyboard,focus-mode,song-library}.js
                    |-- storage/song-store.js
```

Song state is now private to the Song Studio factory instead of being stored in the application root; its outward callback interface is intentionally narrow. The beginner trainer has only a tiny injected `songCallbacks` adapter. Its persistent preferences are handled by a typed stable-schema adapter; no UI component writes the v1 preference key directly.

### Incremental TypeScript
Only `app/preferences.ts` and `core/song-state.ts` are migrated. These compile with `tsc --strict` into `.compiled/` before public/standalone packaging. The remaining JavaScript is *not* type checked as a whole, so this milestone must not be called a complete TypeScript conversion.

### Invariants and tests

- Identical original key `garden-notes-v1` for preferences; schema compatible.
- IndexedDB schema and song parser unchanged.
- Every public relative ESM import resolves within `dist/assets/`.
- The original 24 v0.11 unit tests must continue passing, in addition to typed helpers and existing browser/integration checks.
- Preserve public modular HTML and separate personal standalone output generated from the exact same source.
- No new song content without licensing approval.
- Real-origin persistent storage and actual hardware Safari playback are still outstanding tests, not validated facts.

### Follow-up work

1. Continue splitting transport/UI event wiring from `ui/song-studio.js` only when backed by tests; avoid turning one file-size target into gratuitous modules.
2. Extend TypeScript typing through the song-session interfaces and audio scheduler, measuring type errors and regression impact before enabling strict `checkJs` across legacy code.
3. Add actual-origin production smoke tests in CI/CD (real `http(s)`, IndexedDB persistence/reload, fetch errors, CSP checks) and physical iPhone acceptance.
4. After stability, improve staff engraving and practical section-loop practice; don't introduce unrelated features during refactors.
