// Расписание групп по неделям + запись. Данные: Google Таблица (если указана) или модель
(async () => {
  const S = window.SK, UI = window.SKUI, $ = s => document.querySelector(s);
  const DN = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const DS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const now = new Date(), today = new Date(now); today.setHours(0, 0, 0, 0);
  const monday = new Date(today); monday.setDate(today.getDate() - (today.getDay() + 6) % 7);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  let groups = S.groups.map(g => ({ ...g }));
  if (S.SHEET.schedule) { try { groups = (await S.fromSheet(S.SHEET.schedule)).map(r => ({ d: +r.d, t: r.t, name: r.name, level: r.level, coach: r.coach, court: +r.court, places: +r.places, taken: +r.taken })); } catch (e) { /* остаётся модель */ } }
  const lesson = Math.round(S.offer('group', 2).price / 8 / 10) * 10;
  let level = 'all', week = 0, showDay = (today.getDay() + 6) % 7 + 1;
  const dateOf = d => { const x = new Date(monday); x.setDate(monday.getDate() + week * 7 + d - 1); return x; };
  const keyOf = (g, d) => `${iso(d)}-${g.t}-${g.name}`;

  function render() {
    const my = UI.store.list().filter(b => b.type === 'group');
    const a = dateOf(1), b = dateOf(7);
    $('#wk').innerHTML = `<button type="button" class="cal-nav" data-w="-1"${week ? '' : ' disabled'} aria-label="Прошлая неделя">‹</button><b>${a.getDate()} ${a.getMonth() !== b.getMonth() ? MON[a.getMonth()] + ' ' : ''}— ${b.getDate()} ${MON[b.getMonth()]}</b><button type="button" class="cal-nav" data-w="1"${week < 3 ? '' : ' disabled'} aria-label="Следующая неделя">›</button>${week ? '<button type="button" class="wk-today" data-w="0">Эта неделя</button>' : ''}`;
    $('#dtabs').innerHTML = [1, 2, 3, 4, 5, 6, 7].map(d => { const x = dateOf(d); return `<button type="button" role="tab" aria-selected="${d === showDay}" class="${d === showDay ? 'on' : ''}${x < today ? ' past' : ''}" data-d="${d}">${DS[d - 1]}<small>${x.getDate()}</small></button>`; }).join('');
    $('#week').innerHTML = [1, 2, 3, 4, 5, 6, 7].map(d => {
      const x = dateOf(d), past = x < today, isToday = +x === +today;
      const list = groups.filter(g => g.d === d && (level === 'all' || g.level === level)).sort((p, q) => p.t.localeCompare(q.t));
      return `<div class="day${isToday ? ' today' : ''}${past ? ' past' : ''}${d === showDay ? ' show' : ''}"><h4><span>${DN[d - 1]}</span><small>${isToday ? 'сегодня, ' : ''}${x.getDate()} ${MON[x.getMonth()]}</small></h4>
      ${list.length ? list.map(g => {
        const k = keyOf(g, x), isMine = my.some(m => m.key === k), start = new Date(x); start.setHours(parseInt(g.t), +g.t.slice(3));
        const gone = start < now;
        const taken = Math.min(g.places, g.taken + (isMine ? 1 : 0)), left = g.places - taken, c = S.coachById(g.coach);
        const label = isMine ? 'Вы записаны' : gone ? 'Уже прошло' : left ? 'Записаться' : 'Мест нет';
        return `<div class="g${left ? '' : ' full'}${g.tournament ? ' tour' : ''}${isMine ? ' mine' : ''}${gone ? ' gone' : ''}"${g.tournament && !week ? ' id="tour"' : ''}><time>${g.t}</time><b>${g.name}</b><small>${c ? c.name : ''} · корт ${g.court}</small><small>${g.tournament ? 'участие ' + S.fmt(S.extras.tournament) : 'разово ' + S.fmt(lesson) + ' или по абонементу'}</small>
          <div class="bar"><i style="width:${Math.round(taken / g.places * 100)}%"></i></div><span class="left">${isMine ? 'Вы в группе' : left ? `Свободно ${left} из ${g.places}` : 'Мест нет'}</span>
          <button type="button" data-k="${k}" data-g="${groups.indexOf(g)}" data-d="${d}"${!left || isMine || gone ? ' disabled' : ''}>${label}</button></div>`;
      }).join('') : '<p class="none">Групп нет — корты свободны <a href="bron.html">для брони</a></p>'}</div>`;
    }).join('');
    UI.reveal($('#week'));
  }
  $('#flt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#flt .on').classList.remove('on'); b.classList.add('on'); level = b.dataset.l; render(); });
  $('#wk').addEventListener('click', e => { const b = e.target.closest('[data-w]:not([disabled])'); if (!b) return; week = b.dataset.w === '0' ? 0 : week + +b.dataset.w; showDay = week ? 1 : (today.getDay() + 6) % 7 + 1; render(); });
  $('#dtabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; showDay = +b.dataset.d; render(); });
  $('#week').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]:not([disabled])'); if (!b) return;
    const g = groups[+b.dataset.g], c = S.coachById(g.coach), d = dateOf(+b.dataset.d);
    UI.contactForm(g.tournament ? 'Записаться на турнир' : `Записаться: ${g.name}`, `${DN[g.d - 1]}, ${d.getDate()} ${MON[d.getMonth()]} в ${g.t} · ${c.name} · корт ${g.court}. ${g.tournament ? 'Участие ' + S.fmt(S.extras.tournament) + ', оплата на месте.' : 'Первое занятие можно оплатить на месте: ' + S.fmt(lesson) + '.'}`,
      ({ name, tg }) => {
        UI.store.add({ type: 'group', key: b.dataset.k, title: g.name, when: `${DN[g.d - 1].toLowerCase()}, ${d.getDate()} ${MON[d.getMonth()]} в ${g.t}`, date: iso(d), from: parseInt(g.t), price: g.tournament ? S.extras.tournament : lesson, name, tg });
        render(); UI.toast(`${name}, вы записаны: ${g.name}, ${g.t}`);
      });
  });
  // на телефоне открываем ближайший день, где ещё можно записаться
  for (let d = showDay; d <= 7; d++) { const x = dateOf(d); if (groups.some(g => { if (g.d !== d) return false; const s = new Date(x); s.setHours(parseInt(g.t), +g.t.slice(3)); return s > now; })) { showDay = d; break; } }
  render();
  if (location.hash === '#tour') { showDay = 6; render(); setTimeout(() => document.getElementById('tour')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200); }
})();
