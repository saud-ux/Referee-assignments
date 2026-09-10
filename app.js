const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  tournaments: [],
  referees: [],
  assignments: [],
  tournamentId: null,
  editRefereeId: null,
  editTournamentId: null,
  refQuery: '',
  availQuery: '',
  availStatus: 'الكل',
};

const STATUS = {
  pending: 'قيد الإرسال',
  sent: 'بانتظار الرد',
  accepted: 'متوفّر',
  declined: 'اعتذر',
  cancelled: 'ملغى',
  failed: 'فشل الإرسال',
  expired: 'انتهت المهلة — لم يرد',
};

const OPEN = ['pending', 'sent', 'accepted'];

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

/* ---------------- تنسيقات التاريخ ---------------- */
const fmtDateTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso))
    : '';

const fmtDay = (ymd) =>
  ymd
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Riyadh',
      }).format(new Date(`${ymd}T00:00:00`))
    : '';

function fmtPeriod(t) {
  const s = fmtDay(t?.startDate);
  const e = fmtDay(t?.endDate);
  if (s && e) return s === e ? s : `من ${s} إلى ${e}`;
  if (s) return `تبدأ ${s}`;
  return 'غير محددة';
}

const placeOf = (t) => [t?.venue, t?.city].filter(Boolean).join(' — ') || '';
const refereeName = (id) => state.referees.find((r) => r.id === id)?.name || 'حكم محذوف';

/** التكليف القائم أو الأحدث لحكم في البطولة الحالية */
function assignmentFor(refereeId) {
  const mine = state.assignments.filter((a) => a.refereeId === refereeId);
  return (
    mine.find((a) => OPEN.includes(a.status)) ||
    mine.find((a) => ['declined', 'expired'].includes(a.status)) ||
    mine[0] ||
    null
  );
}

/** يبني رابط الرد ونص رسالة الواتساب لتكليف معيّن */
function buildInvite(assignmentId) {
  const a = state.assignments.find((x) => x.id === assignmentId);
  if (!a?.token) return null;
  const ref = state.referees.find((x) => x.id === a.refereeId);
  const tour =
    state.tournaments.find((x) => x.id === a.tournamentId) ||
    state.tournaments.find((x) => x.id === state.tournamentId);
  if (!ref || !tour) return null;

  const link = `${location.origin}/r/${a.token}`;
  const lines = [
    'السلام عليكم',
    `زميلي الحكم/ ${ref.name}`,
    '',
    'تم ترشيحك للمشاركة في تحكيم:',
    `🏆 ${tour.name}`,
    `🗓️ ${fmtPeriod(tour)}`,
  ];
  const place = placeOf(tour);
  if (place) lines.push(`📍 ${place}`);
  lines.push(
    '',
    'يُحدَّد تكليفك اليومي في التجمع.',
    'لتأكيد توفّرك أو الاعتذار، افتح الرابط:',
    link
  );

  return { link, text: lines.join('\n'), phone: String(ref.phone).replace(/\D/g, '') };
}

