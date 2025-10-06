#!/usr/bin/env node

/**
 * Debug script для проверки переменных окружения
 * Используйте: node debug-env.js
 */

console.log('🔍 Проверка переменных окружения Discord бота');
console.log('=' .repeat(50));

// Список обязательных переменных
const requiredVars = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID', 
  'GUILD_ID'
];

// Список опциональных переменных
const optionalVars = [
  'BOT_PREFIX',
  'LOG_CHANNEL_ID',
  'NODE_ENV',
  'SPAM_MESSAGE_LIMIT',
  'RAID_JOIN_LIMIT'
];

let hasErrors = false;

console.log('\n📋 Обязательные переменные:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Показываем только первые и последние символы для безопасности
    const masked = varName === 'DISCORD_TOKEN' 
      ? `${value.substring(0, 8)}...(скрыт)`
      : value;
    console.log(`✅ ${varName}: ${masked}`);
  } else {
    console.log(`❌ ${varName}: НЕ НАЙДЕНА`);
    hasErrors = true;
  }
});

console.log('\n🔧 Опциональные переменные:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚪ ${varName}: не установлена (используется по умолчанию)`);
  }
});

console.log('\n🌍 Системные переменные:');
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'не установлена'}`);
console.log(`🏠 PWD: ${process.cwd()}`);
console.log(`🔢 Node.js версия: ${process.version}`);

// Проверяем конфигурацию
console.log('\n⚙️  Загрузка конфигурации...');
try {
  const config = require('./config/config.js');
  console.log('✅ Конфигурация загружена успешно');
  
  // Проверяем ключевые значения
  if (!config.token) {
    console.log('❌ config.token пуст');
    hasErrors = true;
  }
  if (!config.clientId) {
    console.log('❌ config.clientId пуст'); 
    hasErrors = true;
  }
  if (!config.guildId) {
    console.log('❌ config.guildId пуст');
    hasErrors = true;
  }
  
} catch (error) {
  console.log(`❌ Ошибка загрузки конфигурации: ${error.message}`);
  hasErrors = true;
}

console.log('\n' + '=' .repeat(50));

if (hasErrors) {
  console.log('🚨 Обнаружены проблемы с конфигурацией!');
  console.log('\n🔧 Исправления:');
  console.log('1. Проверьте переменные окружения в Railway');
  console.log('2. Убедитесь что имена переменных правильные');
  console.log('3. DISCORD_CLIENT_ID должна содержать ваш Client ID');
  console.log('4. DISCORD_TOKEN должен содержать токен бота');
  console.log('5. GUILD_ID должен содержать ID вашего сервера');
  process.exit(1);
} else {
  console.log('🎉 Конфигурация выглядит правильно!');
  console.log('✅ Можно запускать бота');
  process.exit(0);
}