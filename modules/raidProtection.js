const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class RaidProtection {
  constructor(client, config, logger) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    
    // Отслеживание присоединений пользователей
    this.joinTracker = new Map();
    
    // Режим блокировки сервера
    this.lockdownMode = false;
    
    // Очистка данных каждые 10 минут
    setInterval(() => {
      this.cleanupJoinData();
    }, 10 * 60 * 1000);
  }

  async handleMemberJoin(member) {
    try {
      const guild = member.guild;
      const now = Date.now();
      
      // Получаем данные о присоединениях
      if (!this.joinTracker.has(guild.id)) {
        this.joinTracker.set(guild.id, []);
      }
      
      const joinData = this.joinTracker.get(guild.id);
      
      // Добавляем новое присоединение
      joinData.push({
        userId: member.id,
        timestamp: now,
        accountAge: now - member.user.createdTimestamp,
        username: member.user.username,
        avatar: member.user.avatar
      });
      
      // Удаляем старые записи (за пределами временного окна)
      const timeWindow = this.config.raidProtection.timeWindow;
      const recentJoins = joinData.filter(join => 
        now - join.timestamp <= timeWindow
      );
      
      this.joinTracker.set(guild.id, recentJoins);
      
      // Проверяем на рейд
      if (this.isRaidDetected(recentJoins, member)) {
        await this.handleRaidDetection(guild, recentJoins);
      }
      
      // Если в режиме блокировки - сразу кикаем новых пользователей
      if (this.lockdownMode) {
        await this.handleLockdownJoin(member);
      }
      
      // Проверяем подозрительные аккаунты
      if (this.isSuspiciousAccount(member)) {
        await this.handleSuspiciousAccount(member);
      }

    } catch (error) {
      this.logger.error('Ошибка в обработке присоединения пользователя:', error);
    }
  }

  isRaidDetected(recentJoins, currentMember) {
    const joinLimit = this.config.raidProtection.joinLimit;
    
    // Проверяем количество присоединений
    if (recentJoins.length >= joinLimit) {
      
      // Дополнительные критерии для рейда
      const newAccounts = recentJoins.filter(join => 
        join.accountAge < 24 * 60 * 60 * 1000 // Аккаунты младше 24 часов
      ).length;
      
      const similarNames = this.countSimilarUsernames(recentJoins);
      const noAvatarCount = recentJoins.filter(join => !join.avatar).length;
      
      // Рейд обнаружен если:
      // - Много новых аккаунтов (>50% от лимита)
      // - Много похожих имен (>30% от лимита) 
      // - Много аккаунтов без аватара (>60% от лимита)
      if (newAccounts >= Math.ceil(joinLimit * 0.5) ||
          similarNames >= Math.ceil(joinLimit * 0.3) ||
          noAvatarCount >= Math.ceil(joinLimit * 0.6)) {
        return true;
      }
    }
    
    return false;
  }

  countSimilarUsernames(joins) {
    const usernames = joins.map(join => join.username.toLowerCase());
    const groups = new Map();
    
    // Группируем похожие имена
    for (const username of usernames) {
      const basePattern = this.extractUsernamePattern(username);
      if (groups.has(basePattern)) {
        groups.set(basePattern, groups.get(basePattern) + 1);
      } else {
        groups.set(basePattern, 1);
      }
    }
    
    // Возвращаем максимальное количество похожих имен
    return Math.max(...groups.values());
  }

  extractUsernamePattern(username) {
    // Убираем цифры и специальные символы для поиска паттерна
    return username.replace(/[0-9_\-\.]+/g, '').substring(0, 8);
  }

  isSuspiciousAccount(member) {
    const accountAge = Date.now() - member.user.createdTimestamp;
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Аккаунт подозрительный если:
    return (
      accountAge < dayInMs * 7 && // Младше 7 дней
      !member.user.avatar && // Нет аватара
      /^[a-zA-Z]+[0-9]{4,}$/.test(member.user.username) // Имя типа "user1234"
    );
  }

  async handleRaidDetection(guild, recentJoins) {
    try {
      this.logger.security(`🚨 ОБНАРУЖЕН РЕЙД НА СЕРВЕРЕ ${guild.name}`, {
        guildId: guild.id,
        guildName: guild.name,
        joinsCount: recentJoins.length,
        timeWindow: this.config.raidProtection.timeWindow
      });

      // Включаем режим блокировки
      this.lockdownMode = true;

      // Кикаем всех недавно присоединившихся подозрительных пользователей
      let kickedCount = 0;
      for (const joinInfo of recentJoins) {
        try {
          const member = guild.members.cache.get(joinInfo.userId);
          if (member && this.shouldKickDuringRaid(joinInfo)) {
            await member.kick('Автоматическая защита от рейда');
            kickedCount++;
          }
        } catch (kickError) {
          this.logger.warn(`Не удалось кикнуть пользователя ${joinInfo.userId}:`, kickError);
        }
      }

      // Создаем роль карантина если её нет
      await this.ensureQuarantineRole(guild);

      // Уведомляем администраторов
      await this.notifyAdminsAboutRaid(guild, recentJoins.length, kickedCount);

      // Автоматически снимаем блокировку через 30 минут
      setTimeout(() => {
        this.lockdownMode = false;
        this.logger.info(`Режим блокировки отключен для сервера ${guild.name}`);
      }, 30 * 60 * 1000);

    } catch (error) {
      this.logger.error('Ошибка при обработке рейда:', error);
    }
  }

  shouldKickDuringRaid(joinInfo) {
    const accountAge = joinInfo.accountAge;
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Кикаем если аккаунт младше 3 дней и нет аватара
    return accountAge < dayInMs * 3 && !joinInfo.avatar;
  }

  async handleLockdownJoin(member) {
    try {
      this.logger.security(`Попытка присоединения во время блокировки: ${member.user.tag}`, {
        userId: member.id,
        username: member.user.tag
      });

      // Кикаем пользователя
      await member.kick('Сервер находится в режиме защиты от рейда');

      // Уведомляем в логи
      await this.sendSecurityLog(member.guild, 'Блокировка рейда', {
        user: member.user.tag,
        userId: member.id,
        action: 'Автоматический кик',
        reason: 'Сервер в режиме защиты от рейда'
      });

    } catch (error) {
      this.logger.error('Ошибка при обработке присоединения в режиме блокировки:', error);
    }
  }

  async handleSuspiciousAccount(member) {
    try {
      this.logger.security(`Подозрительный аккаунт: ${member.user.tag}`, {
        userId: member.id,
        username: member.user.tag,
        accountAge: Date.now() - member.user.createdTimestamp,
        hasAvatar: !!member.user.avatar
      });

      // Помещаем в карантин
      await this.quarantineUser(member);

      // Уведомляем модераторов
      await this.sendSecurityLog(member.guild, 'Подозрительный аккаунт', {
        user: member.user.tag,
        userId: member.id,
        action: 'Помещен в карантин',
        reason: 'Новый аккаунт с подозрительными признаками'
      });

    } catch (error) {
      this.logger.error('Ошибка при обработке подозрительного аккаунта:', error);
    }
  }

  async quarantineUser(member) {
    try {
      const quarantineRoleName = this.config.raidProtection.quarantineRole;
      let quarantineRole = member.guild.roles.cache.find(role => 
        role.name.toLowerCase() === quarantineRoleName.toLowerCase()
      );

      if (!quarantineRole) {
        await this.ensureQuarantineRole(member.guild);
        quarantineRole = member.guild.roles.cache.find(role => 
          role.name.toLowerCase() === quarantineRoleName.toLowerCase()
        );
      }

      if (quarantineRole) {
        await member.roles.add(quarantineRole);
        
        // Отправляем приветствие в карантине
        try {
          const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🔍 Добро пожаловать!')
            .setDescription(`Привет, ${member.user}! Ваш аккаунт был помещен в карантин для проверки.`)
            .addFields(
              { name: 'Причина', value: 'Автоматическая проверка безопасности', inline: true },
              { name: 'Что делать?', value: 'Дождитесь проверки модераторами', inline: true }
            )
            .setTimestamp();

          await member.send({ embeds: [embed] });
        } catch (dmError) {
          this.logger.warn(`Не удалось отправить ЛС пользователю в карантине ${member.user.tag}`);
        }
      }

    } catch (error) {
      this.logger.error('Ошибка при помещении в карантин:', error);
    }
  }

  async ensureQuarantineRole(guild) {
    try {
      const roleName = this.config.raidProtection.quarantineRole;
      let role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());

      if (!role) {
        role = await guild.roles.create({
          name: roleName,
          color: '#FFA500',
          permissions: [],
          reason: 'Автоматическое создание роли карантина'
        });

        // Настраиваем ограничения для всех каналов
        for (const channel of guild.channels.cache.values()) {
          try {
            await channel.permissionOverwrites.create(role, {
              SendMessages: false,
              Speak: false,
              AddReactions: false,
              CreatePublicThreads: false,
              CreatePrivateThreads: false,
              SendMessagesInThreads: false,
              ViewChannel: false // Полностью скрываем каналы
            });
          } catch (permError) {
            this.logger.warn(`Не удалось настроить права карантина для канала ${channel.name}:`, permError);
          }
        }

        // Создаем специальный канал для карантина
        await this.createQuarantineChannel(guild, role);
        
        this.logger.info(`Создана роль карантина: ${roleName}`);
      }

      return role;
    } catch (error) {
      this.logger.error('Ошибка при создании роли карантина:', error);
      return null;
    }
  }

  async createQuarantineChannel(guild, quarantineRole) {
    try {
      // Проверяем, есть ли уже канал карантина
      const existingChannel = guild.channels.cache.find(ch => 
        ch.name === 'карантин' || ch.name === 'quarantine'
      );

      if (existingChannel) return existingChannel;

      // Создаем канал карантина
      const channel = await guild.channels.create({
        name: 'карантин',
        type: 0, // TEXT_CHANNEL
        topic: 'Канал для пользователей на проверке',
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: ['ViewChannel']
          },
          {
            id: quarantineRole.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
          }
        ]
      });

      // Отправляем приветственное сообщение
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🛡️ Канал карантина')
        .setDescription('Добро пожаловать в карантин! Здесь вы можете общаться, пока модераторы проверяют ваш аккаунт.')
        .addFields(
          { name: 'Правила', value: '• Будьте вежливы\n• Не спамьте\n• Дождитесь проверки модераторами', inline: false },
          { name: 'Помощь', value: 'Обратитесь к модераторам если у вас есть вопросы', inline: false }
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      this.logger.info(`Создан канал карантина: ${channel.name}`);
      return channel;

    } catch (error) {
      this.logger.error('Ошибка при создании канала карантина:', error);
      return null;
    }
  }

  async notifyAdminsAboutRaid(guild, joinsCount, kickedCount) {
    try {
      // Находим администраторов онлайн
      const admins = guild.members.cache.filter(member => 
        member.permissions.has(PermissionFlagsBits.Administrator) &&
        member.presence?.status !== 'offline'
      );

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🚨 ОБНАРУЖЕНА РЕЙД-АТАКА!')
        .setDescription(`Сервер **${guild.name}** подвергается рейд-атаке!`)
        .addFields(
          { name: 'Присоединений', value: joinsCount.toString(), inline: true },
          { name: 'Кикнуто', value: kickedCount.toString(), inline: true },
          { name: 'Статус', value: 'Включен режим блокировки', inline: true },
          { name: 'Действия', value: '• Новые пользователи автоматически кикаются\n• Подозрительные аккаунты помещаются в карантин\n• Блокировка снимется через 30 минут', inline: false }
        )
        .setTimestamp();

      // Отправляем уведомления всем администраторам
      for (const admin of admins.values()) {
        try {
          await admin.send({ embeds: [embed] });
        } catch (dmError) {
          this.logger.warn(`Не удалось уведомить администратора ${admin.user.tag}:`, dmError);
        }
      }

      // Также отправляем в канал логов
      await this.sendSecurityLog(guild, 'РЕЙД-АТАКА', {
        user: 'Система',
        userId: 'AUTO',
        action: `Кикнуто ${kickedCount} из ${joinsCount} пользователей`,
        reason: 'Обнаружена массовая атака на сервер'
      });

    } catch (error) {
      this.logger.error('Ошибка при уведомлении администраторов о рейде:', error);
    }
  }

  async sendSecurityLog(guild, title, details) {
    try {
      const logChannelId = this.config.logChannelId;
      if (!logChannelId) return;

      const logChannel = guild.channels.cache.get(logChannelId);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle(`🛡️ ${title}`)
        .addFields(
          { name: 'Пользователь', value: `${details.user} (${details.userId})`, inline: true },
          { name: 'Действие', value: details.action, inline: true },
          { name: 'Причина', value: details.reason, inline: false }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      this.logger.error('Ошибка при отправке лога защиты от рейда:', error);
    }
  }

  cleanupJoinData() {
    const now = Date.now();
    const maxAge = this.config.raidProtection.timeWindow * 2;
    
    for (const [guildId, joinData] of this.joinTracker.entries()) {
      const recentJoins = joinData.filter(join => 
        now - join.timestamp <= maxAge
      );
      
      if (recentJoins.length === 0) {
        this.joinTracker.delete(guildId);
      } else {
        this.joinTracker.set(guildId, recentJoins);
      }
    }
    
    this.logger.info(`Очистка данных присоединений: активных серверов ${this.joinTracker.size}`);
  }

  // Методы управления для администраторов
  async enableLockdown(guild) {
    this.lockdownMode = true;
    this.logger.action(`Режим блокировки включен вручную для сервера ${guild.name}`);
  }

  async disableLockdown(guild) {
    this.lockdownMode = false;
    this.logger.action(`Режим блокировки отключен вручную для сервера ${guild.name}`);
  }

  isLockdownActive() {
    return this.lockdownMode;
  }
}

module.exports = RaidProtection;