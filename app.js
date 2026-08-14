// ==========================================
// SKIP SAFE — Attendance Risk Calculator
// Exception-based model: mark skips, not attendance
// ==========================================

// ===== CONSTANTS =====

function hapticTap() {
  if (navigator.vibrate) navigator.vibrate(15);
}

const SEMESTER_START = '2026-07-27';
const SEMESTER_END   = '2026-11-12';
const THRESHOLD      = 0.75;

const PRESET_HOLIDAYS = new Map([
  ['2026-08-15', 'Independence Day'],
  ['2026-08-26', 'Eid-e-Milad-un-Nabi'],
  ['2026-08-28', 'Raksha Bandhan'],
  ['2026-09-04', 'Janmashtami / Pantheon Fest'],
  ['2026-09-05', 'Pantheon Fest'],
  ['2026-09-06', 'Pantheon Fest'],
  ['2026-09-17', 'Vishwakarma Puja'],
  ['2026-09-22', 'Karma'],
  ['2026-09-23', 'Karma'],
  ['2026-10-02', 'Gandhi Jayanti'],
  ['2026-10-17', 'Durga Puja'],
  ['2026-10-18', 'Durga Puja'],
  ['2026-10-19', 'Durga Puja'],
  ['2026-10-20', 'Durga Puja'],
  ['2026-10-21', 'Durga Puja'],
  ['2026-11-08', 'Deepawali'],
  ['2026-11-09', 'Goverdhan Puja'],
  ['2026-11-11', 'Bhaiduj & Chitragupta Puja'],
  ['2026-11-13', 'Preparatory Leave'],
  ['2026-11-14', 'Preparatory Leave'],
  ['2026-11-15', 'Chhath Puja & Birsa Jayanti'],
  ['2026-11-16', 'Chhath Puja & Birsa Jayanti'],
  ['2026-11-24', 'Guru Nanak Jayanti'],
  ['2026-12-25', 'Christmas'],
]);

const SUBJECTS = {
  MT204: { name: 'Constitution of India', code: 'MT204', short: 'COI', credits: 0, teacher: '\u2014', color: '#A78BFA' },
  MA501: { name: 'Functional Analysis', code: 'MA501', short: 'FA', credits: 4, teacher: 'Dr. S. Padhi', color: '#67E8F9' },
  MA502: { name: 'Number Theory', code: 'MA502', short: 'NT', credits: 4, teacher: 'Dr. N. Das', color: '#86EFAC' },
  CA601: { name: 'Computer Graphics', code: 'CA601', short: 'CG', credits: 3, teacher: 'Dr. K. K. Senapati', color: '#60A5FA' },
  CA630: { name: 'Crypto & Network Security', code: 'CA630', short: 'CNS', credits: 3, teacher: 'Dr. A. Bera', color: '#FB923C' },
  CA635: { name: 'Natural Language Processing', code: 'CA635', short: 'NLP', credits: 3, teacher: 'Dr. Shruti Garg', color: '#F472B6' },
  CA602: { name: 'CG Lab', code: 'CA602', short: 'CG Lab', credits: 1.5, teacher: 'Dr. K. K. Senapati', color: '#818CF8', isLab: true },
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
    { period: 'LAB', start: '14:30', end: '17:20', subject: 'CA602', room: 'Lab 6', isLab: true },
  ],
};

const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


// ===== STATE =====

let state = { absences: new Set(), cancellations: new Set(), customHolidays: new Set(), extras: new Set() };
let viewDate   = new Date();
let activeView = 'today';
let _toastTmr  = null;
let _selectedDot = null;
let _lastBackTime = 0;


// ===== PERSISTENCE =====

/** Sanitise an array from untrusted sources — keep only strings. */
const stringsOnly = arr => Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];

