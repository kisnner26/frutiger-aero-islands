import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [
      react(),
      {
        // la pista personal (public/audio) se publica por decisión del autor; con VITE_EXCLUIR_AUDIO_PERSONAL=1 se retira del artefacto
        name: 'excluir-audio-personal',
        apply: 'build',
        closeBundle() {
          if (env.VITE_EXCLUIR_AUDIO_PERSONAL !== '1') return;
          fs.rmSync(path.resolve('dist', 'audio'), { recursive: true, force: true });
        },
      },
    ],
  };
});
