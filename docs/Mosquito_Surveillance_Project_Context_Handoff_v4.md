# Mosquito Surveillance Project — Context Handoff (v4)
**Project:** IN-VBDM — Intelligent Vector-Borne Disease Monitoring  
**Organization:** Arsha Consultancy (project documents use “Arsha Consultants LLC”)  
**Region:** Nashik, Maharashtra, India  
**Prepared:** 9 October 2026  
**Last updated:** 11 October 2026 — reconciled current aerial/LunchBox status, recorded the four-location survey scope, and checked the supplied processing reports.  
**Purpose:** Preserve durable project context for future conversations and team handoffs.

---

## 1. Executive summary

The project aims to support data-driven mosquito surveillance by combining:

1. **Aerial intelligence:** Drone-captured, georeferenced imagery to produce an orthomosaic and identify environmental indicators associated with mosquito breeding.
2. **Smart trap intelligence:** The LunchBox trap concept, with image-capture capability and AI-assisted mosquito detection/species classification.
3. **Future integration:** Geospatially organized observations and field validation to support surveillance and prioritization.

These are complementary workstreams, not interchangeable evidence. Aerial imagery can identify potential environmental risks; a trap can provide evidence of mosquito presence. Neither alone proves an active breeding site or disease transmission.

**Current evidence baseline:** Four sets of photogrammetry outputs for Areas A–D have been generated and technically inspected, as documented in Section 13. The exports are readable and their horizontal georeferencing is internally consistent; visible defects, independent accuracy, and coverage of the selected locations still require acceptance checks. The project owner clarified on 11 October 2026 that these were four selected locations within the 154,537.73 m² campus, rather than a survey of the whole campus. The current Ground/LunchBox team proposal uses a single Raspberry Pi 5 with peripheral subsystems, as described in Section 12; the earlier master/slave concept is historical exploration.

**Important status caveat:** Existing aerial outputs do not establish final survey suitability. The available evidence also does not establish a working LunchBox prototype, a trained and validated mosquito model/species classifier, a completed integrated dashboard, or a finished end-to-end system.

## 2. Original goal and scope

The broader goal is to move toward proactive, evidence-based mosquito surveillance rather than relying only on reactive control.

### Aerial workstream
- Capture high-quality aerial still photographs over a defined survey area.
- Preserve original images and flight logs.
- Generate a georeferenced orthomosaic using photogrammetry (WebODM was used/explored).
- Enable visual inspection, geospatial analysis, and later computer-vision detection of environmental risk indicators.
- Candidate indicators listed in the project requirements: stagnant water, drains, discarded containers, rooftop tanks, construction areas, and other environmental features.
- Use field validation to check model outputs and risk interpretations.

### Smart trap workstream
- Explore a LunchBox trap with image-capture capability.
- In earlier project conversations, a master/slave arrangement and ESP32/Raspberry Pi Zero options were explored. This is historical discussion, not a design described in the three Ground/LunchBox PDFs reviewed later.
- The Ground/LunchBox PDFs instead propose a single Raspberry Pi 5 as the central controller/edge-computing unit, with peripheral sensing, capture, power, and 4G/GNSS modules.
- Intended AI direction: detect mosquitoes and investigate species classification.
- Species-specific attraction and trap design matter; a single generic trap should not be assumed to attract or capture all mosquito species equally well.

## 3. Aerial survey: recovered documented requirements

A document named `IN-VBDM_Drone_Data_Capture_Requirements.docx` (dated 4 August 2026) defines the aerial data-capture objective and project area. Several near-duplicate versions were found; retain one canonical, final version and archive duplicates rather than treating each as separate progress.

Documented campus survey area (overall project extent):
- MVP’s Karmaveer Adv. Baburao Ganpatrao College campus, Nashik, Maharashtra.
- Area: **154,537.73 m² (15.45 hectares / 0.155 km²)**.
- Perimeter: **1,586.43 m**.
- Reference datum: **WGS84**.

**Actual capture scope — project-owner clarification, 11 October 2026:** The campus area of **154,537.73 m² is correct**. The whole campus was not surveyed; **four specific locations within that campus area were selected for capture**, corresponding to Areas A–D in the photogrammetry review. The campus extent remains the broader survey specification, while this capture covered the four selected locations. Whole-campus completion was not the scope of this capture and must not be inferred from the four datasets.

The owner clarification establishes the relationship between the campus and Areas A–D. It does not supply the four selected-location boundary polygons or required-feature lists. Those are still needed to check whether each selected location was completely captured and to compare its intended extent with the exported masks. A campus boundary/area in the requirements is separate from the selected-location boundaries needed for this acceptance check.

