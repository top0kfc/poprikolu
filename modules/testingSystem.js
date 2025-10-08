const { PermissionFlagsBits, ChannelType } = require('discord.js');

class TestingSystem {
  constructor(client, config, logger) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    this.activeTests = new Map();
    this.testResults = [];
  }

  /**
   * Проверяет, может ли пользователь запускать тесты
   */
  canRunTests(member) {
    if (!member) {
      this.logger.info('canRunTests: member не найден');
      return false;
    }

    // Если тестовый режим отключен - никто не может запускать тесты
    if (!this.config.testing.enabled) {
      this.logger.info('canRunTests: TESTING_MODE отключен');
      return false;
    }
    
    // Проверка на владельца сервера (guild owner)
    const isOwner = member.guild.ownerId === member.id;
    if (isOwner) {
      this.logger.info(`canRunTests: ${member.user.tag} является владельцем сервера - доступ разрешен`);
      return true;
    }
    
    // Проверка на администратора
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    if (isAdmin) {
      this.logger.info(`canRunTests: ${member.user.tag} имеет права администратора - доступ разрешен`);
      return true;
    }
    
    // Проверка в списке разрешенных тестировщиков
    const isAllowedTester = this.config.testing.allowedTesters.includes(member.id);
    if (isAllowedTester) {
      this.logger.info(`canRunTests: ${member.user.tag} в списке разрешенных тестировщиков - доступ разрешен`);
      return true;
    }
    
    // Проверка на роли тестировщиков
    const hasTesterRole = this.config.bypassRoles && this.config.bypassRoles.some(role => 
      member.roles.cache.some(memberRole => 
        memberRole.name.toLowerCase().includes(role.toLowerCase())
      )
    );
    
    if (hasTesterRole) {
      this.logger.info(`canRunTests: ${member.user.tag} имеет роль тестировщика - доступ разрешен`);
      return true;
    }

    // Если ни одно условие не выполнено - доступ запрещен
    this.logger.info(`canRunTests: ${member.user.tag} не имеет прав для тестирования`);
    this.logger.info(`canRunTests: isOwner=${isOwner}, isAdmin=${isAdmin}, isAllowedTester=${isAllowedTester}, hasTesterRole=${hasTesterRole}`);
    
    return false;
  }

  /**
   * Запускает тест спама сообщений
   */
  async runSpamTest(channel, intensity = 'medium', duration = 30000) {
    const testId = `spam-${Date.now()}`;
    const messageCount = this.getIntensityValue(intensity, { low: 10, medium: 25, high: 50 });
    const delay = Math.floor(duration / messageCount);

    this.logger.info(`🧪 Запуск теста спама: ${messageCount} сообщений за ${duration}ms`);

    this.activeTests.set(testId, {
      type: 'spam',
      startTime: Date.now(),
      expectedBlocked: 0,
      actualBlocked: 0
    });

    const messages = [
      'Test spam message 1',
      'Test spam message 2', 
      'Test spam message 3',
      'SPAM TEST MESSAGE IN CAPS',
      '@everyone test mention spam',
      'https://discord.gg/fake-invite-link',
      '🚨🚨🚨 EMERGENCY SPAM TEST 🚨🚨🚨',
      'Testing message flooding protection',
      'Identical message for duplicate test',
      'Identical message for duplicate test'
    ];

    let sentCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < messageCount; i++) {
      try {
        const messageContent = messages[i % messages.length] + ` #${i}`;
        await channel.send(messageContent);
        sentCount++;
        await this.delay(delay);
      } catch (error) {
        blockedCount++;
        this.logger.info(`Сообщение #${i} заблокировано: ${error.message}`);
      }
    }

    const testResult = {
      testId,
      type: 'spam',
      duration: Date.now() - this.activeTests.get(testId).startTime,
      messagesSent: sentCount,
      messagesBlocked: blockedCount,
      effectiveness: Math.round((blockedCount / messageCount) * 100)
    };

    this.testResults.push(testResult);
    this.activeTests.delete(testId);

    this.logger.info(`✅ Тест спама завершен: отправлено ${sentCount}, заблокировано ${blockedCount} (${testResult.effectiveness}%)`);
    return testResult;
  }

  /**
   * Запускает тест создания каналов
   */
  async runChannelSpamTest(guild, intensity = 'low') {
    const testId = `channel-spam-${Date.now()}`;
    const channelCount = this.getIntensityValue(intensity, { low: 5, medium: 15, high: 30 });
    
    this.logger.info(`🧪 Запуск теста спама каналов: ${channelCount} каналов`);

    let createdCount = 0;
    let blockedCount = 0;

    this.activeTests.set(testId, {
      type: 'channelSpam',
      startTime: Date.now()
    });

    for (let i = 0; i < channelCount; i++) {
      try {
        await guild.channels.create({
          name: `test-channel-${i}-${Date.now()}`,
          type: ChannelType.GuildText,
          reason: 'Testing anti-crash protection'
        });
        createdCount++;
        await this.delay(1000); // 1 секунда между созданиями
      } catch (error) {
        blockedCount++;
        this.logger.info(`Создание канала #${i} заблокировано: ${error.message}`);
      }
    }

    const testResult = {
      testId,
      type: 'channelSpam',
      duration: Date.now() - this.activeTests.get(testId).startTime,
      channelsCreated: createdCount,
      channelsBlocked: blockedCount,
      effectiveness: Math.round((blockedCount / channelCount) * 100)
    };

    this.testResults.push(testResult);
    this.activeTests.delete(testId);

    this.logger.info(`✅ Тест спама каналов завершен: создано ${createdCount}, заблокировано ${blockedCount} (${testResult.effectiveness}%)`);
    return testResult;
  }

  /**
   * Запускает тест создания ролей
   */
  async runRoleSpamTest(guild, intensity = 'medium') {
    const testId = `role-spam-${Date.now()}`;
    const roleCount = this.getIntensityValue(intensity, { low: 3, medium: 8, high: 15 });
    
    this.logger.info(`🧪 Запуск теста спама ролей: ${roleCount} ролей`);

    let createdCount = 0;
    let blockedCount = 0;

    this.activeTests.set(testId, {
      type: 'roleSpam',
      startTime: Date.now()
    });

    for (let i = 0; i < roleCount; i++) {
      try {
        await guild.roles.create({
          name: `test-role-${i}-${Date.now()}`,
          color: Math.floor(Math.random() * 16777215),
          reason: 'Testing anti-crash protection'
        });
        createdCount++;
        await this.delay(2000); // 2 секунды между созданиями
      } catch (error) {
        blockedCount++;
        this.logger.info(`Создание роли #${i} заблокировано: ${error.message}`);
      }
    }

    const testResult = {
      testId,
      type: 'roleSpam',
      duration: Date.now() - this.activeTests.get(testId).startTime,
      rolesCreated: createdCount,
      rolesBlocked: blockedCount,
      effectiveness: Math.round((blockedCount / roleCount) * 100)
    };

    this.testResults.push(testResult);
    this.activeTests.delete(testId);

    this.logger.info(`✅ Тест спама ролей завершен: создано ${createdCount}, заблокировано ${blockedCount} (${testResult.effectiveness}%)`);
    return testResult;
  }

  /**
   * Запускает массовый тест действий (комбинированный)
   */
  async runMassActionTest(guild, channel, intensity = 'high') {
    const testId = `mass-action-${Date.now()}`;
    
    this.logger.info(`🧪 Запуск массового теста действий с интенсивностью: ${intensity}`);

    this.activeTests.set(testId, {
      type: 'massAction',
      startTime: Date.now()
    });

    const results = await Promise.allSettled([
      this.runSpamTest(channel, intensity, 15000),
      this.runChannelSpamTest(guild, intensity),
      this.runRoleSpamTest(guild, intensity)
    ]);

    const testResult = {
      testId,
      type: 'massAction',
      duration: Date.now() - this.activeTests.get(testId).startTime,
      subTests: results.map((result, index) => ({
        type: ['spam', 'channelSpam', 'roleSpam'][index],
        success: result.status === 'fulfilled',
        result: result.status === 'fulfilled' ? result.value : result.reason
      })),
      overallEffectiveness: this.calculateOverallEffectiveness(results)
    };

    this.testResults.push(testResult);
    this.activeTests.delete(testId);

    this.logger.info(`✅ Массовый тест завершен. Общая эффективность: ${testResult.overallEffectiveness}%`);
    return testResult;
  }

  /**
   * Симуляция рейда (множественные подключения)
   */
  async simulateRaid(guild, intensity = 'high') {
    const testId = `raid-simulation-${Date.now()}`;
    const connectionCount = this.getIntensityValue(intensity, { low: 10, medium: 25, high: 50 });
    
    this.logger.info(`🧪 Симуляция рейда: имитация ${connectionCount} быстрых подключений`);

    // Это симуляция - мы создаем события, имитирующие быстрые подключения
    this.activeTests.set(testId, {
      type: 'raidSimulation',
      startTime: Date.now()
    });

    const testResult = {
      testId,
      type: 'raidSimulation',
      duration: Date.now() - this.activeTests.get(testId).startTime,
      simulatedJoins: connectionCount,
      note: 'Симуляция рейда - проверяет только обнаружение паттернов'
    };

    this.testResults.push(testResult);
    this.activeTests.delete(testId);

    return testResult;
  }

  /**
   * Очистка тестовых данных
   */
  async cleanupTestData(guild) {
    this.logger.info('🧹 Начинаем очистку тестовых данных...');

    let cleanedChannels = 0;
    let cleanedRoles = 0;

    // Удаляем тестовые каналы
    const channels = guild.channels.cache.filter(channel => 
      channel.name.includes('test-channel-') && channel.manageable
    );

    for (const channel of channels.values()) {
      try {
        await channel.delete('Cleanup test data');
        cleanedChannels++;
        await this.delay(1000);
      } catch (error) {
        this.logger.warn(`Не удалось удалить тестовый канал ${channel.name}: ${error.message}`);
      }
    }

    // Удаляем тестовые роли
    const roles = guild.roles.cache.filter(role => 
      role.name.includes('test-role-') && role.editable
    );

    for (const role of roles.values()) {
      try {
        await role.delete('Cleanup test data');
        cleanedRoles++;
        await this.delay(1000);
      } catch (error) {
        this.logger.warn(`Не удалось удалить тестовую роль ${role.name}: ${error.message}`);
      }
    }

    this.logger.info(`✅ Очистка завершена: удалено ${cleanedChannels} каналов и ${cleanedRoles} ролей`);
    
    return {
      cleanedChannels,
      cleanedRoles
    };
  }

  /**
   * Получает результаты последних тестов
   */
  getTestResults(limit = 10) {
    return this.testResults.slice(-limit);
  }

  /**
   * Получает активные тесты
   */
  getActiveTests() {
    return Array.from(this.activeTests.entries()).map(([id, test]) => ({
      id,
      ...test,
      duration: Date.now() - test.startTime
    }));
  }

  /**
   * Останавливает все активные тесты
   */
  stopAllTests() {
    const stoppedCount = this.activeTests.size;
    this.activeTests.clear();
    this.logger.info(`⏹️ Остановлено ${stoppedCount} активных тестов`);
    return stoppedCount;
  }

  // Утилитарные методы
  getIntensityValue(intensity, values) {
    return values[intensity] || values.medium;
  }

  calculateOverallEffectiveness(results) {
    const successful = results.filter(r => r.status === 'fulfilled');
    if (successful.length === 0) return 0;

    const totalEffectiveness = successful.reduce((sum, result) => {
      return sum + (result.value.effectiveness || 0);
    }, 0);

    return Math.round(totalEffectiveness / successful.length);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Генерирует отчет о тестировании
   */
  generateTestReport() {
    const recentTests = this.getTestResults(20);
    const activeTests = this.getActiveTests();

    if (recentTests.length === 0 && activeTests.length === 0) {
      return 'Нет данных о тестировании';
    }

    let report = '📊 **ОТЧЕТ О ТЕСТИРОВАНИИ АНТИКРАШЕРА**\n\n';

    if (activeTests.length > 0) {
      report += `🔄 **Активные тесты:** ${activeTests.length}\n`;
      activeTests.forEach(test => {
        report += `• ${test.type} - ${Math.round(test.duration / 1000)}с\n`;
      });
      report += '\n';
    }

    if (recentTests.length > 0) {
      report += `📈 **Последние ${recentTests.length} тестов:**\n`;
      
      const avgEffectiveness = Math.round(
        recentTests.reduce((sum, test) => sum + (test.effectiveness || test.overallEffectiveness || 0), 0) / recentTests.length
      );

      report += `Средняя эффективность: **${avgEffectiveness}%**\n\n`;

      recentTests.reverse().slice(0, 5).forEach(test => {
        const effectiveness = test.effectiveness || test.overallEffectiveness || 0;
        const emoji = effectiveness > 80 ? '🟢' : effectiveness > 50 ? '🟡' : '🔴';
        report += `${emoji} **${test.type}** - ${effectiveness}% эффективность\n`;
      });
    }

    return report;
  }
}

module.exports = TestingSystem;