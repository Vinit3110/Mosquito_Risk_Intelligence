import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let configured = false;
export async function loadGoogleMaps(key: string) {
  if (!configured) { setOptions({ key, v: 'quarterly' }); configured = true; }
  const libraries = await Promise.all([importLibrary('maps'), importLibrary('marker')]);
  return { maps: libraries[0] as google.maps.MapsLibrary, markers: libraries[1] as google.maps.MarkerLibrary };
}
