<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f0c29,50:302b63,100:24243e&height=180&section=header&text=Skip%20Safe&fontSize=50&fontColor=00D4FF&fontAlignY=40&desc=BIT%20Mesra%20Attendance%20Risk%20Calculator&descSize=16&descAlignY=65&descColor=ffffff" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VERSION-1.0.2-00599C?style=for-the-badge&logo=github&logoColor=white" alt="Version" />
  <img src="https://img.shields.io/badge/PWA-READY-00C853?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/STACK-VANILLA%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="Stack" />
  <img src="https://img.shields.io/badge/LICENSE-MIT-20232A?style=for-the-badge&logo=opensourceinitiative&logoColor=white" alt="License" />
</p>

<br/>

<p align="center">
  <img src="https://github.com/user-attachments/assets/095c57bc-64e2-4900-82b5-0e49957059b5" width="46%" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://github.com/user-attachments/assets/2b1c08ba-2ce1-4697-a410-bd3eac5f46db" width="46%" />
</p>

<br/>

<h3 align="center">Know exactly how many classes you can skip — and still stay above 75%.</h3>

<p align="center">
  An offline-first, exception-based attendance risk calculator built for BIT Mesra students (IMSc Mathematics & Computing, Semester IX, MO-2026). Mark only what you skip, not what you attend.
</p>

<p align="center">
  ⚡ <b><a href="https://m3hul-raj.github.io/skip-safe/">Launch Live App</a></b><br>
  <a href="https://m3hul-raj.github.io/skip-safe/">https://m3hul-raj.github.io/skip-safe/</a>
</p>

---

## ⚡ Features

| Feature | Description |
|---------|-------------|
| **Dark Theme** | Clean, pure-black dark theme. |
| **Smart Haptics** | Unified 10ms tactile feedback engine for day navigation, subject cards, and status changes — giving a native feel. |
| **Skips Remaining** | The one number that matters — per subject, updated in real-time. |
| **Today View** | All classes for the day with dynamic color-coded risk bounds (Safe, Warning, Danger). |
| **Dashboard** | All subjects sorted by danger level with semester progress tracking. |
| **Interactive History** | Tap any dot to see date, status, and take actions (mark absent, cancel, undo). |
| **Custom Date Picker** | A bespoke 42-cell fixed-layout date picker ensuring zero layout shift when adding Extra Classes. |
| **Day Off / Holidays** | Mark custom holidays or off-days (auto-adjusts all calculations seamlessly). |
| **Export / Import** | Backup your data as JSON and restore on any device instantly. |
| **Offline-first (PWA)** | Works without internet — full Progressive Web App with bulletproof service worker caching. |

---

## 📱 How to Install (iOS / Android)

Skip Safe is a Progressive Web App (PWA). You don't need the App Store or Google Play.

1. Open [m3hul-raj.github.io/skip-safe](https://m3hul-raj.github.io/skip-safe/) in **Safari (iOS)** or **Chrome (Android)**.
2. Tap the **Share** button (iOS) or **⋮ menu** (Android).
3. Select **"Add to Home Screen"**.
4. Done! The app will now launch fullscreen like a native app and work entirely offline.

> **Note:** The current timetable is hardcoded for IMSc Maths & Computing (Sem-IX). All attendance data is processed and stored strictly locally on your own device.

---

## ⚙️ How It Works

Skip Safe uses an **exception-based model**: every scheduled class is assumed attended unless you explicitly mark it as skipped. The app automatically computes:

1. **Total classes held** = Scheduled − Cancelled − Holidays
2. **Classes attended** = Held − Skipped
3. **Remaining classes** = Scheduled until the end of the semester
4. **Must attend** = Minimum classes needed to stay ≥ 75%
5. **Skips left** = Remaining − Must attend

You only interact with the app when something unusual happens (a skip, a cancellation, or an extra class) — saving you the hassle of daily tracking.

---

## 🛠 Tech Stack

- **Frontend:** Vanilla HTML5 + CSS3 + JavaScript (No framework bloat, zero dependencies)
- **Styling:** Custom fluid design system built for mobile
- **Fonts:** [Inter](https://fonts.google.com/specimen/Inter) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- **PWA:** `manifest.json` (v1.0.2) + Service Worker (`sw.js`) with network-first caching and offline fallback.
- **Storage:** Secure `localStorage` with fail-safe data hydration. Zero server dependency.
- **Deployment:** GitHub Pages (auto-deploy on push to `main`)
- **Total Payload:** < 55 KB (all assets combined)

---

## 📂 Project Structure

```text
skip-safe/
├── index.html        # Single-page app shell
├── styles.css        # Design system (Dark theme, Animations)
├── app.js            # Core engine (State, Math, Haptics, Rendering)
├── manifest.json     # PWA manifest
├── sw.js             # Service worker (Offline caching)
├── icon-180.png      # Apple touch icon (180×180)
└── README.md         # Documentation
```

---

## 📅 Semester Configuration

The app is currently hardcoded for **BIT Mesra IMSc Maths & Computing — Semester IX (MO-2026)**:

- **Semester:** Jul 27, 2026 – Nov 12, 2026
- **Threshold Bounds:** `< 70%` (Danger), `70-74.9%` (Warning for medical relaxation), `>= 75%` (Safe).
- **Holidays:** Pre-configured official academic calendar holidays (e.g. Pantheon Fest, Durga Puja).

**Not in Sem IX? Fork this repository and update `app.js` with your own syllabus and timetable to deploy your own version.**

To adapt for a different semester or course, simply fork this repo and edit the constants at the top of [`app.js`](app.js):
- `SEMESTER_START` / `SEMESTER_END` — Date ranges
- `THRESHOLD` — Minimum attendance fraction
- `SUBJECTS` — Subject definitions
- `TIMETABLE` — Weekly schedule
- `PRESET_HOLIDAYS` — Official holidays

---

## 🔒 Privacy & Data

- **100% Local:** All data is stored strictly in your browser's local storage.
- **Zero Tracking:** No tracking scripts, analytics, or servers.
- **Export Control:** You own your data. Use Export/Import to migrate seamlessly.

---

## 📜 License

MIT
