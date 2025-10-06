# 🚀 Гайд по 24/7 хостингу Discord Anti-Crasher Bot

Этот документ содержит полные инструкции по размещению вашего Discord бота на различных платформах для обеспечения круглосуточной работы.

## 📋 Предварительные требования

### 1. Подготовка бота
- ✅ Discord Application создан в [Discord Developer Portal](https://discord.com/developers/applications)
- ✅ Бот токен получен
- ✅ Необходимые интенты включены (Server Members Intent, Message Content Intent)
- ✅ Бот добавлен на сервер с нужными правами

### 2. Переменные окружения
Создайте файл `.env` на основе `.env.example`:

```bash
DISCORD_TOKEN=ваш_токен_бота
DISCORD_CLIENT_ID=id_приложения
GUILD_ID=id_вашего_сервера
BOT_PREFIX=!
LOG_CHANNEL_ID=id_канала_для_логов
```

## 🐳 Docker хостинг

### Локальное развертывание
```bash
# Сборка образа
npm run docker:build

# Запуск в фоне
npm run docker:run

# Просмотр логов
npm run docker:logs

# Остановка
npm run docker:stop
```

### Docker на VPS
```bash
# 1. Клонируйте репозиторий
git clone https://github.com/top0kfc/poprikolu.git
cd poprikolu
git checkout feature/discord-anti-crasher-bot

# 2. Создайте .env файл
cp .env.example .env
# Отредактируйте .env со своими значениями

# 3. Запустите
docker-compose up -d

# 4. Проверьте статус
docker-compose ps
docker-compose logs -f discord-bot
```

## 🚄 Railway (Рекомендуется)

Railway - это современная платформа с простым развертыванием из GitHub.

### Автоматическое развертывание
1. **Подключите репозиторий к Railway:**
   - Зайдите на [railway.app](https://railway.app)
   - Создайте новый проект
   - Выберите \"Deploy from GitHub repo\"
   - Выберите ваш форк репозитория

2. **Настройте переменные окружения:**
   ```
   DISCORD_TOKEN=ваш_токен_бота
   DISCORD_CLIENT_ID=id_приложения
   GUILD_ID=id_вашего_сервера
   BOT_PREFIX=!
   LOG_CHANNEL_ID=id_канала_для_логов
   NODE_ENV=production
   ```

3. **Деплой будет происходить автоматически** при каждом push в main ветку.

### Преимущества Railway:
- ✅ Бесплатный тариф на 500 часов в месяц
- ✅ Автоматический деплой из GitHub
- ✅ Встроенный мониторинг
- ✅ Простая настройка переменных окружения

## 📦 Heroku

### Развертывание одной кнопкой
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

### Ручное развертывание
```bash
# 1. Установите Heroku CLI
# 2. Войдите в аккаунт
heroku login

# 3. Создайте приложение
heroku create ваше-имя-приложения

# 4. Установите переменные окружения
heroku config:set DISCORD_TOKEN=ваш_токен_бота
heroku config:set DISCORD_CLIENT_ID=id_приложения
heroku config:set GUILD_ID=id_вашего_сервера

# 5. Деплой
git push heroku main

# 6. Включите worker процесс
heroku ps:scale worker=1
```

### Важно для Heroku:
- Используется `worker` процесс (не `web`)
- Eco dyno засыпает через 30 минут неактивности
- Для 24/7 работы нужен платный план

## 🖥️ VPS с PM2

### Установка на Ubuntu/Debian
```bash
# 1. Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Установите PM2 глобально
sudo npm install -g pm2

# 3. Клонируйте и настройте бот
git clone https://github.com/top0kfc/poprikolu.git
cd poprikolu
git checkout feature/discord-anti-crasher-bot
npm install
cp .env.example .env
# Отредактируйте .env

# 4. Запустите с PM2
npm run pm2:start

# 5. Настройте автозапуск
pm2 startup
pm2 save
```

### PM2 команды
```bash
# Статус
pm2 status

# Логи
pm2 logs discord-bot

# Перезапуск
pm2 restart discord-bot

# Остановка
pm2 stop discord-bot

# Мониторинг
pm2 monit
```

## 📊 Мониторинг и health checks

### Встроенная проверка здоровья
```bash
# Запуск health check
npm run health

# Запуск с мониторингом и автоперезапуском
node monitor.js
```

### Мониторинг включает:
- ✅ Проверка подключения к Discord API
- ✅ Мониторинг использования памяти
- ✅ Автоматический перезапуск при сбоях
- ✅ Логирование всех событий

## 🔧 Настройка GitHub Actions

GitHub Actions автоматически:
- Тестируют код при каждом push
- Собирают Docker образ
- Запускают проверки безопасности
- Готовят для деплоя на Railway

## 🚨 Устранение неполадок

### Частые проблемы:

#### Бот не подключается
```bash
# Проверьте токен
echo $DISCORD_TOKEN
# Проверьте интенты в Discord Developer Portal
```

#### Высокое использование памяти
```bash
# Проверка памяти
npm run health
# Перезапуск
pm2 restart discord-bot
```

#### Логи не записываются
```bash
# Создайте директорию логов
mkdir -p logs
chmod 755 logs
```

## 💡 Рекомендации

### Для начинающих:
1. **Railway** - самый простой способ
2. Настройте GitHub автодеплой
3. Используйте встроенный мониторинг

### Для опытных:
1. **VPS с Docker** - максимальный контроль
2. **PM2** для продвинутого мониторинга
3. Настройте свои health checks

### Безопасность:
- ❌ Никогда не коммитьте .env файлы
- ✅ Используйте переменные окружения
- ✅ Регулярно обновляйте зависимости
- ✅ Мониторьте логи на подозрительную активность

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи бота
2. Запустите health check
3. Убедитесь что все переменные окружения настроены
4. Проверьте статус Discord API

---

**Статус проекта:** ✅ Готов к продакшену  
**Последнее обновление:** $(date)

Ваш Discord Anti-Crasher Bot готов к круглосуточной работе! 🎉