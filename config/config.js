require('dotenv').config();

module.exports = {
  // Discord Configuration
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.GUILD_ID,
  prefix: process.env.BOT_PREFIX || '!',
  logChannelId: process.env.LOG_CHANNEL_ID,

  // Enhanced Anti-Spam Configuration
  antiSpam: {
    messageLimit: parseInt(process.env.SPAM_MESSAGE_LIMIT) || 5,
    timeWindow: parseInt(process.env.SPAM_TIME_WINDOW) || 10000,
    muteDuration: parseInt(process.env.SPAM_MUTE_DURATION) || 300000,
    duplicateLimit: parseInt(process.env.DUPLICATE_MESSAGE_LIMIT) || 3,
    capsLimit: parseInt(process.env.CAPS_PERCENTAGE_LIMIT) || 70,
    mentionLimit: parseInt(process.env.MENTION_LIMIT) || 5,
    linkLimit: parseInt(process.env.LINK_LIMIT) || 3,
    imageLimit: parseInt(process.env.IMAGE_LIMIT) || 5,
    enabled: true,
    
    // Progressive punishment system
    punishments: {
      warn: { threshold: 1, action: 'warn' },
      mute: { threshold: 3, duration: 300000 }, // 5 minutes
      tempban: { threshold: 5, duration: 3600000 }, // 1 hour
      ban: { threshold: 10, permanent: true }
    }
  },

  // Enhanced Raid Protection Configuration
  raidProtection: {
    joinLimit: parseInt(process.env.RAID_JOIN_LIMIT) || 10,
    timeWindow: parseInt(process.env.RAID_TIME_WINDOW) || 30000,
    quarantineRole: process.env.RAID_QUARANTINE_ROLE || 'quarantine',
    autoLockdown: process.env.RAID_AUTO_LOCKDOWN === 'true',
    lockdownDuration: parseInt(process.env.RAID_LOCKDOWN_DURATION) || 600000, // 10 minutes
    suspiciousAccountAge: parseInt(process.env.SUSPICIOUS_ACCOUNT_AGE) || 86400000, // 24 hours
    maxNewAccountsPerHour: parseInt(process.env.MAX_NEW_ACCOUNTS_PER_HOUR) || 15,
    enabled: true,
    
    // Anti-bot detection
    botDetection: {
      noAvatar: true,
      defaultName: true,
      suspiciousPattern: true,
      fastJoins: true
    }
  },

  // Enhanced Anti-Crash Configuration
  antiCrash: {
    maxChannelsPerHour: parseInt(process.env.MAX_CHANNELS_PER_HOUR) || 5,
    maxRolesPerHour: parseInt(process.env.MAX_ROLES_PER_HOUR) || 3,
    maxInvitesPerMessage: parseInt(process.env.MAX_INVITES_PER_MESSAGE) || 3,
    maxBansPerMinute: parseInt(process.env.MAX_BANS_PER_MINUTE) || 5,
    maxKicksPerMinute: parseInt(process.env.MAX_KICKS_PER_MINUTE) || 10,
    maxChannelDeletes: parseInt(process.env.MAX_CHANNEL_DELETES) || 2,
    maxRoleDeletes: parseInt(process.env.MAX_ROLE_DELETES) || 2,
    maxWebhooks: parseInt(process.env.MAX_WEBHOOKS_PER_HOUR) || 3,
    enabled: true,
    
    // Advanced protection features
    protectImportantChannels: true,
    protectImportantRoles: true,
    autoRestore: true,
    emergencyLockdown: true
  },

  // Rate Limiting System
  rateLimiting: {
    perUser: {
      messages: { limit: 10, window: 60000 }, // 10 messages per minute
      reactions: { limit: 20, window: 60000 },
      joins: { limit: 1, window: 5000 }
    },
    global: {
      channels: { limit: 10, window: 3600000 }, // 10 channels per hour
      roles: { limit: 5, window: 3600000 },
      bans: { limit: 20, window: 300000 } // 20 bans per 5 minutes
    }
  },

  // Testing System Configuration
  testing: {
    enabled: process.env.TESTING_MODE === 'true',
    testChannelId: process.env.TEST_CHANNEL_ID,
    testServerId: process.env.TEST_SERVER_ID,
    allowedTesters: process.env.ALLOWED_TESTERS ? process.env.ALLOWED_TESTERS.split(',') : [],
    
    // Nuker test types
    testTypes: {
      spam: { enabled: true, intensity: 'medium' },
      raid: { enabled: true, intensity: 'high' },
      channelSpam: { enabled: true, intensity: 'low' },
      roleSpam: { enabled: true, intensity: 'medium' },
      massActions: { enabled: true, intensity: 'high' }
    }
  },

  // Admin Settings
  adminRoles: ['admin', 'administrator', 'owner', 'moderator'],
  bypassRoles: ['bot-tester', 'staff'],
  
  // Important channels and roles that should be protected
  important: {
    channels: ['general', 'announcements', 'rules', 'mod-chat'],
    roles: ['admin', 'moderator', 'everyone']
  },

  // Logging Settings
  logging: {
    logToFile: true,
    logToChannel: true,
    verboseLogging: true,
    logLevel: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
    maxLogSize: parseInt(process.env.MAX_LOG_SIZE) || 10485760, // 10MB
    rotateFrequency: process.env.LOG_ROTATE_FREQUENCY || 'daily'
  },

  // Security Settings
  security: {
    autoSuspiciousDetection: true,
    machinelearningDetection: false, // For future ML implementation
    behaviorAnalysis: true,
    crossServerSharing: false, // Share blacklists across servers
    trustedBots: process.env.TRUSTED_BOTS ? process.env.TRUSTED_BOTS.split(',') : []
  }
};
