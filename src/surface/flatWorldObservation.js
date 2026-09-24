import { FLAT_WORLD_ANOMALY_ID } from '../cosmic/flatWorldAnomaly.js';

export const FLAT_WORLD_OBSERVATION_REGION_ID = `${FLAT_WORLD_ANOMALY_ID}:observation-deck`;

export function supportsFlatWorldObservation(definition) {
  return definition?.id === FLAT_WORLD_ANOMALY_ID
    && definition?.kind === 'anomaly-flat-world'
    && definition?.surfaceObservationEnabled !== false;
}

export function createFlatWorldObservationRegion(definition) {
  if (!supportsFlatWorldObservation(definition)) throw new Error('Flat World observation surface is unavailable for this source.');
  return {
    id: FLAT_WORLD_OBSERVATION_REGION_ID,
    regionKey: 'firmament-observation-deck',
    bodyId: definition.id,
    bodyName: definition.label ?? 'FLAT EARTH [ANOMALY]',
    name: 'Firmament Observation Deck',
    subtitle: 'Presentation-only disc-top viewpoint',
    observerOnly: true,
    flatWorldObservation: true,
    surfaceObservationMode: definition.surfaceObservationMode ?? 'presentation-only-disc-top',
    surfaceStyle: 'flat-world-anomaly-observation',
    surfaceEngineProfile: 'flat-world-observation-v1',
    surfaceModelVersion: 1,
    flatWorldDefinition: {
      ...definition,
      position: Array.isArray(definition.position) ? [...definition.position] : definition.position,
      velocity: Array.isArray(definition.velocity) ? [...definition.velocity] : definition.velocity,
    },
    // The normal procedural terrain engine is intentionally bypassed. These fields keep the
    // existing surface-session/HUD contracts valid while the dedicated renderer owns geometry.
    terrainSizeMeters: Math.max(1, Number(definition.discRadiusMeters) || 1) * 2,
    terrainResolution: 1,
    landing: { x: 0, z: 0, yaw: 0 },
    landedShip: { x: 0, z: 0, yaw: 0 },
    gravityMps2: 0,
    temperatureK: 288,
    atmosphereMode: 'airless',
    atmosphereAtmProxy: 0,
    atmospherePressurePa: 0,
    weatherEnabled: false,
    palette: {
      name: 'Firmament Interior',
      ground: [0.10, 0.25, 0.34],
      rock: 0x17130f,
      accent: 0xcceff4,
      skyTop: 0x020611,
      skyHorizon: 0x09162a,
      fog: 0x020611,
    },
    observationPose: {
      radiusFraction: 0.62,
      azimuthRad: 0.62,
      eyeHeightRenderUnits: 0.24,
      initialPitchRad: 0.20,
    },
    scientificStatus: 'PRESENTATION-ONLY ANOMALY VIEW. This disc-top viewpoint adds no gravity, atmosphere, collision, terrain physics or claim of a physical flat-world model. The local Sun and Moon remain scripted visual luminaries on the anomaly figure-eight path; the spacecraft is not teleported or landed physically.',
  };
}