Documented mission requirements:
- Automated photogrammetric grid flight.
- RGB camera of at least 20 MP.
- Full-resolution still photographs are the primary data; video is supplementary and must not replace still imagery.
- Nadir camera orientation (-90°).
- Expected deliverables: original images, flight logs, and a georeferenced orthomosaic.
- Intended downstream uses: orthomosaic generation, computer vision, environmental feature detection, visual inspection, geospatial analysis, future AI training, and field validation.

The requirements document establishes the broader campus survey specification. Section 13 establishes the existence and technical inspection of processed outputs for the four selected locations, but neither establishes whole-campus coverage, complete coverage of each selected location, or delivery of the original photographs and flight logs.

## 4. Drone and data-collection exploration

- Drone discussed/used: **DJI Air 2S**, 20 MP camera.
- Aerial collection was explored around approximately 30 m altitude, with grid flight and image overlap.
- Planning assumptions discussed included roughly 70% overlap, a flight speed around 3–5 m/s, and capture intervals around two seconds in an earlier exploratory setup. Treat these as planning assumptions, not verified final settings.
- The later requirements documents emphasize automated waypoint/grid capture and full-resolution still images.
- Drone footage/images were reported to lack GPS metadata in at least one capture workflow. This creates a georeferencing and photogrammetry risk that needs explicit investigation.
- WebODM was used/explored for processing; disk-space consumption was a practical issue.
- ExifTool was discussed for extracting/inspecting EXIF metadata from DNG files. A complete audit of original-image metadata and resolution of the earlier GPS issue remain unverified. The later output review in Section 13 does establish readable georeferenced orthophotos/DSMs and internally consistent horizontal coordinates for Areas A–D; this does not establish their independent positional accuracy or how the original metadata issue was handled.

### Key lesson
Keep originals, flight logs, metadata reports, processing settings, WebODM logs, and the final orthomosaic together. A visually stitched map is not sufficient evidence of geospatial accuracy; verify coordinate reference system, georeferencing, alignment, coverage, and control/check points where possible.

## 5. LunchBox smart-trap proposal and historical exploration

Current Ground/LunchBox team proposal (see Section 12):
- Use a single Raspberry Pi 5 as the controller/edge-computing unit, with peripheral entry sensing, blower transfer, camera/illumination, optional acoustic sensing, local storage, 4G/GNSS, health monitoring, and solar/battery power subsystems.
- Start with image-based mosquito detection/classification; validate physical capture and usable image quality before claiming species-level performance. Acoustic analysis or multimodal fusion is a later proposal.
- Treat the architecture and candidate components as proposed, with implementation and performance still unverified.

Historical exploration:
- Earlier conversations explored a master/slave system, with slave units capturing images and a master handling processing; ESP32 and Raspberry Pi Zero were considered, with Wi-Fi preferred. This is separate from the current single-Pi-5 team proposal and must not be attributed to the three Ground/LunchBox PDFs.

Important open questions:
- Which mosquito species are target species, and what are the trap’s capture/attraction mechanisms for each?
- What camera, lens, lighting, background, and image resolution produce reliably classifiable images?
- What are the compute, power, storage, network, and maintenance requirements?
- Can the proposed on-device classification meet accuracy, latency, memory, thermal, and power requirements on the Raspberry Pi 5, and what processing, if any, should be offloaded?
- How will labels be confirmed by a reliable human/expert process?
- How will trap observations be time-stamped and linked to location and environmental context?

Do not describe the trap hardware as finalized or deployed at scale unless new evidence confirms that status.

## 6. AI and computer-vision direction

- YOLOv8/Ultralytics was discussed for detection/model training.
- Two separate model problems should remain distinct:
  1. **Aerial environmental feature detection** (e.g., standing water or containers).
  2. **Mosquito detection/species classification** from trap images.
- No reliable training metrics, confusion matrix, validated species classifier, or final mosquito model artifact were found in the recovered context. Do not claim model accuracy or training completion without evidence.
- A species classifier requires a representative, correctly labelled dataset and evaluation across different lighting, angles, backgrounds, species, and capture conditions. Detection of a mosquito is not the same as reliable species identification.

## 7. Evidence recovered and how to preserve it

### Strongest recovered documentary evidence
- `IN-VBDM_Drone_Data_Capture_Requirements.docx` — formal objective, survey area, mission requirements, and expected deliverables.
- `Drone_Data_Capture_Requirements_Air2S_Verified.docx` — a DJI Air 2S-specific requirements/verification draft was found in the Library.
- `Drone_Data_Capture_Requirements_Revisions_Draft.docx` — earlier/revision material, useful for change history but not necessarily canonical.