function load() {
  try {
    const raw = localStorage.getItem('ss_data');
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        state.absences       = new Set(stringsOnly(d.a));
        state.cancellations  = new Set(stringsOnly(d.c));
        state.customHolidays = new Set(stringsOnly(d.h));
        state.extras         = new Set(stringsOnly(d.e));
      }
    }
  } catch (_) { /* fallback to defaults */ }
}

function save() {
  try {
    localStorage.setItem('ss_data', JSON.stringify({
      a: [...state.absences],
      c: [...state.cancellations],
      h: [...state.customHolidays],
      e: [...state.extras],
    }));
  } catch (_) {
    toast('Could not save — storage full or unavailable');
  }
}

// Migrate old EXTRA keys to EXTRA-1 format
function migrateExtras() {
  const old = [...state.extras].filter(k => k.endsWith('|EXTRA'));
  if (old.length === 0) return;
  old.forEach(k => {
    const newK = k + '-1';
    state.extras.delete(k);
    state.extras.add(newK);
    if (state.absences.has(k)) { state.absences.delete(k); state.absences.add(newK); }
    if (state.cancellations.has(k)) { state.cancellations.delete(k); state.cancellations.add(newK); }
  });
  save();
}

// Find all extra class keys for a subject on a date
function findExtras(ds, subj) {
  const prefix = `${ds}|${subj}|EXTRA-`;
  return [...state.extras].filter(k => k.startsWith(prefix));
}

