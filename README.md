# Tabata

Tabata / interval training timer, built as a PWA to install on mobile and use offline.

Personal project made with Claude to avoid paying for Tabata timer apps.

**App:** https://pappum.github.io/tabata-timer/

## Features
- Set prep, work, rest, number of sets, number of cycles and rest between cycles.
- Total session duration computed before starting.
- Full-screen color per phase (prep, work, rest, rest between cycles), readable from a distance.
- Large phase countdown, progress bar, total time left, set and cycle progress.
- Next phase shown, pause and skip to the next step.
- Beeps on each phase change and a countdown on the last 5 seconds.
- Settings saved on the device.

The interface is in French.

## Install on iPhone
Open the URL in Safari, then Share › Add to Home Screen.

## Development
Plain HTML, CSS and JavaScript — no framework, no build step, no external dependencies.

```sh
python3 -m http.server
```
then http://localhost:8000.
