import { test, expect } from '@playwright/test';

test('live Google Maps renders all wards and selects the replacement Ward 7', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/sites');
  await expect(page.getByText('Loading Google Maps…', { exact: true })).toHaveCount(0, { timeout: 25000 });
  await expect(page.getByText('Google Maps unavailable', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Google Maps configuration required', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled();
  await expect(page.locator('.gm-style')).toBeVisible();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.getByText('31 wards loaded', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Ward boundaries/ })).toBeChecked();
  await page.getByRole('button', { name: 'Close layers' }).click();
  // Map readiness precedes asynchronous basemap tiles and the first data-layer paint.
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'test-results/wards-citywide-live.png', fullPage: true });
  for (const id of [1, 31]) {
    await page.getByPlaceholder('Search locations, sites or wards…').fill(`Ward ${id}`);
    await page.getByRole('button', { name: `Ward No.${id} Ward boundary`, exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Selected ward' }).getByRole('heading')).toHaveText(`Ward No.${id}`);
  }
  await page.getByPlaceholder('Search locations, sites or wards…').fill('Ward 7');
  await page.getByRole('button', { name: 'Ward No.7 Ward boundary', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Selected ward' })).toContainText('Identifier: 7');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/ward7-live-visible.png', fullPage: true });
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const toggle = page.getByRole('checkbox', { name: /Ward boundaries/ });
  await toggle.uncheck();
  await page.getByRole('button', { name: 'Close layers' }).click();
  await page.screenshot({ path: 'test-results/ward7-live-hidden.png', fullPage: true });
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await toggle.check(); await page.getByRole('button', { name: 'Close layers' }).click();
  await expect(page.getByRole('complementary', { name: 'Selected ward' })).toContainText('Identifier: 7');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/ward7-live-restored.png', fullPage: true });
  await page.getByRole('button', { name: 'Close ward details' }).click();
  // Click a clear interior point in the fitted, real Google-rendered polygon.
  await page.locator('.google-map-canvas').click({ position: { x: 450, y: 450 } });
  await expect(page.getByRole('complementary', { name: 'Selected ward' })).toContainText('Ward No.7');
});
