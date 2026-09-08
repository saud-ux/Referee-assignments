const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  tournaments: [],
  referees: [],
  matches: [],
  assignments: [],
  tournamentId: null,
  assignMatchId: null,
  editMatchId: null,
  refQuery: '',
  assignQuery: '',
  assignPick: null,
  matchQuery: '',
  matchCat: 'الكل',
  matchStatus: 'الكل',
  collapsed: new Set(),
};

const STATUS = {
  pending: 'قيد الإرسال',
  sent: 'بانتظار الرد',
  accepted: 'قبل التكليف',
  declined: 'اعتذر',
  cancelled: 'ملغى',
  failed: 'فشل الإرسال',
  expired: 'انتهت المهلة — لم يرد',
};

/* ---------------- أدوات ---------------- */
async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'تعذّر إتمام العملية');
  return data;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

/* ---------------- إدارة النوافذ ---------------- */
let savedScrollY = 0;

function lockBackground() {
  if (document.body.classList.contains('dlg-open')) return;
  savedScrollY = window.scrollY;
  document.body.style.top = `-${savedScrollY}px`;
  document.body.classList.add('dlg-open');
}

function unlockBackground() {
  if (!document.body.classList.contains('dlg-open')) return;
  document.body.classList.remove('dlg-open');
  document.body.style.top = '';
  window.scrollTo(0, savedScrollY);
}

function openDialog(id) {
  const dlg = document.getElementById(id);
  if (!dlg) return;
  lockBackground();
  dlg.showModal();
}

function closeDialog(dlg) {
  dlg.querySelector('form')?.reset();
  dlg.close();
}

document.addEventListener('close', (e) => {
  if (e.target.tagName === 'DIALOG' && !document.querySelector('dialog[open]')) {
    unlockBackground();
  }
}, true);

const fmtTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso))
    : 'الموعد غير محدد';

const refereeName = (id) => state.referees.find((r) => r.id === id)?.name || 'حكم محذوف';

/* ---------------- منتقي الحكّام في نافذة التكليف ---------------- */
const OPEN = ['pending', 'sent', 'accepted'];
const CLASH_MS = 90 * 60_000; // مطابق لافتراضي الخادم — الخادم هو الحَكَم الفعلي

/** عدد التكليفات القائمة لكل حكم في البطولة الحالية */
function refereeLoads() {
  const loads = new Map();
  for (const a of state.assignments) {
    if (!OPEN.includes(a.status)) continue;
    loads.set(a.refereeId, (loads.get(a.refereeId) || 0) + 1);
  }
  return loads;
}

/** هل لدى الحكم مباراة أخرى قريبة زمنياً من المباراة الجاري تكليفها؟ */
function clashFor(refereeId, target) {
  if (!target?.startTime) return null;
  const t = new Date(target.startTime).getTime();
  if (Number.isNaN(t)) return null;

  for (const a of state.assignments) {
    if (a.refereeId !== refereeId || !OPEN.includes(a.status)) continue;
    if (a.matchId === target.id) continue;
    const other = state.matches.find((x) => x.id === a.matchId);
    if (!other?.startTime) continue;
    const ot = new Date(other.startTime).getTime();
    if (!Number.isNaN(ot) && Math.abs(ot - t) < CLASH_MS) return other;
  }
  return null;
}

function renderPicker() {
  const box = $('#assign-list');
  const q = (state.assignQuery || '').trim().toLowerCase();
  const target = state.matches.find((x) => x.id === state.assignMatchId);
  const loads = refereeLoads();

  const rows = q
    ? state.referees.filter((r) =>
        [r.name, r.phone, r.refereeNumber].some((v) => String(v || '').toLowerCase().includes(q))
      )
    : state.referees;

  if (!rows.length) {
    box.innerHTML = `<p class="empty">لا حكم يطابق "${q}".</p>`;
    return;
  }

  box.innerHTML = rows
    .map((r) => {
      const n = loads.get(r.id) || 0;
      const clash = clashFor(r.id, target);
      const tag = clash
        ? `<span class="clash">⚠ مرتبط بمباراة قريبة</span>`
        : n
        ? `<span class="load${n >= 3 ? ' busy' : ''}">${n} تكليف</span>`
        : '<span class="load">متفرّغ</span>';
      return `<button type="button" class="pick-row${
        state.assignPick === r.id ? ' on' : ''
      }" data-pick-ref="${r.id}">
        <span class="who">
          <span class="nm">${r.refereeNumber ? '<b>' + r.refereeNumber + '</b> — ' : ''}${r.name}</span>
          <span class="meta">${r.phone}</span>
        </span>
        ${tag}
      </button>`;
    })
    .join('');
}

