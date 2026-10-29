# Tabata

Tabata timer PWA, meant to be installed and used **offline on mobile** (iPhone, from the home screen).

Live: https://pappum.github.io/tabata-timer/ (GitHub Pages, serves the pushed `main`).

## Structure
- `index.html`: markup — three views: `#setup`, `#timer`, `#done`.
- `style.css`: styles. Colors are CSS variables on `:root`; the phase sets the body class (`prep`, `work`, `rest`, `cycleRest`, `done`), which switches `--bg` / `--fg`.
- `app.js`: app logic.
- `fonts/`: embedded fonts (Google Fonts latin subset, OFL) — `figtree.woff2` (text, variable 300–900) and `bebas-neue.woff2` (all digits).
- `sw.js`: service worker, cache-first for all app files.
- `manifest.json`, `icon-180.png`, `icon-512.png`: PWA install.
- `DESIGN_BRIEF.md`, `assets_brief/`: design brief and references.

No external dependencies, no build step, no framework.

## Behavior
- Settings: prep, work, rest, sets, cycles, rest between cycles. Durations via −/+ (±5 s) or direct input (minutes and seconds fields); sets/cycles via −/+ or input.
- Total session duration shown at the top of the settings screen.
- Keys in `cfg` / `localStorage` (key `tabata`): `prep`, `work`, `rest`, `sets`, `cycles`, `cycleRest` — durations **in seconds**.
- Bounds: work ≥ 5 s, other durations ≥ 0, max duration 99:59, sets and cycles 1–99.
- Session = prep once, then `cycles` × (`sets` × work, with rest between sets), with rest between cycles. A 0 s phase is skipped.
- Timer screen: phase label, progress bar, time in `m:ss` (smaller font from 10:00), total time left, set/cycle dots (text `n / N` above 12; cycles row hidden when 1 cycle), "Ensuite" pill with the next phase, Arrêter / Pause / skip-to-next.
- Phase colors (background): prep yellow, work green, rest red, rest between cycles light blue.

## Design constraints
- Digits must use a font with tabular figures, otherwise the time jumps every second. Check `tnum` before switching fonts.
- iOS draws a blur under the status bar in home-screen mode (not removable from the page, `status-bar-style` has no effect): views keep extra top padding (`safe-area-inset-top + 36px`) so content stays out of it.

## Cache versioning (`sw.js`)
- Any change to app files requires changing `C` in `sw.js`, otherwise the installed app keeps serving the old version.
- Any new app file must be added to the `A` list in `sw.js`, otherwise it won't be available offline.
- During dev: `tabata-vNbX` (bump `X` on each change).
- Release: plain `tabata-vN`.
- `apple-mobile-web-app-status-bar-style` changes only apply after removing and re-adding the app to the home screen.

## Run locally
```sh
python3 -m http.server
```
then http://localhost:8000. On the iPhone (same Wi-Fi): `python3 -m http.server 8000 --bind 0.0.0.0`, then `http://<Mac IP>:8000` (Wi-Fi is `en1` on this Mac: `ipconfig getifaddr en1`). Over plain HTTP the service worker and wake lock are disabled.
