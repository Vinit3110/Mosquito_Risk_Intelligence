import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  testIgnore: '**/*-live.spec.ts',
  use: { baseURL: 'http://127.0.0.1:5187', browserName: 'chromium', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'npm run dev -- --mode test-no-key --host 127.0.0.1 --port 5187 --strictPort', url: 'http://127.0.0.1:5187', reuseExistingServer: false, env: { VITE_GOOGLE_MAPS_API_KEY: '', VITE_WARDS_GEOJSON_URL: '', VITE_SURVEYS_METADATA_URL: '' } },
    { command: 'npm run dev -- --mode test-invalid-key --host 127.0.0.1 --port 5188 --strictPort', url: 'http://127.0.0.1:5188', reuseExistingServer: false, env: { VITE_GOOGLE_MAPS_API_KEY: 'invalid-test-value-not-a-credential', VITE_WARDS_GEOJSON_URL: '/fixtures/wards.geojson', VITE_SURVEYS_METADATA_URL: '/fixtures/surveys.json' } },
  ],
});