Multiple versions of the IN-VBDM requirements document exist with near-identical contents. Select the latest approved copy after checking revision history; do not preserve all duplicate exports as separate evidence.

### Evidence to collect from the working environment
1. Original drone photographs (including DNG/JPEG files) and folder inventory.
2. Flight logs and mission-plan export.
3. EXIF/ExifTool report showing GPS, timestamps, camera parameters, and missing fields.
4. Preserve the existing Area A–D orthophoto/DSM/point-cloud/mesh/camera-record exports and their verification evidence; collect processing settings/logs and WebODM project/interface records if available to establish provenance and reproducibility.
5. Selected-location boundaries and required-feature lists for Areas A–D, plus screenshots or field notes showing capture conditions and coverage within those locations.
6. LunchBox hardware photographs, wiring, component list, firmware, and image samples.
7. Dataset manifest, class definitions, annotation files, and train/validation/test split.
8. Model weights, training configuration, logs, metrics, confusion matrix, and representative failure cases.
9. A short decision log separating tested facts from hypotheses and proposed designs.

Keep raw data immutable. Put processed data and annotations in separate directories, and record versions/checksums for key deliverables.

## 8. Current status — evidence-calibrated

| Workstream | Status supported by available context | What remains unverified |
|---|---|---|
| Project framing | Defined: aerial risk mapping plus smart-trap intelligence | Final product requirements and acceptance criteria |
| Survey specification and actual scope | Documented campus extent: 154,537.73 m²; owner confirms this capture selected four locations within the campus (Areas A–D), rather than the whole campus | Selected-location boundaries, required features, and completion against that scope |
| Drone platform | DJI Air 2S discussed and platform-specific planning documented | Final flight settings and full mission evidence |
| Image metadata | Missing GPS metadata was reported for a capture set; ExifTool discussed; later exports have internally consistent horizontal georeferencing | Which original files lack GPS, how exports were positioned, and whether the earlier GPS issue was resolved |
| Photogrammetry | Four output sets exist and were technically inspected; readable orthophotos/DSMs/clouds/meshes/camera records; EPSG:32643 horizontal outputs; reports identify ODX 3.8.3 (Section 13) | Independent accuracy, selected-location coverage, area discrepancies, defect acceptance, vertical reference, model placement, and processing reproducibility; WebODM interface use for these exports remains unverified |
| LunchBox architecture | Current team proposal: single Raspberry Pi 5 with peripheral capture/sensing, local storage, 4G/GNSS, health and power subsystems (Section 12); master/slave is historical exploration | Built prototype, final hardware/firmware, capture/transfer performance, usable images, measured power, and field reliability |
| AI models | YOLOv8/Ultralytics discussed as a candidate approach | Final dataset, training runs, metrics, validated models |
| Integrated surveillance output | Desired end state understood | Working end-to-end pipeline/dashboard and field validation |

**Overall assessment:** The aerial workstream has progressed to generated outputs and a documented technical review for four selected campus locations. Its next step is acceptance against the selected-location scope and intended use, together with provenance and reproducibility checks. The LunchBox workstream has a concrete single-Pi-5 design proposal that now needs prototype measurements. AI models and the integrated platform remain unverified. Preserve this baseline and add measured evidence as validation proceeds.

## 9. Priority next steps

1. **Freeze the evidence baseline.** Create a single project directory with `docs/`, `raw_drone/`, `flight_logs/`, `metadata_reports/`, `webodm/`, `trap_images/`, `datasets/`, `models/`, `field_validation/`, and `decisions/`.
2. **Choose the canonical requirements document and record capture scope.** Resolve duplicate versions, keep a short change log, and retain the correct 154,537.73 m² campus extent alongside the decision to capture four selected locations. Obtain a boundary and required-feature list for each of Areas A–D.
3. **Audit the original drone capture and provenance.** The export/camera-record counts were checked in Section 13. Inventory the original photographs and flight logs, inspect their GPS/time/camera metadata, record missing fields, and establish how the existing exports were georeferenced and processed.
4. **Complete photogrammetry acceptance.** Preserve the existing readable, horizontally georeferenced outputs and technical review. Validate independent accuracy, compare valid masks with the four selected-location boundaries, reconcile report/export area figures, review defects, and confirm vertical reference and GLB placement. Whole-campus coverage is not the acceptance target for this capture.
5. **Separate the AI tasks.** Define distinct labels and datasets for aerial environmental features versus mosquito/trap images.
6. **Validate the current LunchBox proposal.** Follow the Section 12 prototype milestones: prove the funnel/IR/blower/chamber capture path, then capture controlled, human-verified specimens and assess usable image quality before species classification. Benchmark the proposed Raspberry Pi 5 pipeline and measure power and reliability.
7. **Set measurable acceptance criteria.** Define what counts as a successful survey, usable image, valid orthomosaic, functioning trap, and acceptable model performance.
8. **Record all future experiments.** For each experiment: date, hypothesis, setup, data, result, failure modes, and next decision.

