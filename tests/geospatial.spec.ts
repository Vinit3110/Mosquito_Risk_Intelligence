import { test, expect } from '@playwright/test';
import { validateSurveys, validateWards, surveyTileUrl } from '../src/geospatial/validation';
import { pendingSurveys } from '../src/geospatial/data';
import { attachSurveyOverlay } from '../src/geospatial/googleOverlays';
import { attachWardLayer } from '../src/geospatial/googleWards';
import type { SurveyLayer } from '../src/geospatial/types';

const survey: SurveyLayer = { id: 'test-only', name: 'Test fixture', date: '2026-08-19', sourceCrs: 'EPSG:32643', status: 'ready', bounds: { north: 20.03, south: 19.95, west: 73.74, east: 73.84 }, imagery: { kind: 'xyz', urlTemplate: 'https://imagery.example/{z}/{x}/{y}.png', minZoom: 10, maxZoom: 19, opacity: 0.7, tileSize: 256 } };
const wardFixture = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'test-ward', name: 'Synthetic test polygon (not NMC)' }, geometry: { type: 'Polygon', coordinates: [[[73.78, 19.99], [73.80, 19.99], [73.80, 20.01], [73.78, 19.99]]] } }] };

test('validates awaiting-data entries and ready survey sources', () => {
  expect(validateSurveys(pendingSurveys)).toHaveLength(4);
  expect(validateSurveys([survey])[0].imagery?.kind).toBe('xyz');
  expect(validateSurveys([{ ...survey, imagery: { kind: 'ground', url: '/prototype.png', opacity: 0.5 } }])).toHaveLength(1);
});
test('rejects UTM bounds, missing metadata, invalid tiles, and browser GeoTIFFs', () => {
  expect(() => validateSurveys([{ ...survey, bounds: { north: 2200000, south: 2190000, east: 585000, west: 580000 } }])).toThrow();
  expect(() => validateSurveys([{ ...survey, imagery: undefined }])).toThrow();
  expect(() => validateSurveys([{ ...survey, imagery: { ...survey.imagery, urlTemplate: '/tiles.png' } }])).toThrow();
  expect(() => validateSurveys([{ ...survey, imagery: { kind: 'ground', url: '/orthophoto.tif', opacity: 1 } }])).toThrow();
  expect(() => validateSurveys([survey, survey])).toThrow();
  expect(() => validateSurveys([{ ...survey, date: '2026-02-30' }])).toThrow();
});
test('limits tile requests to geography and supported zooms', () => {
  const z = 12, x = Math.floor((73.79 + 180) / 360 * 2 ** z);
  const y = Math.floor((1 - Math.asinh(Math.tan(20 * Math.PI / 180)) / Math.PI) / 2 * 2 ** z);
  expect(surveyTileUrl(survey, x, y, z)).toBe(`https://imagery.example/${z}/${x}/${y}.png`);
  expect(surveyTileUrl(survey, x + 2 ** z, y, z)).toBe(surveyTileUrl(survey, x, y, z));
  expect(surveyTileUrl(survey, 0, 0, z)).toBeNull();
  expect(surveyTileUrl(survey, x, y, 9)).toBeNull();
  expect(surveyTileUrl(survey, x, -1, z)).toBeNull();
});
test('validates empty and supplied wards and rejects projected coordinates', () => {
  expect(validateWards({ type: 'FeatureCollection', features: [] }).features).toHaveLength(0);
  expect(validateWards(wardFixture).features).toHaveLength(1);
  expect(() => validateWards({ ...wardFixture, features: [{ ...wardFixture.features[0], geometry: { type: 'Polygon', coordinates: [[[580000, 2200000], [580001, 2200000], [580000, 2200001], [580000, 2200000]]] } }] })).toThrow();
});
// Adapter contract tests use test doubles only; the product never shows a fake map.
test('ward adapter passes geometry, selects wards and cleans up', () => {
  let received: unknown, click: ((event: unknown) => void) | undefined, cleaned = false, selected: string | undefined;
  class Data {
    addGeoJson(value: unknown) { received = value; }
    setStyle() {}
    getFeatureById() { return undefined; }
    addListener(_name: string, handler: (event: unknown) => void) { click = handler; return { remove() {} }; }
    setMap(value: unknown) { cleaned = value === null; }
  }
  class Bounds { isEmpty() { return true; } }
  const previous = globalThis.google;
  globalThis.google = { maps: { Data, LatLngBounds: Bounds } } as unknown as typeof google;
  try {
    const remove = attachWardLayer({} as google.maps.Map, validateWards(wardFixture), undefined, id => { selected = id; });
    expect(received).toEqual(wardFixture);
    click?.({ feature: { getId: () => 'test-ward', getGeometry: () => undefined } });
    expect(selected).toBe('test-ward'); remove(); expect(cleaned).toBe(true);
  } finally { globalThis.google = previous; }
});
test('ground adapter waits for a browser image and removes overlay', () => {
  let attached: unknown, image: { onload?: () => void; onerror?: () => void; src?: string } | undefined;
  // Capture the browser-image test double so completion can be triggered explicitly.
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  class ImageDouble { constructor() { image = this; } onload?: () => void; onerror?: () => void; src?: string; }
  class GroundOverlay { setMap(value: unknown) { attached = value; } }
  const previousGoogle = globalThis.google, previousImage = globalThis.Image;
  globalThis.google = { maps: { GroundOverlay } } as unknown as typeof google;
  globalThis.Image = ImageDouble as unknown as typeof Image;
  try {
    const map = {} as google.maps.Map;
    const remove = attachSurveyOverlay(map, { ...survey, imagery: { kind: 'ground', url: '/test.png', opacity: 0.7 } }, () => {});
    expect(attached).toBeUndefined(); image?.onload?.(); expect(attached).toBe(map);
    remove(); expect(attached).toBeNull();
  } finally { globalThis.google = previousGoogle; globalThis.Image = previousImage; }
});
test('XYZ adapters remove independently and pending surveys create no imagery', () => {
  const overlays: google.maps.MapType[] = [];
  const map = { overlayMapTypes: { push: (v: google.maps.MapType) => overlays.push(v), getArray: () => overlays, removeAt: (i: number) => overlays.splice(i, 1) } } as unknown as google.maps.Map;
  const previous = globalThis.google;
  globalThis.google = { maps: { Size: class {} } } as unknown as typeof google;
  try {
    attachSurveyOverlay(map, pendingSurveys[0], () => {}); expect(overlays).toHaveLength(0);
    const removeA = attachSurveyOverlay(map, survey, () => {});
    const removeB = attachSurveyOverlay(map, { ...survey, id: 'other' }, () => {});
    expect(overlays).toHaveLength(2); removeA(); expect(overlays).toHaveLength(1); removeB(); expect(overlays).toHaveLength(0);
  } finally { globalThis.google = previous; }
});
