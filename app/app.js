// «Синий корт» — мини-приложение Telegram. Работает и в обычном браузере (демо-режим).
(() => {
  const S = window.SK, FAQ = window.FAQ, $ = s => document.querySelector(s);
  const tg = window.Telegram?.WebApp;
  const inTg = !!(tg && tg.initData);
  // адрес сервера напоминаний (Cloudflare Worker). Пусто — работаем только в браузере.
  const API = '';

  if (inTg) {
    tg.ready(); tg.expand();
    try { tg.setHeaderColor('#E7EBEF'); tg.setBackgroundColor('#E7EBEF'); } catch (e) {}
    $('#demoTag').hidden = true;
  }
  const user = tg?.initDataUnsafe?.user;
  const h = new Date().getHours();
  $('#hello').textContent = `${h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'}${user?.first_name ? ', ' + user.first_name : ''}`;
  const haptic = t => { try { tg?.HapticFeedback?.[t === 'ok' ? 'notificationOccurred' : 'selectionChanged'](t === 'ok' ? 'success' : undefined); } catch (e) {} };
  addEventListener('keydown', e => { if (e.key === 'Tab') document.documentElement.classList.add('kbd'); });
  addEventListener('pointerdown', () => document.documentElement.classList.remove('kbd'));

  // ——— хранилище: общее с сайтом ———
  const BK = 'sk_bookings_v1';
  const store = {
    list() { try { return JSON.parse(localStorage.getItem(BK)) || []; } catch (e) { return []; } },
    save(l) { try { localStorage.setItem(BK, JSON.stringify(l)); } catch (e) {} count(); },
  };
  const count = () => { const n = store.list().length; $('#cnt').textContent = n; $('#cnt').hidden = !n; };

  // ——— окна снизу и подсказки ———
  function sheet(html, onOpen) {
    const el = document.createElement('div'); el.className = 'sheet';
    el.innerHTML = `<div class="sheet-box" role="dialog" aria-modal="true">${html}</div>`;
    $('#layer').appendChild(el);
    const close = () => { el.remove(); tg?.BackButton?.hide(); };
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) close(); });
    tg?.BackButton?.show(); tg?.BackButton?.onClick(close);
    onOpen?.(el, close);
    return close;
  }
  function toast(t) { document.querySelector('.toast')?.remove(); const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 2800); }

  // ——— вкладки ———
  function show(s) {
    document.querySelectorAll('.screen').forEach(x => x.hidden = x.id !== 's-' + s);
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
    if (s === 'my') renderMy();
    if (s === 'faq') renderFaq();
    $('#app').scrollTo?.({ top: 0 }); scrollTo({ top: 0 });
    haptic();
  }
  $('.tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.s); });

  // ——— бронь ———
  const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const human = s => { const d = new Date(s + 'T00:00'); return `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`; };
  const isWe = s => [0, 6].includes(new Date(s + 'T00:00').getDay());
  const todayIso = iso(new Date());
  const hoursOf = day => [...Array(S.club.close - S.club.open)].map((_, i) => S.club.open + i).filter(x => day !== todayIso || x > new Date().getHours());
  const freeOf = (day, c) => hoursOf(day).filter(x => !S.busy(day, c, x));
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return iso(d); }).filter(d => S.courts.some(c => freeOf(d, c.id).length));
  const st = { day: days[0], court: null, hours: [], mode: 'solo', coach: 'igor' };
  const pickCourt = () => { st.court = S.courts.slice().sort((a, b) => freeOf(st.day, b.id).length - freeOf(st.day, a.id).length)[0].id; };
  pickCourt();

  function renderDays() {
    $('#days').innerHTML = days.map((d, i) => { const x = new Date(d + 'T00:00'); return `<button type="button" class="${d === st.day ? 'on' : ''}${isWe(d) ? ' we' : ''}" data-d="${d}"><small>${d === todayIso ? 'сегодня' : WD[x.getDay()]}</small><b>${x.getDate()}</b><small>${MON[x.getMonth()].slice(0, 3)}</small></button>`; }).join('');
  }
  function renderCourts() {
    $('#courts').innerHTML = S.courts.map(c => { const n = freeOf(st.day, c.id).length; return `<button type="button" class="${c.id === st.court ? 'on' : ''}" data-c="${c.id}"${n ? '' : ' disabled'}><span class="ph" style="background-image:url(../${c.img})"></span><span class="in"><b>${c.name}</b><small>${n ? 'свободно ' + n + ' ч' : 'занят'}</small></span></button>`; }).join('');
  }
  function renderSlots() {
    const hs = hoursOf(st.day), w = isWe(st.day);
    $('#timeNote').textContent = 'можно несколько подряд';
    $('#slots').innerHTML = hs.length ? hs.map(x => { const b = S.busy(st.day, st.court, x), on = st.hours.includes(x); return `<button type="button" class="${on ? 'on' : ''}" data-h="${x}"${b ? ' disabled' : ''}>${x}:00<small>${b ? 'занят' : S.fmt(S.rateFor(x, w)).replace(' ₽', '')}</small></button>`; }).join('') : '<div class="empty">Сегодня часы закончились — выберите другой день</div>';
  }
  function renderCoaches() {
    $('#coaches').hidden = st.mode !== 'coach';
    $('#coaches').innerHTML = S.coaches.map(c => `<button type="button" class="${c.id === st.coach ? 'on' : ''}" data-co="${c.id}"><span class="av" style="background-image:url(../${c.img})"></span><span><b>${c.name}</b><small>${c.role}</small></span></button>`).join('');
  }
  const calc = () => { const w = isWe(st.day), court = st.hours.reduce((s, x) => s + S.rateFor(x, w), 0); return st.mode === 'partner' ? Math.round(court / 2) : court + (st.mode === 'coach' ? S.extras.coach * st.hours.length : 0); };
  function renderSum() {
    const bar = $('#sumbar');
    if (!st.hours.length) { bar.className = 'sumbar off'; bar.innerHTML = `<div><small>${S.courts.find(c => c.id === st.court).name}, ${human(st.day)}</small><b>Выберите время</b></div>`; tg?.MainButton?.hide(); return; }
    const from = st.hours[0], to = st.hours[st.hours.length - 1] + 1;
    bar.className = 'sumbar';
    bar.innerHTML = `<div><small>${S.courts.find(c => c.id === st.court).name}, ${from}:00–${to}:00</small><b>${S.fmt(calc())}</b></div>${inTg ? '' : '<button class="btn ball" type="button" id="go">Забронировать</button>'}`;
    $('#go')?.addEventListener('click', confirm);
    if (inTg) { tg.MainButton.setParams({ text: `Забронировать · ${S.fmt(calc())}`, color: '#D8F04A', text_color: '#132230' }); tg.MainButton.show(); }
  }
  if (inTg) tg.MainButton.onClick(() => confirm());
  const renderBook = () => { renderDays(); renderCourts(); renderSlots(); renderCoaches(); renderSum(); };

  $('#days').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.day = b.dataset.d; st.hours = []; if (!freeOf(st.day, st.court).length) pickCourt(); haptic(); renderBook(); });
  $('#courts').addEventListener('click', e => { const b = e.target.closest('button:not([disabled])'); if (!b) return; st.court = +b.dataset.c; st.hours = []; haptic(); renderBook(); });
  $('#slots').addEventListener('click', e => {
    const b = e.target.closest('button:not([disabled])'); if (!b) return; const x = +b.dataset.h;
    if (st.hours.includes(x)) st.hours = x === st.hours[0] || x === st.hours[st.hours.length - 1] ? st.hours.filter(y => y !== x) : [x];
    else if (st.hours.length && (x === st.hours[st.hours.length - 1] + 1 || x === st.hours[0] - 1)) st.hours.push(x);
    else st.hours = [x];
    st.hours.sort((a, c) => a - c); haptic(); renderSlots(); renderSum();
  });
  $('#mode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#mode .on').classList.remove('on'); b.classList.add('on'); st.mode = b.dataset.m; haptic(); renderCoaches(); renderSum(); });
  $('#coaches').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.coach = b.dataset.co; renderCoaches(); });

  function confirm() {
    if (!st.hours.length) return;
    const c = S.courts.find(x => x.id === st.court), from = st.hours[0], to = st.hours[st.hours.length - 1] + 1, price = calc();
    const known = user?.first_name || (() => { try { return localStorage.getItem('sk_name') || ''; } catch (e) { return ''; } })();
    sheet(`<h3>${c.name}, ${human(st.day)}</h3><p>${from}:00–${to}:00${st.mode === 'coach' ? ' · тренер ' + S.coachById(st.coach).name : st.mode === 'partner' ? ' · подберём партнёра, корт пополам' : ''}</p>
      <ul><li><span>К оплате на месте</span><span>${S.fmt(price)}</span></li><li><span>Ракетка и мячи</span><span>бесплатно</span></li><li><span>Отмена без штрафа</span><span>за ${S.extras.cancelHours} часов</span></li><li><span>Напоминание</span><span>за ${S.extras.remindMinutes} минут</span></li></ul>
      <form novalidate><label class="field"><span>Как к вам обращаться</span><input name="name" value="${known}" placeholder="Например, Анна" autocomplete="given-name"><em class="e" hidden></em></label>
      <div class="btns"><button class="btn ball wide" type="submit">Подтвердить бронь</button><button class="btn plain wide" type="button" data-close>Изменить</button></div></form>`,
      (el, close) => {
        const f = el.querySelector('form');
        f.addEventListener('submit', async e => {
          e.preventDefault();
          const name = f.name.value.trim();
          if (name.length < 2) { const er = f.querySelector('.e'); er.hidden = false; er.textContent = 'Напишите имя — тренер поздоровается с вами'; f.name.focus(); return; }
          try { localStorage.setItem('sk_name', name); } catch (er) {}
          const b = { id: Date.now().toString(36), type: 'court', title: `${c.name}${st.mode === 'coach' ? ' с тренером' : st.mode === 'partner' ? ' и партнёр по уровню' : ''}`, when: `${human(st.day)}, ${from}:00–${to}:00`, date: st.day, from, price, name, tg: true, src: 'app' };
          const l = store.list(); l.push(b); store.save(l);
          if (API && inTg) { try { await fetch(API + '/book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: tg.initData, booking: b }) }); } catch (er) { /* запись осталась в приложении */ } }
          close(); haptic('ok'); st.hours = []; renderBook();
          sheet(`<h3>Готово, ${name}!</h3><p>${b.title}, ${b.when}. За ${S.extras.remindMinutes} минут бот пришлёт напоминание — вот такое:</p>${preview(b)}<div class="btns"><button class="btn navy wide" type="button" data-close data-go="my">Мои записи</button><button class="btn plain wide" type="button" data-close>Забронировать ещё</button></div>`,
            el2 => el2.querySelector('[data-go]').addEventListener('click', () => show('my')));
        });
      });
  }

  // пример сообщения бота
  function preview(b) {
    const t = b.from != null ? `${String(b.from - 1).padStart(2, '0')}:30` : '';
    return `<div class="chat"><div class="msg"><b>Синий корт</b>Через 30 минут ваша игра 🎾<br>${b.title}, ${b.when.split(', ').slice(-1)[0]}.<br>Возьмите кроссовки со светлой подошвой — ракетку дадим.<div class="kb"><span>Отменить</span><span>Как добраться</span></div><time>${t}</time></div></div>`;
  }

  // ——— мои записи ———
  function renderMy() {
    const l = store.list().slice().reverse();
    $('#myList').innerHTML = l.length ? l.map(b => `<div class="bk"><span class="tag">${b.type === 'court' ? 'Корт' : b.type === 'group' ? 'Группа' : 'Абонемент'}</span><b>${b.title}</b><small>${b.when}</small><small>${S.fmt(b.price)} · оплата на месте</small>${b.tg && b.type !== 'abon' ? '<div class="rem">Напомним в Telegram за 30 минут</div>' : ''}
      <div class="row">${b.type !== 'abon' ? `<button class="btn plain" type="button" data-pv="${b.id}">Пример напоминания</button>` : ''}<button class="btn plain" type="button" data-x="${b.id}">Отменить</button></div></div>`).join('')
      : `<div class="empty">Пока нет записей.<br>Забронируйте корт — запись появится здесь и на сайте клуба.</div><button class="btn navy wide" type="button" style="margin-top:12px" data-tab="book">Забронировать корт</button>`;
  }
  $('#myList').addEventListener('click', e => {
    if (e.target.closest('[data-tab]')) return show('book');
    const pv = e.target.closest('[data-pv]'), x = e.target.closest('[data-x]');
    const b = store.list().find(i => i.id === (pv || x)?.dataset.pv || i.id === (pv || x)?.dataset.x); if (!b) return;
    if (pv) return sheet(`<h3>Так придёт напоминание</h3><p>Бот напишет за ${S.extras.remindMinutes} минут до начала.</p>${preview(b)}<div class="btns"><button class="btn plain wide" type="button" data-close>Понятно</button></div>`);
    let late = false; if (b.date && b.from != null) { const s = new Date(b.date + 'T00:00'); s.setHours(b.from); late = (s - new Date()) / 36e5 < S.extras.cancelHours; }
    sheet(`<h3>Отменить запись?</h3><p>${b.title}, ${b.when}. ${late ? `До начала меньше ${S.extras.cancelHours} часов — удержим половину стоимости.` : 'Штрафа нет.'}</p><div class="btns"><button class="btn navy wide" type="button" data-ok>Да, отменить</button><button class="btn plain wide" type="button" data-close>Оставить</button></div>`,
      (el, close) => el.querySelector('[data-ok]').addEventListener('click', () => { store.save(store.list().filter(i => i.id !== b.id)); if (API && inTg) fetch(API + '/cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: tg.initData, id: b.id }) }).catch(() => {}); close(); renderMy(); toast('Запись отменена'); haptic('ok'); }));
  });

  // ——— вопросы ———
  const HINTS = ['Сколько стоит корт', 'Абик', 'Что взять с собой', 'Ребёнку 6 лет', 'Где парковка', 'Отменить бронь'];
  const mark = (text, q) => { const ws = FAQ.words(q).filter(w => w.length > 2); if (!ws.length) return text; return text.replace(/[А-Яа-яЁё]+/g, w => ws.some(s => w.toLowerCase().replace(/ё/g, 'е').startsWith(s.slice(0, Math.max(3, s.length - 1)))) ? `<mark>${w}</mark>` : w); };
  function renderFaq() {
    const q = $('#q').value.trim();
    $('#hints').innerHTML = q ? '' : HINTS.map(t => `<button type="button">${t}</button>`).join('');
    const list = q ? FAQ.search(q) : FAQ.base.slice(0, 8);
    $('#answers').innerHTML = (q ? `<p class="found">${list.length ? 'Нашли по запросу «' + q.replace(/</g, '') + '»' : ''}</p>` : '<p class="found">Частые вопросы</p>')
      + (list.length ? list.map((f, i) => `<div class="qa${q && i === 0 ? ' open' : ''}"><button type="button">${q ? mark(f.q, q) : f.q}<i aria-hidden="true"></i></button><div class="a"><div><p>${f.a}</p></div></div></div>`).join('')
        : `<div class="empty">Не нашли ответ. Спросите администратора — ответит в течение 15 минут, с 7:00 до 23:00.</div><button class="btn navy wide" type="button" style="margin-top:12px" id="ask">Написать администратору</button>`);
    $('#ask')?.addEventListener('click', () => sheet(`<h3>Это демо</h3><p>В настоящем клубе здесь откроется чат с администратором. Хотите такое приложение для своего клуба — напишите разработчику.</p><div class="btns"><a class="btn ball wide" href="${S.club.telegram}" target="_blank" rel="noopener">Написать в Telegram</a><button class="btn plain wide" type="button" data-close>Закрыть</button></div>`));
  }
  let tmr; $('#q').addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(renderFaq, 150); });
  $('#hints').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#q').value = b.textContent; renderFaq(); });
  $('#answers').addEventListener('click', e => { const b = e.target.closest('.qa button'); if (!b) return; const qa = b.parentElement, open = !qa.classList.contains('open'); document.querySelectorAll('.qa.open').forEach(x => x.classList.remove('open')); if (open) qa.classList.add('open'); haptic(); });

  // старт: ?tab=faq|my открывает нужный раздел (кнопки бота)
  const tab = new URLSearchParams(location.search).get('tab') || tg?.initDataUnsafe?.start_param;
  renderBook(); count(); show(['my', 'faq'].includes(tab) ? tab : 'book');
})();
