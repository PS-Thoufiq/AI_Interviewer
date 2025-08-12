import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Explicitly set output directory
    emptyOutDir: true, // Clear the directory before build
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
    
  },
  worker: {
    format: 'es',
    plugins: [react()],
  },
});