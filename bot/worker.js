// «Синий корт» — сервер бота на Cloudflare Workers (бесплатный тариф).
// Что делает:
//  1) POST /book   — мини-приложение присылает бронь; проверяем подпись Telegram и сохраняем в KV.
//  2) POST /cancel — отмена брони.  POST /my — все брони человека (для сайта и приложения).
//     Сайт подтверждает человека через «Войти через Telegram», приложение — через initData.
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
        const body = await req.json();
        const user = await auth(body, env);
        if (!user) return json({ ok: false, error: 'bad signature' }, 401, cors);
        const b = clean(body.booking);
        if (!b) return json({ ok: false, error: 'bad booking' }, 400, cors);
        b.name = b.name || user.first_name || '';
        await addBooking(env, user.id, b);
        await send(env, user.id, `${body.session ? 'Бронь с сайта принята' : 'Бронь принята'} ✅\n${b.title}, ${b.when}.\nК оплате на месте: ${b.price} ₽.\nНапомню за ${REMIND_MIN} минут.`);
        return json({ ok: true }, 200, cors);
      }
      if (url.pathname === '/cancel' && req.method === 'POST') {
        const body = await req.json();
        const user = await auth(body, env);
        if (!user) return json({ ok: false }, 401, cors);
        await removeBooking(env, user.id, String(body.id).slice(0, 20));
        return json({ ok: true }, 200, cors);
      }
      if (url.pathname === '/my' && req.method === 'POST') {
        const body = await req.json();
        const user = await auth(body, env);
        if (!user) return json({ ok: false }, 401, cors);
        const list = (await getList(env, user.id)).map(b => ({ id: b.id, title: b.title, when: b.when, date: b.date, from: b.from, price: b.price, name: b.name }));
        return json({ ok: true, list }, 200, cors);
      }
      // мини-приложение просит ссылку на сайт, где человек уже вошёл
      if (url.pathname === '/session' && req.method === 'POST') {
        const body = await req.json();
        const user = await checkInitData(body.initData, env.BOT_TOKEN);
        if (!user) return json({ ok: false }, 401, cors);
        return json({ ok: true, session: await makeSession(user, env.BOT_TOKEN) }, 200, cors);
      }
      if (url.pathname === '/login' && req.method === 'POST') {
        const { code } = await req.json();
        if (!/^[a-z0-9]{12,40}$/.test(code || '')) return json({ ok: false }, 400, cors);
        const u = JSON.parse((await env.BOOKINGS.get(`l:${code}`)) || 'null');
        if (!u) return json({ ok: false, wait: true }, 200, cors);
        await env.BOOKINGS.delete(`l:${code}`);
        return json({ ok: true, session: await makeSession(u, env.BOT_TOKEN), first_name: u.first_name }, 200, cors);
      }
      if (url.pathname === '/tg' && req.method === 'POST') {
        if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== (env.WEBHOOK_SECRET || '').trim()) { console.log('Неверный WEBHOOK_SECRET'); return new Response('no', { status: 403 }); }
        const upd = await req.json();
        const m = upd.message;
        const site = async from => SITE_URL + '#tg=' + await makeSession(from, env.BOT_TOKEN);
        const lc = m?.text?.match(/^\/start login_([a-z0-9]{12,40})$/)?.[1];
        if (lc) {
          await env.BOOKINGS.put(`l:${lc}`, JSON.stringify({ id: m.from.id, first_name: m.from.first_name || '' }), { expirationTtl: 900 });
          await tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Готово, вы вошли на сайте «Синий корт» ✅\nВернитесь на сайт — записи сайта и бота теперь общие, напоминания будут приходить сюда.' });
          return new Response('ok');
        }
        const code = m?.text?.match(/^\/start (b\d{8}\d{2}\d{2}[1-4][scp]\d{1,6})$/)?.[1];
        if (code) {
          const b = fromCode(code, m.from);
          await addBooking(env, m.from.id, b);
          await tg(env, 'sendMessage', { chat_id: m.chat.id, text: `Бронь с сайта добавлена ✅\n${b.title}, ${b.when}.\nК оплате на месте: ${b.price} ₽.\nНапомню за ${REMIND_MIN} минут до игры.`,
            reply_markup: { inline_keyboard: [[{ text: 'Мои записи', web_app: { url: env.APP_URL + '?tab=my' } }]] } });
          return new Response('ok');
        }
        if (m?.text?.startsWith('/start')) {
          await tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Привет! Это теннисный клуб «Синий корт» (демо).\nЗдесь можно забронировать корт, посмотреть свои записи и найти ответ на вопрос.',
            reply_markup: { inline_keyboard: [[{ text: '🎾 Забронировать корт', web_app: { url: env.APP_URL } }], [{ text: 'Мои записи', web_app: { url: env.APP_URL + '?tab=my' } }, { text: 'Вопросы', web_app: { url: env.APP_URL + '?tab=faq' } }], [{ text: '🌐 Сайт клуба (вы уже вошли)', url: await site(m.from) }]] } });
        }
        if (upd.callback_query?.data?.startsWith('c:')) {
          await removeBooking(env, upd.callback_query.from.id, upd.callback_query.data.slice(2));
          await tg(env, 'answerCallbackQuery', { callback_query_id: upd.callback_query.id, text: 'Запись отменена' });
        }
        return new Response('ok');
      }
      return new Response('Синий корт — сервер бота работает', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    } catch (e) {
      return json({ ok: false, error: 'server' }, 500, cors);
    }
  },

  // cron: раз в 5 минут — напоминания и уборка прошедших броней
  async scheduled(_event, env) {
    const now = Date.now();
    let cursor;
    do {
      const page = await env.BOOKINGS.list({ prefix: 'u:', cursor });
      for (const k of page.keys) {
        const uid = k.name.slice(2);
        const list = await getList(env, uid); let changed = false;
        for (const b of list) {
          if (b.reminded) continue;
          const left = (startTime(b) - now) / 60000;
          if (left <= REMIND_MIN && left > -10) {
            await tg(env, 'sendMessage', { chat_id: uid, text: `Через ${Math.max(1, Math.round(left))} минут ваша игра 🎾\n${b.title}, ${b.when}.\nВозьмите кроссовки со светлой подошвой — ракетку дадим.`,
              reply_markup: { inline_keyboard: [[{ text: 'Отменить', callback_data: 'c:' + b.id }, { text: 'Мои записи', web_app: { url: env.APP_URL + '?tab=my' } }]] } });
            b.reminded = true; changed = true;
          }
        }
        const fresh = list.filter(b => startTime(b) > now - 864e5);
        if (changed || fresh.length !== list.length) await saveList(env, uid, fresh);
      }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
  },
};