function importMessage(kind, r) {
  const parts = [`استُورد ${r.added} ${kind}`];
  if (r.skipped?.length) parts.push(`تُخطّي ${r.skipped.length} سطر`);
  return parts.join(' — ');
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

document.addEventListener('click', (e) => {
  if (e.target.id === 'sb-tournaments-refresh') loadScoreboardTournaments();
  if (e.target.id === 'btn-download-ref-tpl') downloadRefereesTemplate();
  if (e.target.id === 'btn-download-t-tpl') downloadTournamentsTemplate();
  if (e.target.id === 'btn-export') exportAvailability();
  if (e.target.id === 'btn-nominate-all') nominateAll();
  if (e.target.id === 'btn-group-link') openGroupLinkDialog();
});

function openGroupLinkDialog() {
  const tour = state.tournaments.find((t) => t.id === state.tournamentId);
  if (!tour) return toast('اختر بطولة أولاً');
  const f = document.querySelector('[data-form="tournament-group"]');
  if (f) f.groupLink.value = tour.groupLink || '';
  openDialog('dlg-tournament-group');
}

// ضغط زر داخل <summary> يبقى يشغّل الزر بدون فتح/قفل القائمة
document.addEventListener('click', (e) => {
  if (e.target.closest('.panel-head .head-actions')) e.preventDefault();
});

/* ------- استيراد الحكّام والبطولات من ملف Excel ------- */
const REFEREE_HEADERS = {
  name: ['اسم الحكم', 'الاسم', 'الحكم', 'name'],
  refereeNumber: ['رقم الحكم', 'الرقم', 'number', 'refereeNumber'],
  phone: ['رقم الجوال', 'الجوال', 'الهاتف', 'phone', 'mobile'],
};

const TOURNAMENT_HEADERS = {
  name: ['اسم البطولة', 'الاسم', 'name'],
  city: ['المدينة', 'city'],
  venue: ['الصالة', 'المكان', 'venue'],
  startDate: ['من', 'من (YYYY-MM-DD)', 'بداية', 'startDate'],
  endDate: ['إلى', 'إلى (YYYY-MM-DD)', 'نهاية', 'endDate'],
};

function mapHeader(cell, dict) {
  const s = String(cell || '').trim();
  for (const [key, aliases] of Object.entries(dict)) {
    if (aliases.some((a) => a === s)) return key;
  }
  return null;
}

const refHeader = (c) => mapHeader(c, REFEREE_HEADERS);
const tHeader = (c) => mapHeader(c, TOURNAMENT_HEADERS);

function normalizeDate(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim().slice(0, 10);
}

function parseWorkbook(file, kind = 'referee') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذّر قراءة الملف'));
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
        if (!rows.length) return resolve([]);
        const mapFn = kind === 'tournament' ? tHeader : refHeader;
        const headerRow = rows[0].map(mapFn);
        const required = kind === 'tournament' ? ['name'] : ['name', 'phone', 'refereeNumber'];
        const out = [];
        for (let i = 1; i < rows.length; i++) {
          const raw = rows[i];
          if (!raw.some((v) => String(v).trim())) continue;
          const rec = {};
          headerRow.forEach((key, idx) => {
            if (!key) return;
            if (key === 'startDate' || key === 'endDate') rec[key] = normalizeDate(raw[idx]);
            else rec[key] = String(raw[idx] || '').trim();
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

async function handleTournamentsFilePicked(file) {
  const box = $('#t-file-preview');
  box.hidden = false;
  box.innerHTML = '<p class="empty">جارٍ القراءة…</p>';
  try {
    const rows = await parseWorkbook(file, 'tournament');
    state.tFileRows = rows;
    if (!rows.length) {
      box.innerHTML = '<p class="empty">ما لقيت بيانات صالحة. تأكّد من عناوين الأعمدة.</p>';
      return;
    }
    box.innerHTML = rows
      .map(
        (r) => `<div class="sb-row">
          <div class="body">
            <div class="teams">${r.name}</div>
            <div class="meta">${[r.city, r.venue, [r.startDate, r.endDate].filter(Boolean).join(' → ')].filter(Boolean).join(' · ')}</div>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    box.innerHTML = `<p class="empty">خطأ في الملف: ${err.message}</p>`;
    state.tFileRows = [];
  }
}

document.addEventListener('input', (e) => {
  if (e.target.id === 'ref-search') {
    state.refQuery = e.target.value;
    renderReferees();
  }
  if (e.target.id === 'avail-search') {
    state.availQuery = e.target.value;
    renderBoard();
  }
});

// شرائح تصفية الحالة
document.addEventListener('click', (e) => {
  const st = e.target.closest('[data-mst]');
  if (st) {
    state.availStatus = st.dataset.mst;
    $$('.schip').forEach((el) => el.classList.toggle('on', el === st));
    return renderBoard();
  }
});

/* ------- تصدير كشف التوفّر ------- */
function exportAvailability() {
  if (typeof XLSX === 'undefined') return toast('مكتبة Excel لم تُحمَّل بعد');
  const tour = state.tournaments.find((t) => t.id === state.tournamentId);
  if (!tour) return toast('اختر بطولة أولاً');
  if (!state.referees.length) return toast('لا يوجد حكّام للتصدير');

  const header = ['رقم الحكم', 'اسم الحكم', 'رقم الجوال', 'الحالة', 'تاريخ الرد'];
  const rows = state.referees.map((r) => {
    const a = assignmentFor(r.id);
    return [
      r.refereeNumber || '',
      r.name || '',
      r.phone || '',
      a ? STATUS[a.status] || a.status : 'لم يُرسل',
      a?.respondedAt ? fmtDateTime(a.respondedAt) : '',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [{ wch: 10 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'التوفّر');
  const safe = (tour?.name || 'البطولة').replace(/[\\/:*?"<>|]/g, '-');
  XLSX.writeFile(wb, `كشف-التوفّر-${safe}.xlsx`);
  toast(`صُدِّر ${rows.length} حكم`);
}

document.addEventListener('change', (e) => {
  if (e.target.id === 'ref-file-input' && e.target.files[0]) {
    handleRefFilePicked(e.target.files[0]);
  }
  if (e.target.id === 't-file-input' && e.target.files[0]) {
    handleTournamentsFilePicked(e.target.files[0]);
  }
});

function downloadRefereesTemplate() {
  if (typeof XLSX === 'undefined') return toast('مكتبة Excel لم تُحمَّل بعد');
  const ws = XLSX.utils.aoa_to_sheet([['اسم الحكم', 'رقم الحكم', 'رقم الجوال']]);
  ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الحكّام');
  XLSX.writeFile(wb, 'قالب-الحكّام.xlsx');
}

function downloadTournamentsTemplate() {
  if (typeof XLSX === 'undefined') return toast('مكتبة Excel لم تُحمَّل بعد');
  const ws = XLSX.utils.aoa_to_sheet([
    ['اسم البطولة', 'المدينة', 'الصالة', 'من (YYYY-MM-DD)', 'إلى (YYYY-MM-DD)'],
  ]);
  ws['!cols'] = [{ wch: 38 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'البطولات');
  XLSX.writeFile(wb, 'قالب-البطولات.xlsx');
}

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
  state.assignments = await api(`/assignments?tournamentId=${state.tournamentId}`);
  renderBoard();
}

/* ---------------- العرض ---------------- */
function renderTournaments() {
  const ul = $('#tournaments');
  const counter = $('#t-count');
  if (counter) counter.textContent = state.tournaments.length || '';
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
        <button class="edit" data-edit-tournament="${t.id}" title="تعديل">✎</button>
        <button class="del" data-del-tournament="${t.id}" title="حذف">×</button>
      </li>`
    )
    .join('');
}

function renderReferees() {
  const ul = $('#referees');
  const counter = $('#ref-count');
  if (!state.referees.length) {
    ul.innerHTML = '<li class="empty">أضف الحكّام لتتمكن من ترشيحهم.</li>';
    if (counter) counter.textContent = '';
    return;
  }
  const q = state.refQuery.trim().toLowerCase();
  const rows = q
    ? state.referees.filter((r) =>
        [r.name, r.phone, r.refereeNumber].some((v) => String(v || '').toLowerCase().includes(q))
      )
    : state.referees;

  if (counter) {
    counter.textContent = q
      ? `${rows.length} من ${state.referees.length}`
      : `${state.referees.length}`;
  }

  if (!rows.length) {
    ul.innerHTML = `<li class="empty">لا نتائج لـ "${q}".</li>`;
    return;
  }
  ul.innerHTML = rows
    .map(
      (r) => `<li>
        <span class="pick" title="${r.name} — ${r.phone}">
          ${r.refereeNumber ? '<b>' + r.refereeNumber + '</b>' : ''}
          <span class="nm">${r.name}</span>
          <span class="sub">${r.phone}</span>
        </span>
        <button class="edit" data-edit-referee="${r.id}" title="تعديل">✎</button>
        <button class="del" data-del-referee="${r.id}" title="حذف">×</button>
      </li>`
    )
    .join('');
}

/* ------------- لوحة التوفّر ------------- */
function actionsFor(r, a) {
  if (!a || ['declined', 'expired', 'cancelled', 'failed'].includes(a.status)) {
    return `<button class="btn small" data-nominate="${r.id}">إرسال التكليف</button>`;
  }
  if (['sent', 'pending'].includes(a.status)) {
    return [
      a.token ? `<button class="btn small" data-wa="${a.id}">واتساب</button>` : '',
      a.token ? `<button class="btn ghost small" data-copy="${a.id}">نسخ</button>` : '',
      `<button class="btn ghost small" data-mark="${a.id}" data-value="accepted">متوفّر</button>`,
      `<button class="btn danger small" data-mark="${a.id}" data-value="declined">اعتذار</button>`,
      `<button class="btn ghost small" data-cancel="${a.id}">إلغاء</button>`,
    ].filter(Boolean).join('');
  }
  if (a.status === 'accepted') {
    return `<button class="btn danger small" data-cancel="${a.id}">إلغاء الترشيح</button>`;
  }
  return `<button class="btn small" data-nominate="${r.id}">إرسال التكليف</button>`;
}

function statusCell(a) {
  if (!a) return '<div class="chip-status s-empty">لم يُرسل</div>';
  const icon =
    a.status === 'accepted' ? '✓ '
    : ['declined', 'expired'].includes(a.status) ? '✕ '
    : '';
  const when = a.respondedAt ? `<div class="muted" style="font-size:12px">${fmtDateTime(a.respondedAt)}</div>` : '';
  return `<div class="chip-status s-${a.status}">${icon}${STATUS[a.status] || a.status}</div>${when}`;
}

/** يصنّف حالة الحكم لأغراض التصفية والعدّاد */
function classify(a) {
  if (!a || ['cancelled', 'failed'].includes(a.status)) return 'empty';
  if (a.status === 'accepted') return 'accepted';
  if (['declined', 'expired'].includes(a.status)) return 'declined';
  return 'sent'; // pending أو sent
}

function filteredReferees() {
  const q = (state.availQuery || '').trim().toLowerCase();
  const stF = state.availStatus || 'الكل';
  return state.referees.filter((r) => {
    const cls = classify(assignmentFor(r.id));
    if (stF !== 'الكل' && cls !== stF) return false;
    if (q) {
      const hay = `${r.name} ${r.refereeNumber || ''} ${r.phone || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderBoard() {
  const board = $('#board');
  const tournament = state.tournaments.find((t) => t.id === state.tournamentId);

  $('#btn-nominate-all').hidden = !tournament || !state.referees.length;
  $('#btn-export').hidden = !tournament;
  const glBtn = $('#btn-group-link');
  glBtn.hidden = !tournament;
  if (tournament) glBtn.textContent = tournament.groupLink ? 'رابط القروب ✓' : 'رابط القروب';
  $('#board-toolbar').hidden = !tournament || !state.referees.length;
  $('#tally').hidden = !tournament;
  $('#board-title').textContent = tournament
    ? `${tournament.name}${tournament.startDate || tournament.endDate ? ' — ' + fmtPeriod(tournament) : ''}`
    : 'اختر بطولة للبدء';

  if (!tournament) {
    board.innerHTML = '<p class="empty">اختر بطولة من القائمة، أو أضف بطولة جديدة.</p>';
    return;
  }
  if (!state.referees.length) {
    board.innerHTML = '<p class="empty">أضف حكّاماً أولاً من القائمة الجانبية لترشيحهم.</p>';
    updateTally();
    return;
  }

  const filtered = filteredReferees();
  if (!filtered.length) {
    board.innerHTML = '<p class="empty">لا يوجد حكّام يطابقون التصفية.</p>';
    updateTally();
    return;
  }

  board.innerHTML = `<div class="mtblwrap">
    <table class="mtbl">
      <thead>
        <tr>
          <th>الرقم</th>
          <th class="wide">الحكم</th>
          <th>الجوال</th>
          <th class="wide">الحالة</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${filtered
          .map((r) => {
            const a = assignmentFor(r.id);
            const st = a?.status || 'empty';
            return `<tr data-state="${st}">
              <td>${r.refereeNumber ? '<b>' + r.refereeNumber + '</b>' : '—'}</td>
              <td class="wide"><b>${r.name}</b></td>
              <td class="tm">${r.phone || '—'}</td>
              <td class="wide ref">${statusCell(a)}</td>
              <td class="acts">${actionsFor(r, a)}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </div>`;

  updateTally();
}

function updateTally() {
  const counts = { accepted: 0, sent: 0, declined: 0, empty: 0 };
  for (const r of state.referees) {
    counts[classify(assignmentFor(r.id))]++;
  }
  $('#n-accepted').textContent = counts.accepted;
  $('#n-sent').textContent = counts.sent;
  $('#n-declined').textContent = counts.declined;
  $('#n-empty').textContent = counts.empty;
}

/* ------- التكليف الجماعي ------- */
async function nominateAll() {
  if (!state.tournamentId) return toast('اختر بطولة أولاً');
  const pending = state.referees.filter((r) => {
    const a = assignmentFor(r.id);
    return !a || !OPEN.includes(a.status);
  });
  if (!pending.length) return toast('كل الحكّام لديهم تكليف قائم');
  if (!confirm(`إرسال التكليف إلى ${pending.length} حكم؟`)) return;
  try {
    const r = await api('/assignments/bulk', {
      method: 'POST',
      body: { tournamentId: state.tournamentId, refereeIds: pending.map((x) => x.id) },
    });
    const parts = [`أُرسل ${r.sent} تكليف`];
    if (r.skipped) parts.push(`تُخطّي ${r.skipped}`);
    if (r.failed) parts.push(`فشل ${r.failed}`);
    toast(parts.join(' — '));
    await loadBoard();
  } catch (err) {
    toast(err.message);
  }
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

  const t = e.target.closest('[data-open], [data-tournament], [data-nominate], [data-cancel], [data-mark], [data-del-tournament], [data-edit-tournament], [data-del-referee], [data-edit-referee], [data-wa], [data-copy]');
  if (!t) return;

  try {
    if (t.dataset.open) {
      if (t.dataset.open === 'dlg-sb-tournaments') {
        openDialog(t.dataset.open);
        return loadScoreboardTournaments();
      }
      return openDialog(t.dataset.open);
    }

    if (t.dataset.tournament) {
      state.tournamentId = t.dataset.tournament;
      renderTournaments();
      return loadBoard();
    }

    if (t.dataset.nominate) {
      if (!state.tournamentId) return toast('اختر بطولة أولاً');
      await api('/assignments', {
        method: 'POST',
        body: { tournamentId: state.tournamentId, refereeId: t.dataset.nominate },
      });
      toast('أُرسل التكليف');
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

    if (t.dataset.cancel) {
      const a = state.assignments.find((x) => x.id === t.dataset.cancel);
      const who = a ? refereeName(a.refereeId) : 'الحكم';
      const warn =
        a?.status === 'accepted'
          ? `${who} أكّد توفّره. إلغاء الترشيح يعني أنه لن يُحسب ضمن المتوفّرين — تأكد من إبلاغه.\n\nمتأكد؟`
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

    if (t.dataset.editTournament) {
      const tr = state.tournaments.find((x) => x.id === t.dataset.editTournament);
      if (!tr) return;
      state.editTournamentId = tr.id;
      const f = document.querySelector('[data-form="edit-tournament"]');
      f.name.value = tr.name || '';
      f.city.value = tr.city || '';
      f.venue.value = tr.venue || '';
      f.startDate.value = (tr.startDate || '').slice(0, 10);
      f.endDate.value = (tr.endDate || '').slice(0, 10);
      return openDialog('dlg-edit-tournament');
    }

    if (t.dataset.delTournament) {
      if (!confirm('حذف البطولة وكل تكاليفها؟')) return;
      await api(`/tournaments/${t.dataset.delTournament}`, { method: 'DELETE' });
      if (state.tournamentId === t.dataset.delTournament) state.tournamentId = null;
      await loadSidebar();
      return loadBoard();
    }

    if (t.dataset.editReferee) {
      const r = state.referees.find((x) => x.id === t.dataset.editReferee);
      if (!r) return;
      state.editRefereeId = r.id;
      const f = document.querySelector('[data-form="edit-referee"]');
      f.name.value = r.name || '';
      f.refereeNumber.value = r.refereeNumber || '';
      f.phone.value = r.phone || '';
      return openDialog('dlg-edit-referee');
    }

    if (t.dataset.delReferee) {
      if (!confirm('حذف الحكم؟')) return;
      await api(`/referees/${t.dataset.delReferee}`, { method: 'DELETE' });
      await loadSidebar();
      return renderBoard();
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
    if (kind === 'edit-tournament') {
      if (!state.editTournamentId) return toast('لم تُحدَّد البطولة');
      await api(`/tournaments/${state.editTournamentId}`, { method: 'PATCH', body });
      await loadSidebar();
      renderBoard();
      toast('حُفظ التعديل');
    }
    if (kind === 'tournament-group') {
      if (!state.tournamentId) return toast('اختر بطولة أولاً');
      await api(`/tournaments/${state.tournamentId}`, {
        method: 'PATCH',
        body: { groupLink: body.groupLink || '' },
      });
      await loadSidebar();
      renderBoard();
      toast(body.groupLink ? 'حُفظ رابط القروب' : 'أُزيل رابط القروب');
    }
    if (kind === 'referee') {
      await api('/referees', { method: 'POST', body });
      await loadSidebar();
      renderBoard();
      toast('أُضيف الحكم');
    }
    if (kind === 'edit-referee') {
      if (!state.editRefereeId) return toast('لم يُحدَّد الحكم');
      await api(`/referees/${state.editRefereeId}`, { method: 'PATCH', body });
      await loadSidebar();
      renderBoard();
      toast('حُفظ التعديل');
    }
    if (kind === 'import-referees') {
      const r = await api('/referees/import', { method: 'POST', body: { text: body.text } });
      await loadSidebar();
      renderBoard();
      toast(importMessage('حكم', r));
    }
    if (kind === 'import-tournaments') {
      const r = await api('/tournaments/import', { method: 'POST', body: { text: body.text } });
      await loadSidebar();
      toast(importMessage('بطولة', r));
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
      renderBoard();
      toast(importMessage('حكم', r));
    }
    if (kind === 'tournaments-file') {
      if (!state.tFileRows?.length) {
        toast('لم يُحدَّد ملف صالح');
        return;
      }
      const text = state.tFileRows
        .map((r) => [r.name, r.city, r.venue, r.startDate, r.endDate].join(','))
        .join('\n');
      const r = await api('/tournaments/import', { method: 'POST', body: { text } });
      await loadSidebar();
      toast(importMessage('بطولة', r));
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
