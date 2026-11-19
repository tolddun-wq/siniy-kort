// Бронь корта: календарь → корт → время → формат → контакты → подтверждение
(() => {
  const S = window.SK, UI = window.SKUI;
  const $ = s => document.querySelector(s);
  const qs = new URLSearchParams(location.search);
  const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MONN = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const human = s => { const d = new Date(s + 'T00:00'); return `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`; };
  const isWeekend = s => [0, 6].includes(new Date(s + 'T00:00').getDay());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = iso(today);
  const lastDay = new Date(today); lastDay.setDate(today.getDate() + 30);   // бронь на 30 дней вперёд

  const hoursOf = day => [...Array(S.club.close - S.club.open)].map((_, i) => S.club.open + i).filter(h => day !== todayIso || h > new Date().getHours());
  const freeOf = (day, courtId) => hoursOf(day).filter(h => !S.busy(day, courtId, h));
  const freeDay = day => S.courts.reduce((n, c) => n + freeOf(day, c.id).length, 0);

  const firstDay = freeDay(todayIso) >= 4 ? todayIso : iso(new Date(today.getTime() + 864e5));
  const st = { day: firstDay, court: 2, hours: [], mode: qs.get('partner') ? 'partner' : qs.get('coach') ? 'coach' : 'solo',
    coach: S.coachById(qs.get('coach')) ? qs.get('coach') : 'igor', level: 'Играю иногда', month: new Date(firstDay + 'T00:00').getMonth() };
  st.court = S.courts.slice().sort((a, b) => freeOf(st.day, b.id).length - freeOf(st.day, a.id).length)[0].id;

  // ——— календарь ———
  function renderCal() {
    const y = st.month < today.getMonth() ? today.getFullYear() + 1 : today.getFullYear();
    const first = new Date(y, st.month, 1), shift = (first.getDay() + 6) % 7, days = new Date(y, st.month + 1, 0).getDate();
    const canPrev = !(y === today.getFullYear() && st.month === today.getMonth());
    const canNext = new Date(y, st.month + 1, 1) <= lastDay;
    let cells = '';
    for (let i = 0; i < shift; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const dt = new Date(y, st.month, d), s = iso(dt), off = dt < today || dt > lastDay;
      const free = off ? 0 : freeDay(s), lvl = free > 20 ? 'hi' : free > 0 ? 'lo' : '';
      cells += `<button type="button" class="${s === st.day ? 'on ' : ''}${s === todayIso ? 'today ' : ''}${[0, 6].includes(dt.getDay()) ? 'we' : ''}" data-d="${s}"${off || !free ? ' disabled' : ''} aria-label="${human(s)}${off ? '' : `, свободно ${free} ч`}">${d}${lvl ? `<i class="dot ${lvl}"></i>` : ''}</button>`;
    }
    $('#cal').innerHTML = `<div class="cal-h"><button type="button" class="cal-nav" data-m="-1"${canPrev ? '' : ' disabled'} aria-label="Предыдущий месяц">‹</button><b>${MONN[st.month]} ${y}</b><button type="button" class="cal-nav" data-m="1"${canNext ? '' : ' disabled'} aria-label="Следующий месяц">›</button></div>
      <div class="cal-w">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(w => `<span>${w}</span>`).join('')}</div><div class="cal-g">${cells}</div>`;
  }
  $('#cal').addEventListener('click', e => {
    const m = e.target.closest('.cal-nav:not([disabled])');
    if (m) { st.month = (st.month + +m.dataset.m + 12) % 12; renderCal(); return; }
    const b = e.target.closest('button[data-d]:not([disabled])'); if (!b) return;
    st.day = b.dataset.d; st.hours = [];
    if (!freeOf(st.day, st.court).length) st.court = S.courts.slice().sort((a, c) => freeOf(st.day, c.id).length - freeOf(st.day, a.id).length)[0].id;
    renderAll();
  });

  // ——— корты: большие фото, увеличение ———
  function renderCourts() {
    $('#courts').innerHTML = S.courts.map(c => {
      const n = freeOf(st.day, c.id).length;
      return `<div class="cc${c.id === st.court ? ' on' : ''}${n ? '' : ' none'}">
        <button type="button" class="cc-pick" data-z="${c.id}" aria-pressed="${c.id === st.court}" aria-label="${c.name}: посмотреть фото и выбрать">
          <span class="cc-ph" style="background-image:url(${c.img})"></span>
          <span class="cc-in"><b>${c.name}</b><small>${c.note}</small><em>${n ? `<span class="lg">свободно ${S.plural(n, 'час', 'часа', 'часов')}</span><span class="sm"><span class="w">свободно </span>${n} ч</span>` : 'всё занято'}</em></span>
        </button>
      </div>`;
    }).join('');
  }
  $('#courts').addEventListener('click', e => {
    const z = e.target.closest('[data-z]');
    if (z) {
      const c = S.courts.find(x => x.id === +z.dataset.z);
      UI.modal(`<div class="zoom"><img src="${c.img}" alt="${c.name}"><h3>${c.name}</h3><p>${c.note}. Покрытие хард, ровный свет без бликов.</p><div class="modal-btns">${freeOf(st.day, c.id).length ? `<button class="btn ball" type="button" data-close data-pickc="${c.id}">Выбрать ${c.name.toLowerCase()} <span class="arr">→</span></button>` : `<p class="note">В этот день корт занят — выберите другую дату.</p>`}<button class="btn plain" type="button" data-close>Закрыть</button></div></div>`,
        { onOpen: m => { m.classList.add('wide'); m.querySelector('[data-pickc]')?.addEventListener('click', () => { st.court = c.id; st.hours = []; renderAll(); }); } });
      return;
    }
  });

  // ——— время ———
  function renderSlots() {
    const hours = hoursOf(st.day), w = isWeekend(st.day), c = S.courts.find(x => x.id === st.court);
    $('#timeSub').textContent = `${c.name}, ${human(st.day)}`;
    const parts = [['Утро', 7, 12], ['День', 12, 17], ['Вечер', 17, 23]];
    $('#slots').innerHTML = parts.map(([name, a, b]) => {
      const hs = hours.filter(h => h >= a && h < b); if (!hs.length) return '';
      return `<div class="slot-row"><span class="slot-l">${name}</span><div class="slots">${hs.map(h => {
        const busy = S.busy(st.day, st.court, h), on = st.hours.includes(h), price = S.rateFor(h, w);
        return `<button type="button" class="h${on ? ' on' : ''}" data-h="${h}"${busy ? ` disabled aria-label="${h}:00, ${busy}"` : ` aria-pressed="${on}"`}>${h}:00<small>${busy || S.fmt(price)}</small></button>`;
      }).join('')}</div></div>`;
    }).join('') || '<div class="empty-box">На сегодня часы закончились — выберите другой день в календаре.</div>';
  }
  $('#slots').addEventListener('click', e => {
    const b = e.target.closest('.h:not([disabled])'); if (!b) return;
    const h = +b.dataset.h;
    if (st.hours.includes(h)) st.hours = h === Math.min(...st.hours) || h === Math.max(...st.hours) ? st.hours.filter(x => x !== h) : [h];
    else if (st.hours.length && (h === Math.max(...st.hours) + 1 || h === Math.min(...st.hours) - 1)) st.hours.push(h);
    else st.hours = [h];
    st.hours.sort((a, b) => a - b); renderSlots(); renderSum();
  });

  // ——— формат: тренер карточками, уровень кнопками ———
  $('#coach').innerHTML = S.coaches.map(c => `<button type="button" data-c="${c.id}"><span class="av" style="background-image:url(${c.img})"></span><span><b>${c.name}</b><small>${c.role}</small></span></button>`).join('');
  const markCoach = () => $('#coach').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.c === st.coach); b.setAttribute('aria-pressed', b.dataset.c === st.coach); });
  $('#coach').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.coach = b.dataset.c; markCoach(); renderSum(); });
  $('#level').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#level .on')?.classList.remove('on'); b.classList.add('on'); st.level = b.dataset.v; renderSum(); });
  const setMode = m => {
    st.mode = m;
    document.querySelectorAll('.opt').forEach(o => { o.classList.toggle('on', o.dataset.mode === m); o.setAttribute('aria-pressed', o.dataset.mode === m); });
    $('#coachPick').hidden = m !== 'coach'; $('#levelPick').hidden = m !== 'partner'; renderSum();
  };
  $('#opts').addEventListener('click', e => { const o = e.target.closest('.opt'); if (o) setMode(o.dataset.mode); });
  $('#rent').addEventListener('change', () => renderSum());

  // ——— итог ———
  function calc() {
    const w = isWeekend(st.day);
    const court = st.hours.reduce((s, h) => s + S.rateFor(h, w), 0);
    const coach = st.mode === 'coach' ? S.extras.coach * st.hours.length : 0;
    return { court, coach, total: st.mode === 'partner' ? Math.round(court / 2) : court + coach };
  }
  function renderSum() {
    const sum = $('#sum'), c = S.courts.find(x => x.id === st.court);
    $('#mbar').classList.toggle('show', !!st.hours.length && !$('#book').hidden);
    if (!st.hours.length) {
      sum.classList.add('empty');
      sum.innerHTML = `<div class="t">Ваша бронь</div><h3>${c.name}, ${human(st.day)}</h3><p class="sum-hint">Выберите свободный час в шаге 3 — здесь появится итог.</p><ul><li><span>Час на корте</span><span>от ${S.fmt(S.minCourt)}</span></li><li><span>Отмена без штрафа</span><span>за ${S.extras.cancelHours} часов</span></li></ul><button class="btn ball" type="button" disabled>Забронировать <span class="arr">→</span></button>`;
      return;
    }
    sum.classList.remove('empty');
    const p = calc(), from = st.hours[0], to = st.hours[st.hours.length - 1] + 1;
    $('#mbarT').textContent = `${c.name}, ${from}:00–${to}:00`; $('#mbarP').textContent = S.fmt(p.total);
    sum.innerHTML = `<div class="t">Ваша бронь</div><h3>${c.name}, ${human(st.day)}<br>${from}:00–${to}:00</h3><ul>
      <li><span>Корт · ${S.plural(st.hours.length, 'час', 'часа', 'часов')}</span><span>${S.fmt(p.court)}</span></li>
      ${st.mode === 'coach' ? `<li><span>Тренер · ${S.coachById(st.coach).name}</span><span>${S.fmt(p.coach)}</span></li>` : ''}
      ${st.mode === 'partner' ? `<li><span>Партнёр · ${st.level.toLowerCase()}</span><span>корт пополам</span></li>` : ''}
      <li><span>Ракетка и мячи</span><span>${$('#rent').checked ? 'бесплатно' : 'свои'}</span></li>
      <li><span>Отмена без штрафа</span><span>за ${S.extras.cancelHours} часов</span></li></ul>
      <div class="total"><span>${st.mode === 'partner' ? 'Ваша часть' : 'Итого'}</span><b>${S.fmt(p.total)}</b></div>
      <button class="btn ball" type="button" id="go">Забронировать <span class="arr">→</span></button>
      <p class="note">Оплата на месте, картой или наличными.</p>`;
    $('#go').addEventListener('click', submit);
  }

  const form = $('#contact'); UI.phoneMask(form.phone);
  function submit() {
    if (!UI.validate(form)) { form.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const c = S.courts.find(x => x.id === st.court), p = calc(), from = st.hours[0], to = st.hours[st.hours.length - 1] + 1;
    const b = UI.store.add({ type: 'court', title: `${c.name}${st.mode === 'coach' ? ' с тренером' : st.mode === 'partner' ? ' и партнёр по уровню' : ''}`,
      when: `${human(st.day)}, ${from}:00–${to}:00`, date: st.day, from, price: p.total, name: form.name.value.trim(), tg: form.tg.checked,
      coach: st.mode === 'coach' ? S.coachById(st.coach).name : '' });
    $('#book').hidden = true; $('#mbar').classList.remove('show');
    const done = $('#done'); done.hidden = false;
    done.innerHTML = `<i class="tball" aria-hidden="true"></i><div class="lbl">Бронь создана</div><h2>${b.title}, ${b.when}</h2>
      <p>${b.name}, корт ваш. ${b.coach ? `Тренер ${b.coach} встретит вас у корта. ` : ''}${st.mode === 'partner' ? 'Партнёра подберём и пришлём его имя за день до игры. ' : ''}${b.tg ? `Напоминание придёт в Telegram за ${S.extras.remindMinutes} минут. ` : ''}К оплате на месте: ${S.fmt(b.price)}.</p>
      <div class="btns"><a class="btn navy" href="#my">Мои записи <span class="arr">↓</span></a><button class="btn plain" type="button" id="again">Забронировать ещё</button></div>`;
    done.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#again').addEventListener('click', () => { done.hidden = true; $('#book').hidden = false; st.hours = []; renderAll(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    renderMy();
  }

  // ——— мои записи ———
  function renderMy() {
    const list = UI.store.list();
    $('#myList').innerHTML = list.length ? list.slice().reverse().map(b => `<div class="bk"><span class="tag">${b.type === 'court' ? 'Корт' : b.type === 'group' ? 'Группа' : 'Абонемент'}</span><b>${b.title}</b><small>${b.when}</small><small>${S.fmt(b.price)}${b.tg ? ' · напомним в Telegram' : ''}</small><button class="x" type="button" data-id="${b.id}">${b.type === 'abon' ? 'Отменить заявку' : 'Отменить запись'}</button></div>`).join('')
      : `<div class="empty-box">Пока пусто. Выберите час выше — бронь появится здесь, и её можно будет отменить.</div>`;
  }
  $('#myList').addEventListener('click', e => {
    const x = e.target.closest('.x'); if (!x) return;
    const b = UI.store.list().find(i => i.id === x.dataset.id); if (!b) return;
    let late = false;
    if (b.date && b.from != null) { const start = new Date(b.date + 'T00:00'); start.setHours(b.from); late = (start - new Date()) / 36e5 < S.extras.cancelHours; }
    UI.confirmBox('Отменить запись?', `${b.title}, ${b.when}. ${late ? `До начала меньше ${S.extras.cancelHours} часов — по правилам клуба удержим половину стоимости.` : `Штрафа нет: до начала больше ${S.extras.cancelHours} часов.`}`, 'Да, отменить', () => { UI.store.remove(b.id); renderMy(); UI.toast('Запись отменена'); });
  });

  function renderAll() { renderCal(); renderCourts(); renderSlots(); renderSum(); }
  markCoach(); renderAll(); setMode(st.mode); renderMy();
  if (location.hash === '#my') setTimeout(() => $('#my').scrollIntoView(), 80);
})();
