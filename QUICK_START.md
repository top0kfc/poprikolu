# ⚡ Быстрый старт - Railway хостинг

## 🚀 Самый простой способ запустить бота 24/7

### Шаг 1: Подготовьте Discord бота
1. Создайте приложение на [Discord Developer Portal](https://discord.com/developers/applications)
2. Создайте бота и скопируйте токен
3. Включите интенты: **Server Members Intent** и **Message Content Intent**
4. Добавьте бота на сервер с правами **Administrator**

### Шаг 2: Деплой на Railway
1. Перейдите на [railway.app](https://railway.app) и создайте аккаунт
2. Нажмите **\"New Project\"** → **\"Deploy from GitHub repo\"**
3. Выберите репозиторий `poprikolu`
4. Railway автоматически начнет сборку

### Шаг 3: Настройте переменные окружения
В панели Railway добавьте переменные:
```
DISCORD_TOKEN=ваш_токен_бота_здесь
GUILD_ID=id_вашего_сервера
DISCORD_CLIENT_ID=id_вашего_приложения
BOT_PREFIX=!
```

### Шаг 4: Готово! 🎉
Бот запустится автоматически и будет работать 24/7.

## ✅ Проверка работы
1. Откройте логи в Railway
2. Убедитесь что бот подключился
3. Протестируйте команду `!security status` на сервере

## 📊 Мониторинг
- **Логи**: Railway Dashboard → Logs
- **Метрики**: Railway Dashboard → Metrics  
- **Статус**: Команда `!security status`

## 🔄 Автоматические обновления
При push в ветку `main` Railway автоматически обновит бота.

---
Время настройки: **~5 минут**
Стоимость: **Бесплатно** (500 часов в месяц)