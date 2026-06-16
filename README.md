# RichHouse Game Bot

RichHouse Деньги в Дом — игровая воронка продаж для мебельного бренда.

Человек бесплатно заходит в Telegram-бот, каждый день открывает коробку, получает баллы и билеты, участвует в розыгрышах RichHouse и может оставить заявку на подбор мебели.

## Что уже заложено в MVP

- Лендинг Next.js.
- Telegram webhook.
- Ежедневная коробка.
- Баллы и билеты.
- Создание заявки на подбор мебели.
- Уведомление менеджеру в Telegram.
- Базовая админка.
- Supabase schema в sql/schema.sql.

## Стек

- Next.js + TypeScript
- Supabase PostgreSQL
- Telegram Bot API
- Vercel

## Переменные окружения

Скопируй .env.example в .env.local и заполни значения.

## Запуск локально

npm install
npm run dev

Сайт: http://localhost:3000
Админка: http://localhost:3000/admin?secret=change-me

## Supabase

1. Создать Supabase project.
2. Открыть SQL Editor.
3. Вставить и выполнить sql/schema.sql.
4. Взять Project URL и service_role key.
5. Вставить значения в .env.local и Vercel env.

## Telegram webhook

После деплоя на Vercel нужно привязать webhook на адрес /api/bot через метод setWebhook в Telegram Bot API.

## Важно

Участие в игре должно быть бесплатным. Розыгрыш и правила акции нужно юридически оформить как рекламную стимулирующую акцию RichHouse.
