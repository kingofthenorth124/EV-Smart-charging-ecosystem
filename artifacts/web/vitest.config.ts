import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Standalone config: the app's vite.config.ts requires PORT and dev plugins,
// which unit tests don't need.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
