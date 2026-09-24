import * as THREE from 'three/webgpu';
import { SIMULATION } from '../core/constants.js';

export const FLAT_WORLD_VISUAL_LAYER = 2;

const ZODIAC = Object.freeze([
  ['♈', 'ARIES'], ['♉', 'TAURUS'], ['♊', 'GEMINI'], ['♋', 'CANCER'],
  ['♌', 'LEO'], ['♍', 'VIRGO'], ['♎', 'LIBRA'], ['♏', 'SCORPIO'],
  ['♐', 'SAGITTARIUS'], ['♑', 'CAPRICORN'], ['♒', 'AQUARIUS'], ['♓', 'PISCES'],
]);

function renderUnits(meters) {
  return Math.max(1e-6, Number(meters) / SIMULATION.metersPerRenderUnit);
}

function makeCanvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeDiscTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const cx = 512, cy = 512, radius = 486;

  const ocean = ctx.createRadialGradient(cx, cy, 40, cx, cy, radius);
  ocean.addColorStop(0, '#164f70');
  ocean.addColorStop(0.55, '#0c3d5b');
  ocean.addColorStop(1, '#06283f');
  ctx.fillStyle = ocean;
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

  // Azimuthal-chart style grid. This is deliberately decorative rather than a scientific map.
  ctx.strokeStyle = 'rgba(183,224,235,.18)';
  ctx.lineWidth = 2;
  for (let r = 95; r <= 430; r += 67) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 24; i += 1) {
    const a = i * Math.PI / 12;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 454, cy + Math.sin(a) * 454); ctx.stroke();
  }

  const land = (points, fill = '#789568') => {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      const px = cx + x * 430, py = cy + y * 430;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = 'rgba(220,230,196,.45)'; ctx.lineWidth = 3; ctx.stroke();
  };

  // Stylized polar-projection continent silhouettes, laid out for immediate visual readability.
  land([[-.12,-.12],[-.32,-.22],[-.52,-.18],[-.67,-.30],[-.72,-.46],[-.58,-.58],[-.38,-.55],[-.25,-.42],[-.08,-.38],[.00,-.22]], '#6e8f62'); // N. America
  land([[-.40,.02],[-.50,.13],[-.47,.29],[-.36,.48],[-.27,.69],[-.15,.78],[-.09,.62],[-.14,.42],[-.20,.20]], '#789966'); // S. America
  land([[.05,-.18],[.18,-.29],[.33,-.34],[.50,-.31],[.70,-.20],[.80,-.04],[.68,.04],[.52,-.03],[.37,.02],[.22,-.02]], '#809b6a'); // Europe/Asia north
  land([[.12,-.02],[.27,.03],[.34,.19],[.28,.41],[.16,.58],[.04,.44],[-.01,.20]], '#8b9a61'); // Africa
  land([[.48,.25],[.65,.31],[.74,.43],[.67,.56],[.49,.53],[.42,.39]], '#899d6e'); // Asia south
  land([[.61,.58],[.77,.60],[.84,.72],[.70,.80],[.55,.72]], '#83956d'); // Australia
  land([[.00,-.08],[.07,-.16],[.13,-.10],[.09,-.01]], '#b6c2a2'); // Greenland/polar island

  // Polar cap / central axis marker.
  const pole = ctx.createRadialGradient(cx, cy, 0, cx, cy, 76);
  pole.addColorStop(0, 'rgba(245,250,246,.96)');
  pole.addColorStop(1, 'rgba(207,231,228,.08)');
  ctx.fillStyle = pole; ctx.beginPath(); ctx.arc(cx, cy, 76, 0, Math.PI * 2); ctx.fill();

  // Bright perimeter "ice wall" inspired by the supplied reference concept.
  ctx.strokeStyle = 'rgba(230,247,248,.98)'; ctx.lineWidth = 30;
  ctx.beginPath(); ctx.arc(cx, cy, 468, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(112,204,227,.55)'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(cx, cy, 450, 0, Math.PI * 2); ctx.stroke();

  const texture = makeCanvasTexture(canvas);
  texture.userData = { flatWorldDiscTexture: true };
  return texture;
}

function makeMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(88, 72, 12, 128, 128, 128);
  g.addColorStop(0, '#e4e2dc'); g.addColorStop(.5, '#aaa9a4'); g.addColorStop(1, '#666a70');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const craters = [[57,65,20],[111,45,13],[165,73,24],[207,117,15],[91,142,28],[151,164,18],[49,188,14],[198,201,27],[128,105,9]];
  for (const [x,y,r] of craters) {
    ctx.fillStyle = 'rgba(54,58,64,.24)'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(238,238,230,.14)'; ctx.lineWidth = Math.max(2,r*.14); ctx.beginPath(); ctx.arc(x-2,y-2,r*.83,0,Math.PI*2); ctx.stroke();
  }
  return makeCanvasTexture(canvas);
}

function makeGlowTexture(core, mid) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128,128,0,128,128,128);
  g.addColorStop(0, core); g.addColorStop(.16, core); g.addColorStop(.5, mid); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,256,256);
  return makeCanvasTexture(canvas);
}

function makeZodiacTexture(symbol, name) {
  const canvas = document.createElement('canvas');
  canvas.width = 384; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const bg = ctx.createLinearGradient(0,0,canvas.width,0);
  bg.addColorStop(0,'rgba(12,17,27,0)'); bg.addColorStop(.18,'rgba(18,22,30,.78)'); bg.addColorStop(.82,'rgba(18,22,30,.78)'); bg.addColorStop(1,'rgba(12,17,27,0)');
  ctx.fillStyle = bg; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = 'rgba(218,182,91,.72)'; ctx.lineWidth = 4; ctx.strokeRect(24,18,336,156);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = "96px -apple-system, BlinkMacSystemFont, 'Segoe UI Symbol', sans-serif";
  ctx.fillStyle = '#f2cf70'; ctx.shadowColor = 'rgba(255,203,95,.72)'; ctx.shadowBlur = 16; ctx.fillText(symbol,192,78);
  ctx.shadowBlur = 0; ctx.font = "600 31px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"; ctx.letterSpacing = '2px';
  ctx.fillStyle = 'rgba(247,224,165,.94)'; ctx.fillText(name,192,146);
  return makeCanvasTexture(canvas);
}

function setLayerRecursive(root, layer = FLAT_WORLD_VISUAL_LAYER) {
  root.traverse?.((node) => node.layers?.set?.(layer));
}

function branchBetween(start, end, startRadius, endRadius, material, radialSegments = 9) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const length = Math.max(1e-4, direction.length());
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(endRadius, startRadius, length, radialSegments, 2, false), material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), direction.normalize());
  return mesh;
}

