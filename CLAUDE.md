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
- `changelog.md`: version history (not an app file, not cached).

No external dependencies, no build step, no framework.

## Behavior
- Settings: prep, work, rest, sets, cycles, rest between cycles. Durations via −/+ (±5 s) or direct input (minutes and seconds fields); sets/cycles via −/+ or input.
- Total session duration shown at the top of the settings screen.
- Keys in `cfg` / `localStorage` (key `tabata`): `prep`, `work`, `rest`, `sets`, `cycles`, `cycleRest` — durations **in seconds**.
- Bounds: work ≥ 5 s, other durations ≥ 0, max duration 99:59, sets and cycles 1–99.
- Session = prep once, then `cycles` × (`sets` × work, with rest between sets), with rest between cycles. A 0 s phase is skipped.
- Timer screen: phase label, progress bar, time in `m:ss` (smaller font from 10:00), total time left, set/cycle dots (text `n / N` above 12; cycles row hidden when 1 cycle), "Ensuite" pill with the next phase, Arrêter / Pause / skip-to-next.
- Phase colors (background): prep yellow, work green, rest red, rest between cycles light blue.
- Version badge (`#ver`) always shown at the bottom of the screen: cache name from `sw.js` without `tabata-` (e.g. `v2.1.0`, `v2.1.0b3`).

## Design constraints
- Digits must use a font with tabular figures, otherwise the time jumps every second. Check `tnum` before switching fonts.
- iOS draws a blur under the status bar in home-screen mode (not removable from the page, `status-bar-style` has no effect): views keep extra top padding (`safe-area-inset-top + 36px`) so content stays out of it.
- iOS home-screen mode launches the page in one of two states, varying between launches: either starting at the top of the screen (`safe-area-inset-top` = 47) or below the status bar (inset = 0). In both, `100%` / `100dvh` = screen height − 47. So `html` is `calc(100% + env(safe-area-inset-top))` with `overflow:hidden`; `100vh` (= full screen) overflows in the second state.

## Cache versioning (`sw.js`)
- Any change to app files requires changing `C` in `sw.js`, otherwise the installed app keeps serving the old version.
- Any new app file must be added to the `A` list in `sw.js`, otherwise it won't be available offline.
- Versions use three numbers: `2.0.0`, `2.1.0`, `2.1.1`…
- During dev: `tabata-vX.Y.ZbN` (e.g. `tabata-v2.1.0b1`, bump `N` on each change).
- Release: plain `tabata-vX.Y.Z` (e.g. `tabata-v2.1.0`), matching the branch `release/vX.Y.Z`, the Git tag `X.Y.Z` and the GitHub release named `X.Y.Z` (tag and release without `v`).
- Release steps: date the version's section in `changelog.md`, set plain `C`, merge `release/vX.Y.Z` into `main` (`--no-ff`), tag `X.Y.Z` on the merge, push, then create the GitHub release `X.Y.Z` with the changelog section as notes.
- `apple-mobile-web-app-status-bar-style` changes only apply after removing and re-adding the app to the home screen.

## Run locally
```sh
python3 -m http.server
```
then http://localhost:8000. On the iPhone (same Wi-Fi): `python3 -m http.server 8000 --bind 0.0.0.0`, then `http://<Mac IP>:8000` (Wi-Fi is `en1` on this Mac: `ipconfig getifaddr en1`). Over plain HTTP the service worker and wake lock are disabled.
