import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { validateWards } from '../src/geospatial/validation';
import { wardMatchesQuery } from '../src/geospatial/data';
import { attachWardLayer } from '../src/geospatial/googleWards';

// Keep legacy KML-conversion compatibility coverage, separately from the active dataset.
const source = JSON.parse(readFileSync(new URL('../../geojson/ward_07.geojson', import.meta.url), 'utf8'));
const allWards = JSON.parse(readFileSync(new URL('../public/data/nashik_wards.geojson', import.meta.url), 'utf8'));

test('citywide dataset contains wards 1–31 and numbered searches select exactly one ward', () => {
  const wards = validateWards(allWards);
  expect(wards.features.map(f => f.properties.id)).toEqual(Array.from({ length: 31 }, (_, i) => String(i + 1)));
  for (let id = 1; id <= 31; id++) {
    for (const query of [`Ward ${id}`, `Ward No.${id}`, String(id), `Ward ${String(id).padStart(2, '0')}`]) {
      expect(wards.features.filter(f => wardMatchesQuery(f.properties, query)).map(f => f.properties.id)).toEqual([String(id)]);
    }
  }
  expect(wards.features.filter(f => wardMatchesQuery(f.properties, 'Ward'))).toHaveLength(31);
  const ward7 = wards.features.find(f => f.properties.id === '7')!;
  expect(ward7.geometry).not.toEqual(source.features[0].geometry);
  expect(ward7.properties.source_file).toBeUndefined();
  expect(ward7.properties.boundary_status).toBeUndefined();
});

