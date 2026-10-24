// GOOD FOOD. NO DEAD ENDS. — reusable prop & set library (all procedural, no third-party meshes).
import { THREE, V, R, rnd, pick, lerp, clamp, smooth, M4, merged, vmat, mat, clayMat, MAT, grain, normalTex, canvasTex, mesh, box, cyl, at, rot, instanced, noise2, fbm, prng, RoundedBoxGeometry, BGU, translucent, woodMat } from './core.js';
import { compoundLeaf, beanLeaf, scrap } from './foliage.js';
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ leaf textures (alpha cards)
const leafTexCache = {};
export function leafTex(kind) {
  if (leafTexCache[kind]) return leafTexCache[kind];
  const t = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const fillLeaf = (path, c1, c2) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fill(path); };
    const serrated = (cx, cy, rx, ry, ang, teeth = 9, depth = 0.12) => { const p = new Path2D(); for (let i = 0; i <= 64; i++) { const a = (i / 64) * TAU; const k = 1 - depth * (0.5 + 0.5 * Math.cos(a * teeth)) * Math.sin(a / 2) ** 0.3; const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k; const xr = x * Math.cos(ang) - y * Math.sin(ang), yr = x * Math.sin(ang) + y * Math.cos(ang); i ? p.lineTo(cx + xr, cy + yr) : p.moveTo(cx + xr, cy + yr); } p.closePath(); return p; };
    if (kind === 'tomato') {
      const rach = new Path2D(); rach.moveTo(128, 256); rach.quadraticCurveTo(132, 140, 128, 10); g.strokeStyle = '#4c6e2c'; g.lineWidth = 5; g.stroke(rach);
      const leaflets = [[128, 34, 30, 22, -Math.PI / 2], [96, 82, 34, 17, -2.6], [160, 82, 34, 17, -0.55], [92, 140, 38, 18, -2.75], [164, 140, 38, 18, -0.4], [98, 196, 30, 15, -2.9], [158, 196, 30, 15, -0.25]];
      for (const [x, y, rx, ry, a] of leaflets) { const p = serrated(x, y, rx, ry, a, 7, 0.16); fillLeaf(p, '#3c6a27', '#5f9238'); g.strokeStyle = 'rgba(160,200,110,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - Math.cos(a) * rx * 0.8, y - Math.sin(a) * rx * 0.8); g.lineTo(x + Math.cos(a) * rx * 0.8, y + Math.sin(a) * rx * 0.8); g.stroke(); }
    } else if (kind === 'lettuce' || kind === 'lettuceRed') {
      const p = new Path2D(); for (let i = 0; i <= 120; i++) { const a = Math.PI * (i / 120); const rr = 118 * (0.82 + 0.18 * Math.sin(a * 13) * Math.sin(a * 5)) * Math.sin(a) ** 0.25; const x = 128 + Math.cos(a) * rr, y = 250 - Math.sin(a) * rr * 1.9 * 0.55; i ? p.lineTo(x, y) : p.moveTo(x, y); } p.closePath();
      if (kind === 'lettuce') fillLeaf(p, '#d9ec9a', '#6fa83a'); else fillLeaf(p, '#d6e69a', '#8a3a3a');
      g.strokeStyle = 'rgba(240,255,210,0.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(128, 256); g.lineTo(128, 120); g.stroke();
      g.lineWidth = 1.5; for (let i = -3; i <= 3; i++) { if (!i) continue; g.beginPath(); g.moveTo(128, 230 - Math.abs(i) * 18); g.quadraticCurveTo(128 + i * 20, 180 - Math.abs(i) * 10, 128 + i * 32, 140 - Math.abs(i) * 6); g.stroke(); }
    } else if (kind === 'broad') {
      const p = new Path2D(); p.moveTo(128, 250); p.bezierCurveTo(10, 200, 20, 60, 128, 8); p.bezierCurveTo(236, 60, 246, 200, 128, 250); fillLeaf(p, '#355f22', '#5a8d34');
      g.strokeStyle = 'rgba(170,210,120,0.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(128, 250); g.lineTo(128, 20); g.stroke(); for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(128, 240 - i * 36); g.lineTo(60, 200 - i * 34); g.moveTo(128, 240 - i * 36); g.lineTo(196, 200 - i * 34); g.stroke(); }
    } else if (kind === 'blade') {
      for (let i = 0; i < 9; i++) { const x = 20 + i * 27, lean = (i % 3 - 1) * 20; const p = new Path2D(); p.moveTo(x - 6, 256); p.quadraticCurveTo(x + lean * 0.5, 120, x + lean, 10 + (i % 4) * 20); p.quadraticCurveTo(x + lean * 0.5 + 4, 120, x + 6, 256); fillLeaf(p, '#4f7a2c', '#a8c060'); }
    } else if (kind === 'herb') {
      g.strokeStyle = '#4c6e2c'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 256); g.lineTo(128, 20); g.stroke();
      for (let i = 0; i < 10; i++) { const y = 230 - i * 22, sd = i % 2 ? 1 : -1; const p = new Path2D(); p.ellipse(128 + sd * 26, y, 26, 14, sd * 0.4, 0, TAU); fillLeaf(p, '#3f7a2e', '#7ab24a'); }
    } else if (kind === 'flower') {
      for (let k = 0; k < 4; k++) { const cx = 64 + (k % 2) * 128, cy = 64 + Math.floor(k / 2) * 128; const col = ['#f4e46a', '#f6f3ea', '#b98ad8', '#f2a03a'][k];
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; g.fillStyle = col; g.beginPath(); g.ellipse(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, 24, 9, a, 0, TAU); g.fill(); }
        g.fillStyle = k === 1 ? '#e8b528' : '#6a4a1c'; g.beginPath(); g.arc(cx, cy, 15, 0, TAU); g.fill(); }
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; leafTexCache[kind] = t; return t;
}
export function leafMat(kind, o = {}) { return translucent(leafMat0(kind, o), kind === 'flower' ? '#fff0c0' : '#d8f08a', kind === 'flower' ? 0.35 : 0.6); }
function leafMat0(kind, o = {}) {
  if (kind === 'tomato' || kind === 'broad') { const L = kind === 'tomato' ? compoundLeaf() : beanLeaf(); return new THREE.MeshStandardMaterial({ map: L.map, normalMap: L.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), alphaTest: 0.5, side: THREE.DoubleSide, roughness: o.roughness ?? 0.6, vertexColors: true, color: o.color || '#ffffff' }); }
  return new THREE.MeshStandardMaterial({ map: leafTex(kind), alphaTest: 0.45, side: THREE.DoubleSide, roughness: o.roughness ?? 0.62, vertexColors: true, color: o.color || '#ffffff' }); }
// a bent card: base at origin, growing along +y; curl bends tip toward +z
function cardGeo(w, h, curl = 0.3, twist = 0, segY = 4) {
  const g = new THREE.PlaneGeometry(w, h, 2, segY); g.translate(0, h / 2, 0); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h, x = p.getX(i) / w; p.setZ(i, curl * h * y * y + Math.abs(x) * w * 0.25 * (1 - y)); if (twist) { const a = twist * y; const X = p.getX(i), Z = p.getZ(i); p.setX(i, X * Math.cos(a) - Z * Math.sin(a)); p.setZ(i, X * Math.sin(a) + Z * Math.cos(a)); } }
  g.computeVertexNormals(); return g;
}

