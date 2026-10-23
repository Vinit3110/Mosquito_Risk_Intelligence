import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { validateSurveys, surveyTileUrl } from '../src/geospatial/validation';
import { visibleSurveyBounds } from '../src/geospatial/data';

const surveys = validateSurveys(JSON.parse(readFileSync(new URL('../public/drone/surveys.json', import.meta.url), 'utf8')));
test('real orthophoto metadata supplies four bounded XYZ sources and union bounds', () => {
  expect(surveys).toHaveLength(4);
  for (const survey of surveys) {
    expect(survey.status).toBe('ready'); expect(survey.date).toBe('2026-08-19');
    expect(survey.imagery?.kind).toBe('xyz'); expect(survey.sourceCrs).toBe('EPSG:32643');
    expect(survey.bounds?.west).toBeGreaterThan(73); expect(survey.bounds?.north).toBeLessThan(21);
  }
  const union = visibleSurveyBounds(surveys, Object.fromEntries(surveys.map(s => [s.id, true])))!;
  for (const s of surveys) { expect(union.north).toBeGreaterThanOrEqual(s.bounds!.north); expect(union.south).toBeLessThanOrEqual(s.bounds!.south); }
  expect(visibleSurveyBounds(surveys, {})).toBeUndefined();
  expect(visibleSurveyBounds(surveys, { 'area-c': true })).toEqual(surveys[2].bounds);
});
test('generated tiles are browser PNGs with embedded alpha and geographic requests resolve', async ({ request }) => {
  for (const s of surveys) {
    const z = 19, lat = (s.bounds!.north + s.bounds!.south) / 2, lng = (s.bounds!.east + s.bounds!.west) / 2;
    const x = Math.floor((lng + 180) / 360 * 2 ** z), y = Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z);
    const response = await request.get(surveyTileUrl(s, x, y, z)!);
    expect(response.ok()).toBe(true);
    const png = await response.body();
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(256); expect(png.readUInt32BE(20)).toBe(256);
    expect(png[25]).toBe(6); // PNG RGBA color type, transparency included.
  }
});
test('Drone Map master, independent areas and opacity preserve Streets/Satellite', async ({ page }) => {
  await page.goto('/sites'); await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.getByText('4 supplied surveys · 4 imagery ready')).toBeVisible();
  const master = page.getByRole('checkbox', { name: /Drone Map overlay/ });
  await master.check();
  for (const name of ['A', 'B', 'C', 'D']) await expect(page.getByRole('checkbox', { name: `Show Area ${name} survey` })).toBeChecked();
  const areaB = page.getByRole('checkbox', { name: 'Show Area B survey' }); await areaB.uncheck();
  await master.uncheck(); await master.check(); await expect(areaB).not.toBeChecked();
  await page.getByRole('slider', { name: 'Drone imagery opacity' }).fill('0.5');
  await expect(page.getByText('50%', { exact: true })).toBeVisible();
  await page.getByLabel('Satellite', { exact: true }).check(); await expect(master).toBeChecked();
  await page.getByLabel('Streets', { exact: true }).check(); await expect(master).toBeChecked();
  await page.getByRole('button', { name: /Area C —/ }).click();
  await expect(page.getByRole('complementary', { name: 'Selected survey' })).toContainText('Imagery enabled');
  await page.getByRole('button', { name: 'Zoom to survey' }).click();
});
test('missing bundled imagery metadata displays an error and no invented surveys', async ({ page }) => {
  await page.route('**/drone/surveys.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/sites'); await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.getByText('Data unavailable: HTTP 503')).toBeVisible();
  await expect(page.getByText('No surveys supplied')).toBeVisible();
});
