// «Синий корт» — единая модель данных. Все цены и цифры на сайте считаются отсюда.
// В настоящем клубе расписание и прайс лежат в Google Таблице: укажите адрес CSV в SHEET.
window.SK = (() => {
  const SHEET = { schedule: '', prices: '' }; // пример: 'https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=Расписание'

  const club = {
    name: 'Синий корт',
    city: 'Казань',
    address: 'ул. Вымышленная, 7',
    phone: '+7 (000) 000-00-00',
    email: 'hello@siniy-kort.demo',
    open: 7, close: 23,
    telegram: 'https://t.me/isthisthedaggr',
  };

  // Цена корта за час по времени и дню
  const rates = [
    { id: 'day',     label: 'Будни, 7:00–17:00',  from: 7,  to: 17, weekend: false, price: 1600 },
    { id: 'evening', label: 'Будни, 17:00–21:00', from: 17, to: 21, weekend: false, price: 2400 },
    { id: 'late',    label: 'Будни, 21:00–23:00', from: 21, to: 23, weekend: false, price: 2000 },
    { id: 'weekend', label: 'Сб и вс, весь день',  from: 7,  to: 23, weekend: true,  price: 2000 },
  ];
  const extras = { coach: 1200, trial: 900, tournament: 1500, cancelHours: 6, remindMinutes: 30, groupMax: 6, groupLesson: 1000, kidsLesson: 750, racketRent: 300 };

  const courts = [
    { id: 1, name: 'Корт 1', note: 'центральный, с трибуной', img: 'img/hall.jpg' },
    { id: 2, name: 'Корт 2', note: 'у окна, дневной свет', img: 'img/player-indoor.jpg' },
    { id: 3, name: 'Корт 3', note: 'тренировочный, с пушкой', img: 'img/net-balls-blue.jpg' },
    { id: 4, name: 'Корт 4', note: 'детский, днём занят секцией', img: 'img/kids-group.jpg' },
  ];

  const coaches = [
    { id: 'igor', name: 'Игорь Валентинович', role: 'Взрослые с нуля и техника удара', img: 'img/coach-igor.jpg',
      about: 'Начинает с коротких мячей у сетки. Ведёт группы новичков по вечерам.', days: 'пн, ср, пт · 18:00–22:00' },
    { id: 'artem', name: 'Артём Сергеевич', role: 'Подготовка к матчам и турнирам', img: 'img/coach-artem.jpg',
      about: 'Тактика, подача, игра у сетки. Для тех, кто уже перекидывает мяч и хочет выигрывать.', days: 'вт, чт · 17:00–22:00, сб · 10:00–16:00' },
    { id: 'marina', name: 'Марина Андреевна', role: 'Детская секция, 5–12 лет', img: 'img/coach-marina.jpg',
      about: 'Мягкие мячи, маленькие ракетки, игры вместо упражнений. Родители смотрят с трибуны.', days: 'пн–пт · 15:00–18:00' },
    { id: 'denis', name: 'Денис Олегович', role: 'Утренние тренировки и фитнес-теннис', img: 'img/coach-denis.jpg',
      about: 'Для тех, кто играет до работы. Тренировка в темпе, без долгих пауз.', days: 'пн–пт · 7:00–11:00' },
  ];

  // Группы: день недели (1 = пн … 7 = вс), время, корт
  const groups = [
    { d: 1, t: '07:30', name: 'Утренний теннис', level: 'любой', coach: 'denis', court: 3, places: 6, taken: 3 },
    { d: 1, t: '16:00', name: 'Дети 5–7 лет', level: 'дети', coach: 'marina', court: 4, places: 8, taken: 6 },
    { d: 1, t: '19:00', name: 'Взрослые с нуля', level: 'новички', coach: 'igor', court: 3, places: 6, taken: 4 },
    { d: 2, t: '17:00', name: 'Дети 8–12 лет', level: 'дети', coach: 'marina', court: 4, places: 8, taken: 5 },
    { d: 2, t: '20:00', name: 'Игра у сетки', level: 'средний', coach: 'artem', court: 1, places: 4, taken: 4 },
    { d: 3, t: '07:30', name: 'Утренний теннис', level: 'любой', coach: 'denis', court: 3, places: 6, taken: 2 },
    { d: 3, t: '16:00', name: 'Дети 5–7 лет', level: 'дети', coach: 'marina', court: 4, places: 8, taken: 7 },
    { d: 3, t: '19:00', name: 'Взрослые с нуля', level: 'новички', coach: 'igor', court: 3, places: 6, taken: 5 },
    { d: 4, t: '17:00', name: 'Дети 8–12 лет', level: 'дети', coach: 'marina', court: 4, places: 8, taken: 4 },
    { d: 4, t: '20:00', name: 'Подача и приём', level: 'средний', coach: 'artem', court: 1, places: 4, taken: 2 },
    { d: 5, t: '07:30', name: 'Утренний теннис', level: 'любой', coach: 'denis', court: 3, places: 6, taken: 1 },
    { d: 5, t: '19:00', name: 'Взрослые с нуля', level: 'новички', coach: 'igor', court: 3, places: 6, taken: 3 },
    { d: 6, t: '10:00', name: 'Турнир для новичков', level: 'новички', coach: 'artem', court: 1, places: 16, taken: 11, tournament: true },
    { d: 6, t: '12:00', name: 'Семейный теннис', level: 'любой', coach: 'marina', court: 4, places: 8, taken: 3 },
    { d: 7, t: '11:00', name: 'Парная игра', level: 'средний', coach: 'artem', court: 1, places: 8, taken: 5 },
  ];

  // ——— абонементы: цена считается из числа раз в неделю и времени ———
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return n + ' ' + (m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c); };
  const pack = (n, perOne, discount) => Math.round(n * perOne * (1 - discount) / 100) * 100;
  const WEEK = ['раз', '2 раза', '3 раза'];
  const WHEN = { day: 'будни до 17:00', evening: 'будни после 17:00', weekend: 'суббота и воскресенье' };
  const TW = { day: 'днём', evening: 'вечером', weekend: 'в выходные' };
  const hourRate = when => when === 'day' ? 1600 : when === 'weekend' ? 2000 : 2400;
  const DISC = { group: [.025, .14, .225], coach: [.05, .1, .15], court: [.05, .1, .15] };
  // fmt: group | kids | coach | court; perWeek: 1–3; when: day | evening | weekend
  function offer(fmt, perWeek, when) {
    const n = perWeek * 4;
    if (fmt === 'kids') return { id: 'kids', kind: 'kids', perWeek: 2, title: 'Детская секция', sessions: '2 раза в неделю, ' + plural(8, 'занятие', 'занятия', 'занятий') + ' в месяц', period: '1 месяц', count: 8, price: pack(8, extras.kidsLesson, .1), single: 8 * extras.kidsLesson, unit: 'занятие' };
    if (fmt === 'group') return { id: 'group-' + perWeek, kind: 'group', perWeek, title: `Группа ${WEEK[perWeek - 1]} в неделю`, sessions: plural(n, 'занятие', 'занятия', 'занятий') + ' в месяц, до ' + extras.groupMax + ' человек на корт', period: '1 месяц', count: n, price: pack(n, extras.groupLesson, DISC.group[perWeek - 1]), single: n * extras.groupLesson, unit: 'занятие' };
    const one = fmt === 'coach' ? hourRate(when) + extras.coach : hourRate(when);
    return { id: `${fmt}-${perWeek}-${when}`, kind: fmt, perWeek, when,
      title: `${fmt === 'coach' ? 'Тренер' : 'Корт'} ${TW[when]}: ${plural(n, 'час', 'часа', 'часов')} в месяц`,
      sessions: `${WEEK[perWeek - 1]} в неделю по часу, ${WHEN[when]}${fmt === 'coach' ? ', корт включён' : ''}`, period: '1 месяц', count: n,
      price: pack(n, one, DISC[fmt][perWeek - 1]), single: n * one, unit: 'час' };
  }
  const look = {
    'group-1': { img: 'img/coach-igor.jpg', tag: 'для первого месяца', text: 'Раз в неделю с тренером в группе своего уровня. Ракетка и мячи наши.' },
    'group-2': { img: 'img/players-net.jpg', tag: 'чаще всего берут', text: 'Два вечера в неделю — так удар закрепляется быстрее всего. Пропуск можно отыграть в другой группе.' },
    'group-3': { img: 'img/woman-forehand.jpg', tag: '', text: 'Для тех, кто втянулся: три тренировки в неделю, к концу месяца — первый матч на счёт.' },
    'kids': { img: 'img/kids-highfive.jpg', tag: 'дети 5–12 лет', text: 'Мягкие мячи, маленькие ракетки, игры вместо упражнений. Родители смотрят с трибуны.' },
    'coach-1-evening': { img: 'img/coach-artem.jpg', tag: '', text: 'Час с тренером раз в неделю, корт включён. Удобно, если нужен свой темп.' },
    'coach-2-evening': { img: 'img/forehand.jpg', tag: '', text: 'Два часа в неделю один на один — к турниру или чтобы быстро догнать друзей.' },
    'court-2-day': { img: 'img/player-indoor.jpg', tag: 'выгоднее всего', text: 'Свой корт два раза в неделю днём. Час выходит дешевле разовой брони.' },
    'court-2-evening': { img: 'img/net-balls-blue.jpg', tag: '', text: 'Свой корт два вечера в неделю после работы. Бронь часа — в два нажатия.' },
  };
  const abonDefault = [offer('group', 1), offer('group', 2), offer('group', 3), offer('kids'), offer('coach', 1, 'evening'), offer('coach', 2, 'evening'), offer('court', 2, 'day'), offer('court', 2, 'evening')]
    .map(o => ({ id: o.id, kind: o.kind, title: o.title, sessions: o.sessions, period: o.period, price: o.price, hidden: false, ...look[o.id] }));
  const ABON_KEY = 'sk_abon_v2';
  function abons() {
    try { const s = JSON.parse(localStorage.getItem(ABON_KEY)); if (Array.isArray(s)) return s; } catch (e) {}
    return abonDefault.map(a => ({ ...a }));
  }
  function saveAbons(list) { localStorage.setItem(ABON_KEY, JSON.stringify(list)); }
  function resetAbons() { try { localStorage.removeItem(ABON_KEY); } catch (e) {} }

  const faq = [
    { q: 'Я никогда не играл. Мне сразу в группу?', a: `Начните с пробного занятия один на один: 45 минут, ${fmt(extras.trial)}. Тренер поставит хват и посоветует группу по уровню.` },
    { q: 'Что взять с собой?', a: 'Удобную одежду и кроссовки со светлой подошвой — она не оставляет следов на корте. Ракетку и мячи для первого раза дадим.' },
    { q: 'Можно ли прийти с ребёнком?', a: 'Да. Детская секция для 5–12 лет, занятия днём и в выходные. Пока ребёнок играет, можно смотреть с трибуны.' },
    { q: 'Как отменить или перенести бронь?', a: `В разделе «Мои брони» или в Telegram-боте. За ${extras.cancelHours} часов и раньше — без штрафа, деньги вернутся полностью.` },
    { q: 'Есть ли душ и раздевалки?', a: 'Да: две раздевалки с душем, шкафчики с ключом, фен. Полотенце можно взять на ресепшене.' },
    { q: 'Как работает подбор партнёра?', a: 'При брони отметьте «Найти партнёра» и свой уровень. Предложим игрока из клуба на это же время, корт оплачиваете пополам.' },
  ];

  // ——— расчёты ———
  function fmt(n) { return n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽'; }
  function rateFor(hour, weekend) {
    const r = rates.find(r => r.weekend === weekend && hour >= r.from && hour < r.to);
    return r ? r.price : null;
  }
  const minCourt = Math.min(...rates.map(r => r.price));
  const minCoach = minCourt + extras.coach;
  const coachById = id => coaches.find(c => c.id === id);
  const visibleAbons = () => abons().filter(a => !a.hidden);
  const abonById = id => abons().find(a => a.id === id);

  // Занятость кортов — псевдослучайная, но одинаковая для одной даты
  function busy(dateStr, courtId, hour) {
    const d = new Date(dateStr + 'T00:00');
    const wd = (d.getDay() + 6) % 7 + 1;
    if (groups.some(g => g.d === wd && g.court === courtId && parseInt(g.t) === hour)) return 'группа';
    if (courtId === 4 && !(wd >= 6) && hour >= 15 && hour < 18) return 'дети';
    let s = 0; for (const ch of dateStr + courtId + hour) s = (s * 31 + ch.charCodeAt(0)) % 997;
    const evening = hour >= 18 && hour <= 21;
    return (s % 100) < (evening ? 62 : 34) ? 'занят' : '';
  }

  // Чтение Google Таблицы (CSV) — используется, если указан адрес
  async function fromSheet(url) {
    const res = await fetch(url); if (!res.ok) throw new Error('sheet');
    const rows = (await res.text()).trim().split('\n').map(l => l.split('","').map(c => c.replace(/^"|"$/g, '')));
    const head = rows.shift(); return rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
  }

  return { SHEET, offer, plural, hourRate, club, rates, extras, courts, coaches, groups, faq, fmt, rateFor, minCourt, minCoach, coachById,
    abons, visibleAbons, abonById, saveAbons, resetAbons, abonDefault, busy, fromSheet };
})();
