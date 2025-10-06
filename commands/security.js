const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'security',
  description: 'Команды управления системой безопасности',
  aliases: ['sec', 'защита'],
  adminOnly: true,
  
  async execute(message, args, bot) {
    const member = message.member;
    
    // Проверяем права администратора
    if (!bot.hasAdminRole(member) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const noPermEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Недостаточно прав')
        .setDescription('У вас нет прав для использования этой команды.')
        .setTimestamp();
      
      return message.reply({ embeds: [noPermEmbed] });
    }

    const subCommand = args[0]?.toLowerCase();
    
    switch (subCommand) {
      case 'status':
        await this.showStatus(message, bot);
        break;
      case 'lockdown':
        await this.toggleLockdown(message, args, bot);
        break;
      case 'settings':
        await this.showSettings(message, bot);
        break;
      case 'whitelist':
        await this.manageWhitelist(message, args, bot);
        break;
      case 'logs':
        await this.showRecentLogs(message, args, bot);
        break;
      default:
        await this.showHelp(message, bot);
    }
  },

  async showStatus(message, bot) {
    const lockdownStatus = bot.raidProtection.isLockdownActive();
    const statsEmbed = new EmbedBuilder()
      .setColor(lockdownStatus ? 0xFF0000 : 0x00FF00)
      .setTitle('🛡️ Статус системы безопасности')
      .addFields(
        { 
          name: 'Режим блокировки', 
          value: lockdownStatus ? '🔴 Активен' : '🟢 Неактивен', 
          inline: true 
        },
        { 
          name: 'Антиспам', 
          value: bot.config.antiSpam.enabled ? '✅ Включен' : '❌ Отключен', 
          inline: true 
        },
        { 
          name: 'Анти-рейд', 
          value: bot.config.raidProtection.enabled ? '✅ Включен' : '❌ Отключен', 
          inline: true 
        },
        { 
          name: 'Анти-краш', 
          value: bot.config.antiCrash.enabled ? '✅ Включен' : '❌ Отключен', 
          inline: true 
        },
        { 
          name: 'Лимит сообщений', 
          value: `${bot.config.antiSpam.messageLimit} за ${bot.config.antiSpam.timeWindow/1000}с`, 
          inline: true 
        },
        { 
          name: 'Лимит присоединений', 
          value: `${bot.config.raidProtection.joinLimit} за ${bot.config.raidProtection.timeWindow/1000}с`, 
          inline: true 
        }
      )
      .setTimestamp();

    message.reply({ embeds: [statsEmbed] });
  },

  async toggleLockdown(message, args, bot) {
    const action = args[1]?.toLowerCase();
    
    if (action === 'on' || action === 'enable' || action === 'включить') {
      await bot.raidProtection.enableLockdown(message.guild);
      
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🔒 Режим блокировки включен')
        .setDescription('Все новые пользователи будут автоматически кикаться до отключения режима.')
        .setTimestamp();
      
      message.reply({ embeds: [embed] });
      
    } else if (action === 'off' || action === 'disable' || action === 'отключить') {
      await bot.raidProtection.disableLockdown(message.guild);
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🔓 Режим блокировки отключен')
        .setDescription('Новые пользователи снова могут присоединяться к серверу.')
        .setTimestamp();
      
      message.reply({ embeds: [embed] });
      
    } else {
      const helpEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('❓ Управление режимом блокировки')
        .setDescription('Используйте: `!security lockdown on/off`')
        .addFields(
          { name: 'Включить', value: '`!security lockdown on`', inline: true },
          { name: 'Отключить', value: '`!security lockdown off`', inline: true }
        )
        .setTimestamp();
      
      message.reply({ embeds: [helpEmbed] });
    }
  },

  async showSettings(message, bot) {
    const settingsEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('⚙️ Настройки системы безопасности')
      .addFields(
        { 
          name: '📨 Антиспам настройки', 
          value: `• Лимит сообщений: ${bot.config.antiSpam.messageLimit}\n• Временное окно: ${bot.config.antiSpam.timeWindow/1000}с\n• Длительность мута: ${bot.config.antiSpam.muteDuration/60000} мин`, 
          inline: false 
        },
        { 
          name: '🚪 Анти-рейд настройки', 
          value: `• Лимит присоединений: ${bot.config.raidProtection.joinLimit}\n• Временное окно: ${bot.config.raidProtection.timeWindow/1000}с\n• Роль карантина: ${bot.config.raidProtection.quarantineRole}`, 
          inline: false 
        },
        { 
          name: '💥 Анти-краш настройки', 
          value: `• Макс каналов в час: ${bot.config.antiCrash.maxChannelsPerHour}\n• Макс ролей в час: ${bot.config.antiCrash.maxRolesPerHour}\n• Макс инвайтов в сообщении: ${bot.config.antiCrash.maxInvitesPerMessage}`, 
          inline: false 
        }
      )
      .setTimestamp();

    message.reply({ embeds: [settingsEmbed] });
  },

  async manageWhitelist(message, args, bot) {
    const action = args[1]?.toLowerCase();
    const targetUser = message.mentions.users.first();
    
    if (!action || !['add', 'remove', 'list', 'добавить', 'удалить', 'список'].includes(action)) {
      const helpEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('❓ Управление белым списком')
        .setDescription('Белый список позволяет исключить пользователей из проверок безопасности')
        .addFields(
          { name: 'Добавить', value: '`!security whitelist add @пользователь`', inline: false },
          { name: 'Удалить', value: '`!security whitelist remove @пользователь`', inline: false },
          { name: 'Показать список', value: '`!security whitelist list`', inline: false }
        )
        .setTimestamp();
      
      return message.reply({ embeds: [helpEmbed] });
    }

    if (action === 'list' || action === 'список') {
      // Здесь можно добавить логику для показа белого списка
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📋 Белый список')
        .setDescription('Функция в разработке')
        .setTimestamp();
      
      return message.reply({ embeds: [embed] });
    }

    if (!targetUser) {
      return message.reply('❌ Укажите пользователя для добавления/удаления из белого списка.');
    }

    // Здесь можно добавить логику управления белым списком
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('⚠️ В разработке')
      .setDescription('Функция белого списка будет добавлена в следующих обновлениях.')
      .setTimestamp();
    
    message.reply({ embeds: [embed] });
  },

  async showRecentLogs(message, args, bot) {
    const logType = args[1]?.toLowerCase();
    
    // Здесь можно добавить логику для показа логов
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📝 Последние события безопасности')
      .setDescription('Функция просмотра логов в разработке.\n\nПока что вы можете проверить файлы логов в папке `logs/`')
      .addFields(
        { name: 'Доступные типы', value: 'spam, raid, crash, security', inline: false },
        { name: 'Пример', value: '`!security logs spam`', inline: false }
      )
      .setTimestamp();
    
    message.reply({ embeds: [embed] });
  },

  async showHelp(message, bot) {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🛡️ Команды системы безопасности')
      .setDescription(`Используйте: \`${bot.config.prefix}security [команда]\``)
      .addFields(
        { name: '📊 Status', value: '`status` - Показать статус всех систем', inline: true },
        { name: '🔒 Lockdown', value: '`lockdown on/off` - Управление режимом блокировки', inline: true },
        { name: '⚙️ Settings', value: '`settings` - Показать все настройки', inline: true },
        { name: '📋 Whitelist', value: '`whitelist add/remove/list` - Управление белым списком', inline: true },
        { name: '📝 Logs', value: '`logs [тип]` - Показать последние логи', inline: true },
        { name: '❓ Help', value: '`help` - Показать эту справку', inline: true }
      )
      .setFooter({ text: 'Все команды доступны только администраторам' })
      .setTimestamp();

    message.reply({ embeds: [helpEmbed] });
  }
};