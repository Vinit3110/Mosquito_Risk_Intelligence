import type { WardCollection } from './types';

export function attachWardLayer(map: google.maps.Map, wards: WardCollection, selectedId: string | undefined, onSelect?: (id: string) => void): () => void {
  const data = new google.maps.Data({ map });
  try { data.addGeoJson(wards, { idPropertyName: 'id' }); }
  catch (error) { data.setMap(null); throw error; }
  data.setStyle(feature => ({ fillOpacity: feature.getId() === selectedId ? 0.22 : 0.08, fillColor: '#147d74', strokeColor: feature.getId() === selectedId ? '#075e56' : '#147d74', strokeWeight: feature.getId() === selectedId ? 4 : 2 }));
  function focus(feature: google.maps.Data.Feature) {
    const bounds = new google.maps.LatLngBounds();
    feature.getGeometry()?.forEachLatLng(position => bounds.extend(position));
    if (!bounds.isEmpty()) map.fitBounds(bounds, 80);
  }
  const listener = data.addListener('click', (event: google.maps.Data.MouseEvent) => {
    onSelect?.(String(event.feature.getId())); focus(event.feature);
  });
  const selected = selectedId ? data.getFeatureById(selectedId) : undefined;
  if (selected) focus(selected);
  return () => { listener.remove(); data.setMap(null); };
}