function addWorldTree(root, discTop, treeTop, rootDepth) {
  const bark = new THREE.MeshStandardMaterial({ color:0x55351f, roughness:.93, metalness:.02, emissive:0x100703, emissiveIntensity:.08 });
  const barkDark = new THREE.MeshStandardMaterial({ color:0x392317, roughness:1, metalness:0 });
  const foliageA = new THREE.MeshStandardMaterial({ color:0x315b35, roughness:.88, emissive:0x0b1d0e, emissiveIntensity:.18 });
  const foliageB = new THREE.MeshStandardMaterial({ color:0x4b7440, roughness:.9, emissive:0x102611, emissiveIntensity:.14 });

  const trunkTop = Math.max(discTop + 24, treeTop * .72);
  const trunkPoints = [[0,discTop-.3,0],[1.0,discTop+17,-.4],[-.9,discTop+33,.8],[0,trunkTop,0]];
  root.add(branchBetween(trunkPoints[0],trunkPoints[1],4.7,4.1,bark,11));
  root.add(branchBetween(trunkPoints[1],trunkPoints[2],4.1,3.25,bark,10));
  root.add(branchBetween(trunkPoints[2],trunkPoints[3],3.25,2.25,bark,9));

  const canopyPoints = [];
  const branchCount = 11;
  for (let i=0;i<branchCount;i+=1) {
    const a = i / branchCount * Math.PI * 2;
    const tier = i % 3;
    const startY = discTop + 27 + tier * 7;
    const r = 12 + (i % 4) * 2.8;
    const end = [Math.cos(a)*r, Math.min(treeTop-4,startY+11+(i%2)*4), Math.sin(a)*r];
    root.add(branchBetween([0,startY,0], end, 1.65, .48, bark, 7));
    canopyPoints.push(end);
  }
  canopyPoints.push([0,treeTop-3,0],[7,treeTop-7,3],[-7,treeTop-8,-4],[3,treeTop-10,-9],[-4,treeTop-9,9]);
  const canopyGeometry = new THREE.IcosahedronGeometry(6.1, 1);
  canopyPoints.forEach((p,i) => {
    const crown = new THREE.Mesh(canopyGeometry, i%2 ? foliageA : foliageB);
    crown.position.set(p[0],p[1],p[2]);
    crown.scale.set(1.15+(i%3)*.08,.82+(i%2)*.08,1.05+((i+1)%3)*.08);
    root.add(crown);
  });

  // Exposed roots spread beneath the disc and descend into the lower figure-eight lobe.
  const roots = 10;
  for (let i=0;i<roots;i+=1) {
    const a = i / roots * Math.PI * 2 + (i%2)*.13;
    const mid = [Math.cos(a)*10, -8-(i%3)*2.5, Math.sin(a)*10];
    const endR = 24 + (i%4)*3.2;
    const end = [Math.cos(a+.12)*endR, -rootDepth*(.72+.06*(i%3)), Math.sin(a+.12)*endR];
    root.add(branchBetween([0,-discTop*.8,0], mid,2.25,1.35,barkDark,8));
    root.add(branchBetween(mid,end,1.35,.38,barkDark,7));
  }
}

function createFirmament(halfBase, apexY, baseY) {
  const group = new THREE.Group();
  const vertices = new Float32Array([
    -halfBase,baseY,-halfBase,  halfBase,baseY,-halfBase,  halfBase,baseY,halfBase,
    -halfBase,baseY,-halfBase,  halfBase,baseY,halfBase, -halfBase,baseY,halfBase,
    -halfBase,baseY,-halfBase,  halfBase,baseY,-halfBase, 0,apexY,0,
     halfBase,baseY,-halfBase,  halfBase,baseY, halfBase, 0,apexY,0,
     halfBase,baseY, halfBase, -halfBase,baseY, halfBase, 0,apexY,0,
    -halfBase,baseY, halfBase, -halfBase,baseY,-halfBase, 0,apexY,0,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices,3));
  const material = new THREE.MeshBasicMaterial({ color:0xa9e8ff, transparent:true, opacity:.038, depthWrite:false, side:THREE.DoubleSide, blending:THREE.NormalBlending });
  const faces = new THREE.Mesh(geometry,material); faces.name='flat-world-firmament-faces'; group.add(faces);

  const edgePoints = [
    [-halfBase,baseY,-halfBase],[halfBase,baseY,-halfBase],
    [halfBase,baseY,-halfBase],[halfBase,baseY,halfBase],
    [halfBase,baseY,halfBase],[-halfBase,baseY,halfBase],
    [-halfBase,baseY,halfBase],[-halfBase,baseY,-halfBase],
    [-halfBase,baseY,-halfBase],[0,apexY,0],
    [halfBase,baseY,-halfBase],[0,apexY,0],
    [halfBase,baseY,halfBase],[0,apexY,0],
    [-halfBase,baseY,halfBase],[0,apexY,0],
  ];
  const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePoints.map((p)=>new THREE.Vector3(...p)));
  const edgeMaterial = new THREE.LineBasicMaterial({color:0x91dcff,transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending});
  const edges = new THREE.LineSegments(edgeGeometry,edgeMaterial); edges.name='flat-world-firmament-edges'; group.add(edges);
  const apex = new THREE.Mesh(new THREE.OctahedronGeometry(1.1,0),new THREE.MeshBasicMaterial({color:0xe4f9ff,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
  apex.position.y=apexY; group.add(apex);
  group.userData.firmamentMaterial = material;
  group.userData.firmamentEdgeMaterial = edgeMaterial;
  return group;
}

function makeFigureEightCurve(width, height) {
  const points = [];
  const samples = 168;
  for (let i=0;i<samples;i+=1) {
    const phase = i / samples * Math.PI * 2;
    const p = flatWorldPathPoint(phase,width,height);
    points.push(new THREE.Vector3(p[0],p[1],p[2]));
  }
  return new THREE.CatmullRomCurve3(points,true,'centripetal',.35);
}

export function flatWorldPathPoint(phase, width, height) {
  // Vertical figure-eight: y defines the upper/lower lobes while x crosses twice per cycle.
  return [width * Math.sin(phase * 2), height * Math.sin(phase), 0];
}

function createFigureEightPath(width,height) {
  const curve = makeFigureEightCurve(width,height);
  const glow = new THREE.Mesh(new THREE.TubeGeometry(curve,180,.42,6,true), new THREE.MeshBasicMaterial({color:0x7fd9ff,transparent:true,opacity:.12,depthWrite:false,blending:THREE.AdditiveBlending}));
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve,180,.12,5,true), new THREE.MeshBasicMaterial({color:0xe9fbff,transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending}));
  glow.name='flat-world-figure-eight-glow'; core.name='flat-world-figure-eight-core';
  return { group:new THREE.Group(), curve, glow, core };
}

