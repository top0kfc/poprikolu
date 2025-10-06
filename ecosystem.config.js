module.exports = {
  apps: [{
    name: 'discord-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    kill_timeout: 3000,
    listen_timeout: 3000,
    cron_restart: '0 0 * * *', // Перезапуск каждый день в полночь
    ignore_watch: [
      'node_modules',
      'logs',
      '.git'
    ],
    watch_options: {
      followSymlinks: false
    },
    source_map_support: false,
    instance_var: 'INSTANCE_ID',
    pmx: true,
    automation: false,
    vizion: false
  }],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/top0kfc/poprikolu.git',
      path: '/var/www/discord-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};