test('supplied Ward 7 is normalized without changing source properties or coordinates', () => {
  const snapshot = JSON.stringify(source);
  const wards = validateWards(source);
  expect(wards.features).toHaveLength(1);
  const ward = wards.features[0];
  expect(ward.properties).toMatchObject({ id: '7', name: 'Ward No.7', ward_id: 7, ward_name: 'Ward No.7', source_file: 'Ward_No_7.kml' });
  expect(ward.geometry).toEqual(source.features[0].geometry);
  expect(JSON.stringify(source)).toBe(snapshot);
  for (const query of ['Ward 7', 'Ward No.7', '7']) expect(wardMatchesQuery(ward.properties, query)).toBe(true);
  expect(wardMatchesQuery(ward.properties, 'Ward 8')).toBe(false);
});
test('normalization supports future wards and preserves canonical contracts', () => {
  const wards = validateWards({ ...source, features: [...source.features, { ...source.features[0], properties: { id: '8', name: 'Canonical ward', ward_id: 88, ward_name: 'Source name' } }] });
  expect(wards.features[1].properties).toMatchObject({ id: '8', name: 'Canonical ward', ward_id: 88 });
  expect(wardMatchesQuery(wards.features[1].properties, '8')).toBe(true);
  expect(wardMatchesQuery(wards.features[1].properties, 'Ward 88')).toBe(true);
  expect(() => validateWards({ ...source, features: [source.features[0], source.features[0]] })).toThrow(/unique/);
});
test('rejects invalid rings and projected coordinates; checks supplied longitude/latitude order', () => {
  const withRing = (coordinates: unknown) => ({ ...source, features: [{ ...source.features[0], geometry: { type: 'Polygon', coordinates } }] });
  const ring = source.features[0].geometry.coordinates[0];
  expect(() => validateWards(withRing([ring.slice(0, -1)]))).toThrow(/closed WGS84/);
  expect(() => validateWards(withRing([[null, null, null, null]]))).toThrow(/closed WGS84/);
  expect(() => validateWards(withRing(null))).toThrow(/closed WGS84/);
  // Projected coordinates cannot pass the geographic contract.
  expect(() => validateWards(withRing([[[580000, 2200000], [580001, 2200000], [580000, 2200001], [580000, 2200000]]]))).toThrow();
  // Supplied Nashik order is longitude ~73.7, latitude ~20; preserve, never silently swap.
  expect(ring.every((p: number[]) => p[0] > 73 && p[0] < 74 && p[1] > 19 && p[1] < 21)).toBe(true);
});
test('Ward 7 adapter renders, styles, selects, fits bounds and restores selection', () => {
  const wards = validateWards(source);
  let received: unknown, selected: string | undefined, attached: unknown, fits = 0, removed = 0;
  let click: ((event: { feature: typeof feature }) => void) | undefined;
  let style: ((feature: typeof feature) => google.maps.Data.StyleOptions) | undefined;
  const feature = { getId: () => '7', getGeometry: () => ({ forEachLatLng: (visit: (p: unknown) => void) => source.features[0].geometry.coordinates[0].forEach((p: number[]) => visit(p)) }) };
  const extended: unknown[] = [];
  class Data {
    constructor() { attached = map; }
    addGeoJson(value: unknown, options: unknown) { received = value; expect(options).toEqual({ idPropertyName: 'id' }); }
    setStyle(fn: typeof style) { style = fn; }
    getFeatureById(id: string) { return id === '7' ? feature : undefined; }
    addListener(_event: string, callback: typeof click) { click = callback; return { remove: () => { removed++; } }; }
    setMap(value: unknown) { attached = value; }
  }
  class Bounds { extend(p: unknown) { extended.push(p); } isEmpty() { return false; } }
  const map = { fitBounds: (_bounds: unknown, padding: number) => { fits++; expect(padding).toBe(80); } } as unknown as google.maps.Map;
  const previous = globalThis.google;
  globalThis.google = { maps: { Data, LatLngBounds: Bounds } } as unknown as typeof google;
  try {
    let cleanup = attachWardLayer(map, wards, undefined, id => { selected = id; });
    expect(received).toEqual(wards);
    expect(style?.(feature)).toMatchObject({ strokeWeight: 2, fillOpacity: 0.08 });
    click?.({ feature }); expect(selected).toBe('7'); expect(fits).toBe(1);
    cleanup(); expect(attached).toBeNull();
    cleanup = attachWardLayer(map, wards, selected);
    expect(style?.(feature)).toMatchObject({ strokeWeight: 4, fillOpacity: 0.22 });
    expect(fits).toBe(2); expect(extended).toHaveLength(92);
    cleanup(); expect(removed).toBe(2);
  } finally { globalThis.google = previous; }
});
test('static asset loads, search selects Ward 7 and toggles retain selection', async ({ page, request }) => {
  const response = await request.get('/data/nashik_wards.geojson');
  expect(response.ok()).toBe(true); expect(await response.json()).toEqual(allWards);
  await page.goto('/sites');
  await page.getByPlaceholder('Search locations, sites or wards…').fill('Ward 7');
  await page.getByRole('button', { name: 'Ward No.7 Ward boundary', exact: true }).click();
  const card = page.getByRole('complementary', { name: 'Selected ward' });
  await expect(card).toContainText('Identifier: 7');
  await expect(card).not.toContainText('user-traced');
  await expect(card).not.toContainText('Source:');
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const toggle = page.getByRole('checkbox', { name: /Ward boundaries/ });
  await expect(toggle).toBeChecked(); await toggle.uncheck();
  await expect(card).toContainText('Ward No.7');
  await toggle.check(); await expect(card).toContainText('Identifier: 7');
});

test('all 31 wards can be selected through search', async ({ page }) => {
  await page.goto('/sites');
  for (let id = 1; id <= 31; id++) {
    await page.getByPlaceholder('Search locations, sites or wards…').fill(`Ward ${id}`);
    await expect(page.getByRole('button', { name: /Ward No\.\d+ Ward boundary/ })).toHaveCount(1);
    await page.getByRole('button', { name: `Ward No.${id} Ward boundary`, exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Selected ward' }).getByRole('heading')).toHaveText(`Ward No.${id}`);
  }
});
test('bundled ward loading failure and empty collections are reported', async ({ page }) => {
  await page.route('**/data/nashik_wards.geojson', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/sites'); await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.getByText('Data unavailable: HTTP 503')).toBeVisible();
  await page.route('**/data/nashik_wards.geojson', route => route.fulfill({ json: { type: 'FeatureCollection', features: [] } }));
  await page.reload(); await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.getByText('No ward boundaries supplied')).toBeVisible();
});
