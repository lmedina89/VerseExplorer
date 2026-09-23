# Universe Explorer v0.1.0.5F — QA Report

## Scope

This release is a bounded presentation update on top of v0.1.0.5E. It adds a licensed SOL Sun photosphere reference texture, fixes landed/surface Sun readability against a bright atmosphere, and labels the existing procedural survey beacons. It does not change authoritative celestial geometry, atmosphere physics, orbital dynamics, landing transitions or ship physics.

## User-supplied Sun asset audit

- Input: `/mnt/data/sun.glb`, 2,116,612 bytes, glTF 2.0.
- Embedded author metadata: SebastianSosnowski (`https://sketchfab.com/SebastianSosnowski`).
- Source: `https://sketchfab.com/3d-models/sun-9ef1c68fbb944147bcfcc891d3912645`.
- License metadata: CC BY 4.0.
- GLB contents: 2 meshes, 2 materials, 3 textures / 3 embedded images; `KHR_materials_transmission` is used by the supplied decorative shell.
- Selected source image: embedded 1024×512 JPEG photosphere.
- Runtime derivative: `assets/textures/sun-sebastiansosnowski-photosphere.jpg`, 1024×512, neutral-luminance detail so Explorer's live stellar/atmospheric color controls hue.
- Runtime derivative SHA-256: `36667fd3d39b12965c09333a0d3c9f08103a12dcd74c13d587280fbdde61a308`.
- The supplied GLB geometry, transmission shell and GLB file are not included in the release.

## Solar visibility fix

The live observer solution still supplies Sun direction, altitude, apparent angular radius, horizon state and eclipse-visible fraction. `solveSurfaceAtmosphericOptics()` is unchanged and still supplies physical spectral transmission, atmospheric color and direct-light attenuation.

The prior surface renderer used `directStellarTransmission` almost literally as framebuffer alpha. That made a physically above-horizon Sun fade into Earth's bright blue sky. v0.1.0.5F retains physical transmission for lighting but applies a bounded HDR display transform to the visible solar disk. At the reported +5.75° Earth altitude in clear one-atmosphere conditions, the existing optics solver gives direct transmission ≈0.434; the new display mapping yields disk gain ≈0.861 (≈0.843 final disk opacity at full visible fraction) while retaining the low-Sun red/orange spectral tint.

## Survey marker clarity

Existing POI ring/stem geometry and scan behavior are unchanged. Each beacon now carries a lightweight billboard with the POI name plus `SURVEY / SCAN`, so the yellow known-geology beacon is explicitly identifiable rather than unexplained scenery.

## Regression / static validation

- `npm run check`: PASS.
- Full test suite: **371 / 371 PASS**.
- New targeted coverage checks the Sun reference-asset isolation, bundled JPEG integrity, CC BY attribution, nonliteral solar-display alpha mapping and survey-beacon labeling.
- GitHub Pages/local HTTP smoke: **9 / 9 PASS** (`index.html`, entry modules, `celestialFactory`, `surfaceWorld`, new Sun texture and existing Earth texture all return HTTP 200).

## Protected-core diff audit versus v0.1.0.5E

Byte-for-byte unchanged:

- `src/core/astronomicalObserver.js`
- `src/core/planetaryRotation.js`
- `src/data/solSystem.js`
- `src/physics/gravity/directGravitySolver.js`
- `src/physics/integrators/velocityVerlet.js`
- `src/physics/shipDynamics.js`
- `src/physics/flightComputer.js`
- `src/physics/transitDrive.js`
- `src/physics/atmosphericOptics.js`
- `src/surface/landingTransition.js`
- `src/surface/surfaceSession.js`
- `src/surface/surfaceWeather.js`
- `src/surface/surfaceProfiles.js`

`src/physics/frameOrbitInsertion.js`, `src/navigation/systemNavigation.js`, `src/surface/surfaceGenerator.js` and renderer/app entry-chain files receive cache-stamp changes only where needed for Safari/GitHub Pages module isolation; their corresponding simulation behavior is not redesigned in this release.

## Manual iPhone acceptance focus

1. Land on Earth, select Sun, CENTER, and cycle 70° → 15° → 5° → 1.5°. When the Sun is above the horizon it should remain plainly visible.
2. Near the horizon the disk should become warmer/redder; below the horizon it should still disappear normally.
3. Eclipse/occultation should still reduce the visible solar fraction.
4. From space, the SOL Sun should show photospheric texture without changing its physical radius/position.
5. Walk toward a yellow surface beacon: its POI name and `SURVEY / SCAN` label should explain what it is.
