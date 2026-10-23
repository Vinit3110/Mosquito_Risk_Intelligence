import { test, expect } from '@playwright/test';
import { pendingSurveys } from '../src/geospatial/data';

test.use({ baseURL: 'http://127.0.0.1:5188' });
const wards = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'synthetic-test', name: 'Synthetic test ward' }, geometry: { type: 'Polygon', coordinates: [[[73.78, 19.99], [73.80, 19.99], [73.80, 20.01], [73.78, 19.99]]] } }] };

test('shows actual loader failure and accepts supplied metadata without a fake map', async ({ page }) => {
  await page.route('**/maps.googleapis.com/**', route => route.abort());
  await page.route('**/fixtures/wards.geojson', route => route.fulfill({ json: wards }));
  await page.route('**/fixtures/surveys.json', route => route.fulfill({ json: pendingSurveys }));
  await page.goto('/sites');
  await expect(page.getByText('Google Maps unavailable', { exact: true })).toBeVisible({ timeout: 25000 });
  await expect(page.getByRole('button', { name: 'Retry map' })).toBeVisible();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.getByText('1 ward loaded', { exact: true })).toBeVisible();
  await expect(page.getByText('4 supplied surveys · 0 imagery ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close layers' }).click();
  await page.getByPlaceholder('Search locations, sites or wards…').fill('Synthetic test ward');
  await page.getByRole('button', { name: 'Synthetic test ward Ward boundary' }).click();
  await expect(page.getByRole('complementary', { name: 'Selected ward' })).toContainText('synthetic-test');
});
test('loading and invalid geospatial responses produce honest feedback', async ({ page }) => {
  await page.route('**/maps.googleapis.com/**', async route => { await new Promise(resolve => setTimeout(resolve, 800)); await route.abort(); });
  await page.route('**/fixtures/wards.geojson', route => route.fulfill({ json: { type: 'not-geojson' } }));
  await page.route('**/fixtures/surveys.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/sites');
  await expect(page.getByText('Loading Google Maps…', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.getByText('Data unavailable: Ward data must be a GeoJSON FeatureCollection.')).toBeVisible();
  await expect(page.getByText('Data unavailable: HTTP 503')).toBeVisible();
  await expect(page.getByText('No surveys supplied')).toBeVisible();
});