function createLocalSun(radius) {
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius,28,18),new THREE.MeshBasicMaterial({color:0xfff0b2}));
  const glowTexture = makeGlowTexture('rgba(255,247,210,1)','rgba(255,165,61,.20)');
  const glowMaterial = new THREE.SpriteMaterial({map:glowTexture,transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending});
  glowMaterial.userData.disposeMap = true;
  const glow = new THREE.Sprite(glowMaterial); glow.scale.set(radius*7.5,radius*7.5,1);
  const light = new THREE.PointLight(0xffdf9a,5200,240,2);
  group.add(sphere,glow,light); group.userData.localLight=light; group.name='flat-world-local-sun';
  return group;
}

function createLocalMoon(radius) {
  const group = new THREE.Group();
  const texture = makeMoonTexture();
  const material = new THREE.MeshBasicMaterial({map:texture,color:0xb9c9dd}); material.userData.disposeMap = true;
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius,24,16),material);
  const glowTexture = makeGlowTexture('rgba(210,228,255,.9)','rgba(92,145,255,.10)');
  const glowMaterial = new THREE.SpriteMaterial({map:glowTexture,transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending}); glowMaterial.userData.disposeMap=true;
  const glow = new THREE.Sprite(glowMaterial); glow.scale.set(radius*5.5,radius*5.5,1);
  const light = new THREE.PointLight(0x91b6ff,310,170,2);
  group.add(sphere,glow,light); group.userData.localLight=light; group.name='flat-world-local-moon';
  return group;
}

