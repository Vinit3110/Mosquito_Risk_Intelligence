import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import '../styles-lunchbox.css';

interface Campus {
  id: string;
  name: string;
  surveys: Array<{ id: string; name: string; capture_date: string | null }>;
  areas: Array<{ id: string; name: string; raw_images: number; processed_assets: number }>;
  ground_verification: string;
}
interface Device { id: string; label: string; revoked_at: string | null; is_test: boolean }
interface Observation {
  id: string; device_label: string; observed_at: string; received_at: string;
  is_test: boolean; review_status: string; image_status: string;
  payload: {
    count_basis: 'frame_count' | 'interval_new' | 'trap_total'; processing_status: string;
    mosquito_count: number | null; interval_start: string; interval_end: string;
    species_counts: Array<{ label: string; count: number; confidence: number | null }>;
    model_name: string; model_version: string;
  };
}
const basis = { frame_count: 'Count in one frame', interval_new: 'New detections during interval', trap_total: 'Total currently in trap' };
const time = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', timeZoneName: 'short' });

export function LunchBoxPage() {
  const [entry, setEntry] = useState('');
  const [credential, setCredential] = useState('');
  const [includeTest, setIncludeTest] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!credential) return;
    let active = true;
    let controller: AbortController | undefined;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      setLoading(true);
      async function get<T>(path: string): Promise<T> {
        const response = await fetch(`/api${path}`, { signal, cache: 'no-store', headers: { Authorization: `Bearer ${credential}` } });
        if (!response.ok) throw new Error(response.status === 401 ? 'Access denied. Check the operator token and reconnect.' : `Server request failed (${response.status}). Check the backend connection.`);
        return response.json() as Promise<T>;
      }
      try {
        const campuses = await get<Array<{ id: string; code: string }>>('/campuses');
        const selected = campuses.find(item => item.code === 'KBTCOE');
        if (!selected) throw new Error('KBTCOE has not been registered on this server yet.');
        const query = `campus_id=${encodeURIComponent(selected.id)}&include_test=${includeTest}`;
        const [nextCampus, nextDevices, nextObservations] = await Promise.all([
          get<Campus>(`/campuses/${selected.id}`), get<Device[]>(`/lunchbox/devices?${query}`),
          get<Observation[]>(`/lunchbox/observations?${query}&limit=100`),
        ]);
        if (!active || signal.aborted) return;
        setCampus(nextCampus); setDevices(nextDevices); setObservations(nextObservations);
        setUpdated(new Date().toISOString()); setError('');
      } catch (failure) {
        if (!active || signal.aborted) return;
        setError(failure instanceof Error ? failure.message : 'Unable to connect to the server.');
        setCampus(null); setDevices([]); setObservations([]); setUpdated(null);
      } finally {
        if (active && !signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 30_000);
    return () => { active = false; controller?.abort(); window.clearInterval(timer); };
  }, [credential, includeTest, refresh]);

  function connect(event: FormEvent) {
    event.preventDefault(); setError(''); setCredential(entry.trim()); setEntry(''); setRefresh(value => value + 1);
  }
  function disconnect() {
    setCredential(''); setEntry(''); setCampus(null); setDevices([]); setObservations([]);
    setError(''); setUpdated(null); setLoading(false); setIncludeTest(false);
  }

  return <div className="page-stack lunchbox-page">
    <section className="page-heading">
      <div><span className="eyebrow">College surveillance</span><h1>KBTCOE · LunchBox</h1><p>Device observations, predicted classifications and their evidence.</p></div>
      <span className="filter-chip">Ground verification not recorded</span>
    </section>
    <section className="panel lunchbox-access" aria-label="Server connection">
      {!credential ? <form onSubmit={connect}>
        <label htmlFor="operator-token">Operator token</label>
        <div className="lunchbox-controls"><input id="operator-token" type="password" value={entry} onChange={event => setEntry(event.target.value)} required autoComplete="off" placeholder="Enter your private pilot token" />
          <button className="primary-button" type="submit" disabled={!entry.trim()}>Connect to server</button></div>
        <p className="lunchbox-muted">Private pilot access. The token stays in memory for this page and is cleared when you disconnect or leave it.</p>
      </form> : <div className="lunchbox-controls">
        <span>{loading ? 'Fetching server records…' : updated ? `Last fetched ${time(updated)}` : 'Connection not established'}</span>
        <button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading}>Refresh</button>
        <button type="button" onClick={disconnect}>Disconnect</button>
      </div>}
      {error && <p role="alert">{error}</p>}
    </section>
    {!credential && <section className="panel lunchbox-empty"><h2>Connect to view stored records</h2><p>No device observations have been loaded. Connect to see KBTCOE’s survey and any received LunchBox results.</p></section>}
    {campus && <>
      <section className="panel lunchbox-section" aria-label="Registered college survey">
        <h2>{campus.name} · First drone survey</h2>
        <p>{campus.surveys.map(survey => survey.capture_date ? new Date(`${survey.capture_date}T00:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }) : 'Capture date not recorded').join(', ')} · Aerial evidence</p>
        <div className="lunchbox-areas">{campus.areas.map(area => <article key={area.id}><h3>{area.name}</h3><strong>{area.raw_images} original images</strong><span>{area.processed_assets} processed assets</span></article>)}</div>
        <p className="lunchbox-muted">Image coverage is not an official campus boundary. Aerial findings and device predictions require review.</p>
      </section>
      <section className="panel lunchbox-section" aria-label="LunchBox observations">
        <div className="lunchbox-controls"><h2>Received observations</h2><label className="lunchbox-test-toggle"><input type="checkbox" checked={includeTest} onChange={event => { setObservations([]); setDevices([]); setIncludeTest(event.target.checked); }} />Show simulated test records</label></div>
        {includeTest && <p className="lunchbox-test-note">Includes simulated tests. These are not field observations or verified findings.</p>}
        <p>{devices.filter(device => !device.revoked_at).length} active {includeTest ? 'real or test devices' : 'devices'} · Latest {observations.length} observations · Refreshes every 30 seconds</p>
        {observations.length === 0 ? <div className="lunchbox-empty"><h3>{includeTest ? 'No observations received' : 'No field observations received'}</h3><p>{includeTest ? 'The server has no matching observation records.' : 'Ground verification is pending. Counts and species results will appear here after a deployed LunchBox sends them.'}</p></div> :
          <div className="lunchbox-observations">{observations.map(observation => <article key={observation.id} className="lunchbox-observation">
            <div className="lunchbox-controls"><h3>{observation.device_label}</h3><span className="filter-chip">{observation.is_test ? 'Simulated test' : 'Device observation'} · Unreviewed</span></div>
            <p>Observed {time(observation.observed_at)}<br /><span className="lunchbox-muted">Received {time(observation.received_at)}</span></p>
            <p><strong>{observation.payload.processing_status === 'ok' ? `${observation.payload.mosquito_count} mosquitoes` : 'Count unavailable — processing failed'}</strong> · {basis[observation.payload.count_basis]}</p>
            <p className="lunchbox-muted">Interval: {time(observation.payload.interval_start)} → {time(observation.payload.interval_end)}</p>
            <ul>{observation.payload.species_counts.map(species => <li key={species.label}>Predicted {species.label}: {species.count}{species.confidence !== null ? ` · confidence ${Math.round(species.confidence * 100)}%` : ''}</li>)}</ul>
            <p className="lunchbox-muted">Model: {observation.payload.model_name} / {observation.payload.model_version} · Image: {observation.image_status === 'stored' ? 'Received' : observation.image_status === 'pending' ? 'Awaiting upload' : 'Not supplied'}</p>
          </article>)}</div>}
        <p className="lunchbox-muted">Counts are shown per observation. Repeated frame and trap totals are not added together. Classifications are model predictions; they do not mark a site as verified.</p>
      </section>
    </>}
  </div>;
}
