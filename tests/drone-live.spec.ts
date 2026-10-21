import { test, expect } from '@playwright/test';

test('live Google map displays all four real surveys over Streets/Satellite with transparent coverage', async ({ page }) => {
  const tiles = new Set<string>();
  const rawTiffRequests: string[] = [];
  page.on('response', response => {
    const match = response.url().match(/\/drone\/(area-[a-d])\/\d+\/\d+\/\d+\.png/);
    if (match && response.status() === 200) tiles.add(match[1]);
  });
  page.on('request', request => { if (/\.tiff?(?:\?|$)/i.test(request.url())) rawTiffRequests.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/sites');
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled({ timeout: 25000 });
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const master = page.getByRole('checkbox', { name: /Drone Map overlay/ }); await master.check();
  await expect.poll(() => tiles.size).toBe(4);
  const images = page.locator('.google-map-canvas img[src*="/drone/area-"]');
  await expect.poll(() => images.count()).toBeGreaterThan(0);
  const b = page.getByRole('checkbox', { name: 'Show Area B survey' }); await b.uncheck();
  await expect(page.locator('.google-map-canvas img[src*="/drone/area-b/"]')).toHaveCount(0);
  await b.check(); await expect.poll(() => page.locator('.google-map-canvas img[src*="/drone/area-b/"]').count()).toBeGreaterThan(0);
  await page.getByRole('slider', { name: 'Drone imagery opacity' }).fill('0.5');
  await expect(images.first()).toHaveCSS('opacity', '0.5');
  await page.getByRole('button', { name: /Area C —/ }).click(); await page.getByRole('button', { name: 'Zoom to survey' }).click();
  await page.getByRole('button', { name: 'Close survey details' }).click();
  await page.waitForTimeout(1200); await page.screenshot({ path: 'test-results/drone-live-streets.png', fullPage: true });
  await page.getByRole('button', { name: 'Layers', exact: true }).click(); await page.getByLabel('Satellite', { exact: true }).check();
  await page.getByRole('slider', { name: 'Drone imagery opacity' }).fill('1');
  await page.getByRole('button', { name: 'Close layers' }).click();
  await page.waitForTimeout(1200); await page.screenshot({ path: 'test-results/drone-live-satellite.png', fullPage: true });
  await page.getByRole('button', { name: 'Layers', exact: true }).click(); await master.uncheck();
  await expect(images).toHaveCount(0);
  await page.getByRole('button', { name: 'Close layers' }).click();
  await page.screenshot({ path: 'test-results/drone-live-hidden.png', fullPage: true });
  expect(rawTiffRequests).toHaveLength(0);
});
