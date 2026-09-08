import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const COLLECTIONS = ['referees', 'tournaments', 'matches', 'assignments'];

export const newId = () => crypto.randomUUID();

function matches(row, where) {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined || v === null || v === '') return true;
    if (Array.isArray(v)) return v.includes(row[k]);
    return row[k] === v;
  });
}

/* ---------- محرك التخزين: ملف JSON محلي ---------- */
function jsonBackend(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let data = {};
  if (fs.existsSync(file)) {
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      data = {};
    }
  }
  for (const c of COLLECTIONS) if (!Array.isArray(data[c])) data[c] = [];

  let pending = null;
  const save = () => {
    clearTimeout(pending);
    pending = setTimeout(() => fs.writeFileSync(file, JSON.stringify(data, null, 2)), 20);
  };
  save();

  return {
    kind: 'json',
    label: `ملف محلي (${path.basename(file)})`,
    async list(c, where) {
      return data[c].filter((r) => matches(r, where)).map((r) => ({ ...r }));
    },
    async get(c, id) {
      const row = data[c].find((r) => r.id === id);
      return row ? { ...row } : null;
    },
    async insert(c, doc) {
      data[c].push(doc);
      save();
      return { ...doc };
    },
    async update(c, id, patch) {
      const row = data[c].find((r) => r.id === id);
      if (!row) return null;
      Object.assign(row, patch);
      save();
      return { ...row };
    },
    async remove(c, id) {
      const before = data[c].length;
      data[c] = data[c].filter((r) => r.id !== id);
      save();
      return before !== data[c].length;
    },
  };
}

/* ---------- محرك التخزين: Firestore ---------- */
async function firestoreBackend() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const hasAdc = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (!raw && !hasAdc) return null;

  let admin;
  try {
    admin = (await import('firebase-admin')).default;
  } catch {
    console.warn('[store] الحزمة firebase-admin غير مثبّتة — سيتم استخدام الملف المحلي.');
    return null;
  }

  const credential = raw
    ? admin.credential.cert(JSON.parse(raw))
    : admin.credential.applicationDefault();

  if (!admin.apps.length) admin.initializeApp({ credential });
  const db = admin.firestore();
  const prefix = process.env.FIRESTORE_PREFIX || '';
  const col = (c) => db.collection(prefix + c);

  return {
    kind: 'firestore',
    label: 'Firestore',
    async list(c, where) {
      let q = col(c);
      for (const [k, v] of Object.entries(where || {})) {
        if (v === undefined || v === null || v === '') continue;
        q = Array.isArray(v) ? q.where(k, 'in', v.slice(0, 10)) : q.where(k, '==', v);
      }
      const snap = await q.get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async get(c, id) {
      const doc = await col(c).doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },
    async insert(c, doc) {
      const { id, ...rest } = doc;
      await col(c).doc(id).set(rest);
      return doc;
    },
    async update(c, id, patch) {
      await col(c).doc(id).set(patch, { merge: true });
      return this.get(c, id);
    },
    async remove(c, id) {
      await col(c).doc(id).delete();
      return true;
    },
  };
}

let backend = null;

export async function initStore() {
  backend = (await firestoreBackend()) || jsonBackend(process.env.DB_FILE || './data/db.json');
  console.log(`[store] التخزين: ${backend.label}`);
  return backend;
}

export const store = {
  get kind() {
    return backend?.kind;
  },
  get label() {
    return backend?.label;
  },
  list: (c, where) => backend.list(c, where),
  get: (c, id) => backend.get(c, id),
  insert: (c, doc) => backend.insert(c, doc),
  update: (c, id, patch) => backend.update(c, id, patch),
  remove: (c, id) => backend.remove(c, id),
};
