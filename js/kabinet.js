// Кабинет владельца (пример): абонементы по шаблону и заявки посетителей
(() => {
  const S = window.SK, UI = window.SKUI, $ = s => document.querySelector(s);
  const PICS = ['img/coach-igor.jpg', 'img/players-net.jpg', 'img/kids-highfive.jpg', 'img/coach-artem.jpg', 'img/hall.jpg', 'img/forehand.jpg', 'img/racket.jpg', 'img/net-balls-blue.jpg', 'img/woman-forehand.jpg', 'img/kids-group.jpg', 'img/ball-racket.jpg'];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let list = S.abons(), editId = null, pic = PICS[0];
  const f = $('#form');

  const card = a => `<article class="ab"><div class="ph" style="background-image:url('${a.img}')">${a.tag ? `<span>${esc(a.tag)}</span>` : ''}</div>
    <div class="in"><h3>${esc(a.title) || 'Название'}</h3><div class="meta">${esc(a.sessions) || 'Что входит'}${a.period ? ' · ' + esc(a.period) : ''}</div><p>${esc(a.text) || 'Описание появится здесь'}</p>
    <div class="foot"><b>${a.price ? S.fmt(a.price) : '— ₽'}</b><span class="btn navy" aria-hidden="true">Оформить <span class="arr">↗</span></span></div></div></article>`;

  function renderList() {
    $('#list').innerHTML = list.length ? list.map(a => `<div class="li${a.id === editId ? ' sel' : ''}${a.hidden ? ' off' : ''}"><img src="${a.img}" alt="">
      <div><b>${esc(a.title)}<span class="st${a.hidden ? ' off' : ''}">${a.hidden ? 'скрыт' : 'на сайте'}</span></b><small>${esc(a.sessions)} · ${S.fmt(a.price)}</small></div>
      <div class="acts"><button type="button" data-a="edit" data-id="${a.id}">Изменить</button><button type="button" data-a="hide" data-id="${a.id}">${a.hidden ? 'Показать' : 'Скрыть'}</button><button type="button" class="del" data-a="del" data-id="${a.id}">Удалить</button></div></div>`).join('')
      : '<div class="empty-box">Абонементов нет. Добавьте первый — он сразу появится на странице «Цены».</div>';
  }
  function renderPics() {
    $('#pics').innerHTML = PICS.map(p => `<button type="button" class="${p === pic ? 'on' : ''}" style="background-image:url('${p}')" data-p="${p}" aria-label="Выбрать фото"></button>`).join('')
      + `<label>Своё фото<input type="file" accept="image/*" id="up"></label>`;
    if (!PICS.includes(pic)) $('#pics').insertAdjacentHTML('afterbegin', `<button type="button" class="on" style="background-image:url('${pic}')" aria-label="Загруженное фото"></button>`);
  }
  const current = () => ({ title: f.title.value.trim(), sessions: f.sessions.value.trim(), period: f.period.value.trim(), text: f.text.value.trim(),
    price: parseInt(f.price.value.replace(/\D/g, '')) || 0, tag: f.tag.value.trim(), img: pic, hidden: !f.show.checked });
  const preview = () => { $('#prev').innerHTML = card(current()); };

  function fill(a) {
    editId = a ? a.id : null; pic = a ? a.img : PICS[0];
    f.title.value = a?.title || ''; f.sessions.value = a?.sessions || ''; f.period.value = a?.period || '1 месяц'; f.text.value = a?.text || '';
    f.price.value = a?.price ? a.price.toLocaleString('ru-RU') : ''; f.tag.value = a?.tag || ''; f.show.checked = a ? !a.hidden : true;
    $('#edTitle').textContent = a ? `Изменить «${a.title}»` : 'Новый абонемент';
    f.querySelectorAll('.field.err').forEach(x => x.classList.remove('err')); f.querySelectorAll('.e').forEach(x => x.hidden = true);
    renderPics(); renderList(); preview();
  }
  const save = () => { S.saveAbons(list); renderList(); };

  $('#list').addEventListener('click', e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const a = list.find(x => x.id === b.dataset.id);
    if (b.dataset.a === 'edit') { fill(a); if (innerWidth < 1240) $('#ed').scrollIntoView({ behavior: 'smooth' }); }
    if (b.dataset.a === 'hide') { a.hidden = !a.hidden; save(); UI.toast(a.hidden ? `«${a.title}» скрыт с сайта` : `«${a.title}» снова на сайте`); if (editId === a.id) fill(a); }
    if (b.dataset.a === 'del') UI.confirmBox('Удалить абонемент?', `«${esc(a.title)}» пропадёт со страницы «Цены». Если нужно убрать на время — лучше «Скрыть».`, 'Удалить', () => { list = list.filter(x => x.id !== a.id); save(); if (editId === a.id) fill(null); UI.toast('Абонемент удалён'); });
  });
  $('#pics').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (!b) return; pic = b.dataset.p; renderPics(); preview(); });
  $('#pics').addEventListener('change', e => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 3e6) { UI.toast('Фото больше 3 МБ — выберите поменьше'); return; }
    const img = new Image(), r = new FileReader();
    r.onload = () => { img.onload = () => { const c = document.createElement('canvas'), k = Math.min(1, 900 / img.width); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); pic = c.toDataURL('image/jpeg', .8); renderPics(); preview(); }; img.src = r.result; };
    r.readAsDataURL(file);
  });
  f.addEventListener('input', e => { if (e.target.name === 'price') { const d = e.target.value.replace(/\D/g, '').slice(0, 7); e.target.value = d ? (+d).toLocaleString('ru-RU') : ''; } preview(); });
  f.addEventListener('change', preview);
  f.addEventListener('submit', e => {
    e.preventDefault();
    const a = current(); let ok = true;
    const err = (name, msg) => { const fl = f[name].closest('.field'); fl.classList.toggle('err', !!msg); const x = fl.querySelector('.e'); x.hidden = !msg; x.textContent = msg; if (msg && ok) { f[name].focus(); ok = false; } };
    err('title', a.title ? '' : 'Без названия покупатель не поймёт, что это');
    err('sessions', a.sessions ? '' : 'Напишите, что входит: например, «8 занятий в группе»');
    err('price', a.price >= 100 ? '' : 'Укажите цену в рублях, от 100');
    if (!ok) return;
    if (editId) { Object.assign(list.find(x => x.id === editId), a); UI.toast('Сохранено — карточка уже на странице «Цены»'); }
    else { list.push({ id: 'a' + Date.now().toString(36), kind: 'custom', ...a }); UI.toast('Абонемент добавлен на страницу «Цены»'); }
    try { S.saveAbons(list); } catch (er) { UI.toast('Не хватило места в браузере — выберите фото поменьше'); return; }
    fill(null);
  });
  $('#cancel').addEventListener('click', () => fill(null));
  $('#add').addEventListener('click', () => { fill(null); f.title.focus(); if (innerWidth < 1240) $('#ed').scrollIntoView({ behavior: 'smooth' }); });
  $('#reset2').addEventListener('click', () => UI.confirmBox('Вернуть абонементы как было?', 'Все ваши изменения в этом браузере пропадут, вернутся абонементы из примера.', 'Вернуть', () => { S.resetAbons(); list = S.abons(); fill(null); UI.toast('Вернули пример'); }));

  // заявки
  function renderOrders() {
    const o = UI.store.list().slice().reverse();
    $('#orCount').textContent = o.length;
    $('#orders').innerHTML = o.length ? o.map(b => `<div class="bk"><span class="tag">${b.type === 'court' ? 'Бронь корта' : b.type === 'group' ? 'Запись в группу' : 'Заявка на абонемент'}</span><b>${esc(b.name || 'Без имени')}</b><small>${esc(b.title)} · ${esc(b.when)}</small><small>${S.fmt(b.price)}${b.tg ? ' · напоминание в Telegram' : ''}</small></div>`).join('')
      : '<div class="empty-box">Заявок пока нет. Забронируйте корт или оформите абонемент на сайте — заявка появится здесь, как у владельца клуба.</div>';
  }
  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]'); if (!b) return;
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    $('#tabAb').hidden = b.dataset.tab !== 'ab'; $('#tabOr').hidden = b.dataset.tab !== 'or'; renderOrders();
  });
  fill(null); renderOrders();
})();
