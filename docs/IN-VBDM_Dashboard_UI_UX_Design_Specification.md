# IN-VBDM — Dashboard UI/UX Design Specification

> Path update — 22 October 2026: frontend source, public assets, tests, npm manifests, tool configuration and generated frontend folders now live under `frontend/`. Earlier paths and commands below describe their dated checkpoints; run current npm commands from `frontend/`. See [project context](../PROJECT_CONTEXT.md) for current locations.

> Design baseline dated 11 October 2026. This document records intended UX and proposed contracts, not a complete inventory of implemented features. The active map now uses Google Maps, a private backend and `/lunchbox` exist, and lifecycle reconciliation remains pending. Read [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) and [the current roadmap](SYSTEM_ROADMAP_AND_STATUS.md) before implementing the older stack/API/lifecycle proposals below.

**Product:** Mosquito Surveillance and Response Platform  
**Interface:** Surveillance Operations Dashboard  
**Project:** Intelligent Vector-Borne Disease Monitoring System (IN-VBDM)  
**Status:** Working implementation specification  
**Version:** 1.1  
**Updated:** 11 October 2026

## 1. Purpose and guiding workflow

This document turns three supplied UI/UX references into implementable rules for the IN-VBDM dashboard. It is tailored to the operational workflow, not a generic analytics dashboard.

**Potential hotspot detected → evidence reviewed → field verification → intervention assigned and completed → follow-up assessment.**

The first release should prove this loop for one pilot area. Drone and LunchBox integrations may begin with imported or manually entered data; complete device automation is not a prerequisite for proving the workflow.

## 2. Design references and how we apply them

### 2.1 UIUX Studio — Top 7 Rules for Dashboard Design in 2022 With Examples

https://uiux.studio/2023/07/21/top-7-rules-for-dashboard-design-in-2022-with-examples/

**Applied principles:** design around users' tasks; prioritise relevant information; choose charts for the question being answered; use a restrained palette; keep layouts and navigation simple; use filters only when they help users find or interpret information.

**IN-VBDM application:** the overview prioritises sites needing action, verification workload, overdue tasks, and follow-up status. Charts must answer operational questions rather than decorate the page.

### 2.2 Taras Bakusevych / UX Design — 58 Rules for Stunning and Effective User Interface Design

https://uxdesign.cc/58-rules-for-stunning-and-effective-user-interface-design-ea4b93f931f6

The article groups its guidance under empathy, layout, essentialism, guidance, aesthetics, novelty, consistency, and engagement.

**Applied principles:** understand the work context; create hierarchy through layout and typography; remove elements that do not support a task; make the next action predictable; maintain consistent components and labels; provide feedback after user actions.

**IN-VBDM application:** use predictable navigation, consistent status labels, clear primary actions, useful empty states, and a coherent design system. Visual novelty must never make field operations harder to understand.

### 2.3 UX Pilot — Dashboard Design Principles

https://uxpilot.ai/blogs/dashboard-design-principles

**Applied principles:** connect metrics to decisions; match information depth to user responsibilities; establish clear visual hierarchy; choose suitable charts; reveal detail progressively; design loading, empty, error, and no-results states deliberately.

**IN-VBDM application:** the overview shows actionable summaries first; site detail views contain evidence and history. Missing or stale data must not appear equivalent to a zero-risk result.

These articles are guidance, not substitutes for user testing. The workflow, data distinctions, lifecycle, and acceptance criteria below are project-specific adaptations.

## 3. Users and v1 identity approach

### Primary user — health officer / surveillance coordinator

Needs to identify sites requiring attention, review the evidence behind a finding, assign field work, track completion, and assess follow-up results.

### Secondary users

- **Field team member:** views assigned work, records verification and observations, updates task status, and submits completion evidence.
- **Administrator:** manages users and operational configuration.

### Identity for the first demo

Use a small, clearly labelled **demo user selector** with seeded identities and roles if full authentication is not ready. The selected actor must be sent with write requests and stored as an actor ID on verification and audit records. This is a demo-only identity stub, not a security boundary. Before production, derive the actor from a real authenticated session and enforce permissions on the backend; never trust a client-supplied actor ID as proof of identity.

## 4. Information architecture

Primary navigation:

1. **Overview** — actionable summary of current operations.
2. **Sites & Map** — site list, map, filters, and site detail.
3. **Surveys** — survey areas, dates, boundaries, and coverage.
4. **Field Operations** — verification assignments, interventions, and follow-ups.
5. **Reports** — workload, coverage, completion, and outcome summaries.
6. **Administration** — users and configuration, access-controlled.

