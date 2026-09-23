# Universe Explorer v0.1.0.6A.2 — QA Report

## Scope

This release is a presentation/usability pass on the validated v0.1.0.6A.1 surface SKY SPAWN bridge. It adds a physically closer NEAR circular shell, restores visible distance differences in the preview, collapses the spawn setup card while aiming, strengthens landed Sun presence with bounded FOV-aware glare, and improves resolved orbit planet/moon texture filtering/detail residency. It does not redesign the authoritative simulation.

## Surface-spawn distance model

- Surface choices are NEAR / LOW / MEDIUM / HIGH.
- Reference SOL preset altitudes: Earth 200 / 400 / 2,000 / 20,000 km; Moon 25 / 100 / 500 / 2,000 km; Mars 125 / 250 / 1,000 / 6,000 km.
- Generic parents derive NEAR from `max(25 km, 0.02 × parent radius)` while retaining the prior bounded LOW/MEDIUM/HIGH rules.
- The insertion point remains the exact intersection between the current landed reticle ray and the selected orbital shell.
- Circular speed and period remain `sqrt(G(M+m)/r)` and the corresponding two-body period at insertion; subsequent motion is the existing live mutual Newtonian N-body solution.
- NEAR does not claim atmospheric-drag, oblateness/J2, mascon or other nonspherical-gravity stability.

## Preview/readability model

The prior surface preview had a large minimum ghost radius (`8.5` render units), which visually flattened different orbital distances. 6A.2 uses the physical asteroid radius divided by live line-of-sight distance to derive angular size, maps that onto the presentation sky shell, and keeps only a tiny `0.08`-unit ghost floor. A separate amber ring retains a `1.9`-unit aiming floor. PREVIEW adds the `preview-compact` UI state so the setup card collapses to shell + altitude/LOS + COMMIT/CANCEL while the player aims.

## Sun visual-presence model

The landed Sun retains the existing physical apparent diameter, atmosphere transmission/color, eclipse fraction and horizon visibility. 6A.2 adds one bounded additive glare sprite plus a white-core blend. Glare scales upward for wide/naked-eye FOV and backs off at telescope FOV, preserving photosphere detail. Ground illumination still comes from the existing optics/irradiance path.

## Orbit planet/moon visual polish

- Reference/procedural resolved textures use linear magnification, linear mipmapped minification and higher anisotropy.
- Lazy global albedo/detail residency begins at apparent radius 0.004 rad instead of 0.006 rad.
- Lazy close normal/roughness detail begins at 0.022 rad instead of 0.030 rad.
- Physical sphere radius, body orientation, canonical environment and orbital state are unchanged.

## Protected-core audit target

The following authoritative areas must remain byte-for-byte identical to v0.1.0.6A.1:

- `src/core/`
- `src/physics/`
- `src/data/`
- `src/surface/`

Intentional functional changes are limited to `src/experiments/orbitSandbox.js`, app/UI presentation, `src/render/surfaceWorld.js`, `src/render/celestialFactory.js`, renderer cache edges, styles, tests and release documentation.

## Automated validation

- Worktree `npm run check`: PASS (static structure + JavaScript syntax).
- Worktree full regression: **393 / 393 PASS**.
- Protected-core diff versus the exact 6A.1 baseline: `src/core/`, `src/physics/`, `src/data/`, and `src/surface/` are byte-for-byte identical.
- New 6A.2 acceptance tests cover body-aware NEAR shells, monotonic LOS/apparent-size separation, true-size preview ghost with separate aiming ring, compact PREVIEW UI state, FOV-aware solar glare, and earlier/higher-quality orbit texture detail.
- Preliminary GitHub ZIP integrity: PASS.
- Preliminary clean extraction static/syntax check: PASS.
- Preliminary clean extraction full regression: **393 / 393 PASS**.
- Preliminary local GitHub-style HTTP smoke: **12 / 12 PASS**, including shell/style/modules plus Earth and Sun reference textures.

## Final package freeze

The release ZIP is rebuilt after this report is written. Final clean-extraction/static/regression/HTTP verification is performed against those exact delivered bytes; the release is only handed off if those checks remain green.
