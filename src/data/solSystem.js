import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { hashSeed } from '../util/prng.js';
import { vec3 } from '../physics/vector.js';
import { bulkDensityKgM3 } from '../physics/planetaryProperties.js';

export const SOL_REFERENCE_SEED = 'SOL-J2000';
export const SOL_REFERENCE_EPOCH = 'J2000.0 / JD 2451545.0 TDB';
export const SOL_REFERENCE_DATASET = 'JPL-APPROX-1800-2050 + JPL-SAT-MEAN-ELEMENTS-J2000 + JPL-SAT-PHYSICAL + NASA-NSSDCA-PHYSICAL';

const DEG = Math.PI / 180;
const J2000_OBLIQUITY_RAD = 23.439291111 * DEG;

// JPL Solar System Dynamics: Approximate Positions of the Planets, Table 1.
// Elements are evaluated at J2000.0. Earth uses the Earth-Moon barycenter orbital elements.
// v0.1.0.4B resolves that barycenter into Earth + Moon while preserving the subsystem COM.
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



// JPL Planetary Satellite Mean Elements, epoch 2000-01-01.5 TDB.
// Moon elements are ecliptic. The outer-planet satellites are referred to their local
// Laplace planes; JPL's listed Laplace-plane pole R.A./Dec. is transformed from J2000
// equatorial coordinates into the Explorer world frame before the Kepler state is built.
// Masses derive from JPL GM values using the simulation's authoritative G.
const MOONS = Object.freeze([
  {
    id: 'moon-luna', parentId: 'planet-earth', name: 'Moon', planetType: 'rocky', color: 0xb9b8b3,
    gmKm3S2: 4902.800, radius: 1_737_400,
    aKm: 384_400, e: 0.0554, argumentPeriapsisDeg: 318.15, meanAnomalyDeg: 135.27, inclinationDeg: 5.16, ascendingNodeDeg: 125.08, periodDays: 27.322,
    elementFrame: 'ecliptic',
    environment: { bodyClassId: 'airless-rocky-moon', classLabel: 'AIRLESS ROCKY MOON', surfaceFamily: 'ROCK', bondAlbedo: 0.11, surfacePressurePa: 0, atmosphereClassId: 'airless', atmosphereLabel: 'SURFACE-BOUNDED EXOSPHERE', volatileInventory01: 0.08, icePotential01: 0.12 },
  },
  {
    id: 'moon-io', parentId: 'planet-jupiter', name: 'Io', planetType: 'rocky', color: 0xd9c06a,
    gmKm3S2: 5959.91547, radius: 1_821_490,
    aKm: 421_800, e: 0.004, argumentPeriapsisDeg: 49.1, meanAnomalyDeg: 330.9, inclinationDeg: 0.0, ascendingNodeDeg: 0.0, periodDays: 1.762732,
    elementFrame: 'laplace', laplacePoleRaDeg: 268.1, laplacePoleDecDeg: 64.5,
    environment: { bodyClassId: 'airless-rocky-moon', classLabel: 'VOLCANIC ROCKY MOON', surfaceFamily: 'SULFUR-RICH ROCK', bondAlbedo: 0.63, surfacePressurePa: 1e-4, atmosphereClassId: 'airless', atmosphereLabel: 'TENUOUS SO₂ EXOSPHERE', volatileInventory01: 0.06, icePotential01: 0.0, representativeAtmosphereMolecularMassAmu: 64 },
  },
  {
    id: 'moon-europa', parentId: 'planet-jupiter', name: 'Europa', planetType: 'ice', color: 0xc8b996,
    gmKm3S2: 3202.71210, radius: 1_560_800,
    aKm: 671_100, e: 0.009, argumentPeriapsisDeg: 45.0, meanAnomalyDeg: 345.4, inclinationDeg: 0.5, ascendingNodeDeg: 184.0, periodDays: 3.525463,
    elementFrame: 'laplace', laplacePoleRaDeg: 268.1, laplacePoleDecDeg: 64.5,
    environment: { bodyClassId: 'ice-rich-moon', classLabel: 'ICE-RICH MOON', surfaceFamily: 'ICE / ROCK', bondAlbedo: 0.67, surfacePressurePa: 1e-6, atmosphereClassId: 'airless', atmosphereLabel: 'TENUOUS O₂ EXOSPHERE', volatileInventory01: 0.92, icePotential01: 0.98, representativeAtmosphereMolecularMassAmu: 32 },
  },
  {
    id: 'moon-ganymede', parentId: 'planet-jupiter', name: 'Ganymede', planetType: 'ice', color: 0x9b9489,
    gmKm3S2: 9887.83275, radius: 2_631_200,
    aKm: 1_070_400, e: 0.001, argumentPeriapsisDeg: 198.3, meanAnomalyDeg: 324.8, inclinationDeg: 0.2, ascendingNodeDeg: 58.5, periodDays: 7.155588,
    elementFrame: 'laplace', laplacePoleRaDeg: 268.2, laplacePoleDecDeg: 64.6,
    environment: { bodyClassId: 'ice-rich-moon', classLabel: 'ICE-RICH MOON', surfaceFamily: 'ICE / ROCK', bondAlbedo: 0.43, surfacePressurePa: 1e-7, atmosphereClassId: 'airless', atmosphereLabel: 'TENUOUS O₂ EXOSPHERE', volatileInventory01: 0.75, icePotential01: 0.82, representativeAtmosphereMolecularMassAmu: 32 },
  },
  {
    id: 'moon-callisto', parentId: 'planet-jupiter', name: 'Callisto', planetType: 'ice', color: 0x77716b,
    gmKm3S2: 7179.28340, radius: 2_410_300,
    aKm: 1_882_700, e: 0.007, argumentPeriapsisDeg: 43.8, meanAnomalyDeg: 87.4, inclinationDeg: 0.3, ascendingNodeDeg: 309.1, periodDays: 16.690440,
    elementFrame: 'laplace', laplacePoleRaDeg: 268.7, laplacePoleDecDeg: 64.8,
    environment: { bodyClassId: 'ice-rich-moon', classLabel: 'ICE-RICH MOON', surfaceFamily: 'ICE / ROCK', bondAlbedo: 0.22, surfacePressurePa: 8e-7, atmosphereClassId: 'airless', atmosphereLabel: 'TENUOUS CO₂/O₂ EXOSPHERE', volatileInventory01: 0.68, icePotential01: 0.72, representativeAtmosphereMolecularMassAmu: 32 },
  },
  {
    id: 'moon-titan', parentId: 'planet-saturn', name: 'Titan', planetType: 'ice', color: 0xd09b4d,
    gmKm3S2: 8978.13710, radius: 2_574_760,
    aKm: 1_221_900, e: 0.029, argumentPeriapsisDeg: 78.3, meanAnomalyDeg: 11.7, inclinationDeg: 0.3, ascendingNodeDeg: 78.6, periodDays: 15.945448,
    elementFrame: 'laplace', laplacePoleRaDeg: 36.4, laplacePoleDecDeg: 84.0,
    environment: { bodyClassId: 'volatile-rich-moon', classLabel: 'VOLATILE-RICH MOON', surfaceFamily: 'ICE / ORGANIC-RICH ROCK', bondAlbedo: 0.22, surfacePressurePa: 146_700, atmosphereClassId: 'substantial', atmosphereLabel: 'DENSE N₂/CH₄ ATMOSPHERE', volatileInventory01: 0.98, icePotential01: 0.90, representativeAtmosphereMolecularMassAmu: 28 },
  },
  {
    id: 'moon-triton', parentId: 'planet-neptune', name: 'Triton', planetType: 'ice', color: 0xc6cbd2,
    gmKm3S2: 1428.49546, radius: 1_352_600,
    aKm: 354_800, e: 0.0, argumentPeriapsisDeg: 0.0, meanAnomalyDeg: 63.0, inclinationDeg: 157.3, ascendingNodeDeg: 178.1, periodDays: 5.876994,
    elementFrame: 'laplace', laplacePoleRaDeg: 299.8, laplacePoleDecDeg: 43.1,
    environment: { bodyClassId: 'ice-rich-moon', classLabel: 'CRYOGENIC ICE-RICH MOON', surfaceFamily: 'N₂ ICE / ROCK', bondAlbedo: 0.70, surfacePressurePa: 1.4, atmosphereClassId: 'trace', atmosphereLabel: 'TRACE N₂/CH₄ ATMOSPHERE', volatileInventory01: 0.98, icePotential01: 0.99, representativeAtmosphereMolecularMassAmu: 28 },
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



function massFromGmKm3S2(gmKm3S2) {
  return (gmKm3S2 * 1e9) / PHYSICS.G;
}

function equatorialPoleToWorld(raDeg, decDeg) {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const xEq = Math.cos(dec) * Math.cos(ra);
  const yEq = Math.cos(dec) * Math.sin(ra);
  const zEq = Math.sin(dec);
  const ce = Math.cos(J2000_OBLIQUITY_RAD);
  const se = Math.sin(J2000_OBLIQUITY_RAD);
  const xEcl = xEq;
  const yEcl = ce * yEq + se * zEq;
  const zEcl = -se * yEq + ce * zEq;
  return normalized3([xEcl, zEcl, -yEcl], [0, 1, 0]);
}

function referencePlaneBasis(definition) {
  if (definition.elementFrame === 'ecliptic') {
    return { u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] };
  }
  const n = equatorialPoleToWorld(definition.laplacePoleRaDeg, definition.laplacePoleDecDeg);
  const seed = Math.abs(n[0]) < 0.92 ? [1, 0, 0] : [0, 0, -1];
  const dot = seed[0] * n[0] + seed[1] * n[1] + seed[2] * n[2];
  const u = normalized3([seed[0] - dot * n[0], seed[1] - dot * n[1], seed[2] - dot * n[2]], [1, 0, 0]);
  const v = normalized3(cross3(n, u), [0, 0, -1]);
  return { u, v, n };
}

function rotatePerifocalInBasis(xPrime, yPrime, omega, inclination, ascendingNode, basis) {
  const cw = Math.cos(omega), sw = Math.sin(omega);
  const cO = Math.cos(ascendingNode), sO = Math.sin(ascendingNode);
  const cI = Math.cos(inclination), sI = Math.sin(inclination);
  const xRef = (cw * cO - sw * sO * cI) * xPrime + (-sw * cO - cw * sO * cI) * yPrime;
  const yRef = (cw * sO + sw * cO * cI) * xPrime + (-sw * sO + cw * cO * cI) * yPrime;
  const zRef = (sw * sI) * xPrime + (cw * sI) * yPrime;
  return vec3(
    basis.u[0] * xRef + basis.v[0] * yRef + basis.n[0] * zRef,
    basis.u[1] * xRef + basis.v[1] * yRef + basis.n[1] * zRef,
    basis.u[2] * xRef + basis.v[2] * yRef + basis.n[2] * zRef,
  );
}

function moonRelativeState(definition, parentMass, elapsedSeconds = 0) {
  const mass = massFromGmKm3S2(definition.gmKm3S2);
  const a = definition.aKm * 1000;
  const e = definition.e;
  const mu = PHYSICS.G * (parentMass + mass);
  const meanMotion = Math.sqrt(mu / (a ** 3));
  const meanAnomaly = definition.meanAnomalyDeg * DEG + meanMotion * Math.max(0, Number(elapsedSeconds) || 0);
  const E = solveEccentricAnomaly(meanAnomaly, e);
  const cosE = Math.cos(E), sinE = Math.sin(E);
  const root = Math.sqrt(1 - e * e);
  const xPrime = a * (cosE - e);
  const yPrime = a * root * sinE;
  const eDot = meanMotion / (1 - e * cosE);
  const vxPrime = -a * sinE * eDot;
  const vyPrime = a * root * cosE * eDot;
  const basis = referencePlaneBasis(definition);
  return {
    mass,
    position: rotatePerifocalInBasis(xPrime, yPrime, definition.argumentPeriapsisDeg * DEG, definition.inclinationDeg * DEG, definition.ascendingNodeDeg * DEG, basis),
    velocity: rotatePerifocalInBasis(vxPrime, vyPrime, definition.argumentPeriapsisDeg * DEG, definition.inclinationDeg * DEG, definition.ascendingNodeDeg * DEG, basis),
  };
}

function moonBody(definition, parent, relativeState) {
  const rotationAxisInertial = orbitalNormal(relativeState.position, relativeState.velocity);
  return {
    id: definition.id,
    kind: BODY_KIND.MOON,
    parentId: definition.parentId,
    name: definition.name,
    planetType: definition.planetType,
    mass: relativeState.mass,
    radius: definition.radius,
    densityKgM3: bulkDensityKgM3(relativeState.mass, definition.radius),
    physicalPropertyModel: 'sol-reference-bulk-v1',
    semiMajorAxis: definition.aKm * 1000,
    eccentricity: definition.e,
    inclinationRad: definition.inclinationDeg * DEG,
    color: definition.color,
    position: vec3(parent.position[0] + relativeState.position[0], parent.position[1] + relativeState.position[1], parent.position[2] + relativeState.position[2]),
    velocity: vec3(parent.velocity[0] + relativeState.velocity[0], parent.velocity[1] + relativeState.velocity[1], parent.velocity[2] + relativeState.velocity[2]),
    gravitySource: true,
    generated: false,
    landable: false,
    homeCandidate: false,
    surfaceProfile: 'orbital-only',
    surfaceRegionId: null,
    surfacePolicy: 'sol-reference-landing-disabled-v1',
    rotationPeriodSeconds: definition.periodDays * PHYSICS.DAY,
    rotationDirection: 1,
    rotationAxisInertial,
    rotationPhaseRad: 0,
    rotationEpochSeconds: 0,
    axialTiltRad: 0,
    rotationModel: 'sol-reference-synchronous-spin-v1',
    environmentModelVersion: 'sol-reference-environment-v1',
    environmentFormationModel: 'observational-reference-v1',
    referenceEnvironment: { ...definition.environment, physicalSurfaceExists: true },
    referenceSystemId: 'sol',
    referenceDataset: SOL_REFERENCE_DATASET,
    referenceEpoch: SOL_REFERENCE_EPOCH,
    referenceOrbit: {
      parentId: definition.parentId,
      semiMajorAxisKm: definition.aKm,
      eccentricity: definition.e,
      argumentOfPeriapsisDeg: definition.argumentPeriapsisDeg,
      meanAnomalyDeg: definition.meanAnomalyDeg,
      inclinationDeg: definition.inclinationDeg,
      longitudeOfAscendingNodeDeg: definition.ascendingNodeDeg,
      orbitalPeriodDays: definition.periodDays,
      elementFrame: definition.elementFrame,
      laplacePoleRaDeg: definition.laplacePoleRaDeg ?? null,
      laplacePoleDecDeg: definition.laplacePoleDecDeg ?? null,
      retrograde: definition.inclinationDeg > 90,
    },
  };
}

function addReferenceMoonsPreservingParentBarycenters(bodies) {
  const byId = new Map(bodies.map((body) => [body.id, body]));
  for (const parentId of new Set(MOONS.map((moon) => moon.parentId))) {
    const parent = byId.get(parentId);
    if (!parent) continue;
    const definitions = MOONS.filter((moon) => moon.parentId === parentId);
    const states = definitions.map((definition) => ({ definition, state: moonRelativeState(definition, parent.mass, 0) }));
    const totalMass = parent.mass + states.reduce((sum, entry) => sum + entry.state.mass, 0);
    const positionCorrection = vec3(0, 0, 0);
    const velocityCorrection = vec3(0, 0, 0);
    for (const { state } of states) {
      positionCorrection[0] += state.mass * state.position[0];
      positionCorrection[1] += state.mass * state.position[1];
      positionCorrection[2] += state.mass * state.position[2];
      velocityCorrection[0] += state.mass * state.velocity[0];
      velocityCorrection[1] += state.mass * state.velocity[1];
      velocityCorrection[2] += state.mass * state.velocity[2];
    }
    parent.position[0] -= positionCorrection[0] / totalMass;
    parent.position[1] -= positionCorrection[1] / totalMass;
    parent.position[2] -= positionCorrection[2] / totalMass;
    parent.velocity[0] -= velocityCorrection[0] / totalMass;
    parent.velocity[1] -= velocityCorrection[1] / totalMass;
    parent.velocity[2] -= velocityCorrection[2] / totalMass;
    for (const entry of states) {
      const moon = moonBody(entry.definition, parent, entry.state);
      bodies.push(moon);
      byId.set(moon.id, moon);
    }
  }
}

export function generateSolReferenceMoonUpgrades(existingBodies = [], elapsedSeconds = 0) {
  const byId = new Map(existingBodies.map((body) => [body.id, body]));
  const upgrades = [];
  for (const definition of MOONS) {
    if (byId.has(definition.id)) continue;
    const parent = byId.get(definition.parentId);
    if (!parent) continue;
    const relativeState = moonRelativeState(definition, parent.mass, elapsedSeconds);
    upgrades.push(moonBody(definition, parent, relativeState));
  }
  return upgrades;
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

  // Resolve the selected satellite systems around the same parent-system barycenters used by
  // the J2000 planetary foundation, then shift the complete 16-body state to the global COM frame.
  addReferenceMoonsPreservingParentBarycenters(bodies);
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
      generationProfileScientificStatus: 'Fixed J2000 reference foundation using JPL approximate major-planet elements plus JPL J2000 satellite mean elements/physical parameters. No procedural planets, moons, comets, rogues, anomalies, or landing surfaces are injected.',
      mobileVisualParticleBudget: 40_000,
      starSpectralClass: 'G',
      starTemperatureK: 5772,
      luminositySolar: 1,
      habitableZoneProxyMeters: PHYSICS.AU,
      snowLineMeters: 2.7 * PHYSICS.AU,
      planetCount: 8,
      moonCount: 7,
      cometCount: 0,
      roguePlanetCount: 0,
      compactCompanionCount: 0,
      phenomenonCount: 0,
      anomalyCount: 0,
      landablePlanetCount: 0,
      physicalPropertyModel: 'sol-reference-bulk-v1',
      rotationModel: 'sol-reference-spin-v1 + synchronous-moon-spin-v1',
      planetaryEnvironmentModel: 'sol-reference-environment-v1',
      referenceEpoch: SOL_REFERENCE_EPOCH,
      referenceDataset: SOL_REFERENCE_DATASET,
      scientificModel: 'Newtonian finite-radius N-body evolution initialized from a fixed J2000 reference state. Major planets use the existing low-precision JPL approximate elements; the selected seven moons use JPL mean satellite elements at 2000-01-01.5 TDB. Local Laplace-plane elements are oriented with JPL-listed plane poles, then converted into parent-relative SI states before the complete system is barycentrically shifted. These are reference initial conditions, not a Horizons/SPICE precision ephemeris.',
    },
  };
}