For the first vertical slice, implement Overview, Sites & Map, and the minimum site-detail and field-operation flows needed to complete the workflow. Unimplemented destinations should be omitted or clearly marked as planned; do not present non-functional pages as finished features.

The application shell should have persistent desktop navigation, a clear page title, contextual filters, and a visible user/account area. Avoid a marketing-style hero layout inside the operations product.

## 5. Overview page

**Primary question: What needs attention now, and what should I do next?**

Recommended content order:

1. Page title and pilot-area context.
2. Relevant survey/date filter, if it applies to the displayed metrics.
3. Three to five actionable summary metrics.
4. A “Needs attention” queue.
5. A compact map/site distribution view.
6. One or two useful operational trends.
7. Recent activity and data-quality warnings, when relevant.

### Candidate metrics

Use only metrics supported by stored records:

- Sites awaiting verification.
- High-priority sites requiring review, if the priority basis is available.
- Open or overdue field tasks.
- Interventions completed during the selected period.
- Sites due for follow-up.

Each metric must have a defined meaning, time window, source, and drill-down destination. Never invent counts or unsupported percentages. Label demonstration/seed data clearly.

### Deterministic v1 “Needs attention” ordering

Until a validated risk-prioritisation model exists, sort actionable work using this transparent rule:

1. **Overdue open tasks**, earliest due date first.
2. **Sites awaiting verification**, oldest first by the time they entered that status.
3. **Sites due for follow-up**, earliest due date first.
4. Remaining items by most recent relevant update.

This is an operational queue, not a scientific mosquito-risk score. Show the reason an item appears in the queue. Do not present this ordering as a prediction of disease risk.

### Charts

- **Line chart:** change over time only when timestamps and sampling are comparable.
- **Bar chart:** compare counts across wards, statuses, or teams.
- **Number card:** show a clearly defined count.
- **Map:** show geographic distribution and spatial context.

Avoid 3D charts and pie charts with many categories. A before/after change alone does not prove an intervention caused the change.

## 6. Sites & Map page

**Primary question: Where are the sites, what evidence exists, and which need review?**

### Layout and accessibility

On desktop, use a map-and-list layout: map as the spatial workspace, a filterable site list alongside it, and site details in a side panel or detail page. On narrow screens, let users switch between map and list rather than squeezing both into unreadable columns.

**The site list is the complete, accessible path to every site.** Map layers/canvas interactions must not be the only way to find or open a record. Every list row must link to the corresponding persistent site detail. Markers are a visual aid; marker status must also be expressed in text in the list and site details. Provide keyboard-accessible list controls, visible focus, and meaningful labels.

### Map behaviour

- Show site markers with text-labelled statuses and a visible legend.
- Selecting a marker opens the same site summary as selecting its list row.
- Display survey boundaries only when boundary data exists.
- Distinguish missing/uncertain coordinates from valid geolocations; never imply inferred coordinates are precise GPS.
- Show attribution for the actual basemap/style and data provider in use.
- The public `tile.openstreetmap.org` tile service may be used for a limited development/demo setup only when its policy is followed; it is not a production tile-hosting solution. Select a suitable production tile/style provider or self-host before production deployment.
- Keep the basemap provider configurable so a provider can be changed without changing site/observation data.

### Initial filters

Keep the first filter set small: lifecycle status, survey/date range when applicable, ward/area when present, and priority when a documented rule exists. Put less-used filters under “More filters.” Provide a visible clear-filters action and a distinct no-results state.

### Site detail content

- Persistent site ID and location/coordinate quality.
- Current lifecycle status and next action.
- Why the site was flagged.
- Evidence timeline with source and timestamp.
- Prediction confidence only when supplied by the model and defined.
- LunchBox deployments and results linked as observations/evidence.
- Field verification records.
- Tasks, intervention records, and follow-up observations.
- Audit history for consequential updates.

## 7. Operational lifecycle and allowed transitions

### Lifecycle principle

LunchBox deployment and trap results are **operations and evidence attached to a site**, not separate site lifecycle statuses in v1. A trap deployment can be recorded as a task/operation, and its capture/result is stored as an observation linked to the site and sampling period. That evidence may inform verification; it does not automatically prove a breeding site.

### Site statuses