## 10. Rules for future project discussions

- Distinguish **confirmed**, **tested**, **planned**, and **unknown**.
- Do not infer completion from a requirements document or design discussion.
- Do not merge aerial environmental detection with trap-based mosquito species classification into one model without a deliberate technical rationale.
- Preserve original data; never overwrite raw imagery with processed versions.
- Record why decisions were made, not just which tool was selected.
- Prefer one reproducible end-to-end slice over many unvalidated components.

## 11. Handoff prompt for a future assistant

> You are helping continue the IN-VBDM (Intelligent Vector-Borne Disease Monitoring) project for Arsha Consultancy in Nashik, Maharashtra. The project connects drone-based environmental-risk mapping with LunchBox mosquito observations and future field/platform integration. The documented campus extent is correctly 154,537.73 m²; the project owner clarified on 11 October 2026 that this capture surveyed four selected campus locations, Areas A–D, rather than the whole campus. The requirements specify WGS84, nadir full-resolution still images, originals, flight logs, and a georeferenced orthomosaic. The 10 October output review establishes four readable photogrammetry output sets, all listed images reconstructed, and internally consistent EPSG:32643 horizontal georeferencing. Reports identify ODX 3.8.3. Independent accuracy, complete coverage of each selected location, report/export area reconciliation, defect acceptance, vertical reference, GLB placement, and raw-data/processing provenance remain unresolved. DJI Air 2S and WebODM are historical project context; their specific use for these exports and resolution of the earlier GPS issue are not verified by the export review. The current Ground/LunchBox team proposal uses a single Raspberry Pi 5 with sensing/capture, local storage, 4G/GNSS, health monitoring, and solar/battery power. ESP32/Pi Zero, Wi-Fi, and master/slave arrangements belong to earlier exploration. The proposed trap, AI models, and integrated platform are not demonstrated as complete. Use Sections 12–13 as the current baseline; validate the four selected-location outputs and the trap prototype rather than reopening output-existence questions. Keep aerial feature detection and trap-based mosquito classification separate, record measured results, and state uncertainty explicitly.


---

## 12. Ground/LunchBox team reference documents — proposed design, not verified implementation

**Source-provenance correction:** The three PDFs do **not** mention a master/slave architecture, ESP32, Raspberry Pi Zero, or Wi-Fi-based slave traps in the reviewed design. They propose a single Raspberry Pi 5 as the main controller/edge-computing platform, with separate sensor, capture, communication, and power subsystems. Any master/slave language elsewhere in this handoff refers only to earlier project discussions and is not evidence of what these PDFs propose.


Three PDFs were shared by the Ground/LunchBox team. They should be treated as **design proposals and research notes** describing the team's current thinking—not as proof that the proposed hardware exists, works, or has passed testing.

### Documents reviewed

1. **Design and Development of a Smart Mosquito Surveillance Box** — 15 pages. Proposes the enclosure, collection path, sensing, edge processing, communications, power, software workflow, and validation plan.
2. **Smart Mosquito Surveillance Lunch Box: Health Monitoring, Fault Detection, Functional Status and Predictive Maintenance Architecture** — 8 pages. Proposes subsystem diagnostics, health states, service heartbeats, watchdog recovery, energy-aware operation, and health reporting.
3. **Power Budget, Solar Sizing and Energy-Management Design** — 4 pages. Proposes operating modes, a solar/battery strategy, estimated energy consumption, and power measurements to perform before procurement.

The main design report explicitly labels its architecture as proposed and says final values require prototype validation. The health-monitoring report is likewise an architecture proposal. The power addendum calls its component values engineering estimates, not measured values.

### 12.1 Planned LunchBox operating flow

The team's intended end-to-end sequence can be represented as follows:

