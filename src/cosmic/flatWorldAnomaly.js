import { PHYSICS } from '../core/constants.js';

export const FLAT_WORLD_ANOMALY_ID = 'anomaly-flat-earth-firmament';

const BASE_DEFINITION = Object.freeze({
  id: FLAT_WORLD_ANOMALY_ID,
  kind: 'anomaly-flat-world',
  anomaly: true,
  anomalyFamily: 'flat-world-firmament',
  label: 'FLAT EARTH [ANOMALY]',
  position: Object.freeze([88 * PHYSICS.AU, 42 * PHYSICS.AU, -64 * PHYSICS.AU]),
  velocity: Object.freeze([0, 0, 0]),
  radiusMeters: 1.18e9,
  outerRadiusMeters: 1.18e9,
  discRadiusMeters: 4.5e8,
  discThicknessMeters: 5.4e7,
  treeTopMeters: 5.8e8,
  rootDepthMeters: 3.8e8,
  firmamentApexMeters: 9.4e8,
  firmamentHalfBaseMeters: 6.3e8,
  pathHalfHeightMeters: 7.25e8,
  pathHalfWidthMeters: 3.25e8,
  localSunRadiusMeters: 2.9e7,
  localMoonRadiusMeters: 2.2e7,
  localCycleSeconds: 180,
  realityClass: 'impossible',
  detectionClass: 'structured mythic-cosmology visual',
  stability: 'fixed frame with internally animated local luminaries',
  scanSummary: 'A massless visual anomaly built as a flat world disc inside a transparent four-sided firmament, with a central world tree and local Sun/Moon traveling a fixed figure-eight path.',
  scientificStatus: 'INTENTIONALLY FICTIONAL. This object is a visual anomaly only: it contributes no gravity, does not replace Earth, and has no physical atmosphere or terrain physics. FW2 adds a presentation-only disc-top observation viewpoint so the local Sun/Moon figure-eight can be viewed from inside the firmament; the spacecraft is not physically landed or teleported by that view, and local lighting remains isolated from the Solar System lighting model.',
  surfaceObservationEnabled: true,
  surfaceObservationMode: 'presentation-only-disc-top',
  navigable: true,
  mapPriority: 5,
  alwaysIdentified: true,
  visualOnly: true,
  gravitySource: false,
  lightingModel: 'isolated-local-sun-moon',
});

export function createFlatWorldAnomalyDefinition() {
  return {
    ...BASE_DEFINITION,
    position: [...BASE_DEFINITION.position],
    velocity: [...BASE_DEFINITION.velocity],
  };
}

export function withFlatWorldAnomaly(definitions = []) {
  const existing = Array.isArray(definitions) ? definitions : [];
  return [
    createFlatWorldAnomalyDefinition(),
    ...existing.filter((entry) => entry?.id !== FLAT_WORLD_ANOMALY_ID),
  ];
}
