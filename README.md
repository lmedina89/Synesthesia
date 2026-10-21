# Garden Notes v0.7 — Immersive Practice & iPhone Sound Recovery

A single-file HTML/CSS/JavaScript piano + kalimba learning app, building on the v0.6 MIDI trainer.

## What's new

- **Immersive practice**: pressing **Play song** automatically expands the falling notes, scrolling treble/bass staves, and touchscreen piano to a screen-filling layout. You can also tap **Full-screen practice** before starting. **Exit** restores the normal page without losing your song position.
- **Larger piano keys**: expanded keyboard defaults to **170% horizontal scale**, with `−` and `＋` to adjust from 120% to 245%. All 88 notes are available by scrolling left/right, with scrolling-key tracking during song playback.
- **Mobile landscape**: side-by-side scrolling staff and piano for more usable keyboard height.
- **Audio wake-up**: handles visibility changes, Safari audio interruption/suspension, and window focus/pageshow. Attempts to resume automatically and, if blocked by Safari autoplay policy, shows a persistent **Restore sound** button. If playback was in **Watch & Listen** it pauses on backgrounding instead of silently skipping notes. **Wait for my notes** preserves current practice position.
- **Preserved**: grand piano sample playback when online, synthesized fallback, kalimba, note-label controls, guided lessons, song MIDI import, local song storage and private exported song HTML file support.

## iPhone usage

1. Open the app in Safari or from GitHub Pages, choose your song or demo, and tap **Play song**. Practice expands automatically.
2. Swipe sideways over the keyboard to reach other octaves. Tap `＋` if adjacent keys feel too small; `−` to show more keys.
3. Tap **Pause**, **Play**, or **Exit** from the compact toolbar.
4. If audio stops when returning from another app, use **Restore sound** when shown. iOS may require a real user gesture to unlock Web Audio; this avoids having to reload the entire page when possible.

**Safari note:** The practice layout fills the page viewport, but Safari's address/navigation bars may remain visible because iPhone Safari does not reliably offer the JavaScript Fullscreen API for ordinary web pages. Add to Home Screen for a more app-like experience where supported.

## Songs and copyright

The distributed ZIP still **does not contain** the third-party Balamb Garden or Garden of the Gods MIDI arrangements. Song slots and personal import/export features are unchanged from v0.6. Free download does not necessarily allow redistribution. A private exported song pack can include your personally sourced MIDI files; don't put that file into a public GitHub repository.

MIDI info and arranger sources are in the in-app Song Studio. Audio samples are from the Salamander Grand Piano (Alexander Holm, CC BY 3.0), provided on a third-party CDN, and may need internet access at initial load. See `LICENSE_SAMPLES.md`.

## Deploy

Upload contents of the ZIP at the **root** of your GitHub Pages repository (`index.html` directly at root). Or open the standalone HTML from a compatible browser. iPhone Files preview may not run the interactive JavaScript correctly.

## Verification

Validated in desktop Chromium, mobile-sized Chromium, and landscape emulation: focus mode, keyboard zoom, MIDI import, song playback and pause, kalimba, and a simulated interrupted AudioContext returning to running after a user gesture. Native iPhone Safari testing remains necessary.
