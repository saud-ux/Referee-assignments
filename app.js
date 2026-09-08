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

const fmtTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso))
    : 'الموعد غير محدد';

const refereeName = (id) => state.referees.find((r) => r.id === id)?.name || 'حكم محذوف';

const liveAssignment = (matchId) =>
  state.assignments.find(
    (a) => a.matchId === matchId && ['pending', 'sent', 'accepted'].includes(a.status)
  ) || state.assignments.find((a) => a.matchId === matchId && a.status === 'declined');

/* ---------------- التحميل ---------------- */
async function loadStatus() {
  const s = await api('/status');
  const wa = $('#chip-wa');
  wa.textContent = s.whatsapp === 'live' ? 'واتساب مفعّل' : 'وضع تجريبي — بدون إرسال';
  wa.classList.toggle('live', s.whatsapp === 'live');
  $('#chip-store').textContent = s.storage;
}

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
          <span class="sub">${r.phone}${r.level ? ' — ' + r.level : ''}</span>
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
          <div class="players">${m.playerA} × ${m.playerB}</div>
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
  const t = e.target.closest('[data-open], [data-tournament], [data-assign], [data-cancel], [data-mark], [data-del-tournament], [data-del-referee], [data-del-match]');
  if (!t) return;

  try {
    if (t.dataset.open) {
      if (t.dataset.open === 'dlg-match' && !state.tournamentId) {
        return toast('اختر بطولة أولاً');
      }
      return $('#' + t.dataset.open).showModal();
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
      $('#assign-match').textContent = `${m.playerA} × ${m.playerB} — ${fmtTime(m.startTime)}`;
      $('#assign-select').innerHTML = state.referees
        .map((r) => `<option value="${r.id}">${r.name} — ${r.phone}</option>`)
        .join('');
      return $('#dlg-assign').showModal();
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
    form.reset();
  } catch (err) {
    toast(err.message);
  }
});

/* ---------------- التشغيل ---------------- */
loadStatus();
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
