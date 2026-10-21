import { defineConfig } from '@playwright/test';

/** Explicit live check: uses .env.local credentials and contacts Google Maps. */
export default defineConfig({
  testDir: './tests', testMatch: '**/*-live.spec.ts', workers: 1,
  use: { baseURL: 'http://127.0.0.1:5189', browserName: 'chromium', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5189 --strictPort', url: 'http://127.0.0.1:5189', reuseExistingServer: false, env: { VITE_WARDS_GEOJSON_URL: '', VITE_SURVEYS_METADATA_URL: '' } },
});
