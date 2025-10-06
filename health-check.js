const { Client } = require('discord.js');
const config = require('./config/config.js');

class HealthChecker {
  constructor() {
    this.client = null;
    this.isHealthy = false;
    this.lastCheck = null;
    this.errors = [];
  }

  async checkBot() {
    try {
      console.log('🔍 Проверка состояния Discord бота...');
      
      // Проверка конфигурации
      if (!config.token) {
        throw new Error('Discord токен не найден');
      }

      // Создаем временный клиент для проверки
      this.client = new Client({ intents: [] });
      
      // Устанавливаем таймаут
      const timeout = setTimeout(() => {
        throw new Error('Таймаут соединения с Discord API');
      }, 10000);

      await this.client.login(config.token);
      clearTimeout(timeout);

      // Проверяем статус
      if (this.client.isReady()) {
        this.isHealthy = true;
        console.log(`✅ Бот здоров! Подключен как ${this.client.user.tag}`);
        console.log(`📊 Серверов: ${this.client.guilds.cache.size}`);
        console.log(`👥 Пользователей: ${this.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`);
      } else {
        throw new Error('Бот не готов');
      }

      this.lastCheck = new Date();
      await this.client.destroy();
      return true;

    } catch (error) {
      this.isHealthy = false;
      this.errors.push({
        timestamp: new Date(),
        error: error.message
      });
      console.error(`❌ Ошибка проверки здоровья: ${error.message}`);
      
      if (this.client) {
        await this.client.destroy();
      }
      
      return false;
    }
  }

  async checkMemory() {
    const used = process.memoryUsage();
    const mb = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;
    
    console.log('\n📈 Использование памяти:');
    console.log(`- RSS: ${mb(used.rss)} MB`);
    console.log(`- Heap Used: ${mb(used.heapUsed)} MB`);
    console.log(`- Heap Total: ${mb(used.heapTotal)} MB`);
    console.log(`- External: ${mb(used.external)} MB`);
    
    // Предупреждение при высоком использовании памяти
    if (mb(used.rss) > 500) {
      console.log('⚠️  Высокое использование памяти!');
      return false;
    }
    
    return true;
  }

  getStatus() {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastCheck,
      errors: this.errors.slice(-5), // Последние 5 ошибок
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      version: process.version,
      platform: process.platform
    };
  }
}

// Запуск проверки
async function runHealthCheck() {
  const checker = new HealthChecker();
  
  console.log('🏥 Запуск проверки здоровья Discord бота');
  console.log('═'.repeat(50));
  
  const botStatus = await checker.checkBot();
  const memoryStatus = checker.checkMemory();
  
  console.log('\n📋 Результаты проверки:');
  console.log(`- Статус бота: ${botStatus ? '✅ Здоров' : '❌ Проблемы'}`);
  console.log(`- Память: ${memoryStatus ? '✅ OK' : '⚠️ Высокое использование'}`);
  console.log(`- Время работы: ${Math.floor(process.uptime())} секунд`);
  
  // Возвращаем код выхода для использования в мониторинге
  process.exit(botStatus && memoryStatus ? 0 : 1);
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
  runHealthCheck().catch(error => {
    console.error('Критическая ошибка health check:', error);
    process.exit(1);
  });
}

module.exports = HealthChecker;