const { Client, GatewayIntentBits, Collection, Events, PermissionFlagsBits } = require('discord.js');
const config = require('./config/config.js');
const AntiSpam = require('./modules/antiSpam.js');
const RaidProtection = require('./modules/raidProtection.js');
const AntiCrash = require('./modules/antiCrash.js');
const Logger = require('./utils/logger.js');

class AntiCrasherBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildModeration
      ]
    });

    this.config = config;
    this.logger = new Logger();
    
    // Initialize protection modules
    this.antiSpam = new AntiSpam(this.client, this.config, this.logger);
    this.raidProtection = new RaidProtection(this.client, this.config, this.logger);
    this.antiCrash = new AntiCrash(this.client, this.config, this.logger);

    this.commands = new Collection();
    
    this.setupEventListeners();
    this.loadCommands();
  }

  setupEventListeners() {
    this.client.once(Events.ClientReady, () => {
      this.logger.info(`🚀 Bot готов! Вошёл как ${this.client.user.tag}`);
      console.log(`🚀 Anti-Crasher Bot запущен как ${this.client.user.tag}`);
    });

    this.client.on(Events.Error, (error) => {
      this.logger.error('Discord Client Error:', error);
    });

    // Anti-Spam Event Listeners
    this.client.on(Events.MessageCreate, (message) => {
      if (this.config.antiSpam.enabled) {
        this.antiSpam.handleMessage(message);
      }
    });

    // Raid Protection Event Listeners
    this.client.on(Events.GuildMemberAdd, (member) => {
      if (this.config.raidProtection.enabled) {
        this.raidProtection.handleMemberJoin(member);
      }
    });

    // Anti-Crash Event Listeners
    this.client.on(Events.ChannelCreate, (channel) => {
      if (this.config.antiCrash.enabled) {
        this.antiCrash.handleChannelCreate(channel);
      }
    });

    this.client.on(Events.GuildRoleCreate, (role) => {
      if (this.config.antiCrash.enabled) {
        this.antiCrash.handleRoleCreate(role);
      }
    });

    this.client.on(Events.InviteCreate, (invite) => {
      if (this.config.antiCrash.enabled) {
        this.antiCrash.handleInviteCreate(invite);
      }
    });

    // Command Handler
    this.client.on(Events.MessageCreate, (message) => {
      if (message.author.bot || !message.content.startsWith(this.config.prefix)) return;

      const args = message.content.slice(this.config.prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      const command = this.commands.get(commandName);
      if (!command) return;

      try {
        command.execute(message, args, this);
      } catch (error) {
        this.logger.error(`Ошибка выполнения команды ${commandName}:`, error);
        message.reply('❌ Произошла ошибка при выполнении команды!');
      }
    });
  }

  loadCommands() {
    console.log('📂 Загрузка команд...');
    
    try {
      // Загружаем команду security
      const securityCommand = require('./commands/security.js');
      this.commands.set(securityCommand.name, securityCommand);
      
      // Загружаем алиасы
      if (securityCommand.aliases) {
        securityCommand.aliases.forEach(alias => {
          this.commands.set(alias, securityCommand);
        });
      }
      
      console.log(`✅ Загружена команда: ${securityCommand.name}`);
      this.logger.info(`Загружена команда: ${securityCommand.name}`);
      
    } catch (error) {
      console.error('❌ Ошибка загрузки команд:', error);
      this.logger.error('Ошибка загрузки команд:', error);
    }
  }

  async start() {
    try {
      await this.client.login(this.config.token);
    } catch (error) {
      this.logger.error('Ошибка запуска бота:', error);
      console.error('❌ Ошибка запуска бота:', error);
      process.exit(1);
    }
  }

  // Utility methods
  hasAdminRole(member) {
    if (!member || !member.roles) return false;
    
    return this.config.adminRoles.some(roleName => 
      member.roles.cache.some(role => 
        role.name.toLowerCase().includes(roleName.toLowerCase())
      )
    );
  }

  hasPermission(member, permission) {
    if (!member) return false;
    return member.permissions.has(PermissionFlagsBits[permission]) || this.hasAdminRole(member);
  }
}

// Создание и запуск бота
const bot = new AntiCrasherBot();
bot.start();

module.exports = AntiCrasherBot;