// ------------------------------------------------------------------ fruit & veg
export function tomatoGeo(o = {}) {
  const r = o.r || 0.04, lobes = o.lobes ?? 5, seg = o.seg || 36;
  const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)); const p = g.attributes.position; const cols = new Float32Array(p.count * 3);
  const base = new THREE.Color(o.color || '#cf2f1d'), shoulder = new THREE.Color(o.shoulder || '#d9782a'), rnd2 = (a, b) => noise2(a * 3.1 + (o.seed || 0), b * 2.7);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x), ry = y / r;
    let k = 1 + 0.055 * Math.cos(a * lobes) * (1 - ry * ry) - 0.1 * Math.pow(Math.max(0, ry), 5);
    if (o.ugly) { k += 0.11 * Math.cos(a * 2 + 0.7) * Math.max(0, ry) + 0.07 * Math.cos(a * 3 + 2.1) * (1 - Math.abs(ry)) + (rnd2(a, ry) - 0.5) * 0.08; }
    const yy = y * (o.squash ?? 0.86) * (1 + (o.ugly ? 0.06 * Math.sin(a + 1.3) : 0));
    p.setXYZ(i, x * k, yy, z * k);
    const sh = smooth((ry - 0.45) / 0.55) * (o.shoulderAmt ?? 0.35); const c = base.clone().lerp(shoulder, sh); const v = 0.94 + rnd2(a * 2, ry * 3) * 0.1;
    cols[i * 3] = c.r * v; cols[i * 3 + 1] = c.g * v; cols[i * 3 + 2] = c.b * v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals(); return g;
}
// tomato skin: thin waxy coat over flesh that scatters red light, so the shadow side glows warm instead of going grey
let _tomatoMat = null;
export function tomatoMat() {
  if (_tomatoMat) return _tomatoMat;
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.42, clearcoatRoughness: 0.16, specularIntensity: 0.55, normalMap: normalTex('skin', 5), normalScale: new THREE.Vector2(0.14, 0.14), envMapIntensity: 0.38 });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
    `float wrapW = saturate( ( dot( geometryNormal, directLight.direction ) + 0.5 ) / 1.5 );
     vec3 scatter = ( vec3( dotNL ) + vec3( 0.9, 0.28, 0.16 ) * max( wrapW - dotNL, 0.0 ) ) * directLight.color;
     reflectedLight.directDiffuse += scatter * BRDF_Lambert( material.diffuseColor );`)); };
  m.customProgramCacheKey = () => 'tomato-scatter'; return (_tomatoMat = m);
}
export function calyx(r = 0.04) {
  const parts = []; const n = 6;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; const g = new THREE.CapsuleGeometry(r * 0.07, r * 0.42, 3, 6); parts.push({ geo: g, m: M4(Math.cos(a) * r * 0.25, r * 0.78, Math.sin(a) * r * 0.25, 0, -a, Math.PI / 2 - 0.35, 1, 1, 0.45).premultiply(new THREE.Matrix4().makeRotationY(0)), color: '#4e7a2a' }); }
  parts.push({ geo: new THREE.CylinderGeometry(r * 0.06, r * 0.09, r * 0.35, 6), m: M4(0, r * 0.95, 0, 0.2, 0, 0.1), color: '#5a7a30' });
  return merged(parts);
}
export function tomato(o = {}) {
  const g = new THREE.Group(); const r = o.r || 0.04;
  const body = mesh(tomatoGeo(o), o.material || tomatoMat()); g.add(body);
  const c = mesh(calyx(r), vmat({ roughness: 0.6 })); c.position.y = -r * 0.04; g.add(c);
  if (o.ugly) { const scar = mesh(new THREE.TorusGeometry(r * 0.28, r * 0.035, 6, 20, Math.PI * 1.2), mat('#a8642a', { roughness: 0.8 })); scar.position.set(r * 0.32, r * 0.42, r * 0.55); scar.lookAt(scar.position.clone().multiplyScalar(3)); g.add(scar); }
  g.userData.r = r; return g;
}
export function produceGeo(kind, o = {}) {
  const parts = []; const c = o.color;
  if (kind === 'pepper') { const g = new THREE.SphereGeometry(0.045, 18, 14); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x); const k = 1 + 0.1 * Math.cos(a * 4); p.setXYZ(i, x * k * (1 - 0.25 * Math.max(0, -y / 0.045)), y * 1.4, z * k * (1 - 0.25 * Math.max(0, -y / 0.045))); } g.computeVertexNormals(); parts.push({ geo: g, color: c || '#c62d1f' }, { geo: new THREE.CylinderGeometry(0.006, 0.009, 0.03, 6), m: M4(0, 0.07, 0, 0.2, 0, 0), color: '#4e7a2a' }); }
  else if (kind === 'eggplant') { const g = new THREE.SphereGeometry(0.04, 18, 14); g.scale(1, 2.0, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 0.75 + 0.35 * clamp((0.08 - y) / 0.16); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); parts.push({ geo: g, color: c || '#3c1f4a' }, { geo: new THREE.ConeGeometry(0.03, 0.035, 6), m: M4(0, 0.085, 0), color: '#4e6a2a' }); }
  else if (kind === 'onion') { const g = new THREE.SphereGeometry(0.038, 16, 12); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.038; if (y > 0.4) { const k = 1 - (y - 0.4) * 0.9; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, p.getY(i) * 1.15); } } g.computeVertexNormals(); parts.push({ geo: g, color: c || '#b56a3a' }); }
  else if (kind === 'potato') { const g = new THREE.IcosahedronGeometry(0.035, 2); g.scale(1.3, 0.85, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (noise2(p.getX(i) * 60, p.getY(i) * 60 + p.getZ(i) * 30) - 0.5) * 0.18; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); parts.push({ geo: g, color: c || '#b89060' }); }
  else if (kind === 'lemon') { const g = new THREE.SphereGeometry(0.032, 16, 12); g.scale(1, 1.25, 1); parts.push({ geo: g, color: c || '#e9c93a' }); }
  else if (kind === 'carrot') { parts.push({ geo: new THREE.ConeGeometry(0.018, 0.16, 10), m: M4(0, -0.08, 0, Math.PI, 0, 0), color: '#e0742a' }); for (let i = 0; i < 4; i++) parts.push({ geo: new THREE.ConeGeometry(0.004, 0.09, 4), m: M4(0, 0.04, 0, (i - 1.5) * 0.25, 0, (i % 2 - 0.5) * 0.4), color: '#4f8a2a' }); }
  else if (kind === 'greens') { for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; const g = new THREE.SphereGeometry(0.05, 10, 8); g.scale(0.6, 1.6, 0.25); parts.push({ geo: g, m: M4(Math.cos(a) * 0.025, 0.07, Math.sin(a) * 0.025, Math.sin(a) * 0.35, -a, Math.cos(a) * 0.35), color: c || pick(['#3f7a2e', '#4f8a34', '#2f6a26']) }); } parts.push({ geo: new THREE.CylinderGeometry(0.02, 0.022, 0.05, 8), m: M4(0, 0.0, 0), color: '#b7c98a' }); }
  else if (kind === 'chickpeas') { for (let i = 0; i < 1; i++) parts.push({ geo: new THREE.SphereGeometry(0.008, 8, 6), color: '#d9b67a' }); }
  else if (kind === 'bread') { const g = new THREE.CylinderGeometry(0.11, 0.11, 0.012, 24); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (noise2(p.getX(i) * 30, p.getZ(i) * 30) - 0.5) * 0.08; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); parts.push({ geo: g, color: c || '#d9a35c' }); }
  else parts.push({ geo: new THREE.SphereGeometry(0.04, 14, 10), color: c || '#c62d1f' });
  return merged(parts.map(p => Object.assign({ jitter: 0.08 }, p)));
}
export function produceMat(o = {}) { return new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: o.roughness ?? 0.35, clearcoat: o.clearcoat ?? 0.4, clearcoatRoughness: 0.3 }); }

// ------------------------------------------------------------------ reusable crate (slotted walls via alpha)
let slotTex = null;
function slots() {
  if (slotTex) return slotTex;
  slotTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; for (let y = 0; y < 3; y++) for (let x = 0; x < 9; x++) { const px = 14 + x * 26, py = 22 + y * 30; g.beginPath(); g.roundRect(px, py, 16, 20, 5); g.fill(); } g.fillRect(0, 0, 0, 0); }, { linear: true });
  slotTex.wrapS = slotTex.wrapT = THREE.ClampToEdgeWrapping; return slotTex;
}
export function crate(o = {}) {
  const w = o.w || 0.6, d = o.d || 0.4, h = o.h || 0.3, col = o.color || '#2f8a57';
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, alphaMap: slots(), alphaTest: 0.5, side: THREE.DoubleSide });
  const solid = new THREE.MeshStandardMaterial({ color: new THREE.Color(col).offsetHSL(0, 0, -0.04), roughness: 0.5 });
  const wall = (ww, x, z, ry) => { const p = mesh(new THREE.PlaneGeometry(ww, h * 0.86), m); p.position.set(x, h * 0.47, z); p.rotation.y = ry; g.add(p); };
  wall(w, 0, d / 2, 0); wall(w, 0, -d / 2, Math.PI); wall(d, w / 2, 0, Math.PI / 2); wall(d, -w / 2, 0, -Math.PI / 2);
  const base = mesh(new THREE.BoxGeometry(w, 0.02, d), solid); base.position.y = 0.01; g.add(base);
  const rim = [[w + 0.02, 0.035, 0.025, 0, h - 0.017, d / 2], [w + 0.02, 0.035, 0.025, 0, h - 0.017, -d / 2], [0.025, 0.035, d, w / 2, h - 0.017, 0], [0.025, 0.035, d, -w / 2, h - 0.017, 0]];
  for (const [a, b, c, x, y, z] of rim) g.add(at(box(a, b, c, solid), x, y, z));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(0.03, h, 0.03, solid), sx * (w / 2 - 0.012), h / 2, sz * (d / 2 - 0.012)));
  // handles
  for (const sx of [-1, 1]) g.add(at(box(0.012, 0.03, 0.12, solid), sx * (w / 2 + 0.006), h - 0.06, 0));
  if (o.fill) fillCrate(g, o.fill, w, d, h, o);
  g.userData.size = [w, h, d]; return g;
}
const produceGeos = {}; const produceMats = {};
export function fillCrate(g, kind, w, d, h, o = {}) {
  const geo = (k) => produceGeos[k] || (produceGeos[k] = k === 'tomato' ? tomatoGeo({ r: 0.036, seg: 18 }) : k === 'tomatoUgly' ? tomatoGeo({ r: 0.038, ugly: true, seg: 18, seed: 3 }) : produceGeo(k));
  const kinds = Array.isArray(kind) ? kind : [kind];
  const list = []; const cell = o.cell || 0.075; const nx = Math.floor((w - 0.04) / cell), nz = Math.floor((d - 0.04) / cell);
  const layers = o.layers ?? 2;
  for (let ly = 0; ly < layers; ly++) for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
    if (ly === layers - 1 && rnd() < 0.15) continue;
    list.push({ k: pick(kinds), x: -w / 2 + 0.02 + cell / 2 + ix * cell + R(-0.012, 0.012) + (ly % 2) * cell * 0.3, y: h * (o.level ?? 0.55) + ly * cell * 0.75 - (layers - 1) * cell * 0.75 + R(-0.01, 0.01), z: -d / 2 + 0.02 + cell / 2 + iz * cell + R(-0.012, 0.012), ry: R(0, TAU), rx: R(-0.4, 0.4), rz: R(-0.4, 0.4), s: R(0.88, 1.12) });
  }
  for (const k of kinds) { const sub = list.filter(p => p.k === k); if (!sub.length) continue; const mtl = k.startsWith('tomato') ? (produceMats.t || (produceMats.t = tomatoMat())) : (produceMats.p || (produceMats.p = produceMat())); instanced(g, geo(k), mtl, sub); }
}

