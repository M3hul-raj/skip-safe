// ==========================================
// SKIP SAFE — Attendance Risk Calculator
// Exception-based model: mark skips, not attendance
// ==========================================

// ===== CONSTANTS =====

const SEMESTER_START = '2026-07-27';
const SEMESTER_END   = '2026-11-12';
const THRESHOLD      = 0.75;

const PRESET_HOLIDAYS = new Set([
  '2026-08-26', '2026-08-28', '2026-09-04', '2026-09-17',
  '2026-09-22', '2026-09-23', '2026-10-02', '2026-10-19',
  '2026-10-20', '2026-10-21', '2026-11-09', '2026-11-11',
]);

const SUBJECTS = {
  MT204: { name: 'Constitution of India', code: 'MT204', short: 'COI', credits: 0, teacher: '\u2014', color: '#B388FF' },
  MA501: { name: 'Functional Analysis', code: 'MA501', short: 'FA', credits: 4, teacher: 'Dr. S. Padhi', color: '#00E5FF' },
  MA502: { name: 'Number Theory', code: 'MA502', short: 'NT', credits: 4, teacher: 'Dr. N. Das', color: '#76FF03' },
  CA601: { name: 'Computer Graphics', code: 'CA601', short: 'CG', credits: 3, teacher: 'Dr. K. K. Senapati', color: '#FFD740' },
  CA630: { name: 'Crypto & Network Security', code: 'CA630', short: 'CNS', credits: 3, teacher: 'Dr. A. Bera', color: '#FF6E40' },
  CA635: { name: 'Natural Language Processing', code: 'CA635', short: 'NLP', credits: 3, teacher: 'Dr. Shruti Garg', color: '#FF4081' },
  CA602: { name: 'CG Lab', code: 'CA602', short: 'CG Lab', credits: 1.5, teacher: 'Dr. K. K. Senapati', color: '#FFAB40', isLab: true },
};

// Day of week: 0=Sun, 1=Mon, ..., 6=Sat
const TIMETABLE = {
  1: [ // Monday
    { period: 'I',   start: '08:00', end: '08:50', subject: 'MT204', room: '\u2014' },
    { period: 'II',  start: '09:00', end: '09:50', subject: 'MA501', room: '215' },
    { period: 'III', start: '10:00', end: '10:50', subject: 'MA502', room: '215' },
    { period: 'IV',  start: '11:00', end: '11:50', subject: 'MA502', room: '215' },
    { period: 'V',   start: '12:00', end: '12:50', subject: 'CA630', room: '215' },
  ],
  2: [ // Tuesday
    { period: 'IV', start: '11:00', end: '11:50', subject: 'CA630', room: '215' },
    { period: 'V',  start: '12:00', end: '12:50', subject: 'MA501', room: '215' },
  ],
  3: [ // Wednesday
    { period: 'I',   start: '08:00', end: '08:50', subject: 'MT204', room: '\u2014' },
    { period: 'II',  start: '09:00', end: '09:50', subject: 'CA635', room: '215' },
    { period: 'III', start: '10:00', end: '10:50', subject: 'MA502', room: '215' },
    { period: 'IV',  start: '11:00', end: '11:50', subject: 'MA501', room: '215' },
    { period: 'V',   start: '12:00', end: '12:50', subject: 'CA601', room: '215' },
  ],
  4: [ // Thursday
    { period: 'III',  start: '10:00', end: '10:50', subject: 'CA601', room: '206' },
    { period: 'IV',   start: '11:00', end: '11:50', subject: 'CA601', room: '206' },
    { period: 'VI',   start: '13:30', end: '14:20', subject: 'CA630', room: 'G3' },
    { period: 'VII',  start: '14:30', end: '15:20', subject: 'CA635', room: 'G2' },
    { period: 'VIII', start: '15:30', end: '16:20', subject: 'CA635', room: 'G2' },
  ],
  5: [ // Friday
    { period: 'IV',  start: '11:00', end: '11:50', subject: 'MA502', room: '215' },
    { period: 'V',   start: '12:00', end: '12:50', subject: 'MA501', room: '215' },
    { period: 'LAB', start: '13:30', end: '17:20', subject: 'CA602', room: 'Lab 6', isLab: true },
  ],
};

const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


// ===== STATE =====

