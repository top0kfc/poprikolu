const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
require('dotenv').config();

// Создаем клиент Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages
    ]
});

// Конфигурация
const CONFIG = {
    VERIFICATION_CHANNEL_NAME: 'верификация',
    VERIFIED_ROLE_NAME: 'Верифицирован',
    UNVERIFIED_ROLE_NAME: 'Не верифицирован',
    VERIFICATION_BUTTON_ID: 'verify_user',
    EMBED_COLOR: '#00FF00'
};

// Событие готовности бота
client.once('ready', async () => {
    console.log(`✅ Бот ${client.user.tag} запущен и готов к работе!`);
    
    // Настройка каналов и ролей при запуске
    for (const guild of client.guilds.cache.values()) {
        await setupGuildVerification(guild);
    }
});

// Настройка верификации для сервера
async function setupGuildVerification(guild) {
    try {
        // Находим или создаем роли
        let verifiedRole = guild.roles.cache.find(role => role.name === CONFIG.VERIFIED_ROLE_NAME);
        let unverifiedRole = guild.roles.cache.find(role => role.name === CONFIG.UNVERIFIED_ROLE_NAME);
        
        // Создаем роль "Верифицирован" если её нет
        if (!verifiedRole) {
            verifiedRole = await guild.roles.create({
                name: CONFIG.VERIFIED_ROLE_NAME,
                color: '#00FF00',
                reason: 'Роль для верифицированных пользователей',
                permissions: []
            });
            console.log(`✅ Создана роль "${CONFIG.VERIFIED_ROLE_NAME}" на сервере ${guild.name}`);
        }
        
        // Создаем роль "Не верифицирован" если её нет
        if (!unverifiedRole) {
            unverifiedRole = await guild.roles.create({
                name: CONFIG.UNVERIFIED_ROLE_NAME,
                color: '#FF0000',
                reason: 'Роль для неверифицированных пользователей',
                permissions: []
            });
            console.log(`✅ Создана роль "${CONFIG.UNVERIFIED_ROLE_NAME}" на сервере ${guild.name}`);
        }
        
        // Настройка разрешений каналов
        await setupChannelPermissions(guild, verifiedRole, unverifiedRole);
        
        // Находим или создаем канал верификации
        let verificationChannel = guild.channels.cache.find(
            channel => channel.name === CONFIG.VERIFICATION_CHANNEL_NAME && channel.isTextBased()
        );
        
        if (!verificationChannel) {
            verificationChannel = await guild.channels.create({
                name: CONFIG.VERIFICATION_CHANNEL_NAME,
                reason: 'Канал для верификации пользователей',
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                        deny: [PermissionFlagsBits.SendMessages]
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ]
            });
            console.log(`✅ Создан канал верификации "${CONFIG.VERIFICATION_CHANNEL_NAME}" на сервере ${guild.name}`);
        }
        
        // Отправляем сообщение с кнопкой верификации
        await sendVerificationMessage(verificationChannel);
        
    } catch (error) {
        console.error(`❌ Ошибка настройки верификации для сервера ${guild.name}:`, error);
    }
}

// Настройка разрешений каналов
async function setupChannelPermissions(guild, verifiedRole, unverifiedRole) {
    try {
        // Получаем все текстовые и голосовые каналы
        const channels = guild.channels.cache.filter(channel => 
            channel.name !== CONFIG.VERIFICATION_CHANNEL_NAME
        );
        
        for (const [, channel] of channels) {
            // Для неверифицированных пользователей - запрещаем доступ к большинству каналов
            await channel.permissionOverwrites.create(unverifiedRole, {
                ViewChannel: false,
                SendMessages: false,
                Connect: false,
                Speak: false
            }).catch(() => {}); // Игнорируем ошибки для каналов, где нет прав
            
            // Для верифицированных пользователей - разрешаем доступ
            await channel.permissionOverwrites.create(verifiedRole, {
                ViewChannel: true,
                SendMessages: true,
                Connect: true,
                Speak: true
            }).catch(() => {}); // Игнорируем ошибки для каналов, где нет прав
        }
        
        console.log(`✅ Настроены разрешения каналов для ролей верификации на сервере ${guild.name}`);
    } catch (error) {
        console.error(`❌ Ошибка настройки разрешений каналов:`, error);
    }
}

