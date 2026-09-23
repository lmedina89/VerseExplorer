import { derivePlanetaryEnvironment } from '../physics/planetaryEnvironment.js';

export const SURFACE_ARCHITECTURE_VERSION = 2;

export const SURFACE_ARCHITECTURE_FAMILIES = Object.freeze({
  ATMOSPHERIC_ROCKY: 'ATMOSPHERIC_ROCKY',
  AIRLESS_ROCKY: 'AIRLESS_ROCKY',
  ICE_VOLATILE: 'ICE_VOLATILE',
});

export const SURFACE_ENGINE_PROFILES = Object.freeze({
  LEGACY_HOME: 'legacy-atmospheric-anomaly-v1',
  ATMOSPHERIC_ROCKY: 'atmospheric-rocky-v1',
  AIRLESS_ROCKY: 'airless-rocky-v1',
  ICE_VOLATILE: 'ice-volatile-v1',
});

export const SOL_LANDING_SURFACE_PROFILES = Object.freeze({
  'moon-luna': Object.freeze({
    family: SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY,
    profileId: SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY,
    regionId: 'airless-regolith',
    regionName: 'Regolith Survey Site',
    regionSubtitle: 'Airless rocky reference surface',
    capability: 'AIRLESS REFERENCE SURFACE · CURRENT BUILD',
    surfaceStyle: 'moon-regolith',
    proof: true,
    reason: 'SOL Moon landing uses the inherited airless-rocky surface stack; local terrain is a deterministic regolith proxy, not a real lunar map.',
  }),
  'planet-mars': Object.freeze({
    family: SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY,
    profileId: SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY,
    regionId: 'mars-regolith-highland',
    regionName: 'Mars Highland Survey',
    regionSubtitle: 'Basaltic/regolith terrain under the reference tenuous CO₂ atmosphere',
    capability: 'MARS REFERENCE SURFACE · CURRENT BUILD',
    surfaceStyle: 'mars-regolith',
    reason: 'Mars landing uses the established atmospheric-rocky stack driven by the SOL reference gravity, pressure, albedo, rotation and live sky. Terrain remains a deterministic local proxy, not a real Mars map.',
  }),
  'moon-europa': Object.freeze({
    family: SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE,
    profileId: SURFACE_ENGINE_PROFILES.ICE_VOLATILE,
    regionId: 'europa-fractured-ice',
    regionName: 'Europa Fractured Ice Survey',
    regionSubtitle: 'Bright ice-rich terrain under a tenuous O₂ exosphere',
    capability: 'EUROPA REFERENCE SURFACE · CURRENT BUILD',
    surfaceStyle: 'europa-ice',
    reason: 'Europa landing uses the established ice/volatile stack with authoritative SOL gravity, reference exosphere, rotation and live Jupiter-system sky. Surface fractures and composition are presentation proxies, not mapped Europan geology.',
  }),
  'moon-titan': Object.freeze({
    family: SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE,
    profileId: SURFACE_ENGINE_PROFILES.ICE_VOLATILE,
    regionId: 'titan-organic-ice-plain',
    regionName: 'Titan Organic-Ice Plain',
    regionSubtitle: 'Water-ice/organic-rich terrain beneath the dense N₂/CH₄ reference atmosphere',
    capability: 'TITAN REFERENCE SURFACE · CURRENT BUILD',
    surfaceStyle: 'titan-haze',
    reason: 'Titan landing uses the established ice/volatile terrain stack with the SOL reference dense atmosphere, gravity, rotation and live Saturn sky. Haze/terrain presentation is a bounded proxy; methane weather and full atmospheric chemistry are not solved.',
  }),
  'moon-triton': Object.freeze({
    family: SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE,
    profileId: SURFACE_ENGINE_PROFILES.ICE_VOLATILE,
    regionId: 'triton-nitrogen-ice-plain',
    regionName: 'Triton Nitrogen-Ice Plain',
    regionSubtitle: 'Cryogenic N₂-ice/rock terrain beneath a trace N₂/CH₄ atmosphere',
    capability: 'TRITON REFERENCE SURFACE · CURRENT BUILD',
    surfaceStyle: 'triton-ice',
    reason: 'Triton landing uses the established ice/volatile stack with authoritative SOL gravity, trace atmosphere, retrograde orbital state, rotation and live Neptune sky. Local terrain is a deterministic cryogenic proxy, not mapped Triton topography.',
  }),
});

