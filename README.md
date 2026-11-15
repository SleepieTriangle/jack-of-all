# Jack of All

A brain-training web app for all ages. Every week a different brain game takes the spotlight, it gets a little harder every day, and every puzzle is generated automatically — so there is always something new.

- 15 games across strategy, logic, reasoning, patterns, memory, language, attention, spatial skills, mental math and more
- Kid / Adult modes, beginner helpers, level locks (Levels 1–2 are learning levels; Level 10 is Master)
- Works offline and installs like an app (PWA)
- Plain HTML, CSS and JavaScript — no build step

## Run it locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173. Add `?date=YYYY-MM-DD` to preview any day.

## Tests

Open `tests/index.html` in the running app (http://localhost:5173/tests/), or run `powershell -File tests/run-tests.ps1` for a headless run.

## Releasing an update

Bump `VERSION` in `sw.js` so installed copies download the new files, then push to `main`.
