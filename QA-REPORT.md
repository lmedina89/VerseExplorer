# Universe Explorer v0.1.0.6A.3-FW2.1 — QA Report

## Scope
FW2.1 is a visual-correction/polish hotfix on top of the FW2 presentation-only Flat World observer. The firmament is corrected to a complete square bipyramid centered on the disc plane, with matched upper/lower apices. Additional presentation polish is restricted to the Flat World renderer and observer pose; `visualOnly=true`, `gravitySource=false`, and the no-physics/no-collision boundary remain unchanged.

## Validation summary
- Full `npm run qa`: **PASS**.
- Node test suite: **408/408 passed**.
- Static required-file structure: **PASS (65 required files)**.
- JavaScript/module syntax checks: **PASS**.
- Focused Flat World tests now assert the lower firmament apex, mobile-readable firmament edge glow, figure-eight guide markers, disc-plane firmament equator, and interior firmament glow bridge.
- Protected `src/core/`, `src/physics/`, `src/data/`, and `src/experiments/` trees are byte-for-byte unchanged from the tested FW2 package.

## Visual changes under test
- Full upper/lower transparent firmament around the disc.
- Thin translucent edge cylinders supplement one-pixel WebGL line edges for iPhone readability.
- Subtle figure-eight guide beads improve path readability without changing Sun/Moon motion.
- Warm upper/lower disc trim, richer deterministic tree canopy, and faint underside root halo.
- Default disc-top observer is nearly face-on to the vertical figure-eight and slightly offset from the tree centerline.

## Runtime inspection note
A local headless Chromium graphics smoke test was attempted, but the container's headless GPU/GL backend could not initialize. Static/syntax/unit QA is complete; the final visual acceptance pass remains the iPhone Safari test, as with FW1/FW2.

---

# Universe Explorer v0.1.0.6A.3-FW2 — QA Report

## Scope
FW2 is a presentation-only extension of FW1. It adds a Flat-World-only COSMOS **LAND / VIEW** observer and dedicated interior renderer while preserving the anomaly's `visualOnly=true`, `gravitySource=false` boundary and leaving canonical SOL/A3 physics untouched.

## Focused FW2 checks
- `createFlatWorldObservationRegion()` is observer-only, zero-gravity, zero-pressure and weather-disabled.
- `FlatWorldSurfaceVisual` reuses `createFlatWorldAnomalyVisual()` / `updateFlatWorldAnomalyVisual()` so the space and disc-top views share one visual definition.
- The surface camera sees the isolated Flat World render layer and slightly strengthens the transparent firmament only for interior readability.
- COSMOS exposes **LAND / VIEW** only for `FLAT EARTH [ANOMALY]`.
- The observer session does not register a new body, change N-body sources, move the ship, or invoke ordinary landing/orbit insertion.
- **LEAVE DISC** follows the existing observer-only cleanup path back to the physical ship view.

---

# Universe Explorer v0.1.0.6A.3-FW1 — QA Report

## Validation summary

- Full static/syntax/test command: **PASS**.
- Node test suite: **404/404 passed**.
- Static required-file structure: **PASS (63 required files)**.
- All JavaScript / module syntax checks: **PASS**.
- New focused FW1 coverage checks remote/off-ecliptic placement, visual-only/no-gravity status, COSMOS composition without canonical mutation, canonical SOL preservation, massless observation-state compatibility, isolated local lighting, figure-eight Sun/Moon animation, and new/load registration.

## Protected baseline comparison against v0.1.0.6A.3

The following simulation-critical areas are byte-for-byte unchanged from the tested A3 baseline:

- `src/core/`
- `src/physics/`
- `src/data/`
- `src/surface/`
- `src/experiments/`

The A3 compact-object surface bridge, LAB compact-object definitions, landing logic, SOL reference data and Newtonian integration are not rewritten by FW1.

FW1 runtime changes are isolated to Explorer presentation/COSMOS integration:

- `src/cosmic/flatWorldAnomaly.js` — new presentation-only definition.
- `src/render/flatWorldAnomaly.js` — new custom disc/tree/roots/zodiac/firmament/figure-eight renderer.
- `src/render/cosmicPhenomena.js` — routes the new visual kind to the custom renderer.
- `src/render/threeRenderer.js` — enables isolated render layer 2 for the anomaly and its local lights.
- `src/app/app.js` — composes the anomaly into the Explorer COSMOS registry on new/load and pre-identifies it.
- `src/main.js` / `index.html` — FW1 cache/version wiring.

## FW1 behavior checked

- `FLAT EARTH [ANOMALY]` is placed at a fixed remote free-space location roughly **117 AU** from the barycenter and substantially off the normal ecliptic plane.
- The anomaly is explicitly **visual-only**, **massless**, **non-gravitating**, non-colliding and does not become a body in the canonical SOL registry.
- Canonical `generateSolSystem()` still reports zero built-in SOL phenomena/anomalies and contains no Flat World body.
- The existing `CosmicPhenomenonRegistry` observation-state path supplies the anomaly center/radius to the existing massless FRAME / ORBIT camera flow.
- The custom visual contains a thick disc, procedural azimuthal-style top, perimeter ice band, twelve zodiac rim plates, central world tree, exposed underside roots, nearly clear four-sided pyramid firmament, and a vertical figure-eight celestial rail.
- Local Sun and Moon occupy opposite positions on the same animated figure-eight path with a 180-second cycle at 1× simulation time.
- Standard-lit anomaly materials and internal lights are isolated on render **layer 2**. Normal Solar-System lights remain on layer 0, so they do not define the anomaly's lighting.
- The local Sun is the dominant warm point light; the local Moon supplies weaker cool fill, with restrained local ambient/hemisphere fill for readability.

## HTTP/package smoke

- GitHub-style local HTTP route smoke: **13/13 assets returned HTTP 200 with non-empty content**.
- Covered the root shell, FW1 main/app modules, new Flat World definition/renderer, cosmic renderer, renderer bridge, A3 orbit/LAB modules, SOL data and `EXPLORER-VERSION.json`.
- A graphical WebGL/WebGPU screenshot smoke could not be executed in this container because browser navigation is blocked by the execution environment. Final composition/brightness therefore still requires the intended iPhone Safari visual test.

## Acceptance test on device

1. Open **COSMOS**.
2. Select **FLAT EARTH [ANOMALY]** (it is intentionally pre-identified).
3. Use the existing massless **FRAME** view, then **ORBIT**.
4. Confirm the complete silhouette reads immediately: disc + zodiac rim + world tree/roots + transparent pyramid + vertical figure-eight.
5. Let simulation time run and confirm the local Sun/Moon move opposite one another on the path and illuminate the anomaly independently of the real Solar-System Sun.
6. Confirm normal A3 surface SKY SPAWN / compact-object behavior is unchanged.
