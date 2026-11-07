module.exports = {
  apps: [
    {
      name: 'euler-ingestion-worker',
      script: 'npx',
      args: 'tsx worker.ts',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      exp_backoff_restart_delay: 2000,
      max_restarts: 20,
    },
  ],
};