// Отправка сообщения с кнопкой верификации
async function sendVerificationMessage(channel) {
    try {
        // Проверяем, есть ли уже сообщение с верификацией
        const messages = await channel.messages.fetch({ limit: 10 });
        const existingMessage = messages.find(msg => 
            msg.author.id === client.user.id && 
            msg.components.length > 0 &&
            msg.components[0].components[0]?.customId === CONFIG.VERIFICATION_BUTTON_ID
        );
        
        if (existingMessage) {
            console.log(`ℹ️ Сообщение верификации уже существует в канале ${channel.name}`);
            return;
        }
        
        // Создаем embed с информацией о верификации
        const embed = new EmbedBuilder()
            .setTitle('🔐 Верификация пользователя')
            .setDescription(
                'Добро пожаловать на сервер! 👋\\n\\n' +
                'Для получения доступа к остальным каналам сервера вам необходимо пройти верификацию.\\n\\n' +
                '**Нажмите кнопку "Верифицироваться" ниже, чтобы получить доступ ко всем каналам сервера.**'
            )
            .setColor(CONFIG.EMBED_COLOR)
            .setFooter({ text: 'Процесс верификации займет всего несколько секунд' })
            .setTimestamp();
        
        // Создаем кнопку верификации
        const button = new ButtonBuilder()
            .setCustomId(CONFIG.VERIFICATION_BUTTON_ID)
            .setLabel('✅ Верифицироваться')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔓');
        
        const row = new ActionRowBuilder()
            .addComponents(button);
        
        // Отправляем сообщение
        await channel.send({
            embeds: [embed],
            components: [row]
        });
        
        console.log(`✅ Отправлено сообщение верификации в канал ${channel.name}`);
        
    } catch (error) {
        console.error(`❌ Ошибка отправки сообщения верификации:`, error);
    }
}

// Обработка нажатия на кнопку
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    if (interaction.customId === CONFIG.VERIFICATION_BUTTON_ID) {
        await handleVerification(interaction);
    }
});

// Обработка верификации пользователя
async function handleVerification(interaction) {
    try {
        const guild = interaction.guild;
        const member = interaction.member;
        
        // Находим нужные роли
        const verifiedRole = guild.roles.cache.find(role => role.name === CONFIG.VERIFIED_ROLE_NAME);
        const unverifiedRole = guild.roles.cache.find(role => role.name === CONFIG.UNVERIFIED_ROLE_NAME);
        
        if (!verifiedRole) {
            return await interaction.reply({
                content: '❌ Роль "Верифицирован" не найдена. Обратитесь к администратору.',
                ephemeral: true
            });
        }
        
        // Проверяем, не верифицирован ли уже пользователь
        if (member.roles.cache.has(verifiedRole.id)) {
            return await interaction.reply({
                content: '✅ Вы уже верифицированы!',
                ephemeral: true
            });
        }
        
        // Добавляем роль "Верифицирован"
        await member.roles.add(verifiedRole);
        
        // Убираем роль "Не верифицирован" если она есть
        if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
            await member.roles.remove(unverifiedRole);
        }
        
        // Создаем embed с подтверждением
        const successEmbed = new EmbedBuilder()
            .setTitle('🎉 Верификация успешна!')
            .setDescription(
                `Добро пожаловать, ${member.displayName}! 👋\\n\\n` +
                '✅ Вы успешно прошли верификацию\\n' +
                '🔓 Теперь у вас есть доступ ко всем каналам сервера\\n' +
                '📝 Обязательно ознакомьтесь с правилами сервера'
            )
            .setColor('#00FF00')
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        
        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });
        
        console.log(`✅ Пользователь ${member.user.tag} успешно верифицирован на сервере ${guild.name}`);
        
    } catch (error) {
        console.error(`❌ Ошибка верификации пользователя:`, error);
        
        await interaction.reply({
            content: '❌ Произошла ошибка при верификации. Попробуйте еще раз или обратитесь к администратору.',
            ephemeral: true
        }).catch(console.error);
    }
}

// Автоматическая выдача роли "Не верифицирован" новым участникам
client.on('guildMemberAdd', async member => {
    try {
        const unverifiedRole = member.guild.roles.cache.find(role => role.name === CONFIG.UNVERIFIED_ROLE_NAME);
        
        if (unverifiedRole) {
            await member.roles.add(unverifiedRole);
            console.log(`ℹ️ Пользователю ${member.user.tag} выдана роль "Не верифицирован" на сервере ${member.guild.name}`);
        }
    } catch (error) {
        console.error(`❌ Ошибка выдачи роли новому участнику:`, error);
    }
});

// Обработка добавления бота на новый сервер
client.on('guildCreate', async guild => {
    console.log(`🆕 Бот добавлен на новый сервер: ${guild.name} (${guild.id})`);
    await setupGuildVerification(guild);
});

// Обработка ошибок
client.on('error', error => {
    console.error('❌ Ошибка клиента Discord:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Необработанная ошибка Promise:', error);
});

// Запуск бота
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Ошибка входа в Discord:', error);
    process.exit(1);
});