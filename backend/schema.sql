CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS surveys (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    source text NOT NULL CHECK (source IN ('Drone', 'Field', 'LunchBox', 'Test')),
    captured_at timestamptz,
    is_test boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sites (
    id uuid PRIMARY KEY,
    label text NOT NULL,
    location geography(Point,4326) NOT NULL,
    status text NOT NULL DEFAULT 'Potential' CHECK (status = 'Potential'),
    is_test boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sites_location_idx ON sites USING gist(location);
CREATE TABLE IF NOT EXISTS evidence (
    id uuid PRIMARY KEY,
    site_id uuid NOT NULL REFERENCES sites(id),
    survey_id uuid NOT NULL REFERENCES surveys(id),
    original_name text NOT NULL,
    storage_key text UNIQUE NOT NULL,
    media_type text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    sha256 text NOT NULL,
    note text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
    id uuid PRIMARY KEY,
    action text NOT NULL,
    record_id uuid NOT NULL,
    actor text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
