// «Синий корт» — общее для всех страниц: шапка, подвал, окна, меню, появление при прокрутке
(() => {
  const S = window.SK, C = S.club;
  const page = document.body.dataset.page || '';
  const root = document.body.dataset.root || '';   // для 404: '/'
  const u = p => root + p;
  const NAV = [
    ['home', 'index.html', 'Главная'], ['bron', 'bron.html', 'Бронь корта'], ['raspisanie', 'raspisanie.html', 'Расписание'],
    ['trenery', 'trenery.html', 'Тренеры'], ['ceny', 'ceny.html', 'Цены'],
  ];
  const ico = {
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  };

  // ——— хранилище записей посетителя ———
  const BK = 'sk_bookings_v1';
  const store = {
    list() { try { return JSON.parse(localStorage.getItem(BK)) || []; } catch (e) { return []; } },
    save(l) { try { localStorage.setItem(BK, JSON.stringify(l)); } catch (e) {} updateCount(); },
    add(b) { const l = store.list(); b.id = Date.now().toString(36); l.push(b); store.save(l); return b; },
    remove(id) { store.save(store.list().filter(b => b.id !== id)); },
  };
  function updateCount() { document.querySelectorAll('[data-count]').forEach(el => { const n = store.list().length; el.textContent = n; el.hidden = !n; }); }

  // ——— шапка ———
  const navHtml = NAV.map(([id, href, t]) => `<a href="${u(href)}"${id === page ? ' class="on" aria-current="page"' : ''}>${t}</a>`).join('');
  const header = `
  <div class="demo">Демо-сайт для портфолио · клуб вымышленный</div>
  <header class="hdr" id="top">
    <div class="hdr-main wrap">
      <a class="logo" href="${u('index.html')}" aria-label="${C.name}, на главную"><i class="tball"></i>${C.name}</a>
      <nav class="nav" aria-label="Разделы">${navHtml}</nav>
      <a class="mybtn" href="${u('bron.html#my')}" aria-label="Мои записи">${ico.cal}<span class="t">Мои записи</span><b data-count hidden>0</b></a>
      <a class="btn ball hdr-cta" href="${u('bron.html')}"><span class="t">Забронировать</span><span class="arr">↗</span></a>
      <button class="burger" type="button" aria-label="Открыть меню" aria-expanded="false"><span></span><span></span></button>
    </div>
  </header>
  <div class="mmenu" aria-hidden="true">
    ${NAV.map(([id, href, t]) => `<a href="${u(href)}"${id === page ? ' class="on"' : ''}>${t}<span>→</span></a>`).join('')}
    <a href="${u('bron.html#my')}">Мои записи<span class="mm-count" data-count hidden>0</span></a>
    <div class="mm-info">Каждый день ${C.open}:00–${C.close}:00<br>${C.city}, ${C.address} · адрес вымышлен<br><a href="#" data-call>${C.phone}</a></div>
    <a class="btn ball" href="${u('bron.html')}">Забронировать корт <span class="arr">↗</span></a>
  </div>`;
  const footer = `
  <footer>
    <div class="f-top">
      <h3>Корт, тренер и партнёр — <br><span>бронь за минуту, напоминание в Telegram.</span> <br><em>Начните с пробного</em></h3>
      <div><nav class="f-nav" aria-label="Разделы">${NAV.map(([, href, t]) => `<a href="${u(href)}">${t}</a>`).join('')}</nav>
        <div class="f-grid">
          <div><small>Адрес</small>${C.city}, ${C.address} (адрес вымышлен)</div>
          <div><small>Телефон</small><a href="#" data-call>${C.phone}</a></div>
          <div><small>Каждый день</small>${C.open}:00–${C.close}:00</div>
          <div><small>Почта</small>${C.email}</div>
        </div>
        <a class="f-owner" href="${u('app/')}">Мини-приложение в Telegram: бронь в три касания →</a><br>
        <a class="f-owner" href="${u('kabinet.html')}">Как владелец меняет абонементы и видит заявки →</a>
      </div>
    </div>
    <div class="f-info"><span>${ico.pin}${C.city}, ${C.address} · адрес вымышлен</span><span>${ico.clock}Каждый день ${C.open}:00–${C.close}:00</span><a href="#" data-call>${ico.phone}${C.phone}</a></div>
    <div class="f-word" aria-hidden="true">${C.name}</div>
    <div class="f-bot"><span>© 2026 «${C.name}» — демо-сайт для портфолио, клуб вымышленный</span><button class="arr" type="button" data-up aria-label="Наверх">↑</button></div>
  </footer>`;
  document.getElementById('hdr')?.insertAdjacentHTML('afterbegin', header);
  document.getElementById('ftr')?.insertAdjacentHTML('afterbegin', footer);
  updateCount();

  // ——— окна ———
  let lastFocus = null;
  function modal(html, { onOpen } = {}) {
    lastFocus = document.activeElement;
    const m = document.createElement('div');
    m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = `<div class="modal-box"><button class="modal-x" type="button" aria-label="Закрыть">×</button>${html}</div>`;
    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';
    const close = () => { m.remove(); document.body.style.overflow = ''; lastFocus?.focus?.({ preventScroll: true }); };
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('.modal-x,[data-close]')) close(); });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    m.querySelector('.modal-box').setAttribute('tabindex', '-1');
    m.querySelector('.modal-box').focus({ preventScroll: true });
    onOpen?.(m, close);
    return close;
  }
  function confirmBox(title, text, okText, onOk) {
    modal(`<h3>${title}</h3><p>${text}</p><div class="modal-btns"><button class="btn navy" type="button" data-ok>${okText} <span class="arr">↗</span></button><button class="btn plain" type="button" data-close>Оставить</button></div>`,
      { onOpen: (m, close) => m.querySelector('[data-ok]').addEventListener('click', () => { close(); onOk(); }) });
  }
  function toast(t) {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = t;
    document.body.appendChild(el); setTimeout(() => el.remove(), 3200);
  }
  // Форма «имя + телефон» для записи в группу и абонемента
  function contactForm(title, text, onDone) {
    modal(`<h3>${title}</h3><p>${text}</p><form novalidate>
      <label class="field"><span>Как к вам обращаться</span><input name="name" autocomplete="given-name" placeholder="Например, Анна"><em class="e" hidden></em></label>
      <label class="field"><span>Телефон</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 или +375"><em class="e" hidden></em></label>
      <label class="check" style="margin-bottom:var(--s3)"><input type="checkbox" name="tg" checked><span>Напомнить в Telegram за ${S.extras.remindMinutes} минут</span></label>
      <button class="btn navy" type="submit">Записаться <span class="arr">↗</span></button></form>`,
      { onOpen: (m, close) => { const f = m.querySelector('form'); phoneMask(f.phone); f.addEventListener('submit', e => { e.preventDefault(); if (!validate(f)) return; close(); onDone({ name: f.name.value.trim(), phone: f.phone.value, tg: f.tg.checked }); }); } });
  }
  // Телефон: Россия +7 (XXX) XXX-XX-XX или Беларусь +375 (XX) XXX-XX-XX
  const isBy = d => d.startsWith('375') || d.startsWith('80');
  function phoneMask(inp) {
    inp.addEventListener('input', () => {
      let d = inp.value.replace(/\D/g, '');
      if (!d) { inp.value = ''; return; }
      if (d.startsWith('80') && !inp.value.trim().startsWith('+')) d = '375' + d.slice(2);   // белорусский 80…
      if (isBy(d) || '375'.startsWith(d)) {
        d = d.slice(0, 12); const p = d.slice(3); let r = '+' + d.slice(0, 3);
        if (p.length) r += ' (' + p.slice(0, 2); if (p.length >= 2) r += ')'; if (p.length > 2) r += ' ' + p.slice(2, 5);
        if (p.length > 5) r += '-' + p.slice(5, 7); if (p.length > 7) r += '-' + p.slice(7, 9);
        inp.value = r; return;
      }
      if (d.startsWith('8')) d = '7' + d.slice(1); if (!d.startsWith('7')) d = '7' + d; d = d.slice(0, 11);
      const p = d.slice(1); let r = '+7';
      if (p.length) r += ' (' + p.slice(0, 3); if (p.length >= 3) r += ')'; if (p.length > 3) r += ' ' + p.slice(3, 6);
      if (p.length > 6) r += '-' + p.slice(6, 8); if (p.length > 8) r += '-' + p.slice(8, 10);
      inp.value = r;
    });
  }
  const phoneOk = v => { const d = v.replace(/\D/g, ''); return d.startsWith('375') ? d.length === 12 : d.length === 11; };
  function validate(f) {
    let ok = true;
    const set = (inp, msg) => { const fl = inp.closest('.field'); fl.classList.toggle('err', !!msg); const e = fl.querySelector('.e'); e.hidden = !msg; e.textContent = msg || ''; if (msg && ok) inp.focus(); if (msg) ok = false; };
    if (f.name) set(f.name, f.name.value.trim().length < 2 ? 'Напишите имя — так тренер поздоровается с вами' : '');
    if (f.phone) set(f.phone, !phoneOk(f.phone.value) ? 'Номер неполный: после +7 нужно 10 цифр, после +375 — 9' : '');
    return ok;
  }

  // Плашка «сайт для портфолио»: при входе на сайт (пришли не с его страниц) и при обновлении страницы
  const nav = performance.getEntriesByType?.('navigation')[0];
  const fromInside = document.referrer && new URL(document.referrer).origin === location.origin;
  const entered = !fromInside || nav?.type === 'reload';
  if (page !== 'notfound' && entered && !location.search.includes('chk=1')) {
    setTimeout(() => modal(`<i class="tball" aria-hidden="true"></i><h3>Это сайт для портфолио</h3><p>Теннисный клуб «${C.name}» вымышленный. Бронь, запись и абонементы здесь работают, но не по-настоящему: они только показывают, как это выглядит у клуба. Никто не приедет, деньги не спишутся.</p>
        <div class="modal-btns"><button class="btn ball" type="button" data-close>Понятно, смотреть сайт <span class="arr">↗</span></button><a class="btn plain" href="${C.telegram}" target="_blank" rel="noopener">Хочу такой сайт</a></div>`), 500);
  }
  // обводка фокуса — только для клавиатуры
  addEventListener('keydown', e => { if (e.key === 'Tab') document.documentElement.classList.add('kbd'); });
  addEventListener('pointerdown', () => document.documentElement.classList.remove('kbd'));
  // неразрывные пробелы после коротких слов и перед тире — фразы не разрываются
  const SHORT = /(^|[\s(«])(в|во|и|с|со|к|ко|у|о|об|а|на|до|за|по|от|не|ни|из|для|без|под|над|при|про|раз|до|что|как|или|но|уже|ваш|вас|вам)\s/gi;
  const typo = root => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement?.closest('script,style,textarea,input') ? 2 : 1 }); let n; while ((n = w.nextNode())) { const v = n.data.replace(SHORT, (m, a, b) => a + b + ' ').replace(/ (—|–)/g, ' $1').replace(/(\d) (₽|часов|часа|час|минут|мин|человек|занятий|занятия|м)/g, '$1 $2'); if (v !== n.data) n.data = v; } };
  typo(document.body);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(x => x.nodeType === 1 ? typo(x) : x.nodeType === 3 && x.parentElement && typo(x.parentElement)))).observe(document.body, { childList: true, subtree: true });
  // Звонок — клуб вымышленный
  document.addEventListener('click', e => {
    const call = e.target.closest('[data-call]');
    if (call) { e.preventDefault(); modal(`<h3>Позвонить не получится</h3><p>Клуб вымышленный, номер ненастоящий. Хотите такой же сайт для своего клуба — напишите в Telegram.</p><div class="modal-btns"><a class="btn ball" href="${C.telegram}" target="_blank" rel="noopener">Написать в Telegram <span class="arr">↗</span></a></div>`); }
    if (e.target.closest('[data-up]')) window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ——— меню: раскрывается кругом из кнопки, две палки → крестик ———
  const menu = document.querySelector('.mmenu');
  const burger = document.querySelector('.hdr .burger');
  const setMenu = open => {
    const r = burger.getBoundingClientRect();
    menu.style.setProperty('--mx', r.left + r.width / 2 + 'px'); menu.style.setProperty('--my', r.top + r.height / 2 + 'px');
    menu.classList.toggle('open', open); menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open); document.body.style.overflow = open ? 'hidden' : '';
    burger.classList.toggle('on', open); burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.querySelectorAll('a').forEach(a => a.tabIndex = open ? 0 : -1);
  };
  setMenu(false);
  burger?.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu?.addEventListener('click', e => { if (e.target.closest('a[href]') && !e.target.closest('[data-call]')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
  addEventListener('resize', () => { if (innerWidth > 1060 && menu.classList.contains('open')) setMenu(false); });

  // Шапка с тенью при прокрутке
  const hdr = document.querySelector('.hdr');
  const onScroll = () => hdr?.classList.toggle('stuck', scrollY > 60);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ——— цены из модели ———
  const priceMap = { 'court-min': S.minCourt, 'coach-min': S.minCoach, trial: S.extras.trial, tournament: S.extras.tournament, coach: S.extras.coach };
  document.querySelectorAll('[data-price]').forEach(el => {
    const k = el.dataset.price; const v = priceMap[k] ?? S.abonById(k)?.price;
    if (v != null) el.textContent = S.fmt(v);
  });
  document.querySelectorAll('[data-x]').forEach(el => { const v = S.extras[el.dataset.x]; if (v != null) el.textContent = v; });

  // ——— вопросы: открыт только один ———
  const faqBox = document.querySelector('[data-faq]');
  if (faqBox) {
    const half = Math.ceil(S.faq.length / 2);
    const item = (f, i) => `<div class="q${i === 1 ? ' open' : ''}"><button type="button" aria-expanded="${i === 1}" aria-controls="qa${i}" id="qq${i}">${f.q}<span class="pm" aria-hidden="true"></span></button><div class="a" id="qa${i}" role="region" aria-labelledby="qq${i}"><div><p>${f.a}</p></div></div></div>`;
    faqBox.innerHTML = `<div class="col">${S.faq.slice(0, half).map((f, i) => item(f, i)).join('')}</div><div class="col">${S.faq.slice(half).map((f, i) => item(f, i + half)).join('')}</div>`;
    faqBox.addEventListener('click', e => {
      const b = e.target.closest('.q button'); if (!b) return;
      const q = b.parentElement, open = !q.classList.contains('open');
      faqBox.querySelectorAll('.q.open').forEach(o => { o.classList.remove('open'); o.querySelector('button').setAttribute('aria-expanded', 'false'); });
      if (open) { q.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
    });
  }

  // ——— появление при прокрутке ———
  function reveal(scope = document) {
    const els = scope.querySelectorAll('[data-rv], .sec > *, .tile, .row, a.card, .q, .banner, .phead, footer, .g, .coach, .ab, .bk, .li');
    const show = el => { el.classList.add('in'); el.addEventListener('animationend', () => { el.classList.remove('rv', 'in'); el.style.removeProperty('--d'); }, { once: true }); };
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .06 }) : null;
    els.forEach(el => {
      if (el.dataset.rvd || el.closest('.modal,.mmenu,.rv')) return;
      el.dataset.rvd = '1';
      const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      el.classList.add('rv'); el.style.setProperty('--d', Math.min(sib, 5) * 70 + 'ms');
      if (io) io.observe(el); else show(el);
    });
  }
  reveal();

  // ——— вход через Telegram и общие записи с ботом ———
  const TGK = 'sk_tg';
  const tgUser = () => { try { return JSON.parse(localStorage.getItem(TGK)); } catch (e) { return null; } };
  const api = (path, body) => fetch(C.api + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.ok ? r.json() : Promise.reject(r.status));
  async function sync() {
    const u = tgUser(); if (!u) return;
    try {
      const { list } = await api('/my', { login: u }); if (!Array.isArray(list)) return;
      const ids = new Set(list.map(b => b.id));
      const local = store.list().filter(b => !b.srv || ids.has(b.id));       // запись отменили в Telegram — убираем
      const have = new Set(local.map(b => b.id));
      list.forEach(b => { if (!have.has(b.id)) local.push({ ...b, type: 'court', tg: true, srv: true }); });
      store.save(local); document.dispatchEvent(new Event('sk-sync'));
    } catch (e) { if (e === 401) { try { localStorage.removeItem(TGK); } catch (er) {} } }
  }
  async function pushBooking(b) {
    const u = tgUser(); if (!u) return false;
    try { await api('/book', { login: u, booking: b }); store.save(store.list().map(x => x.id === b.id ? { ...x, srv: true } : x)); return true; } catch (e) { return false; }
  }
  async function cancelBooking(b) { const u = tgUser(); if (u && b.srv) try { await api('/cancel', { login: u, id: b.id }); } catch (e) {} }
  // официальная кнопка «Войти через Telegram»
  function loginButton(box) {
    if (!box) return;
    const u = tgUser();
    if (u) { box.innerHTML = `<div class="tg-in"><span class="tg-dot"></span>Вы вошли через Telegram как <b>${String(u.first_name || '').replace(/</g, '')}</b> — записи общие с ботом <button type="button" class="tg-out">Выйти</button></div>`; box.querySelector('.tg-out').onclick = () => { try { localStorage.removeItem(TGK); } catch (e) {} loginButton(box); }; return; }
    box.innerHTML = '<div class="tg-login"><p>Войдите через Telegram — брони с сайта и из бота будут общими, напоминание придёт само.</p><div class="tg-w"></div></div>';
    const s = document.createElement('script'); s.async = true; s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.setAttribute('data-telegram-login', C.bot); s.setAttribute('data-size', 'large'); s.setAttribute('data-radius', '20');
    s.setAttribute('data-onauth', 'SKUI.onTelegramAuth(user)'); s.setAttribute('data-request-access', 'write');
    box.querySelector('.tg-w').appendChild(s);
  }
  async function onTelegramAuth(user) {
    try { localStorage.setItem(TGK, JSON.stringify(user)); } catch (e) {}
    // брони, сделанные на этом сайте до входа, отправляем в бот
    for (const b of store.list().filter(x => x.type === 'court' && !x.srv)) await pushBooking(b);
    await sync(); document.querySelectorAll('[data-tglogin]').forEach(loginButton); toast(`Готово, ${user.first_name}! Записи связаны с Telegram`);
  }
  sync(); setInterval(sync, 20000); document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });

  window.SKUI = { tgUser, sync, pushBooking, cancelBooking, loginButton, onTelegramAuth, modal, confirmBox, toast, contactForm, phoneMask, validate, store, reveal, u };
})();
