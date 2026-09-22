# Exploration Branch Guardrails

## Product direction

Universe Explorer remains the original Universe Lab **3D exploration experience** with substantially less UI overhead.

The renderer, ship, flight, cockpit, FRAME travel, landing and surface experience are assets to preserve, not systems to replace.

## Hard rules

1. Start every milestone from a passing build.
2. Change one subsystem at a time.
3. Do not replace working flight/camera/render behavior merely to simplify code.
4. Do not expose laboratory/debug/test controls in the normal exploration path.
5. Advanced controls may remain available behind a deliberate secondary surface.
6. iPhone Safari physical testing is the acceptance gate for renderer and touch changes.
7. A build that reduces the ability to freely explore the 3D universe is a regression.

## Current milestone

v0.1.0 changes only the default UI shell and branch branding.

The next milestone may add the deterministic **SOL** profile, but must not modify Origin/Abyssal physics or presentation behavior.
