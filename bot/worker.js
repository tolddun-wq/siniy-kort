// «Синий корт» — сервер бота на Cloudflare Workers (бесплатный тариф).
// Что делает:
//  1) POST /book   — мини-приложение присылает бронь; проверяем подпись Telegram и сохраняем в KV.
//  2) POST /cancel — отмена брони.
//  3) POST /tg     — сообщения боту (/start): отвечаем кнопкой «Открыть приложение».
//  4) Каждые 5 минут (cron) — ищем брони, до которых ≤30 минут, и шлём напоминание.
// Секреты (задаёт владелец в панели Cloudflare, в код не пишем): BOT_TOKEN.
// Переменные: APP_URL — адрес мини-приложения, например https://siniy-kort.vercel.app/app/
// Хранилище: KV-пространство с именем BOOKINGS.

const REMIND_MIN = 30;
const TZ_OFFSET_MIN = 180; // Казань, UTC+3

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    try {
      if (url.pathname === '/book' && req.method === 'POST') {
        const { initData, booking } = await req.json();
        const user = await checkInitData(initData, env.BOT_TOKEN);
        if (!user) return json({ ok: false, error: 'bad signature' }, 401, cors);
        const b = clean(booking);
        if (!b) return json({ ok: false, error: 'bad booking' }, 400, cors);
        b.chat = user.id; b.name = b.name || user.first_name || '';
        await env.BOOKINGS.put(`b:${user.id}:${b.id}`, JSON.stringify(b), { expirationTtl: 60 * 60 * 24 * 40 });
        await send(env, user.id, `Бронь принята ✅\n${b.title}, ${b.when}.\nК оплате на месте: ${b.price} ₽.\nНапомню за ${REMIND_MIN} минут.`);
        return json({ ok: true }, 200, cors);
      }
      if (url.pathname === '/cancel' && req.method === 'POST') {
        const { initData, id } = await req.json();
        const user = await checkInitData(initData, env.BOT_TOKEN);
        if (!user) return json({ ok: false }, 401, cors);
        await env.BOOKINGS.delete(`b:${user.id}:${String(id).slice(0, 20)}`);
        return json({ ok: true }, 200, cors);
      }
      if (url.pathname === '/tg' && req.method === 'POST') {
        if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
        const upd = await req.json();
        const m = upd.message;
        if (m?.text?.startsWith('/start')) {
          await tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Привет! Это теннисный клуб «Синий корт» (демо).\nЗдесь можно забронировать корт, посмотреть свои записи и найти ответ на вопрос.',
            reply_markup: { inline_keyboard: [[{ text: '🎾 Забронировать корт', web_app: { url: env.APP_URL } }], [{ text: 'Мои записи', web_app: { url: env.APP_URL + '?tab=my' } }, { text: 'Вопросы', web_app: { url: env.APP_URL + '?tab=faq' } }]] } });
        }
        if (upd.callback_query?.data?.startsWith('cancel:')) {
          const key = upd.callback_query.data.slice(7);
          if (key.startsWith(`b:${upd.callback_query.from.id}:`)) await env.BOOKINGS.delete(key);
          await tg(env, 'answerCallbackQuery', { callback_query_id: upd.callback_query.id, text: 'Запись отменена' });
        }
        return new Response('ok');
      }
      return new Response('Синий корт — сервер бота работает', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    } catch (e) {
      return json({ ok: false, error: 'server' }, 500, cors);
    }
  },

  // cron: раз в 5 минут
  async scheduled(_event, env) {
    const now = Date.now();
    let cursor;
    do {
      const page = await env.BOOKINGS.list({ prefix: 'b:', cursor });
      for (const k of page.keys) {
        const b = JSON.parse((await env.BOOKINGS.get(k.name)) || 'null');
        if (!b || b.reminded) continue;
        const start = startTime(b);
        const left = (start - now) / 60000;
        if (left <= REMIND_MIN && left > -10) {
          await tg(env, 'sendMessage', { chat_id: b.chat, text: `Через ${Math.max(1, Math.round(left))} минут ваша игра 🎾\n${b.title}, ${b.when}.\nВозьмите кроссовки со светлой подошвой — ракетку дадим.`,
            reply_markup: { inline_keyboard: [[{ text: 'Отменить', callback_data: 'cancel:' + k.name }, { text: 'Мои записи', web_app: { url: env.APP_URL + '?tab=my' } }]] } });
          b.reminded = true;
          await env.BOOKINGS.put(k.name, JSON.stringify(b), { expirationTtl: 60 * 60 * 24 * 2 });
        }
      }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
  },
};

// время начала брони в UTC (дата и час клуба по Казани)
function startTime(b) {
  const [y, m, d] = b.date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, b.from, 0) - TZ_OFFSET_MIN * 60000;
}

// принимаем только нужные поля, ограничиваем длину
function clean(b) {
  if (!b || !/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !Number.isInteger(b.from) || b.from < 0 || b.from > 23) return null;
  const s = (v, n) => String(v ?? '').slice(0, n);
  return { id: s(b.id, 20).replace(/[^a-z0-9]/gi, ''), title: s(b.title, 80), when: s(b.when, 80), date: b.date, from: b.from, price: Math.max(0, Math.min(1e6, Number(b.price) || 0)), name: s(b.name, 40) };
}

// проверка подписи данных от Telegram (официальный алгоритм WebApp)
async function checkInitData(initData, botToken) {
  if (!initData || !botToken) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash'); p.delete('hash');
  const check = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const enc = new TextEncoder();
  const k1 = await crypto.subtle.importKey('raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const secret = await crypto.subtle.sign('HMAC', k1, enc.encode(botToken));
  const k2 = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = [...new Uint8Array(await crypto.subtle.sign('HMAC', k2, enc.encode(check)))].map(x => x.toString(16).padStart(2, '0')).join('');
  if (sig !== hash) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 86400) return null; // данные старше суток не принимаем
  try { return JSON.parse(p.get('user')); } catch (e) { return null; }
}

const send = (env, chat, text) => tg(env, 'sendMessage', { chat_id: chat, text });
async function tg(env, method, body) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
const json = (o, status, headers) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...headers } });