/** يبني رابط الرد ونص رسالة الواتساب لتكليف معيّن */
function buildInvite(assignmentId) {
  const a = state.assignments.find((x) => x.id === assignmentId);
  if (!a?.token) return null;
  const m = state.matches.find((x) => x.id === a.matchId);
  const ref = state.referees.find((x) => x.id === a.refereeId);
  const tour = state.tournaments.find((x) => x.id === a.tournamentId);
  if (!m || !ref) return null;

  const link = `${location.origin}/r/${a.token}`;
  const teams = `${m.clubA || m.playerA || ''} × ${m.clubB || m.playerB || ''}`;

  const lines = [
    `السلام عليكم ${ref.name}`,
    '',
    'كُلِّفت بإدارة المباراة التالية:',
    `🏓 ${teams}`,
  ];
  if (tour?.name) lines.push(`🏆 ${tour.name}`);
  lines.push(`🕒 ${fmtTime(m.startTime)}`);
  if (m.table) lines.push(`📍 طاولة ${m.table}`);
  if (m.round) lines.push(`🔸 ${m.round}`);
  lines.push('', 'للقبول أو الاعتذار، افتح الرابط:', link);

  return { link, text: lines.join('\n'), phone: String(ref.phone).replace(/\D/g, '') };
}

function importMessage(kind, r) {
  const parts = [`استُورد ${r.added} ${kind}`];
  if (r.skipped?.length) parts.push(`تُخطّي ${r.skipped.length} سطر`);
  return parts.join(' — ');
}

async function loadSeedPreview() {
  const box = $('#seed-info');
  box.innerHTML = '<p class="empty">جارٍ الفحص…</p>';
  try {
    const s = await api('/seed/preview');
    const line = (label, o, extra = '') =>
      `<div class="sb-row"><div class="body">
        <div class="teams">${label}: ${o.newOnes} جديدة</div>
        <div class="meta">${o.total} في الملف${
          o.total - o.newOnes ? ` · ${o.total - o.newOnes} موجودة مسبقاً` : ''
        }${extra}</div>
      </div></div>`;
    box.innerHTML =
      line('البطولات', s.tournaments) +
      line('المباريات', s.matches, ` · تُسنَد إلى «${s.matches.tournament}»`);
  } catch (err) {
    box.innerHTML = `<p class="empty">تعذّر الفحص: ${err.message}</p>`;
  }
}

async function loadScoreboardTournaments() {
  const box = $('#sb-tournaments-list');
  box.innerHTML = '<p class="empty">جارٍ الجلب…</p>';
  try {
    const rows = await api('/scoreboard/tournaments');
    state.sbTournaments = rows;
    if (!rows.length) {
      box.innerHTML = '<p class="empty">لم يُستنبط أي اسم بطولة من السكوربورد.</p>';
      return;
    }
    box.innerHTML = rows
      .map(
        (r) => `<label class="sb-row ${r.exists ? 'done' : ''}">
          <input type="checkbox" data-sb-tname="${r.name}" ${r.exists ? 'disabled' : 'checked'} />
          <div class="body">
            <div class="teams">${r.name}</div>
            <div class="meta">${r.count} مباراة</div>
          </div>
        </label>`
      )
      .join('');
  } catch (err) {
    box.innerHTML = `<p class="empty">تعذّر الجلب: ${err.message}</p>`;
  }
}

async function loadScoreboard() {
  const box = $('#sb-list');
  box.innerHTML = '<p class="empty">جارٍ الجلب…</p>';
  try {
    const [preview, matches] = await Promise.all([
      api('/scoreboard/preview'),
      api(`/matches?tournamentId=${state.tournamentId}`),
    ]);
    const importedKeys = new Set(matches.map((m) => m.sourceKey).filter(Boolean));
    state.sbRows = preview.rows || [];
    if (!state.sbRows.length) {
      box.innerHTML = '<p class="empty">لا توجد مباريات في السكوربورد.</p>';
      return;
    }
    box.innerHTML = state.sbRows
      .map((r) => {
        const done = importedKeys.has(r.sourceKey);
        return `<label class="sb-row ${done ? 'done' : ''}">
          <input type="checkbox" data-sb-key="${r.sourceKey}" ${done ? 'disabled' : 'checked'} />
          <div class="body">
            <div class="teams">${r.clubA} × ${r.clubB}</div>
            <div class="meta">${r.sourceKey}${r.number != null ? ' — المباراة ' + r.number : ''}</div>
          </div>
        </label>`;
      })
      .join('');
  } catch (err) {
    box.innerHTML = `<p class="empty">تعذّر الجلب: ${err.message}</p>`;
  }
}

document.addEventListener('click', (e) => {
  if (e.target.id === 'sb-refresh') loadScoreboard();
  if (e.target.id === 'sb-tournaments-refresh') loadScoreboardTournaments();
  if (e.target.id === 'btn-download-tpl') downloadTemplate();
  if (e.target.id === 'btn-download-ref-tpl') downloadRefereesTemplate();
  if (e.target.id === 'btn-export') exportAssignments();
});

