const { PermissionFlagsBits, AuditLogEvent } = require('discord.js');

class AdvancedProtection {
  constructor(client, config, logger) {
    this.client = client;
    this.config = config;
    this.logger = logger;
    this.suspiciousUsers = new Map();
    this.rateLimits = new Map();
    this.backupData = new Map();
    this.emergencyMode = false;
  }

  /**
   * Инициализация системы продвинутой защиты
   */
  initialize() {
    this.setupEventListeners();
    this.startBackgroundTasks();
    this.logger.info('🛡️ Система продвинутой защиты активирована');
  }

  setupEventListeners() {
    // Мониторинг изменений разрешений
    this.client.on('guildMemberUpdate', (oldMember, newMember) => {
      this.checkPermissionChanges(oldMember, newMember);
    });

    // Мониторинг действий через Audit Log
    this.client.on('guildAuditLogEntryCreate', (auditLog) => {
      this.analyzeAuditLogEntry(auditLog);
    });

    // Мониторинг удаления каналов/ролей
    this.client.on('channelDelete', (channel) => {
      this.handleChannelDelete(channel);
    });

    this.client.on('roleDelete', (role) => {
      this.handleRoleDelete(role);
    });

    // Мониторинг массовых банов
    this.client.on('guildBanAdd', (ban) => {
      this.handleBanAdd(ban);
    });
  }

  /**
   * Анализ изменений разрешений участников
   */
  async checkPermissionChanges(oldMember, newMember) {
    if (!oldMember || !newMember) return;

    const oldPerms = oldMember.permissions.toArray();
    const newPerms = newMember.permissions.toArray();
    
    const addedPerms = newPerms.filter(perm => !oldPerms.includes(perm));
    const removedPerms = oldPerms.filter(perm => !newPerms.includes(perm));

    if (addedPerms.length > 0 || removedPerms.length > 0) {
      const dangerousPerms = [
        'Administrator',
        'ManageGuild',
        'ManageRoles',
        'ManageChannels',
        'BanMembers',
        'KickMembers',
        'ManageWebhooks'
      ];

      const addedDangerous = addedPerms.filter(perm => dangerousPerms.includes(perm));
      
      if (addedDangerous.length > 0) {
        this.logger.warn(`⚠️ Опасные разрешения добавлены пользователю ${newMember.user.tag}: ${addedDangerous.join(', ')}`);
        await this.flagSuspiciousActivity(newMember.user.id, 'dangerous_permissions_granted', {
          permissions: addedDangerous
        });
      }
    }
  }

  /**
   * Анализ записей Audit Log для обнаружения подозрительной активности
   */
  async analyzeAuditLogEntry(auditLog) {
    const { action, executor, target } = auditLog;
    
    if (!executor || executor.bot) return;

    // Мониторинг массовых действий
    const massActions = [
      AuditLogEvent.ChannelCreate,
      AuditLogEvent.ChannelDelete,
      AuditLogEvent.RoleCreate,
      AuditLogEvent.RoleDelete,
      AuditLogEvent.MemberBanAdd,
      AuditLogEvent.MemberKick
    ];

    if (massActions.includes(action)) {
      await this.trackRateLimit(executor.id, action);
    }

    // Особое внимание к критическим действиям
    const criticalActions = [
      AuditLogEvent.GuildUpdate,
      AuditLogEvent.ChannelDelete,
      AuditLogEvent.RoleDelete,
      AuditLogEvent.MemberBanAdd
    ];

    if (criticalActions.includes(action)) {
      this.logger.warn(`🚨 Критическое действие: ${action} выполнено пользователем ${executor.tag}`);
    }
  }

