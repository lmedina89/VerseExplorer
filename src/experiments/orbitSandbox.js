import { BODY_KIND, PHYSICS } from '../core/constants.js';
import { rotationAxis } from '../core/planetaryRotation.js';

export const SANDBOX_ASTEROID = Object.freeze({
  massKg: 1.0e12,
  densityKgM3: 3000,
  color: 0xb08a63,
  materialId: 'basalt',
});

export const SANDBOX_BODY_LIMIT = 5;

const SOL_PARENT_ORDER = Object.freeze(['planet-earth', 'moon-luna', 'planet-mars']);
const SOL_ALTITUDES_METERS = Object.freeze({
  'planet-earth': Object.freeze({ near: 200_000, low: 400_000, medium: 2_000_000, high: 20_000_000 }),
  'moon-luna': Object.freeze({ near: 25_000, low: 100_000, medium: 500_000, high: 2_000_000 }),
  'planet-mars': Object.freeze({ near: 125_000, low: 250_000, medium: 1_000_000, high: 6_000_000 }),
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function length3(v) {
  return Math.hypot(finite(v?.[0]), finite(v?.[1]), finite(v?.[2]));
}

function normalize3(source, fallback = [1, 0, 0]) {
  const magnitude = length3(source);
  if (!(magnitude > 1e-12)) return new Float64Array(fallback);
  return new Float64Array([source[0] / magnitude, source[1] / magnitude, source[2] / magnitude]);
}

function dot3(a, b) {
  return finite(a?.[0]) * finite(b?.[0]) + finite(a?.[1]) * finite(b?.[1]) + finite(a?.[2]) * finite(b?.[2]);
}

function cross3(a, b) {
  return new Float64Array([
    finite(a?.[1]) * finite(b?.[2]) - finite(a?.[2]) * finite(b?.[1]),
    finite(a?.[2]) * finite(b?.[0]) - finite(a?.[0]) * finite(b?.[2]),
    finite(a?.[0]) * finite(b?.[1]) - finite(a?.[1]) * finite(b?.[0]),
  ]);
}

function subtract3(a, b) {
  return new Float64Array([
    finite(a?.[0]) - finite(b?.[0]),
    finite(a?.[1]) - finite(b?.[1]),
    finite(a?.[2]) - finite(b?.[2]),
  ]);
}

function equatorialRadial(parent, shipPosition) {
  const axis = rotationAxis(parent);
  const parentToShip = subtract3(shipPosition, parent.position);
  const axial = dot3(parentToShip, axis);
  const projected = new Float64Array([
    parentToShip[0] - axis[0] * axial,
    parentToShip[1] - axis[1] * axial,
    parentToShip[2] - axis[2] * axial,
  ]);
  if (length3(projected) > 1e-6) return normalize3(projected);
  const reference = Math.abs(axis[1]) < 0.94 ? [0, 1, 0] : [1, 0, 0];
  return normalize3(cross3(reference, axis));
}

export function sphereRadiusFromMassDensity(massKg, densityKgM3) {
  const mass = Math.max(1, finite(massKg, SANDBOX_ASTEROID.massKg));
  const density = Math.max(1, finite(densityKgM3, SANDBOX_ASTEROID.densityKgM3));
  return Math.cbrt((3 * mass) / (4 * Math.PI * density));
}

export function sandboxParentCandidates(bodies = []) {
  const eligible = bodies.filter((body) => (body?.kind === BODY_KIND.PLANET || body?.kind === BODY_KIND.MOON)
    && body.gravitySource !== false
    && finite(body.mass) > 0
    && finite(body.radius) > 0);
  const byId = new Map(eligible.map((body) => [body.id, body]));
  const preferred = SOL_PARENT_ORDER.map((id) => byId.get(id)).filter(Boolean);
  if (preferred.length) return preferred;
  return eligible.slice(0, 3);
}

export function sandboxAltitudePresets(parent) {
  const known = SOL_ALTITUDES_METERS[parent?.id];
  if (known) return { ...known };
  const radius = Math.max(1, finite(parent?.radius, PHYSICS.EARTH_RADIUS));
  return {
    near: Math.max(25_000, radius * 0.02),
    low: Math.max(100_000, radius * 0.08),
    medium: Math.max(500_000, radius * 0.35),
    high: Math.max(2_000_000, radius * 1.5),
  };
}

export function buildSandboxOrbitPlan({ parent, shipPosition, altitudePreset = 'low' } = {}) {
  if (!parent || !(finite(parent.mass) > 0) || !(finite(parent.radius) > 0)) throw new Error('A finite massive parent body is required.');
  if (parent.kind !== BODY_KIND.PLANET && parent.kind !== BODY_KIND.MOON) throw new Error('0.1.0.6A supports planet/moon parent bodies only.');
  const presetKey = ['near', 'low', 'medium', 'high'].includes(String(altitudePreset)) ? String(altitudePreset) : 'low';
  const altitudes = sandboxAltitudePresets(parent);
  const altitudeMeters = altitudes[presetKey];
  const mass = SANDBOX_ASTEROID.massKg;
  const density = SANDBOX_ASTEROID.densityKgM3;
  const radius = sphereRadiusFromMassDensity(mass, density);
  const orbitalRadiusMeters = finite(parent.radius) + altitudeMeters;
  if (!(orbitalRadiusMeters > finite(parent.radius) + radius * 2)) throw new Error('Selected orbit does not clear the parent surface.');

  const axis = rotationAxis(parent);
  const radial = equatorialRadial(parent, shipPosition ?? parent.position);
  const tangent = normalize3(cross3(axis, radial), [0, 0, 1]);
  const mu = PHYSICS.G * (finite(parent.mass) + mass);
  const circularSpeedMps = Math.sqrt(mu / orbitalRadiusMeters);
  const periodSeconds = Math.PI * 2 * Math.sqrt((orbitalRadiusMeters ** 3) / mu);
  if (![circularSpeedMps, periodSeconds].every(Number.isFinite)) throw new Error('Circular orbit solution is non-finite.');

  const position = new Float64Array([
    finite(parent.position?.[0]) + radial[0] * orbitalRadiusMeters,
    finite(parent.position?.[1]) + radial[1] * orbitalRadiusMeters,
    finite(parent.position?.[2]) + radial[2] * orbitalRadiusMeters,
  ]);
  const velocity = new Float64Array([
    finite(parent.velocity?.[0]) + tangent[0] * circularSpeedMps,
    finite(parent.velocity?.[1]) + tangent[1] * circularSpeedMps,
    finite(parent.velocity?.[2]) + tangent[2] * circularSpeedMps,
  ]);

  return {
    parentId: parent.id,
    parentName: parent.name,
    altitudePreset: presetKey,
    altitudeMeters,
    orbitalRadiusMeters,
    circularSpeedMps,
    periodSeconds,
    axis,
    radial,
    tangent,
    body: {
      kind: BODY_KIND.ASTEROID,
      mass,
      radius,
      densityKgM3: density,
      materialId: SANDBOX_ASTEROID.materialId,
      color: SANDBOX_ASTEROID.color,
      gravitySource: true,
      generated: false,
      parentId: parent.id,
      position,
      velocity,
    },
  };
}



export function buildSurfaceSkySandboxOrbitPlan({ parent, observer, altitudePreset = 'low' } = {}) {
  if (!parent || !(finite(parent.mass) > 0) || !(finite(parent.radius) > 0)) throw new Error('A finite massive parent body is required.');
  if (parent.kind !== BODY_KIND.PLANET && parent.kind !== BODY_KIND.MOON) throw new Error('Surface SKY SPAWN supports planet/moon parent bodies only.');
  if (!observer?.valid || observer.parentBodyId !== parent.id) throw new Error('A valid surface observer on the parent body is required.');

  const look = normalize3(observer.forward, [0, 0, 1]);
  const localUp = normalize3(observer.localUp, [0, 1, 0]);
  const lookAltitudeRad = Math.asin(Math.max(-1, Math.min(1, dot3(look, localUp))));
  if (!(lookAltitudeRad >= 0)) throw new Error('Aim the reticle at or above the local horizon before previewing a sky spawn.');

  const presetKey = ['near', 'low', 'medium', 'high'].includes(String(altitudePreset)) ? String(altitudePreset) : 'low';
  const altitudes = sandboxAltitudePresets(parent);
  const altitudeMeters = altitudes[presetKey];
  const mass = SANDBOX_ASTEROID.massKg;
  const density = SANDBOX_ASTEROID.densityKgM3;
  const radius = sphereRadiusFromMassDensity(mass, density);
  const orbitalRadiusMeters = finite(parent.radius) + altitudeMeters;
  if (!(orbitalRadiusMeters > finite(parent.radius) + radius * 2)) throw new Error('Selected orbit does not clear the parent surface.');

  const observerPosition = observer.inertialPosition;
  const q = subtract3(observerPosition, parent.position);
  const b = dot3(q, look);
  const c = dot3(q, q) - orbitalRadiusMeters * orbitalRadiusMeters;
  const discriminant = b * b - c;
  if (!(discriminant >= 0) || !Number.isFinite(discriminant)) throw new Error('The reticle ray does not intersect the selected orbital shell.');
  const lookRangeMeters = -b + Math.sqrt(discriminant);
  if (!(lookRangeMeters > radius * 2) || !Number.isFinite(lookRangeMeters)) throw new Error('The selected sky spawn point is too close to the observer.');

  const position = new Float64Array([
    finite(observerPosition?.[0]) + look[0] * lookRangeMeters,
    finite(observerPosition?.[1]) + look[1] * lookRangeMeters,
    finite(observerPosition?.[2]) + look[2] * lookRangeMeters,
  ]);
  const radial = normalize3(subtract3(position, parent.position), localUp);
  const axis = rotationAxis(parent);
  let tangent = cross3(axis, radial);
  if (length3(tangent) <= 1e-8) {
    const east = observer.horizonEast ?? [1, 0, 0];
    const projectedEast = new Float64Array([
      finite(east[0]) - radial[0] * dot3(east, radial),
      finite(east[1]) - radial[1] * dot3(east, radial),
      finite(east[2]) - radial[2] * dot3(east, radial),
    ]);
    tangent = length3(projectedEast) > 1e-8 ? projectedEast : cross3(observer.horizonNorth ?? [0, 0, 1], radial);
  }
  tangent = normalize3(tangent, observer.horizonEast ?? [1, 0, 0]);
  if (dot3(cross3(radial, tangent), axis) < 0) tangent = new Float64Array([-tangent[0], -tangent[1], -tangent[2]]);

  const mu = PHYSICS.G * (finite(parent.mass) + mass);
  const circularSpeedMps = Math.sqrt(mu / orbitalRadiusMeters);
  const periodSeconds = Math.PI * 2 * Math.sqrt((orbitalRadiusMeters ** 3) / mu);
  if (![circularSpeedMps, periodSeconds].every(Number.isFinite)) throw new Error('Circular orbit solution is non-finite.');
  const velocity = new Float64Array([
    finite(parent.velocity?.[0]) + tangent[0] * circularSpeedMps,
    finite(parent.velocity?.[1]) + tangent[1] * circularSpeedMps,
    finite(parent.velocity?.[2]) + tangent[2] * circularSpeedMps,
  ]);

  return {
    source: 'surface-sky',
    parentId: parent.id,
    parentName: parent.name,
    altitudePreset: presetKey,
    altitudeMeters,
    orbitalRadiusMeters,
    circularSpeedMps,
    periodSeconds,
    lookRangeMeters,
    lookAltitudeRad,
    lookDirection: look,
    axis,
    radial,
    tangent,
    body: {
      kind: BODY_KIND.ASTEROID,
      mass,
      radius,
      densityKgM3: density,
      materialId: SANDBOX_ASTEROID.materialId,
      color: SANDBOX_ASTEROID.color,
      gravitySource: true,
      generated: false,
      parentId: parent.id,
      position,
      velocity,
    },
  };
}

export function buildSandboxOrbitPolyline(plan, parent, samples = 128) {
  if (!plan || !parent) return new Float64Array(0);
  const count = Math.max(24, Math.min(256, Math.floor(Number(samples) || 128)));
  const points = new Float64Array((count + 1) * 3);
  const r = plan.orbitalRadiusMeters;
  for (let i = 0; i <= count; i += 1) {
    const phase = (i / count) * Math.PI * 2;
    const c = Math.cos(phase);
    const s = Math.sin(phase);
    const k = i * 3;
    points[k] = finite(parent.position?.[0]) + r * (plan.radial[0] * c + plan.tangent[0] * s);
    points[k + 1] = finite(parent.position?.[1]) + r * (plan.radial[1] * c + plan.tangent[1] * s);
    points[k + 2] = finite(parent.position?.[2]) + r * (plan.radial[2] * c + plan.tangent[2] * s);
  }
  return points;
}
