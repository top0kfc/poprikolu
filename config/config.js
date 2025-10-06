require('dotenv').config();

module.exports = {
  // Discord Configuration
  token: process.env.MTQyMzM3NjUzNzM5NDA5MDAyNA.GKQADR.D02-N1N8w95H8hKXBkLVmoVOBpdGKmMkqNTc-Q,
  clientId: process.env.1423376537394090024,
  guildId: process.env.1310886010682478665,
  prefix: process.env.BOT_PREFIX || '!',
  logChannelId: process.env.LOG_CHANNEL_ID,

  // Anti-Spam Configuration
  antiSpam: {
    messageLimit: parseInt(process.env.SPAM_MESSAGE_LIMIT) || 5,
    timeWindow: parseInt(process.env.SPAM_TIME_WINDOW) || 10000,
    muteDuration: parseInt(process.env.SPAM_MUTE_DURATION) || 300000,
    enabled: true
  },

  // Raid Protection Configuration
  raidProtection: {
    joinLimit: parseInt(process.env.RAID_JOIN_LIMIT) || 10,
    timeWindow: parseInt(process.env.RAID_TIME_WINDOW) || 30000,
    quarantineRole: process.env.RAID_QUARANTINE_ROLE || 'quarantine',
    enabled: true
  },

  // Anti-Crash Configuration
  antiCrash: {
    maxChannelsPerHour: parseInt(process.env.MAX_CHANNELS_PER_HOUR) || 5,
    maxRolesPerHour: parseInt(process.env.MAX_ROLES_PER_HOUR) || 3,
    maxInvitesPerMessage: parseInt(process.env.MAX_INVITES_PER_MESSAGE) || 3,
    enabled: true
  },

  // Admin Settings
  adminRoles: ['admin', 'administrator', 'owner', 'moderator'],
  
  // Logging Settings
  logging: {
    logToFile: true,
    logToChannel: true,
    verboseLogging: true
  }
};
