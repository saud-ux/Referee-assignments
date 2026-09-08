import express from 'express';
import crypto from 'node:crypto';
import { store, newId } from './store.js';
import * as wa from './whatsapp.js';
import * as scoreboard from './scoreboard.js';
import * as page from './respond.js';

export const router = express.Router();

/** رمز سري غير قابل للتخمين يُستخدم في رابط رد الحكم */
const newToken = () => crypto.randomBytes(24).toString('base64url');

const now = () => new Date().toISOString();
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

/** المدة التي تُعتبر خلالها مباراتان متعارضتين على نفس الحكم */
const CONFLICT_WINDOW_MS = Number(process.env.CONFLICT_WINDOW_MINUTES || 90) * 60_000;
/** مهلة انتظار رد الحكم قبل اعتبار التكليف منتهياً */
const RESPONSE_TIMEOUT_MS = Number(process.env.RESPONSE_TIMEOUT_HOURS || 6) * 3_600_000;

const OPEN_STATUSES = ['pending', 'sent', 'accepted'];

/** يبحث عن مباراة أخرى مكلّف بها نفس الحكم ضمن نافذة التعارض */
async function findConflict(refereeId, match) {
  if (!match?.startTime) return null;
  const target = new Date(match.startTime).getTime();
  if (Number.isNaN(target)) return null;

  const mine = (await store.list('assignments', { refereeId })).filter(
    (a) => OPEN_STATUSES.includes(a.status) && a.matchId !== match.id
  );

  for (const a of mine) {
    const other = await store.get('matches', a.matchId);
    if (!other?.startTime) continue;
    const t = new Date(other.startTime).getTime();
    if (Number.isNaN(t)) continue;
    if (Math.abs(t - target) < CONFLICT_WINDOW_MS) return { assignment: a, match: other };
  }
  return null;
}

/** يحوّل التكاليف التي تجاوزت مهلة الرد إلى الحالة "expired" */
export async function sweepExpired() {
  const cutoff = Date.now() - RESPONSE_TIMEOUT_MS;
  const rows = await store.list('assignments', {});
  const expired = [];
  for (const a of rows) {
    if (a.status !== 'sent' || !a.sentAt) continue;
    const t = new Date(a.sentAt).getTime();
    if (Number.isNaN(t) || t > cutoff) continue;
    await store.update('assignments', a.id, { status: 'expired', respondedAt: now() });
    expired.push(a.id);
  }
  if (expired.length) console.log(`[مهلة] انتهت مهلة ${expired.length} تكليف`);
  return expired.length;
}

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: process.env.TZ || 'Asia/Riyadh',
  }).format(d);
};

/* ------------------------- الحالة العامة ------------------------- */
router.get('/status', (req, res) => {
  res.json({
    delivery: wa.isLive() ? 'whatsapp تلقائي' : 'رابط الرد',
    storage: store.label,
  });
});

/* ------------------------- الحكّام ------------------------- */
router.get('/referees', async (req, res) => {
  const rows = await store.list('referees');
  rows.sort((a, b) => {
    // نرتّب برقم الحكم رقمياً إن وُجد، وإلا بالاسم أبجدياً
    const na = Number(a.refereeNumber);
    const nb = Number(b.refereeNumber);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    if (!Number.isNaN(na)) return -1;
    if (!Number.isNaN(nb)) return 1;
    return a.name.localeCompare(b.name, 'ar');
  });
  res.json(rows);
});

router.post('/referees', async (req, res) => {
  const { name, phone, refereeNumber = '' } = req.body || {};
  if (!name || !phone || !String(refereeNumber).trim()) {
    return bad(res, 'الاسم ورقم الحكم ورقم الجوال جميعها مطلوبة');
  }
  const row = {
    id: newId(),
    name: String(name).trim(),
    refereeNumber: String(refereeNumber).trim(),
    phone: wa.normalizePhone(phone),
    active: true,
    createdAt: now(),
  };
  res.status(201).json(await store.insert('referees', row));
});