- **Detected** — a potential site has been imported or created.
- **Awaiting Verification** — the site is queued for human review/field verification.
- **Verified** — a verification outcome has been recorded; this does not necessarily mean a breeding site is confirmed. The verification result must state what was and was not established.
- **Intervention Assigned** — an actionable intervention/task has been assigned.
- **Intervention Completed** — completion has been recorded with actor, timestamp, and notes/evidence where applicable.
- **Follow-up Due** — the site is due for reassessment.
- **Reassessed** — follow-up observations and the reassessment outcome have been recorded.
- **Unable to Verify** — the team could not establish the verification outcome; record a reason.
- **No Longer Actionable** — a coordinator has closed the site for a recorded reason.
- **Reopened** — a previously closed or reassessed site requires renewed review because of new evidence or changed circumstances.

### Allowed transitions

| From | To | Who may trigger in v1 | Required information |
|---|---|---|---|
| Detected | Awaiting Verification | Coordinator or authorised import process | Site/source record; timestamp |
| Awaiting Verification | Verified | Field team member or coordinator | Verification result, actor, timestamp, evidence references/notes |
| Awaiting Verification | Unable to Verify | Field team member or coordinator | Reason and attempt details |
| Awaiting Verification | No Longer Actionable | Coordinator | Closure reason |
| Unable to Verify | Awaiting Verification | Coordinator | Reassignment/retry reason |
| Unable to Verify | No Longer Actionable | Coordinator | Closure reason |
| Verified | Intervention Assigned | Coordinator | Task/intervention type, owner, due date where applicable |
| Verified | No Longer Actionable | Coordinator | Decision and reason |
| Intervention Assigned | Intervention Completed | Assigned field team member or coordinator | Completion timestamp, outcome, notes/evidence where applicable |
| Intervention Completed | Follow-up Due | Coordinator or configured workflow rule | Follow-up due date or reason for follow-up |
| Follow-up Due | Reassessed | Field team member or coordinator | Follow-up observation(s), reassessment result, actor, timestamp |
| Reassessed | Reopened | Coordinator | New evidence or reason for renewed review |
| No Longer Actionable | Reopened | Coordinator | New evidence or reason for reopening |
| Reopened | Awaiting Verification | Coordinator | New/reviewed evidence and reason |
| Reopened | Verified | Field team member or coordinator | New verification result and evidence |

All state changes must be validated by the backend. Reject invalid transitions with a clear error. Record previous status, new status, actor, timestamp, and reason in the audit history. The UI should offer only actions allowed from the current state and user's role.

## 8. Visual design system

### Visual direction

A calm, professional, map-centred operations interface. Visual emphasis should communicate urgency and hierarchy, not decorate every card.

### Colour and status

Define semantic tokens for brand/action, neutral surfaces/text, borders, success, warning, danger, and informational states. Status colour must always be paired with a text label; never use colour alone. Check contrast in standard and any future dark theme.

### Typography and spacing

Use a legible UI typeface and consistent heading, body, label, and metadata styles. Keep critical data readable; avoid tiny all-caps labels. Use a consistent 4- or 8-pixel spacing rhythm, aligned grids, and whitespace to group related information. Avoid unnecessary nested cards, heavy shadows, and excessive borders.

### Reusable components

Build shared components for the application shell, navigation, page header, filters, metric card, status badge, site list row/table, map legend, evidence timeline, task/intervention form, loading/empty/error/no-results states, confirmation dialog, and notifications.

Use a consistent primary-button treatment and a clear hierarchy for secondary and destructive actions.

## 9. Responsive design

- **Desktop:** optimise for reviewing multiple sites and assigning work; keep map, list, and status context visible when space allows.
- **Tablet:** adapt the map/list layout and keep essential filters accessible.
- **Mobile:** prioritise assigned tasks, site details, verification, and intervention updates. Use touch-friendly controls and short forms.

**Offline support is deferred from v1.** The first release requires a network connection for API-backed reads and writes. Do not imply that a responsive UI is offline-capable. If field connectivity becomes a requirement, plan offline storage, queued writes, conflict handling, and sync as a separate feature.

## 10. Accessibility and usability

Minimum checks:

- Semantic headings, landmarks, and form labels.
- Keyboard access to navigation, dialogs, filters, and actions.
- Visible keyboard focus.
- Accessible names for icon-only buttons.
- Text labels alongside status colours and chart encodings.
- Sufficient contrast for text, controls, and focus indicators.
- Errors described in text and associated with relevant fields.
- No critical information available only on hover.
- Charts with titles and accessible summaries or equivalent data views.
- Respect reduced-motion preferences for non-essential animation.

Use WCAG 2.2 AA as a target for contrast and interaction accessibility. Automated checks do not establish full conformance.

