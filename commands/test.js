const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'test',
  description: 'Команды для тестирования антикрашера',
  aliases: ['тест', 'testing'],
  usage: '!test <spam|channels|roles|mass|raid|report|cleanup|stop>',
  
  async execute(message, args, bot) {
    // Проверка прав доступа
    if (!bot.testingSystem.canRunTests(message.member)) {
      return message.reply('❌ У вас нет прав для запуска тестов!');
    }

    if (!args[0]) {
      const embed = {
        color: 0x00ff00,
        title: '🧪 Система тестирования антикрашера',
        description: 'Доступные команды для тестирования:',
        fields: [
          {
            name: '📨 Тест спама',
            value: '`!test spam [intensity]` - Тест защиты от спама сообщений\n(intensity: low/medium/high)',
            inline: false
          },
          {
            name: '📁 Тест каналов',
            value: '`!test channels [intensity]` - Тест защиты от спама каналов',
            inline: false
          },
          {
            name: '👥 Тест ролей',
            value: '`!test roles [intensity]` - Тест защиты от спама ролей',
            inline: false
          },
          {
            name: '💥 Массовый тест',
            value: '`!test mass [intensity]` - Комбинированный тест всех защит',
            inline: false
          },
          {
            name: '🚨 Симуляция рейда',
            value: '`!test raid [intensity]` - Симуляция массового подключения',
            inline: false
          },
          {
            name: '📊 Отчет',
            value: '`!test report` - Показать результаты тестирования',
            inline: false
          },
          {
            name: '🧹 Очистка',
            value: '`!test cleanup` - Удалить тестовые данные',
            inline: false
          },
          {
            name: '⏹️ Остановка',
            value: '`!test stop` - Остановить все активные тесты',
            inline: false
          },
          {
            name: '🔍 Диагностика',
            value: '`!test debug` - Проверить права доступа к тестам',
            inline: false
          }
        ],
        footer: {
          text: '⚠️ Тесты можно запускать только на тестовом сервере!'
        }
      };

      return message.reply({ embeds: [embed] });
    }

    const subCommand = args[0].toLowerCase();
    const intensity = args[1] || 'medium';

    try {
      switch (subCommand) {
        case 'spam':
        case 'спам':
          await this.handleSpamTest(message, bot, intensity);
          break;

        case 'channels':
        case 'каналы':
          await this.handleChannelTest(message, bot, intensity);
          break;

        case 'roles':
        case 'роли':
          await this.handleRoleTest(message, bot, intensity);
          break;

        case 'mass':
        case 'массовый':
          await this.handleMassTest(message, bot, intensity);
          break;

        case 'raid':
        case 'рейд':
          await this.handleRaidTest(message, bot, intensity);
          break;

        case 'report':
        case 'отчет':
          await this.handleReport(message, bot);
          break;

        case 'cleanup':
        case 'очистка':
          await this.handleCleanup(message, bot);
          break;

        case 'stop':
        case 'стоп':
          await this.handleStop(message, bot);
          break;

        case 'debug':
        case 'диагностика':
          await this.handleDebug(message, bot);
          break;

        default:
          message.reply('❌ Неизвестная команда! Используйте `!test` для списка команд.');
      }
    } catch (error) {
      bot.logger.error('Ошибка выполнения тестовой команды:', error);
      message.reply('❌ Произошла ошибка при выполнении теста!');
    }
  },

  async handleSpamTest(message, bot, intensity) {
    const loadingMsg = await message.reply('🧪 Запускаю тест спама...');
    
    try {
      const result = await bot.testingSystem.runSpamTest(message.channel, intensity);
      
      const embed = {
        color: result.effectiveness > 80 ? 0x00ff00 : result.effectiveness > 50 ? 0xffff00 : 0xff0000,
        title: '📨 Результат теста спама',
        fields: [
          { name: '📝 Отправлено сообщений', value: result.messagesSent.toString(), inline: true },
          { name: '🛡️ Заблокировано', value: result.messagesBlocked.toString(), inline: true },
          { name: '📊 Эффективность', value: `${result.effectiveness}%`, inline: true },
          { name: '⏱️ Длительность', value: `${Math.round(result.duration / 1000)}с`, inline: true }
        ],
        timestamp: new Date(),
        footer: { text: 'Anti-Crasher Testing System' }
      };

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      await loadingMsg.edit('❌ Ошибка при выполнении теста спама!');
    }
  },

  async handleChannelTest(message, bot, intensity) {
    const loadingMsg = await message.reply('🧪 Запускаю тест создания каналов...');
    
    try {
      const result = await bot.testingSystem.runChannelSpamTest(message.guild, intensity);
      
      const embed = {
        color: result.effectiveness > 80 ? 0x00ff00 : result.effectiveness > 50 ? 0xffff00 : 0xff0000,
        title: '📁 Результат теста каналов',
        fields: [
          { name: '📁 Создано каналов', value: result.channelsCreated.toString(), inline: true },
          { name: '🛡️ Заблокировано', value: result.channelsBlocked.toString(), inline: true },
          { name: '📊 Эффективность', value: `${result.effectiveness}%`, inline: true },
          { name: '⏱️ Длительность', value: `${Math.round(result.duration / 1000)}с`, inline: true }
        ],
        timestamp: new Date(),
        footer: { text: 'Anti-Crasher Testing System' }
      };

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      await loadingMsg.edit('❌ Ошибка при выполнении теста каналов!');
    }
  },

  async handleRoleTest(message, bot, intensity) {
    const loadingMsg = await message.reply('🧪 Запускаю тест создания ролей...');
    
    try {
      const result = await bot.testingSystem.runRoleSpamTest(message.guild, intensity);
      
      const embed = {
        color: result.effectiveness > 80 ? 0x00ff00 : result.effectiveness > 50 ? 0xffff00 : 0xff0000,
        title: '👥 Результат теста ролей',
        fields: [
          { name: '👥 Создано ролей', value: result.rolesCreated.toString(), inline: true },
          { name: '🛡️ Заблокировано', value: result.rolesBlocked.toString(), inline: true },
          { name: '📊 Эффективность', value: `${result.effectiveness}%`, inline: true },
          { name: '⏱️ Длительность', value: `${Math.round(result.duration / 1000)}с`, inline: true }
        ],
        timestamp: new Date(),
        footer: { text: 'Anti-Crasher Testing System' }
      };

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      await loadingMsg.edit('❌ Ошибка при выполнении теста ролей!');
    }
  },

  async handleMassTest(message, bot, intensity) {
    const loadingMsg = await message.reply('🧪 Запускаю массовый тест... Это может занять несколько минут.');
    
    try {
      const result = await bot.testingSystem.runMassActionTest(message.guild, message.channel, intensity);
      
      const embed = {
        color: result.overallEffectiveness > 80 ? 0x00ff00 : result.overallEffectiveness > 50 ? 0xffff00 : 0xff0000,
        title: '💥 Результат массового теста',
        fields: [
          { name: '📊 Общая эффективность', value: `${result.overallEffectiveness}%`, inline: true },
          { name: '⏱️ Общая длительность', value: `${Math.round(result.duration / 1000)}с`, inline: true },
          { name: '🧪 Подтестов выполнено', value: result.subTests.length.toString(), inline: true }
        ],
        description: result.subTests.map(test => 
          `${test.success ? '✅' : '❌'} ${test.type}: ${test.success ? `${test.result.effectiveness}%` : 'Ошибка'}`
        ).join('\n'),
        timestamp: new Date(),
        footer: { text: 'Anti-Crasher Testing System' }
      };

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      await loadingMsg.edit('❌ Ошибка при выполнении массового теста!');
    }
  },

  async handleRaidTest(message, bot, intensity) {
    const loadingMsg = await message.reply('🧪 Запускаю симуляцию рейда...');
    
    try {
      const result = await bot.testingSystem.simulateRaid(message.guild, intensity);
      
      const embed = {
        color: 0x00ff00,
        title: '🚨 Результат симуляции рейда',
        fields: [
          { name: '👥 Симулированных подключений', value: result.simulatedJoins.toString(), inline: true },
          { name: '⏱️ Длительность', value: `${Math.round(result.duration / 1000)}с`, inline: true }
        ],
        description: result.note,
        timestamp: new Date(),
        footer: { text: 'Anti-Crasher Testing System' }
      };

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      await loadingMsg.edit('❌ Ошибка при симуляции рейда!');
    }
  },

  async handleReport(message, bot) {
    const report = bot.testingSystem.generateTestReport();
    const activeTests = bot.testingSystem.getActiveTests();
    const protectionStats = bot.advancedProtection.getProtectionStats();

    const embed = {
      color: 0x0099ff,
      title: '📊 Отчет о тестировании антикрашера',
      description: report,
      fields: [
        {
          name: '🛡️ Статистика защиты',
          value: `Подозрительных пользователей: ${protectionStats.suspiciousUsers}\n` +
                 `Экстренный режим: ${protectionStats.emergencyMode ? '🔴 Активен' : '🟢 Неактивен'}\n` +
                 `Отслеживается лимитов: ${protectionStats.rateLimitTracking}`,
          inline: false
        }
      ],
      timestamp: new Date(),
      footer: { text: 'Anti-Crasher Bot v2.0' }
    };

    message.reply({ embeds: [embed] });
  },

  async handleCleanup(message, bot) {
    const loadingMsg = await message.reply('🧹 Запускаю очистку тестовых данных...');
    
    try {
      const result = await bot.testingSystem.cleanupTestData(message.guild);
      
      const embed = {
        color: 0x00ff00,
        title: '🧹 Очистка завершена',
        fields: [
          { name: '📁 Удалено каналов', value: result.cleanedChannels.toString(), inline: true },
          { name: '👥 Удалено ролей', value: result.cleanedRoles.toString(), inline: true }
        ],
        timestamp: new Date(),
        footer: { text: 'Anti-Crasher Testing System' }
      };

      await loadingMsg.edit({ content: '', embeds: [embed] });
    } catch (error) {
      await loadingMsg.edit('❌ Ошибка при очистке тестовых данных!');
    }
  },

  async handleStop(message, bot) {
    const stoppedCount = bot.testingSystem.stopAllTests();
    
    const embed = {
      color: 0xff9900,
      title: '⏹️ Тесты остановлены',
      description: `Остановлено активных тестов: ${stoppedCount}`,
      timestamp: new Date(),
      footer: { text: 'Anti-Crasher Testing System' }
    };

    message.reply({ embeds: [embed] });
  },

  async handleDebug(message, bot) {
    const member = message.member;
    
    // Проверки доступа
    const isOwner = member.guild.ownerId === member.id;
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const isAllowedTester = bot.config.testing.allowedTesters.includes(member.id);
    const hasTesterRole = bot.config.bypassRoles && bot.config.bypassRoles.some(role => 
      member.roles.cache.some(memberRole => 
        memberRole.name.toLowerCase().includes(role.toLowerCase())
      )
    );
    
    const canRunTests = bot.testingSystem.canRunTests(member);
    
    const embed = {
      color: canRunTests ? 0x00ff00 : 0xff0000,
      title: '🔍 Диагностика прав доступа к тестам',
      fields: [
        { name: '👤 Пользователь', value: `${member.user.tag} (ID: ${member.id})`, inline: false },
        { name: '🔧 Тестовый режим', value: bot.config.testing.enabled ? '✅ Включен' : '❌ Отключен', inline: true },
        { name: '👑 Владелец сервера', value: isOwner ? '✅ Да' : '❌ Нет', inline: true },
        { name: '🛡️ Администратор', value: isAdmin ? '✅ Да' : '❌ Нет', inline: true },
        { name: '📝 В списке тестеров', value: isAllowedTester ? '✅ Да' : '❌ Нет', inline: true },
        { name: '🎭 Роль тестера', value: hasTesterRole ? '✅ Да' : '❌ Нет', inline: true },
        { name: '🔐 Итоговый доступ', value: canRunTests ? '✅ РАЗРЕШЕН' : '❌ ЗАПРЕЩЕН', inline: true }
      ],
      description: `**Конфигурация системы тестирования:**\n\n` +
                   `• Разрешенные тестеры: ${bot.config.testing.allowedTesters.length > 0 ? bot.config.testing.allowedTesters.join(', ') : 'Не указаны'}\n` +
                   `• Роли обхода: ${bot.config.bypassRoles ? bot.config.bypassRoles.join(', ') : 'Не указаны'}\n\n` +
                   `${!canRunTests ? '**Как получить доступ:**\n• Убедитесь что TESTING_MODE=true\n• Добавьте свой ID в ALLOWED_TESTERS\n• Или получите роль администратора' : ''}`,
      timestamp: new Date(),
      footer: { text: 'Anti-Crasher Debug System' }
    };

    message.reply({ embeds: [embed] });
  }
};