router.patch('/referees/:id', async (req, res) => {
  const patch = {};
  for (const k of ['name', 'active', 'refereeNumber']) {
    if (k in (req.body || {})) patch[k] = String(req.body[k] ?? '').trim();
  }
  if (req.body?.phone) patch.phone = wa.normalizePhone(req.body.phone);
  const row = await store.update('referees', req.params.id, patch);
  row ? res.json(row) : bad(res, 'الحكم غير موجود', 404);
});

router.delete('/referees/:id', async (req, res) => {
  await store.remove('referees', req.params.id);
  res.status(204).end();
});

function parseImportLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s*[,،\t]\s*/));
}

router.post('/referees/import', async (req, res) => {
  const rows = parseImportLines(req.body?.text);
  const added = [];
  const skipped = [];
  for (const [name, refereeNumber, phone] of rows) {
    if (!name || !refereeNumber || !phone) {
      skipped.push({ line: [name, refereeNumber, phone].join(','), reason: 'حقل ناقص' });
      continue;
    }
    try {
      const row = {
        id: newId(),
        name: name.trim(),
        refereeNumber: String(refereeNumber).trim(),
        phone: wa.normalizePhone(phone),
        active: true,
        createdAt: now(),
      };
      added.push(await store.insert('referees', row));
    } catch (err) {
      skipped.push({ line: name, reason: err.message });
    }
  }
  res.status(201).json({ added: added.length, skipped });
});

/* ------------------------- البطولات ------------------------- */
router.get('/tournaments', async (req, res) => {
  const rows = await store.list('tournaments');
  rows.sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
  res.json(rows);
});

router.post('/tournaments', async (req, res) => {
  const { name, city = '', venue = '', startDate = '', endDate = '' } = req.body || {};
  if (!name) return bad(res, 'اسم البطولة مطلوب');
  const row = {
    id: newId(),
    name: String(name).trim(),
    city: String(city).trim(),
    venue: String(venue).trim(),
    startDate,
    endDate,
    createdAt: now(),
  };
  res.status(201).json(await store.insert('tournaments', row));
});

router.post('/tournaments/import', async (req, res) => {
  const rows = parseImportLines(req.body?.text);
  const added = [];
  const skipped = [];
  for (const [name, city = '', venue = '', startDate = '', endDate = ''] of rows) {
    if (!name) {
      skipped.push({ line: '', reason: 'اسم البطولة ناقص' });
      continue;
    }
    const row = {
      id: newId(),
      name: name.trim(),
      city: city.trim(),
      venue: venue.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      createdAt: now(),
    };
    added.push(await store.insert('tournaments', row));
  }
  res.status(201).json({ added: added.length, skipped });
});

router.delete('/tournaments/:id', async (req, res) => {
  const id = req.params.id;
  for (const m of await store.list('matches', { tournamentId: id })) {
    await store.remove('matches', m.id);
  }
  for (const a of await store.list('assignments', { tournamentId: id })) {
    await store.remove('assignments', a.id);
  }
  await store.remove('tournaments', id);
  res.status(204).end();
});

/* ------------------------- المباريات ------------------------- */
router.get('/matches', async (req, res) => {
  const rows = await store.list('matches', { tournamentId: req.query.tournamentId });
  rows.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  res.json(rows);
});

router.post('/matches', async (req, res) => {
  const body = req.body || {};
  const clubA = body.clubA ?? body.playerA;
  const clubB = body.clubB ?? body.playerB;
  const { tournamentId, startTime, table = '', round = '', category = '' } = body;
  if (!tournamentId || !clubA || !clubB) {
    return bad(res, 'البطولة والناديان مطلوبان');
  }
  const row = {
    id: newId(),
    tournamentId,
    clubA: String(clubA).trim(),
    clubB: String(clubB).trim(),
    startTime: startTime || '',
    table: String(table).trim(),
    round: String(round).trim(),
    category: String(category).trim(),
    createdAt: now(),
  };
  res.status(201).json(await store.insert('matches', row));
});

router.get('/scoreboard/preview', async (_req, res) => {
  try {
    const rows = await scoreboard.fetchScoreboardMatches();
    res.json({ ...scoreboard.scoreboardStatus(), count: rows.length, rows });
  } catch (err) {
    bad(res, err.message);
  }
});

