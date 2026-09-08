import crypto from 'node:crypto';
import express from 'express';

const COOKIE = 'tahkeem_session';
const MAX_AGE_DAYS = 30;

const password = () => process.env.ADMIN_PASSWORD || '';
const secret = () => process.env.SESSION_SECRET || password() || 'dev';

/** القفل مفعّل فقط إذا ضُبطت كلمة المرور — بدونها يعمل النظام مفتوحاً للتطوير المحلي */
export const isLocked = () => Boolean(password());

function sign(expiry) {
  const mac = crypto.createHmac('sha256', secret()).update(String(expiry)).digest('hex');
  return `${expiry}.${mac}`;
}

function isValid(token) {
  if (!token) return false;
  const [expiry, mac] = String(token).split('.');
  if (!expiry || !mac) return false;
  if (Number(expiry) < Date.now()) return false;
  const expected = crypto.createHmac('sha256', secret()).update(expiry).digest('hex');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/** يقارن كلمتي المرور بزمن ثابت لمنع تخمين الحروف */
function samePassword(input) {
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(password());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- تحديد محاولات الدخول لمنع التخمين ---------- */
const MAX_TRIES = 8;
const LOCKOUT_MS = 15 * 60_000;
const tries = new Map();

const clientKey = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';

function throttle(key) {
  const rec = tries.get(key);
  if (!rec) return null;
  if (Date.now() > rec.until) {
    tries.delete(key);
    return null;
  }
  return rec.count >= MAX_TRIES ? Math.ceil((rec.until - Date.now()) / 60_000) : null;
}

function noteFailure(key) {
  const rec = tries.get(key) || { count: 0, until: 0 };
  rec.count += 1;
  rec.until = Date.now() + LOCKOUT_MS;
  tries.set(key, rec);
}

// تنظيف دوري حتى لا تنمو الخريطة بلا حد
setInterval(() => {
  const t = Date.now();
  for (const [k, v] of tries) if (t > v.until) tries.delete(k);
}, 10 * 60_000).unref();

export const authRoutes = express.Router();

authRoutes.post('/login', (req, res) => {
  if (!isLocked()) return res.json({ ok: true });

  const key = clientKey(req);
  const waitMinutes = throttle(key);
  if (waitMinutes) {
    return res.status(429).json({
      error: `محاولات كثيرة — انتظر ${waitMinutes} دقيقة ثم أعد المحاولة`,
    });
  }

  if (!samePassword(req.body?.password)) {
    noteFailure(key);
    return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  }
  tries.delete(key);
  const expiry = Date.now() + MAX_AGE_DAYS * 86400000;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${sign(expiry)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
      MAX_AGE_DAYS * 86400
    }${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
  res.json({ ok: true });
});

authRoutes.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
  res.json({ ok: true });
});

/** الحارس — يوضع بعد الويبهوك وقبل بقية المسارات */
export function guard(req, res, next) {
  if (!isLocked()) return next();
  if (isValid(readCookie(req, COOKIE))) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'يلزم تسجيل الدخول' });
  }
  res.redirect('/login');
}
