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
    EMBED_COLOR: '#00FF00',
    
    // Настройки строгости
    VERIFICATION_COOLDOWN: 5000, // 5 секунд между попытками верификации
    MAX_VERIFICATION_ATTEMPTS: 3, // Максимум попыток верификации в час
    ACCOUNT_MIN_AGE_DAYS: 7, // Минимальный возраст аккаунта (дни)
    REQUIRE_AVATAR: true, // Требовать аватар для верификации
    LOG_CHANNEL_NAME: 'верификация-логи' // Канал для логов
};

// Хранилище для отслеживания попыток верификации
const verificationAttempts = new Map(); // userId -> { attempts: number, lastAttempt: timestamp }
const verificationCooldowns = new Map(); // userId -> timestamp

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
        
        // Создаем канал логов если нужно
        await setupLogChannel(guild);
        
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

// Создание канала логов
async function setupLogChannel(guild) {
    try {
        let logChannel = guild.channels.cache.find(
            channel => channel.name === CONFIG.LOG_CHANNEL_NAME && channel.isTextBased()
        );
        
        if (!logChannel) {
            logChannel = await guild.channels.create({
                name: CONFIG.LOG_CHANNEL_NAME,
                reason: 'Канал для логов верификации',
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ]
            });
            console.log(`✅ Создан канал логов "${CONFIG.LOG_CHANNEL_NAME}" на сервере ${guild.name}`);
        }
    } catch (error) {
        console.error(`❌ Ошибка создания канала логов:`, error);
    }
}

// Настройка разрешений каналов
async function setupChannelPermissions(guild, verifiedRole, unverifiedRole) {
    try {
        // Получаем все текстовые и голосовые каналы
        const channels = guild.channels.cache.filter(channel => 
            channel.name !== CONFIG.VERIFICATION_CHANNEL_NAME &&
            channel.name !== CONFIG.LOG_CHANNEL_NAME
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
            .setTitle('🔐 Строгая верификация пользователей')
            .setDescription(
                'Добро пожаловать на сервер! 👋\n\n' +
                'Для получения доступа к остальным каналам сервера вам необходимо пройти строгую верификацию.\n\n' +
                '**Требования для верификации:**\n' +
                `• Возраст аккаунта: минимум ${CONFIG.ACCOUNT_MIN_AGE_DAYS} дней\n` +
                `${CONFIG.REQUIRE_AVATAR ? '• Наличие аватара в профиле\n' : ''}` +
                `• Максимум ${CONFIG.MAX_VERIFICATION_ATTEMPTS} попыток в час\n` +
                '• Соблюдение правил сервера\n\n' +
                '⚠️ **Внимание:** Попытки обхода системы верификации приведут к блокировке.\n\n' +
                '**Нажмите кнопку "Верифицироваться" ниже, чтобы получить доступ ко всем каналам сервера.**'
            )
            .setColor(CONFIG.EMBED_COLOR)
            .setFooter({ text: 'Строгая система верификации | Все попытки логируются' })
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
        
        console.log(`✅ Отправлено строгое сообщение верификации в канал ${channel.name}`);
        
    } catch (error) {
        console.error(`❌ Ошибка отправки сообщения верификации:`, error);
    }
}

// Проверка возраста аккаунта
function checkAccountAge(user) {
    const accountAge = Date.now() - user.createdTimestamp;
    const minAge = CONFIG.ACCOUNT_MIN_AGE_DAYS * 24 * 60 * 60 * 1000; // в миллисекундах
    return accountAge >= minAge;
}

// Проверка аватара
function checkAvatar(user) {
    if (!CONFIG.REQUIRE_AVATAR) return true;
    return user.avatar !== null;
}

// Проверка cooldown
function checkCooldown(userId) {
    const now = Date.now();
    const lastAttempt = verificationCooldowns.get(userId);
    
    if (lastAttempt && (now - lastAttempt) < CONFIG.VERIFICATION_COOLDOWN) {
        return false;
    }
    
    return true;
}

// Проверка лимита попыток
function checkAttemptLimit(userId) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    const attempts = verificationAttempts.get(userId);
    if (!attempts) return true;
    
    // Сбрасываем счетчик если прошел час
    if (now - attempts.lastAttempt > oneHour) {
        verificationAttempts.delete(userId);
        return true;
    }
    
    return attempts.attempts < CONFIG.MAX_VERIFICATION_ATTEMPTS;
}