router.get('/scoreboard/tournaments', async (_req, res) => {
  try {
    const rows = await scoreboard.fetchScoreboardTournaments();
    const existing = new Set((await store.list('tournaments')).map((t) => t.name));
    res.json(rows.map((r) => ({ ...r, exists: existing.has(r.name) })));
  } catch (err) {
    bad(res, err.message);
  }
});

router.post('/scoreboard/tournaments/import', async (req, res) => {
  const names = Array.isArray(req.body?.names)
    ? req.body.names.map((s) => String(s).trim()).filter(Boolean)
    : [];
  if (!names.length) return bad(res, 'اختر بطولة واحدة على الأقل');
  const existing = new Set((await store.list('tournaments')).map((t) => t.name));
  const added = [];
  const skipped = [];
  for (const name of names) {
    if (existing.has(name)) {
      skipped.push({ line: name, reason: 'موجودة' });
      continue;
    }
    added.push(
      await store.insert('tournaments', {
        id: newId(),
        name,
        city: '',
        venue: '',
        startDate: '',
        endDate: '',
        source: 'scoreboard',
        createdAt: now(),
      })
    );
  }
  res.status(201).json({ added: added.length, skipped });
});

router.post('/scoreboard/import', async (req, res) => {
  const { tournamentId, keys } = req.body || {};
  if (!tournamentId) return bad(res, 'اختر البطولة أولاً');
  const tournament = await store.get('tournaments', tournamentId);
  if (!tournament) return bad(res, 'البطولة غير موجودة', 404);

  let rows;
  try {
    rows = await scoreboard.fetchScoreboardMatches();
  } catch (err) {
    return bad(res, err.message, 502);
  }

  const existing = await store.list('matches', { tournamentId });
  const existingKeys = new Set(existing.map((m) => m.sourceKey).filter(Boolean));
  const filter = Array.isArray(keys) && keys.length ? new Set(keys) : null;

  const added = [];
  const skipped = [];

  for (const row of rows) {
    if (filter && !filter.has(row.sourceKey)) continue;
    if (existingKeys.has(row.sourceKey)) {
      skipped.push({ line: row.sourceKey, reason: 'موجودة سابقاً' });
      continue;
    }
    const doc = {
      id: newId(),
      tournamentId,
      clubA: row.clubA,
      clubB: row.clubB,
      startTime: '',
      table: '',
      round: row.number != null ? `المباراة ${row.number}` : '',
      category: '',
      sourceKey: row.sourceKey,
      source: 'scoreboard',
      createdAt: now(),
    };
    added.push(await store.insert('matches', doc));
  }

  res.status(201).json({ added: added.length, skipped });
});

router.post('/matches/import', async (req, res) => {
  const { tournamentId, text } = req.body || {};
  if (!tournamentId) return bad(res, 'اختر البطولة قبل الاستيراد');
  const rows = parseImportLines(text);
  const added = [];
  const skipped = [];
  for (const [clubA, clubB, startTime = '', table = '', round = '', category = ''] of rows) {
    if (!clubA || !clubB) {
      skipped.push({ line: [clubA, clubB].join(','), reason: 'الناديان مطلوبان' });
      continue;
    }
    const row = {
      id: newId(),
      tournamentId,
      clubA: clubA.trim(),
      clubB: clubB.trim(),
      startTime: startTime.trim(),
      table: table.trim(),
      round: round.trim(),
      category: category.trim(),
      createdAt: now(),
    };
    added.push(await store.insert('matches', row));
  }
  res.status(201).json({ added: added.length, skipped });
});

router.patch('/matches/:id', async (req, res) => {
  const patch = {};
  for (const k of ['clubA', 'clubB', 'startTime', 'table', 'round', 'category']) {
    if (k in (req.body || {})) patch[k] = String(req.body[k] ?? '').trim();
  }
  if (!Object.keys(patch).length) return bad(res, 'لا يوجد ما يُحدَّث');
  if ('clubA' in patch && !patch.clubA) return bad(res, 'اسم النادي الأول مطلوب');
  if ('clubB' in patch && !patch.clubB) return bad(res, 'اسم النادي الثاني مطلوب');
  const row = await store.update('matches', req.params.id, patch);
  row ? res.json(row) : bad(res, 'المباراة غير موجودة', 404);
});

