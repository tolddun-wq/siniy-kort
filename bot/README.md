# Бот «Синий корт» — как запустить (всё бесплатно)

Мини-приложение — это страница сайта `/app/`. Бот открывает её кнопкой и шлёт напоминания через сервер на Cloudflare Workers (`worker.js`).

## Шаг 1. Создать бота (делает Толя, 5 минут)
1. В Telegram открыть **@BotFather** → `/newbot`.
2. Имя: `Синий корт (демо)`. Адрес бота: например `siniy_kort_demo_bot` (должен кончаться на `bot`).
3. BotFather пришлёт **токен** — длинную строку вида `123456:ABC...`. Это пароль от бота: никому не отправлять, в чат с Claude не вставлять. Он понадобится в шаге 3.
4. `/setdescription` → «Бронь теннисного корта в два касания. Демо для портфолио — клуб вымышленный.»

## Шаг 2. Опубликовать сайт (GitHub + Vercel)
После этого у мини-приложения появится адрес, например `https://siniy-kort.vercel.app/app/`.
В BotFather: `/mybots` → бот → **Bot Settings → Menu Button** → вставить этот адрес, текст кнопки «Забронировать».

## Шаг 3. Сервер напоминаний на Cloudflare
1. Зарегистрироваться на dash.cloudflare.com (бесплатно, карта не нужна).
2. **Workers & Pages → Create → Worker**, имя `siniy-kort-bot` → Deploy → **Edit code** → вставить весь `worker.js` → Deploy.
3. **Storage → KV → Create**, имя `BOOKINGS`. В настройках воркера: **Bindings → KV namespace**, переменная `BOOKINGS`.
4. **Settings → Variables and Secrets**:
   - `BOT_TOKEN` — тип *Secret*, токен из шага 1 (вставляете сами);
   - `APP_URL` — адрес мини-приложения из шага 2;
   - `WEBHOOK_SECRET` — тип *Secret*, любое длинное слово из латиницы и цифр.
5. **Settings → Triggers → Cron**: `*/5 * * * *` (каждые 5 минут).
6. Подключить бота к серверу — открыть в браузере (подставив свои значения):
   `https://api.telegram.org/bot<ТОКЕН>/setWebhook?url=https://siniy-kort-bot.<ваш-поддомен>.workers.dev/tg&secret_token=<WEBHOOK_SECRET>`
7. Адрес воркера `https://siniy-kort-bot.<поддомен>.workers.dev` Claude впишет в `app/app.js` (константа `API`).

## Лимиты бесплатного тарифа
100 000 запросов в день, KV — 1 000 записей и 1 000 просмотров списка в день. Для демо с запасом.
