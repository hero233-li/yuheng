import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: mode === 'branch' ? './' : '/',
    define: {
      __APP_MODE__: JSON.stringify(env.APP_MODE || 'branch'),
    },
    server: {
      host: env.WEB_HOST || '0.0.0.0',
      port: 5174,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8766',
          changeOrigin: true,
        },
      },
    },
  };
});
