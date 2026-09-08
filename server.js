import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initStore } from './src/store.js';
import { router, webhook } from './src/routes.js';

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
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'خطأ داخلي في الخادم' });
});

const PORT = process.env.PORT || 3000;
await initStore();
app.listen(PORT, () => console.log(`النظام يعمل على المنفذ ${PORT}`));
