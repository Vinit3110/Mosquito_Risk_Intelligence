BEGIN;
SELECT pg_advisory_xact_lock(7310421);
CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS campuses (
    id uuid PRIMARY KEY, code text NOT NULL UNIQUE, name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS campus_id uuid REFERENCES campuses(id);
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS capture_date date;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS campus_id uuid REFERENCES campuses(id);
CREATE TABLE IF NOT EXISTS survey_areas (
    id uuid PRIMARY KEY, survey_id uuid NOT NULL REFERENCES surveys(id),
    code text NOT NULL, name text NOT NULL, bounds jsonb NOT NULL,
    source_crs text NOT NULL, UNIQUE(survey_id,code)
);
CREATE TABLE IF NOT EXISTS survey_assets (
    id uuid PRIMARY KEY, area_id uuid NOT NULL REFERENCES survey_areas(id),
    kind text NOT NULL, relative_path text NOT NULL UNIQUE,
    size_bytes bigint NOT NULL, sha256 text NOT NULL,
    verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lunchbox_devices (
    id uuid PRIMARY KEY, campus_id uuid NOT NULL REFERENCES campuses(id),
    label text NOT NULL, token_hash text NOT NULL UNIQUE,
    is_test boolean NOT NULL DEFAULT false, revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lunchbox_deployments (
    id uuid PRIMARY KEY, device_id uuid NOT NULL REFERENCES lunchbox_devices(id),
    area_id uuid REFERENCES survey_areas(id), location geography(Point,4326) NOT NULL,
    coordinate_quality text NOT NULL CHECK(coordinate_quality IN ('GPS','Approximate')),
    starts_at timestamptz NOT NULL, ends_at timestamptz,
    CHECK(ends_at IS NULL OR ends_at > starts_at)
);
CREATE TABLE IF NOT EXISTS lunchbox_observations (
    id uuid PRIMARY KEY, device_id uuid NOT NULL REFERENCES lunchbox_devices(id),
    deployment_id uuid NOT NULL REFERENCES lunchbox_deployments(id),
    event_id uuid NOT NULL, observed_at timestamptz NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    payload jsonb NOT NULL, payload_sha256 text NOT NULL,
    is_test boolean NOT NULL, review_status text NOT NULL DEFAULT 'unreviewed' CHECK(review_status='unreviewed'),
    UNIQUE(device_id,event_id)
);
CREATE INDEX IF NOT EXISTS lunchbox_observations_time_idx ON lunchbox_observations(observed_at DESC, id);
CREATE TABLE IF NOT EXISTS lunchbox_observation_images (
    observation_id uuid PRIMARY KEY REFERENCES lunchbox_observations(id),
    storage_key text NOT NULL UNIQUE, sha256 text NOT NULL, media_type text NOT NULL,
    size_bytes bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON campuses,survey_areas,survey_assets TO mosquito_api;
GRANT SELECT,INSERT ON lunchbox_devices,lunchbox_deployments,lunchbox_observations,lunchbox_observation_images TO mosquito_api;
GRANT UPDATE(revoked_at) ON lunchbox_devices TO mosquito_api;
GRANT UPDATE(ends_at) ON lunchbox_deployments TO mosquito_api;
INSERT INTO schema_migrations(version) VALUES ('002_campus_lunchbox') ON CONFLICT DO NOTHING;
COMMIT;
