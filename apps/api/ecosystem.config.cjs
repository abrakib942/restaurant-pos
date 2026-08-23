module.exports = {
  apps: [
    {
      name: '@repo/api',
      cwd: __dirname,
      script: 'dist/src/main.js',
      instances: 4,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
