import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { hashSeed } from '../util/prng.js';
import { vec3 } from '../physics/vector.js';
import { bulkDensityKgM3 } from '../physics/planetaryProperties.js';

export const SOL_REFERENCE_SEED = 'SOL-J2000';
export const SOL_REFERENCE_EPOCH = 'J2000.0 / JD 2451545.0 TDB';
export const SOL_REFERENCE_DATASET = 'JPL-APPROX-1800-2050 + NASA-NSSDCA-PHYSICAL';

const DEG = Math.PI / 180;

// JPL Solar System Dynamics: Approximate Positions of the Planets, Table 1.
// Elements are evaluated at J2000.0. Earth uses the Earth-Moon barycenter orbital elements;
// until the Moon is added in the next SOL increment, those elements are applied to Earth.
const PLANETS = Object.freeze([
  {
    id: 'planet-mercury', name: 'Mercury', planetType: 'rocky', color: 0x8c8a86,
    mass: 3.30103e23, radius: 2_439_700,
    aAu: 0.38709927, e: 0.20563593, inclinationDeg: 7.00497902, meanLongitudeDeg: 252.25032350, perihelionLongitudeDeg: 77.45779628, ascendingNodeDeg: 48.33076593,
    rotationHours: 1407.6, rotationDirection: 1, obliquityDeg: 0.034,
    environment: { bodyClassId: 'hot-rocky', classLabel: 'HOT ROCKY TERRESTRIAL', surfaceFamily: 'HOT ROCK', bondAlbedo: 0.088, surfacePressurePa: 5e-10, atmosphereClassId: 'airless', atmosphereLabel: 'SURFACE-BOUNDED EXOSPHERE', volatileInventory01: 0.02, icePotential01: 0.02 },
  },
  {
    id: 'planet-venus', name: 'Venus', planetType: 'rocky', color: 0xd8b56f,
    mass: 4.86731e24, radius: 6_051_800,
    aAu: 0.72333566, e: 0.00677672, inclinationDeg: 3.39467605, meanLongitudeDeg: 181.97909950, perihelionLongitudeDeg: 131.60246718, ascendingNodeDeg: 76.67984255,
    rotationHours: 5832.5, rotationDirection: -1, obliquityDeg: 177.36,
    environment: { bodyClassId: 'hot-rocky', classLabel: 'HOT ROCKY TERRESTRIAL', surfaceFamily: 'HOT ROCK', bondAlbedo: 0.77, surfacePressurePa: 9.2e6, atmosphereClassId: 'very-dense', atmosphereLabel: 'VERY DENSE CO₂ ATMOSPHERE', volatileInventory01: 0.12, icePotential01: 0 },
  },
  {
    id: 'planet-earth', name: 'Earth', planetType: 'oceanic', color: 0x3f82ca,
    mass: 5.97217e24, radius: 6_371_000,
    aAu: 1.00000261, e: 0.01671123, inclinationDeg: -0.00001531, meanLongitudeDeg: 100.46457166, perihelionLongitudeDeg: 102.93768193, ascendingNodeDeg: 0,
    rotationHours: 23.9345, rotationDirection: 1, obliquityDeg: 23.4393,
    environment: { bodyClassId: 'rocky-terrestrial', classLabel: 'ROCKY TERRESTRIAL', surfaceFamily: 'ROCK', bondAlbedo: 0.294, surfacePressurePa: 101_325, atmosphereClassId: 'substantial', atmosphereLabel: 'N₂/O₂ ATMOSPHERE', volatileInventory01: 0.78, icePotential01: 0.10 },
  },
  {
    id: 'planet-mars', name: 'Mars', planetType: 'desert', color: 0xb96543,
    mass: 6.41691e23, radius: 3_389_500,
    aAu: 1.52371034, e: 0.09339410, inclinationDeg: 1.84969142, meanLongitudeDeg: -4.55343205, perihelionLongitudeDeg: -23.94362959, ascendingNodeDeg: 49.55953891,
    rotationHours: 24.6229, rotationDirection: 1, obliquityDeg: 25.19,
    environment: { bodyClassId: 'dry-rocky', classLabel: 'DRY ROCKY TERRESTRIAL', surfaceFamily: 'DRY ROCK', bondAlbedo: 0.25, surfacePressurePa: 636, atmosphereClassId: 'tenuous', atmosphereLabel: 'TENUOUS CO₂ ATMOSPHERE', volatileInventory01: 0.18, icePotential01: 0.22 },
  },
  {
    id: 'planet-jupiter', name: 'Jupiter', planetType: 'gas', color: 0xb99772,
    mass: 1.898125e27, radius: 69_911_000,
    aAu: 5.20288700, e: 0.04838624, inclinationDeg: 1.30439695, meanLongitudeDeg: 34.39644051, perihelionLongitudeDeg: 14.72847983, ascendingNodeDeg: 100.47390909,
    rotationHours: 9.925, rotationDirection: 1, obliquityDeg: 3.13,
    environment: { bodyClassId: 'gas-giant', classLabel: 'GAS GIANT', surfaceFamily: 'FLUID GAS ENVELOPE', bondAlbedo: 0.343, surfacePressurePa: null, atmosphereClassId: 'deep-envelope', atmosphereLabel: 'DEEP H/HE ENVELOPE', volatileInventory01: 1, icePotential01: 0 },
  },
  {
    id: 'planet-saturn', name: 'Saturn', planetType: 'gas', color: 0xd8c28b,
    mass: 5.68317e26, radius: 58_232_000,
    aAu: 9.53667594, e: 0.05386179, inclinationDeg: 2.48599187, meanLongitudeDeg: 49.95424423, perihelionLongitudeDeg: 92.59887831, ascendingNodeDeg: 113.66242448,
    rotationHours: 10.656, rotationDirection: 1, obliquityDeg: 26.73,
    environment: { bodyClassId: 'gas-giant', classLabel: 'GAS GIANT', surfaceFamily: 'FLUID GAS ENVELOPE', bondAlbedo: 0.342, surfacePressurePa: null, atmosphereClassId: 'deep-envelope', atmosphereLabel: 'DEEP H/HE ENVELOPE', volatileInventory01: 1, icePotential01: 0 },
  },
  {
    id: 'planet-uranus', name: 'Uranus', planetType: 'gas', color: 0x83c6cf,
    mass: 8.68103e25, radius: 25_362_000,
    aAu: 19.18916464, e: 0.04725744, inclinationDeg: 0.77263783, meanLongitudeDeg: 313.23810451, perihelionLongitudeDeg: 170.95427630, ascendingNodeDeg: 74.01692503,
    rotationHours: 17.24, rotationDirection: -1, obliquityDeg: 97.77,
    environment: { bodyClassId: 'gas-giant', classLabel: 'ICE GIANT', surfaceFamily: 'FLUID GAS ENVELOPE', bondAlbedo: 0.300, surfacePressurePa: null, atmosphereClassId: 'deep-envelope', atmosphereLabel: 'DEEP H/HE/ICE-GIANT ENVELOPE', volatileInventory01: 1, icePotential01: 0 },
  },
  {
    id: 'planet-neptune', name: 'Neptune', planetType: 'gas', color: 0x4169b2,
    mass: 1.02410e26, radius: 24_622_000,
    aAu: 30.06992276, e: 0.00859048, inclinationDeg: 1.77004347, meanLongitudeDeg: -55.12002969, perihelionLongitudeDeg: 44.96476227, ascendingNodeDeg: 131.78422574,
    rotationHours: 16.11, rotationDirection: 1, obliquityDeg: 28.32,
    environment: { bodyClassId: 'gas-giant', classLabel: 'ICE GIANT', surfaceFamily: 'FLUID GAS ENVELOPE', bondAlbedo: 0.290, surfacePressurePa: null, atmosphereClassId: 'deep-envelope', atmosphereLabel: 'DEEP H/HE/ICE-GIANT ENVELOPE', volatileInventory01: 1, icePotential01: 0 },
  },
]);