// Get the next available extra key
function nextExtraKey(ds, subj) {
  let n = 1;
  while (state.extras.has(K(ds, subj, `EXTRA-${n}`))) n++;
  return K(ds, subj, `EXTRA-${n}`);
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
    // Also include extra classes on this date
    const extras = findExtras(fmt(d), subj);
    extras.forEach(ek => {
      if (!state.cancellations.has(ek) && fmt(d) >= from && fmt(d) <= to) {
        out.push({ ds: fmt(d), period: ek.split('|')[2], k: ek, isExtra: true });
      }
    });
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
  const plannedMiss = remaining.filter(c => state.absences.has(c.k)).length;
  const skips      = Math.max(0, R - mustAttend - plannedMiss);

  let risk;
  if (pct >= 75) {
    risk = 'safe';
  } else if (pct >= 70) {
    risk = 'warning';
  } else {
    risk = 'danger';
  }

  const isRecoveryImpossible = mustAttend > (R - plannedMiss);

  return { H, A, missed, R, pct, mustAttend, skips, risk, isRecoveryImpossible };
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
  if (isWeekend(viewDate)) {
    holBtn.style.display = 'none';
  } else if (PRESET_HOLIDAYS.has(ds)) {
    holBtn.textContent = `Official holiday \u2014 can\u2019t remove`;
    holBtn.disabled = true;
    holBtn.style.display = 'block';
  } else if (state.customHolidays.has(ds)) {
    holBtn.textContent = '\u2715 Remove day off';
    holBtn.disabled = false;
    holBtn.style.display = 'block';
  } else {
    holBtn.textContent = '+ Mark day off';
    holBtn.disabled = false;
    holBtn.style.display = 'block';
  }

  // Determine view state
  const isPreset   = PRESET_HOLIDAYS.has(ds);
  const isHol      = !isWeekend(viewDate) && inSemester(ds) && isHoliday(ds);
  const holName    = isPreset ? PRESET_HOLIDAYS.get(ds) : null;
  const slots      = TIMETABLE[dow] || [];

  // Collect extra classes for this date (all subjects)
  const todayExtras = [];
  Object.keys(SUBJECTS).forEach(code => {
    findExtras(ds, code).forEach(ek => {
      todayExtras.push({ subject: code, k: ek });
    });
  });

  const hasRegular = slots.length > 0 && !isWeekend(viewDate) && inSemester(ds) && !isHol;
  const hasExtras  = todayExtras.length > 0;
  const hasClasses = hasRegular || hasExtras;
  const showEmpty  = !hasClasses && !isHol;
  const showFooter = !isWeekend(viewDate) && inSemester(ds);

  listEl.style.display   = hasClasses  ? 'flex' : 'none';
  emptyEl.style.display  = showEmpty   ? 'flex' : 'none';
  holEl.style.display    = isHol       ? 'flex' : 'none';
  footerEl.style.display = showFooter  ? 'flex' : 'none';

  // Inject holiday name into banner
  if (isHol) {
    const title = holName || 'Day Off';
    const sub   = holName ? 'Holiday · No classes today' : 'No classes today';
    holEl.innerHTML = `
      <div class="empty-icon holiday-glow">✦</div>
      <p class="empty-title">${title}</p>
      <p class="empty-sub">${sub}</p>`;
  }

  // Show/hide extra class button
  const extraEl = document.getElementById('today-extra');
  if (extraEl) extraEl.style.display = (hasClasses || isHol) && inSemester(ds) ? 'flex' : 'none';

  if (!hasClasses) { listEl.innerHTML = ''; return; }

  // Current time (for live indicator)
  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Render regular timetable cards
  let html = '';
  if (hasRegular) {
    html += slots.map(sl => {
      const subj      = SUBJECTS[sl.subject];
      const k         = K(ds, sl.subject, sl.period);
      const skipped   = state.absences.has(k);
      const cancelled = state.cancellations.has(k);
      const st        = calcStats(sl.subject);

      // Is this class happening right now?
      const [sh, sm] = sl.start.split(':').map(Number);
      const [eh, em] = sl.end.split(':').map(Number);
      const isCurrent = isNow && nowMins >= sh*60+sm && nowMins <= eh*60+em;

      // Cancelled card (now tappable)
      if (cancelled) {
        return `<div class="class-card cancelled" data-k="${k}" data-subj="${sl.subject}" style="cursor:pointer">
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

      return `<div class="${cls.join(' ')}" data-k="${k}" data-subj="${sl.subject}" style="cursor:pointer">
        <div class="class-time"><span>${sl.start}</span><span class="time-sep">\u2013</span><span>${sl.end}</span></div>
        <div class="class-body">
          <div class="class-top">
            <span class="class-name">${subj.name}</span>
            <span class="class-pct ${st.risk}">${st.pct.toFixed(1)}%</span>
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

  // Render extra class cards
  if (hasExtras) {
    html += todayExtras.map(ex => {
      const subj = SUBJECTS[ex.subject];
      const k = ex.k;
      const skipped = state.absences.has(k);
      const cancelled = state.cancellations.has(k);
      const st = calcStats(ex.subject);

      if (cancelled) {
        return `<div class="class-card cancelled extra-card" data-k="${k}" data-subj="${ex.subject}" style="cursor:pointer">
          <div class="class-time"><span>\u2014</span></div>
          <div class="class-body">
            <div class="class-top"><span class="class-name">${subj.name}<span class="extra-badge">EXTRA</span></span></div>
            <div class="class-bottom"><span class="class-meta">${subj.code}</span></div>
          </div>
          <span class="cancelled-label">CANCELLED</span>
        </div>`;
      }

      const cls = ['class-card', st.risk, 'extra-card'];
      if (skipped) cls.push('skipped');

      return `<div class="${cls.join(' ')}" data-k="${k}" data-subj="${ex.subject}" style="cursor:pointer">
        <div class="class-time"><span>\u2014</span></div>
        <div class="class-body">
          <div class="class-top">
            <span class="class-name">${subj.name}<span class="extra-badge">EXTRA</span></span>
            <span class="class-pct ${st.risk}">${st.pct.toFixed(1)}%</span>
          </div>
          <div class="class-bottom">
            <span class="class-meta">${subj.code} \u00B7 Extra Class</span>
            <span class="class-skips">${st.skips} skips left</span>
          </div>
        </div>
        <button class="skip-btn${skipped ? ' skipped' : ''}" onclick="toggleSkip('${k}')">${skipped ? 'UNDO' : 'SKIP'}</button>
      </div>`;
    }).join('');
  }

  listEl.innerHTML = html;

  // Make ALL cards clickable (including cancelled) — opens action overlay
  listEl.querySelectorAll('.class-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.skip-btn')) return;
      const k = card.dataset.k;
      const subj = card.dataset.subj;
      if (!k || !subj) return;
      showActionOverlay('card', { subj, k, ds });
    });
  });
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
  hapticTap();
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
      <div class="modal-stat${st.isRecoveryImpossible ? ' danger' : ''}"><span class="modal-stat-value">${st.mustAttend}</span><span class="modal-stat-label">Must Attend</span></div>
    </div>
    <div class="modal-explain">
      ${st.isRecoveryImpossible
        ? `<span class="danger-text">Reaching 75% is no longer possible this semester. You would need to attend <strong>${st.mustAttend}</strong> of <strong>${st.R}</strong> remaining classes.</span>`
        : `Out of <strong>${st.R}</strong> remaining classes, you must attend at least
      <strong>${st.mustAttend}</strong> to stay above 75%.
      ${st.skips > 0
        ? ` You can safely skip <strong>${st.skips}</strong> more.`
        : ' <span class="danger-text">You cannot skip any more classes.</span>'}`}
    </div>`;

  // Calendar history
  renderCalendar(code);

  // Extra class date input constraints
  const ed = document.getElementById('extra-date-btn');
  const dToday = new Date();
  ed.dataset.ds = fmt(dToday);
  ed.textContent = `${MONTH_SHORT[dToday.getMonth()]} ${dToday.getDate()}, ${dToday.getFullYear()}`;

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
    // Regular timetable classes
    if (!isWeekend(d) && !isHoliday(ds) && inSemester(ds)) {
      for (const sl of (TIMETABLE[d.getDay()] || [])) {
        if (sl.subject === code) {
          const k = K(ds, code, sl.period);
          slots.push({
            ds, period: sl.period, k,
            cancelled: state.cancellations.has(k),
            absent: state.absences.has(k),
            future: ds > today,
            isExtra: false,
          });
        }
      }
    }
    // Extra classes (can be on any day)
    const extKeys = findExtras(ds, code);
    extKeys.forEach(ek => {
      slots.push({
        ds, period: ek.split('|')[2], k: ek,
        cancelled: state.cancellations.has(ek),
        absent: state.absences.has(ek),
        future: ds > today,
        isExtra: true,
      });
    });
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
        if (s.isExtra) c += ' extra';
        if (s.cancelled) c += ' cancelled';
        else if (s.absent) c += ' absent';
        else if (s.future) c += ' future';
        else c += ' present';
        return `<span class="${c}" data-k="${s.k}" data-ds="${s.ds}" data-period="${s.period}" data-extra="${s.isExtra}" onclick="showDotInfo(this)"></span>`;
      }).join('')}</div>
    </div>`;
  }).join('');

  // Clear any previous selection
  closeDotInfo();
}