// ------------------------------------------------------------------ plants
const plantCache = {};
// returns {leaves, solid, fruit} merged geometries for one plant variant
export function tomatoPlantGeos(variant = 0, o = {}) {
  const key = 'tp' + variant + JSON.stringify(o); if (plantCache[key]) return plantCache[key];
  const rr = (a, b) => a + noise2(variant * 7.3 + a * 13, b * 3.1) * (b - a);
  const h = o.height || 0.95; const leaves = [], solid = [], fruit = [];
  solid.push({ geo: new THREE.BoxGeometry(0.018, h + 0.25, 0.018), m: M4(0.03, (h + 0.25) / 2 - 0.1, 0.0), color: '#8a6a44' });
  // the main stem zigzags from leaf node to leaf node and tapers (a straight thick cylinder reads as a drinking straw)
  { const nodes = Math.max(4, Math.round(h / 0.11)), pts = []; for (let i = 0; i <= nodes; i++) { const y = h * i / nodes, side = i % 2 ? 1 : -1; pts.push(V(side * 0.007 * (i > 0 ? 1 : 0) + 0.003 * Math.sin(i * 1.7 + variant), y, side * 0.004 * Math.cos(i * 2.3 + variant))); }
    const stem = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), nodes * 6, 0.0065, 8, false), sp = stem.attributes.position;
    for (let i = 0; i < sp.count; i++) { const k = 1 - 0.45 * sp.getY(i) / h, c = V(0, sp.getY(i), 0); const cl = new THREE.Vector3().fromBufferAttribute(sp, i); const curve = pts[Math.min(nodes, Math.round(sp.getY(i) / h * nodes))]; cl.x = curve.x + (cl.x - curve.x) * k; cl.z = curve.z + (cl.z - curve.z) * k; sp.setXYZ(i, cl.x, cl.y, cl.z); }
    stem.computeVertexNormals(); solid.push({ geo: stem, m: M4(0, 0, 0, 0.03, 0, 0.04), color: '#456528' }); }
  const n = o.leaves || 13;
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + variant, y = 0.12 + (i / n) * (h - 0.12), s = 0.26 * (1 - (i / n) * 0.35) * (0.85 + (i % 3) * 0.1);
    leaves.push({ geo: cardGeo(s * 0.8, s, 0.45, 0.2), m: M4(Math.cos(a) * 0.02, y, Math.sin(a) * 0.02, -1.05 + (i % 2) * 0.2, -a + Math.PI / 2, 0), color: new THREE.Color('#ffffff').offsetHSL(0, 0, ((i * 37) % 10 - 5) * 0.012).getStyle() });
  }
  const nf = o.fruit ?? 5;
  for (let i = 0; i < nf; i++) { const a = i * 1.7 + variant * 2.1, y = 0.25 + (i / Math.max(1, nf)) * h * 0.5; const ripe = (i + variant) % 4 !== 0; const fg = tomatoGeo({ r: 0.03 + (i % 3) * 0.004, seg: 12, color: ripe ? '#c9301d' : '#8aa83a', shoulder: ripe ? '#d9782a' : '#a6b84a', seed: i }); fruit.push({ geo: fg, m: M4(Math.cos(a) * 0.1, y, Math.sin(a) * 0.1, 0, a, 0), color: '#ffffff' }); }
  const out = { leaves: merged(leaves), solid: merged(solid), fruit: fruit.length ? mergeKeepColor(fruit) : null };
  plantCache[key] = out; return out;
}
function mergeKeepColor(parts) { const geos = parts.map(p => { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone(); if (p.m) g.applyMatrix4(p.m); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); return g; }); return BGU.mergeGeometries(geos, false); }
export function lettuceGeo(variant = 0, red = false) {
  const leaves = []; const n = 14;
  for (let i = 0; i < n; i++) { const a = i * 2.39996 + variant, ring = i / n, s = 0.09 + (1 - ring) * 0.07; leaves.push({ geo: cardGeo(s * 1.1, s, -0.5, 0.0, 3), m: M4(Math.cos(a) * 0.012, 0.005 + ring * 0.03, Math.sin(a) * 0.012, -(0.25 + (1 - ring) * 1.05), -a + Math.PI / 2, 0), color: new THREE.Color('#ffffff').offsetHSL(0, 0, -ring * 0.06).getStyle() }); }
  return merged(leaves);
}
export function bushGeo(o = {}) {
  const parts = []; const s = o.size || 1; const col = o.color || '#3f6b2a';
  for (let i = 0; i < (o.blobs || 7); i++) { const g = new THREE.IcosahedronGeometry(s * (0.32 + rnd() * 0.28), 2); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const n = 1 + (noise2(p.getX(k) * 9 + i, p.getY(k) * 9 + p.getZ(k) * 5) - 0.5) * 0.35; p.setXYZ(k, p.getX(k) * n, p.getY(k) * n, p.getZ(k) * n); } g.computeVertexNormals(); parts.push({ geo: g, m: M4((rnd() - 0.5) * s * 0.9, s * (0.28 + rnd() * 0.42), (rnd() - 0.5) * s * 0.9), color: new THREE.Color(col).offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.12).getStyle(), jitter: 0.12 }); }
  if (o.flowers) for (let i = 0; i < (o.flowers === true ? 18 : o.flowers); i++) { const a = rnd() * TAU, e = rnd() * 1.2; parts.push({ geo: new THREE.SphereGeometry(s * 0.035, 5, 4), m: M4(Math.cos(a) * s * 0.55 * Math.cos(e), s * (0.45 + Math.sin(e) * 0.45), Math.sin(a) * s * 0.55 * Math.cos(e)), color: pick(o.flowerColors || ['#f2e36b', '#f4f1ea', '#c99ad8', '#f2b0c0']) }); }
  return merged(parts);
}
export function treeGeo(o = {}) {
  const parts = []; const h = o.height || 6;
  parts.push({ geo: new THREE.CylinderGeometry(h * 0.035, h * 0.06, h * 0.5, 8), m: M4(0, h * 0.25, 0), color: '#5b4632' });
  for (let i = 0; i < 3; i++) parts.push({ geo: new THREE.CylinderGeometry(h * 0.012, h * 0.025, h * 0.3, 5), m: M4(0, h * 0.45, 0, (i - 1) * 0.6, i * 2, (i - 1) * 0.4), color: '#5b4632' });
  for (let i = 0; i < 7; i++) { const g = new THREE.IcosahedronGeometry(h * (0.18 + rnd() * 0.12), 2); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const n = 1 + (noise2(p.getX(k) * 2 + i * 3, p.getY(k) * 2 + p.getZ(k)) - 0.5) * 0.3; p.setXYZ(k, p.getX(k) * n, p.getY(k) * n, p.getZ(k) * n); } g.computeVertexNormals(); parts.push({ geo: g, m: M4((rnd() - 0.5) * h * 0.42, h * (0.55 + rnd() * 0.3), (rnd() - 0.5) * h * 0.42), color: new THREE.Color(o.color || '#4a7a32').offsetHSL((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.12).getStyle(), jitter: 0.1 }); }
  return merged(parts);
}
export function grassGeo() { const parts = []; for (let i = 0; i < 5; i++) parts.push({ geo: cardGeo(0.3, 0.32, 0.3, 0.3, 2), m: M4(0, 0, 0, 0, i * 1.2566, 0), color: '#ffffff' }); return merged(parts); }
export function flowerCardsGeo() { const g = new THREE.PlaneGeometry(0.16, 0.16); const parts = []; for (let i = 0; i < 3; i++) { const q = g.clone(); const uv = q.attributes.uv; const k = i % 4, ox = (k % 2) * 0.5, oy = Math.floor(k / 2) * 0.5; for (let j = 0; j < uv.count; j++) uv.setXY(j, ox + uv.getX(j) * 0.5, oy + uv.getY(j) * 0.5); parts.push({ geo: q, m: M4(R(-0.15, 0.15), R(0.25, 0.55), R(-0.15, 0.15), -Math.PI / 2 + R(-0.5, 0.5), R(0, TAU), 0), color: '#ffffff' }); } return merged(parts); }