router.delete('/matches/:id', async (req, res) => {
  for (const a of await store.list('assignments', { matchId: req.params.id })) {
    await store.remove('assignments', a.id);
  }
  await store.remove('matches', req.params.id);
  res.status(204).end();
});

/* ------------------------- التكاليف ------------------------- */
router.get('/assignments', async (req, res) => {
  const where = {};
  if (req.query.tournamentId) where.tournamentId = req.query.tournamentId;
  if (req.query.matchId) where.matchId = req.query.matchId;
  const rows = await store.list('assignments', where);
  rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json(rows);
});

async function buildParams(assignment) {
  const [referee, match, tournament] = await Promise.all([
    store.get('referees', assignment.refereeId),
    store.get('matches', assignment.matchId),
    store.get('tournaments', assignment.tournamentId),
  ]);
  return {
    referee,
    match,
    tournament,
    params: [
      referee?.name || 'الحكم',
      tournament?.name || 'البطولة',
      `${match?.clubA || match?.playerA || '—'} × ${match?.clubB || match?.playerB || '—'}`,
      fmtDateTime(match?.startTime),
      tournament?.venue || tournament?.city || '—',
      match?.table || '—',
    ],
  };
}

async function dispatch(assignment) {
  const { referee, params } = await buildParams(assignment);
  if (!referee) throw new Error('الحكم غير موجود');
  const sent = await wa.sendAssignment({
    to: referee.phone,
    assignmentId: assignment.id,
    params,
  });
  return store.update('assignments', assignment.id, {
    status: 'sent',
    sentAt: now(),
    waMessageId: sent.messageId,
    autoSent: Boolean(sent.autoSent),
    error: null,
  });
}

router.post('/assignments', async (req, res) => {
  const { matchId, refereeId, role = 'حكم مباراة', force = false } = req.body || {};
  if (!matchId || !refereeId) return bad(res, 'المباراة والحكم مطلوبان');

  const match = await store.get('matches', matchId);
  if (!match) return bad(res, 'المباراة غير موجودة', 404);

  const existing = await store.list('assignments', { matchId });
  if (existing.some((a) => ['sent', 'accepted'].includes(a.status))) {
    return bad(res, 'يوجد تكليف قائم لهذه المباراة — ألغِه أولاً');
  }

  if (!force) {
    const clash = await findConflict(refereeId, match);
    if (clash) {
      const other = clash.match;
      const label = `${other.clubA || other.playerA || '—'} × ${other.clubB || other.playerB || '—'}`;
      return res.status(409).json({
        error: `الحكم مكلّف بمباراة أخرى قريبة زمنياً: ${label} — ${fmtDateTime(other.startTime)}`,
        conflict: true,
      });
    }
  }

  const assignment = await store.insert('assignments', {
    id: newId(),
    matchId,
    refereeId,
    tournamentId: match.tournamentId,
    role,
    status: 'pending',
    token: newToken(),
    createdAt: now(),
    sentAt: null,
    respondedAt: null,
    waMessageId: null,
    error: null,
  });

  try {
    res.status(201).json(await dispatch(assignment));
  } catch (err) {
    const failed = await store.update('assignments', assignment.id, {
      status: 'failed',
      error: err.message,
    });
    res.status(502).json({ ...failed, error: err.message });
  }
});

