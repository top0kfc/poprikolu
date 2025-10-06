#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class BotMonitor {
  constructor() {
    this.botProcess = null;
    this.restartCount = 0;
    this.maxRestarts = 5;
    this.restartDelay = 5000; // 5 секунд
    this.isRunning = false;
    this.logFile = path.join(__dirname, 'logs', 'monitor.log');
    
    // Создаем директорию для логов
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\\n`;\n    \n    console.log(logMessage.trim());\n    \n    // Записываем в файл\n    fs.appendFileSync(this.logFile, logMessage);\n  }\n\n  async startBot() {\n    if (this.isRunning) {\n      this.log('⚠️  Бот уже запущен');\n      return;\n    }\n\n    this.log('🚀 Запуск Discord бота...');\n    this.isRunning = true;\n\n    this.botProcess = spawn('node', ['index.js'], {\n      stdio: ['inherit', 'pipe', 'pipe'],\n      env: { ...process.env, NODE_ENV: 'production' }\n    });\n\n    // Обработка вывода\n    this.botProcess.stdout.on('data', (data) => {\n      process.stdout.write(data);\n    });\n\n    this.botProcess.stderr.on('data', (data) => {\n      process.stderr.write(data);\n    });\n\n    // Обработка завершения процесса\n    this.botProcess.on('exit', (code, signal) => {\n      this.isRunning = false;\n      \n      if (signal) {\n        this.log(`⚠️  Бот был остановлен сигналом: ${signal}`);\n      } else {\n        this.log(`❌ Бот завершился с кодом: ${code}`);\n      }\n\n      // Автоперезапуск\n      if (this.restartCount < this.maxRestarts) {\n        this.scheduleRestart();\n      } else {\n        this.log(`🚨 Достигнуто максимальное количество перезапусков (${this.maxRestarts})`);\n        this.log('💀 Мониторинг остановлен. Требуется ручное вмешательство.');\n        process.exit(1);\n      }\n    });\n\n    this.botProcess.on('error', (error) => {\n      this.log(`🔥 Критическая ошибка процесса бота: ${error.message}`);\n      this.isRunning = false;\n      this.scheduleRestart();\n    });\n  }\n\n  scheduleRestart() {\n    this.restartCount++;\n    this.log(`🔄 Планирую перезапуск #${this.restartCount} через ${this.restartDelay/1000} секунд...`);\n    \n    setTimeout(() => {\n      this.startBot();\n    }, this.restartDelay);\n\n    // Увеличиваем задержку для следующего перезапуска (exponential backoff)\n    this.restartDelay = Math.min(this.restartDelay * 1.5, 60000); // Максимум 1 минута\n  }\n\n  async stopBot() {\n    if (!this.isRunning || !this.botProcess) {\n      this.log('⚠️  Бот не запущен');\n      return;\n    }\n\n    this.log('🛑 Остановка бота...');\n    \n    // Пытаемся корректно завершить процесс\n    this.botProcess.kill('SIGTERM');\n    \n    // Если не завершился за 10 секунд, принудительно убиваем\n    setTimeout(() => {\n      if (this.isRunning) {\n        this.log('💀 Принудительная остановка бота...');\n        this.botProcess.kill('SIGKILL');\n      }\n    }, 10000);\n  }\n\n  async healthCheck() {\n    try {\n      const { spawn } = require('child_process');\n      \n      return new Promise((resolve) => {\n        const healthProcess = spawn('node', ['health-check.js'], { \n          stdio: 'pipe' \n        });\n        \n        healthProcess.on('exit', (code) => {\n          resolve(code === 0);\n        });\n        \n        healthProcess.on('error', () => {\n          resolve(false);\n        });\n      });\n    } catch (error) {\n      this.log(`🔥 Ошибка проверки здоровья: ${error.message}`);\n      return false;\n    }\n  }\n\n  async startMonitoring() {\n    this.log('👁️  Запуск мониторинга Discord бота');\n    this.log('=' .repeat(50));\n    \n    // Запускаем бота\n    await this.startBot();\n    \n    // Периодическая проверка здоровья\n    setInterval(async () => {\n      if (this.isRunning) {\n        const isHealthy = await this.healthCheck();\n        \n        if (!isHealthy) {\n          this.log('🚨 Обнаружены проблемы со здоровьем бота. Перезапускаю...');\n          this.stopBot();\n        } else {\n          this.log('✅ Проверка здоровья пройдена успешно');\n          // Сбрасываем счетчик перезапусков при успешной проверке\n          this.restartCount = 0;\n          this.restartDelay = 5000;\n        }\n      }\n    }, 300000); // Проверка каждые 5 минут\n\n    // Обработка сигналов для корректного завершения\n    process.on('SIGINT', () => {\n      this.log('📱 Получен сигнал SIGINT. Завершение мониторинга...');\n      this.stopBot();\n      setTimeout(() => process.exit(0), 5000);\n    });\n\n    process.on('SIGTERM', () => {\n      this.log('📱 Получен сигнал SIGTERM. Завершение мониторинга...');\n      this.stopBot();\n      setTimeout(() => process.exit(0), 5000);\n    });\n  }\n}\n\n// Запуск мониторинга\nif (require.main === module) {\n  const monitor = new BotMonitor();\n  monitor.startMonitoring().catch(error => {\n    console.error('Критическая ошибка мониторинга:', error);\n    process.exit(1);\n  });\n}\n\nmodule.exports = BotMonitor;"