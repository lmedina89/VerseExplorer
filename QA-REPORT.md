# Universe Explorer v0.1.0.6A.1 — QA Report

## Scope

This release corrects SKY SPAWN to the intended **actual landed/on-foot surface workflow** while retaining the validated v0.1.0.6A orbit-insertion foundation. While landed, the player aims the center reticle into the sky, chooses a LOW / MEDIUM / HIGH shell, PREVIEWs the insertion and projected orbit along that exact live look direction, then COMMITs the asteroid into the existing mutual Newtonian N-body simulation. The earlier flight LAB sandbox remains only as a secondary engineering path.

## Surface-reticle insertion model

- Current landed planet/moon is automatically the orbital parent.
- SKY SPAWN is available only in the real LANDED/on-foot state; the massless reference SURFACE SKY observer is intentionally excluded.
- The live astronomical observer's inertial position and center-reticle forward vector are authoritative for aim.
- Reticle altitude must be at or above the local horizon. Below-horizon directions are rejected and COMMIT is disabled.
- The reticle ray is intersected with the selected orbital shell, so the proposed insertion point lies exactly on the live center line of sight.
- LOW / MEDIUM / HIGH use the existing bounded altitude presets for the selected parent.
- Initial circular speed is `sqrt(G(M_parent + m_asteroid)/r)`.
- Velocity is tangent to the shell and prograde relative to the parent's existing rotation axis; parent inertial velocity is included.
- COMMIT re-solves the parent state, observer state, rotation and look ray at the exact commit instant rather than reusing stale preview values.
- Once committed, the body is a normal gravity source in the existing direct mutual Newtonian solver and velocity-Verlet integrator. No orbit rail is used.

## Preview / provenance policy

The amber ghost marker and projected orbit are presentation-only. They are never inserted into the authoritative body registry, gravity solver or collision system. The ghost is deliberately enlarged on the surface-sky shell for mobile aiming; the committed asteroid remains the fixed physical 1.0e12 kg, 3000 kg/m³ basalt body with radius derived from mass/density. Surface-created bodies are tagged `sandboxSpawnSource: surface-reticle`. The first COMMIT marks the current reference system `SOL — MODIFIED`; that provenance persists for the run/save. Maximum committed sandbox bodies remains 5 in this mobile-safe slice.

## Automated validation

- `npm run check`: PASS.
- Full test suite: **387 / 387 PASS**.
- New surface SKY SPAWN tests verify exact reticle-ray placement, circular/prograde geometry, below-horizon rejection, closed preview orbit geometry, actual landed-HUD wiring, render-only preview behavior and COMMIT into the live body registry.
- The integration test performs a full live mutual-N-body Earth LOW insertion created from a surface reticle and integrates approximately one orbit with the existing direct gravity + velocity-Verlet stack; the state remains finite and bound with radial closure within the test tolerance (<150 m).
- Existing v0.1.0.6A orbit-sandbox tests remain green.

## Protected-core diff audit versus v0.1.0.6A

The surface bridge is isolated to the app/presentation layer plus the sandbox insertion helper. Protected simulation areas are required to remain byte-for-byte identical to the exact v0.1.0.6A baseline:

- `src/core/`
- `src/physics/`
- `src/data/`
- `src/surface/`

Intentional implementation changes are limited to shell/styles, app wiring, `src/experiments/orbitSandbox.js`, renderer/surface presentation, cache edges, tests and release documentation. Gravity/integration equations, canonical SOL reference data, landing-transition/session logic, planetary rotation, atmosphere physics, ship dynamics and FRAME/transit are not redesigned in this milestone.

## Manual iPhone acceptance focus

1. Land normally on Earth or another already-supported solid SOL world and wait for actual LANDED/on-foot mode.
2. Confirm the compact **SPAWN** control appears on the landed HUD. It must not appear in the massless SURFACE SKY observer.
3. Aim the center reticle above the horizon, open SPAWN, choose LOW and tap PREVIEW.
4. Confirm the amber ghost appears on the center look direction and follows LOOK as the reticle moves; projected orbit updates with it.
5. Aim below the horizon and confirm the preview becomes invalid / COMMIT is disabled.
6. Aim back above the horizon and COMMIT. Confirm the asteroid appears in the aimed sky direction, `SOL — MODIFIED` appears, and subsequent motion is live rather than fixed to the preview path.
7. Use telescope/FOV controls if the physical asteroid becomes too small to see easily, then verify it can also be observed from normal flight/system views.

## Deployment / package checks

- Worktree local HTTP smoke: **11 / 11 PASS** for shell, styles, main/app, sandbox helper, renderer/surface renderer, inherited astronomy module, Earth/Sun reference textures and release metadata.
- Preliminary GitHub-ready package: ZIP integrity PASS, clean extraction PASS, clean-extraction `npm run check` PASS, clean-extraction full regression **387 / 387 PASS**, and clean-extraction HTTP smoke **11 / 11 PASS**.
- After freezing this report, the release ZIP is rebuilt and the same integrity, clean-extraction QA and HTTP checks are repeated against the exact bytes delivered to the user.
