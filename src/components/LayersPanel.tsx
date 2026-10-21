import { X } from 'lucide-react';
import type { LayerVisibility, SurveyLayer } from '../geospatial/types';

interface Props {
  layers: LayerVisibility;
  onChange: (layers: LayerVisibility) => void;
  surveys: SurveyLayer[];
  selectedSurveyId?: string;
  onSurveySelect: (id: string) => void;
  wardState: string;
  surveyState: string;
  lunchBoxCount: number;
  onClose: () => void;
}
export function LayersPanel({ layers, onChange, surveys, selectedSurveyId, onSurveySelect, wardState, surveyState, lunchBoxCount, onClose }: Props) {
  return <aside className="layers-panel" aria-label="Layers panel">
    <div className="layers-heading"><h2>Map layers</h2><button className="icon-button" aria-label="Close layers" onClick={onClose}><X size={17} /></button></div>
    <fieldset><legend>Base map</legend>
      <div className="basemap-switch">{(['roadmap', 'satellite'] as const).map(type => <label key={type} className={layers.baseMap === type ? 'enabled' : ''}><input type="radio" name="base-map" checked={layers.baseMap === type} onChange={() => onChange({ ...layers, baseMap: type })} />{type === 'roadmap' ? 'Streets' : 'Satellite'}</label>)}</div>
    </fieldset>
    <fieldset><legend>Drone Map</legend>
      <label className="layer-row"><input type="checkbox" checked={layers.droneMap} onChange={() => onChange({ ...layers, droneMap: !layers.droneMap, surveys: Object.keys(layers.surveys).length ? layers.surveys : Object.fromEntries(surveys.filter(s => s.status === 'ready').map(s => [s.id, true])) })} /><span><strong>Drone Map overlay</strong><small>Surveyed areas only · above Streets or Satellite</small></span></label>
      <label className="drone-opacity">Opacity <span>{Math.round(layers.droneOpacity * 100)}%</span><input aria-label="Drone imagery opacity" type="range" min="0" max="1" step="0.05" value={layers.droneOpacity} onChange={event => onChange({ ...layers, droneOpacity: Number(event.target.value) })} /></label>
      <p className="layer-note">The basemap remains visible outside survey coverage.</p>
      {layers.droneMap && !surveys.some(s => s.status === 'ready' && layers.surveys[s.id]) && <p className="layer-note">No ready survey areas enabled.</p>}
    </fieldset>
    <fieldset><legend>Operational layers</legend>
      {(['hotspots', 'lunchboxes', 'wards'] as const).map(key => <label className="layer-row" key={key}>
        <input type="checkbox" checked={layers[key]} onChange={() => onChange({ ...layers, [key]: !layers[key] })} />
        <span><strong>{key === 'hotspots' ? 'Hotspots' : key === 'lunchboxes' ? 'LunchBoxes' : 'Ward boundaries'}</strong><small>{key === 'hotspots' ? 'Illustrative mosquito-risk locations' : key === 'lunchboxes' ? lunchBoxCount ? `${lunchBoxCount} supplied locations` : 'No LunchBox locations supplied' : wardState}</small></span>
      </label>)}
    </fieldset>
    <fieldset><legend>Drone surveys</legend><p className="layer-note">{surveyState}</p>
      {surveys.map(survey => <div className={`survey-row ${selectedSurveyId === survey.id ? 'selected' : ''}`} key={survey.id}>
        <input type="checkbox" aria-label={`Show ${survey.name} survey`} checked={Boolean(layers.surveys[survey.id])} onChange={() => onChange({ ...layers, droneMap: !layers.surveys[survey.id] ? true : layers.droneMap, surveys: { ...layers.surveys, [survey.id]: !layers.surveys[survey.id] } })} />
        <button onClick={() => onSurveySelect(survey.id)} aria-pressed={selectedSurveyId === survey.id}><strong>{survey.name} — {new Date(`${survey.date}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</strong><small>{survey.status === 'ready' ? 'Imagery ready' : survey.message || survey.status}</small></button>
      </div>)}
      {!surveys.length && <p className="layer-note">No surveys supplied</p>}
    </fieldset>
  </aside>;
}
