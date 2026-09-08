import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initStore } from './store.js';
import { router, webhook } from './routes.js';
import { authRoutes, guard, isLocked } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);

// نحتفظ بالجسم الخام للتحقق من توقيع ميتا
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// الويبهوك قبل الحارس — ميتا تناديه بدون تسجيل دخول
app.use('/webhook', webhook);

// نبض خارجي لإبقاء الخدمة مستيقظة على استضافات النوم التلقائي
app.get('/health', (_req, res) => res.type('text').send('ok'));

// صفحة الدخول ومسارات الجلسة
app.use('/auth', authRoutes);
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/styles.css', (_req, res) => res.sendFile(path.join(__dirname, 'styles.css')));

// من هنا فصاعداً يلزم تسجيل الدخول
app.use(guard);

app.use('/api', router);

// كل الملفات في الجذر، فنقدّم ملفات الواجهة بالاسم
// ولا نفتح المجلد كاملاً حتى لا تنكشف ملفات الخادم
const PUBLIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/app.js': 'app.js',
};

for (const [route, file] of Object.entries(PUBLIC_FILES)) {
  app.get(route, (_req, res) => res.sendFile(path.join(__dirname, file)));
}

app.use((_req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'خطأ داخلي في الخادم' });
});

const PORT = process.env.PORT || 3000;
await initStore();
app.listen(PORT, () => {
  console.log(`النظام يعمل على المنفذ ${PORT}`);
  if (!isLocked()) console.warn('[تنبيه] ADMIN_PASSWORD غير مضبوطة — اللوحة مفتوحة للجميع');
});
