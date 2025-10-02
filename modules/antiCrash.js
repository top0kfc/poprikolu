const { EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');

class AntiCrash {
  constructor(client, config, logger) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    
    // Отслеживание действий по серверам
    this.serverActions = new Map();
    
    // Очистка старых данных каждые 30 минут
    setInterval(() => {
      this.cleanupActionData();
    }, 30 * 60 * 1000);
  }

  async handleChannelCreate(channel) {
    try {
      if (!channel.guild) return;
      
      const guild = channel.guild;
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelCreate,
        limit: 1
      });
      
      const auditEntry = auditLogs.entries.first();
      if (!auditEntry) return;
      
      const executor = auditEntry.executor;
      
      // Игнорируем ботов и администраторов с соответствующими правами
      if (executor.bot || this.isPermittedUser(guild.members.cache.get(executor.id))) {
        return;
      }
      
      // Отслеживаем действие
      const actionKey = `${guild.id}-${executor.id}`;
      const now = Date.now();
      const hourInMs = 60 * 60 * 1000;
      
      if (!this.serverActions.has(actionKey)) {
        this.serverActions.set(actionKey, { channels: [], roles: [], invites: [] });
      }
      
      const userActions = this.serverActions.get(actionKey);
      
      // Добавляем новое действие
      userActions.channels.push({
        timestamp: now,
        channelId: channel.id,
        channelName: channel.name,
        type: channel.type
      });
      
      // Удаляем старые действия (старше часа)
      userActions.channels = userActions.channels.filter(action => 
        now - action.timestamp <= hourInMs
      );
      
      // Проверяем превышение лимита
      if (userActions.channels.length > this.config.antiCrash.maxChannelsPerHour) {
        await this.handleChannelSpam(guild, executor, userActions.channels, channel);
      }

    } catch (error) {
      this.logger.error('Ошибка при обработке создания канала:', error);
    }
  }

  async handleRoleCreate(role) {
    try {
      const guild = role.guild;
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.RoleCreate,
        limit: 1
      });
      
      const auditEntry = auditLogs.entries.first();
      if (!auditEntry) return;
      
      const executor = auditEntry.executor;
      
      // Игнорируем ботов и администраторов с соответствующими правами
      if (executor.bot || this.isPermittedUser(guild.members.cache.get(executor.id))) {
        return;
      }
      
      // Отслеживаем действие
      const actionKey = `${guild.id}-${executor.id}`;
      const now = Date.now();
      const hourInMs = 60 * 60 * 1000;
      
      if (!this.serverActions.has(actionKey)) {
        this.serverActions.set(actionKey, { channels: [], roles: [], invites: [] });
      }
      
      const userActions = this.serverActions.get(actionKey);
      
      // Добавляем новое действие
      userActions.roles.push({
        timestamp: now,
        roleId: role.id,
        roleName: role.name,
        permissions: role.permissions.toArray()
      });
      
      // Удаляем старые действия (старше часа)
      userActions.roles = userActions.roles.filter(action => 
        now - action.timestamp <= hourInMs
      );
      
      // Проверяем превышение лимита
      if (userActions.roles.length > this.config.antiCrash.maxRolesPerHour) {
        await this.handleRoleSpam(guild, executor, userActions.roles, role);
      }

    } catch (error) {
      this.logger.error('Ошибка при обработке создания роли:', error);
    }
  }

  async handleInviteCreate(invite) {
    try {
      const guild = invite.guild;
      if (!guild || !invite.inviter) return;
      
      const inviter = invite.inviter;
      
      // Игнорируем ботов и администраторов
      if (inviter.bot || this.isPermittedUser(guild.members.cache.get(inviter.id))) {
        return;
      }
      
      // Отслеживаем создание инвайтов
      const actionKey = `${guild.id}-${inviter.id}`;
      const now = Date.now();
      const hourInMs = 60 * 60 * 1000;
      
      if (!this.serverActions.has(actionKey)) {
        this.serverActions.set(actionKey, { channels: [], roles: [], invites: [] });
      }
      
      const userActions = this.serverActions.get(actionKey);
      
      // Добавляем новое действие
      userActions.invites.push({
        timestamp: now,
        inviteCode: invite.code,
        channelId: invite.channel?.id,
        maxUses: invite.maxUses,
        maxAge: invite.maxAge
      });
      
      // Удаляем старые действия (старше часа)
      userActions.invites = userActions.invites.filter(action => 
        now - action.timestamp <= hourInMs
      );
      
      // Проверяем превышение лимита (больше 20 инвайтов в час)
      if (userActions.invites.length > 20) {
        await this.handleInviteSpam(guild, inviter, userActions.invites);
      }

    } catch (error) {
      this.logger.error('Ошибка при обработке создания инвайта:', error);
    }
  }

  async handleChannelSpam(guild, executor, channels, lastChannel) {
    try {
      this.logger.security(`🚨 Обнаружен спам каналов от ${executor.tag}`, {
        guildId: guild.id,
        guildName: guild.name,
        executorId: executor.id,
        executorTag: executor.tag,
        channelsCreated: channels.length
      });

      const member = guild.members.cache.get(executor.id);
      if (!member) return;

      // Удаляем все недавно созданные каналы
      let deletedCount = 0;
      for (const channelInfo of channels) {
        try {
          const channel = guild.channels.cache.get(channelInfo.channelId);
          if (channel && channel.deletable) {
            await channel.delete('Антикраш защита - спам каналов');
            deletedCount++;
          }
        } catch (deleteError) {
          this.logger.warn(`Не удалось удалить канал ${channelInfo.channelName}:`, deleteError);
        }
      }

      // Временно убираем права на управление каналами
      await this.revokeChannelPermissions(member);

      // Бан пользователя на 24 часа
      await this.temporaryBan(member, '24 часа', 'Спам каналов - автокраш защита');

      // Уведомляем администраторов
      await this.notifyAdminsAboutCrash(guild, {
        type: 'Channel Spam',
        executor: executor.tag,
        executorId: executor.id,
        count: channels.length,
        deleted: deletedCount,
        action: 'Временный бан на 24 часа'
      });

      // Логируем
      await this.sendSecurityLog(guild, 'Спам каналов', {
        user: executor.tag,
        userId: executor.id,
        action: `Удалено ${deletedCount} каналов, временный бан`,
        reason: `Создано ${channels.length} каналов за час`
      });

    } catch (error) {
      this.logger.error('Ошибка при обработке спама каналов:', error);
    }
  }

  async handleRoleSpam(guild, executor, roles, lastRole) {
    try {
      this.logger.security(`🚨 Обнаружен спам ролей от ${executor.tag}`, {
        guildId: guild.id,
        guildName: guild.name,
        executorId: executor.id,
        executorTag: executor.tag,
        rolesCreated: roles.length
      });

      const member = guild.members.cache.get(executor.id);
      if (!member) return;

      // Удаляем все недавно созданные роли
      let deletedCount = 0;
      for (const roleInfo of roles) {
        try {
          const role = guild.roles.cache.get(roleInfo.roleId);
          if (role && role.name !== '@everyone' && role.deletable) {
            await role.delete('Антикраш защита - спам ролей');
            deletedCount++;
          }
        } catch (deleteError) {
          this.logger.warn(`Не удалось удалить роль ${roleInfo.roleName}:`, deleteError);
        }
      }

      // Временно убираем права на управление ролями
      await this.revokeRolePermissions(member);

      // Бан пользователя на 48 часов
      await this.temporaryBan(member, '48 часов', 'Спам ролей - автокраш защита');

      // Уведомляем администраторов
      await this.notifyAdminsAboutCrash(guild, {
        type: 'Role Spam',
        executor: executor.tag,
        executorId: executor.id,
        count: roles.length,
        deleted: deletedCount,
        action: 'Временный бан на 48 часов'
      });

      // Логируем
      await this.sendSecurityLog(guild, 'Спам ролей', {
        user: executor.tag,
        userId: executor.id,
        action: `Удалено ${deletedCount} ролей, временный бан`,
        reason: `Создано ${roles.length} ролей за час`
      });

    } catch (error) {
      this.logger.error('Ошибка при обработке спама ролей:', error);
    }
  }

  async handleInviteSpam(guild, inviter, invites) {
    try {
      this.logger.security(`🚨 Обнаружен спам инвайтов от ${inviter.tag}`, {
        guildId: guild.id,
        guildName: guild.name,
        inviterId: inviter.id,
        inviterTag: inviter.tag,
        invitesCreated: invites.length
      });

      const member = guild.members.cache.get(inviter.id);
      if (!member) return;

      // Удаляем все недавно созданные инвайты
      let deletedCount = 0;
      const guildInvites = await guild.invites.fetch();
      
      for (const inviteInfo of invites) {
        try {
          const invite = guildInvites.get(inviteInfo.inviteCode);
          if (invite) {
            await invite.delete('Антикраш защита - спам инвайтов');
            deletedCount++;
          }
        } catch (deleteError) {
          this.logger.warn(`Не удалось удалить инвайт ${inviteInfo.inviteCode}:`, deleteError);
        }
      }

      // Временно убираем права на создание инвайтов
      await this.revokeInvitePermissions(member);

      // Мут пользователя на 12 часов
      await this.temporaryMute(member, 12 * 60 * 60 * 1000, 'Спам инвайтов');

      // Логируем
      await this.sendSecurityLog(guild, 'Спам инвайтов', {
        user: inviter.tag,
        userId: inviter.id,
        action: `Удалено ${deletedCount} инвайтов, мут на 12 часов`,
        reason: `Создано ${invites.length} инвайтов за час`
      });

    } catch (error) {
      this.logger.error('Ошибка при обработке спама инвайтов:', error);
    }
  }

  async revokeChannelPermissions(member) {
    try {
      // Убираем права на управление каналами из всех ролей пользователя
      for (const role of member.roles.cache.values()) {
        if (role.name === '@everyone') continue;
        
        if (role.permissions.has(PermissionFlagsBits.ManageChannels)) {
          const newPermissions = role.permissions.toArray().filter(perm => 
            perm !== PermissionFlagsBits.ManageChannels
          );
          
          try {
            await role.setPermissions(newPermissions, 'Антикраш защита - убрано право управления каналами');
          } catch (permError) {
            this.logger.warn(`Не удалось изменить права роли ${role.name}:`, permError);
          }
        }
      }
      
      this.logger.action(`Убраны права на управление каналами у ${member.user.tag}`);
    } catch (error) {
      this.logger.error('Ошибка при отзыве прав на каналы:', error);
    }
  }

  async revokeRolePermissions(member) {
    try {
      // Убираем права на управление ролями из всех ролей пользователя
      for (const role of member.roles.cache.values()) {
        if (role.name === '@everyone') continue;
        
        if (role.permissions.has(PermissionFlagsBits.ManageRoles)) {
          const newPermissions = role.permissions.toArray().filter(perm => 
            perm !== PermissionFlagsBits.ManageRoles
          );
          
          try {
            await role.setPermissions(newPermissions, 'Антикраш защита - убрано право управления ролями');
          } catch (permError) {
            this.logger.warn(`Не удалось изменить права роли ${role.name}:`, permError);
          }
        }
      }
      
      this.logger.action(`Убраны права на управление ролями у ${member.user.tag}`);
    } catch (error) {
      this.logger.error('Ошибка при отзыве прав на роли:', error);
    }
  }

  async revokeInvitePermissions(member) {
    try {
      // Убираем права на создание инвайтов из всех ролей пользователя
      for (const role of member.roles.cache.values()) {
        if (role.name === '@everyone') continue;
        
        if (role.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
          const newPermissions = role.permissions.toArray().filter(perm => 
            perm !== PermissionFlagsBits.CreateInstantInvite
          );
          
          try {
            await role.setPermissions(newPermissions, 'Антикраш защита - убрано право создания инвайтов');
          } catch (permError) {
            this.logger.warn(`Не удалось изменить права роли ${role.name}:`, permError);
          }
        }
      }
      
      this.logger.action(`Убраны права на создание инвайтов у ${member.user.tag}`);
    } catch (error) {
      this.logger.error('Ошибка при отзыве прав на инвайты:', error);
    }
  }

  async temporaryBan(member, duration, reason) {
    try {
      // Отправляем уведомление пользователю
      try {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔨 Временная блокировка')
          .setDescription(`Вы были временно заблокированы на сервере **${member.guild.name}**`)
          .addFields(
            { name: 'Причина', value: reason, inline: true },
            { name: 'Длительность', value: duration, inline: true }
          )
          .setTimestamp();

        await member.send({ embeds: [embed] });
      } catch (dmError) {
        this.logger.warn(`Не удалось отправить ЛС о бане пользователю ${member.user.tag}`);
      }

      // Баним пользователя
      await member.ban({ reason: `${reason} (${duration})` });
      
      // Устанавливаем таймер для разбана
      const banDuration = this.parseDuration(duration);
      if (banDuration > 0) {
        setTimeout(async () => {
          try {
            await member.guild.bans.remove(member.user.id, 'Автоматический разбан после временной блокировки');
            this.logger.action(`Автоматический разбан пользователя ${member.user.tag}`);
          } catch (unbanError) {
            this.logger.error('Ошибка при автоматическом разбане:', unbanError);
          }
        }, banDuration);
      }

      this.logger.action(`Временный бан (${duration}) для ${member.user.tag}: ${reason}`);
    } catch (error) {
      this.logger.error('Ошибка при временном бане:', error);
    }
  }

  async temporaryMute(member, duration, reason) {
    try {
      // Ищем роль мута или создаем её
      let muteRole = member.guild.roles.cache.find(role => role.name === 'Muted');
      
      if (!muteRole) {
        muteRole = await member.guild.roles.create({
          name: 'Muted',
          color: '#818181',
          permissions: []
        });

        // Настраиваем запреты для всех каналов
        for (const channel of member.guild.channels.cache.values()) {
          try {
            await channel.permissionOverwrites.create(muteRole, {
              SendMessages: false,
              Speak: false,
              AddReactions: false
            });
          } catch (permError) {
            this.logger.warn(`Не удалось настроить мут для канала ${channel.name}:`, permError);
          }
        }
      }

      // Назначаем роль мута
      await member.roles.add(muteRole);

      // Убираем мут через указанное время
      setTimeout(async () => {
        try {
          if (member.roles.cache.has(muteRole.id)) {
            await member.roles.remove(muteRole);
            this.logger.action(`Автоматическое снятие мута с пользователя ${member.user.tag}`);
          }
        } catch (unmuteError) {
          this.logger.error('Ошибка при автоматическом снятии мута:', unmuteError);
        }
      }, duration);

      this.logger.action(`Временный мут (${duration}ms) для ${member.user.tag}: ${reason}`);
    } catch (error) {
      this.logger.error('Ошибка при временном муте:', error);
    }
  }

  parseDuration(durationStr) {
    // Парсим строку длительности в миллисекунды
    const match = durationStr.match(/(\d+)\s*(час|часов|дней|дня|минут|минуты)/i);
    if (!match) return 0;

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (true) {
      case unit.includes('минут'):
        return amount * 60 * 1000;
      case unit.includes('час'):
        return amount * 60 * 60 * 1000;
      case unit.includes('дн'):
        return amount * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  async notifyAdminsAboutCrash(guild, crashInfo) {
    try {
      // Находим администраторов онлайн
      const admins = guild.members.cache.filter(member => 
        member.permissions.has(PermissionFlagsBits.Administrator) &&
        member.presence?.status !== 'offline'
      );

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`🚨 ОБНАРУЖЕНА ПОПЫТКА КРАША! (${crashInfo.type})`)
        .setDescription(`Пользователь пытался обрушить сервер **${guild.name}**!`)
        .addFields(
          { name: 'Нарушитель', value: `${crashInfo.executor} (${crashInfo.executorId})`, inline: true },
          { name: 'Количество', value: crashInfo.count.toString(), inline: true },
          { name: 'Удалено', value: crashInfo.deleted.toString(), inline: true },
          { name: 'Принятые меры', value: crashInfo.action, inline: false }
        )
        .setTimestamp();

      // Отправляем уведомления администраторам
      for (const admin of admins.values()) {
        try {
          await admin.send({ embeds: [embed] });
        } catch (dmError) {
          this.logger.warn(`Не удалось уведомить администратора ${admin.user.tag}:`, dmError);
        }
      }

    } catch (error) {
      this.logger.error('Ошибка при уведомлении администраторов о краше:', error);
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
      this.logger.error('Ошибка при отправке лога антикраш защиты:', error);
    }
  }

  isPermittedUser(member) {
    if (!member) return false;
    
    return member.permissions.has(PermissionFlagsBits.Administrator) ||
           member.permissions.has(PermissionFlagsBits.ManageGuild) ||
           this.config.adminRoles.some(roleName => 
             member.roles.cache.some(role => 
               role.name.toLowerCase().includes(roleName.toLowerCase())
             )
           );
  }

  cleanupActionData() {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 часа
    
    for (const [actionKey, actions] of this.serverActions.entries()) {
      // Очищаем старые данные для каждого типа действий
      actions.channels = actions.channels.filter(action => 
        now - action.timestamp <= maxAge
      );
      actions.roles = actions.roles.filter(action => 
        now - action.timestamp <= maxAge
      );
      actions.invites = actions.invites.filter(action => 
        now - action.timestamp <= maxAge
      );
      
      // Удаляем пустые записи
      if (actions.channels.length === 0 && 
          actions.roles.length === 0 && 
          actions.invites.length === 0) {
        this.serverActions.delete(actionKey);
      }
    }
    
    this.logger.info(`Очистка данных антикраш системы: активных пользователей ${this.serverActions.size}`);
  }
}

module.exports = AntiCrash;