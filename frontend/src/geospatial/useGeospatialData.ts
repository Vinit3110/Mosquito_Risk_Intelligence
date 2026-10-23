import { useEffect, useState } from 'react';
import { DEFAULT_SURVEYS_URL, DEFAULT_WARDS_URL } from './data';
import { validateSurveys, validateWards } from './validation';
import type { SurveyLayer, WardCollection } from './types';

/** Optional API seams. Loading/validation are independent of the map vendor. */
export function useGeospatialData() {
  const [wards, setWards] = useState<WardCollection | undefined>();
  const [surveys, setSurveys] = useState<SurveyLayer[]>([]);
  const [wardState, setWardState] = useState('Loading ward boundaries…');
  const [surveyState, setSurveyState] = useState('Loading drone survey metadata…');
  useEffect(() => {
    const controller = new AbortController();
    async function load(url: string, kind: 'wards' | 'surveys') {
      const status = kind === 'wards' ? setWardState : setSurveyState;
      status('Loading data…');
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: unknown = await response.json();
        if (kind === 'wards') {
          const parsed = validateWards(data);
          setWards(parsed);
          const traced = parsed.features.some(f => typeof f.properties.boundary_status === 'string' && /user-traced|manually traced/i.test(f.properties.boundary_status));
          status(parsed.features.length ? `${parsed.features.length} ward${parsed.features.length === 1 ? '' : 's'} loaded${traced ? ' · manually traced; municipal verification pending' : ''}` : 'No ward boundaries supplied');
        }
        else {
          const parsed = validateSurveys(data).map(survey => ({ ...survey, imagery: survey.imagery?.kind === 'xyz' && survey.imagery.urlTemplate.startsWith('/drone/') ? { ...survey.imagery, urlTemplate: `${import.meta.env.BASE_URL}${survey.imagery.urlTemplate.slice(1)}` } : survey.imagery }));
          setSurveys(parsed);
          status(`${parsed.length} supplied surveys · ${parsed.filter(s => s.status === 'ready').length} imagery ready`);
        }
      } catch (error) {
        if (!controller.signal.aborted) status(`Data unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    void load(import.meta.env.VITE_WARDS_GEOJSON_URL?.trim() || DEFAULT_WARDS_URL, 'wards');
    void load(import.meta.env.VITE_SURVEYS_METADATA_URL?.trim() || DEFAULT_SURVEYS_URL, 'surveys');
    return () => controller.abort();
  }, []);
  return { wards, surveys, wardState, surveyState };
}
