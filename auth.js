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

export const authRoutes = express.Router();

authRoutes.post('/login', (req, res) => {
  if (!isLocked()) return res.json({ ok: true });
  if (!samePassword(req.body?.password)) {
    return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  }
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