// ------------------------------------------------------------------ kitchen & tableware
export function lathe(points, material, seg = 32) { return mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg), material); }
export const ware = {
  bowl: (r = 0.12, c = '#e7dccb') => lathe([[0.0, 0], [r * 0.55, 0], [r * 0.6, 0.008], [r * 0.85, r * 0.3], [r, r * 0.62], [r * 0.96, r * 0.64], [r * 0.82, r * 0.34], [r * 0.5, r * 0.08], [0.0, r * 0.08]], clayMat(c, { normal: 'clay', ns: 0.15, roughness: 0.4, clearcoat: 0.6 })),
  plate: (r = 0.13, c = '#efe8dc') => lathe([[0, 0], [r * 0.6, 0], [r * 0.65, 0.006], [r * 0.7, 0.008], [r, 0.022], [r * 0.97, 0.026], [r * 0.68, 0.014], [0, 0.014]], clayMat(c, { normal: 'clay', ns: 0.1, roughness: 0.35, clearcoat: 0.6 })),
  cup: (r = 0.04, c = '#d9cbb3') => lathe([[0, 0], [r * 0.8, 0], [r, r * 0.4], [r * 1.05, r * 2.2], [r * 0.96, r * 2.2], [r * 0.88, r * 0.3], [0, r * 0.3]], clayMat(c, { normal: 'clay', ns: 0.15, roughness: 0.45, clearcoat: 0.5 })),
  glass: (r = 0.035) => lathe([[0, 0], [r * 0.9, 0], [r, r * 0.2], [r * 1.12, r * 2.8], [r * 1.08, r * 2.8], [r * 0.92, r * 0.25], [0, r * 0.25]], MAT.glass({ opacity: 0.25 })),
  pot: (r = 0.2, h = 0.22) => { const g = new THREE.Group(); g.add(lathe([[0, 0], [r * 0.95, 0], [r, 0.02], [r, h], [r * 1.04, h + 0.01], [r * 0.97, h], [r * 0.95, 0.03], [0, 0.03]], MAT.brushed())); for (const s of [-1, 1]) g.add(at(rot(box(0.07, 0.022, 0.03, MAT.darkMetal()), 0, 0, 0), s * (r + 0.03), h - 0.03, 0)); return g; },
  board: (w = 0.42, d = 0.28) => box(w, 0.022, d, woodMat('#d7ad7c', { kind: 'edge', maps: { scratches: 7, rough: 0.58, seed: 5 }, clearcoat: 0, ns: 0.8 }), { r: 0.008, seg: 4 }),
  knife: () => { const g = new THREE.Group(); g.add(at(box(0.024, 0.003, 0.15, MAT.steel()), 0, 0, 0.075)); g.add(at(box(0.022, 0.016, 0.1, mat('#2a2622', { roughness: 0.5 }), { r: 0.006 }), 0, 0, -0.05)); return g; },
  fork: () => { const g = new THREE.Group(); g.add(at(box(0.012, 0.004, 0.12, MAT.steel()), 0, 0, -0.04)); for (let i = 0; i < 3; i++) g.add(at(box(0.003, 0.003, 0.045, MAT.steel()), (i - 1) * 0.008, 0, 0.045)); return g; },
  spoon: () => { const g = new THREE.Group(); g.add(at(box(0.01, 0.004, 0.11, MAT.steel()), 0, 0, -0.04)); const b = mesh(new THREE.SphereGeometry(0.018, 12, 8), MAT.steel()); b.scale.set(1, 0.3, 1.4); b.position.z = 0.03; g.add(b); return g; },
};
export function stewSurface(r = 0.18, o = {}) { // tomato–chickpea stew: glossy surface with chickpeas and herbs
  const g = new THREE.Group(); const base = mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshPhysicalMaterial({ color: o.color || '#b8401f', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 })); base.rotation.x = -Math.PI / 2; g.add(base);
  const peas = []; for (let i = 0; i < (o.count || 40); i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r * 0.9; peas.push({ x: Math.cos(a) * d, y: 0.002, z: Math.sin(a) * d, s: R(0.8, 1.2), ry: rnd() * 6 }); }
  instanced(g, new THREE.SphereGeometry(0.009, 8, 6), mat('#d8b070', { roughness: 0.5 }), peas);
  const herbs = []; for (let i = 0; i < 18; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r * 0.85; herbs.push({ x: Math.cos(a) * d, y: 0.004, z: Math.sin(a) * d, ry: rnd() * 6, rx: -Math.PI / 2 }); }
  instanced(g, new THREE.CircleGeometry(0.008, 6), mat('#3f7a2e', { roughness: 0.6, side: THREE.DoubleSide }), herbs);
  return g;
}
export function chair(o = {}) {
  const g = new THREE.Group(); const w = MAT.wood(o.color || '#9a7048', 0.5); const sh = o.seat || 0.46;
  g.add(at(box(0.44, 0.035, 0.42, w, { r: 0.01 }), 0, sh, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(0.035, sh, 0.035, w), sx * 0.19, sh / 2, sz * 0.18));
  if (!o.stool) { for (const sx of [-1, 1]) g.add(at(box(0.035, 0.45, 0.035, w), sx * 0.19, sh + 0.22, -0.19)); g.add(at(box(0.42, 0.12, 0.025, w, { r: 0.008 }), 0, sh + 0.36, -0.19)); }
  return g;
}
export function table(o = {}) {
  const g = new THREE.Group(); const L = o.l || 2.4, W = o.w || 0.9, H = o.h || 0.76; const w = MAT.wood(o.color || '#b58b5d', 1.2);
  g.add(at(box(L, 0.05, W, w, { r: 0.012 }), 0, H - 0.025, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(0.07, H - 0.05, 0.07, MAT.wood('#8e6a44')), sx * (L / 2 - 0.12), (H - 0.05) / 2, sz * (W / 2 - 0.1)));
  g.add(at(box(L - 0.3, 0.08, 0.03, MAT.wood('#8e6a44')), 0, H - 0.09, W / 2 - 0.1)); g.add(at(box(L - 0.3, 0.08, 0.03, MAT.wood('#8e6a44')), 0, H - 0.09, -W / 2 + 0.1));
  g.userData.top = H; return g;
}
export function jarShelf(o = {}) {
  const g = new THREE.Group(); const L = o.l || 2.4; const w = MAT.wood('#8e6a44', 0.8);
  for (let k = 0; k < (o.levels || 2); k++) { const y = k * 0.42; g.add(at(box(L, 0.035, 0.28, w), 0, y, 0)); let x = -L / 2 + 0.12;
    while (x < L / 2 - 0.12) { const h = R(0.12, 0.24), r = R(0.045, 0.075); const jar = new THREE.Group(); jar.add(mesh(new THREE.CylinderGeometry(r, r, h, 16), MAT.glass({ opacity: 0.3 }))); const fill = mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.92, h * R(0.4, 0.85), 14), mat(pick(['#d9b06a', '#b74a2a', '#6a8b3a', '#e8dfc8', '#8a5a3c', '#e9b73a', '#5a3a2a', '#c96a2a']), { roughness: 0.9 })); fill.position.y = -h * 0.12; jar.add(fill); jar.add(at(cyl(r * 1.02, r * 1.02, 0.025, mat(pick(['#3a3a3a', '#b8322a', '#d7c9a8', '#2f6b5a']), { roughness: 0.4 }), 16), 0, h / 2 + 0.012, 0)); jar.position.set(x + r, y + 0.018 + h / 2, R(-0.04, 0.04)); g.add(jar); x += r * 2 + R(0.02, 0.06); } }
  return g;
}
export function pendantLamp(app, o = {}) {
  const g = new THREE.Group(); const shade = mesh(new THREE.ConeGeometry(o.r || 0.22, 0.2, 28, 1, true), mat(o.color || '#2f3a33', { side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 }), { cast: false }); g.add(shade);
  g.add(at(mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffe2b0', emissiveIntensity: 6 }), { cast: false }), 0, -0.07, 0));
  g.add(at(mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 4), mat('#111'), { cast: false }), 0, 0.7, 0));
  const pl = new THREE.PointLight(o.light || '#ffcf94', o.intensity ?? 2.2, o.range ?? 6, 2); pl.position.y = -0.12; if (o.shadow) { pl.castShadow = true; pl.shadow.mapSize.set(1024, 1024); pl.shadow.bias = -0.002; pl.shadow.radius = 6; } g.add(pl);
  if (o.pos) g.position.set(...o.pos); app.scene.add(g); return g;
}
export function windowFrame(o = {}) {
  const g = new THREE.Group(); const W = o.w || 1.6, H = o.h || 1.4; const fm = mat(o.frame || '#efe9df', { roughness: 0.5 });
  const t = 0.06; g.add(at(box(W + t * 2, t, 0.12, fm), 0, H / 2 + t / 2, 0)); g.add(at(box(W + t * 2, t * 1.5, 0.22, fm), 0, -H / 2 - t * 0.75, 0.05)); g.add(at(box(t, H, 0.12, fm), -W / 2 - t / 2, 0, 0)); g.add(at(box(t, H, 0.12, fm), W / 2 + t / 2, 0, 0));
  g.add(at(box(0.035, H, 0.06, fm), 0, 0, 0)); g.add(at(box(W, 0.035, 0.06, fm), 0, H * 0.18, 0));
  const glass = mesh(new THREE.PlaneGeometry(W, H), MAT.glass({ opacity: 0.08 }), { cast: false }); g.add(glass);
  return g;
}