1. **Attract:** UV light plus a proposed odour/CO₂ attractant concept draws mosquitoes toward the enclosure. Entry vents are planned on all four sides.
2. **Guide:** A tapered funnel narrows the path toward an infrared (IR) break-beam sensor.
3. **Detect an entry event:** The IR beam records an object crossing the sensing plane. This is an event/counting trigger, not proof that the object is a mosquito and not a species classifier.
4. **Transfer by suction:** A proposed 12 V centrifugal blower moves the insect toward the collection chamber. The precise timing and control sequence still need to be proven experimentally.
5. **Collect:** The insect enters a larger detachable observation chamber intended to be removable for inspection and cleaning.
6. **Acquire observations:** An internal camera (proposed 16 MP Sony IMX519-class module) with white LED illumination captures images. An internal I²S MEMS microphone (INMP441-class) is proposed for wingbeat/audio sampling.
7. **Process at the edge:** A Raspberry Pi 5 (2 GB proposed) orchestrates sensors, image/audio acquisition, inference, event records, health monitoring, and communications. The design suggests starting with image-based classification and adding acoustic analysis or multimodal fusion later.
8. **Store locally:** Save a time-stamped event with a unique event ID and associated image/audio/features and diagnostic information. MicroSD plus SQLite/files is proposed.
9. **Locate and transmit:** A proposed 4G/LTE + GNSS subsystem supplies remote connectivity and location metadata. The system is intended to retain records during network outages and upload when connectivity returns.
10. **Monitor system health:** A supervisory health manager checks hardware, software services, function-level results, storage, temperature, battery/solar status, and communication. It can log warnings, attempt controlled recovery, and report persistent faults.
11. **Manage power:** Solar is intended to power daytime loads and charge the battery. At low battery, the design proposes disabling capture-intensive functions and keeping minimal monitoring/reporting active; at critical battery, save state and shut down safely.

**Planned logical flow:**  
Attraction → entry/funnel → IR event → suction/transfer → observation chamber → image/audio capture → AI inference → local event record → queued remote upload, with health monitoring and power management supervising the whole chain.

The PDFs do not establish that this complete sequence has been implemented or demonstrated.

### 12.2 Proposed hardware and design targets

| Subsystem | Proposal in team documents | Status to record |
|---|---|---|
| Enclosure | Lunch-box form, full-roof solar panel, four-side vents, tapered funnel, taller lower section | Proposed mechanical design |
| Attraction | UV LED plus odour/CO₂ attractant concept | Attraction effectiveness unvalidated |
| Entry sensing | IR break-beam | Counts crossings; insect identity not established |
| Transfer | 12 V centrifugal blower | Airflow, capture/escape rate, noise and power unvalidated |
| Collection | Large detachable chamber with viewing area and service access | Proposed; cleaning/containment design needs testing |
| Imaging | Arducam/Sony IMX519-class 16 MP camera and white LED | Candidate components; image quality and field of view unvalidated |
| Acoustic | INMP441-class I²S MEMS microphone | Proposed; signal quality under blower/enclosure noise unvalidated |
| Compute | Raspberry Pi 5, 2 GB | Proposed controller/edge-compute target |
| Connectivity/location | A7670-class 4G/LTE + GNSS | Exact module variant, GNSS capability, antenna and network behaviour must be confirmed |
| Storage | MicroSD plus SQLite/files | Proposed local-first record architecture |
| Power | Earlier report: ~80 W panel, 12.8 V 30 Ah LiFePO₄ battery, ~10 A MPPT | Preliminary assumptions; later addendum revises solar/MPPT recommendation |
| Later power recommendation | 100 W minimum, 120–150 W preferred panel; 12.8 V 30 Ah LiFePO₄; 15 A minimum / 20 A preferred MPPT | Still a proposal; fit, mass, panel output and measured load must be checked |
| Health UI | Small display hidden inside MCU compartment | Proposed maintenance interface |

### 12.3 Health monitoring proposed by the team

The second PDF usefully distinguishes **component health** from **function health**. A camera may be detected by the operating system while the image pipeline is stalled; a blower may receive an ON command but be blocked or disconnected.

Proposed monitored areas include:
- Camera initialization, valid frames, resolution, failures, and last-frame time.
- Microphone availability, stream continuity, sample rate, buffer errors, and signal level.
- IR beam state, event timestamps, stuck-beam conditions, and event frequency.
- Blower command versus measured current, to flag disconnection or possible stall/blockage.
- UV/white LED electrical response, modem registration/upload time, and GNSS fix validity.
- Raspberry Pi CPU, RAM, temperature, uptime, storage, process state, and pipeline latency.
- Battery voltage/current/SOC/temperature, solar voltage/current/energy, enclosure temperature/humidity.
- Service heartbeats, controlled restart attempts, watchdog behaviour, fault history, and remote reporting.

The proposed states are HEALTHY, WARNING, FAULT, OFF, and CRITICAL, with recovery and protection actions depending on severity. These are good requirements to carry forward, but they are not evidence that these diagnostics or sensors have been implemented. Health logic also needs a defined way to measure physical behaviour; GPIO command state alone is insufficient.

### 12.4 Power proposal — important inconsistency

