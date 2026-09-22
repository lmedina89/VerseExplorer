# Universe Explorer v0.1.0 — Exploration Branch Foundation

Universe Explorer is a **direct exploration-focused branch of the known-good Universe Lab v0.1.5.5 / ABYSSAL-155 build**.

This milestone intentionally does **not** rebuild or replace the game.

## What changed

Only the player-facing shell was simplified:

- Default top HUD hides renderer/physics/render-time and seed/lab telemetry.
- Primary bar is now focused on **TARGET / APPROACH / FRAME / WARP / MENU**.
- Scanner, flight helpers, cockpit, system map, landing and session controls live inside one grouped Explorer menu.
- Original laboratory and scientific-overlay controls remain available under **Advanced / Lab Controls** rather than occupying the main exploration interface.
- Branding/versioning identifies this as the Explorer branch.

## What did not change

The source baseline's working systems are intentionally preserved:

- Float64 SI simulation state
- Newtonian direct gravity
- velocity-Verlet major-body integration
- existing Three.js renderer/backend policy
- spacecraft dynamics and touch flight controls
- cockpit
- APPROACH navigation
- FRAME travel
- system map / target selection
- planetary environments
- atmosphere / sky optics
- multi-world landing
- surface exploration
- save schema 1

This build does **not** add the real Solar System yet. That comes after this UI-only branch foundation is physically accepted on iPhone Safari.

## Source provenance

Baseline archive SHA-256:

`4b5efcf37b481dedc3f87323f3c4c6d5c54d6c8576ed0d195ad544f4e2499748`

Baseline:

`UniverseLab-v0.1.5.5-Abyssal-Universe-Profile-Foundation-GitHub`

The original baseline README is preserved at:

`docs/UNIVERSE-LAB-v0.1.5.5-BASELINE-README.md`

## Validation

Run:

```bash
npm run qa
```

Physical iPhone Safari remains the release gate for renderer/input-sensitive behavior.

## Next milestone

**v0.1.1 — SOL Real Solar System Profile**

Add a curated deterministic Solar System profile from authoritative astronomical initial state data without altering the accepted Origin/Abyssal profiles or the flight/render architecture.
