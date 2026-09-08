const $ = (sel) => document.querySelector(sel);

const state = {
  tournaments: [],
  referees: [],
  matches: [],
  assignments: [],
  tournamentId: null,
  assignMatchId: null,
};

const STATUS = {
  pending: 'قيد الإرسال',
  sent: 'بانتظار الرد',
  accepted: 'قبل التكليف',
  declined: 'اعتذر',
  cancelled: 'ملغى',
  failed: 'فشل الإرسال',
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
  name: ['الاسم', 'الحكم', 'name'],
  phone: ['رقم الجوال', 'الجوال', 'الهاتف', 'phone', 'mobile'],
  city: ['المدينة', 'city'],
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
        const required = kind === 'referee' ? ['name', 'phone'] : ['clubA', 'clubB'];
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
            <div class="teams">${r.name}</div>
            <div class="meta">${[r.phone, r.city].filter(Boolean).join(' · ')}</div>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    box.innerHTML = `<p class="empty">خطأ في الملف: ${err.message}</p>`;
    state.refFileRows = [];
  }
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
  const data = [['النادي الأول', 'النادي الثاني', 'الموعد', 'الطاولة', 'الدور', 'الفئة']];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 8 }, { wch: 14 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المباريات');
  XLSX.writeFile(wb, 'قالب-المباريات.xlsx');
}

function downloadRefereesTemplate() {
  if (typeof XLSX === 'undefined') return toast('مكتبة Excel لم تُحمَّل بعد');
  const data = [['الاسم', 'رقم الجوال', 'المدينة']];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الحكّام');
  XLSX.writeFile(wb, 'قالب-الحكّام.xlsx');
}

const liveAssignment = (matchId) =>
  state.assignments.find(
    (a) => a.matchId === matchId && ['pending', 'sent', 'accepted'].includes(a.status)
  ) || state.assignments.find((a) => a.matchId === matchId && a.status === 'declined');

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
  ul.innerHTML = state.referees
    .map(
      (r) => `<li>
        <span class="pick">${r.name}
          <span class="sub">${r.phone}${r.city ? ' — ' + r.city : ''}</span>
        </span>
        <button class="del" data-del-referee="${r.id}" title="حذف">×</button>
      </li>`
    )
    .join('');
}

function renderBoard() {
  const board = $('#board');
  const tournament = state.tournaments.find((t) => t.id === state.tournamentId);

  $('#btn-add-match').hidden = !tournament;
  $('#btn-sb-import').hidden = !tournament;
  $('#btn-file-import').hidden = !tournament;
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

  board.innerHTML = state.matches
    .map((m) => {
      const a = liveAssignment(m.id);
      const st = a?.status || 'empty';
      const facts = [
        fmtTime(m.startTime),
        m.table ? `طاولة ${m.table}` : '',
        m.round,
        m.category,
      ]
        .filter(Boolean)
        .join(' · ');

      const status = a
        ? `<div class="status">${refereeName(a.refereeId)} — <b>${STATUS[a.status]}</b>${
            a.simulated ? ' (تجريبي)' : ''
          }${a.error ? `<br><span class="facts">${a.error}</span>` : ''}</div>`
        : '<div class="status">لم يُكلَّف حكم بعد</div>';

      const actions = a
        ? ['sent', 'pending'].includes(a.status)
          ? `<button class="btn ghost small" data-mark="${a.id}" data-value="accepted">تسجيل قبول</button>
             <button class="btn danger small" data-mark="${a.id}" data-value="declined">تسجيل اعتذار</button>
             <button class="btn ghost small" data-cancel="${a.id}">إلغاء التكليف</button>`
          : `<button class="btn small" data-assign="${m.id}">تكليف حكم آخر</button>`
        : `<button class="btn small" data-assign="${m.id}">تكليف حكم</button>`;

      return `<article class="match" data-state="${st}">
        <div>
          <div class="players">${m.clubA || m.playerA || ''} × ${m.clubB || m.playerB || ''}</div>
          <div class="facts">${facts}</div>
          ${status}
        </div>
        <div class="actions">${actions}
          <button class="btn ghost small" data-del-match="${m.id}">حذف المباراة</button>
        </div>
      </article>`;
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
    else if (a.status === 'declined') counts.declined++;
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

  const t = e.target.closest('[data-open], [data-tournament], [data-assign], [data-cancel], [data-mark], [data-del-tournament], [data-del-referee], [data-del-match]');
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

    if (t.dataset.assign) {
      if (!state.referees.length) return toast('أضف حكّاماً أولاً');
      state.assignMatchId = t.dataset.assign;
      const m = state.matches.find((x) => x.id === state.assignMatchId);
      const teams = `${m.clubA || m.playerA || ''} × ${m.clubB || m.playerB || ''}`;
      $('#assign-match').textContent = `${teams} — ${fmtTime(m.startTime)}`;
      $('#assign-select').innerHTML = state.referees
        .map((r) => `<option value="${r.id}">${r.name} — ${r.phone}</option>`)
        .join('');
      return openDialog('dlg-assign');
    }

    if (t.dataset.cancel) {
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
    if (kind === 'assign') {
      await api('/assignments', {
        method: 'POST',
        body: { matchId: state.assignMatchId, refereeId: body.refereeId },
      });
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
        .map((r) => [r.name, r.phone, r.city].join(','))
        .join('\n');
      const r = await api('/referees/import', { method: 'POST', body: { text } });
      await loadSidebar();
      toast(importMessage('حكم', r));
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