The power addendum proposes:
- Normal night surveillance: about 12 W average for 8–10 hours.
- Emergency reporting: about 4 W average for 15–20 additional hours.
- A 12.8 V, 30 Ah LiFePO₄ battery.
- Solar-first daytime operation and a low-battery state machine.

**Do not copy the document's daily energy figure as settled.** Its table totals 190 Wh/day raw load, then calculates 223.5 Wh after a 15% conversion allowance and 268.2 Wh after a further 20% reserve. It then incorrectly says to round this to 175 Wh/day. Those values conflict. The later solar-sizing calculation uses 175 Wh/day, so the panel-sizing recommendation is not internally consistent with the earlier load table.

The 12 W night average and 4.05 W emergency average are also design assumptions; they need measurements under realistic event rates and modem transmit peaks. The report itself calls for a 24–72 hour power-logging test. Before choosing the panel, battery, MPPT, wiring and fuses, measure average and peak loads and recalculate daily energy, battery reserve, solar recovery, and controller sizing.

### 12.5 Critical engineering questions before treating the design as feasible

1. **Airflow and containment:** The main report acknowledges that a centrifugal blower requires both intake and discharge paths. Its external outlet is removed from the concept, leaving an internal screened pressure-relief path to validate. Demonstrate that the airflow transfers mosquitoes into the chamber without letting them escape or damaging them.
2. **Sensor semantics:** An IR break-beam only records a crossing. It can be triggered by debris, other insects, or multiple objects, and one crossing does not necessarily equal one captured mosquito. Compare beam events with video/manual counts and confirmed captures.
3. **Event sequencing:** Specify what triggers the blower, how long it runs, when imaging occurs, how repeated triggers are handled, and how the system prevents duplicate or missed records. This is especially important if the mosquito passes the IR sensor before reaching the camera chamber.
4. **Imaging and biological handling:** Validate that captured mosquitoes are visible, sufficiently separated, in focus, and consistently illuminated. Define what happens if multiple mosquitoes occupy the chamber. A high-resolution camera alone does not guarantee species-level classification.
5. **Acoustic sensing:** The microphone is near the chamber, but blower vibration and airflow may overwhelm wingbeat signals. Measure signal-to-noise ratio and compare with the blower on/off; consider separating acoustic capture from blower operation if biologically and mechanically practical.
6. **Attraction efficacy:** UV and odour/CO₂ are concepts, not validated attraction performance. Attraction depends on target species, local conditions, attractant delivery, and trap geometry. Test species-specific catch rates against an appropriate reference method.
7. **Solar packaging:** A 100–150 W panel on a lunch-box-sized roof may create a significant area, mass, wind-loading, mounting, and portability constraint. Verify actual panel dimensions and enclosure geometry before adopting the power recommendation.
8. **Edge compute and thermal behaviour:** Raspberry Pi 5 can orchestrate the proposed pipeline, but sustained inference, camera, microphone, 4G, and cooling loads must be benchmarked in the sealed outdoor enclosure. Define thermal throttling and safe operating limits.
9. **GNSS/data validity:** Verify the exact modem SKU, valid location fixes, time synchronization, coordinate format, and behaviour when GNSS or cellular service is unavailable.
10. **AI validation:** Define the species list and ground-truth labelling process. Evaluate precision/recall per class, confusion between similar species, confidence handling, and unknown/uncertain cases. Do not equate an IR count or an AI label with a confirmed surveillance finding.
11. **Outdoor reliability and maintenance:** Test ingress protection, condensation, heat, UV exposure, insect escape, cleaning, corrosion, cable strain relief, battery safety, and safe servicing. The detachable chamber must not compromise containment or camera alignment.
12. **Privacy and deployment:** Establish data retention, access controls, device identity, secure transmission, update/recovery procedures, and what location/image information is uploaded.

### 12.6 Recommended prototype milestones

Avoid attempting the complete solar, 4G, acoustic, AI and health-monitoring system simultaneously. Prove the riskiest physical assumptions in sequence:

**P0 — Capture-path bench test**
- Build the vent/funnel/IR/blower/chamber path.
- Measure airflow and blower current.
- Use controlled trials to measure entry detection, transfer success, escape rate, false triggers and repeatability.
- Confirm safe collection and cleaning.

**P1 — Image-capture feasibility**
- Add camera and white illumination.
- Capture known, human-verified mosquito specimens under repeatable conditions.
- Measure focus, image coverage, overlap/occlusion, usable-image rate and storage per event.
- Decide whether images support the intended taxonomic level before building a classifier.

**P2 — Event-driven software**
- Implement IR event → blower action → capture → timestamped local record.
- Add unique event IDs, duplicate suppression, error handling, and offline storage.
- Test with simulated sensor events before unattended operation.

