const DEFAULT_URL = 'https://tennis-score-6f110-default-rtdb.firebaseio.com';

function baseUrl() {
  const raw = process.env.SCOREBOARD_URL || DEFAULT_URL;
  return raw.replace(/\/+$/, '');
}

function extractTournamentName(rawName) {
  if (!rawName) return '';
  let s = String(rawName).trim();
  s = s.replace(/\s*\(\s*المباراة\b[^)]*\)\s*$/u, '');
  s = s.replace(/\s+المباراة\b.*$/u, '');
  return s.trim();
}

function normalize(key, m) {
  const rawName = m?.name?.trim() || '';
  return {
    sourceKey: key,
    clubA: m?.teams?.left?.name?.trim() || '',
    clubB: m?.teams?.right?.name?.trim() || '',
    number: m?.number ?? null,
    rawName,
    tournamentName: extractTournamentName(rawName),
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

export async function fetchScoreboardTournaments() {
  const matches = await fetchScoreboardMatches();
  const groups = new Map();
  for (const m of matches) {
    const name = m.tournamentName;
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, { name, count: 0, sampleKeys: [] });
    const g = groups.get(name);
    g.count += 1;
    if (g.sampleKeys.length < 3) g.sampleKeys.push(m.sourceKey);
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}
