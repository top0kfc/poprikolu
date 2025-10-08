const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

class AntiSpam {
  constructor(client, config, logger) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    
    // Хранилище для отслеживания сообщений пользователей
    this.userMessages = new Map();
    
    // Очистка старых данных каждые 5 минут
    setInterval(() => {
      this.cleanupOldMessages();
    }, 5 * 60 * 1000);
  }

  handleMessage(message) {
    // Игнорируем системные сообщения
    if (message.system) return;
    
    // В тестовом режиме - проверяем только сообщения с префиксом "Test"
    if (this.config.testing && this.config.testing.enabled) {
      // Разрешаем тестировать только сообщения, начинающиеся с "Test"
      if (message.author.bot && !message.content.startsWith('Test')) return;
    } else {
      // В обычном режиме - игнорируем всех ботов
      if (message.author.bot) return;
    }
    
    // Игнорируем администраторов (НЕ во время тестов)
    if (!this.config.testing?.enabled && this.isAdmin(message.member)) return;

    // Проверяем спам
    if (this.isSpamming(message)) {
      this.handleSpam(message);
    }
    
    // Проверяем на инвайт-спам
    if (this.hasInviteSpam(message)) {
      this.handleInviteSpam(message);
    }
    
    // Проверяем на подозрительные паттерны
    if (this.hasSuspiciousContent(message)) {
      this.handleSuspiciousContent(message);
    }
  }

  isSpamming(message) {
    const userId = message.author.id;
    const now = Date.now();
    
    // Получаем историю сообщений пользователя
    if (!this.userMessages.has(userId)) {
      this.userMessages.set(userId, []);
    }
    
    const userMsgHistory = this.userMessages.get(userId);
    
    // Добавляем текущее сообщение
    userMsgHistory.push({
      timestamp: now,
      content: message.content,
      channelId: message.channel.id
    });
    
    // Удаляем старые сообщения (за пределами временного окна)
    const timeWindow = this.config.antiSpam.timeWindow;
    const recentMessages = userMsgHistory.filter(msg => 
      now - msg.timestamp <= timeWindow
    );
    
    this.userMessages.set(userId, recentMessages);
    
    // Проверяем превышение лимита
    if (recentMessages.length > this.config.antiSpam.messageLimit) {
      return true;
    }
    
    // Проверяем на одинаковые сообщения
    const uniqueMessages = new Set(recentMessages.map(msg => msg.content.toLowerCase()));
    if (recentMessages.length >= 3 && uniqueMessages.size === 1) {
      return true;
    }
    
    return false;
  }

  hasInviteSpam(message) {
    const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-z0-9]+/gi;
    const invites = message.content.match(inviteRegex) || [];
    
    return invites.length > this.config.antiCrash.maxInvitesPerMessage;
  }

  hasSuspiciousContent(message) {
    const content = message.content.toLowerCase();
    
    // Подозрительные паттерны
    const suspiciousPatterns = [
      /crash|крэш|краш/gi,
      /raid|рейд/gi,
      /nuke|нюк/gi,
      /token|токен/gi,
      /ddos|ддос/gi,
      /@everyone|@here/gi, // Массовые упоминания
      /nitro.*free|бесплатный.*nitro/gi,
      /discord\.gift/gi
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  async handleSpam(message) {
    try {
      const user = message.author;
      const guild = message.guild;
      
      this.logger.security(`Обнаружен спам от пользователя ${user.tag} (${user.id})`, {
        userId: user.id,
        username: user.tag,
        channelId: message.channel.id,
        messageContent: message.content.substring(0, 100)
      });

      // Удаляем сообщение
      if (message.deletable) {
        await message.delete();
      }

      // Мутим пользователя
      await this.muteUser(message.member);

      // Удаляем последние сообщения пользователя
      await this.deleteRecentMessages(message.author.id, message.channel);

      // Отправляем уведомление в логи
      await this.sendSecurityLog(guild, 'Обнаружен спам', {
        user: user.tag,
        userId: user.id,
        action: 'Мут на 5 минут + удаление сообщений',
        reason: 'Превышение лимита сообщений или повторяющиеся сообщения'
      });

      // Уведомляем пользователя (в ЛС)
      try {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🛡️ Антиспам система')
          .setDescription('Вы были временно заблокированы за спам.')
          .addFields(
            { name: 'Причина', value: 'Превышение лимита сообщений', inline: true },
            { name: 'Длительность', value: '5 минут', inline: true }
          )
          .setTimestamp();
        
        await user.send({ embeds: [embed] });
      } catch (dmError) {
        this.logger.warn(`Не удалось отправить ЛС пользователю ${user.tag}:`, dmError);
      }

    } catch (error) {
      this.logger.error('Ошибка при обработке спама:', error);
    }
  }

  async handleInviteSpam(message) {
    try {
      const user = message.author;
      
      this.logger.security(`Обнаружен инвайт-спам от пользователя ${user.tag} (${user.id})`, {
        userId: user.id,
        username: user.tag,
        messageContent: message.content
      });

      // Удаляем сообщение
      if (message.deletable) {
        await message.delete();
      }

      // Предупреждаем пользователя
      const warningEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⚠️ Предупреждение')
        .setDescription(`${user}, избегайте отправки большого количества приглашений Discord!`)
        .setTimestamp();

      await message.channel.send({ embeds: [warningEmbed] });

      // Логируем
      await this.sendSecurityLog(message.guild, 'Инвайт-спам', {
        user: user.tag,
        userId: user.id,
        action: 'Удаление сообщения + предупреждение',
        reason: 'Превышение лимита инвайтов в сообщении'
      });

    } catch (error) {
      this.logger.error('Ошибка при обработке инвайт-спама:', error);
    }
  }

  async handleSuspiciousContent(message) {
    try {
      const user = message.author;
      
      this.logger.security(`Подозрительный контент от пользователя ${user.tag} (${user.id})`, {
        userId: user.id,
        username: user.tag,
        messageContent: message.content
      });

      // Удаляем сообщение
      if (message.deletable) {
        await message.delete();
      }

      // Отправляем предупреждение
      const embed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('🔒 Подозрительная активность')
        .setDescription(`${user}, ваше сообщение было удалено за подозрительный контент.`)
        .setTimestamp();

      const sentMessage = await message.channel.send({ embeds: [embed] });
      
      // Удаляем предупреждение через 10 секунд
      setTimeout(() => {
        if (sentMessage.deletable) {
          sentMessage.delete().catch(() => {});
        }
      }, 10000);

    } catch (error) {
      this.logger.error('Ошибка при обработке подозрительного контента:', error);
    }
  }

  async muteUser(member) {
    try {
      const muteDuration = this.config.antiSpam.muteDuration;
      
      // Ищем роль для мута или создаем её
      let muteRole = member.guild.roles.cache.find(role => role.name === 'Muted');
      
      if (!muteRole) {
        muteRole = await member.guild.roles.create({
          name: 'Muted',
          color: '#818181',
          permissions: []
        });

        // Настраиваем запреты для всех каналов
        member.guild.channels.cache.forEach(async (channel) => {
          try {
            await channel.permissionOverwrites.create(muteRole, {
              SendMessages: false,
              Speak: false,
              AddReactions: false
            });
          } catch (error) {
            this.logger.warn(`Не удалось настроить права для канала ${channel.name}:`, error);
          }
        });
      }

      // Назначаем роль мута
      await member.roles.add(muteRole);

      // Убираем мут через указанное время
      setTimeout(async () => {
        try {
          if (member.roles.cache.has(muteRole.id)) {
            await member.roles.remove(muteRole);
            this.logger.action(`Снят мут с пользователя ${member.user.tag}`);
          }
        } catch (error) {
          this.logger.error('Ошибка при снятии мута:', error);
        }
      }, muteDuration);

    } catch (error) {
      this.logger.error('Ошибка при муте пользователя:', error);
    }
  }

  async deleteRecentMessages(userId, channel) {
    try {
      const messages = await channel.messages.fetch({ limit: 50 });
      const userMessages = messages.filter(msg => 
        msg.author.id === userId && 
        Date.now() - msg.createdTimestamp < 60000 // Последние 60 секунд
      );

      for (const message of userMessages.values()) {
        if (message.deletable) {
          await message.delete();
        }
      }
      
      this.logger.action(`Удалено ${userMessages.size} сообщений пользователя ${userId}`);
    } catch (error) {
      this.logger.error('Ошибка при удалении сообщений:', error);
    }
  }

  async sendSecurityLog(guild, title, details) {
    try {
      const logChannelId = this.config.logChannelId;
      if (!logChannelId) return;

      const logChannel = guild.channels.cache.get(logChannelId);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`🛡️ ${title}`)
        .addFields(
          { name: 'Пользователь', value: `${details.user} (${details.userId})`, inline: true },
          { name: 'Действие', value: details.action, inline: true },
          { name: 'Причина', value: details.reason, inline: false }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      this.logger.error('Ошибка при отправке лога безопасности:', error);
    }
  }

  isAdmin(member) {
    if (!member) return false;
    
    return member.permissions.has(PermissionFlagsBits.Administrator) ||
           member.permissions.has(PermissionFlagsBits.ManageGuild) ||
           this.config.adminRoles.some(roleName => 
             member.roles.cache.some(role => 
               role.name.toLowerCase().includes(roleName.toLowerCase())
             )
           );
  }

  cleanupOldMessages() {
    const now = Date.now();
    const timeWindow = this.config.antiSpam.timeWindow;
    
    for (const [userId, messages] of this.userMessages.entries()) {
      const recentMessages = messages.filter(msg => 
        now - msg.timestamp <= timeWindow * 2
      );
      
      if (recentMessages.length === 0) {
        this.userMessages.delete(userId);
      } else {
        this.userMessages.set(userId, recentMessages);
      }
    }
    
    this.logger.info(`Очистка устаревших данных: активных пользователей ${this.userMessages.size}`);
  }
}

module.exports = AntiSpam;