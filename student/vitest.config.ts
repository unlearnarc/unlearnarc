import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',  // engine tests are framework-independent
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/labs/**/*.ts'],
    },
  },
});
