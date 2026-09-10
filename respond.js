/**
 * صفحة رد الحكم — عامة بلا تسجيل دخول، محميّة برمز سري في الرابط.
 * تُبنى هنا بدل ملف ثابت لأن محتواها يتغيّر مع كل تكليف.
 */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const SHELL = (title, body) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Zain:wght@700;800&display=swap" rel="stylesheet" />
<style>
  :root {
    --ink: #14202b; --bg: #eaeeec; --surface: #fff;
    --table: #0f5c4e; --table-soft: #e3efeb;
    --ball: #d8541f; --red: #a8322a; --muted: #6d7c83; --line: #d7dedb;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    background: var(--bg); color: var(--ink);
    font-family: "IBM Plex Sans Arabic", system-ui, sans-serif;
    font-size: 16px; line-height: 1.7;
  }
  .card {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 14px; width: min(440px, 100%);
    padding: 24px; text-align: center;
  }
  h1 {
    font-family: "Zain", "IBM Plex Sans Arabic", sans-serif;
    font-weight: 800; font-size: 25px; margin: 0 0 4px;
  }
  .lede { color: var(--muted); font-size: 14.5px; margin: 0 0 18px; }
  .teams {
    font-size: 21px; font-weight: 600;
    padding: 14px; margin-bottom: 12px;
    background: var(--table-soft); border-radius: 10px;
  }
  dl { margin: 0 0 20px; text-align: right; font-size: 15px; }
  .fact { display: flex; justify-content: space-between; gap: 12px; padding: 7px 2px; border-bottom: 1px solid var(--line); }
  .fact:last-child { border-bottom: 0; }
  .fact dt { color: var(--muted); font-size: 14px; }
  .fact dd { margin: 0; font-weight: 500; }
  .btns { display: grid; gap: 10px; }
  button {
    font: inherit; font-size: 17px; font-weight: 600;
    padding: 14px; border-radius: 10px; cursor: pointer;
    border: 1px solid transparent;
  }
  .yes { background: var(--table); color: #fff; }
  .no { background: none; color: var(--red); border-color: var(--red); }
  .note { margin: 18px 0 0; font-size: 13.5px; color: var(--muted); }
  .badge {
    display: inline-block; padding: 10px 20px; border-radius: 999px;
    font-size: 17px; font-weight: 600; margin: 6px 0 4px;
  }
  .badge.ok { background: var(--table-soft); color: var(--table); }
  .badge.no { background: #fbe9e0; color: var(--red); }
  .badge.dead { background: #eef1f0; color: var(--muted); }
  .join {
    display: block; margin: 18px 0 0;
    padding: 14px; border-radius: 10px;
    background: #1faa59; color: #fff;
    font-size: 17px; font-weight: 600;
    text-decoration: none;
  }
  .join::before { content: "💬  "; }
</style>
</head>
<body><div class="card">${body}</div></body>
</html>`;

const fmtDay = (ymd) => {
  if (!ymd) return '';
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(ymd);
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: process.env.TZ || 'Asia/Riyadh',
  }).format(d);
};

const periodOf = (t) => {
  const s = fmtDay(t?.startDate);
  const e = fmtDay(t?.endDate);
  if (s && e) return s === e ? s : `من ${s} إلى ${e}`;
  if (s) return `تبدأ ${s}`;
  return 'غير محددة';
};

const placeOf = (t) => [t?.venue, t?.city].filter(Boolean).join(' — ') || '—';

/** صفحة السؤال — تُعرض للحكم قبل أن يرد */
export function askPage({ referee, tournament, token }) {
  const facts = [
    ['الفترة', periodOf(tournament)],
    ['المكان', placeOf(tournament)],
  ]
    .filter(([, v]) => v && v !== '—')
    .map(([k, v]) => `<div class="fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('');

  return SHELL(
    'ترشيح للمشاركة',
    `<h1>ترشيح للمشاركة</h1>
     <p class="lede">مرحباً ${esc(referee?.name || 'أستاذ')}، رُشِّحت للمشاركة في تحكيم هذه البطولة.</p>
     <div class="teams">${esc(tournament?.name || 'البطولة')}</div>
     <dl>${facts}</dl>
     <p class="note" style="margin:0 0 18px">يُحدَّد تكليفك اليومي في التجمع.</p>
     <form method="post" class="btns">
       <button class="yes" name="action" value="accept" type="submit">أنا متوفّر</button>
       <button class="no" name="action" value="decline" type="submit">أعتذر</button>
     </form>
     <p class="note">ردّك يُسجَّل مباشرة لدى لجنة التحكيم.</p>`
  );
}

const safeUrl = (u) => {
  const s = String(u || '').trim();
  return /^https?:\/\//i.test(s) ? s : '';
};

/** صفحة التأكيد — بعد أن يرد الحكم، أو إذا كان قد ردّ سابقاً */
export function donePage({ status, tournament, alreadyAnswered = false }) {
  const accepted = status === 'accepted';
  const groupLink = accepted ? safeUrl(tournament?.groupLink) : '';
  const groupBtn = groupLink
    ? `<a class="join" href="${esc(groupLink)}" target="_blank" rel="noopener">انضم لقروب البطولة</a>`
    : '';
  return SHELL(
    accepted ? 'تم تأكيد التوفّر' : 'تم تسجيل الاعتذار',
    `<h1>${accepted ? 'شكراً لك' : 'تم التسجيل'}</h1>
     <div class="teams">${esc(tournament?.name || 'البطولة')}</div>
     <div class="badge ${accepted ? 'ok' : 'no'}">
       ${accepted ? 'أكّدت توفّرك للمشاركة' : 'اعتذرت عن المشاركة'}
     </div>
     <p class="note">
       ${alreadyAnswered ? 'سبق أن سجّلت ردّك على هذا الترشيح.' : 'وصل ردّك للجنة التحكيم.'}
       ${accepted ? '<br>سيصلك التكليف اليومي في التجمع.' : ''}
     </p>
     ${groupBtn}`
  );
}

/** صفحة تعذّر الرد — رابط خاطئ أو تكليف ملغى أو منتهي */
export function deadPage(reason) {
  return SHELL(
    'الرابط غير صالح',
    `<h1>تعذّر فتح التكليف</h1>
     <div class="badge dead">${esc(reason)}</div>
     <p class="note">تواصل مع لجنة التحكيم إن كنت تعتقد أن هذا خطأ.</p>`
  );
}