## 11. Loading, empty, error, and data-quality states

- **Loading:** use restrained skeletons/progress indicators and preserve layout.
- **Empty:** explain why no records exist and offer a useful next step. Do not invent metrics.
- **Error:** use plain language, retain user input where feasible, and offer retry/recovery. Do not expose stack traces.
- **No results:** distinguish “no sites match these filters” from “there is no site data.”
- **Stale/incomplete data:** show source timestamps and relevant ingestion, metadata, or coordinate-quality warnings. Missing observations are not proof of no risk.

## 12. Data integrity and scientific communication

- Drone findings indicate potential environmental risk; they do not prove breeding or disease transmission.
- LunchBox results are local observations tied to a location and sampling period.
- AI output is not ground truth.
- Prioritisation must be explainable and support human review.
- Before/after differences do not by themselves prove that an intervention caused the change.

Preserve available source, timestamp, site, survey/device identifier, and data-quality status for each observation. Do not fabricate confidence values, GPS precision, sampling history, or intervention outcomes.

## 13. Initial data model

This is a v1 logical model; fields can be refined during implementation. Use stable IDs and timestamps. PostgreSQL is the source of truth; PostGIS stores/query spatial geometry. Site geometry and observations are served to the map through the API as GeoJSON.

### Site

- `id` (stable ID), `name`/`label` (optional), `status`, `priority_reason` (optional), `ward_id` (optional).
- `location`/geometry (nullable when location is unknown), `coordinate_quality` (e.g. GPS, georeferenced, approximate, unknown).
- `created_at`, `updated_at`, `status_changed_at`, `created_by`/source reference.
- Relationships: many observations, verifications, tasks/interventions, follow-ups, and audit events.

### Observation

- `id`, `site_id`, `source_type` (drone, LunchBox, field, import, other), `observed_at`, `recorded_at`.
- `geometry`/location when available, `source_ref` (image/trap/device/file), `observation_type`, `result/summary`, `confidence` only if supplied, `metadata`, `data_quality_status`, `recorded_by` when user-entered.
- Relationships: belongs to one site; may be referenced by a verification or follow-up.

### Verification

- `id`, `site_id`, `result` (verified outcome / unable to verify / other defined outcome), `verified_at`, `actor_id`, `notes`, `reason`, `evidence_observation_ids`.
- Relationships: belongs to a site; references the observations considered. Verification history is append-oriented; corrections should be auditable.

### Task / Intervention

Keep assigned work separate from the site lifecycle status. A task represents work to be done; an intervention record describes the action actually performed.

- **Task:** `id`, `site_id`, `task_type` (verification, trap deployment/retrieval, intervention, follow-up), `status`, `assignee_id`/team, `created_by`, `created_at`, `due_at`, `completed_at`, `notes`.
- **Intervention:** `id`, `site_id`, `task_id` (optional), `action_type`, `performed_at`, `performed_by`, `outcome`, `notes`, `evidence_observation_ids`.
- Relationships: a site may have many tasks and intervention records; a task may result in an intervention record.

### Follow-up

- `id`, `site_id`, `due_at`, `completed_at`, `actor_id`, `result`, `notes`, `observation_ids`, `created_at`.
- Relationships: belongs to a site and links to the observations used for reassessment.

### AuditEvent

- `id`, `entity_type`, `entity_id`, `event_type`, `previous_value`/status (where applicable), `new_value`/status (where applicable), `actor_id`, `occurred_at`, `reason`, `metadata`.
- Records consequential changes, especially lifecycle transitions and assignment/completion updates. The audit log must be written server-side and must not be editable from the frontend.

### Relationships at a glance

- One **Site** has many **Observations**, **Verifications**, **Tasks**, **Interventions**, **Follow-ups**, and **AuditEvents**.
- A **Verification** can cite multiple **Observations**.
- A **Task** can be linked to an **Intervention**.
- A **Follow-up** can cite multiple **Observations**.
- A **LunchBox deployment** is represented as a task/operation; each capture/result is an Observation linked to the site and sampling period.

## 14. Initial API contract

Use a versioned REST API. Exact schemas can be refined with backend implementation, but frontend and backend should agree on these shapes and behaviours before integration.

### Sites and GeoJSON