**P3 — Baseline computer vision**
- Create a labelled, versioned dataset.
- Start with mosquito/non-mosquito detection or a narrowly defined classification task.
- Report per-class metrics and failure cases; keep uncertain predictions explicit.

**P4 — Reliability and power**
- Add measured-current feedback, service heartbeats, storage/temperature checks and battery monitoring.
- Run a 24–72 hour power log and test low-battery transitions.
- Add acoustic sensing only after its incremental value can be tested independently.

**P5 — Field pilot**
- Compare trap counts and species labels against a manual/reference identification protocol.
- Record location, weather/environment, trap uptime, maintenance events and missing-data rate.
- Only then assess remote reporting and surveillance-level usefulness.

### 12.7 Source-boundary correction

The PDFs describe a **single Raspberry Pi 5-centred design**. They do not describe the earlier master/slave arrangement. Keep that earlier idea only as historical context, if still useful, and do not list it as the LunchBox team's current proposed architecture unless the team provides a separate source confirming it.

### 12.7 How these PDFs change the project handoff

The LunchBox workstream can now be described more concretely as a **proposed event-driven physical trap plus edge-computing and health-monitoring system**. The team has articulated a candidate mechanism, components, software responsibilities, energy modes, and a validation agenda.

What remains unproven is the physical capture/transfer performance, usable image quality, species-identification accuracy, acoustic feasibility, full energy budget, and reliable unattended operation. The next handoff should keep these documents as design references and add test reports, photos, schematics, firmware, logs, datasets, and measured results as they become available.


---

## 13. Drone photogrammetry verification — evidence-backed status (reviewed 10 October 2026)

A dedicated handover report, `drone_photogrammetry_verification.md`, reviews the exported datasets for `Drone_First_Flight/Area_A` through `Area_D`. This is stronger evidence than the earlier general project history because it reports direct checks of the existing output files. It is still a review of exports, not a repeated flight or reprocessing run.

**Scope clarification added 11 October 2026:** The project owner confirms that Areas A–D correspond to four selected locations within the correctly specified 154,537.73 m² campus. The full campus was not surveyed in this capture. This later clarification establishes the intended relationship to the campus; it does not change the original review's measurements or supply the selected-location polygons needed for coverage acceptance.

### 13.1 What is confirmed

Each of Areas A–D contains six files: a five-page processing report, `orthophoto.tif`, `dsm.tif`, `pointcloud.laz`, `model.glb`, and `shots.geojson` — 24 source files total across four areas.

The report confirms:
- All reported input images were reconstructed in each area.
- Raster, point-cloud and mesh data are readable; the inspection found no decoding failures or non-finite values in valid raster samples, point coordinates or model attributes.
- The reconstructed camera record counts and unique filenames match the reported image counts.
- Horizontal geospatial outputs declare **EPSG:32643 — WGS 84 / UTM zone 43N** and their camera positions are internally consistent with stored UTM translations.
- Orthophotos, DSMs, LAZ point clouds, textured GLB meshes and camera records exist for all four areas.

### 13.2 Per-area output evidence

| Area | Images reconstructed | Dense point-cloud points | Reported GSD | Main observed quality concern |
|---|---:|---:|---:|---|
| A | 100 / 100 | 18,148,045 | 0.91 cm/pixel | Soft local detail, irregular edges, and a visible gap near buildings |
| B | 18 / 18 | 4,031,708 | 0.79 cm/pixel | Detached low mesh geometry; model minimum Z is far below the DSM minimum |
| C | 248 / 248 | 48,133,057 | 0.83 cm/pixel | Vegetation stitching discontinuities/smearing and low detached mesh geometry |
| D | 8 / 8 | 1,727,290 | 1.31 cm/pixel | Pronounced warping/smearing around roofs and vegetation, plus open mesh regions |

The GSD values above are processor-reported estimates. Measured exported raster cell spacing is approximately 1.00 cm/pixel for A, B and C, and 1.12 cm/pixel for D. GSD and output cell spacing are not positional-accuracy measurements.

### 13.3 Coverage and accuracy are not yet accepted

**Coverage target:** Assess Areas A–D against their four selected-location boundaries and required features. The 154,537.73 m² campus is the broader project extent, not the expected coverage of this capture. The owner's clarification resolves the full-campus-versus-selected-locations ambiguity; completeness within each selected location remains unverified.

The supplied `reportA.pdf` through `reportD.pdf` were checked on 11 October 2026. Page 1 of each report states the following “Area Covered” figures, which agree with the detailed verification report's transcriptions. The export footprints below are retained from that earlier inspection; they were not remeasured during this update.