const SITE_URL = 'https://siniy-kort.vercel.app/bron.html';

// все брони человека — одна запись u:<id>: читается сразу после записи, без задержки списков
async function getList(env, uid) { try { return JSON.parse((await env.BOOKINGS.get(`u:${uid}`)) || '[]'); } catch (e) { return []; } }
async function saveList(env, uid, list) { if (list.length) await env.BOOKINGS.put(`u:${uid}`, JSON.stringify(list.slice(-50))); else await env.BOOKINGS.delete(`u:${uid}`); }
async function addBooking(env, uid, b) { const l = (await getList(env, uid)).filter(x => x.id !== b.id); l.push(b); await saveList(env, uid, l); }
async function removeBooking(env, uid, id) { await saveList(env, uid, (await getList(env, uid)).filter(x => x.id !== id)); }

// бронь из кода с сайта: b + ГГГГММДД + ЧЧ(начало) + ЧЧ(конец) + корт + формат(s/c/p) + цена
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
function fromCode(code, from) {
  const y = code.slice(1, 5), mo = code.slice(5, 7), d = code.slice(7, 9), h1 = +code.slice(9, 11), h2 = +code.slice(11, 13), court = code[13], mode = code[14], price = +code.slice(15);
  const dt = new Date(Date.UTC(+y, +mo - 1, +d));
  const title = `Корт ${court}${mode === 'c' ? ' с тренером' : mode === 'p' ? ' и партнёр по уровню' : ''}`;
  return { id: 'w' + code.slice(1, 13) + court, title, when: `${WD[dt.getUTCDay()]}, ${+d} ${MON[+mo - 1]}, ${h1}:00–${h2}:00`, date: `${y}-${mo}-${d}`, from: h1, price, name: from.first_name || '' };
}

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

// кто прислал запрос: мини-приложение (initData) или сайт после «Войти через Telegram» (login)
async function auth(body, env) {
  if (body.session) return checkSession(body.session, env.BOT_TOKEN);
  if (body.initData) return checkInitData(body.initData, env.BOT_TOKEN);
  if (body.login) return checkLogin(body.login, env.BOT_TOKEN);
  return null;
}

// сессия сайта после входа через бота: данные + подпись ключом бота, действует 60 дней
async function hmacHex(keyStr, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode('site:' + keyStr.trim()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function makeSession(u, botToken) {
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ id: u.id, first_name: u.first_name, exp: Date.now() + 60 * 864e5 }))));
  return payload + '.' + await hmacHex(botToken, payload);
}
async function checkSession(s, botToken) {
  const [payload, sig] = String(s).split('.');
  if (!payload || !sig || sig !== await hmacHex(botToken, payload)) return null;
  try { const u = JSON.parse(decodeURIComponent(escape(atob(payload)))); return u.exp > Date.now() ? u : null; } catch (e) { return null; }
}

// проверка входа через Telegram на сайте (официальный алгоритм Login Widget)
async function checkLogin(login, botToken) {
  if (!login || !login.hash || !botToken) return null;
  const { hash, ...data } = login;
  const check = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== null).sort().map(k => `${k}=${data[k]}`).join('\n');
  const enc = new TextEncoder();
  const secret = await crypto.subtle.digest('SHA-256', enc.encode(botToken.trim()));
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(check)))].map(x => x.toString(16).padStart(2, '0')).join('');
  if (sig !== hash) return null;
  if (Date.now() / 1000 - Number(data.auth_date) > 86400 * 30) return null; // вход действует 30 дней
  return { id: data.id, first_name: data.first_name };
}

// проверка подписи данных от Telegram (официальный алгоритм WebApp)
async function checkInitData(initData, botToken) {
  if (!initData || !botToken) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash'); p.delete('hash');
  const check = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const enc = new TextEncoder();
  botToken = botToken.trim();
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
  if (!env.BOT_TOKEN) { console.log('Нет BOT_TOKEN в настройках воркера'); return; }
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN.trim()}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) console.log(`Telegram ответил ${r.status} на ${method}: ${r.status === 401 || r.status === 404 ? 'токен неверный (проверьте BOT_TOKEN)' : (await r.text()).slice(0, 200)}`);
  return r;
}
const json = (o, status, headers) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...headers } });
