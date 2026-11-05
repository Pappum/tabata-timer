# Tabata

Tabata timer PWA, meant to be installed and used **offline on mobile** (iPhone, from the home screen).

Live: https://pappum.github.io/tabata-timer/ (GitHub Pages, serves the pushed `main`).

## Structure
- `index.html`: markup — five views: `#home`, `#prefs`, `#setup`, `#timer`, `#done`.
- `style.css`: styles. Colors are CSS variables on `:root`; the phase sets the body class (`prep`, `work`, `rest`, `cycleRest`, `done`), which switches `--bg` / `--fg`. Dark theme redefines the tokens twice (same values): under `@media (prefers-color-scheme:dark)` on `:root:not([data-theme=light])`, and on `:root[data-theme=dark]`. Phase backgrounds of the timer are the same in both themes.
- `app.js`: app logic.
- `fonts/`: embedded fonts (Google Fonts latin subset, OFL) — `figtree.woff2` (text, variable 300–900) and `bebas-neue.woff2` (all digits).
- `sw.js`: service worker, cache-first for all app files.
- `manifest.json`, `icon-180.png`, `icon-512.png`: PWA install.
- `changelog.md`: version history (not an app file, not cached).

No external dependencies, no build step, no framework.

## Behavior
- Home screen (shown at launch): title "Timers", a gear button (`#settings`) opening the preferences, and a "TABATA" tile opening the settings. Meant to host other timer types later.
- Preferences screen (`#prefs`): global settings, back button (‹) returns to the home screen. Theme: Clair / Sombre / Auto (default, follows the system). Son: switch turning all beeps on / off (on by default).
- Settings screen: back button (‹) next to Démarrer returns to the home screen. Arrêter (timer) and Réglages (end screen) return to the settings, not home.
- Settings: prep, work, rest, sets, cycles, rest between cycles. Durations via −/+ (±5 s) or direct input (minutes and seconds fields); sets/cycles via −/+ or input.
- Total session duration shown at the top of the settings screen.
- Keys in `cfg` / `localStorage` (key `tabata`): `prep`, `work`, `rest`, `sets`, `cycles`, `cycleRest` — durations **in seconds**.
- Global preferences in `prefs` / `localStorage` (key `prefs`), saved with `setPref(k, v)`: `theme` (`light`, `dark`, `auto`). `applyTheme()` sets `data-theme` on `<html>` (no attribute in auto). `sound` (`true` / `false`): `beep()` returns early when off; `applySound()` sets `aria-checked` on `#sound`.
- Bounds: work ≥ 5 s, other durations ≥ 0, max duration 99:59, sets and cycles 1–99.
- Session = prep once, then `cycles` × (`sets` × work, with rest between sets), with rest between cycles. A 0 s phase is skipped.
- Timer screen: phase label, progress bar, time in `m:ss` (smaller font from 10:00), total time left, set/cycle dots (text `n / N` above 12; cycles row hidden when 1 cycle), "Ensuite" pill with the next phase, Arrêter / Pause / skip-to-next.
- Phase colors (background): prep yellow, work green, rest red, rest between cycles light blue.
- Version badge (`#ver`) always shown at the bottom of the screen: cache name from `sw.js` without `tabata-` (e.g. `v2.1.0`, `v2.1.0b3`).

## Design constraints
- Digits must use a font with tabular figures, otherwise the time jumps every second. Check `tnum` before switching fonts.
- iOS draws a blur under the status bar in home-screen mode (not removable from the page, `status-bar-style` has no effect): views keep extra top padding (`safe-area-inset-top + 36px`) so content stays out of it.
- iOS home-screen mode launches the page in one of two states, varying between launches: either starting at the top of the screen (`safe-area-inset-top` = 47) or below the status bar (inset = 0). In both, `100%` / `100dvh` = screen height − 47. So `html` is `calc(100% + env(safe-area-inset-top))` with `overflow:hidden`; `100vh` (= full screen) overflows in the second state.
- Sound uses Web Audio. On iOS its default session (`ambient`) is muted by silent mode, and a context started while silent stays muted after silent mode is turned off. So `start()` sets `navigator.audioSession.type = 'playback'` before creating the `AudioContext`: sound always plays, silent mode or not.

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
then http://localhost:8000. On the iPhone (same Wi-Fi): `python3 -m http.server 8000 --bind 0.0.0.0`, then `http://<Mac IP>:8000` (Mac IP: `ipconfig getifaddr $(networksetup -listallhardwareports | awk '/Wi-Fi/{getline; print $2}')`). Over plain HTTP the service worker and wake lock are disabled.
