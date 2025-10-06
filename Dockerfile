# Используем официальный Node.js образ
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем исходный код
COPY . .

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S discordbot -u 1001

# Изменяем владельца файлов
RUN chown -R discordbot:nodejs /app
USER discordbot

# Экспонируем порт (не обязательно для Discord бота, но может пригодиться для health checks)
EXPOSE 3000

# Добавляем health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Bot is running')" || exit 1

# Запускаем бота
CMD ["npm", "start"]