  /**
   * Отслеживание rate limiting для пользователей
   */
  async trackRateLimit(userId, action) {
    const key = `${userId}-${action}`;
    const now = Date.now();
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, []);
    }

    const timestamps = this.rateLimits.get(key);
    timestamps.push(now);

    // Очистка старых записей (старше 1 часа)
    const oneHour = 60 * 60 * 1000;
    const filtered = timestamps.filter(time => now - time < oneHour);
    this.rateLimits.set(key, filtered);

    // Проверка превышения лимитов
    const limits = this.config.rateLimiting.global;
    let exceeded = false;

    switch (action) {
      case AuditLogEvent.ChannelCreate:
      case AuditLogEvent.ChannelDelete:
        if (filtered.length > limits.channels.limit) exceeded = true;
        break;
      case AuditLogEvent.RoleCreate:
      case AuditLogEvent.RoleDelete:
        if (filtered.length > limits.roles.limit) exceeded = true;
        break;
      case AuditLogEvent.MemberBanAdd:
        if (filtered.length > limits.bans.limit) exceeded = true;
        break;
    }

    if (exceeded) {
      await this.handleRateLimitExceeded(userId, action, filtered.length);
    }
  }

  /**
   * Обработка превышения rate limit
   */
  async handleRateLimitExceeded(userId, action, count) {
    this.logger.error(`🚨 Rate limit превышен! Пользователь ${userId} выполнил ${action} ${count} раз за час`);
    
    await this.flagSuspiciousActivity(userId, 'rate_limit_exceeded', {
      action,
      count,
      timestamp: Date.now()
    });

    // Автоматические действия при превышении лимитов
    const guild = this.client.guilds.cache.first();
    if (guild) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member && this.config.antiCrash.emergencyLockdown) {
        await this.temporaryRestrictUser(member, 'Rate limit exceeded');
      }
    }
  }

  /**
   * Пометка подозрительной активности
   */
  async flagSuspiciousActivity(userId, type, details) {
    if (!this.suspiciousUsers.has(userId)) {
      this.suspiciousUsers.set(userId, {
        flags: [],
        firstFlagged: Date.now(),
        trustScore: 100
      });
    }

    const userData = this.suspiciousUsers.get(userId);
    userData.flags.push({
      type,
      details,
      timestamp: Date.now()
    });

    // Снижение trust score
    const scoreReduction = this.getScoreReduction(type);
    userData.trustScore = Math.max(0, userData.trustScore - scoreReduction);

    this.logger.warn(`🚩 Подозрительная активность: ${userId} - ${type} (Trust Score: ${userData.trustScore})`);

    // Автоматические действия при низком trust score
    if (userData.trustScore < 30) {
      await this.handleLowTrustScore(userId);
    }
  }

  /**
   * Получение размера снижения trust score
   */
  getScoreReduction(type) {
    const reductions = {
      'dangerous_permissions_granted': 30,
      'rate_limit_exceeded': 25,
      'mass_channel_creation': 20,
      'mass_role_creation': 20,
      'suspicious_pattern': 15,
      'fast_actions': 10
    };

    return reductions[type] || 5;
  }

  /**
   * Временное ограничение пользователя
   */
  async temporaryRestrictUser(member, reason) {
    try {
      // Удаление опасных разрешений
      const dangerousRoles = member.roles.cache.filter(role => 
        role.permissions.has(PermissionFlagsBits.Administrator) ||
        role.permissions.has(PermissionFlagsBits.ManageGuild) ||
        role.permissions.has(PermissionFlagsBits.ManageRoles)
      );

      if (dangerousRoles.size > 0) {
        await member.roles.remove(dangerousRoles, reason);
        this.logger.info(`🔒 Удалены опасные роли у пользователя ${member.user.tag}`);
      }

      // Добавление карантинной роли
      const quarantineRole = member.guild.roles.cache.find(role => 
        role.name.toLowerCase().includes('quarantine') ||
        role.name.toLowerCase().includes('карантин')
      );

      if (quarantineRole) {
        await member.roles.add(quarantineRole, reason);
        this.logger.info(`⏸️ Пользователь ${member.user.tag} помещен в карантин`);
      }

    } catch (error) {
      this.logger.error(`Ошибка ограничения пользователя ${member.user.tag}:`, error);
    }
  }

  /**
   * Активация экстренного режима
   */
  async activateEmergencyMode(guild, reason) {
    if (this.emergencyMode) return;

    this.emergencyMode = true;
    this.logger.error(`🚨 АКТИВИРОВАН ЭКСТРЕННЫЙ РЕЖИМ: ${reason}`);

    // Блокировка всех каналов
    const channels = guild.channels.cache.filter(channel => 
      channel.isTextBased() && channel.manageable
    );

    for (const channel of channels.values()) {
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false,
          AddReactions: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false
        }, { reason: `Emergency lockdown: ${reason}` });
      } catch (error) {
        this.logger.warn(`Не удалось заблокировать канал ${channel.name}:`, error);
      }
    }

    // Автоматическое снятие блокировки через определенное время
    setTimeout(async () => {
      await this.deactivateEmergencyMode(guild);
    }, this.config.raidProtection.lockdownDuration || 600000);
  }

  /**
   * Деактивация экстренного режима
   */
  async deactivateEmergencyMode(guild) {
    if (!this.emergencyMode) return;

    this.emergencyMode = false;
    this.logger.info('✅ Экстренный режим деактивирован');

    // Разблокировка каналов
    const channels = guild.channels.cache.filter(channel => 
      channel.isTextBased() && channel.manageable
    );

    for (const channel of channels.values()) {
      try {
        await channel.permissionOverwrites.delete(guild.roles.everyone, 
          { reason: 'Emergency lockdown ended' });
      } catch (error) {
        this.logger.warn(`Не удалось разблокировать канал ${channel.name}:`, error);
      }
    }
  }

  /**
   * Получение статистики системы защиты
   */
  getProtectionStats() {
    return {
      suspiciousUsers: this.suspiciousUsers.size,
      emergencyMode: this.emergencyMode,
      rateLimitTracking: this.rateLimits.size,
      backupDataStored: this.backupData.size,
      uptime: process.uptime()
    };
  }

  /**
   * Запуск фоновых задач
   */
  startBackgroundTasks() {
    // Очистка старых данных каждые 24 часа
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000);

    // Анализ trust scores каждые 6 часов
    setInterval(() => {
      this.analyzeTrustScores();
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Очистка старых данных
   */
  cleanupOldData() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней

    // Очистка rate limits
    for (const [key, timestamps] of this.rateLimits) {
      const filtered = timestamps.filter(time => now - time < maxAge);
      if (filtered.length === 0) {
        this.rateLimits.delete(key);
      } else {
        this.rateLimits.set(key, filtered);
      }
    }

    this.logger.info('🧹 Выполнена очистка старых данных');
  }

  /**
   * Анализ trust scores
   */
  analyzeTrustScores() {
    const now = Date.now();
    const recoveryPeriod = 24 * 60 * 60 * 1000; // 24 часа

    for (const [userId, userData] of this.suspiciousUsers) {
      // Восстановление trust score со временем
      const timeSinceLastFlag = now - Math.max(...userData.flags.map(f => f.timestamp));
      
      if (timeSinceLastFlag > recoveryPeriod) {
        userData.trustScore = Math.min(100, userData.trustScore + 5);
        
        if (userData.trustScore >= 90) {
          this.suspiciousUsers.delete(userId);
          this.logger.info(`✅ Пользователь ${userId} восстановил репутацию`);
        }
      }
    }

    this.logger.info(`🔍 Проанализировано ${this.suspiciousUsers.size} подозрительных пользователей`);
  }
}

module.exports = AdvancedProtection;