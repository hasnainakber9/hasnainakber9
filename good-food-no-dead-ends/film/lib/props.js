// GOOD FOOD. NO DEAD ENDS. — reusable prop & set library (all procedural, no third-party meshes).
import { THREE, V, R, rnd, pick, lerp, clamp, smooth, M4, merged, vmat, mat, clayMat, MAT, grain, normalTex, canvasTex, mesh, box, cyl, at, rot, instanced, noise2, fbm, RoundedBoxGeometry, BGU, translucent, woodMat } from './core.js';
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
  solid.push({ geo: new THREE.CylinderGeometry(0.008, 0.012, h, 5), m: M4(0, h / 2, 0, 0.03, 0, 0.04), color: '#4f6e2c' });
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
export function backdropTex(kind, o = {}) {
  return canvasTex(1024, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.7); sky.addColorStop(0, o.top || '#8fb3d8'); sky.addColorStop(1, o.horizon || '#f1dcc0'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    if (kind === 'garden' || kind === 'street') {
      for (let i = 0; i < 18; i++) { const x = rnd() * w, y = h * (0.08 + rnd() * 0.3), rr = 30 + rnd() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
      if (o.trees !== false) for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 34; i++) { const x = rnd() * w, y = h * (0.5 + layer * 0.05 + rnd() * 0.12), r = (30 + rnd() * 70) * (1 - layer * 0.2); const c = new THREE.Color(o.tree || '#5f8a45').offsetHSL((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.18 - layer * 0.04 + 0.08 - layer * 0.02); g.fillStyle = c.getStyle(); g.globalAlpha = 0.85 + layer * 0.05; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.globalAlpha = 1; }
      if (kind === 'street') for (let i = 0; i < 9; i++) { const x = i * 120 + rnd() * 40, bw = 90 + rnd() * 60, bh = 140 + rnd() * 160; g.fillStyle = pick(['#d9b48c', '#c97a5a', '#e2d2b4', '#a9b8b0', '#d6a77a']); g.fillRect(x, h * 0.62 - bh, bw, bh); g.fillStyle = 'rgba(40,50,60,0.55)'; for (let yy = h * 0.62 - bh + 14; yy < h * 0.6 - 20; yy += 34) for (let xx = x + 10; xx < x + bw - 14; xx += 26) g.fillRect(xx, yy, 14, 20); }
      g.fillStyle = o.ground || '#6d8a4a'; g.fillRect(0, h * 0.62, w, h);
    }
    if (kind === 'dusk') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2b3a66'); gr.addColorStop(0.55, '#c97a5a'); gr.addColorStop(0.7, '#f0b070'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2a33'; for (let i = 0; i < 14; i++) { const x = i * 80 + rnd() * 30, bw = 60 + rnd() * 50, bh = 80 + rnd() * 180; g.fillRect(x, h * 0.72 - bh, bw, bh + h); g.fillStyle = 'rgba(255,200,120,0.85)'; for (let yy = h * 0.72 - bh + 10; yy < h * 0.7; yy += 22) for (let xx = x + 8; xx < x + bw - 8; xx += 16) if (rnd() < 0.35) g.fillRect(xx, yy, 8, 12); g.fillStyle = '#2a2a33'; } }
    if (kind === 'city') { for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 22; i++) { const x = i * 50 + rnd() * 30 - 20, bw = 40 + rnd() * 70, bh = (layer ? 120 : 200) + rnd() * 160; g.fillStyle = layer ? pick(['#cdb8a0', '#d9c6ad', '#b9a48c', '#c9b49a']) : pick(['#b8b4ac', '#a9aca8', '#c4bdb0']); g.globalAlpha = layer ? 1 : 0.6; g.fillRect(x, h * 0.72 - bh, bw, bh + 200); g.globalAlpha = 1; g.fillStyle = 'rgba(60,70,80,0.35)'; for (let yy = h * 0.72 - bh + 10; yy < h * 0.7; yy += 20) for (let xx = x + 6; xx < x + bw - 8; xx += 14) g.fillRect(xx, yy, 7, 11); } }
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
export function caddy(o = {}) { // kitchen organics caddy: an OPEN bin (separate stream for peels/inedibles)
  const g = new THREE.Group(); const c = o.color || '#5b4a3a'; const m = mat(c, { roughness: 0.5, side: THREE.DoubleSide });
  const W = 0.28, D = 0.24, H = 0.32, t = 0.012;
  g.add(at(mesh(new RoundedBoxGeometry(W, 0.02, D, 2, 0.008), m), 0, 0.01, 0));
  g.add(at(mesh(new THREE.BoxGeometry(W, H, t), m), 0, H / 2, D / 2 - t / 2)); g.add(at(mesh(new THREE.BoxGeometry(W, H, t), m), 0, H / 2, -D / 2 + t / 2));
  g.add(at(mesh(new THREE.BoxGeometry(t, H, D), m), W / 2 - t / 2, H / 2, 0)); g.add(at(mesh(new THREE.BoxGeometry(t, H, D), m), -W / 2 + t / 2, H / 2, 0));
  const rim = mat(new THREE.Color(c).offsetHSL(0, 0, -0.06).getStyle(), { roughness: 0.45 });
  for (const [w, d, x, z] of [[W + 0.01, 0.02, 0, D / 2], [W + 0.01, 0.02, 0, -D / 2], [0.02, D, W / 2, 0], [0.02, D, -W / 2, 0]]) g.add(at(box(w, 0.018, d, rim), x, H, z));
  // what's already inside: peels, cores, coffee grounds — a dark lumpy mass
  const fill = new THREE.Group(); const fm = mat('#4a3424', { roughness: 0.95, normalMap: normalTex('soil', 1), normalScale: new THREE.Vector2(1, 1) });
  const base = mesh(new THREE.PlaneGeometry(W - 0.03, D - 0.03, 10, 10), fm); base.rotation.x = -Math.PI / 2; base.position.y = H * 0.55; const bp = base.geometry.attributes.position; for (let i = 0; i < bp.count; i++) bp.setZ(i, (noise2(bp.getX(i) * 40, bp.getY(i) * 40) - 0.5) * 0.03); base.geometry.computeVertexNormals(); fill.add(base);
  const kinds = ['onion', 'peel', 'tomato', 'carrot', 'potato', 'onion', 'peel'];
  for (let i = 0; i < 14; i++) { const b = scrap(kinds[i % kinds.length], 200 + i); b.position.set(R(-W / 2 + 0.05, W / 2 - 0.05), H * 0.555, R(-D / 2 + 0.05, D / 2 - 0.05)); b.rotation.set(R(-0.3, 0.3), R(0, 6), R(-0.3, 0.3)); fill.add(b); }
  g.add(fill);
  const lid = new THREE.Group(); lid.position.set(0, H + 0.01, -D / 2); const l = mesh(new RoundedBoxGeometry(W + 0.012, 0.022, D + 0.012, 2, 0.008), mat(o.lid || '#7a9a3a', { roughness: 0.4 })); l.position.z = D / 2; lid.add(l); g.add(lid); g.userData.lid = lid; g.userData.H = H;
  return g;
}
export function windrowGeo(L = 12, W = 2.6, H = 1.4, seed = 1) {
  const g = new THREE.PlaneGeometry(L, W * 1.6, 120, 24); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const u = Math.abs(y) / (W * 0.8); const prof = Math.max(0, 1 - u * u) ** 0.8; const end = smooth(clamp((L / 2 - Math.abs(x)) / 1.2)); const n = (fbm(x * 0.8 + seed, y * 0.8, 4) - 0.5) * 0.35 + (noise2(x * 6, y * 6) - 0.5) * 0.06; p.setZ(i, Math.max(0, H * prof * end + n * prof * end)); }
  g.rotateX(-Math.PI / 2); g.computeVertexNormals(); return g;
}
export function wheelbarrow(o = {}) { const g = new THREE.Group(); const m = mat(o.color || '#3f6e8a', { roughness: 0.5, metalness: 0.3 }); const tray = mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.3, 4, 1, true), mat(o.color || '#3f6e8a', { roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide })); tray.rotation.y = Math.PI / 4; tray.scale.set(1.2, 1, 0.8); tray.position.y = 0.55; g.add(tray); if (o.fill) { const f = mesh(new THREE.SphereGeometry(0.4, 16, 10), mat(o.fill, { roughness: 1, normalMap: normalTex('soil', 1) })); f.scale.set(1.05, 0.28, 0.7); f.position.y = 0.66; g.add(f); } g.add(at(rot(cyl(0.18, 0.18, 0.07, MAT.rubber(), 16), 0, 0, Math.PI / 2), 0, 0.18, 0.55)); for (const sx of [-1, 1]) { g.add(at(rot(cyl(0.02, 0.02, 1.4, m, 6), Math.PI / 2 - 0.25, 0, 0), sx * 0.25, 0.5, -0.1)); g.add(at(cyl(0.02, 0.02, 0.4, m, 6), sx * 0.22, 0.22, -0.3)); } return g; }
export function tool(kind = 'fork') { const g = new THREE.Group(); const w = MAT.wood('#b08a5a'); g.add(at(cyl(0.016, 0.016, 1.25, w, 8), 0, 0.62, 0)); if (kind === 'fork') { for (let i = 0; i < 4; i++) g.add(at(cyl(0.006, 0.004, 0.28, MAT.steel(), 6), (i - 1.5) * 0.045, -0.13, 0)); g.add(at(box(0.18, 0.03, 0.02, MAT.steel()), 0, 0.0, 0)); } else { const b = mesh(new THREE.BoxGeometry(0.24, 0.28, 0.01), MAT.steel()); b.position.y = -0.14; g.add(b); } return g; }
