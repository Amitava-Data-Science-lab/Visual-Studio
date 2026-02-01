import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Build configuration for embeddable widget
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/embed/index.ts'),
      name: 'VSBRuntime',
      fileName: (format) => `vsb-runtime.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
