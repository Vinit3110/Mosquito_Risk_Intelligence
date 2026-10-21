import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  List,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
  Layers,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { GoogleSurveillanceMap } from '../components/GoogleSurveillanceMap';
import { LayersPanel } from '../components/LayersPanel';
import { SiteDetail } from '../components/SiteDetail';
import { SiteList } from '../components/SiteList';
import { demoSites } from '../data/demoData';
import type { Priority, SiteStatus } from '../domain';
import { localPlaces, lunchBoxLocations, visibleSurveyBounds, wardMatchesQuery } from '../geospatial/data';
import { useGeospatialData } from '../geospatial/useGeospatialData';
import type { GeographicBounds, LayerVisibility, MapMarker, Position } from '../geospatial/types';
import '../styles-google-map.css';

const ALL_STATUSES: Array<SiteStatus> = [
  'Detected',
  'Awaiting Verification',
  'Verified',
  'Intervention Assigned',
  'Intervention Completed',
  'Follow-up Due',
  'Reassessed',
  'Unable to Verify',
  'No Longer Actionable',
  'Reopened',
];

const ALL_PRIORITIES: Array<Priority> = ['High', 'Medium', 'Low'];

export function SitesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | SiteStatus>('All');
  const [priority, setPriority] = useState<'All' | Priority>('All');
  const [area, setArea] = useState('All');
  const [listOpen, setListOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState<LayerVisibility>({ baseMap: 'roadmap', hotspots: true, lunchboxes: false, wards: false, droneMap: false, droneOpacity: 0.85, surveys: {} });
  const [focus, setFocus] = useState<{ position: Position; bounds?: GeographicBounds; token: number }>();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>();
  const [selectedWardId, setSelectedWardId] = useState<string>();
  const { wards, surveys, wardState, surveyState } = useGeospatialData();

  const selectedId = searchParams.get('site') ?? undefined;
  const selectedSite = demoSites.find((site) => site.id === selectedId);

  const areas = useMemo(
    () => Array.from(new Set(demoSites.map((site) => site.ward))).sort(),
    []
  );

  const filtered = useMemo(
    () =>
      demoSites.filter((site) => {
        const haystack =
          `${site.id} ${site.label} ${site.ward} ${site.environmentalClassification} ${site.source}`.toLowerCase();
        const matchesQuery = haystack.includes(query.trim().toLowerCase());
        const matchesStatus = status === 'All' || site.status === status;
        const matchesPriority = priority === 'All' || site.priority === priority;
        const matchesArea = area === 'All' || site.ward === area;
        return matchesQuery && matchesStatus && matchesPriority && matchesArea;
      }),
    [query, status, priority, area]
  );

  const isFiltered = query || status !== 'All' || priority !== 'All' || area !== 'All';

  const selectSite = useCallback((siteId: string) => {
    setSearchParams({ site: siteId });
    const site = demoSites.find(s => s.id === siteId);
    if (site?.coordinates) setFocus(previous => ({ position: site.coordinates!, token: (previous?.token ?? 0) + 1 }));
    setLayersOpen(false);
    setSelectedSurveyId(undefined);
    setSelectedWardId(undefined);
  }, [setSearchParams]);
  // Deep links and browser back/forward also focus the selected record.
  useEffect(() => {
    if (selectedSite?.coordinates) setFocus(previous => ({ position: selectedSite.coordinates!, token: (previous?.token ?? 0) + 1 }));
  }, [selectedSite]);
  const markers = useMemo<MapMarker[]>(() => [
    ...filtered.flatMap(site => site.coordinates ? [{ id: site.id, name: site.label, position: site.coordinates, kind: site.source === 'Field' ? 'site' as const : 'hotspot' as const, priority: site.priority }] : []),
    ...lunchBoxLocations.map(box => ({ id: box.id, name: box.name, position: box.position, kind: 'lunchbox' as const })),
  ], [filtered]);
  const searchPlaces = query.trim() ? localPlaces.filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const searchWards = query.trim() ? wards?.features.filter(f => wardMatchesQuery(f.properties, query)) ?? [] : [];
  const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);
  const selectedWard = wards?.features.find(f => f.properties.id === selectedWardId);
  const selectWard = useCallback((id: string) => { setSelectedWardId(id); setSelectedSurveyId(undefined); setSearchParams({}); setLayersOpen(false); }, [setSearchParams]);
  const zoomToSurvey = (id: string) => {
    const bounds = surveys.find(s => s.id === id)?.bounds;
    if (bounds) setFocus(previous => ({ position: { lat: (bounds.north + bounds.south) / 2, lng: (bounds.east + bounds.west) / 2 }, bounds, token: (previous?.token ?? 0) + 1 }));
  };
  const selectSurvey = (id: string) => {
    setSelectedSurveyId(id); setSelectedWardId(undefined); setSearchParams({});
    zoomToSurvey(id);
  };
  const changeLayers = (next: LayerVisibility) => {
    setLayers(next);
    // Enabling imagery from the city view should reveal the limited survey coverage.
    if (next.droneMap && !layers.droneMap) {
      const bounds = visibleSurveyBounds(surveys, next.surveys);
      if (bounds) setFocus(previous => ({ position: { lat: (bounds.north + bounds.south) / 2, lng: (bounds.east + bounds.west) / 2 }, bounds, token: (previous?.token ?? 0) + 1 }));
    }
  };

  const clearFilters = () => {
    setQuery('');
    setStatus('All');
    setPriority('All');
    setArea('All');
  };

  return (
    <div className="page-stack sites-page map-first-page google-workspace">
      {/* ── Compact page header ─────────────────────────────── */}
      <section className="page-heading compact-heading map-page-heading">
        <div>
          <span className="eyebrow">Sites &amp; Map</span>
          <h1>Nashik surveillance workspace</h1>
          <p>
            Explore sites, review evidence and manage spatial layers.{' '}
            <span className="demo-label">
              ⚠ Demo data — not verified NMC surveillance records
            </span>
          </p>
        </div>
      </section>

      {/* ── Map toolbar: search + filters ───────────────────── */}
      <section className="toolbar panel map-toolbar" aria-label="Map filters">
        {/* Search */}
        <label className="search-field map-search" htmlFor="site-search">
          <Search size={16} />
          <input
            id="site-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations, sites or wards…"
            onKeyDown={(event) => { if (event.key === 'Escape') setQuery(''); }}
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </label>

        {/* Primary filter: status */}
        <label className="select-field" htmlFor="status-filter">
          <SlidersHorizontal size={15} />
          <span>Status</span>
          <select
            id="status-filter"
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'All' | SiteStatus)}
          >
            <option value="All">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {/* Expand / collapse extra filters */}
        <button
          type="button"
          className="secondary-button filter-toggle"
          onClick={() => setFiltersExpanded((v) => !v)}
          aria-expanded={filtersExpanded}
          aria-controls="extra-filters"
        >
          <SlidersHorizontal size={13} />
          More filters
          {filtersExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {(priority !== 'All' || area !== 'All') && (
            <span className="filter-active-dot" aria-label="Filters active" />
          )}
        </button>

        {/* Clear */}
        {isFiltered && (
          <button type="button" className="secondary-button clear-btn" onClick={clearFilters}>
            <X size={12} /> Clear
          </button>
        )}

        <span className="result-count" aria-live="polite" aria-atomic="true">
          {filtered.length}/{demoSites.length} sites
        </span>
        {query.trim() && <div className="map-search-results" aria-label="Search results">
          <span className="section-kicker">Sites &amp; local destinations</span>
          {filtered.slice(0, 6).map(site => <button key={site.id} onClick={() => { selectSite(site.id); setQuery(''); }}><MapPin size={14} /><span><strong>{site.id}</strong><small>{site.label} · {site.ward}</small></span></button>)}
          {searchPlaces.map(place => <button key={place.id} onClick={() => { setFocus(previous => ({ position: place.position, token: (previous?.token ?? 0) + 1 })); setQuery(''); setSearchParams({}); }}><Search size={14} /><span><strong>{place.name}</strong><small>Local destination · approximate centre</small></span></button>)}
          {searchWards.map(ward => <button key={ward.properties.id} onClick={() => { setLayers(current => ({ ...current, wards: true })); selectWard(ward.properties.id); setQuery(''); }}><Layers size={14} /><span><strong>{ward.properties.name}</strong><small>Supplied ward geometry</small></span></button>)}
          {!filtered.length && !searchPlaces.length && !searchWards.length && <p>No matching sites, local destinations or supplied wards.</p>}
          <small className="search-footnote">Search uses local data; citywide address lookup is not configured.</small>
        </div>}
      </section>

      {/* ── Expanded extra filters ──────────────────────────── */}
      {filtersExpanded && (
        <section
          id="extra-filters"
          className="toolbar panel extra-filters-bar"
          aria-label="Additional filters"
        >
          <label className="select-field" htmlFor="priority-filter">
            <MapPin size={15} />
            <span>Priority</span>
            <select
              id="priority-filter"
              aria-label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'All' | Priority)}
            >
              <option value="All">All priorities</option>
              {ALL_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field" htmlFor="ward-filter">
            <MapPin size={15} />
            <span>Ward / Area</span>
            <select
              id="ward-filter"
              aria-label="Ward / Area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              <option value="All">All wards</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      {/* ── Map workspace ───────────────────────────────────── */}
      <section className="map-workspace panel" aria-label="Spatial map workspace">
        <GoogleSurveillanceMap
          markers={markers}
          selectedId={selectedId}
          onSelect={selectSite}
          focus={focus}
          layers={layers}
          surveys={surveys}
          wards={wards}
          selectedWardId={selectedWardId}
          onWardSelect={selectWard}
        />
        <div className="workspace-map-tools">
          <span className="map-context-label">Nashik · {layers.baseMap === 'roadmap' ? 'Streets' : 'Satellite'}</span>
          <button className="layers-toggle" aria-expanded={layersOpen} aria-controls="workspace-layers" onClick={() => { setLayersOpen(v => !v); setListOpen(false); }}><Layers size={16} /> Layers</button>
        </div>
        {layersOpen && <div id="workspace-layers"><LayersPanel layers={layers} onChange={changeLayers} surveys={surveys} selectedSurveyId={selectedSurveyId} onSurveySelect={selectSurvey} wardState={wardState} surveyState={surveyState} lunchBoxCount={lunchBoxLocations.length} onClose={() => setLayersOpen(false)} /></div>}
        <div className="google-map-legend" aria-label="Map legend"><span><i className="legend-dot high" />High</span><span><i className="legend-dot medium" />Medium</span><span><i className="legend-dot low" />Low</span><small>● Hotspot · ◆ Field site</small></div>
        {selectedSurvey && <aside className="spatial-info-card" aria-label="Selected survey"><button className="icon-button" aria-label="Close survey details" onClick={() => setSelectedSurveyId(undefined)}><X size={16} /></button><span className="section-kicker">Drone survey</span><h2>{selectedSurvey.name}</h2><p>{selectedSurvey.date} · {selectedSurvey.status}</p><small>{selectedSurvey.message || 'Survey metadata supplied'}</small>{!selectedSurvey.imagery && <p>No imagery supplied. No orthophoto is displayed.</p>}
          {selectedSurvey.bounds && <button className="secondary-button" onClick={() => { zoomToSurvey(selectedSurvey.id); setLayersOpen(false); }}>Zoom to survey</button>}
          {selectedSurvey.status === 'ready' && <p>{layers.droneMap && layers.surveys[selectedSurvey.id] ? 'Imagery enabled' : 'Imagery hidden — enable it in Layers'}</p>}
        </aside>}
        {selectedWard && <aside className="spatial-info-card" aria-label="Selected ward"><button className="icon-button" aria-label="Close ward details" onClick={() => setSelectedWardId(undefined)}><X size={16} /></button><span className="section-kicker">Supplied ward</span><h2>{selectedWard.properties.name}</h2><p>Identifier: {selectedWard.properties.id}</p>
          {typeof selectedWard.properties.boundary_status === 'string' && <p>Boundary status: {selectedWard.properties.boundary_status}</p>}
          {typeof selectedWard.properties.source_file === 'string' && <p>Source: {selectedWard.properties.source_file}</p>}
          <small>Boundary geometry only. Site association uses wardId when authoritative assignments are supplied.</small></aside>}

        {/* Site-list drawer toggle */}
        <button
          type="button"
          className="site-drawer-toggle"
          onClick={() => { setListOpen((v) => !v); setLayersOpen(false); }}
          aria-expanded={listOpen}
          aria-controls="site-drawer"
        >
          {listOpen ? <X size={15} /> : <List size={15} />}
          <span>{listOpen ? 'Close list' : `Sites (${filtered.length})`}</span>
        </button>

        {/* Collapsible site list drawer */}
        {listOpen && (
          <aside id="site-drawer" className="site-drawer" aria-label="Filtered site list">
            <div className="site-drawer-head">
              <div>
                <span className="section-kicker">Accessible records</span>
                <h2>Site list</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setListOpen(false)}
                aria-label="Close site list"
              >
                <X size={16} />
              </button>
            </div>
            {filtered.length > 0 ? (
              <SiteList
                sites={filtered}
                selectedId={selectedId}
                onSelect={(site) => {
                  selectSite(site.id);
                }}
              />
            ) : (
              <div className="empty-state">
                <strong>No matching sites</strong>
                <span>Clear or adjust your filters.</span>
              </div>
            )}
          </aside>
        )}

        {/* Selected site detail card */}
        {selectedSite && (
          <SiteDetail site={selectedSite} onClose={() => setSearchParams({})} />
        )}
      </section>
    </div>
  );
}