export function createFlatWorldAnomalyVisual(definition) {
  const root = new THREE.Group();
  root.name = 'flat-world-anomaly-visual';

  const discRadius = renderUnits(definition.discRadiusMeters);
  const discThickness = renderUnits(definition.discThicknessMeters);
  const discTop = discThickness * .5;
  const treeTop = renderUnits(definition.treeTopMeters);
  const rootDepth = renderUnits(definition.rootDepthMeters);
  const pyramidHalfBase = renderUnits(definition.firmamentHalfBaseMeters);
  const pyramidApex = renderUnits(definition.firmamentApexMeters);
  const pathWidth = renderUnits(definition.pathHalfWidthMeters);
  const pathHeight = renderUnits(definition.pathHalfHeightMeters);

  const topTexture = makeDiscTexture();
  const sideMaterial = new THREE.MeshStandardMaterial({color:0x24201c,roughness:.96,metalness:.05});
  const topMaterial = new THREE.MeshStandardMaterial({map:topTexture,color:0xffffff,roughness:.78,metalness:.02}); topMaterial.userData.disposeMap=true;
  const bottomMaterial = new THREE.MeshStandardMaterial({color:0x15100d,roughness:1,metalness:0});
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(discRadius,discRadius,discThickness,128,1,false),[sideMaterial,topMaterial,bottomMaterial]);
  disc.name='flat-world-disc'; root.add(disc);

  const ice = new THREE.Mesh(new THREE.TorusGeometry(discRadius*.965,Math.max(.55,discRadius*.022),10,128),new THREE.MeshStandardMaterial({color:0xc8edf2,emissive:0x2b6572,emissiveIntensity:.28,roughness:.68}));
  ice.rotation.x=Math.PI/2; ice.position.y=discTop+.38; ice.name='flat-world-ice-wall'; root.add(ice);

  const rimBand = new THREE.Mesh(new THREE.CylinderGeometry(discRadius*1.013,discRadius*1.013,discThickness*.76,128,1,true),new THREE.MeshStandardMaterial({color:0x1b2028,roughness:.7,metalness:.32,transparent:true,opacity:.86,side:THREE.DoubleSide}));
  rimBand.name='flat-world-zodiac-band'; root.add(rimBand);

  const zodiacRadius = discRadius * 1.025;
  ZODIAC.forEach(([symbol,name],i)=>{
    const texture = makeZodiacTexture(symbol,name);
    const material = new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}); material.userData.disposeMap=true;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(9.4,4.7),material);
    const angle = i / ZODIAC.length * Math.PI * 2;
    plate.position.set(Math.cos(angle)*zodiacRadius,0,Math.sin(angle)*zodiacRadius);
    plate.rotation.y=Math.PI/2-angle;
    plate.name=`flat-world-zodiac-${name.toLowerCase()}`;
    root.add(plate);
  });

  addWorldTree(root,discTop,treeTop,rootDepth);

  const path = createFigureEightPath(pathWidth,pathHeight);
  path.group.add(path.glow,path.core); path.group.name='flat-world-celestial-path'; root.add(path.group);

  const localSun = createLocalSun(renderUnits(definition.localSunRadiusMeters));
  const localMoon = createLocalMoon(renderUnits(definition.localMoonRadiusMeters));
  root.add(localSun,localMoon);

  const firmament = createFirmament(pyramidHalfBase,pyramidApex,-rootDepth*.72);
  root.add(firmament);

  const localAmbient = new THREE.AmbientLight(0x263b50,.42); localAmbient.name='flat-world-local-ambient'; root.add(localAmbient);
  const localHemisphere = new THREE.HemisphereLight(0x7b9bc2,0x251610,.34); localHemisphere.name='flat-world-local-hemisphere'; root.add(localHemisphere);

  root.userData.flatWorld = {
    localSun,
    localMoon,
    pathWidth,
    pathHeight,
    cycleSeconds:Math.max(30,Number(definition.localCycleSeconds)||180),
    firmamentMaterial:firmament.userData.firmamentMaterial,
    firmamentEdgeMaterial:firmament.userData.firmamentEdgeMaterial,
  };
  root.userData.visualOnly = true;
  root.userData.localLightingIsolated = true;
  setLayerRecursive(root);
  updateFlatWorldAnomalyVisual(root,definition,0);
  return root;
}

export function updateFlatWorldAnomalyVisual(root, definition, elapsedSimSeconds = 0) {
  const state = root?.userData?.flatWorld;
  if (!state) return;
  const phase = ((Number(elapsedSimSeconds)||0) % state.cycleSeconds) / state.cycleSeconds * Math.PI * 2;
  const sun = flatWorldPathPoint(phase,state.pathWidth,state.pathHeight);
  const moon = flatWorldPathPoint(phase+Math.PI,state.pathWidth,state.pathHeight);
  state.localSun.position.set(sun[0],sun[1],sun[2]);
  state.localMoon.position.set(moon[0],moon[1],moon[2]);
  if (state.firmamentMaterial) state.firmamentMaterial.opacity=.032+.012*(.5+.5*Math.sin(phase*.5));
  if (state.firmamentEdgeMaterial) state.firmamentEdgeMaterial.opacity=.40+.12*(.5+.5*Math.cos(phase*.35));
}
