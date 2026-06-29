import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), tailwindcss(),
      // Generates gzip-compressed files during npm run build
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
      })
    ],
    optimizeDeps: {
      include: [],
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      host: '0.0.0.0',
      // ✅ Set to true to automatically allow ALL hostnames in development
      allowedHosts: true 
    },
  };
});