/* ------- استيراد من ملف Excel ------- */
const MATCH_HEADERS = {
  clubA: ['النادي الأول', 'الفريق الأول', 'clubA', 'teamA'],
  clubB: ['النادي الثاني', 'الفريق الثاني', 'clubB', 'teamB'],
  startTime: ['الموعد', 'التاريخ', 'الوقت', 'startTime', 'date'],
  table: ['الطاولة', 'table'],
  round: ['الدور', 'round'],
  category: ['الفئة', 'category'],
};

const REFEREE_HEADERS = {
  name: ['اسم الحكم', 'الاسم', 'الحكم', 'name'],
  refereeNumber: ['رقم الحكم', 'الرقم', 'number', 'refereeNumber'],
  phone: ['رقم الجوال', 'الجوال', 'الهاتف', 'phone', 'mobile'],
};

function mapHeader(cell, dict) {
  const s = String(cell || '').trim();
  for (const [key, aliases] of Object.entries(dict)) {
    if (aliases.some((a) => a === s)) return key;
  }
  return null;
}

const matchHeader = (c) => mapHeader(c, MATCH_HEADERS);
const refHeader = (c) => mapHeader(c, REFEREE_HEADERS);

function normalizeTime(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 16);
  const s = String(v).trim().replace(' ', 'T');
  return s;
}

