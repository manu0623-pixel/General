import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Construye la app en un único HTML autocontenido (para publicarla como página en claude.ai).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist-artifact', chunkSizeWarningLimit: 2000 },
});