| Area | Processing report, page 1 | Reported area (km²) | Reported area converted to m² | Valid orthophoto footprint (m², approx.) | Valid DSM footprint (m², approx.) |
|---|---|---:|---:|---:|---:|
| A | [reportA.pdf](D:/Users/Vinit/Downloads/Work_Vault/pdfs/reportA.pdf) | 0.017175 | 17,175 | 24,731 | 25,905 |
| B | [reportB.pdf](D:/Users/Vinit/Downloads/Work_Vault/pdfs/reportB.pdf) | 0.001405 | 1,405 | 4,056 | 4,058 |
| C | [reportC.pdf](D:/Users/Vinit/Downloads/Work_Vault/pdfs/reportC.pdf) | 0.018421 | 18,421 | 22,776 | 22,974 |
| D | [reportD.pdf](D:/Users/Vinit/Downloads/Work_Vault/pdfs/reportD.pdf) | 0.000937 | 937 | 8,840 | 8,972 |

The report/export differences therefore remain unresolved, particularly for B and D. The supplied PDFs do not explain the calculation of “Area Covered”; do not assume a particular cause or substitute one figure for the other without reconciling the measurement definitions. Choosing four locations instead of the full campus explains the capture scope, but does not explain these per-area discrepancies. Neither the reported figures nor the export footprints establish a survey completion percentage, and summing footprints without checking spatial overlap does not establish unique surveyed area.

Processor-reported absolute horizontal CE90 values are:
- A: 1.321 m
- B: 0.248 m
- C: 1.044 m
- D: 0.221 m

These are estimates/residuals from the processing reports, not independent checkpoint results. No surveyed checkpoints, intended boundary, or required-feature list was supplied for the original 10 October review. The later owner clarification identifies the four-location scope, but selected-location polygons and required-feature lists still need to be supplied for an overlay/acceptance check. The available evidence therefore does not establish final absolute positional accuracy or complete coverage of each selected location; whole-campus coverage was not the scope of this capture.

### 13.4 Important limitations and unresolved provenance

- The reports identify the geographic reference as GPS and the processor as **ODX 3.8.3**. ODX identification alone does not establish use of WebODM.
- Camera records identify **DJI FC3411**, use `.DNG` filenames, and list 5568 × 3648 image dimensions. However, explicit Air 2S identification, flight plans/logs, original photographs with EXIF, WebODM interface records, and GPS fault/fix logs were absent from the reviewed source folders.
- Horizontal CRS consistency is established internally; vertical datum and elevation units/reference are not established.
- The DSM is a surface model, not a confirmed bare-earth terrain model. Ground classification is not supplied (all point-cloud classifications are 0).
- GLB meshes use local horizontal coordinates without an explicit CRS or verified world-placement transform; they should not be positioned directly in GIS from local XY values.
- Visual checks included raster overviews, five native-resolution orthophoto crops per area, sampled point-cloud views and coarse mesh projections. This was not an exhaustive full-resolution inspection of every feature.

### 13.5 Required follow-up before claiming final suitability

1. Define the intended use and acceptance tolerances, including critical features and required horizontal/vertical accuracy.
2. Obtain surveyed checkpoints independent of the reconstruction control and assess errors against the acceptance criteria.
3. Obtain the boundaries and required-feature lists for the four selected campus locations, compare valid output masks against them, and reconcile reported area calculations, especially B and D. Retain the campus boundary as project context; assess capture completeness against the selected locations.
4. Inspect the affected areas at full resolution and document acceptance, cleanup/reprocessing, or additional image capture.
5. Confirm vertical datum/units and the GLB model origin/placement transform.
6. If provenance matters, collect flight plans/logs, explicit aircraft identification, original photographs/EXIF, processing records, and evidence of GPS troubleshooting.

### 13.6 Updated project status

**Aerial pipeline — outputs generated, quality review underway; final survey acceptance not established.**

It is now fair to say that four sets of photogrammetry outputs for selected campus locations were produced and technically inspected, with all listed input images reconstructed and exported files readable. Their horizontal georeferencing is internally consistent. The campus area of 154,537.73 m² remains correct, and the project owner confirms that the whole campus was not surveyed. It is not yet fair to claim independently verified survey accuracy, complete coverage of each selected location, defect-free reconstruction, verified WebODM use for these exports, or confirmed resolution of the earlier GPS issue.

The detailed verification report and its referenced inspection evidence should be retained alongside the original `Drone_First_Flight` files. The report's evidence links use paths from the original workstation and may need updating if moved to another machine.

### 13.7 Source report

Use `drone_photogrammetry_verification.md` as the detailed evidence record for this section. It contains the per-area measurements, observed defects, validation limits, and required follow-up. Preserve it without replacing its findings with the shorter summary above.