function closeModal() {
  document.getElementById('subject-modal').classList.remove('active');
  document.body.style.overflow = '';
  closeDotInfo();
  // Re-render the active view so dashboard/today reflect any modal changes
  if (activeView === 'dashboard') renderDash();
  else renderToday();
}


// ===== DOT INTERACTION =====

function showDotInfo(el) {
  // Deselect previous
  if (_selectedDot) _selectedDot.classList.remove('selected');
  _selectedDot = el;
  el.classList.add('selected');

  const k      = el.dataset.k;
  const ds     = el.dataset.ds;
  const period = el.dataset.period;
  const isExtra = el.dataset.extra === 'true';
  const d      = parse(ds);
  const today  = fmt(new Date());

  const dayName  = DAY_NAMES[d.getDay()];
  const dateStr  = `${dayName}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  const perLabel = isExtra ? 'Extra Class' : `Period ${period}`;

  // Determine status
  let status, statusClass, statusIcon;
  if (state.cancellations.has(k)) {
    status = 'Cancelled'; statusClass = 'cancelled'; statusIcon = '⊘';
  } else if (state.absences.has(k)) {
    status = 'Skipped'; statusClass = 'absent'; statusIcon = '✗';
  } else if (ds > today) {
    status = 'Upcoming'; statusClass = 'future'; statusIcon = '○';
  } else {
    status = 'Attended'; statusClass = 'present'; statusIcon = '✓';
  }
  if (isExtra && !state.cancellations.has(k)) statusClass = 'extra';

  // Build action buttons
  let actions = '';
  if (state.cancellations.has(k)) {
    actions = `<button class="dot-action safe" onclick="undoDotCancel('${k}')">Undo Cancel</button>`;
    if (isExtra) actions += ` <button class="dot-action danger" onclick="removeDotExtra('${k}')">Remove Extra</button>`;
  } else if (state.absences.has(k)) {
    actions = `<button class="dot-action safe" onclick="undoDotSkip('${k}')">Undo Skip</button>
               <button class="dot-action warn" onclick="toggleDotCancel('${k}')">Cancel Class</button>`;
  } else if (ds > today) {
    actions = `<button class="dot-action warn" onclick="toggleDotCancel('${k}')">Pre-cancel</button>`;
    if (isExtra) actions += ` <button class="dot-action danger" onclick="removeDotExtra('${k}')">Remove Extra</button>`;
  } else {
    // Attended (past, not absent, not cancelled)
    actions = `<button class="dot-action danger" onclick="markDotAbsent('${k}')">Mark Absent</button>
               <button class="dot-action warn" onclick="toggleDotCancel('${k}')">Cancel Class</button>`;
    if (isExtra) actions += ` <button class="dot-action danger" onclick="removeDotExtra('${k}')">Remove Extra</button>`;
  }

  const info = document.getElementById('dot-info');
  info.innerHTML = `
    <div class="dot-info-header">
      <div>
        <div class="dot-info-date">${dateStr}</div>
        <div class="dot-info-period">${perLabel}</div>
      </div>
      <button class="dot-info-close" onclick="closeDotInfo()">✕</button>
    </div>
    <div class="dot-info-status ${statusClass}">${statusIcon} ${status}</div>
    <div class="dot-info-actions">${actions}</div>`;
  info.classList.add('active');

  // Scroll the info card into view
  info.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeDotInfo() {
  if (_selectedDot) { _selectedDot.classList.remove('selected'); _selectedDot = null; }
  const info = document.getElementById('dot-info');
  if (info) { info.classList.remove('active'); info.innerHTML = ''; }
}

function toggleDotCancel(k) {
  state.cancellations.add(k);
  state.absences.delete(k);
  save();
  toast('Class cancelled');
  const modal = document.getElementById('subject-modal');
  openDetail(modal.dataset.subject);
}

function undoDotCancel(k) {
  state.cancellations.delete(k);
  save();
  toast('Cancel undone');
  const modal = document.getElementById('subject-modal');
  openDetail(modal.dataset.subject);
}

function undoDotSkip(k) {
  state.absences.delete(k);
  save();
  toast('Skip undone');
  const modal = document.getElementById('subject-modal');
  openDetail(modal.dataset.subject);
}

function markDotAbsent(k) {
  hapticTap();
  state.absences.add(k);
  save();
  toast('Marked as absent');
  const modal = document.getElementById('subject-modal');
  openDetail(modal.dataset.subject);
}

function removeDotExtra(k) {
  hapticTap();
  state.extras.delete(k);
  state.absences.delete(k);
  state.cancellations.delete(k);
  save();
  toast('Extra class removed');
  const modal = document.getElementById('subject-modal');
  openDetail(modal.dataset.subject);
}

function addExtraClass() {
  hapticTap();
  const modal = document.getElementById('subject-modal');
  const code  = modal.dataset.subject;
  const ds    = document.getElementById('extra-date-btn').dataset.ds;

  if (!ds) { toast('Select a date'); return; }

  const ek = nextExtraKey(ds, code);

  state.extras.add(ek);
  save();

  const d = parse(ds);
  toast(`Extra class added — ${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`);
  openDetail(code);
}


// ===== INTERACTIONS =====

function toggleSkip(k) {
  hapticTap();
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
  hapticTap();
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

// ===== ACTION OVERLAY (replaces inline card actions + extra picker) =====

function showActionOverlay(mode, data) {
  closeActionOverlay(); // close any existing
  const overlay = document.getElementById('action-overlay');
  const sheet = document.getElementById('action-sheet');

  if (mode === 'card') {
    const { subj, k, ds } = data;
    const s = SUBJECTS[subj];
    const d = parse(ds);
    const today = fmt(new Date());
    const dateStr = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
    const isCancelled = state.cancellations.has(k);
    const isAbsent = state.absences.has(k);
    const isFuture = ds > today;
    const isExtraKey = k.includes('|EXTRA-');

    let btns = '';
    if (isCancelled) {
      btns = `<button class="action-sheet-btn safe" onclick="overlayAction('undoCancel','${k}')">Undo Cancel</button>`;
      if (isExtraKey) btns += ` <button class="action-sheet-btn danger" onclick="overlayAction('removeExtra','${k}')">Remove Extra</button>`;
    } else if (isAbsent) {
      btns = `<button class="action-sheet-btn safe" onclick="overlayAction('undoSkip','${k}')">Undo Skip</button>
              <button class="action-sheet-btn warn" onclick="overlayAction('cancel','${k}')">Cancel Class</button>`;
    } else if (isFuture) {
      btns = `<button class="action-sheet-btn warn" onclick="overlayAction('cancel','${k}')">Pre-cancel</button>`;
      if (isExtraKey) btns += ` <button class="action-sheet-btn danger" onclick="overlayAction('removeExtra','${k}')">Remove Extra</button>`;
    } else {
      btns = `<button class="action-sheet-btn danger" onclick="overlayAction('absent','${k}')">Mark Absent</button>
              <button class="action-sheet-btn warn" onclick="overlayAction('cancel','${k}')">Cancel Class</button>`;
      if (isExtraKey) btns += ` <button class="action-sheet-btn danger" onclick="overlayAction('removeExtra','${k}')">Remove Extra</button>`;
    }
    btns += ` <button class="action-sheet-btn accent" onclick="overlayAction('addExtra','${subj}','${ds}')">+ Extra Class</button>`;

    sheet.innerHTML = `
      <div class="action-sheet-head">
        <div>
          <div class="action-sheet-title">${s.name}</div>
          <div class="action-sheet-sub">${dateStr}</div>
        </div>
        <button class="action-sheet-close" onclick="closeActionOverlay()">\u2715</button>
      </div>
      <div class="action-sheet-btns">${btns}</div>`;

  } else if (mode === 'picker') {
    const ds = data.ds;
    const d = viewDate;
    sheet.innerHTML = `
      <div class="action-sheet-head">
        <div>
          <div class="action-sheet-title">Add extra class</div>
          <div class="action-sheet-sub">${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}</div>
        </div>
        <button class="action-sheet-close" onclick="closeActionOverlay()">\u2715</button>
      </div>
      <div class="pick-grid">
        ${Object.entries(SUBJECTS).map(([code, s]) => {
          return `<button class="pick-btn" 
            style="border-color:${s.color}40;color:${s.color}" 
            onclick="pickExtra('${code}','${ds}')">
            ${s.name}
          </button>`;
        }).join('')}
      </div>`;
  }

  overlay.classList.add('active');
}

function closeActionOverlay() {
  const overlay = document.getElementById('action-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.getElementById('action-sheet').innerHTML = '';
  }
}

function isOverlayOpen() {
  return document.getElementById('action-overlay').classList.contains('active');
}

function overlayAction(action, key, ds) {
  hapticTap();
  switch (action) {
    case 'cancel':
      state.cancellations.add(key);
      state.absences.delete(key);
      toast('Class cancelled');
      break;
    case 'undoCancel':
      state.cancellations.delete(key);
      toast('Cancel undone');
      break;
    case 'undoSkip':
      state.absences.delete(key);
      toast('Skip undone');
      break;
    case 'absent':
      state.absences.add(key);
      toast('Marked as absent');
      break;
    case 'removeExtra':
      state.extras.delete(key);
      state.absences.delete(key);
      state.cancellations.delete(key);
      toast('Extra class removed');
      break;
    case 'addExtra':
      // key = subject code, ds comes as 3rd arg
      const ek = nextExtraKey(ds, key);
      state.extras.add(ek);
      const d = parse(ds);
      toast(`Extra class added \u2014 ${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`);
      break;
  }
  save();
  closeActionOverlay();
  renderToday();
}

function pickExtra(code, ds) {
  const ek = nextExtraKey(ds, code);
  state.extras.add(ek);
  save();
  toast(`${SUBJECTS[code].short} extra class added`);
  closeActionOverlay();
  renderToday();
}

function toggleHoliday() {
  hapticTap();
  const ds = fmt(viewDate);
  if (PRESET_HOLIDAYS.has(ds)) { toast('Official holiday \u2014 can\u2019t remove'); return; }
  if (state.customHolidays.has(ds)) {
    state.customHolidays.delete(ds);
    toast('Day off removed');
  } else {
    state.customHolidays.add(ds);
    // Remove absences for this day (classes weren't held)
    for (const sl of (TIMETABLE[viewDate.getDay()] || [])) {
      state.absences.delete(K(ds, sl.subject, sl.period));
    }
    toast('Marked as day off');
  }
  save();
  renderToday();
}

// cancelClass() removed — replaced by dot-based toggleDotCancel()


// ===== EXPORT / IMPORT =====

function exportBackup() {
  const blob = new Blob([JSON.stringify({
    absences: [...state.absences],
    cancellations: [...state.cancellations],
    customHolidays: [...state.customHolidays],
    extras: [...state.extras],
    exported: new Date().toISOString(),
    v: 2,
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
      state.absences       = new Set(stringsOnly(d.absences || d.a));
      state.cancellations  = new Set(stringsOnly(d.cancellations || d.c));
      state.customHolidays = new Set(stringsOnly(d.customHolidays || d.h));
      state.extras         = new Set(stringsOnly(d.extras || d.e));
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
  // Enable iOS Safari :active pseudo-class on elements outside #main
  document.addEventListener('touchstart', () => {}, { passive: true });

  load();
  migrateExtras();
  viewDate = new Date();

  // Brand logo tap — go to Today (current date)
  document.querySelector('.nav-left').addEventListener('click', () => {
    if (activeView !== 'today') switchView('today');
    viewDate = new Date();
    renderToday();
  });

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

  // Action overlay (blur bg click)
  document.getElementById('action-overlay-bg').addEventListener('click', closeActionOverlay);

  // Extra class (today view) — opens action overlay picker
  document.getElementById('today-extra-btn').addEventListener('click', () => {
    showActionOverlay('picker', { ds: fmt(viewDate) });
  });

  // Extra class (modal)
  document.getElementById('extra-btn').addEventListener('click', addExtraClass);
  document.getElementById('extra-date-btn').addEventListener('click', () => {
    hapticTap();
    const btn = document.getElementById('extra-date-btn');
    const d = parse(btn.dataset.ds);
    openDatePicker(d, (selectedDate) => {
      btn.dataset.ds = fmt(selectedDate);
      btn.textContent = `${MONTH_SHORT[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
    });
  });

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

  // Android back gesture handling — single pushState, simple handler
  history.pushState({ ss: true }, '', location.href);

  window.addEventListener('popstate', () => {
    // Always re-push to stay in the app
    history.pushState({ ss: true }, '', location.href);

    // Close things in priority order
    if (document.getElementById('dp-overlay').classList.contains('active')) {
      closeDatePicker();
      return;
    }
    const modal = document.getElementById('subject-modal');
    if (modal && modal.classList.contains('active')) {
      closeModal();
      return;
    }
    if (isOverlayOpen()) {
      closeActionOverlay();
      return;
    }
    if (activeView === 'dashboard') {
      switchView('today');
      return;
    }

    // Nothing to close — double-back to exit
    const now = Date.now();
    if (now - _lastBackTime < 2000) {
      history.go(-(history.length));
      return;
    }
    _lastBackTime = now;
    toast('Press back again to exit');
  });

  // Initial render
  renderToday();

  // Register service worker (only in production; unregister on localhost to avoid stale cache during development)
  if ('serviceWorker' in navigator) {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) reg.unregister();
      });
    } else {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }
}