router.post('/assignments/:id/resend', async (req, res) => {
  const assignment = await store.get('assignments', req.params.id);
  if (!assignment) return bad(res, 'التكليف غير موجود', 404);
  try {
    res.json(await dispatch(assignment));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/assignments/:id/cancel', async (req, res) => {
  const row = await store.update('assignments', req.params.id, {
    status: 'cancelled',
    respondedAt: now(),
  });
  row ? res.json(row) : bad(res, 'التكليف غير موجود', 404);
});

/** تسجيل رد يدوي — للاختبار قبل تفعيل واتساب، أو إذا رد الحكم بالهاتف */
router.post('/assignments/:id/mark', async (req, res) => {
  const status = req.body?.status;
  if (!['accepted', 'declined'].includes(status)) return bad(res, 'حالة غير صالحة');
  const row = await store.update('assignments', req.params.id, {
    status,
    respondedAt: now(),
    responseVia: 'يدوي',
  });
  row ? res.json(row) : bad(res, 'التكليف غير موجود', 404);
});

/* ------------------ صفحة رد الحكم عبر رابط خاص ------------------ */
export const respondRoutes = express.Router();
respondRoutes.use(express.urlencoded({ extended: false }));

/** يجد التكليف من رمزه ويجمع بياناته الكاملة */
async function loadByToken(token) {
  if (!token) return null;
  const all = await store.list('assignments', {});
  const assignment = all.find((a) => a.token === token);
  if (!assignment) return null;
  const [referee, match, tournament] = await Promise.all([
    store.get('referees', assignment.refereeId),
    store.get('matches', assignment.matchId),
    store.get('tournaments', assignment.tournamentId),
  ]);
  return { assignment, referee, match, tournament };
}

const DEAD_REASONS = {
  cancelled: 'هذا التكليف أُلغي.',
  expired: 'انتهت مهلة الرد على هذا التكليف.',
  failed: 'هذا التكليف غير نشط.',
};

respondRoutes.get('/:token', async (req, res) => {
  const data = await loadByToken(req.params.token);
  if (!data) return res.status(404).send(page.deadPage('الرابط غير صحيح أو انتهت صلاحيته.'));

  const { assignment, match } = data;
  if (['accepted', 'declined'].includes(assignment.status)) {
    return res.send(page.donePage({ status: assignment.status, match, alreadyAnswered: true }));
  }
  if (DEAD_REASONS[assignment.status]) {
    return res.status(410).send(page.deadPage(DEAD_REASONS[assignment.status]));
  }
  res.send(page.askPage({ ...data, token: req.params.token }));
});

respondRoutes.post('/:token', async (req, res) => {
  const data = await loadByToken(req.params.token);
  if (!data) return res.status(404).send(page.deadPage('الرابط غير صحيح أو انتهت صلاحيته.'));

  const { assignment, match } = data;
  if (['accepted', 'declined'].includes(assignment.status)) {
    return res.send(page.donePage({ status: assignment.status, match, alreadyAnswered: true }));
  }
  if (DEAD_REASONS[assignment.status]) {
    return res.status(410).send(page.deadPage(DEAD_REASONS[assignment.status]));
  }

  const action = req.body?.action;
  const status = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : null;
  if (!status) return res.status(400).send(page.deadPage('لم يُحدَّد الرد.'));

  await store.update('assignments', assignment.id, {
    status,
    respondedAt: now(),
    responseVia: 'رابط',
  });
  res.send(page.donePage({ status, match }));
});

/* ------------------------- ويبهوك واتساب ------------------------- */
export const webhook = express.Router();

webhook.get('/', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === verifyToken
  ) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

webhook.post('/', async (req, res) => {
  if (!wa.verifySignature(req.rawBody, req.get('x-hub-signature-256'))) {
    return res.sendStatus(401);
  }
  res.sendStatus(200); // ميتا تتوقع رداً فورياً

  try {
    for (const reply of wa.parseButtonReplies(req.body)) {
      const [action, assignmentId] = String(reply.payload).split(':');
      const status =
        action === 'ACCEPT' ? 'accepted' : action === 'DECLINE' ? 'declined' : null;
      if (!status || !assignmentId) continue;

      const assignment = await store.get('assignments', assignmentId);
      if (!assignment || ['accepted', 'declined'].includes(assignment.status)) continue;

      await store.update('assignments', assignmentId, {
        status,
        respondedAt: new Date(reply.timestamp).toISOString(),
        responseVia: 'واتساب',
      });

      // تأكيد للحكم — مجاني لأنه داخل نافذة الـ24 ساعة
      const { referee, match } = await buildParams(assignment);
      const line = `${match?.clubA || match?.playerA || ''} × ${match?.clubB || match?.playerB || ''}`;
      await wa.sendText(
        referee.phone,
        status === 'accepted'
          ? `تم تسجيل قبولك للتكليف: ${line}. بالتوفيق.`
          : `تم تسجيل اعتذارك عن التكليف: ${line}. شكراً لإبلاغنا.`
      );
    }
  } catch (err) {
    console.error('[webhook] خطأ في المعالجة:', err);
  }
});
