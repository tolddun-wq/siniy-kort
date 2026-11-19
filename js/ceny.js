// Цены: калькулятор абонемента (цена зависит от раз в неделю и времени), каталог с вкладками, разовые цены
(() => {
  const S = window.SK, UI = window.SKUI, $ = s => document.querySelector(s);
  const ans = { who: 'adult', fmt: 'group', times: 2, when: 'evening' };
  const IMG = { group: 'img/players-net.jpg', coach: 'img/coach-artem.jpg', court: 'img/player-indoor.jpg', kids: 'img/kids-highfive.jpg' };
  let tab = 'all';

  document.querySelectorAll('.qs .note').forEach(n => { n.innerHTML = n.innerHTML.replace('${day}', S.fmt(S.hourRate('day'))).replace('${eve}', S.fmt(S.hourRate('evening'))); });
  document.querySelectorAll('[data-q]').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    seg.querySelector('.on')?.classList.remove('on'); b.classList.add('on');
    ans[seg.dataset.q] = seg.dataset.q === 'times' ? +b.dataset.v : b.dataset.v;
    render();
  }));

  function current() {
    const fmt = ans.who === 'kid' ? 'kids' : ans.fmt;
    const o = S.offer(fmt, ans.times, ans.when);
    const card = S.visibleAbons().find(a => a.id === o.id);   // если владелец поменял карточку — берём её
    return { o, a: card ? { ...o, ...card } : { ...o, img: IMG[fmt], tag: '', custom: true }, fmt };
  }

  function render() {
    const kid = ans.who === 'kid';
    document.querySelectorAll('[data-for="adult"]').forEach(x => x.hidden = kid);
    document.querySelector('[data-for="time"]').hidden = kid || ans.fmt === 'group';
    document.querySelector('.qs-kid').hidden = !kid;
    const { o, a, fmt } = current();
    const per = Math.round(a.price / o.count / 10) * 10;
    const save = o.single - a.price;
    const why = {
      kids: 'Секция с Мариной Андреевной: игры, мягкие мячи, маленькие ракетки. Родители смотрят с трибуны.',
      group: ['Раз в неделю — чтобы попробовать и не перегореть.', 'Два раза в неделю удар закрепляется быстрее всего.', 'Три тренировки в неделю — через месяц первый матч на счёт.'][ans.times - 1],
      coach: 'Тренер подстроится под ваш темп — быстрее всего к своему уровню или турниру.',
      court: 'Свой корт на весь месяц — час дешевле, чем бронировать каждый раз.',
    }[fmt];
    $('#res').innerHTML = `<div class="ph" style="background-image:url(${a.img})"><span>${a.custom ? 'Под ваш график' : 'Подходит вам'}</span></div><div class="in">
      <h3>${a.title}</h3><div class="sub">${a.sessions}</div><p class="whyt">${why}</p>
      <div class="pr"><b>${S.fmt(a.price)}</b><small>в месяц<br>${S.fmt(per)} за ${o.unit}</small></div>
      ${save > 0 ? `<div class="save">Разово вышло бы ${S.fmt(o.single)} — экономия <b>${S.fmt(save)}</b></div>` : ''}
      <button class="btn ball" type="button" data-buy="${a.id}">Оформить абонемент <span class="arr">↗</span></button>
      <p class="alt">${fmt === 'court' ? `Нужен корт один раз? <a href="bron.html">Свободные часы</a>` : `Сомневаетесь? <a href="bron.html?coach=igor">Пробное занятие за ${S.fmt(S.extras.trial)}</a>`}</p></div>`;
    $('#res').dataset.offer = JSON.stringify(a);
  }

  function renderAbons() {
    const list = S.visibleAbons().filter(a => tab === 'all' || a.kind === tab || (tab === 'group' && a.kind === 'custom'));
    $('#abons').innerHTML = list.length ? list.map(a => `<article class="ab"><div class="ph" style="background-image:url('${a.img}')">${a.tag ? `<span>${a.tag}</span>` : ''}</div>
      <div class="in"><h3>${a.title}</h3><div class="meta">${a.sessions}</div><p>${a.text || ''}</p>
      <div class="foot"><b>${S.fmt(a.price)}<small> / мес</small></b><button class="btn navy" type="button" data-buy="${a.id}">Оформить <span class="arr">↗</span></button></div></div></article>`).join('')
      : '<div class="empty-box">В этом разделе пока нет абонементов.</div>';
    UI.reveal($('#abons'));
  }
  $('#atabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('#atabs .on').classList.remove('on'); b.classList.add('on'); tab = b.dataset.k; renderAbons(); });

  const li = (a, b) => `<li><span>${a}</span><b>${b}</b></li>`;
  $('#rt1').innerHTML = S.rates.map(r => li(r.label, S.fmt(r.price))).join('');
  $('#rt2').innerHTML = li('Тренер, час — прибавляется к корту', '+' + S.fmt(S.extras.coach)) + li('Занятие в группе, разово', S.fmt(S.extras.groupLesson)) + li('Пробное занятие, 45 минут', S.fmt(S.extras.trial)) + li('Турнир для новичков', S.fmt(S.extras.tournament)) + li('Ракетка и мячи на первый раз', 'бесплатно');

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-buy]'); if (!b) return;
    const a = S.abonById(b.dataset.buy) || JSON.parse($('#res').dataset.offer);
    UI.contactForm(`${a.title}`, `${a.sessions} — ${S.fmt(a.price)} в месяц. Администратор напишет в Telegram, подберёт группу и время. Оплата на первом занятии.`, ({ name, phone, tg }) => {
      UI.store.add({ type: 'abon', title: `Абонемент: ${a.title}`, when: `заявка от ${new Date().toLocaleDateString('ru-RU')}`, price: a.price, name, phone, tg });
      UI.toast(`${name}, заявка принята — ответим в Telegram`);
    });
  });

  render(); renderAbons();
})();