document.addEventListener('DOMContentLoaded', init);

// ===== DATE PICKER =====

let pickerDate = new Date();
let pickerSelectedDate = new Date();
let _dpCallback = null;

function openDatePicker(initialDate, callback) {
  pickerDate = new Date(initialDate);
  pickerSelectedDate = new Date(initialDate);
  _dpCallback = callback;
  renderDatePicker();
  document.getElementById('dp-overlay').classList.add('active');
  history.pushState({ modal: 'dp' }, '');
}

function closeDatePicker() {
  document.getElementById('dp-overlay').classList.remove('active');
  _dpCallback = null;
}

function renderDatePicker() {
  const y = pickerDate.getFullYear();
  const m = pickerDate.getMonth();
  document.getElementById('dp-month-year').textContent = `${MONTH_NAMES[m]} ${y}`;

  const firstDay = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevMonthDays = new Date(y, m, 0).getDate();

  let html = '';
  const now = new Date();

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    let d = prevMonthDays - i;
    html += `<div class="dp-cell muted">${d}</div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    let cls = 'dp-cell';
    if (y === now.getFullYear() && m === now.getMonth() && d === now.getDate()) cls += ' today';
    if (y === pickerSelectedDate.getFullYear() && m === pickerSelectedDate.getMonth() && d === pickerSelectedDate.getDate()) cls += ' selected';
    
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (isHoliday(ds)) cls += ' holiday';

    html += `<div class="${cls}" data-d="${d}">${d}</div>`;
  }

  // Next month leading days (to fill exactly 42 cells)
  const remainingCells = 42 - (firstDay + daysInMonth);
  for (let d = 1; d <= remainingCells; d++) {
    html += `<div class="dp-cell muted">${d}</div>`;
  }

  const grid = document.getElementById('dp-grid');
  grid.innerHTML = html;

  grid.querySelectorAll('.dp-cell:not(.muted)').forEach(cell => {
    cell.addEventListener('click', () => {
      hapticTap();
      pickerSelectedDate = new Date(y, m, parseInt(cell.dataset.d));
      if (_dpCallback) _dpCallback(pickerSelectedDate);
      if (history.state?.modal === 'dp') history.back();
      else closeDatePicker();
    });
  });
}

// Bind Date Picker Events
document.querySelector('.date-center').addEventListener('click', () => {
  hapticTap();
  openDatePicker(viewDate, (d) => {
    viewDate = d;
    renderToday();
  });
});
document.getElementById('dp-overlay-bg').addEventListener('click', () => {
  if (history.state?.modal === 'dp') history.back();
  else closeDatePicker();
});
document.getElementById('dp-prev').addEventListener('click', () => {
  hapticTap();
  pickerDate = new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1);
  renderDatePicker();
});
document.getElementById('dp-next').addEventListener('click', () => {
  hapticTap();
  pickerDate = new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1);
  renderDatePicker();
});
