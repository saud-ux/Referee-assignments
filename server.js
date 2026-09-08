import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initStore } from './store.js';
import { router, webhook, respondRoutes, sweepExpired } from './routes.js';

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

// صفحة رد الحكم — عامة، يحميها الرمز السري في الرابط وحده
app.use('/r', respondRoutes);

app.get('/styles.css', (_req, res) => res.sendFile(path.join(__dirname, 'styles.css')));

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
});

// كنس التكاليف التي تجاوزت مهلة الرد
const sweep = () => sweepExpired().catch((err) => console.error('[مهلة] خطأ:', err));
sweep();
setInterval(sweep, 10 * 60_000);