let state = { absences: new Set(), cancellations: new Set(), customHolidays: new Set() };
let viewDate   = new Date();
let activeView = 'today';
let _toastTmr  = null;


// ===== PERSISTENCE =====

function load() {
  try {
    const raw = localStorage.getItem('ss_data');
    if (raw) {
      const d = JSON.parse(raw);
      state.absences       = new Set(d.a || []);
      state.cancellations  = new Set(d.c || []);
      state.customHolidays = new Set(d.h || []);
    }
  } catch (_) { /* first launch */ }
}

function save() {
  localStorage.setItem('ss_data', JSON.stringify({
    a: [...state.absences],
    c: [...state.cancellations],
    h: [...state.customHolidays],
  }));
}


// ===== DATE HELPERS =====

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parse(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isHoliday(ds)  { return PRESET_HOLIDAYS.has(ds) || state.customHolidays.has(ds); }
function isWeekend(d)   { return d.getDay() === 0 || d.getDay() === 6; }
function inSemester(ds) { return ds >= SEMESTER_START && ds <= SEMESTER_END; }
function K(ds, subj, per) { return `${ds}|${subj}|${per}`; }


// ===== CALCULATION ENGINE =====

/** Get all non-cancelled scheduled class instances for a subject in a date range */
function getScheduled(subj, from, to) {
  const out = [];
  let d = parse(from);
  const end = parse(to);
  while (d <= end) {
    const ds = fmt(d);
    if (!isWeekend(d) && !isHoliday(ds) && inSemester(ds)) {
      for (const sl of (TIMETABLE[d.getDay()] || [])) {
        if (sl.subject === subj) {
          const k = K(ds, subj, sl.period);
          if (!state.cancellations.has(k)) out.push({ ds, period: sl.period, k });
        }
      }
    }
    d = addDays(d, 1);
  }
  return out;
}

/** Core stats for a subject (the entire product lives here) */
function calcStats(subj) {
  const today = fmt(new Date());
  const eff   = today <= SEMESTER_END ? today : SEMESTER_END;

  const held   = getScheduled(subj, SEMESTER_START, eff);
  const H      = held.length;
  const missed = held.filter(c => state.absences.has(c.k)).length;
  const A      = H - missed;

  const tmrw      = fmt(addDays(new Date(), 1));
  const remaining = tmrw <= SEMESTER_END ? getScheduled(subj, tmrw, SEMESTER_END) : [];
  const R         = remaining.length;

  const pct        = H > 0 ? (A / H) * 100 : 100;
  const mustAttend = Math.max(0, Math.ceil(THRESHOLD * (H + R) - A));
  const skips      = Math.max(0, R - mustAttend);

  let risk = 'safe';
  if (skips <= 1) risk = 'danger';
  else if (skips <= 4) risk = 'warning';

  return { H, A, missed, R, pct, mustAttend, skips, risk };
}


// ===== RENDER: TODAY VIEW =====

function renderToday() {
  const ds    = fmt(viewDate);
  const dow   = viewDate.getDay();
  const today = fmt(new Date());
  const isNow = ds === today;

  // --- header ---
  document.getElementById('today-day').textContent = DAY_NAMES[dow];
  document.getElementById('today-date').textContent =
    `${viewDate.getDate()} ${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  document.getElementById('go-today').style.display = isNow ? 'none' : 'inline-block';

  // --- elements ---
  const listEl    = document.getElementById('class-list');
  const emptyEl   = document.getElementById('no-classes');
  const holEl     = document.getElementById('holiday-banner');
  const footerEl  = document.getElementById('today-footer');
  const holBtn    = document.getElementById('holiday-toggle');

  // Holiday button label
  holBtn.textContent = isHoliday(ds) ? '✕ Remove holiday' : '+ Mark as holiday';

  // Determine view state
  const isHol      = !isWeekend(viewDate) && inSemester(ds) && isHoliday(ds);
  const slots      = TIMETABLE[dow] || [];
  const hasClasses = slots.length > 0 && !isWeekend(viewDate) && inSemester(ds) && !isHol;
  const showEmpty  = !hasClasses && !isHol;
  const showFooter = !isWeekend(viewDate) && inSemester(ds);

  listEl.style.display   = hasClasses  ? 'flex' : 'none';
  emptyEl.style.display  = showEmpty   ? 'flex' : 'none';
  holEl.style.display    = isHol       ? 'flex' : 'none';
  footerEl.style.display = showFooter  ? 'flex' : 'none';

  if (!hasClasses) return;

  // Current time (for live indicator)
  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  listEl.innerHTML = slots.map(sl => {
    const subj      = SUBJECTS[sl.subject];
    const k         = K(ds, sl.subject, sl.period);
    const skipped   = state.absences.has(k);
    const cancelled = state.cancellations.has(k);
    const st        = calcStats(sl.subject);

    // Is this class happening right now?
    const [sh, sm] = sl.start.split(':').map(Number);
    const [eh, em] = sl.end.split(':').map(Number);
    const isCurrent = isNow && nowMins >= sh*60+sm && nowMins <= eh*60+em;

    // Cancelled card
    if (cancelled) {
      return `<div class="class-card cancelled">
        <div class="class-time"><span>${sl.start}</span><span class="time-sep">\u2013</span><span>${sl.end}</span></div>
        <div class="class-body">
          <div class="class-top"><span class="class-name">${subj.name}</span></div>
          <div class="class-bottom"><span class="class-meta">${subj.code}</span></div>
        </div>
        <span class="cancelled-label">CANCELLED</span>
      </div>`;
    }

    const skipsText = st.skips === 0 ? 'No skips left!'
      : st.skips === 1 ? '1 skip left' : `${st.skips} skips left`;

    const cls = ['class-card', st.risk];
    if (skipped)  cls.push('skipped');
    if (isCurrent) cls.push('current');

    return `<div class="${cls.join(' ')}">
      <div class="class-time"><span>${sl.start}</span><span class="time-sep">\u2013</span><span>${sl.end}</span></div>
      <div class="class-body">
        <div class="class-top">
          <span class="class-name">${subj.name}</span>
          <span class="class-pct ${st.risk}">${st.pct.toFixed(0)}%</span>
        </div>
        <div class="class-bottom">
          <span class="class-meta">${subj.code} \u00B7 ${sl.isLab ? 'Lab' : 'Room ' + sl.room}</span>
          <span class="class-skips">${skipsText}</span>
        </div>
      </div>
      <button class="skip-btn${skipped ? ' skipped' : ''}" onclick="toggleSkip('${k}')">${skipped ? 'UNDO' : 'SKIP'}</button>
    </div>`;
  }).join('');
}


// ===== RENDER: DASHBOARD =====

function renderDash() {
  // Semester progress
  const now     = new Date();
  const start   = parse(SEMESTER_START);
  const end     = parse(SEMESTER_END);
  const totalD  = (end - start) / 864e5;
  const elapsed = Math.max(0, Math.min(totalD, (now - start) / 864e5));
  const pct     = (elapsed / totalD) * 100;
  const week    = Math.max(1, Math.ceil(elapsed / 7));
  const totalW  = Math.ceil(totalD / 7);

  document.getElementById('semester-fill').style.width = `${pct}%`;
  document.getElementById('semester-text').textContent  = `Week ${week} of ${totalW} \u00B7 ${Math.round(pct)}% elapsed`;

  // Subject cards sorted by risk
  const data = Object.keys(SUBJECTS).map(c => ({ c, s: SUBJECTS[c], st: calcStats(c) }));
  const order = { danger: 0, warning: 1, safe: 2 };
  data.sort((a, b) => (order[a.st.risk] - order[b.st.risk]) || (a.st.skips - b.st.skips));

  document.getElementById('subject-list').innerHTML = data.map(({ c, s, st }) => {
    const barW = st.H > 0 ? Math.min(100, st.pct) : 100;
    const txt  = st.skips === 0 ? 'No skips left!'
      : st.skips === 1 ? '1 skip left' : `${st.skips} skips left`;

    return `<div class="subject-card ${st.risk}" onclick="openDetail('${c}')">
      <div class="subject-header">
        <div class="subject-name-row">
          <span class="subject-dot" style="background:${s.color}"></span>
          <span class="subject-name">${s.name}</span>
        </div>
        <span class="subject-code">${s.code}</span>
      </div>
      <div class="subject-stats-row">
        <div class="stat"><span class="stat-value">${st.A}/${st.H}</span><span class="stat-label">Attended</span></div>
        <div class="stat"><span class="stat-value">${st.pct.toFixed(1)}%</span><span class="stat-label">Current</span></div>
        <div class="stat highlight ${st.risk}"><span class="stat-value">${st.skips}</span><span class="stat-label">Skips Left</span></div>
      </div>
      <div class="subject-bar"><div class="bar-bg">
        <div class="bar-fill ${st.risk}" style="width:${barW}%"></div>
        <div class="bar-threshold" style="left:75%"></div>
      </div></div>
      <div class="subject-reason ${st.risk}">${txt}</div>
    </div>`;
  }).join('');
}


// ===== RENDER: SUBJECT DETAIL MODAL =====

function openDetail(code) {
  const s     = SUBJECTS[code];
  const st    = calcStats(code);
  const modal = document.getElementById('subject-modal');

  document.getElementById('modal-title').textContent    = s.name;
  document.getElementById('modal-subtitle').textContent = `${s.code} \u00B7 ${s.teacher}`;

  // Stats grid + explanation
  document.getElementById('modal-stats').innerHTML = `
    <div class="modal-stat-grid">
      <div class="modal-stat"><span class="modal-stat-value">${st.A}</span><span class="modal-stat-label">Attended</span></div>
      <div class="modal-stat"><span class="modal-stat-value">${st.H}</span><span class="modal-stat-label">Held</span></div>
      <div class="modal-stat"><span class="modal-stat-value">${st.pct.toFixed(1)}%</span><span class="modal-stat-label">Current</span></div>
      <div class="modal-stat ${st.risk}"><span class="modal-stat-value">${st.skips}</span><span class="modal-stat-label">Skips Left</span></div>
      <div class="modal-stat"><span class="modal-stat-value">${st.R}</span><span class="modal-stat-label">Remaining</span></div>
      <div class="modal-stat"><span class="modal-stat-value">${st.mustAttend}</span><span class="modal-stat-label">Must Attend</span></div>
    </div>
    <div class="modal-explain">
      Out of <strong>${st.R}</strong> remaining classes, you must attend at least
      <strong>${st.mustAttend}</strong> to stay above 75%.
      ${st.skips > 0
        ? ` You can safely skip <strong>${st.skips}</strong> more.`
        : ' <span class="danger-text">You cannot skip any more classes.</span>'}
    </div>`;

  // Calendar history
  renderCalendar(code);

  // Cancel date input constraints
  const cd = document.getElementById('cancel-date');
  cd.min = SEMESTER_START;
  cd.max = SEMESTER_END;
  cd.value = fmt(new Date());

  modal.dataset.subject = code;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderCalendar(code) {
  const today = fmt(new Date());
  const slots = [];

  let d = parse(SEMESTER_START);
  const end = parse(SEMESTER_END);
  while (d <= end) {
    const ds = fmt(d);
    if (!isWeekend(d) && !isHoliday(ds) && inSemester(ds)) {
      for (const sl of (TIMETABLE[d.getDay()] || [])) {
        if (sl.subject === code) {
          const k = K(ds, code, sl.period);
          slots.push({
            ds, period: sl.period, k,
            cancelled: state.cancellations.has(k),
            absent: state.absences.has(k),
            future: ds > today,
          });
        }
      }
    }
    d = addDays(d, 1);
  }

  // Group by month
  const months = {};
  slots.forEach(s => {
    const mk = s.ds.substring(0, 7);
    (months[mk] = months[mk] || []).push(s);
  });

  document.getElementById('modal-calendar').innerHTML = Object.entries(months).map(([mk, sl]) => {
    const m = Number(mk.split('-')[1]);
    return `<div class="cal-month">
      <div class="cal-month-name">${MONTH_SHORT[m-1]} ${mk.split('-')[0]}</div>
      <div class="cal-dots">${sl.map(s => {
        let c = 'cal-dot';
        if (s.cancelled) c += ' cancelled';
        else if (s.absent) c += ' absent';
        else if (s.future) c += ' future';
        else c += ' present';
        return `<span class="${c}" title="${s.ds} P${s.period}"></span>`;
      }).join('')}</div>
    </div>`;
  }).join('');
}

function closeModal() {
  document.getElementById('subject-modal').classList.remove('active');
  document.body.style.overflow = '';
}


// ===== INTERACTIONS =====

function toggleSkip(k) {
  if (state.absences.has(k)) {
    state.absences.delete(k);
    toast('Skip undone');
  } else {
    state.absences.add(k);
    toast('Marked as skipped');
  }
  save();
  renderToday();
}

function navDay(n) {
  viewDate = addDays(viewDate, n);
  renderToday();
}

function goToday() {
  viewDate = new Date();
  renderToday();
}

function switchView(v) {
  activeView = v;
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  document.getElementById(`${v}-view`).classList.add('active');
  document.querySelector(`.nav-tab[data-view="${v}"]`).classList.add('active');
  if (v === 'dashboard') renderDash();
  else renderToday();
}

function toggleHoliday() {
  const ds = fmt(viewDate);
  if (PRESET_HOLIDAYS.has(ds)) { toast('Official holiday \u2014 can\u2019t remove'); return; }
  if (state.customHolidays.has(ds)) {
    state.customHolidays.delete(ds);
    toast('Holiday removed');
  } else {
    state.customHolidays.add(ds);
    // Remove absences for this day (classes weren't held)
    for (const sl of (TIMETABLE[viewDate.getDay()] || [])) {
      state.absences.delete(K(ds, sl.subject, sl.period));
    }
    toast('Marked as holiday');
  }
  save();
  renderToday();
}

function cancelClass() {
  const modal = document.getElementById('subject-modal');
  const code  = modal.dataset.subject;
  const ds    = document.getElementById('cancel-date').value;

  if (!ds) { toast('Select a date'); return; }

  const d     = parse(ds);
  const slots = (TIMETABLE[d.getDay()] || []).filter(s => s.subject === code);

  if (slots.length === 0) { toast(`No ${SUBJECTS[code].short} class on ${DAY_NAMES[d.getDay()]}`); return; }

  let n = 0;
  slots.forEach(sl => {
    const k = K(ds, code, sl.period);
    if (!state.cancellations.has(k)) {
      state.cancellations.add(k);
      state.absences.delete(k);
      n++;
    }
  });

  if (n > 0) {
    save();
    toast(`${n} class${n > 1 ? 'es' : ''} cancelled`);
    openDetail(code);
  } else {
    toast('Already cancelled');
  }
}


// ===== EXPORT / IMPORT =====

function exportBackup() {
  const blob = new Blob([JSON.stringify({
    absences: [...state.absences],
    cancellations: [...state.cancellations],
    customHolidays: [...state.customHolidays],
    exported: new Date().toISOString(),
    v: 1,
  }, null, 2)], { type: 'application/json' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `skipsafe-${fmt(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  toast('Backup saved');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      state.absences       = new Set(d.absences || []);
      state.cancellations  = new Set(d.cancellations || []);
      state.customHolidays = new Set(d.customHolidays || []);
      save();
      toast('Backup restored');
      if (activeView === 'dashboard') renderDash(); else renderToday();
    } catch (_) { toast('Invalid file'); }
  };
  reader.readAsText(file);
}


// ===== TOAST =====

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTmr);
  _toastTmr = setTimeout(() => el.classList.remove('show'), 2200);
}