// ------------------------------------------------------------------ backdrop painter (views through windows / distant city)
// a dusk view: graded sky with thin clouds lit from below, the glow where the sun went down, far tree lines and roofs as
// silhouettes, a few lit windows and street lamps. Shapes come from noise rather than blocks, so under the lens blur it
// reads as a real place. Eye level (the horizon) sits at o.eyeLevel of the height.
function paintDusk(g, w, h, o) {
  const hz = Math.round(h * (o.eyeLevel ?? 0.56)), sky = g.createLinearGradient(0, 0, 0, hz);
  [[0, '#111931'], [0.35, '#232f58'], [0.62, '#474c77'], [0.8, '#866779'], [0.92, '#c1816b'], [1, '#e0a06c']].forEach(([t, c]) => sky.addColorStop(t, c));
  g.fillStyle = sky; g.fillRect(0, 0, w, hz + 2);
  const gx = w * 0.7, glow = g.createRadialGradient(gx, hz, 0, gx, hz, w * 0.45); glow.addColorStop(0, 'rgba(255,186,118,0.5)'); glow.addColorStop(0.4, 'rgba(236,136,98,0.16)'); glow.addColorStop(1, 'rgba(236,136,98,0)');
  g.fillStyle = glow; g.fillRect(0, 0, w, hz);
  const img = g.getImageData(0, 0, w, hz), d = img.data;   // thin clouds: slate up high, warm underneath near the horizon
  for (let y = 0; y < hz; y++) { const v = y / hz; for (let x = 0; x < w; x++) { const n = fbm(x / w * 9, y / hz * 3.2 + 7, 5), c = clamp((n - 0.52) * 3.2, 0, 1) * (0.35 + 0.65 * smooth(v * 1.4)) * (1 - smooth((v - 0.93) / 0.07));
      if (c <= 0) continue; const i = (y * w + x) * 4, lit = smooth((v - 0.45) / 0.5); d[i] = lerp(d[i], lerp(70, 245, lit), c * 0.55); d[i + 1] = lerp(d[i + 1], lerp(72, 150, lit), c * 0.55); d[i + 2] = lerp(d[i + 2], lerp(102, 122, lit), c * 0.55); } }
  g.putImageData(img, 0, 0);
  const treeline = (base, amp, freq, sy, color) => { g.fillStyle = color; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 2) g.lineTo(x, base - amp * (0.7 * fbm(x / w * freq, sy, 5) + 0.6 * Math.pow(noise2(x / w * freq * 4.2, sy + 3), 2)));
    g.lineTo(w, h); g.closePath(); g.fill(); };
  treeline(hz - 3, h * 0.05, 6, 11, '#2a2f46');                                                     // farthest, in the haze
  for (let i = 0; i < 7; i++) { const x = rnd() * w, bw = 60 + rnd() * 110, bh = 26 + rnd() * 34, roof = bh * (0.5 + rnd() * 0.4), y0 = hz + 4;   // roofs between them
    g.fillStyle = '#1e2131'; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 - bh); g.lineTo(x + bw / 2, y0 - bh - roof); g.lineTo(x + bw, y0 - bh); g.lineTo(x + bw, y0); g.closePath(); g.fill();
    for (let k = 0, nk = 1 + Math.floor(rnd() * 3); k < nk; k++) { const ww = 7 + rnd() * 6, wh = 9 + rnd() * 6, wx = x + 10 + rnd() * (bw - 20 - ww), wy = y0 - bh + 6 + rnd() * Math.max(1, bh - 14 - wh), cx = wx + ww / 2, cy = wy + wh / 2;
      const gl = g.createRadialGradient(cx, cy, 0, cx, cy, 26); gl.addColorStop(0, 'rgba(255,190,110,0.32)'); gl.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gl; g.fillRect(cx - 26, cy - 26, 52, 52);
      g.fillStyle = pick(['#ffcf88', '#ffbd6c', '#ffe0a4', '#f3b169']); g.fillRect(wx, wy, ww, wh); g.fillStyle = 'rgba(40,28,26,0.4)'; g.fillRect(wx + ww * 0.46, wy, 1.2, wh); g.fillRect(wx, wy + wh * 0.45, ww, 1.2); } }
  treeline(hz + 8, h * 0.085, 4, 23, '#151926');                                                    // nearer trees in front of the houses
  for (let i = 0; i < 4; i++) { const x = (0.08 + i * 0.25 + rnd() * 0.1) * w, y = hz - 4 - rnd() * 10, gl = g.createRadialGradient(x, y, 0, x, y, 30);   // street lamps
    gl.addColorStop(0, 'rgba(255,216,152,0.95)'); gl.addColorStop(0.12, 'rgba(255,192,122,0.45)'); gl.addColorStop(1, 'rgba(255,170,100,0)'); g.fillStyle = gl; g.fillRect(x - 30, y - 30, 60, 60); }
  const gr = g.createLinearGradient(0, hz, 0, h); gr.addColorStop(0, '#141722'); gr.addColorStop(1, '#0c0e13'); g.fillStyle = gr; g.fillRect(0, hz + 10, w, h);
}
// a daytime town seen across a yard or over a field: hazy sky with cumulus, a far skyline lost in the haze, a row of
// four-to-seven storey buildings (cornices, framed windows reflecting the sky, shopfronts and awnings at street level,
// roofs and chimneys), street trees, and the street. o.eyeLevel / o.street: horizon and street line (fractions of the
// height); o.storey: storey height (px) of the near row, which sets how far away the town looks.
function paintTown(g, w, h, o) {
  const hz = Math.round(h * (o.eyeLevel ?? 0.62)), st = Math.round(h * (o.street ?? 0.7)), S = o.storey ?? 54;
  const sky = g.createLinearGradient(0, 0, 0, hz); [[0, o.top || '#7ea7d6'], [0.55, '#a9c4e0'], [1, o.horizon || '#ece4d6']].forEach(([t, c]) => sky.addColorStop(t, c));
  g.fillStyle = sky; g.fillRect(0, 0, w, hz + 2);
  { const img = g.getImageData(0, 0, w, hz), d = img.data;   // cumulus: lit tops, blue-grey bases, flattening towards the horizon
    for (let y = 0; y < hz; y++) { const v = y / hz, sq = 1 + 3 * v * v; for (let x = 0; x < w; x++) { const n = fbm(x / w * 7, y / hz * 2.2 * sq + 3, 5), c = clamp((n - 0.56) * 4.5, 0, 1) * (1 - smooth((v - 0.86) / 0.14));
      if (c <= 0) continue; const shade = clamp((fbm(x / w * 7, (y + 6) / hz * 2.2 * sq + 3, 4) - n) * 6 + 0.5, 0, 1), i = (y * w + x) * 4;
      const r = lerp(250, 176, shade), gg = lerp(250, 186, shade), b = lerp(252, 204, shade); d[i] = lerp(d[i], r, c * 0.9); d[i + 1] = lerp(d[i + 1], gg, c * 0.9); d[i + 2] = lerp(d[i + 2], b, c * 0.9); } }
    g.putImageData(img, 0, 0); }
  const haze = new THREE.Color(o.horizon || '#ece4d6'), mix = (c, k) => new THREE.Color(c).lerp(haze, k).getStyle();
  // far skyline: flat shapes in the haze
  for (let x = -20; x < w; ) { const bw = S * (0.6 + rnd() * 2.2), bh = S * (0.8 + rnd() * 3.2) * (rnd() < 0.12 ? 2.4 : 1); g.fillStyle = mix(pick(['#8f99a6', '#9aa0a4', '#a39a8e', '#8c98a0']), 0.62); g.fillRect(x, hz - bh, bw, bh + 4);
    g.fillStyle = mix('#c8d2dc', 0.7); for (let yy = hz - bh + S * 0.3; yy < hz - 4; yy += S * 0.32) g.fillRect(x + 3, yy, bw - 6, Math.max(1, S * 0.05)); x += bw + rnd() * S * 0.4; }
  // the near row
  const walls = ['#e2c9a2', '#d8a77e', '#efe2c8', '#c98d6c', '#e6d3a6', '#c9b79a', '#d9b48c', '#e9d9bd', '#b9a088'];
  for (let x = -rnd() * S; x < w; ) { const floors = 3 + Math.floor(rnd() * 4), bw = S * (2.2 + rnd() * 3.2), top = st - floors * S - S * 0.35, wall = pick(walls), far = 0.18 + rnd() * 0.1;
    const wg = g.createLinearGradient(0, top, 0, st); wg.addColorStop(0, mix(new THREE.Color(wall).offsetHSL(0, 0, 0.04).getStyle(), far)); wg.addColorStop(1, mix(new THREE.Color(wall).offsetHSL(0, 0.02, -0.08).getStyle(), far)); g.fillStyle = wg; g.fillRect(x, top, bw, st - top);
    const roofH = S * (0.35 + rnd() * 0.5), pitched = rnd() < 0.6; g.fillStyle = mix(pick(['#7a4a3a', '#5a5c62', '#8a5440', '#4e5258']), far);
    if (pitched) { g.beginPath(); g.moveTo(x - 2, top); g.lineTo(x + bw * 0.12, top - roofH); g.lineTo(x + bw * 0.88, top - roofH); g.lineTo(x + bw + 2, top); g.fill(); }
    else { g.fillRect(x, top - S * 0.12, bw, S * 0.12); }
    for (let c = 0, nc = Math.floor(rnd() * 3); c < nc; c++) { g.fillStyle = mix('#6a4a3a', far); g.fillRect(x + bw * (0.2 + rnd() * 0.6), top - (pitched ? roofH : S * 0.12) - S * 0.25, S * 0.14, S * 0.35); }
    g.fillStyle = mix('#f4ecdc', far); g.fillRect(x - 1, top - 1, bw + 2, S * 0.09); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, top + S * 0.09, bw, S * 0.05);   // cornice and its shadow
    const cols = Math.max(2, Math.floor(bw / (S * 0.72))), cw = bw / cols, ww = cw * 0.42, wh = S * 0.52;
    for (let f = 0; f < floors; f++) { const yy = top + S * 0.28 + f * S;
      for (let c = 0; c < cols; c++) { const xx = x + c * cw + (cw - ww) / 2;
        g.fillStyle = mix('#f2ead8', far); g.fillRect(xx - S * 0.035, yy - S * 0.035, ww + S * 0.07, wh + S * 0.07);   // frame
        const gl = g.createLinearGradient(0, yy, 0, yy + wh); gl.addColorStop(0, mix('#9fb8cf', far)); gl.addColorStop(0.5, mix('#5d6f80', far)); gl.addColorStop(1, mix('#36404a', far)); g.fillStyle = gl; g.fillRect(xx, yy, ww, wh);   // sky in the glass
        if (rnd() < 0.35) { g.fillStyle = mix(pick(['#e9dcc0', '#d9c2a0', '#efe6d6']), far); g.fillRect(xx, yy, ww * 0.28, wh); g.fillRect(xx + ww * 0.72, yy, ww * 0.28, wh); }   // curtains
        g.fillStyle = mix('#f2ead8', far); g.fillRect(xx + ww / 2 - 0.6, yy, 1.2, wh); g.fillRect(xx, yy + wh * 0.45, ww, 1.2);   // glazing bars
        g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(xx - S * 0.05, yy + wh + S * 0.035, ww + S * 0.1, S * 0.04); } }   // sill shadow
    const sh = st - S * 0.95; g.fillStyle = mix(pick(['#2f4a3a', '#5a2a2a', '#1f2f45', '#3a2f24']), far); g.fillRect(x + 2, sh, bw - 4, st - sh);   // shopfronts
    for (let c = 0; c < cols; c++) { const xx = x + c * cw + cw * 0.12; const gl = g.createLinearGradient(0, sh, 0, st); gl.addColorStop(0, mix('#d9b98a', far)); gl.addColorStop(1, mix('#6a5040', far)); g.fillStyle = gl; g.fillRect(xx, sh + S * 0.12, cw * 0.76, S * 0.62); }
    if (rnd() < 0.6) { const ac = pick(['#b8322a', '#2f6a5a', '#e2a12a', '#2f4a8a']); for (let k = 0; k < 10; k++) { g.fillStyle = mix(k % 2 ? ac : '#f2ead8', far); g.beginPath(); const ax = x + 4 + k * (bw - 8) / 10; g.moveTo(ax, sh); g.lineTo(ax + (bw - 8) / 10, sh); g.lineTo(ax + (bw - 8) / 10 + S * 0.04, sh + S * 0.3); g.lineTo(ax + S * 0.04, sh + S * 0.3); g.fill(); } }   // awning
    if (rnd() < 0.5) { g.fillStyle = 'rgba(40,46,60,0.16)'; g.fillRect(x + bw * 0.62, top, bw * 0.38, st - top); }   // in the shade of its neighbour
    x += bw + (rnd() < 0.2 ? S * (0.3 + rnd() * 1.2) : 0); }
  // street trees: leafy canopies lit from the upper left
  for (let i = 0, n = Math.round(w / (S * 3.4)); i < n; i++) { const cx = (i + 0.3 + rnd() * 0.5) * w / n, cy = st - S * (1.5 + rnd() * 0.9), R0 = S * (0.8 + rnd() * 0.5);
    g.fillStyle = mix('#4a3a2a', 0.15); g.fillRect(cx - S * 0.05, cy, S * 0.1, st - cy);
    for (let k = 0; k < 260; k++) { const a = rnd() * TAU, rr = Math.sqrt(rnd()) * R0, px = cx + Math.cos(a) * rr * 1.1, py = cy + Math.sin(a) * rr * 0.85, lit = clamp(0.5 - (px - cx) / R0 * 0.3 - (py - cy) / R0 * 0.45 + (rnd() - 0.5) * 0.4, 0, 1);
      g.fillStyle = mix(new THREE.Color('#2f4a24').lerp(new THREE.Color('#8aa850'), lit).getStyle(), 0.12); g.beginPath(); g.arc(px, py, S * (0.07 + rnd() * 0.08), 0, TAU); g.fill(); } }
  // pavement and road
  g.fillStyle = mix('#b9b2a6', 0.08); g.fillRect(0, st, w, S * 0.25); g.fillStyle = '#8f8b86'; g.fillRect(0, st + S * 0.25, w, h - st);
  g.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = 0; x < w; x += S * 2.2) g.fillRect(x, st + S * 0.9, S * 1.1, Math.max(2, S * 0.05));
}
export function backdropTex(kind, o = {}) {
  return canvasTex(kind === 'garden' ? 1024 : 2048, kind === 'garden' ? 512 : 1024, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.7); sky.addColorStop(0, o.top || '#8fb3d8'); sky.addColorStop(1, o.horizon || '#f1dcc0'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    if (kind === 'street' || kind === 'city') { paintTown(g, w, h, kind === 'city' ? { eyeLevel: 0.655, street: 0.668, storey: 16, ...o } : { eyeLevel: 0.62, street: 0.72, storey: 40, ...o }); return; }
    if (kind === 'garden') {
      for (let i = 0; i < 18; i++) { const x = rnd() * w, y = h * (0.08 + rnd() * 0.3), rr = 30 + rnd() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
      if (o.trees !== false) for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 34; i++) { const x = rnd() * w, y = h * (0.5 + layer * 0.05 + rnd() * 0.12), r = (30 + rnd() * 70) * (1 - layer * 0.2); const c = new THREE.Color(o.tree || '#5f8a45').offsetHSL((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.18 - layer * 0.04 + 0.08 - layer * 0.02); g.fillStyle = c.getStyle(); g.globalAlpha = 0.85 + layer * 0.05; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.globalAlpha = 1; }
      g.fillStyle = o.ground || '#6d8a4a'; g.fillRect(0, h * 0.62, w, h);
    }
    if (kind === 'dusk') paintDusk(g, w, h, o);
  });
}
export function backdrop(app, kind, o = {}) { const m = new THREE.MeshBasicMaterial({ map: backdropTex(kind, o), fog: false, toneMapped: true }); m.color.setScalar(o.brightness ?? 1.0); const p = new THREE.Mesh(new THREE.PlaneGeometry(o.w || 30, o.h || 15), m); if (o.pos) p.position.set(...o.pos); if (o.ry) p.rotation.y = o.ry; app.scene.add(p); return p; }