function finite(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function legacyHomeBody(bodies = []) {
  return bodies.find((body) => body?.landable && body?.surfaceProfile === 'anomalous-showcase-v1') ?? null;
}

export function architectureFamilyForEnvironment(environment) {
  if (!environment?.physicalSurfaceExists) return null;
  const atmosphere = environment.atmosphereClassId;
  const family = String(environment.surfaceFamily ?? '');
  if (family.includes('ICE') || environment.bodyClassId?.includes?.('ice-rich')) return SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE;
  if (atmosphere === 'airless' || atmosphere === 'trace') return SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY;
  return SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY;
}

export function selectProofAirlessMoon(bodies = []) {
  const candidates = [];
  for (const body of bodies) {
    if (body?.kind !== 'moon') continue;
    const environment = derivePlanetaryEnvironment(body, bodies);
    if (!environment?.physicalSurfaceExists) continue;
    if (architectureFamilyForEnvironment(environment) !== SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY) continue;
    if (environment.bodyClassId !== 'airless-rocky-moon') continue;
    const pressure = finite(environment.atmospherePressureProxyPa, Infinity);
    const temperature = finite(environment.equilibriumTemperatureK, Infinity);
    if (!(pressure < 1) || !(temperature >= 70 && temperature <= 260)) continue;
    // Favor a clean, temperate-enough vacuum proof case rather than the most extreme moon.
    // Stable body-id tie breaking guarantees deterministic selection without consuming RNG.
    const score = Math.abs(temperature - 150) + pressure * 12;
    candidates.push({ body, environment, score });
  }
  candidates.sort((a, b) => a.score - b.score || String(a.body.id).localeCompare(String(b.body.id)));
  return candidates[0]?.body ?? null;
}

export function selectExplorationRockyWorld(bodies = []) {
  const home = legacyHomeBody(bodies);
  const proof = selectProofAirlessMoon(bodies);
  const candidates = [];
  for (const body of bodies) {
    // v0.1.5.2 intentionally expands to one additional planet, not rogues or every moon.
    if (body?.kind !== 'planet' || body.id === home?.id || body.id === proof?.id || body.planetType === 'gas') continue;
    const environment = derivePlanetaryEnvironment(body, bodies);
    if (!environment?.physicalSurfaceExists) continue;
    if (architectureFamilyForEnvironment(environment) !== SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY) continue;
    const temperature = finite(environment.equilibriumTemperatureK, Infinity);
    const pressure = finite(environment.atmospherePressureProxyPa, Infinity);
    const gravity = finite(environment.surfaceGravityMps2, Infinity);
    if (!(temperature >= 150 && temperature <= 360)) continue;
    if (!(pressure >= 100 && pressure <= 40_000)) continue;
    if (!(gravity >= 2 && gravity <= 25)) continue;
    // Prefer a cold/thin-atmosphere contrast to the established temperate home world.
    const pressureScore = Math.abs(Math.log10(Math.max(1, pressure)) - Math.log10(700)) * 16;
    const score = Math.abs(temperature - 220) + pressureScore + Math.abs(gravity - 9.8) * 1.5;
    candidates.push({ body, score });
  }
  candidates.sort((a, b) => a.score - b.score || String(a.body.id).localeCompare(String(b.body.id)));
  return candidates[0]?.body ?? null;
}

export function selectExplorationIceWorld(bodies = []) {
  const candidates = [];
  for (const body of bodies) {
    // Defer rogue surfaces until their spin model is authoritative enough for body-fixed exploration.
    if (body?.kind !== 'moon' && body?.kind !== 'planet') continue;
    const environment = derivePlanetaryEnvironment(body, bodies);
    if (!environment?.physicalSurfaceExists) continue;
    if (architectureFamilyForEnvironment(environment) !== SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE) continue;
    const temperature = finite(environment.equilibriumTemperatureK, Infinity);
    const pressure = finite(environment.atmospherePressureProxyPa, Infinity);
    const icePotential = finite(environment.icePotential01, 0);
    if (!(temperature >= 35 && temperature <= 190)) continue;
    if (!(pressure >= 0 && pressure <= 500)) continue;
    if (!(icePotential >= 0.5)) continue;
    // Prefer a strongly ice-dominated, low-pressure moon for the first cryogenic reference surface.
    const moonPenalty = body.kind === 'moon' ? 0 : 18;
    const pressurePenalty = Math.log10(1 + pressure) * 5;
    const score = (1 - icePotential) * 100 + Math.abs(temperature - 90) * 0.08 + pressurePenalty + moonPenalty;
    candidates.push({ body, score });
  }
  candidates.sort((a, b) => a.score - b.score || String(a.body.id).localeCompare(String(b.body.id)));
  return candidates[0]?.body ?? null;
}

export function enabledExplorationSurfaceBodies(bodies = []) {
  const selected = [
    legacyHomeBody(bodies),
    selectProofAirlessMoon(bodies),
    selectExplorationRockyWorld(bodies),
    selectExplorationIceWorld(bodies),
  ].filter(Boolean);
  const unique = new Map(selected.map((body) => [body.id, body]));
  return [...unique.values()];
}

export function surfaceEngineSupport(body, bodies = []) {
  if (!body) return {
    enabled: false,
    family: null,
    profileId: null,
    regionId: null,
    reason: 'No body selected.',
  };

  const environment = derivePlanetaryEnvironment(body, bodies);
  const family = architectureFamilyForEnvironment(environment);

  // Explorer v0.1.0.5D expands the already-proven SOL landing bridge to a bounded
  // reference set without changing canonical SOL body flags or the inherited landing state
  // machine. Each world explicitly selects one established surface-engine family while its
  // authoritative mass, radius, gravity, reference environment, rotation and live sky remain
  // canonical. Local terrain is always labeled as a deterministic presentation proxy.
  if (body.referenceSystemId === 'sol') {
    const solProfile = SOL_LANDING_SURFACE_PROFILES[body.id] ?? null;
    if (solProfile) {
      return {
        enabled: true,
        proof: solProfile.proof === true,
        exploration: true,
        solReferenceProof: solProfile.proof === true,
        solReferenceLanding: true,
        family: solProfile.family,
        profileId: solProfile.profileId,
        regionId: solProfile.regionId,
        regionName: solProfile.regionName,
        regionSubtitle: solProfile.regionSubtitle,
        capability: solProfile.capability,
        surfaceStyle: solProfile.surfaceStyle,
        environment,
        reason: solProfile.reason,
      };
    }
  }

  if (body.referenceSystemId === 'sol' || body.surfacePolicy === 'sol-reference-landing-disabled-v1') {
    return {
      enabled: false,
      proof: false,
      exploration: false,
      family,
      profileId: null,
      regionId: null,
      environment,
      reason: 'SOL reference landing remains intentionally disabled for this world until a validated world-specific surface profile is added.',
    };
  }

  if (body.landable && body.surfaceProfile === 'anomalous-showcase-v1') {
    return {
      enabled: true,
      proof: false,
      exploration: true,
      family: SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY,
      profileId: SURFACE_ENGINE_PROFILES.LEGACY_HOME,
      regionId: body.surfaceRegionId ?? 'shatterfall-basin',
      environment,
      reason: 'Existing detailed atmospheric reference surface.',
    };
  }

  const proofMoon = selectProofAirlessMoon(bodies);
  if (proofMoon?.id === body.id) {
    return {
      enabled: true,
      proof: true,
      exploration: true,
      family: SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY,
      profileId: SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY,
      regionId: 'airless-regolith',
      environment,
      reason: 'Airless rocky reference surface.',
    };
  }

  const rockyWorld = selectExplorationRockyWorld(bodies);
  if (rockyWorld?.id === body.id) {
    return {
      enabled: true,
      proof: false,
      exploration: true,
      family: SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY,
      profileId: SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY,
      regionId: 'tenuous-rocky-highland',
      environment,
      reason: 'Cold/tenuous rocky exploration reference surface.',
    };
  }

  const iceWorld = selectExplorationIceWorld(bodies);
  if (iceWorld?.id === body.id) {
    return {
      enabled: true,
      proof: false,
      exploration: true,
      family: SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE,
      profileId: SURFACE_ENGINE_PROFILES.ICE_VOLATILE,
      regionId: 'cryogenic-ice-shelf',
      environment,
      reason: 'Cryogenic ice/volatile exploration reference surface.',
    };
  }

  const profileId = family === SURFACE_ARCHITECTURE_FAMILIES.ICE_VOLATILE
    ? SURFACE_ENGINE_PROFILES.ICE_VOLATILE
    : family === SURFACE_ARCHITECTURE_FAMILIES.AIRLESS_ROCKY
      ? SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY
      : family === SURFACE_ARCHITECTURE_FAMILIES.ATMOSPHERIC_ROCKY
        ? SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY
        : null;

  return {
    enabled: false,
    proof: false,
    exploration: false,
    family,
    profileId,
    regionId: null,
    environment,
    reason: environment?.physicalSurfaceExists
      ? 'Solid surface classified; generalized profile exists architecturally but this world is not enabled in the current exploration set.'
      : environment?.landingReason ?? 'No supported solid surface.',
  };
}

export function surfaceCapabilityForBuild(body, bodies = []) {
  const support = surfaceEngineSupport(body, bodies);
  if (!support.environment) return null;
  if (support.enabled && support.capability) return support.capability;
  if (support.enabled && support.profileId === SURFACE_ENGINE_PROFILES.LEGACY_HOME) return 'DETAILED SURFACE · CURRENT BUILD';
  if (support.enabled && support.proof) return 'AIRLESS REFERENCE SURFACE · CURRENT BUILD';
  if (support.enabled && support.profileId === SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY) return 'ROCKY EXPLORATION SURFACE · CURRENT BUILD';
  if (support.enabled && support.profileId === SURFACE_ENGINE_PROFILES.ICE_VOLATILE) return 'ICE / VOLATILE EXPLORATION SURFACE · CURRENT BUILD';
  if (support.environment.physicalSurfaceExists) return 'SOLID SURFACE · PROFILE ARCHITECTURE READY · LANDING NOT ENABLED';
  return support.environment.surfaceCapability;
}