// ===== INIT =====

function init() {
  load();
  viewDate = new Date();

  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(t =>
    t.addEventListener('click', () => switchView(t.dataset.view)));

  // Date navigation
  document.getElementById('prev-day').addEventListener('click', () => navDay(-1));
  document.getElementById('next-day').addEventListener('click', () => navDay(1));
  document.getElementById('go-today').addEventListener('click', goToday);

  // Holiday toggle
  document.getElementById('holiday-toggle').addEventListener('click', toggleHoliday);

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', cancelClass);

  // Export / Import
  document.getElementById('export-btn').addEventListener('click', exportBackup);
  document.getElementById('import-file').addEventListener('change', e => {
    if (e.target.files[0]) importBackup(e.target.files[0]);
    e.target.value = '';
  });

  // Swipe navigation (today view only, horizontal swipes)
  let sx = 0, sy = 0;
  document.getElementById('main').addEventListener('touchstart', e => {
    sx = e.changedTouches[0].screenX;
    sy = e.changedTouches[0].screenY;
  }, { passive: true });

  document.getElementById('main').addEventListener('touchend', e => {
    const dx = sx - e.changedTouches[0].screenX;
    const dy = Math.abs(sy - e.changedTouches[0].screenY);
    if (Math.abs(dx) > 70 && dy < Math.abs(dx) && activeView === 'today') {
      navDay(dx > 0 ? 1 : -1);
    }
  }, { passive: true });

  // Initial render
  renderToday();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