// ------------------------------------------------------------------ industrial
export function fermenter(o = {}) {
  const g = new THREE.Group(); const r = o.r || 0.55, h = o.h || 1.6, lift = o.lift || 0.55; const st = MAT.steel();
  const pts = [[0, -0.18 * r], [r * 0.5, -0.14 * r], [r * 0.85, -0.06 * r], [r, 0.04 * r], [r, h], [r * 0.85, h + 0.1 * r], [r * 0.5, h + 0.17 * r], [0, h + 0.2 * r]].map(([a, b]) => new THREE.Vector2(a, b));
  const body = mesh(new THREE.LatheGeometry(pts, 40), st); body.position.y = lift; g.add(body);
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; g.add(at(cyl(0.035, 0.035, lift + 0.1, MAT.brushed(), 10), Math.cos(a) * r * 0.82, (lift + 0.1) / 2, Math.sin(a) * r * 0.82)); }
  g.add(at(cyl(0.16, 0.16, 0.08, MAT.brushed(), 24), 0.12, lift + h + 0.2 * r + 0.02, 0));
  // sight glass, valves, gauge, jacket bands
  const sight = new THREE.Group(); sight.add(mesh(new THREE.BoxGeometry(0.06, 0.32, 0.03), MAT.brushed())); const win = mesh(new THREE.PlaneGeometry(0.035, 0.28), new THREE.MeshPhysicalMaterial({ color: '#f1e9d6', roughness: 0.2, emissive: '#3a3020', emissiveIntensity: 0.3 })); win.position.z = 0.016; sight.add(win); sight.position.set(0, lift + h * 0.45, r + 0.012); g.add(sight);
  for (const y of [0.3, 0.65, 0.95]) { const band = mesh(new THREE.TorusGeometry(r + 0.008, 0.012, 6, 48), MAT.brushed()); band.position.set(0, lift + h * y, 0); band.rotation.x = Math.PI / 2; g.add(band); }
  const valve = (x, y, z, ry) => { const v = new THREE.Group(); v.add(rot(cyl(0.025, 0.025, 0.14, MAT.brushed(), 10), Math.PI / 2, 0, 0)); const wheel = mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 16), mat('#b8322a', { roughness: 0.4 })); wheel.position.z = 0.08; v.add(wheel); v.position.set(x, y, z); v.rotation.y = ry; g.add(v); };
  valve(r * 0.7, lift + 0.05, r * 0.7, Math.PI / 4); valve(-r * 0.95, lift + h * 0.2, 0.0, -Math.PI / 2);
  const gauge = new THREE.Group(); gauge.add(rot(cyl(0.06, 0.06, 0.03, MAT.steel(), 20), Math.PI / 2, 0, 0)); const face = mesh(new THREE.CircleGeometry(0.052, 24), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.3 })); face.position.z = 0.016; gauge.add(face); const needle = box(0.004, 0.04, 0.002, mat('#b8322a')); needle.position.set(0.006, 0.01, 0.018); needle.rotation.z = -0.6; gauge.add(needle); gauge.position.set(-r * 0.5, lift + h * 0.8, r * 0.88); gauge.rotation.y = -0.5; g.add(gauge);
  return g;
}
export function pipe(points, r = 0.025, material) { const curve = new THREE.CatmullRomCurve3(points.map(p => V(...p)), false, 'catmullrom', 0.05); return mesh(new THREE.TubeGeometry(curve, Math.max(16, points.length * 12), r, 10, false), material || MAT.brushed()); }
export function rack(o = {}) {
  const g = new THREE.Group(); const L = o.l || 2.7, D = o.d || 1.0, H = o.h || 3.0, levels = o.levels || 3;
  const up = mat(o.upright || '#2f5a8a', { roughness: 0.5, metalness: 0.4 }), beam = mat(o.beam || '#e2742a', { roughness: 0.5, metalness: 0.3 });
  for (const x of [-L / 2, L / 2]) for (const z of [-D / 2, D / 2]) g.add(at(box(0.08, H, 0.08, up), x, H / 2, z));
  for (let k = 0; k < levels; k++) { const y = 0.15 + k * (H - 0.2) / levels; for (const z of [-D / 2, D / 2]) g.add(at(box(L, 0.1, 0.05, beam), 0, y, z)); g.add(at(box(L, 0.025, D, mat('#9aa0a6', { roughness: 0.6, metalness: 0.5 })), 0, y + 0.06, 0)); }
  g.userData.levels = Array.from({ length: levels }, (_, k) => 0.15 + k * (H - 0.2) / levels + 0.075); return g;
}
export function van(o = {}) {
  const g = new THREE.Group(); const col = o.color || '#eef2f3', acc = o.accent || '#2f8f6a';
  const bodyM = mat(col, { roughness: 0.35, metalness: 0.1, clearcoat: 0.6 }); const accM = mat(acc, { roughness: 0.4 });
  g.add(at(box(2.05, 2.0, 3.6, bodyM, { r: 0.08 }), 0, 1.45, -0.6));                 // insulated box
  g.add(at(box(2.0, 1.25, 1.55, bodyM, { r: 0.12 }), 0, 1.08, 1.95));                 // cab
  g.add(at(box(2.06, 0.32, 3.62, accM, { r: 0.04 }), 0, 0.72, -0.6));
  g.add(at(box(1.2, 0.35, 0.7, mat('#dfe5e8', { roughness: 0.4 }), { r: 0.06 }), 0, 2.6, 0.95)); // reefer unit
  const ws = mesh(new THREE.PlaneGeometry(1.8, 0.8), new THREE.MeshPhysicalMaterial({ color: '#1d2a33', roughness: 0.05, metalness: 0.2, clearcoat: 1 })); ws.position.set(0, 1.45, 2.73); ws.rotation.x = -0.35; g.add(ws);
  for (const sx of [-1, 1]) { const sw = mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshPhysicalMaterial({ color: '#1d2a33', roughness: 0.05, clearcoat: 1 })); sw.position.set(sx * 1.005, 1.42, 2.1); sw.rotation.y = sx * Math.PI / 2; g.add(sw); }
  for (const sx of [-1, 1]) for (const z of [1.85, -1.5]) { const w = new THREE.Group(); w.add(rot(cyl(0.38, 0.38, 0.28, MAT.rubber(), 24), 0, 0, Math.PI / 2)); w.add(rot(cyl(0.22, 0.22, 0.29, MAT.brushed(), 16), 0, 0, Math.PI / 2)); w.position.set(sx * 0.98, 0.38, z); g.add(w); }
  for (const sx of [-1, 1]) g.add(at(mesh(new THREE.CircleGeometry(0.09, 16), MAT.emissive('#fff4dc', 1.5)), sx * 0.75, 0.95, 2.74));
  g.add(at(box(1.0, 0.05, 0.05, mat('#222')), 0, 0.62, 2.74));
  // rear doors (hinged) — open by setting g.userData.doorOpen 0..1
  const doors = []; for (const sx of [-1, 1]) { const hinge = new THREE.Group(); hinge.position.set(sx * 1.0, 1.45, -2.41); const d = box(1.0, 1.95, 0.05, bodyM); d.position.x = -sx * 0.5; hinge.add(d); g.add(hinge); doors.push([hinge, sx]); }
  g.userData.setDoors = (u) => { for (const [h, sx] of doors) h.rotation.y = sx * u * 1.9; };
  // interior (cool white)
  const interior = mesh(new THREE.BoxGeometry(1.9, 1.85, 3.45), mat('#dfe6ea', { side: THREE.BackSide, roughness: 0.6 }), { cast: false }); interior.position.set(0, 1.45, -0.6); g.add(interior);
  const il = new THREE.PointLight('#e8f2ff', 1.2, 4, 2); il.position.set(0, 2.2, -1.2); g.add(il);
  return g;
}
export function cart(o = {}) { // small electric utility vehicle
  const g = new THREE.Group(); const c = o.color || '#5f7f3a'; const bm = mat(c, { roughness: 0.4, clearcoat: 0.4 });
  g.add(at(box(1.1, 0.3, 2.2, bm, { r: 0.05 }), 0, 0.5, 0)); g.add(at(box(1.05, 0.55, 0.7, mat('#e5e0d2', { roughness: 0.6 }), { r: 0.06 }), 0, 0.92, 0.6));
  g.add(at(box(1.0, 0.05, 1.15, mat('#8a8578', { roughness: 0.7 })), 0, 0.68, -0.45));
  for (const sx of [-1, 1]) g.add(at(box(0.05, 0.85, 0.05, MAT.darkMetal()), sx * 0.5, 1.2, 0.25)); g.add(at(box(1.15, 0.05, 1.0, mat('#e5e0d2', { roughness: 0.6 }), { r: 0.02 }), 0, 1.64, 0.4));
  const solar = mesh(new THREE.PlaneGeometry(1.0, 0.85), mat('#1b2a44', { roughness: 0.15, metalness: 0.6 })); solar.rotation.x = -Math.PI / 2; solar.position.set(0, 1.67, 0.4); g.add(solar);
  for (const sx of [-1, 1]) for (const z of [0.72, -0.72]) g.add(at(rot(cyl(0.26, 0.26, 0.2, MAT.rubber(), 20), 0, 0, Math.PI / 2), sx * 0.58, 0.26, z));
  return g;
}
export function handTruck() { const g = new THREE.Group(); const m = mat('#c8322a', { roughness: 0.5, metalness: 0.3 }); for (const sx of [-1, 1]) g.add(at(rot(cyl(0.015, 0.015, 1.25, m, 8), 0.12, 0, 0), sx * 0.2, 0.62, -0.07)); g.add(at(box(0.45, 0.02, 0.25, m), 0, 0.03, 0.1)); g.add(at(rot(cyl(0.015, 0.015, 0.42, m, 8), 0, 0, Math.PI / 2), 0, 1.22, -0.14)); for (const sx of [-1, 1]) g.add(at(rot(cyl(0.11, 0.11, 0.06, MAT.rubber(), 16), 0, 0, Math.PI / 2), sx * 0.26, 0.11, -0.1)); return g; }
export function stripCurtain(w = 1.6, h = 2.2) { const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color: '#d9e6ea', transparent: true, opacity: 0.35, roughness: 0.25, side: THREE.DoubleSide, depthWrite: false }); const n = Math.round(w / 0.2); for (let i = 0; i < n; i++) { const s = mesh(new THREE.PlaneGeometry(0.19, h), m, { cast: false }); s.position.set(-w / 2 + 0.1 + i * 0.2, -h / 2, 0.002 * (i % 2)); g.add(s); } g.userData.strips = g.children; return g; }

