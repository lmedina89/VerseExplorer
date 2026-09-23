import { derivePlanetaryEnvironment } from '../physics/planetaryEnvironment.js';
import { captureBodyFixedSurfaceAnchor, hasPhysicalRotationModel, inertialDirectionToBodyFixed } from '../core/planetaryRotation.js';
import { PHYSICS } from '../core/constants.js';
import { hashSeed } from '../util/prng.js';

export const SURFACE_SKY_PROFILE_ID = 'sol-reference-sky-observer-v1';

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalize3(source, fallback = [1, 0, 0]) {
  const x = finite(source?.[0]);
  const y = finite(source?.[1]);
  const z = finite(source?.[2]);
  const m = Math.hypot(x, y, z);
  if (!(m > 1e-12)) return [...fallback];
  return [x / m, y / m, z / m];
}

function rgb01FromHex(hex, scale = 1) {
  const value = Number(hex) >>> 0;
  return [
    Math.max(0, Math.min(1, (((value >> 16) & 255) / 255) * scale)),
    Math.max(0, Math.min(1, (((value >> 8) & 255) / 255) * scale)),
    Math.max(0, Math.min(1, ((value & 255) / 255) * scale)),
  ];
}

export function surfaceSkyObserverSupport(body, bodies = []) {
  if (!body) return { enabled: false, reason: 'Select a body first.', environment: null };
  const environment = derivePlanetaryEnvironment(body, bodies);
  if (body.referenceSystemId !== 'sol') return {
    enabled: false,
    reason: 'Reference surface-sky observer mode is currently enabled only for the fixed SOL profile.',
    environment,
  };
  if (!environment?.physicalSurfaceExists) return {
    enabled: false,
    reason: environment?.landingReason ?? 'This body has no physical solid surface for a surface observer.',
    environment,
  };
  if (!hasPhysicalRotationModel(body)) return {
    enabled: false,
    reason: 'A physical body-rotation model is required for a body-fixed surface sky.',
    environment,
  };
  return {
    enabled: true,
    reason: 'Body-fixed SOL reference sky observer available. Terrain remains schematic and landing remains disabled.',
    environment,
  };
}

export function defaultSurfaceSkyAnchor(body, bodies = [], shipPosition = null, simulationTimeSeconds = 0) {
  if (!body) return [1, 0, 0];
  const parent = body.parentId ? bodies.find((candidate) => candidate?.id === body.parentId) : null;
  if (parent?.position && body?.position) {
    const towardParent = [
      finite(parent.position[0]) - finite(body.position[0]),
      finite(parent.position[1]) - finite(body.position[1]),
      finite(parent.position[2]) - finite(body.position[2]),
    ];
    const bodyFixed = inertialDirectionToBodyFixed(body, towardParent, simulationTimeSeconds, new Float64Array(3));
    return normalize3(bodyFixed);
  }
  if (shipPosition && body?.position) {
    const anchor = captureBodyFixedSurfaceAnchor(body, shipPosition, simulationTimeSeconds, new Float64Array(3));
    return normalize3(anchor);
  }
  return [1, 0, 0];
}

export function createSurfaceSkyObserverRegion(system, body, bodies = system?.bodies ?? []) {
  if (!system?.seed || !body?.id) throw new Error('Surface sky observer requires a generated system and body.');
  const support = surfaceSkyObserverSupport(body, bodies);
  if (!support.enabled) throw new Error(support.reason);
  const environment = support.environment;
  const pressurePa = Math.max(0, finite(environment?.atmospherePressureProxyPa, finite(body?.referenceEnvironment?.surfacePressurePa, 0)));
  const pressureAtm = pressurePa / 101325;
  const airless = pressurePa < 1;
  const gravityMps2 = finite(environment?.surfaceGravityMps2, PHYSICS.G * finite(body.mass) / Math.max(1, finite(body.radius) ** 2));
  const temperatureK = finite(environment?.currentEquilibriumTemperatureK, finite(environment?.equilibriumTemperatureK, 220));
  const ground = rgb01FromHex(body.color ?? 0x777777, body.planetType === 'ice' ? 0.82 : 0.58);
  const regionKey = 'reference-sky-observer';
  const regionSeed = `${system.seed}:${body.id}:${regionKey}:v1`;
  return {
    version: 1,
    surfaceModelVersion: 1,
    surfaceEngineProfile: SURFACE_SKY_PROFILE_ID,
    surfaceArchitectureFamily: 'REFERENCE_SKY_OBSERVER',
    observerOnly: true,
    terrainReality: 'SCHEMATIC / NOT A REAL SURFACE MAP',
    atmosphereMode: airless ? 'airless' : pressurePa < 100 ? 'trace' : 'atmospheric',
    atmospherePressurePa: pressurePa,
    atmosphereAtmProxy: pressureAtm,
    weatherEnabled: false,
    anomalyVisualsEnabled: false,
    skyMode: 'canonical-sol-reference-sky',
    id: `${body.id}:${regionKey}`,
    regionKey,
    seed: regionSeed,
    seedHash: hashSeed(regionSeed),
    bodyId: body.id,
    bodyName: body.name,
    name: 'Reference Sky Observatory',
    subtitle: 'Body-fixed astronomical observer · schematic local horizon',
    planetType: body.planetType ?? 'rocky',
    gravityMps2,
    temperatureK,
    temperatureModel: 'reference-environment / radiative foundation',
    fogDensityProxy: 0,
    ambientSkyIntensity: airless ? 0.01 : 0.08,
    terrainSizeMeters: 24000,
    terrainResolution: 2,
    materialRoughness: 1,
    materialMetalness: 0,
    palette: {
      name: 'REFERENCE SKY · SCHEMATIC HORIZON',
      skyTop: 0x000000,
      skyHorizon: 0x000000,
      fog: 0x000000,
      ground,
      rock: body.color ?? 0x777777,
      accent: body.color ?? 0x999999,
      atmosphere: pressureAtm,
    },
    landing: { x: 0, z: 0, yaw: 0 },
    landedShip: null,
    terrain: {
      roughness: 0,
      broadAmplitude: 0,
      mediumAmplitude: 0,
      ridgeAmplitude: 0,
      baseOffset: 0,
      crater: { x: 1e9, z: 1e9, radius: 1, depth: 0 },
      ridge: { x: 1e9, z: 1e9 },
      glassBasin: { x: 1e9, z: 1e9 },
    },
    zones: {
      frost: { x: 1e9, z: 1e9, radius: 1 },
      ember: { x: 1e9, z: 1e9, radius: 1 },
      glass: { x: 1e9, z: 1e9, radius: 1 },
      mineral: { x: 1e9, z: 1e9, radius: 1 },
    },
    weatherProfile: { enabled: false, anomalyChance: 0, allowedTypes: [], preferred: [], firstEventMinSeconds: 1e12, firstEventMaxSeconds: 1e12, calmMinSeconds: 1e12, calmMaxSeconds: 1e12 },
    normalPois: [],
    anomalies: [],
    scientificStatus: 'SOL reference surface-sky observer. Celestial positions, angular sizes, phases, rotation, horizon geometry and finite-disk occultations come from the live authoritative system. The local ground is intentionally a schematic flat horizon and is not a claim about real terrain, geology or landing capability.',
  };
}
