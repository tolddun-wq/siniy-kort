// «Синий корт» — мини-приложение Telegram. Работает и в обычном браузере (демо-режим).
(() => {
  const S = window.SK, FAQ = window.FAQ, $ = s => document.querySelector(s), C = S.club;
  const tg = window.Telegram?.WebApp;
  const inTg = !!(tg && tg.initData);
  const API = 'https://siniy-kort-bot.tolddun.workers.dev'; // сервер бота: брони и напоминания
  const SITE = '../index.html';

  if (inTg) { tg.ready(); tg.expand(); try { tg.setHeaderColor('#E7EBEF'); tg.setBackgroundColor('#E7EBEF'); tg.disableVerticalSwipes?.(); } catch (e) {} $('#demoTag').hidden = true; }
  const user = tg?.initDataUnsafe?.user;
  const hr = new Date().getHours();
  $('#hello').textContent = `${hr < 6 ? 'Доброй ночи' : hr < 12 ? 'Доброе утро' : hr < 18 ? 'Добрый день' : 'Добрый вечер'}${user?.first_name ? ', ' + user.first_name : ''}`;
  const haptic = t => { try { t === 'ok' ? tg?.HapticFeedback?.notificationOccurred('success') : tg?.HapticFeedback?.selectionChanged(); } catch (e) {} };
  addEventListener('keydown', e => { if (e.key === 'Tab') document.documentElement.classList.add('kbd'); });
  addEventListener('pointerdown', () => document.documentElement.classList.remove('kbd'));

  // ——— хранилище: общее с сайтом ———
  const BK = 'sk_bookings_v1';
  const store = {
    list() { try { return JSON.parse(localStorage.getItem(BK)) || []; } catch (e) { return []; } },
    save(l) { try { localStorage.setItem(BK, JSON.stringify(l)); } catch (e) {} count(); },
  };
  const count = () => { const n = store.list().length; $('#cnt').textContent = n; $('#cnt').hidden = !n; };

  // ——— окна снизу: закрыть крестиком, тапом мимо, «Назад» в Telegram ———
  let closeTop = null;
  function sheet(html, onOpen) {
    closeTop?.();
    const el = document.createElement('div'); el.className = 'sheet';
    el.innerHTML = `<div class="sheet-box" role="dialog" aria-modal="true"><button class="sheet-x" type="button" data-close aria-label="Закрыть">×</button>${html}</div>`;
    $('#app').appendChild(el);
    const close = () => { el.remove(); closeTop = null; if (inTg) { tg.BackButton.offClick(close); tg.BackButton.hide(); } };
    closeTop = close;
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) close(); });
    if (inTg) { tg.BackButton.show(); tg.BackButton.onClick(close); }
    onOpen?.(el, close);
    return close;
  }
  addEventListener('keydown', e => { if (e.key === 'Escape') closeTop?.(); });
  function toast(t) { document.querySelector('.toast')?.remove(); const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = t; $('#app').appendChild(el); setTimeout(() => el.remove(), 2800); }
  const demoCall = () => sheet(`<h3>Позвонить не получится</h3><p>Клуб вымышленный, номер ${C.phone} ненастоящий. Хотите такое приложение для своего клуба — напишите разработчику.</p><div class="btns"><a class="btn ball wide" href="${C.telegram}" target="_blank" rel="noopener">Написать в Telegram</a></div>`);
  const openLink = url => { if (/^https:\/\/t\.me\//.test(url)) tg.openTelegramLink(url); else tg.openLink(new URL(url, location.href).href); };

  // ——— вкладки ———
  let cur = 'book';
  function show(s) {
    cur = s;
    document.querySelectorAll('.screen').forEach(x => x.hidden = x.id !== 's-' + s);
    document.querySelectorAll('.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.s === s); b.setAttribute('aria-current', b.dataset.s === s ? 'page' : 'false'); });
    if (s === 'my') renderMy();
    if (s === 'faq') renderFaq();
    if (s === 'club') renderClub();
    if (inTg) { if (s === 'book' && st.hours.length) tg.MainButton.show(); else tg.MainButton.hide(); }
    $('#scroll').scrollTo({ top: 0 });
    haptic();
  }
  $('.tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.s !== cur) show(b.dataset.s); });

  // ——— бронь ———
  const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const human = s => { const d = new Date(s + 'T00:00'); return `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`; };
  const isWe = s => [0, 6].includes(new Date(s + 'T00:00').getDay());
  const todayIso = iso(new Date());
  const hoursOf = day => [...Array(C.close - C.open)].map((_, i) => C.open + i).filter(x => day !== todayIso || x > new Date().getHours());
  const freeOf = (day, c) => hoursOf(day).filter(x => !S.busy(day, c, x));
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return iso(d); }).filter(d => S.courts.some(c => freeOf(d, c.id).length));
  const st = { day: days[0], court: null, hours: [], mode: 'solo', coach: 'igor' };
  const pickCourt = () => { st.court = S.courts.slice().sort((a, b) => freeOf(st.day, b.id).length - freeOf(st.day, a.id).length)[0].id; };
  pickCourt();
  $('#heroPrice').textContent = 'от ' + S.fmt(S.minCourt);
  $('#courtNote').textContent = 'листайте →';

  function renderDays() {
    $('#days').innerHTML = days.map(d => { const x = new Date(d + 'T00:00'); return `<button type="button" class="${d === st.day ? 'on' : ''}" data-d="${d}" aria-pressed="${d === st.day}"><small>${d === todayIso ? 'сегодня' : WD[x.getDay()]}</small><b>${x.getDate()}</b><small>${MON[x.getMonth()].slice(0, 3)}</small></button>`; }).join('');
  }
  function renderCourts() {
    $('#courts').innerHTML = S.courts.map(c => { const n = freeOf(st.day, c.id).length; return `<button type="button" class="${c.id === st.court ? 'on' : ''}" data-c="${c.id}"${n ? '' : ' disabled'} aria-pressed="${c.id === st.court}"><span class="ph" style="background-image:url(../${c.img})"></span><i class="chk" aria-hidden="true">✓</i><span class="in"><b>${c.name}</b><small>${n ? 'свободно ' + n + ' ч' : 'занят'}</small></span></button>`; }).join('');
  }
  function renderSlots() {
    const hs = hoursOf(st.day), w = isWe(st.day);
    const parts = [['Утро', 7, 12], ['День', 12, 17], ['Вечер', 17, 23]];
    $('#slots').innerHTML = parts.map(([n, a, b]) => { const p = hs.filter(x => x >= a && x < b); return p.length ? `<div class="part"><span>${n}</span><div class="slots">${p.map(x => { const bz = S.busy(st.day, st.court, x), on = st.hours.includes(x); return `<button type="button" class="${on ? 'on' : ''}" data-h="${x}"${bz ? ' disabled' : ''} aria-pressed="${on}">${x}:00<small>${bz ? 'занят' : S.fmt(S.rateFor(x, w))}</small></button>`; }).join('')}</div></div>` : ''; }).join('')
      || '<div class="empty">Сегодня часы закончились — выберите другой день</div>';
  }
  function renderMode() {
    $('#coaches').hidden = st.mode !== 'coach';
    $('#modeNote').textContent = st.mode === 'coach' ? `Тренер — плюс ${S.fmt(S.extras.coach)} к часу корта.` : st.mode === 'partner' ? 'Подберём игрока вашего уровня, корт оплатите пополам.' : 'Своя компания, до 4 человек. Ракетка и мячи — бесплатно.';
    $('#coaches').innerHTML = S.coaches.map(c => `<button type="button" class="${c.id === st.coach ? 'on' : ''}" data-co="${c.id}"><span class="av" style="background-image:url(../${c.img})"></span><span><b>${c.name}</b><small>${c.role}</small></span></button>`).join('');
  }
  const calc = () => { const w = isWe(st.day), court = st.hours.reduce((s, x) => s + S.rateFor(x, w), 0); return st.mode === 'partner' ? Math.round(court / 2) : court + (st.mode === 'coach' ? S.extras.coach * st.hours.length : 0); };
  function renderSum() {
    const bar = $('#sumbar'), c = S.courts.find(x => x.id === st.court);
    if (!st.hours.length) { bar.className = 'sumbar off'; bar.innerHTML = `<div><small>${c.name}, ${human(st.day)}</small><b>Выберите время</b></div>`; if (inTg) tg.MainButton.hide(); return; }
    const from = st.hours[0], to = st.hours[st.hours.length - 1] + 1;
    bar.className = 'sumbar';
    bar.innerHTML = `<div><small>${c.name}, ${from}:00–${to}:00</small><b>${S.fmt(calc())}</b></div>${inTg ? '' : '<button class="btn ball" type="button" id="go">Забронировать</button>'}`;
    $('#go')?.addEventListener('click', confirm);
    if (inTg) { tg.MainButton.setParams({ text: `Забронировать · ${S.fmt(calc())}`, color: '#D8F04A', text_color: '#132230' }); if (cur === 'book') tg.MainButton.show(); }
  }
  if (inTg) tg.MainButton.onClick(() => confirm());
  const renderBook = () => { renderDays(); renderCourts(); renderSlots(); renderMode(); renderSum(); };

  $('#days').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.day = b.dataset.d; st.hours = []; if (!freeOf(st.day, st.court).length) pickCourt(); haptic(); renderBook(); });
  $('#courts').addEventListener('click', e => { const b = e.target.closest('button:not([disabled])'); if (!b) return; st.court = +b.dataset.c; st.hours = []; haptic(); renderCourts(); renderSlots(); renderSum(); });
  $('#slots').addEventListener('click', e => {
    const b = e.target.closest('button:not([disabled])'); if (!b) return; const x = +b.dataset.h;
    if (st.hours.includes(x)) st.hours = x === st.hours[0] || x === st.hours[st.hours.length - 1] ? st.hours.filter(y => y !== x) : [x];
    else if (st.hours.length && (x === st.hours[st.hours.length - 1] + 1 || x === st.hours[0] - 1)) st.hours.push(x);
    else st.hours = [x];
    st.hours.sort((a, c) => a - c); haptic(); renderSlots(); renderSum();
  });
  $('#mode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#mode .on').classList.remove('on'); b.classList.add('on'); st.mode = b.dataset.m; haptic(); renderMode(); renderSum(); });
  $('#coaches').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.coach = b.dataset.co; renderMode(); });

  function confirm() {
    if (!st.hours.length) return;
    const c = S.courts.find(x => x.id === st.court), from = st.hours[0], to = st.hours[st.hours.length - 1] + 1, price = calc();
    let known = user?.first_name || ''; if (!known) try { known = localStorage.getItem('sk_name') || ''; } catch (e) {}
    sheet(`<h3>${c.name}, ${human(st.day)}</h3><p>${from}:00–${to}:00${st.mode === 'coach' ? ' · тренер ' + S.coachById(st.coach).name : st.mode === 'partner' ? ' · подберём партнёра' : ''}</p>
      <ul><li><span>К оплате на месте</span><span>${S.fmt(price)}</span></li><li><span>Ракетка и мячи</span><span>бесплатно</span></li><li><span>Отмена без штрафа</span><span>за ${S.extras.cancelHours} часов</span></li><li><span>Напоминание в Telegram</span><span>за ${S.extras.remindMinutes} минут</span></li></ul>
      <form novalidate><label class="field"><span>Как к вам обращаться</span><input name="name" value="${known.replace(/"/g, '')}" placeholder="Например, Анна" autocomplete="given-name"><em class="e" hidden></em></label>
      <div class="btns"><button class="btn ball wide" type="submit">Подтвердить бронь</button></div></form>`,
      (el, close) => {
        const f = el.querySelector('form');
        f.addEventListener('submit', e => {
          e.preventDefault();
          const name = f.name.value.trim();
          if (name.length < 2) { const er = f.querySelector('.e'); er.hidden = false; er.textContent = 'Напишите имя — тренер поздоровается с вами'; f.name.focus(); return; }
          try { localStorage.setItem('sk_name', name); } catch (er) {}
          const b = { id: Date.now().toString(36), type: 'court', title: `${c.name}${st.mode === 'coach' ? ' с тренером' : st.mode === 'partner' ? ' и партнёр по уровню' : ''}`, when: `${human(st.day)}, ${from}:00–${to}:00`, date: st.day, from, price, name, tg: true, src: 'app' };
          const l = store.list(); l.push(b); store.save(l);
          if (API && inTg) fetch(API + '/book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: tg.initData, booking: b }) })
            .then(r => { if (r.ok) store.save(store.list().map(x => x.id === b.id ? { ...x, srv: true } : x)); }).catch(() => {});
          close(); haptic('ok'); st.hours = []; renderBook();
          sheet(`<h3>Готово, ${name.replace(/</g, '')}!</h3><p>${b.title}, ${b.when}. За ${S.extras.remindMinutes} минут бот пришлёт напоминание — вот такое:</p>${preview(b)}<div class="btns"><button class="btn navy wide" type="button" data-go>Мои записи</button></div>`,
            (el2, close2) => el2.querySelector('[data-go]').addEventListener('click', () => { close2(); show('my'); }));
        });
      });
  }

  function preview(b) {
    const t = b.from != null ? `${String(b.from - 1).padStart(2, '0')}:30` : '';
    return `<div class="chat"><div class="msg"><b>Синий корт</b>Через 30 минут ваша игра 🎾<br>${b.title}, ${b.when.split(', ').slice(-1)[0]}.<br>Возьмите кроссовки со светлой подошвой — ракетку дадим.<div class="kb"><span>Отменить</span><span>Как добраться</span></div><time>${t}</time></div></div>`;
  }

  // ——— мои записи ———
  const startOf = b => { if (!b.date || b.from == null) return null; const s = new Date(b.date + 'T00:00'); s.setHours(b.from); return s; };
  function renderMy() {
    const l = store.list().slice().reverse();
    const up = store.list().map(b => [b, startOf(b)]).filter(([, s]) => s && s > new Date()).sort((a, b) => a[1] - b[1])[0];
    if (up) {
      const ms = up[1] - new Date(), dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4);
      $('#next').innerHTML = `<div class="next"><i class="tball" aria-hidden="true"></i><small>До ближайшей игры</small><b>${dd ? dd + ' д ' : ''}${hh} ч${dd ? '' : ' ' + mm + ' мин'}</b><p>${up[0].title}, ${up[0].when}</p></div>`;
    } else $('#next').innerHTML = '';
    $('#myList').innerHTML = l.length ? l.map(b => `<div class="bk"><span class="tag">${b.type === 'court' ? 'Корт' : b.type === 'group' ? 'Группа' : 'Абонемент'}</span><b>${b.title}</b><small>${b.when}</small><small>${S.fmt(b.price)} · оплата на месте</small>${b.tg && b.type !== 'abon' ? '<div class="rem">Напомним в Telegram за 30 минут</div>' : ''}
      <div class="row">${b.type !== 'abon' ? `<button class="btn plain" type="button" data-pv="${b.id}">Пример напоминания</button>` : ''}<button class="btn plain" type="button" data-x="${b.id}">Отменить</button></div></div>`).join('')
      : `<div class="empty">Пока нет записей.<br>Забронируйте корт — запись появится здесь и на сайте клуба.</div><button class="btn navy wide" type="button" style="margin-top:12px" data-tab="book">Забронировать корт</button>`;
  }
  $('#myList').addEventListener('click', e => {
    if (e.target.closest('[data-tab]')) return show('book');
    const el = e.target.closest('[data-pv],[data-x]'); if (!el) return;
    const b = store.list().find(i => i.id === (el.dataset.pv || el.dataset.x)); if (!b) return;
    if (el.dataset.pv) return sheet(`<h3>Так придёт напоминание</h3><p>Бот напишет за ${S.extras.remindMinutes} минут до начала.</p>${preview(b)}`);
    const s = startOf(b), late = s && (s - new Date()) / 36e5 < S.extras.cancelHours;
    sheet(`<h3>Отменить запись?</h3><p>${b.title}, ${b.when}. ${late ? `До начала меньше ${S.extras.cancelHours} часов — удержим половину стоимости.` : 'Штрафа нет.'}</p><div class="btns"><button class="btn navy wide" type="button" data-ok>Да, отменить</button><button class="btn plain wide" type="button" data-close>Оставить</button></div>`,
      (box, close) => box.querySelector('[data-ok]').addEventListener('click', () => {
        store.save(store.list().filter(i => i.id !== b.id));
        if (API && inTg) fetch(API + '/cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: tg.initData, id: b.id }) }).catch(() => {});
        close(); renderMy(); toast('Запись отменена'); haptic('ok');
      }));
  });

  // ——— вопросы ———
  const HINTS = ['Сколько стоит корт', 'Абик', 'Что взять с собой', 'Ребёнку 6 лет', 'Где парковка', 'Отменить бронь'];
  const mark = (text, q) => { const ws = FAQ.words(q).filter(w => w.length > 2); if (!ws.length) return text; return text.replace(/[А-Яа-яЁё]+/g, w => ws.some(s => w.toLowerCase().replace(/ё/g, 'е').startsWith(s.slice(0, Math.max(3, s.length - 1)))) ? `<mark>${w}</mark>` : w); };
  const qa = (f, open, q) => `<div class="qa${open ? ' open' : ''}"><button type="button" aria-expanded="${open}"><span class="qt">${q ? mark(f.q, q) : f.q}</span><i aria-hidden="true"></i></button><div class="a"><div><p>${f.a}</p></div></div></div>`;
  function renderFaq() {
    const q = $('#q').value.trim();
    $('#hints').innerHTML = q ? '' : HINTS.map(t => `<button type="button">${t}</button>`).join('');
    if (!q) { $('#answers').innerHTML = FAQ.cats.map(c => `<p class="cat">${c}</p>` + FAQ.base.filter(f => f.c === c).map(f => qa(f, false)).join('')).join(''); return; }
    const list = FAQ.search(q);
    $('#answers').innerHTML = list.length ? `<p class="found">Нашли по запросу «${q.replace(/[<>]/g, '')}»</p>` + list.map((f, i) => qa(f, i === 0, q)).join('')
      : `<div class="empty">Не нашли ответ. Спросите администратора — отвечаем в течение 15 минут, с ${C.open}:00 до ${C.close}:00.</div><button class="btn navy wide" type="button" style="margin-top:12px" id="ask">Написать администратору</button>`;
    $('#ask')?.addEventListener('click', () => sheet(`<h3>Это демо</h3><p>В настоящем клубе здесь откроется чат с администратором. Хотите такое приложение для своего клуба — напишите разработчику.</p><div class="btns"><a class="btn ball wide" href="${C.telegram}" target="_blank" rel="noopener">Написать в Telegram</a></div>`));
  }
  let tmr; $('#q').addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(renderFaq, 150); });
  $('#hints').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#q').value = b.textContent; renderFaq(); });
  $('#answers').addEventListener('click', e => { const b = e.target.closest('.qa button'); if (!b) return; const box = b.parentElement, open = !box.classList.contains('open'); document.querySelectorAll('.qa.open').forEach(x => { x.classList.remove('open'); x.querySelector('button').setAttribute('aria-expanded', 'false'); }); if (open) { box.classList.add('open'); b.setAttribute('aria-expanded', 'true'); } haptic(); });

  // ——— клуб ———
  const I = {
    web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    tg: '<svg viewBox="0 0 24 24"><path d="m21 4-18 7 6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    price: '<svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/></svg>',
  };
  function renderClub() {
    const open = hr >= C.open && hr < C.close;
    $('#openNow').className = 'open-now' + (open ? '' : ' closed');
    $('#openNow').innerHTML = `<i aria-hidden="true"></i><span>${open ? `Открыто до ${C.close}:00` : `Закрыто, откроемся в ${C.open}:00`} · каждый день ${C.open}:00–${C.close}:00</span>`;
    $('#links').innerHTML = `
      <a href="${SITE}" data-link>${I.web}<span><b>Сайт клуба</b><small>цены, тренеры, расписание</small></span></a>
      <button type="button" data-call>${I.phone}<span><b>Позвонить</b><small>${C.phone}</small></span></button>
      <a href="${C.telegram}" target="_blank" rel="noopener" data-link>${I.tg}<span><b>Telegram</b><small>@isthisthedaggr</small></span></a>
      <a href="../ceny.html" data-link>${I.price}<span><b>Абонементы</b><small>от ${S.fmt(S.offer('group', 1).price)} в месяц</small></span></a>
      <button type="button" class="wide" data-map>${I.pin}<span><b>${C.city}, ${C.address}</b><small>адрес вымышлен · бесплатная парковка у входа</small></span></button>`;
    $('#crew').innerHTML = S.coaches.map(c => `<div><span style="background-image:url(../${c.img})"></span><b>${c.name}</b><small>${c.role}</small></div>`).join('');
  }
  $('#links').addEventListener('click', e => {
    if (e.target.closest('[data-call]')) return demoCall();
    if (e.target.closest('[data-map]')) return sheet(`<h3>Как добраться</h3><p>${C.city}, ${C.address}. Адрес вымышлен — в настоящем клубе здесь откроется карта с маршрутом.</p>`);
    const a = e.target.closest('[data-link]'); if (!a || !inTg) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    if (API && href.startsWith('..')) {   // сайт клуба — сразу с входом через Telegram
      fetch(API + '/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: tg.initData }) })
        .then(r => r.json()).then(r => openLink(href + (r.session ? '#tg=' + encodeURIComponent(r.session) : ''))).catch(() => openLink(href));
    } else openLink(href);
  });

  // старт: ?tab=faq|my|club открывает нужный раздел (кнопки бота)
  const tab = new URLSearchParams(location.search).get('tab') || tg?.initDataUnsafe?.start_param;
  const setTabH = () => document.documentElement.style.setProperty('--tabh', $('.tabs').offsetHeight + 'px');
  setTabH(); addEventListener('resize', setTabH);
  // брони с сервера бота (в том числе сделанные на сайте) — добавить к своим
  async function syncFromServer() {
    if (!API || !inTg) return;
    try {
      const r = await fetch(API + '/my', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: tg.initData }) });
      const { list } = await r.json(); if (!Array.isArray(list)) return;
      const ids = new Set(list.map(b => b.id));
      const l = store.list().filter(b => !b.srv || ids.has(b.id));          // отменили на сайте — убираем
      const have = new Set(l.map(b => b.id));
      list.forEach(b => { if (!have.has(b.id)) l.push({ ...b, type: 'court', tg: true, srv: true }); });
      const before = JSON.stringify(store.list()); store.save(l);
      if (JSON.stringify(l) !== before && cur === 'my') renderMy();
    } catch (e) { /* без сети — работаем с тем, что есть */ }
  }
  syncFromServer(); setInterval(syncFromServer, 10000); addEventListener('focus', syncFromServer);
  try { tg?.onEvent?.('activated', syncFromServer); } catch (e) {}
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncFromServer(); });
  renderBook(); count(); show(['my', 'faq', 'club'].includes(tab) ? tab : 'book');
})();