// ------------------------------------------------------------------ market
export function stall(o = {}) {
  const g = new THREE.Group(); const W = o.w || 2.6, D = o.d || 1.4, c1 = o.c1 || '#c8433a', c2 = o.c2 || '#f2ead8';
  const pole = MAT.darkMetal();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(cyl(0.025, 0.025, 2.3 + (sz < 0 ? 0.2 : 0), pole, 8), sx * W / 2, (2.3 + (sz < 0 ? 0.2 : 0)) / 2, sz * D / 2));
  const stripes = canvasTex(256, 64, (gg, w, h) => { for (let i = 0; i < 8; i++) { gg.fillStyle = i % 2 ? c1 : c2; gg.fillRect(i * 32, 0, 32, h); } });
  const aw = mesh(new THREE.PlaneGeometry(W + 0.3, D + 0.5, 8, 2), new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.85 })); aw.rotation.x = -Math.PI / 2 + 0.16; aw.position.set(0, 2.42, -0.05); g.add(aw);
  const val = mesh(new THREE.PlaneGeometry(W + 0.3, 0.22), new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.85 })); val.position.set(0, 2.24, D / 2 + 0.2); g.add(val);
  const tbl = new THREE.Group(); tbl.add(at(box(W - 0.1, 0.04, D * 0.75, MAT.wood('#a8845a', 1)), 0, 0.82, 0.1)); for (const sx of [-1, 1]) tbl.add(at(box(0.04, 0.8, D * 0.7, MAT.darkMetal()), sx * (W / 2 - 0.15), 0.4, 0.1)); g.add(tbl);
  // display crates tilted toward shoppers
  const kinds = o.produce || [['tomato'], ['pepper'], ['greens'], ['eggplant']]; const n = kinds.length; const cw = (W - 0.3) / n;
  kinds.forEach((k, i) => { const c = crate({ w: cw - 0.04, d: 0.42, h: 0.16, color: o.crate || '#7a5a3a', fill: k, layers: 2, level: 0.75 }); c.position.set(-W / 2 + 0.15 + cw / 2 + i * cw, 0.86, 0.12); c.rotation.x = 0.22; g.add(c); });
  g.userData.top = 0.86; return g;
}
export function chalkSign(text, o = {}) {
  const tex = canvasTex(256, 192, (g, w, h) => { g.fillStyle = '#26302b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a6a44'; g.lineWidth = 14; g.strokeRect(0, 0, w, h); g.fillStyle = '#f2efe6'; g.font = 'bold 64px "Inter", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const lines = String(text).split('\n'); lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 66)); }, { clamp: true });
  const g = new THREE.Group(); const b = mesh(new THREE.PlaneGeometry(o.w || 0.26, (o.w || 0.26) * 0.75), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); g.add(b); g.add(at(box(0.01, 0.2, 0.01, MAT.wood('#8a6a44')), 0, -0.18, -0.005)); return g;
}
export function stringLights(app, a, b, n = 16, sag = 0.4) { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd59a', emissiveIntensity: 4 }); const pts = []; for (let i = 0; i <= n; i++) { const u = i / n; const p = V(...a).lerp(V(...b), u); p.y -= Math.sin(u * Math.PI) * sag; pts.push(p); g.add(at(mesh(new THREE.SphereGeometry(0.03, 8, 6), m, { cast: false }), p.x, p.y - 0.04, p.z)); } g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.004, 4), mat('#222'), { cast: false })); app.scene.add(g); return g; }

// ------------------------------------------------------------------ loop: containers, compost
export function rescueContainer(o = {}) { // clean, lidded food-rescue tub (safe, unserved food)
  const g = new THREE.Group(); const w = o.w || 0.24, d = o.d || 0.17, h = o.h || 0.09;
  g.add(mesh(new RoundedBoxGeometry(w, h, d, 3, 0.018), new THREE.MeshPhysicalMaterial({ color: '#f4f8f8', transparent: true, opacity: 0.55, roughness: 0.15, clearcoat: 1, depthWrite: false })));
  const food = mesh(new RoundedBoxGeometry(w * 0.9, h * 0.6, d * 0.88, 2, 0.012), new THREE.MeshPhysicalMaterial({ color: o.food || '#b8401f', roughness: 0.45, clearcoat: 0.4 })); food.position.y = -h * 0.15; g.add(food);
  const lid = mesh(new RoundedBoxGeometry(w + 0.01, 0.018, d + 0.01, 2, 0.008), mat(o.lid || '#2f8a57', { roughness: 0.4 })); lid.position.y = h / 2 + 0.006; g.add(lid); g.userData.lid = lid; return g;
}
// kitchen organics caddy (a separate stream for peels and inedibles): a moulded plastic bin, rounded and a little narrower
// at the foot, with a lip, a vented lid hinged at the back (userData.lid: rotate .x to open, -1.6 = wide open) and a bail
// handle folded down behind it
export function caddy(o = {}) {
  const g = new THREE.Group(), c = o.color || '#4a5a3c', W = 0.23, D = 0.19, H = 0.25, T = 0.005, NS = 48, NY = 10;
  const plastic = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5, side: THREE.DoubleSide });
  // a rounded rectangle (superellipse) of half sizes a, b at parameter u
  const rr = (u, a, b) => { const t = u * TAU, cs = Math.cos(t), sn = Math.sin(t), e = 0.32; return [a * Math.sign(cs) * Math.pow(Math.abs(cs), e), b * Math.sign(sn) * Math.pow(Math.abs(sn), e)]; };
  const wall = (inset, flip) => { const pos = [], idx = [];
    for (let j = 0; j <= NY; j++) { const y = H * j / NY, k = 0.88 + 0.12 * (j / NY); for (let i = 0; i <= NS; i++) { const [x, z] = rr(i / NS, W / 2 * k - inset, D / 2 * k - inset); pos.push(x, y, z); } }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NS; i++) { const p0 = j * (NS + 1) + i, p1 = p0 + 1, p2 = p0 + NS + 1, p3 = p2 + 1; if (flip) idx.push(p0, p1, p2, p1, p3, p2); else idx.push(p0, p2, p1, p1, p2, p3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return mesh(geo, plastic); };
  g.add(wall(0, false), wall(T, true));
  { const sh = new THREE.Shape(); for (let i = 0; i <= NS; i++) { const [x, z] = rr(i / NS, W / 2 * 0.88, D / 2 * 0.88); if (i) sh.lineTo(x, z); else sh.moveTo(x, z); }   // the floor
    const fl = mesh(new THREE.ShapeGeometry(sh, 4), plastic); fl.rotation.x = Math.PI / 2; fl.position.y = 0.004; g.add(fl); }
  { const pts = []; for (let i = 0; i <= NS; i++) { const [x, z] = rr(i / NS, W / 2 + 0.004, D / 2 + 0.004); pts.push(V(x, H, z)); }   // the lip
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), NS * 2, 0.006, 8, true), plastic)); }
  // what's already inside: peels, cores, coffee grounds on a dark lumpy mass
  const fill = new THREE.Group(); const fm = mat('#3a2a1c', { roughness: 0.95, normalMap: normalTex('soil', 1), normalScale: new THREE.Vector2(1, 1) });
  { const kf = 0.88 + 0.12 * 0.55, sh = new THREE.Shape(); for (let i = 0; i <= NS; i++) { const [x, z] = rr(i / NS, W / 2 * kf - T, D / 2 * kf - T); if (i) sh.lineTo(x, -z); else sh.moveTo(x, -z); }   // the mass fills the bin wall to wall
    const fg = new THREE.ShapeGeometry(sh, 6), fp = fg.attributes.position; for (let i = 0; i < fp.count; i++) fp.setZ(i, (noise2(fp.getX(i) * 40, fp.getY(i) * 40) - 0.5) * 0.03); fg.computeVertexNormals();
    const base = mesh(fg, fm); base.rotation.x = -Math.PI / 2; base.position.y = H * 0.55; fill.add(base); }
  const kinds = ['onion', 'peel', 'tomato', 'carrot', 'potato', 'onion', 'peel'];
  for (let i = 0; i < 14; i++) { const b = scrap(kinds[i % kinds.length], 200 + i); b.position.set(R(-W / 2 + 0.05, W / 2 - 0.05), H * 0.555, R(-D / 2 + 0.05, D / 2 - 0.05)); b.rotation.set(R(-0.3, 0.3), R(0, 6), R(-0.3, 0.3)); fill.add(b); }
  g.add(fill);
  // lid: a shallow dome with a ring of vent slots and a carbon-filter cap, hinged at the back
  const lid = new THREE.Group(); lid.position.set(0, H + 0.006, -D / 2 - 0.004);
  { const pos = [], idx = [], NR = 8; for (let j = 0; j <= NR; j++) { const r = 1 - j / NR; for (let i = 0; i <= NS; i++) { const [x, z] = rr(i / NS, (W / 2 + 0.008) * r, (D / 2 + 0.008) * r); pos.push(x, 0.008 + 0.014 * (1 - r * r), z + D / 2 + 0.004); } }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NS; i++) { const p0 = j * (NS + 1) + i, p1 = p0 + 1, p2 = p0 + NS + 1, p3 = p2 + 1; idx.push(p0, p2, p1, p1, p2, p3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const lidMat = new THREE.MeshPhysicalMaterial({ color: o.lid || c, roughness: 0.4, clearcoat: 0.25, clearcoatRoughness: 0.5, side: THREE.DoubleSide }); lid.add(mesh(geo, lidMat));
    const skirt = []; for (let i = 0; i <= NS; i++) { const [x, z] = rr(i / NS, W / 2 + 0.008, D / 2 + 0.008); skirt.push(V(x, 0.004, z + D / 2 + 0.004)); } lid.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(skirt, true), NS * 2, 0.005, 6, true), lidMat));
    // vents: two rings of small round holes (dark, recessed) round the carbon-filter cap
    const hole = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.lid || c).multiplyScalar(0.18), roughness: 0.9 }), hg = new THREE.CircleGeometry(0.0022, 12);
    for (const [n, rx, rz] of [[18, 0.05, 0.04], [26, 0.066, 0.053]]) for (let k = 0; k < n; k++) { const a = k / n * TAU, x = Math.cos(a) * rx, z = Math.sin(a) * rz, r = Math.hypot(x / (W / 2 + 0.008), z / (D / 2 + 0.008));
      const hm = new THREE.Mesh(hg, hole); hm.rotation.x = -Math.PI / 2; hm.position.set(x, 0.008 + 0.014 * (1 - Math.min(1, r) ** 2) + 0.0016, z + D / 2 + 0.004); lid.add(hm); }
    const cap = mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.004, 40), lidMat); cap.position.set(0, 0.0235, D / 2 + 0.004); lid.add(cap); }
  g.add(lid); g.userData.lid = lid;
  // bail handle folded down against the back
  { const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(V(-Math.cos(a) * (W / 2 + 0.008), H - 0.035 - Math.sin(a) * 0.012, -D / 2 - 0.012 - Math.sin(a) * 0.05)); }
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0035, 8, false), mat('#2a2e30', { roughness: 0.35, metalness: 0.4 }))); }
  return g;
}
// compost as a tiling texture (about 0.6 m across): dark crumbly humus with lighter crumbs and woody bits, and in fresh
// compost pale straw stalks lying every which way. straw: 0 (mature) .. 1 (fresh)
const compostCache = {};
export function compostTex(straw = 0, seed = 7) {
  const key = straw.toFixed(2) + ':' + seed; if (compostCache[key]) return compostCache[key];
  const t = canvasTex(1024, 1024, (g, w, h) => {
    const img = g.getImageData(0, 0, w, h), d = img.data, P = 1024;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {   // tileable fbm: sample on a torus
      const a = x / P * TAU, b = y / P * TAU, n = fbm(Math.cos(a) * 1.6 + 7 + seed, Math.sin(a) * 1.6 + Math.cos(b) * 1.6, 5) * 0.6 + fbm(Math.sin(b) * 1.6 + 3, Math.cos(a) * 3 + seed, 4) * 0.4;
      const k = 0.55 + 0.9 * (n - 0.5), i = (y * w + x) * 4; d[i] = 62 * k; d[i + 1] = 44 * k; d[i + 2] = 30 * k; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    const rr = prng(seed * 31 + Math.round(straw * 100)), wrap = (f) => { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.save(); g.translate(ox, oy); f(); g.restore(); } };
    for (let i = 0; i < 9000; i++) { const x = rr() * w, y = rr() * h, r = 1 + rr() * 3.5, l = rr();   // crumbs, lit from above
      g.fillStyle = l < 0.5 ? `rgba(18,12,8,${0.35 + rr() * 0.4})` : `rgba(${120 + rr() * 50},${90 + rr() * 30},${60 + rr() * 25},${0.25 + rr() * 0.35})`; g.beginPath(); g.ellipse(x, y, r * (0.7 + rr() * 0.6), r, rr() * 3, 0, TAU); g.fill(); }
    for (let i = 0; i < 260; i++) { const x = rr() * w, y = rr() * h, a = rr() * TAU, L = 6 + rr() * 22, col = `rgba(${90 + rr() * 40},${60 + rr() * 30},${35 + rr() * 20},0.8)`, lw = 1.5 + rr() * 2.5;   // woody bits
      wrap(() => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }); }
    for (let i = 0, n = Math.round(1400 * straw); i < n; i++) { const x = rr() * w, y = rr() * h, a = rr() * TAU, L = 30 + rr() * 110, bend = (rr() - 0.5) * 0.6, c = rr(), al = 0.55 + rr() * 0.4, lw = 1.5 + rr() * 2.5;   // straw stalks
      wrap(() => { g.strokeStyle = `rgba(${170 + c * 60},${140 + c * 50},${80 + c * 40},${al})`; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a + bend) * L * 0.5, y + Math.sin(a + bend) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
        g.strokeStyle = 'rgba(30,20,10,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 1.5, y + 1.5); g.lineTo(x + Math.cos(a) * L + 1.5, y + Math.sin(a) * L + 1.5); g.stroke(); }); }
  });
  return (compostCache[key] = t);
}
// a lumpy crumb of soil or compost (smooth shading, irregular): radius r
export function crumbGeo(r = 0.01, seed = 1) {
  const g = new THREE.IcosahedronGeometry(r, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = V().fromBufferAttribute(p, i), n = v.clone().normalize(); const k = 1 + 0.35 * (noise2(n.x * 2.3 + seed, n.y * 2.3 + n.z * 1.7) - 0.5) * 2 + 0.12 * (noise2(n.x * 7 + seed, n.z * 7) - 0.5); v.multiplyScalar(k); v.y *= 0.75; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
export function windrowGeo(L = 12, W = 2.6, H = 1.4, seed = 1) {
  const g = new THREE.PlaneGeometry(L, W * 1.6, 120, 24); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const u = Math.abs(y) / (W * 0.8); const prof = Math.max(0, 1 - u * u) ** 0.8; const end = smooth(clamp((L / 2 - Math.abs(x)) / 1.2)); const n = (fbm(x * 0.8 + seed, y * 0.8, 4) - 0.5) * 0.35 + (noise2(x * 6, y * 6) - 0.5) * 0.06; p.setZ(i, Math.max(0, H * prof * end + n * prof * end)); }
  g.rotateX(-Math.PI / 2); g.computeVertexNormals(); return g;
}
export function wheelbarrow(o = {}) { const g = new THREE.Group(); const m = mat(o.color || '#3f6e8a', { roughness: 0.5, metalness: 0.3 }); const tray = mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.3, 4, 1, true), mat(o.color || '#3f6e8a', { roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide })); tray.rotation.y = Math.PI / 4; tray.scale.set(1.2, 1, 0.8); tray.position.y = 0.55; g.add(tray); if (o.fill) { const f = mesh(new THREE.SphereGeometry(0.4, 16, 10), mat(o.fill, { roughness: 1, normalMap: normalTex('soil', 1) })); f.scale.set(1.05, 0.28, 0.7); f.position.y = 0.66; g.add(f); } g.add(at(rot(cyl(0.18, 0.18, 0.07, MAT.rubber(), 16), 0, 0, Math.PI / 2), 0, 0.18, 0.55)); for (const sx of [-1, 1]) { g.add(at(rot(cyl(0.02, 0.02, 1.4, m, 6), Math.PI / 2 - 0.25, 0, 0), sx * 0.25, 0.5, -0.1)); g.add(at(cyl(0.02, 0.02, 0.4, m, 6), sx * 0.22, 0.22, -0.3)); } return g; }
export function tool(kind = 'fork') { const g = new THREE.Group(); const w = MAT.wood('#b08a5a'); g.add(at(cyl(0.016, 0.016, 1.25, w, 8), 0, 0.62, 0)); if (kind === 'fork') { for (let i = 0; i < 4; i++) g.add(at(cyl(0.006, 0.004, 0.28, MAT.steel(), 6), (i - 1.5) * 0.045, -0.13, 0)); g.add(at(box(0.18, 0.03, 0.02, MAT.steel()), 0, 0.0, 0)); } else { const b = mesh(new THREE.BoxGeometry(0.24, 0.28, 0.01), MAT.steel()); b.position.y = -0.14; g.add(b); } return g; }
