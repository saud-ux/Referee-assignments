import crypto from 'node:crypto';

const VERSION = process.env.WA_API_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${VERSION}`;

const TOKEN = () => process.env.WHATSAPP_TOKEN;
const PHONE_ID = () => process.env.WHATSAPP_PHONE_ID;

export const TEMPLATE_NAME = process.env.WA_TEMPLATE_NAME || 'referee_availability_ar';
export const TEMPLATE_LANG = process.env.WA_TEMPLATE_LANG || 'ar';

/** هل الإرسال التلقائي عبر واتساب مفعّل؟ إن لا، تُرسل النداءات عبر رابط الرد. */
export const isLive = () => Boolean(TOKEN() && PHONE_ID());

/** تحويل الرقم إلى صيغة دولية بدون + وبدون أصفار بادئة */
export function normalizePhone(input, defaultCountry = '966') {
  let n = String(input || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) return n.slice(1);
  if (n.startsWith('00')) return n.slice(2);
  if (n.startsWith('0')) return defaultCountry + n.slice(1);
  if (n.startsWith(defaultCountry)) return n;
  return defaultCountry + n;
}

async function graph(pathname, body) {
  const res = await fetch(`${GRAPH}/${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.details = json;
    throw err;
  }
  return json;
}

/**
 * إرسال قالب نداء التوفّر مع زرّي "متوفّر" و"أعتذر".
 * الزر يرجع في الويبهوك بالحمولة ACCEPT:<id> أو DECLINE:<id>
 */
export async function sendAssignment({ to, assignmentId, params }) {
  const payload = {
    messaging_product: 'whatsapp',
    to: normalizePhone(to),
    type: 'template',
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANG },
      components: [
        {
          type: 'body',
          parameters: params.map((text) => ({ type: 'text', text: String(text ?? '—') })),
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '0',
          parameters: [{ type: 'payload', payload: `ACCEPT:${assignmentId}` }],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '1',
          parameters: [{ type: 'payload', payload: `DECLINE:${assignmentId}` }],
        },
      ],
    },
  };

  if (!isLive()) {
    console.log('[whatsapp] غير مفعّل — التكليف يُرسل عبر الرابط بدل الرسالة التلقائية');
    return { messageId: null, autoSent: false };
  }

  const res = await graph(`${PHONE_ID()}/messages`, payload);
  return { messageId: res?.messages?.[0]?.id || null, autoSent: true };
}

/** رسالة نصية حرة — تعمل مجاناً فقط داخل 24 ساعة من آخر رسالة من الحكم */
export async function sendText(to, body) {
  if (!isLive()) return { autoSent: false };
  return graph(`${PHONE_ID()}/messages`, {
    messaging_product: 'whatsapp',
    to: normalizePhone(to),
    type: 'text',
    text: { body, preview_url: false },
  });
}

/** التحقق من توقيع ميتا على الويبهوك */
export function verifySignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // لم يُضبط بعد — يُسمح في التطوير
  if (!signatureHeader) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** استخراج ردود الأزرار من جسم الويبهوك */
export function parseButtonReplies(body) {
  const out = [];
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const msg of value.messages || []) {
        let payload = null;
        if (msg.type === 'button') payload = msg.button?.payload || msg.button?.text;
        if (msg.type === 'interactive') payload = msg.interactive?.button_reply?.id;
        if (!payload) continue;
        out.push({
          payload,
          from: msg.from,
          messageId: msg.id,
          contextId: msg.context?.id || null,
          timestamp: Number(msg.timestamp || 0) * 1000 || Date.now(),
        });
      }
    }
  }
  return out;
}
