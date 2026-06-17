# RichHouse Telegram Bot — MVP

В проект добавлена первая рабочая версия Telegram-бота для заявок RichHouse.

## Что умеет бот

Главное меню:

- Подобрать мебель
- Получить каталог
- Рассчитать комплект
- Записаться в салон
- Я дизайнер
- Обновить интерьер / trade-in через партнёров
- Связаться с менеджером

Бот собирает данные клиента и отправляет заявку в Telegram-группу менеджеров.

Пример заявки:

```text
Новая заявка RichHouse

Тип: Подбор мебели по интерьеру
Комната: Спальня
Стиль: Светлая неоклассика
Бюджет: 100–200 млн сум
Фото комнаты: есть
Телефон: +998 XX XXX XX XX
Источник: instagram_spalnya
Telegram: Roman / @username
Telegram ID: 123456789
```

## Добавленные файлы

```text
lib/richhouse-bot.ts
app/api/telegram/webhook/route.ts
app/api/telegram/set-webhook/route.ts
BOT_SETUP.md
.env.example
```

## Переменные окружения для Vercel

Добавить в Vercel → Project → Settings → Environment Variables:

```env
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_TELEGRAM_BOT_URL=https://t.me/your_bot_username
TELEGRAM_BOT_TOKEN=token_from_botfather
TELEGRAM_MANAGER_CHAT_ID=-1001234567890
ADMIN_SECRET=long-random-secret
```

`NEXT_PUBLIC_APP_URL` должен быть без слеша в конце.

## Как получить TELEGRAM_BOT_TOKEN

1. Открыть Telegram.
2. Найти `@BotFather`.
3. Написать `/newbot`.
4. Создать имя и username бота.
5. Скопировать token в `TELEGRAM_BOT_TOKEN`.

## Как получить TELEGRAM_MANAGER_CHAT_ID

Самый простой вариант:

1. Создать Telegram-группу для менеджеров.
2. Добавить туда бота.
3. Сделать бота администратором группы.
4. Написать любое сообщение в группе.
5. Открыть в браузере:

```text
https://api.telegram.org/botBOT_TOKEN/getUpdates
```

6. Найти `chat.id`. У групп обычно ID начинается с `-100...`.
7. Вставить его в `TELEGRAM_MANAGER_CHAT_ID`.

## Как включить webhook

После деплоя на Vercel открыть в браузере:

```text
https://your-vercel-domain.vercel.app/api/telegram/set-webhook?secret=YOUR_ADMIN_SECRET
```

Если всё нормально, ответ будет примерно:

```json
{"ok":true,"result":{"ok":true,"result":true}}
```

После этого бот начнёт принимать сообщения.

## Рекламные ссылки

Можно использовать разные ссылки, чтобы видеть источник заявки:

```text
https://t.me/your_bot_username?start=instagram_spalnya
https://t.me/your_bot_username?start=instagram_catalog
https://t.me/your_bot_username?start=designers
https://t.me/your_bot_username?start=tradein
```

Источник попадёт в заявку менеджерам.

## Важно

Сейчас состояние заявки хранится в памяти serverless-функции. Для MVP этого достаточно, но на следующем этапе лучше подключить Supabase/Strapi, чтобы заявки и шаги клиента сохранялись надёжно.

Следующий этап:

- сохранять заявки в Supabase;
- подключить реальные товары из Strapi;
- сделать Telegram WebApp-каталог;
- добавить статусы менеджеров;
- добавить CSV-выгрузку заявок.