// Логирование попыток верификации
async function logVerificationAttempt(guild, user, success, reason = null) {
    try {
        const logChannel = guild.channels.cache.find(
            channel => channel.name === CONFIG.LOG_CHANNEL_NAME && channel.isTextBased()
        );
        
        if (!logChannel) return;
        
        const embed = new EmbedBuilder()
            .setTitle(success ? '✅ Верификация успешна' : '❌ Верификация отклонена')
            .addFields(
                { name: 'Пользователь', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Время', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: 'Возраст аккаунта', value: `${Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24))} дней`, inline: true }
            )
            .setColor(success ? '#00FF00' : '#FF0000')
            .setThumbnail(user.displayAvatarURL());
        
        if (reason) {
            embed.addFields({ name: 'Причина отклонения', value: reason, inline: false });
        }
        
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`❌ Ошибка логирования:`, error);
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
        const user = member.user;
        
        // Проверяем cooldown
        if (!checkCooldown(user.id)) {
            const remainingTime = Math.ceil((CONFIG.VERIFICATION_COOLDOWN - (Date.now() - verificationCooldowns.get(user.id))) / 1000);
            return await interaction.reply({
                content: `⏱️ Подождите ${remainingTime} секунд перед следующей попыткой верификации.`,
                ephemeral: true
            });
        }
        
        // Устанавливаем cooldown
        verificationCooldowns.set(user.id, Date.now());
        
        // Проверяем лимит попыток
        if (!checkAttemptLimit(user.id)) {
            await logVerificationAttempt(guild, user, false, 'Превышен лимит попыток (3 в час)');
            return await interaction.reply({
                content: '🚫 **Превышен лимит попыток!**\n\nВы можете попробовать снова через час. При продолжении попыток обхода системы ваш аккаунт может быть заблокирован.',
                ephemeral: true
            });
        }
        
        // Увеличиваем счетчик попыток
        const attempts = verificationAttempts.get(user.id) || { attempts: 0, lastAttempt: Date.now() };
        attempts.attempts += 1;
        attempts.lastAttempt = Date.now();
        verificationAttempts.set(user.id, attempts);
        
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
        
        // Строгие проверки
        let rejectionReason = null;
        
        // Проверка возраста аккаунта
        if (!checkAccountAge(user)) {
            const accountAgeDays = Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));
            rejectionReason = `Возраст аккаунта слишком мал: ${accountAgeDays} дней (требуется ${CONFIG.ACCOUNT_MIN_AGE_DAYS})`;
        }
        
        // Проверка аватара
        if (!rejectionReason && !checkAvatar(user)) {
            rejectionReason = 'Отсутствует аватар в профиле';
        }
        
        // Если есть причина отклонения
        if (rejectionReason) {
            await logVerificationAttempt(guild, user, false, rejectionReason);
            
            const failEmbed = new EmbedBuilder()
                .setTitle('🚫 Верификация отклонена')
                .setDescription(
                    `**Причина:** ${rejectionReason}\n\n` +
                    '**Что делать:**\n' +
                    `${!checkAccountAge(user) ? `• Подождите пока вашему аккаунту исполнится ${CONFIG.ACCOUNT_MIN_AGE_DAYS} дней\n` : ''}` +
                    `${CONFIG.REQUIRE_AVATAR && !checkAvatar(user) ? '• Установите аватар в профиле Discord\n' : ''}` +
                    '• Попробуйте еще раз после выполнения требований\n\n' +
                    `⚠️ Попыток осталось: ${CONFIG.MAX_VERIFICATION_ATTEMPTS - attempts.attempts} из ${CONFIG.MAX_VERIFICATION_ATTEMPTS} в час`
                )
                .setColor('#FF0000')
                .setFooter({ text: 'Строгая система верификации' })
                .setTimestamp();
            
            return await interaction.reply({
                embeds: [failEmbed],
                ephemeral: true
            });
        }
        
        // Все проверки пройдены - верифицируем пользователя
        await member.roles.add(verifiedRole);
        
        // Убираем роль "Не верифицирован" если она есть
        if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
            await member.roles.remove(unverifiedRole);
        }
        
        // Сбрасываем счетчик попыток после успешной верификации
        verificationAttempts.delete(user.id);
        verificationCooldowns.delete(user.id);
        
        // Логируем успешную верификацию
        await logVerificationAttempt(guild, user, true);
        
        // Создаем embed с подтверждением
        const successEmbed = new EmbedBuilder()
            .setTitle('🎉 Верификация успешно пройдена!')
            .setDescription(
                `**Добро пожаловать, ${member.displayName}!** 👋\n\n` +
                '✅ Вы успешно прошли строгую верификацию\n' +
                '🔓 Теперь у вас есть доступ ко всем каналам сервера\n' +
                '📝 Обязательно ознакомьтесь с правилами сервера\n\n' +
                '🛡️ **Помните:** соблюдение правил сервера обязательно для всех участников.'
            )
            .setColor('#00FF00')
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: 'Добро пожаловать в сообщество!' })
            .setTimestamp();
        
        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });
        
        console.log(`✅ Пользователь ${user.tag} успешно верифицирован на сервере ${guild.name}`);
        
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
        
        // Логируем присоединение нового участника
        const logChannel = member.guild.channels.cache.find(
            channel => channel.name === CONFIG.LOG_CHANNEL_NAME && channel.isTextBased()
        );
        
        if (logChannel) {
            const joinEmbed = new EmbedBuilder()
                .setTitle('👋 Новый участник')
                .addFields(
                    { name: 'Пользователь', value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: 'Время присоединения', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Возраст аккаунта', value: `${Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24))} дней`, inline: true }
                )
                .setColor('#FFA500')
                .setThumbnail(member.user.displayAvatarURL());
                
            await logChannel.send({ embeds: [joinEmbed] });
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

// Очистка устаревших данных каждый час
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Очищаем старые попытки верификации
    for (const [userId, data] of verificationAttempts.entries()) {
        if (now - data.lastAttempt > oneHour) {
            verificationAttempts.delete(userId);
        }
    }
    
    // Очищаем старые cooldowns
    for (const [userId, timestamp] of verificationCooldowns.entries()) {
        if (now - timestamp > CONFIG.VERIFICATION_COOLDOWN * 2) {
            verificationCooldowns.delete(userId);
        }
    }
    
    console.log('🧹 Очищены устаревшие данные верификации');
}, 60 * 60 * 1000);

// Запуск бота
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Ошибка входа в Discord:', error);
    process.exit(1);
});