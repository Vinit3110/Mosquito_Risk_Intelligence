# Google Maps configuration

Copy `.env.example` to `.env.local`, add your browser API key, and restart Vite. Production environment values must be set before building because Vite embeds `VITE_*` values in the client bundle. Do not put server secrets in them. `.env.local` and build outputs are ignored.

| Variable | Purpose |
| --- | --- |
| `VITE_GOOGLE_MAPS_API_KEY` | Required browser Maps JavaScript API key |
| `VITE_GOOGLE_MAPS_MAP_ID` | JavaScript map ID for advanced markers; defaults to `DEMO_MAP_ID` for development |
| `VITE_WARDS_GEOJSON_URL` | Optional WGS84 Polygon/MultiPolygon FeatureCollection override; empty uses bundled manually traced Ward 7 |
| `VITE_SURVEYS_METADATA_URL` | Optional JSON array override; empty uses bundled real first-flight survey metadata |

For a production key, create a Google Cloud project, attach billing, enable **Maps JavaScript API**, and create a JavaScript map ID. Restrict the key to your website HTTP referrers and to Maps JavaScript API. Include the exact development hosts you use, such as `http://localhost:5173/*` and `http://127.0.0.1:5173/*`, plus the production HTTPS origin. Configure quotas and billing alerts in Cloud Console. See [Google's setup guide](https://developers.google.com/maps/documentation/javascript/get-api-key), [advanced markers setup](https://developers.google.com/maps/documentation/javascript/advanced-markers/start), and [billing guidance](https://developers.google.com/maps/documentation/javascript/usage-and-billing).

The app uses the official loader v2, dynamically importing maps and advanced markers with the quarterly API channel. Missing keys do not load a substitute map. Script/network failure, authentication failure and a 20-second readiness timeout produce an actionable error with a reload option. A valid key is required to verify imagery, navigation and marker rendering.

Search currently uses site IDs, labels, demo areas, seven approximate local destinations, and supplied ward names/IDs. It does not call Places or Geocoding and needs no additional Google API. Add a separate search provider later if municipal staff need arbitrary address lookup.

Google's native attribution remains inside the map. The custom panels leave the bottom strip free. Do not hide attribution or prefetch/cache Google basemap imagery. Before public deployment, publish application Terms of Use and Privacy Policy incorporating the required Google references. Review the [Maps JavaScript API policies](https://developers.google.com/maps/documentation/javascript/policies). Own surveillance records, ward geometry and orthophotos remain independent of Google; caching your own assets is a separate decision.

Run `npm run dev`, visit `/sites`, and verify Streets/Satellite, drag/zoom, reset to Nashik, marker clicks, and selected-site focus with your restricted key. The original migration had no key. The subsequent Ward 7 integration used the existing local key for a separate live browser check; credentials were not changed or exposed.

Ward data defaults to `public/data/ward_07.geojson` through the existing loading pipeline. Set `VITE_WARDS_GEOJSON_URL` to another same-origin or CORS-enabled collection to replace it, and restart/rebuild. The bundled dataset contains **only Ward 7**, manually traced and not municipally verified. `ward_id`/`ward_name` are normalized to `id`/`name` while retaining the original properties and coordinates.