function solveEccentricAnomaly(meanAnomaly, eccentricity) {
  let eccentricAnomaly = meanAnomaly + eccentricity * Math.sin(meanAnomaly);
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const f = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
    const derivative = 1 - eccentricity * Math.cos(eccentricAnomaly);
    const delta = f / derivative;
    eccentricAnomaly -= delta;
    if (Math.abs(delta) < 1e-14) break;
  }
  return eccentricAnomaly;
}

function rotatePerifocal(xPrime, yPrime, omega, inclination, ascendingNode) {
  const cw = Math.cos(omega), sw = Math.sin(omega);
  const cO = Math.cos(ascendingNode), sO = Math.sin(ascendingNode);
  const cI = Math.cos(inclination), sI = Math.sin(inclination);
  const xEcl = (cw * cO - sw * sO * cI) * xPrime + (-sw * cO - cw * sO * cI) * yPrime;
  const yEcl = (cw * sO + sw * cO * cI) * xPrime + (-sw * sO + cw * cO * cI) * yPrime;
  const zEcl = (sw * sI) * xPrime + (cw * sI) * yPrime;
  // Universe Lab/Explorer uses X-Z as the reference orbital plane with prograde angular
  // momentum toward -Y. Map J2000 ecliptic (x,y,z) -> world (x,z,-y) to preserve that contract.
  return vec3(xEcl, zEcl, -yEcl);
}

