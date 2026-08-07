# Skip Safe

**Know exactly how many classes you can skip — and still stay above 75%.**

A smart attendance risk calculator built for BIT Mesra students (IMSc Mathematics & Computing, Semester IX, MO-2026). Exception-based model — mark only what you skip, not what you attend.

🔗 **Live App:** [m3hul-raj.github.io/skip-safe](https://m3hul-raj.github.io/skip-safe/)

---

## Features

| Feature | Description |
|---------|-------------|
| **Skips Remaining** | The one number that matters — per subject, updated in real-time |
| **Today View** | All classes for the day with color-coded risk indicators (green / amber / red) |
| **Dashboard** | All subjects sorted by danger level with semester progress |
| **Subject Detail** | Full history, stats, class cancellation tracking, and interactive calendar |
| **Interactive History** | Tap any dot to see date, status, and take actions (mark absent, cancel, undo) |
| **Extra Classes** | Add makeup / extra classes taken by teachers on any date |
| **Day Off** | Mark custom holidays or off-days (auto-adjusts all calculations) |
| **Export / Import** | Backup your data as JSON and restore on any device |
| **Offline-first** | Works without internet — full PWA with service worker caching |
| **Installable** | Add to home screen on Android — opens fullscreen like a native app |
| **Swipe Navigation** | Swipe left/right to navigate between days in Today view |

---

## How It Works

Skip Safe uses an **exception-based model**: every scheduled class is assumed attended unless you explicitly mark it as skipped. The app then calculates:

1. **Total classes held** (scheduled − cancelled − holidays)
2. **Classes attended** (held − skipped)
3. **Current attendance %** (attended ÷ held)
4. **Remaining classes** until semester end
5. **Must attend** — minimum classes needed to stay ≥ 75%
6. **Skips left** — remaining − must attend

This means you only interact with the app when something happens (skip, cancellation, extra class) — not every single day.

---

## Install on Phone

1. Open [m3hul-raj.github.io/skip-safe](https://m3hul-raj.github.io/skip-safe/) in Chrome
2. Tap ⋮ menu → **Add to Home Screen** (or **Install App**)
3. Done — opens fullscreen like a native app, works offline

> **Sharing with classmates:** Since the timetable is hardcoded for IMSc Maths & Computing Sem-IX, any classmate with the same schedule can install and use the app independently. Each person's data is stored locally on their own device via `localStorage`.

---

## Tech Stack

- **Frontend:** Vanilla HTML + CSS + JavaScript (no framework, no build step)
- **Styling:** True black AMOLED-optimized design with champagne gold accent
- **Fonts:** [Inter](https://fonts.google.com/specimen/Inter) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- **PWA:** `manifest.json` + service worker (`sw.js`) with stale-while-revalidate caching
- **Storage:** `localStorage` for data persistence (zero server dependency)
- **Deployment:** GitHub Pages (auto-deploy on push to `main`)
- **Total size:** < 55 KB (all assets combined)

---

## Project Structure

```
skip-safe/
├── index.html        # Single-page app shell
├── styles.css        # Complete design system (CSS variables, dark theme)
├── app.js            # All logic — state, calculations, rendering, interactions
├── manifest.json     # PWA manifest (name, icons, theme)
├── sw.js             # Service worker (offline caching)
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

---

## Semester Configuration

The app is configured for **BIT Mesra IMSc Maths & Computing — Semester IX (MO-2026)**:

- **Semester:** Jul 27, 2026 – Nov 12, 2026
- **Threshold:** 75% minimum attendance
- **Subjects:** Constitution of India, Functional Analysis, Number Theory, Computer Graphics, Crypto & Network Security, NLP, CG Lab
- **Holidays:** Pre-configured official holidays (Independence Day, Ganesh Chaturthi, etc.)

To adapt for a different semester or course, edit the constants at the top of [`app.js`](app.js):
- `SEMESTER_START` / `SEMESTER_END` — date range
- `THRESHOLD` — minimum attendance fraction
- `SUBJECTS` — subject definitions
- `TIMETABLE` — weekly schedule
- `PRESET_HOLIDAYS` — official holidays

---

## Data & Privacy

- All data is stored **locally** in your browser's `localStorage`
- **Nothing is sent to any server** — the app is 100% client-side
- Use **Export Backup** (in Dashboard) to save a `.json` file of your data
- Use **Import** to restore from a backup file

---

## License

MIT