function parseWorkbook(file, kind = 'match') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذّر قراءة الملف'));
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
        if (!rows.length) return resolve([]);
        const mapFn = kind === 'referee' ? refHeader : matchHeader;
        const headerRow = rows[0].map(mapFn);
        const required = kind === 'referee' ? ['name', 'phone', 'refereeNumber'] : ['clubA', 'clubB'];
        const out = [];
        for (let i = 1; i < rows.length; i++) {
          const raw = rows[i];
          if (!raw.some((v) => String(v).trim())) continue;
          const rec = {};
          headerRow.forEach((key, idx) => {
            if (!key) return;
            rec[key] = key === 'startTime'
              ? normalizeTime(raw[idx])
              : String(raw[idx] || '').trim();
          });
          if (required.every((k) => rec[k])) out.push(rec);
        }
        resolve(out);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function handleFilePicked(file) {
  const box = $('#file-preview');
  box.hidden = false;
  box.innerHTML = '<p class="empty">جارٍ القراءة…</p>';
  try {
    const rows = await parseWorkbook(file);
    state.fileRows = rows;
    if (!rows.length) {
      box.innerHTML = '<p class="empty">ما لقيت بيانات صالحة. تأكّد من عناوين الأعمدة.</p>';
      return;
    }
    box.innerHTML = rows
      .map(
        (r) => `<div class="sb-row">
          <div class="body">
            <div class="teams">${r.clubA} × ${r.clubB}</div>
            <div class="meta">${[r.startTime, r.table && 'طاولة ' + r.table, r.round, r.category]
              .filter(Boolean)
              .join(' · ') || 'بلا تفاصيل'}</div>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    box.innerHTML = `<p class="empty">خطأ في الملف: ${err.message}</p>`;
    state.fileRows = [];
  }
}

async function handleRefFilePicked(file) {
  const box = $('#ref-file-preview');
  box.hidden = false;
  box.innerHTML = '<p class="empty">جارٍ القراءة…</p>';
  try {
    const rows = await parseWorkbook(file, 'referee');
    state.refFileRows = rows;
    if (!rows.length) {
      box.innerHTML = '<p class="empty">ما لقيت بيانات صالحة. تأكّد من عناوين الأعمدة.</p>';
      return;
    }
    box.innerHTML = rows
      .map(
        (r) => `<div class="sb-row">
          <div class="body">
            <div class="teams">${r.refereeNumber ? '<b>' + r.refereeNumber + '</b> — ' : ''}${r.name}</div>
            <div class="meta">${r.phone}</div>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    box.innerHTML = `<p class="empty">خطأ في الملف: ${err.message}</p>`;
    state.refFileRows = [];
  }
}

document.addEventListener('input', (e) => {
  if (e.target.id === 'ref-search') {
    state.refQuery = e.target.value;
    renderReferees();
  }
  if (e.target.id === 'assign-search') {
    state.assignQuery = e.target.value;
    renderPicker();
  }
  if (e.target.id === 'match-search') {
    state.matchQuery = e.target.value;
    renderBoard();
  }
});

// شرائح تصفية المباريات + التبديل بين الحالات + طي الأيام
document.addEventListener('click', (e) => {
  const cat = e.target.closest('[data-mcat]');
  if (cat) { state.matchCat = cat.dataset.mcat; return renderBoard(); }
  const st = e.target.closest('[data-mst]');
  if (st) { state.matchStatus = st.dataset.mst; $$('.schip').forEach((el) => el.classList.toggle('on', el === st)); return renderBoard(); }
});

// نستمع لتغيّر <details> عشان نتذكر أي أيام مطويّة
document.addEventListener('toggle', (e) => {
  if (!e.target.matches?.('.dayg')) return;
  const key = e.target.dataset.day;
  if (!key) return;
  if (e.target.open) state.collapsed.delete(key);
  else state.collapsed.add(key);
}, true);

// اختيار حكم من المنتقي
document.addEventListener('click', (e) => {
  const row = e.target.closest('[data-pick-ref]');
  if (!row) return;
  state.assignPick = row.dataset.pickRef;
  $('#assign-value').value = state.assignPick;
  renderPicker();
});

// Enter في مربع البحث يختار النتيجة الوحيدة مباشرة
document.addEventListener('keydown', (e) => {
  if (e.target.id !== 'assign-search' || e.key !== 'Enter') return;
  e.preventDefault();
  const rows = document.querySelectorAll('#assign-list [data-pick-ref]');
  if (rows.length !== 1) return;
  state.assignPick = rows[0].dataset.pickRef;
  $('#assign-value').value = state.assignPick;
  renderPicker();
});

/* ------- تصدير كشف التكليفات ------- */
function exportAssignments() {
  if (typeof XLSX === 'undefined') return toast('مكتبة Excel لم تُحمَّل بعد');
  const tour = state.tournaments.find((t) => t.id === state.tournamentId);
  if (!state.matches.length) return toast('لا توجد مباريات للتصدير');

  const header = [
    'النادي الأول',
    'النادي الثاني',
    'الموعد',
    'الدور',
    'الفئة',
    'الحكم',
    'رقم الحكم',
    'جوال الحكم',
    'الحالة',
  ];

  const rows = state.matches.map((m) => {
    const a = liveAssignment(m.id);
    const ref = a ? state.referees.find((r) => r.id === a.refereeId) : null;
    return [
      m.clubA || m.playerA || '',
      m.clubB || m.playerB || '',
      m.startTime ? fmtTime(m.startTime) : '',
      m.round || '',
      m.category || '',
      ref?.name || (a ? 'حكم محذوف' : ''),
      ref?.refereeNumber || '',
      ref?.phone || '',
      a ? STATUS[a.status] || a.status : 'بلا حكم',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 16 }, { wch: 16 }, { wch: 26 },
    { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 18 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'التكليفات');
  const safe = (tour?.name || 'البطولة').replace(/[\\/:*?"<>|]/g, '-');
  XLSX.writeFile(wb, `كشف-التكليفات-${safe}.xlsx`);
  toast(`صُدِّرت ${rows.length} مباراة`);
}

document.addEventListener('change', (e) => {
  if (e.target.id === 'file-input' && e.target.files[0]) {
    handleFilePicked(e.target.files[0]);
  }
  if (e.target.id === 'ref-file-input' && e.target.files[0]) {
    handleRefFilePicked(e.target.files[0]);
  }
});

function downloadTemplate() {
  if (typeof XLSX === 'undefined') return toast('مكتبة Excel لم تُحمَّل بعد');
  const ws = XLSX.utils.aoa_to_sheet([
    ['النادي الأول', 'النادي الثاني', 'الموعد', 'الدور', 'الفئة'],
  ]);
  ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المباريات');
  XLSX.writeFile(wb, 'قالب-المباريات.xlsx');
}

function downloadRefereesTemplate() {
  if (typeof XLSX === 'undefined') return toast('مكتبة Excel لم تُحمَّل بعد');
  const ws = XLSX.utils.aoa_to_sheet([['اسم الحكم', 'رقم الحكم', 'رقم الجوال']]);
  ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الحكّام');
  XLSX.writeFile(wb, 'قالب-الحكّام.xlsx');
}

const liveAssignment = (matchId) =>
  state.assignments.find(
    (a) => a.matchId === matchId && ['pending', 'sent', 'accepted'].includes(a.status)
  ) ||
  state.assignments.find(
    (a) => a.matchId === matchId && ['declined', 'expired'].includes(a.status)
  );

/* ---------------- التحميل ---------------- */
async function loadSidebar() {
  [state.tournaments, state.referees] = await Promise.all([
    api('/tournaments'),
    api('/referees'),
  ]);
  renderTournaments();
  renderReferees();
}

async function loadBoard() {
  if (!state.tournamentId) return renderBoard();
  [state.matches, state.assignments] = await Promise.all([
    api(`/matches?tournamentId=${state.tournamentId}`),
    api(`/assignments?tournamentId=${state.tournamentId}`),
  ]);
  renderBoard();
}

/* ---------------- العرض ---------------- */
function renderTournaments() {
  const ul = $('#tournaments');
  if (!state.tournaments.length) {
    ul.innerHTML = '<li class="empty">لا توجد بطولات بعد. ابدأ بإضافة واحدة.</li>';
    return;
  }
  ul.innerHTML = state.tournaments
    .map(
      (t) => `<li class="${t.id === state.tournamentId ? 'on' : ''}">
        <button class="pick" data-tournament="${t.id}">${t.name}
          <span class="sub">${[t.city, t.venue].filter(Boolean).join(' — ') || 'بلا موقع'}</span>
        </button>
        <button class="del" data-del-tournament="${t.id}" title="حذف">×</button>
      </li>`
    )
    .join('');
}

function renderReferees() {
  const ul = $('#referees');
  if (!state.referees.length) {
    ul.innerHTML = '<li class="empty">أضف الحكّام لتتمكن من تكليفهم.</li>';
    return;
  }
  const q = state.refQuery.trim().toLowerCase();
  const rows = q
    ? state.referees.filter((r) =>
        [r.name, r.phone, r.refereeNumber].some((v) => String(v || '').toLowerCase().includes(q))
      )
    : state.referees;

  if (!rows.length) {
    ul.innerHTML = `<li class="empty">لا نتائج لـ "${q}".</li>`;
    return;
  }
  ul.innerHTML = rows
    .map(
      (r) => `<li>
        <span class="pick">${r.refereeNumber ? '<b>' + r.refereeNumber + '</b> — ' : ''}${r.name}
          <span class="sub">${r.phone}</span>
        </span>
        <button class="del" data-del-referee="${r.id}" title="حذف">×</button>
      </li>`
    )
    .join('');
}

/* ------------- تصفية وتجميع بطاقات المباريات ------------- */
const dayKey = (m) => (m.startTime || '').slice(0, 10) || 'بلا موعد';

const fmtDay = (key) => {
  if (key === 'بلا موعد') return key;
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Riyadh',
  }).format(new Date(key));
};

const fmtHm = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh',
  }).format(d).replace(/AM|am|ص/, 'ص').replace(/PM|pm|م/, 'م');
};

