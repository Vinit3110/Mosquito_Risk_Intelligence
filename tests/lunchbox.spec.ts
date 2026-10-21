import { test, expect } from '@playwright/test';

test('KBTCOE live page protects access, shows empty ground data and separates simulated observations', async ({ page }) => {
  const campus = { id: 'campus-test', code: 'KBTCOE', name: 'KBTCOE', surveys: [{ id: 'survey-test', name: 'First survey', capture_date: '2026-08-19' }], ground_verification: 'not_recorded', areas: ['A','B','C','D'].map((code, index) => ({ id: code, name: `Area ${code}`, raw_images: [100,18,248,8][index], processed_assets: 6 })) };
  await page.route('**/api/**', async route => {
    const request = route.request();
    if (request.headers().authorization !== 'Bearer synthetic-test-token') return route.fulfill({ status: 401, json: { detail: 'Unauthorized' } });
    const url = new URL(request.url());
    if (url.pathname === '/api/campuses') return route.fulfill({ json: [campus] });
    if (url.pathname.startsWith('/api/campuses/')) return route.fulfill({ json: campus });
    if (url.pathname === '/api/lunchbox/devices') return route.fulfill({ json: [] });
    const testRows = url.searchParams.get('include_test') === 'true' ? [{ id: 'simulated', device_label: 'SIMULATED TEST', observed_at: '2026-10-21T01:00:00Z', received_at: '2026-10-21T02:00:00Z', is_test: true, review_status: 'unreviewed', image_status: 'stored', payload: { count_basis: 'frame_count', processing_status: 'ok', mosquito_count: 3, interval_start: '2026-10-21T00:59:00Z', interval_end: '2026-10-21T01:00:00Z', species_counts: [{ label: 'unknown', count: 3, confidence: null }], model_name: 'synthetic', model_version: 'test' } }] : [];
    return route.fulfill({ json: testRows });
  });
  await page.goto('/lunchbox');
  await expect(page.getByRole('heading', { name: 'KBTCOE · LunchBox' })).toBeVisible();
  await page.getByLabel('Operator token', { exact: true }).fill('wrong-token');
  await page.getByRole('button', { name: 'Connect to server' }).click();
  await expect(page.getByRole('alert')).toContainText('Access denied');
  await page.getByRole('button', { name: 'Disconnect' }).click();
  await page.getByLabel('Operator token', { exact: true }).fill('synthetic-test-token');
  await page.getByRole('button', { name: 'Connect to server' }).click();
  await expect(page.getByRole('heading', { name: 'No field observations received' })).toBeVisible();
  await expect(page.getByText('248 original images', { exact: true })).toBeVisible();
  await expect(page.getByText('Ground verification not recorded', { exact: true })).toBeVisible();
  await page.getByLabel('Show simulated test records').check();
  await expect(page.getByText('Simulated test · Unreviewed', { exact: true })).toBeVisible();
  await expect(page.getByText('Predicted unknown: 3', { exact: true })).toBeVisible();
  await expect(page.getByText('3 mosquitoes', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).length + Object.keys(sessionStorage).length)).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/kbtcoe-lunchbox-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.getByRole('heading', { name: 'Connect to view stored records' })).toBeVisible();
  await expect(page.getByLabel('Operator token', { exact: true })).toHaveValue('');
});
