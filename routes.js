import express from 'express';
import { store, newId } from './store.js';
import * as wa from './whatsapp.js';

export const router = express.Router();

const now = () => new Date().toISOString();
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

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
    whatsapp: wa.isLive() ? 'live' : 'simulation',
    storage: store.label,
    template: wa.TEMPLATE_NAME,
  });
});

/* ------------------------- الحكّام ------------------------- */
router.get('/referees', async (req, res) => {
  const rows = await store.list('referees');
  rows.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  res.json(rows);
});

router.post('/referees', async (req, res) => {
  const { name, phone, city = '', level = '' } = req.body || {};
  if (!name || !phone) return bad(res, 'الاسم ورقم الجوال مطلوبان');
  const row = {
    id: newId(),
    name: String(name).trim(),
    phone: wa.normalizePhone(phone),
    city: String(city).trim(),
    level: String(level).trim(),
    active: true,
    createdAt: now(),
  };
  res.status(201).json(await store.insert('referees', row));
});

router.patch('/referees/:id', async (req, res) => {
  const patch = {};
  for (const k of ['name', 'city', 'level', 'active']) {
    if (k in (req.body || {})) patch[k] = req.body[k];
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
  for (const [name, phone, city = '', level = ''] of rows) {
    if (!name || !phone) {
      skipped.push({ line: [name, phone].join(','), reason: 'الاسم أو الجوال ناقص' });
      continue;
    }
    try {
      const row = {
        id: newId(),
        name: name.trim(),
        phone: wa.normalizePhone(phone),
        city: city.trim(),
        level: level.trim(),
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
    simulated: Boolean(sent.simulated),
    error: null,
  });
}

router.post('/assignments', async (req, res) => {
  const { matchId, refereeId, role = 'حكم مباراة' } = req.body || {};
  if (!matchId || !refereeId) return bad(res, 'المباراة والحكم مطلوبان');

  const match = await store.get('matches', matchId);
  if (!match) return bad(res, 'المباراة غير موجودة', 404);

  const existing = await store.list('assignments', { matchId });
  if (existing.some((a) => ['sent', 'accepted'].includes(a.status))) {
    return bad(res, 'يوجد تكليف قائم لهذه المباراة — ألغِه أولاً');
  }

  const assignment = await store.insert('assignments', {
    id: newId(),
    matchId,
    refereeId,
    tournamentId: match.tournamentId,
    role,
    status: 'pending',
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
