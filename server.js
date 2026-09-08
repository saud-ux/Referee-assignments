import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initStore } from './store.js';
import { router, webhook } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// نحتفظ بالجسم الخام للتحقق من توقيع ميتا
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use('/api', router);
app.use('/webhook', webhook);

// كل الملفات في الجذر، فنقدّم ملفات الواجهة فقط
// ولا نفتح المجلد كاملاً حتى لا تنكشف ملفات الخادم
const PUBLIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
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
app.listen(PORT, () => console.log(`النظام يعمل على المنفذ ${PORT}`));
