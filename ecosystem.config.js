module.exports = {
  apps: [
    {
      name: 'usamko-api',
      script: 'apps/api/dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'usamko-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: './apps/web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