function actionsFor(m, a) {
  if (!a) return `<button class="btn small" data-assign="${m.id}">تكليف حكم</button>`;
  if (['sent', 'pending'].includes(a.status)) {
    return [
      a.token ? `<button class="btn small" data-wa="${a.id}">واتساب</button>` : '',
      a.token ? `<button class="btn ghost small" data-copy="${a.id}">نسخ</button>` : '',
      `<button class="btn ghost small" data-mark="${a.id}" data-value="accepted">قبول</button>`,
      `<button class="btn danger small" data-mark="${a.id}" data-value="declined">اعتذار</button>`,
      `<button class="btn ghost small" data-cancel="${a.id}">إلغاء</button>`,
    ].filter(Boolean).join('');
  }
  if (a.status === 'accepted') {
    return `<button class="btn danger small" data-cancel="${a.id}">إلغاء التكليف</button>`;
  }
  return `<button class="btn small" data-assign="${m.id}">تكليف حكم آخر</button>`;
}

function refereeCell(a) {
  if (!a) return '<span class="muted">—</span>';
  const r = state.referees.find((x) => x.id === a.refereeId);
  const label = r ? `${r.refereeNumber ? '<b>' + r.refereeNumber + '</b> ' : ''}${r.name}` : 'حكم محذوف';
  return `<div>${label}</div><div class="chip-status s-${a.status}">${STATUS[a.status] || a.status}</div>`;
}