- `GET /api/v1/sites` — paginated site list; supports filters such as `status`, `ward_id`, `survey_id`, and date range where meaningful.
- `GET /api/v1/sites/{site_id}` — one site with current status and summary fields.
- `GET /api/v1/sites.geojson?bbox=...&status=...` — GeoJSON `FeatureCollection` for mappable sites. Each feature should include a stable site ID and display properties such as status, label, and priority reason. Features with unknown geometry should be returned through the list/detail API, not given fabricated coordinates.
- `GET /api/v1/sites/{site_id}/observations` — evidence timeline.
- `GET /api/v1/sites/{site_id}/history` — lifecycle/audit history suitable for display, subject to permissions.

### Writes

- `POST /api/v1/sites/{site_id}/verifications` — create a verification record and requested lifecycle transition.
- `PATCH /api/v1/verifications/{verification_id}` — amend permitted fields with an audit event; preserve correction history.
- `POST /api/v1/sites/{site_id}/tasks` — create/assign a task.
- `PATCH /api/v1/tasks/{task_id}` — update assignment/status/completion fields and record an audit event.
- `POST /api/v1/sites/{site_id}/follow-ups` — record follow-up/reassessment and linked observations.

Writes should return the persisted record and resulting site status. Use consistent error responses for validation errors, forbidden transitions, missing records, and server failures. Backend validation is authoritative. Write requests must identify the authenticated actor in production; the v1 demo selector is only a development stand-in.

### GeoJSON conventions

- Use standard GeoJSON coordinate order: longitude, latitude.
- Use stable IDs in feature properties.
- Include only fields needed for map rendering and selection; fetch full detail separately.
- Respect bounding-box and status filters to avoid returning unnecessarily large collections.
- Keep spatial geometry in PostGIS and expose it through API responses, never direct database access from the browser.

## 15. Performance and implementation stack

### Chosen v1 stack

- **Frontend:** React + TypeScript + Vite.
- **Styling:** Tailwind CSS.
- **UI components:** shadcn/ui, selectively used and customised to fit the product.
- **Maps:** MapLibre GL JS through `react-map-gl`’s MapLibre entry point (`react-map-gl/maplibre`), with `maplibre-gl` installed as the rendering engine.
- **Charts:** Recharts, only for charts that answer a real operational question.
- **Routing:** React Router.
- **API data fetching:** TanStack Query when server-state needs justify it; simple fetch wrappers are acceptable for the first small slice.
- **Backend:** Python + FastAPI + Pydantic.
- **Persistence/spatial queries:** PostgreSQL + PostGIS, SQLAlchemy, Alembic migrations.
- **Packaging/local orchestration:** Docker + Docker Compose.
- **Version control and collaboration:** GitHub.
- **Testing:** Pytest for backend; Playwright for end-to-end browser workflows.

### Why MapLibre is the v1 map choice

MapLibre is the chosen v1 renderer because the project owner has limited confidence with Leaflet and prefers MapLibre. That familiarity preference is a valid delivery consideration: the map is a core workspace, and implementation confidence matters under a tight deadline. MapLibre GL JS uses WebGL and supports vector styles and richly styled geospatial layers. The initial implementation should still remain restrained: site markers, survey boundaries where available, GeoJSON features from the API, selection, and a clear legend. Do not introduce advanced layers or custom rendering unless the workflow needs them.

Use `react-map-gl/maplibre` as the React integration entry point and `maplibre-gl` as the underlying renderer. Keep map rendering separate from site data access: fetch site features from the API as GeoJSON generated from PostGIS, and fetch full site details from the site detail endpoint. Preserve the accessible site list as the complete alternative to map interaction because canvas-rendered map features are not a substitute for keyboard-accessible records.

### Basemap/style provider decision

MapLibre is a renderer, not a tile/style hosting service. Configure a suitable style URL from a selected provider or a self-hosted service. Show attribution for the actual basemap/style and data providers used. Do not treat the public OpenStreetMap standard tile servers as production infrastructure; any development/demo use must follow their tile usage policy. Before production, document provider terms, attribution requirements, usage limits, cost, and availability expectations. Keep style-provider configuration outside site/observation data and reusable map components so it can be changed without a data-model migration.

### Engineering conventions

- Separate page components, shared UI, API access, and domain types.
- Centralise lifecycle statuses and transition rules; do not duplicate strings across pages.
- Treat the backend as the source of truth for persistent state and allowed transitions.
- Use stable site IDs, not list positions, as identity.
- Make loading/error states explicit and preserve form input on recoverable failures.
- Avoid microservices, Kafka, and complex streaming infrastructure until actual volume/reliability requirements justify them.
- Offline support is out of scope for v1.

## 16. Initial frontend scope and implementation order

### Phase 1 — Foundation

