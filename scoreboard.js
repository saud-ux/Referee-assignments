const DEFAULT_URL = 'https://tennis-score-6f110-default-rtdb.firebaseio.com';

function baseUrl() {
  const raw = process.env.SCOREBOARD_URL || DEFAULT_URL;
  return raw.replace(/\/+$/, '');
}

function normalize(key, m) {
  return {
    sourceKey: key,
    clubA: m?.teams?.left?.name?.trim() || '',
    clubB: m?.teams?.right?.name?.trim() || '',
    number: m?.number ?? null,
    rawName: m?.name?.trim() || '',
    createdAt: m?.createdAt || null,
  };
}

export async function fetchScoreboardMatches() {
  const res = await fetch(`${baseUrl()}/matches.json`);
  if (!res.ok) throw new Error(`فشل الاتصال بالسكوربورد (${res.status})`);
  const data = await res.json();
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data)
    .map(([key, m]) => normalize(key, m))
    .filter((row) => row.clubA && row.clubB)
    .sort((a, b) => (a.number ?? 9999) - (b.number ?? 9999));
}

export function scoreboardStatus() {
  return { url: baseUrl(), path: '/matches' };
}