function filteredMatches() {
  const q = (state.matchQuery || '').trim().toLowerCase();
  const catF = state.matchCat || 'الكل';
  const stF = state.matchStatus || 'الكل';
  return state.matches.filter((m) => {
    if (catF !== 'الكل' && (m.category || '') !== catF) return false;
    const a = liveAssignment(m.id);
    const s = a?.status || 'empty';
    if (stF !== 'الكل') {
      if (stF === 'empty' && a) return false;
      if (stF === 'sent' && !['sent', 'pending'].includes(s)) return false;
      if (stF === 'accepted' && s !== 'accepted') return false;
      if (stF === 'declined' && !['declined', 'expired'].includes(s)) return false;
    }
    if (q) {
      const hay = `${m.clubA || m.playerA} ${m.clubB || m.playerB} ${m.round || ''} ${m.table || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderBoard() {
  const board = $('#board');
  const tournament = state.tournaments.find((t) => t.id === state.tournamentId);

  $('#btn-add-match').hidden = !tournament;
  $('#btn-sb-import').hidden = !tournament;
  $('#btn-file-import').hidden = !tournament;
  $('#btn-export').hidden = !tournament;
  $('#board-toolbar').hidden = !tournament || !state.matches.length;
  $('#tally').hidden = !tournament;
  $('#board-title').textContent = tournament ? tournament.name : 'اختر بطولة للبدء';

  if (!tournament) {
    board.innerHTML = '<p class="empty">اختر بطولة من القائمة، أو أضف بطولة جديدة.</p>';
    return;
  }
  if (!state.matches.length) {
    board.innerHTML = '<p class="empty">لا توجد مباريات في هذه البطولة بعد.</p>';
    updateTally();
    return;
  }

  // شرائح الفئات — تُبنى من الفئات الموجودة فعلاً
  const cats = ['الكل', ...new Set(state.matches.map((m) => m.category).filter(Boolean))];
  $('#board-cats').innerHTML = cats
    .map((c) => `<button class="fchip ${(state.matchCat || 'الكل') === c ? 'on' : ''}" data-mcat="${c}">${c}</button>`)
    .join('');

  const filtered = filteredMatches();
  if (!filtered.length) {
    board.innerHTML = '<p class="empty">لا توجد مباريات تطابق التصفية.</p>';
    updateTally();
    return;
  }

  // نجمّع باليوم ثم نعرض جدولاً مضغوطاً — أسهل قراءة من بطاقة لكل مباراة
  const days = new Map();
  for (const m of filtered) {
    const k = dayKey(m);
    if (!days.has(k)) days.set(k, []);
    days.get(k).push(m);
  }
  const sortedDays = [...days.keys()].sort();

  board.innerHTML = sortedDays
    .map((k) => {
      const rows = days.get(k).sort((a, b) => {
        const t = String(a.startTime).localeCompare(String(b.startTime));
        return t !== 0 ? t : String(a.table).localeCompare(String(b.table));
      });
      // نُظهر الأعمدة الاختيارية فقط عندما تحمل مباراة واحدة على الأقل قيمة
      const showTable = rows.some((m) => (m.table || '').trim());
      const showRound = rows.some((m) => (m.round || '').trim());
      const showCat = rows.some((m) => (m.category || '').trim());
      const collapsed = state.collapsed?.has(k) ? '' : ' open';
      return `<details class="dayg" data-day="${k}"${collapsed}>
        <summary>
          <span class="daylbl">${fmtDay(k)}</span>
          <span class="daycount">${rows.length} مباراة</span>
        </summary>
        <div class="mtblwrap">
          <table class="mtbl">
            <thead>
              <tr>
                <th>الوقت</th>
                ${showTable ? '<th>الطاولة</th>' : ''}
                <th class="wide">المباراة</th>
                ${showCat ? '<th>الفئة</th>' : ''}
                ${showRound ? '<th>الدور</th>' : ''}
                <th class="wide">الحكم</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((m) => {
                const a = liveAssignment(m.id);
                const st = a?.status || 'empty';
                return `<tr data-state="${st}">
                  <td class="tm">${fmtHm(m.startTime)}</td>
                  ${showTable ? `<td>${m.table || '—'}</td>` : ''}
                  <td class="wide"><b>${m.clubA || m.playerA || ''}</b> × <b>${m.clubB || m.playerB || ''}</b></td>
                  ${showCat ? `<td>${m.category || '—'}</td>` : ''}
                  ${showRound ? `<td>${m.round || '—'}</td>` : ''}
                  <td class="wide ref">${refereeCell(a)}</td>
                  <td class="acts">
                    ${actionsFor(m, a)}
                    <button class="icn" data-edit-match="${m.id}" title="تعديل">✎</button>
                    <button class="icn" data-del-match="${m.id}" title="حذف">🗑</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </details>`;
    })
    .join('');

  updateTally();
}

function updateTally() {
  const counts = { accepted: 0, sent: 0, declined: 0, empty: 0 };
  for (const m of state.matches) {
    const a = liveAssignment(m.id);
    if (!a) counts.empty++;
    else if (a.status === 'accepted') counts.accepted++;
    else if (['declined', 'expired'].includes(a.status)) counts.declined++;
    else counts.sent++;
  }
  $('#n-accepted').textContent = counts.accepted;
  $('#n-sent').textContent = counts.sent;
  $('#n-declined').textContent = counts.declined;
  $('#n-empty').textContent = counts.empty;
}

/* ---------------- التفاعل ---------------- */
document.addEventListener('click', async (e) => {
  const closer = e.target.closest('[data-close]');
  if (closer) {
    const dlg = closer.closest('dialog');
    if (dlg) closeDialog(dlg);
    return;
  }

  if (e.target.tagName === 'DIALOG' && e.target.open) {
    const r = e.target.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right &&
      e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) {
      closeDialog(e.target);
      return;
    }
  }

  const t = e.target.closest('[data-open], [data-tournament], [data-assign], [data-cancel], [data-mark], [data-del-tournament], [data-del-referee], [data-del-match], [data-edit-match], [data-wa], [data-copy]');
  if (!t) return;

  try {
    if (t.dataset.open) {
      const needsTournament = ['dlg-match', 'dlg-import-matches', 'dlg-sb-import', 'dlg-match-file'].includes(t.dataset.open);
      if (needsTournament && !state.tournamentId) {
        return toast('اختر بطولة أولاً');
      }
      const tour = state.tournaments.find((x) => x.id === state.tournamentId);
      if (t.dataset.open === 'dlg-sb-import') {
        $('#sb-target-name').textContent = tour?.name || '—';
        openDialog(t.dataset.open);
        return loadScoreboard();
      }
      if (t.dataset.open === 'dlg-sb-tournaments') {
        openDialog(t.dataset.open);
        return loadScoreboardTournaments();
      }
      if (t.dataset.open === 'dlg-seed') {
        openDialog(t.dataset.open);
        return loadSeedPreview();
      }
      if (t.dataset.open === 'dlg-match-file') {
        $('#file-target-name').textContent = tour?.name || '—';
        $('#file-preview').hidden = true;
        $('#file-preview').innerHTML = '';
        state.fileRows = [];
      }
      return openDialog(t.dataset.open);
    }

    if (t.dataset.tournament) {
      state.tournamentId = t.dataset.tournament;
      renderTournaments();
      return loadBoard();
    }

    if (t.dataset.wa) {
      const built = buildInvite(t.dataset.wa);
      if (!built) return toast('تعذّر بناء الرسالة');
      window.open(
        `https://wa.me/${built.phone}?text=${encodeURIComponent(built.text)}`,
        '_blank',
        'noopener'
      );
      return;
    }

    if (t.dataset.copy) {
      const built = buildInvite(t.dataset.copy);
      if (!built) return toast('تعذّر بناء الرابط');
      await navigator.clipboard.writeText(built.link);
      return toast('نُسخ الرابط');
    }

    if (t.dataset.editMatch) {
      const m = state.matches.find((x) => x.id === t.dataset.editMatch);
      if (!m) return;
      state.editMatchId = m.id;
      const f = document.querySelector('[data-form="edit-match"]');
      f.clubA.value = m.clubA || m.playerA || '';
      f.clubB.value = m.clubB || m.playerB || '';
      f.startTime.value = (m.startTime || '').slice(0, 16);
      f.table.value = m.table || '';
      f.round.value = m.round || '';
      f.category.value = m.category || '';
      return openDialog('dlg-edit-match');
    }

    if (t.dataset.assign) {
      if (!state.referees.length) return toast('أضف حكّاماً أولاً');
      state.assignMatchId = t.dataset.assign;
      const m = state.matches.find((x) => x.id === state.assignMatchId);
      const teams = `${m.clubA || m.playerA || ''} × ${m.clubB || m.playerB || ''}`;
      $('#assign-match').textContent = `${teams} — ${fmtTime(m.startTime)}`;
      state.assignQuery = '';
      state.assignPick = null;
      $('#assign-search').value = '';
      $('#assign-value').value = '';
      renderPicker();
      openDialog('dlg-assign');
      return $('#assign-search').focus();
    }

    if (t.dataset.cancel) {
      const a = state.assignments.find((x) => x.id === t.dataset.cancel);
      const who = a ? refereeName(a.refereeId) : 'الحكم';
      const warn =
        a?.status === 'accepted'
          ? `${who} قبل هذا التكليف. إلغاؤه يعني أنه لن يدير المباراة — تأكد من إبلاغه.\n\nمتأكد؟`
          : `إلغاء تكليف ${who}؟`;
      if (!confirm(warn)) return;
      await api(`/assignments/${t.dataset.cancel}/cancel`, { method: 'POST' });
      toast('أُلغي التكليف');
      return loadBoard();
    }

    if (t.dataset.mark) {
      await api(`/assignments/${t.dataset.mark}/mark`, {
        method: 'POST',
        body: { status: t.dataset.value },
      });
      toast('سُجّل الرد');
      return loadBoard();
    }

    if (t.dataset.delTournament) {
      if (!confirm('حذف البطولة وكل مبارياتها وتكاليفها؟')) return;
      await api(`/tournaments/${t.dataset.delTournament}`, { method: 'DELETE' });
      if (state.tournamentId === t.dataset.delTournament) state.tournamentId = null;
      await loadSidebar();
      return loadBoard();
    }

    if (t.dataset.delReferee) {
      if (!confirm('حذف الحكم؟')) return;
      await api(`/referees/${t.dataset.delReferee}`, { method: 'DELETE' });
      await loadSidebar();
      return renderBoard();
    }

    if (t.dataset.delMatch) {
      if (!confirm('حذف المباراة؟')) return;
      await api(`/matches/${t.dataset.delMatch}`, { method: 'DELETE' });
      return loadBoard();
    }
  } catch (err) {
    toast(err.message);
  }
});

document.addEventListener('submit', async (e) => {
  const form = e.target;
  const kind = form.dataset.form;
  if (!kind) return;

  const submitter = e.submitter?.value;
  const body = Object.fromEntries(new FormData(form).entries());
  if (submitter === 'cancel') return form.reset();

  try {
    if (kind === 'tournament') {
      await api('/tournaments', { method: 'POST', body });
      await loadSidebar();
      toast('أُضيفت البطولة');
    }
    if (kind === 'referee') {
      await api('/referees', { method: 'POST', body });
      await loadSidebar();
      toast('أُضيف الحكم');
    }
    if (kind === 'match') {
      await api('/matches', {
        method: 'POST',
        body: { ...body, tournamentId: state.tournamentId },
      });
      await loadBoard();
      toast('أُضيفت المباراة');
    }
    if (kind === 'edit-match') {
      await api(`/matches/${state.editMatchId}`, { method: 'PATCH', body });
      await loadBoard();
      toast('حُفظ التعديل');
    }
    if (kind === 'assign') {
      if (!body.refereeId) return toast('اختر حكماً من القائمة');
      const payload = { matchId: state.assignMatchId, refereeId: body.refereeId };
      try {
        await api('/assignments', { method: 'POST', body: payload });
      } catch (err) {
        if (!/مكلّف بمباراة أخرى/.test(err.message)) throw err;
        if (!confirm(`${err.message}\n\nتبي تكمل التكليف رغم التعارض؟`)) {
          toast('أُلغي التكليف');
          return;
        }
        await api('/assignments', { method: 'POST', body: { ...payload, force: true } });
      }
      await loadBoard();
      toast('أُرسل التكليف');
    }
    if (kind === 'import-referees') {
      const r = await api('/referees/import', { method: 'POST', body: { text: body.text } });
      await loadSidebar();
      toast(importMessage('حكم', r));
    }
    if (kind === 'import-tournaments') {
      const r = await api('/tournaments/import', { method: 'POST', body: { text: body.text } });
      await loadSidebar();
      toast(importMessage('بطولة', r));
    }
    if (kind === 'import-matches') {
      const r = await api('/matches/import', {
        method: 'POST',
        body: { text: body.text, tournamentId: state.tournamentId },
      });
      await loadBoard();
      toast(importMessage('مباراة', r));
    }
    if (kind === 'match-file') {
      if (!state.fileRows?.length) {
        toast('لم يُحدَّد ملف صالح');
        return;
      }
      const text = state.fileRows
        .map((r) => [r.clubA, r.clubB, r.startTime, r.table, r.round, r.category].join(','))
        .join('\n');
      const r = await api('/matches/import', {
        method: 'POST',
        body: { text, tournamentId: state.tournamentId },
      });
      await loadBoard();
      toast(importMessage('مباراة', r));
    }
    if (kind === 'referees-file') {
      if (!state.refFileRows?.length) {
        toast('لم يُحدَّد ملف صالح');
        return;
      }
      const text = state.refFileRows
        .map((r) => [r.name, r.refereeNumber, r.phone].join(','))
        .join('\n');
      const r = await api('/referees/import', { method: 'POST', body: { text } });
      await loadSidebar();
      toast(importMessage('حكم', r));
    }
    if (kind === 'seed') {
      toast('جارٍ التعبئة…');
      const r = await api('/seed', { method: 'POST' });
      await loadSidebar();
      if (r.tournamentId) {
        state.tournamentId = r.tournamentId;
        renderTournaments();
        await loadBoard();
      }
      toast(`أُضيفت ${r.addedTournaments} بطولة و${r.addedMatches} مباراة`);
    }
    if (kind === 'sb-tournaments') {
      const names = Array.from(form.querySelectorAll('[data-sb-tname]:checked')).map(
        (el) => el.dataset.sbTname
      );
      if (!names.length) {
        toast('لم تُحدَّد أي بطولة');
        return;
      }
      const r = await api('/scoreboard/tournaments/import', {
        method: 'POST',
        body: { names },
      });
      await loadSidebar();
      toast(importMessage('بطولة', r));
    }
    if (kind === 'sb-import') {
      const keys = Array.from(form.querySelectorAll('[data-sb-key]:checked')).map((el) =>
        el.dataset.sbKey
      );
      if (!keys.length) {
        toast('لم تُحدَّد أي مباراة');
        return;
      }
      const r = await api('/scoreboard/import', {
        method: 'POST',
        body: { tournamentId: state.tournamentId, keys },
      });
      await loadBoard();
      toast(importMessage('مباراة', r));
    }
    form.reset();
  } catch (err) {
    toast(err.message);
  }
});

/* ---------------- التشغيل ---------------- */
loadSidebar().then(() => {
  if (state.tournaments.length) {
    state.tournamentId = state.tournaments[0].id;
    renderTournaments();
    loadBoard();
  } else {
    renderBoard();
  }
});

// تحديث دوري لالتقاط ردود الحكّام
setInterval(() => {
  if (state.tournamentId && !document.hidden) loadBoard();
}, 7000);