function j2000State(definition, centralMass) {
  const a = definition.aAu * PHYSICS.AU;
  const e = definition.e;
  const inclination = definition.inclinationDeg * DEG;
  const ascendingNode = definition.ascendingNodeDeg * DEG;
  const longitudePerihelion = definition.perihelionLongitudeDeg * DEG;
  const omega = longitudePerihelion - ascendingNode;
  const meanAnomaly = (definition.meanLongitudeDeg - definition.perihelionLongitudeDeg) * DEG;
  const E = solveEccentricAnomaly(meanAnomaly, e);
  const cosE = Math.cos(E), sinE = Math.sin(E);
  const root = Math.sqrt(1 - e * e);
  const xPrime = a * (cosE - e);
  const yPrime = a * root * sinE;
  const mu = PHYSICS.G * (centralMass + definition.mass);
  const meanMotion = Math.sqrt(mu / (a ** 3));
  const eDot = meanMotion / (1 - e * cosE);
  const vxPrime = -a * sinE * eDot;
  const vyPrime = a * root * cosE * eDot;
  return {
    position: rotatePerifocal(xPrime, yPrime, omega, inclination, ascendingNode),
    velocity: rotatePerifocal(vxPrime, vyPrime, omega, inclination, ascendingNode),
  };
}

function normalized3(source, fallback = [0, -1, 0]) {
  const magnitude = Math.hypot(source[0], source[1], source[2]);
  if (!(magnitude > 1e-12)) return [...fallback];
  return source.map((value) => value / magnitude);
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function orbitalNormal(position, velocity) {
  return normalized3(cross3(position, velocity));
}

function tiltedAxis(referenceAxis, tiltRad) {
  const axis = normalized3(referenceAxis);
  const reference = Math.abs(axis[1]) < 0.94 ? [0, 1, 0] : [1, 0, 0];
  const tangent = normalized3(cross3(reference, axis), [1, 0, 0]);
  return normalized3([
    axis[0] * Math.cos(tiltRad) + tangent[0] * Math.sin(tiltRad),
    axis[1] * Math.cos(tiltRad) + tangent[1] * Math.sin(tiltRad),
    axis[2] * Math.cos(tiltRad) + tangent[2] * Math.sin(tiltRad),
  ]);
}

function shiftToBarycentricFrame(bodies) {
  let totalMass = 0, cx = 0, cy = 0, cz = 0, cvx = 0, cvy = 0, cvz = 0;
  for (const body of bodies) {
    totalMass += body.mass;
    cx += body.mass * body.position[0]; cy += body.mass * body.position[1]; cz += body.mass * body.position[2];
    cvx += body.mass * body.velocity[0]; cvy += body.mass * body.velocity[1]; cvz += body.mass * body.velocity[2];
  }
  cx /= totalMass; cy /= totalMass; cz /= totalMass;
  cvx /= totalMass; cvy /= totalMass; cvz /= totalMass;
  for (const body of bodies) {
    body.position[0] -= cx; body.position[1] -= cy; body.position[2] -= cz;
    body.velocity[0] -= cvx; body.velocity[1] -= cvy; body.velocity[2] -= cvz;
  }
}

export function generateSolSystem() {
  const sun = {
    id: 'star-0', kind: BODY_KIND.STAR, name: 'Sun',
    mass: PHYSICS.SOLAR_MASS, radius: PHYSICS.SOLAR_RADIUS,
    temperatureK: 5772, luminositySolar: 1, spectralClass: 'G', color: 0xffdfaa,
    position: vec3(0, 0, 0), velocity: vec3(0, 0, 0), gravitySource: true, generated: false,
    referenceSystemId: 'sol', referenceDataset: SOL_REFERENCE_DATASET, referenceEpoch: SOL_REFERENCE_EPOCH,
  };

  const bodies = [sun];
  for (const definition of PLANETS) {
    const state = j2000State(definition, sun.mass);
    const progradeNormal = orbitalNormal(state.position, state.velocity);
    const effectiveTilt = definition.rotationDirection < 0
      ? (180 - definition.obliquityDeg) * DEG
      : definition.obliquityDeg * DEG;
    const rotationAxisInertial = tiltedAxis(progradeNormal, effectiveTilt);
    const planet = {
      id: definition.id,
      kind: BODY_KIND.PLANET,
      name: definition.name,
      planetType: definition.planetType,
      mass: definition.mass,
      radius: definition.radius,
      densityKgM3: bulkDensityKgM3(definition.mass, definition.radius),
      physicalPropertyModel: 'sol-reference-bulk-v1',
      semiMajorAxis: definition.aAu * PHYSICS.AU,
      eccentricity: definition.e,
      inclinationRad: definition.inclinationDeg * DEG,
      color: definition.color,
      position: state.position,
      velocity: state.velocity,
      gravitySource: true,
      generated: false,
      landable: false,
      homeCandidate: definition.id === 'planet-earth',
      surfaceProfile: 'orbital-only',
      surfaceRegionId: null,
      surfacePolicy: 'sol-reference-landing-disabled-v1',
      rotationPeriodSeconds: definition.rotationHours * 3600,
      rotationDirection: definition.rotationDirection,
      rotationAxisInertial,
      rotationPhaseRad: 0,
      rotationEpochSeconds: 0,
      axialTiltRad: definition.obliquityDeg * DEG,
      rotationModel: 'sol-reference-spin-v1',
      environmentModelVersion: 'sol-reference-environment-v1',
      environmentFormationModel: 'observational-reference-v1',
      referenceEnvironment: { ...definition.environment },
      referenceSystemId: 'sol',
      referenceDataset: SOL_REFERENCE_DATASET,
      referenceEpoch: SOL_REFERENCE_EPOCH,
      referenceOrbit: {
        semiMajorAxisAu: definition.aAu,
        eccentricity: definition.e,
        inclinationDeg: definition.inclinationDeg,
        meanLongitudeDeg: definition.meanLongitudeDeg,
        longitudeOfPerihelionDeg: definition.perihelionLongitudeDeg,
        longitudeOfAscendingNodeDeg: definition.ascendingNodeDeg,
      },
    };
    bodies.push(planet);
  }

  shiftToBarycentricFrame(bodies);

  return {
    schemaVersion: 1,
    seed: SOL_REFERENCE_SEED,
    generationProfileId: 'sol',
    seedHash: hashSeed(SOL_REFERENCE_SEED),
    starName: 'Sun',
    homeId: 'planet-earth',
    bodies,
    phenomena: [],
    metadata: {
      generatedAtRuntime: false,
      fixedReferenceSystem: true,
      generationProfileId: 'sol',
      generationProfileLabel: 'SOL — reference Solar System',
      generationProfileScientificStatus: 'Fixed J2000 reference foundation using JPL approximate planetary orbital elements and NASA/NSSDCA bulk physical values. No procedural planets, moons, comets, rogues, anomalies, or landing surfaces are injected.',
      mobileVisualParticleBudget: 40_000,
      starSpectralClass: 'G',
      starTemperatureK: 5772,
      luminositySolar: 1,
      habitableZoneProxyMeters: PHYSICS.AU,
      snowLineMeters: 2.7 * PHYSICS.AU,
      planetCount: 8,
      moonCount: 0,
      cometCount: 0,
      roguePlanetCount: 0,
      compactCompanionCount: 0,
      phenomenonCount: 0,
      anomalyCount: 0,
      landablePlanetCount: 0,
      physicalPropertyModel: 'sol-reference-bulk-v1',
      rotationModel: 'sol-reference-spin-v1',
      planetaryEnvironmentModel: 'sol-reference-environment-v1',
      referenceEpoch: SOL_REFERENCE_EPOCH,
      referenceDataset: SOL_REFERENCE_DATASET,
      scientificModel: 'Newtonian finite-radius N-body evolution initialized from a fixed J2000 major-planet reference state. Planetary positions are low-precision JPL Keplerian reference positions rather than a Horizons ephemeris; Earth currently uses Earth-Moon-barycenter orbital elements because the Moon is intentionally deferred to the next SOL increment.',
    },
  };
}