- Inspect the existing repository before changing files.
- Establish the Vite React TypeScript application structure and design tokens.
- Build the application shell and navigation.
- Define domain types, lifecycle states, and reusable buttons, inputs, badges, cards, and page headers.
- Add Docker Compose for the agreed local services when their configuration is ready.

### Phase 2 — Overview

- Show only metrics supported by the current dataset.
- Build the deterministic “Needs attention” queue.
- Add a chart only where it answers a real question.
- Implement loading, empty, error, and no-results states.

### Phase 3 — Sites & Map

- Build the accessible site list and map/list layout.
- Add markers, text-labelled status legend, and minimal filters.
- Fetch map features as GeoJSON from the backend API.
- Link every list row and marker to a persistent site detail view.
- Handle missing coordinates and no-result states.

### Phase 4 — Operational workflow

- Show evidence and site history.
- Record verification and LunchBox/field observations.
- Assign/update tasks and record interventions.
- Add follow-up observations and reassessment.
- Confirm that updates persist after refresh through the API.

### Phase 5 — Validation and reporting

- Test the complete operational loop.
- Validate all visible navigation and actions.
- Check representative responsive layouts and keyboard access.
- Confirm demo data is labelled and unsupported scientific claims are absent.
- Add the simplest useful operational report if time permits.

Prioritise a small, reliable end-to-end demonstration. Defer advanced analytics, elaborate role-specific dashboards, automated device integrations, offline support, and predictive risk modelling unless required for the agreed demonstration.

## 17. Acceptance criteria

### Must-have for the demo

- [ ] A user can identify sites needing attention from the overview.
- [ ] The site list and map point to the same persistent site records.
- [ ] A user can inspect evidence and its source.
- [ ] AI predictions and field-confirmed findings are distinct.
- [ ] A user can record verification and actor identity.
- [ ] A user can assign/update a task or intervention.
- [ ] A user can add a follow-up and inspect site history.
- [ ] Changes persist after refresh through the API/database.
- [ ] Backend enforces allowed lifecycle transitions and records audit events.
- [ ] Loading, empty, error, and no-results states do not misrepresent missing data.
- [ ] Demo/seed data is clearly labelled; no unsupported counts or scientific claims are shown.

### Should-have for the demo

- [ ] Map/list layout remains usable at mobile and tablet widths.
- [ ] Core navigation and workflow can be operated with a keyboard.
- [ ] Visible focus, text-labelled statuses, and accessible control names are present.
- [ ] Contrast and interaction checks are reviewed against WCAG 2.2 AA targets.
- [ ] Charts include clear titles and accessible summaries.
- [ ] Playwright covers the core end-to-end workflow.

Offline operation, full production authentication, comprehensive WCAG conformance auditing, and automated device integration are not v1 acceptance requirements unless the stakeholder explicitly changes scope.

## 18. Design review questions

For every screen, ask:

1. What decision or task does it support?
2. Can users identify the most important information quickly?
3. Is the next action obvious?
4. Can users distinguish prediction, observation, verification, intervention, and follow-up?
5. Does each chart answer a real question?
6. What happens when data is missing, stale, empty, or unavailable?
7. Can the relevant task be completed on a phone?
8. Is the screen consistent, accessible, and responsive?
9. Can the task be completed with fewer confusing steps?
10. Does the screen support the operational loop?

A visually attractive screen is not accepted as successful unless users can understand it and complete its intended task.

## 19. References

1. UIUX Studio. **Top 7 Rules For Dashboard Design In 2022 With Examples.** https://uiux.studio/2023/07/21/top-7-rules-for-dashboard-design-in-2022-with-examples/
2. Taras Bakusevych, UX Design. **58 Rules for Stunning and Effective User Interface Design.** https://uxdesign.cc/58-rules-for-stunning-and-effective-user-interface-design-ea4b93f931f6
3. UX Pilot. **Dashboard Design Principles.** https://uxpilot.ai/blogs/dashboard-design-principles
4. MapLibre GL JS documentation (for the map-library trade-off): https://maplibre.org/maplibre-gl-js/docs/
5. react-map-gl documentation (MapLibre entry point): https://visgl.github.io/react-map-gl/docs/get-started
6. OpenStreetMap Foundation. **Tile Usage Policy.** https://operations.osmfoundation.org/policies/tiles/

The three UI/UX articles inform the design principles. The lifecycle, data model, API contract, and acceptance criteria are project-specific design decisions. Map-library and tile-provider notes are technical implementation guidance and should be revisited if the product's geospatial requirements change.
