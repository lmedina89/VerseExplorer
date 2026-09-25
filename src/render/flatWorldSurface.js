import * as THREE from 'three/webgpu';
import { SIMULATION } from '../core/constants.js';
import { createRng } from '../util/prng.js';
import { FLAT_WORLD_VISUAL_LAYER, createFlatWorldAnomalyVisual, updateFlatWorldAnomalyVisual } from './flatWorldAnomaly.js?v=ue0106a3fw21';

function disposeMaterial(material) {
  if (!material) return;
  for (const key of ['map', 'alphaMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) {
    const texture = material[key];
    if (texture && (material.userData?.disposeMap || texture.userData?.surfaceOwned || texture.userData?.flatWorldDiscTexture)) texture.dispose?.();
  }
  material.dispose?.();
}

function disposeTree(root) {
  root?.traverse?.((node) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach(disposeMaterial);
    else disposeMaterial(node.material);
  });
}

function renderUnits(meters) {
  return Math.max(1e-6, Number(meters) / SIMULATION.metersPerRenderUnit);
}

function createBackdrop(seed = 'flat-world-surface') {
  const rng = createRng(`${seed}:firmament-stars`);
  const count = 950;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const u = rng.random();
    const v = rng.random();
    const theta = Math.PI * 2 * u;
    const cosPhi = 2 * v - 1;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const radius = rng.range(220, 320);
    positions[i * 3] = Math.cos(theta) * sinPhi * radius;
    positions[i * 3 + 1] = cosPhi * radius;
    positions[i * 3 + 2] = Math.sin(theta) * sinPhi * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xdcecff,
    size: 0.42,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'flat-world-surface-star-backdrop';
  points.layers.set(FLAT_WORLD_VISUAL_LAYER);
  return points;
}

export class FlatWorldSurfaceVisual {
  constructor(region) {
    this.region = region;
    this.definition = region?.flatWorldDefinition;
    if (!this.definition) throw new Error('Flat World surface renderer requires a visual-anomaly definition.');

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020611);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.015, 520);
    this.camera.layers.set(FLAT_WORLD_VISUAL_LAYER);

    this.world = createFlatWorldAnomalyVisual(this.definition);
    this.world.name = 'flat-world-surface-shared-visual';
    this.scene.add(this.world);
    this.backdrop = createBackdrop(this.definition.id);
    this.scene.add(this.backdrop);

    const discRadius = renderUnits(this.definition.discRadiusMeters);
    const discTop = renderUnits(this.definition.discThicknessMeters) * 0.5;
    const pose = region.observationPose ?? {};
    const radiusFraction = Math.max(0.25, Math.min(0.82, Number(pose.radiusFraction) || 0.62));
    const azimuth = Number(pose.azimuthRad) || 0.62;
    const radius = discRadius * radiusFraction;
    this.observerPosition = new THREE.Vector3(
      Math.cos(azimuth) * radius,
      discTop + Math.max(0.08, Number(pose.eyeHeightRenderUnits) || 0.24),
      Math.sin(azimuth) * radius,
    );
    this.defaultYaw = Math.atan2(-this.observerPosition.x, -this.observerPosition.z);
    this.defaultPitch = Number(pose.initialPitchRad) || 0.20;
  }

  resize(width, height) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setFovDegrees(degrees = 70) {
    const next = Math.max(5, Math.min(70, Number(degrees) || 70));
    this.camera.fov = next;
    this.camera.updateProjectionMatrix();
    return next;
  }

  getFovDegrees() {
    return Number(this.camera.fov) || 70;
  }

  setSandboxSkyPreview() { return false; }
  clearSandboxSkyPreview() {}

  render(renderer, session, realTimeSeconds = 0, _transition = null, _astronomy = null, elapsedSimSeconds = null) {
    const cycleTime = Number.isFinite(Number(elapsedSimSeconds)) ? Number(elapsedSimSeconds) : Number(realTimeSeconds) || 0;
    updateFlatWorldAnomalyVisual(this.world, this.definition, cycleTime);

    // The outside view keeps the firmament nearly invisible. From inside, a tiny opacity lift
    // makes the four triangular faces readable without turning the dome into an opaque cage.
    const visualState = this.world?.userData?.flatWorld;
    if (visualState?.firmamentMaterial) visualState.firmamentMaterial.opacity = Math.max(0.052, Number(visualState.firmamentMaterial.opacity) || 0);
    if (visualState?.firmamentEdgeMaterial) visualState.firmamentEdgeMaterial.opacity = Math.max(0.60, Number(visualState.firmamentEdgeMaterial.opacity) || 0);
    if (visualState?.firmamentGlowMaterial) visualState.firmamentGlowMaterial.opacity = Math.max(0.22, Number(visualState.firmamentGlowMaterial.opacity) || 0);

    const yaw = Number.isFinite(Number(session?.yaw)) ? Number(session.yaw) : this.defaultYaw;
    const pitch = Number.isFinite(Number(session?.pitch)) ? Math.max(-1.48, Math.min(1.48, Number(session.pitch))) : this.defaultPitch;
    const cp = Math.cos(pitch), sp = Math.sin(pitch), sy = Math.sin(yaw), cy = Math.cos(yaw);
    this.camera.position.copy(this.observerPosition);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(
      this.observerPosition.x + sy * cp * 100,
      this.observerPosition.y + sp * 100,
      this.observerPosition.z + cy * cp * 100,
    );

    renderer.toneMappingExposure = 1.08;
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    disposeTree(this.scene);
  }
}
