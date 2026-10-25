// GOOD FOOD. NO DEAD ENDS. — core render pipeline shared by every shot.
// Deterministic: every frame is a pure function of time t (seconds), so stills, previews and
// final renders always agree. The page exposes window.__seek(t) for html_to_video.py.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
export { THREE, RoundedBoxGeometry, BGU };

// ------------------------------------------------------------------ seek protocol
let _ready; const readyP = new Promise(r => (_ready = r));
window.__seek = async (t) => { await readyP; if (window.__app) window.__app.renderFrame(t); };
window.__THREE = THREE;   // (for QA snippets run in the page)

// QA only: ?dbghand=NAME:L|R[:dist[:azimuth[:elevation]]] frames a character's hand (azimuth from the way they face, rad);
// ?dbgcam=x,y,z,lx,ly,lz[,fov] places the camera; window.__dbg = 'hand=...' or 'cam=...' does the same per frame.
// Either turns depth of field off.
function DBGCAM(app) {
  const q = new URLSearchParams(window.__dbg || location.search), c = app.camera; let pos = null, look = null, fov = 30;
  if (q.has('dbgcam') || q.has('cam')) { const v = (q.get('dbgcam') || q.get('cam')).split(',').map(Number); pos = V(v[0], v[1], v[2]); look = V(v[3], v[4], v[5]); fov = v[6] || 30; }
  else if (q.has('dbghand') || q.has('hand')) { const [name, s, d = 0.45, az = 0.5, el = 0.35] = (q.get('dbghand') || q.get('hand')).split(':'); const p = app.puppets.find(x => x.name === name); if (!p || !p.handFrame) return;
    const f = p.handFrame(s), dir = V(Math.sin(+az) * Math.cos(+el), Math.sin(+el), Math.cos(+az) * Math.cos(+el)).applyQuaternion(p.root.getWorldQuaternion(new THREE.Quaternion()));
    look = f.pos; pos = f.pos.clone().addScaledVector(dir, +d); }
  else if (q.has('joint')) { const [name, bn, d = 0.6, az = 0.4, el = 0.15, fv = 30] = q.get('joint').split(':'); const p = app.puppets.find(x => x.name === name); const b = p && p.h && p.h.bone(bn); if (!b) return;
    const dir = V(Math.sin(+az) * Math.cos(+el), Math.sin(+el), Math.cos(+az) * Math.cos(+el)).applyQuaternion(p.root.getWorldQuaternion(new THREE.Quaternion()));
    look = b.getWorldPosition(V()); pos = look.clone().addScaledVector(dir, +d); fov = +fv; }
  else return;
  c.position.copy(pos); c.up.set(0, 1, 0); c.lookAt(look); c.fov = fov; c.updateProjectionMatrix(); if (app.dof) app.dof.uniforms.aperture.value = 0;
}

// ------------------------------------------------------------------ math helpers
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const win = (t, a, b) => smooth((t - a) / Math.max(1e-6, b - a));          // 0 before a, 1 after b
export const pulse = (t, a, b, f = 0.15) => win(t, a, a + f) * (1 - win(t, b - f, b)); // 1 inside [a,b] with soft edges

// seeded PRNG (mulberry32) — every scene seeds its own stream so builds are reproducible
export function prng(seed = 1) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export let rnd = prng(20240901);
export const seed = (s) => { rnd = prng(s); };
export const R = (a, b) => a + rnd() * (b - a);
export const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];

function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
}
export function fbm(x, y, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f); a *= 0.5; f *= 2.03; } return s; }

// keyed values: keys = [[t, value], ...]; numbers or arrays, eased between keys
export function keyed(keys, t, ease = easeInOut) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, a] = keys[i], [tb, b] = keys[i + 1];
    if (t <= tb) { const u = ease((t - ta) / Math.max(1e-6, tb - ta)); return Array.isArray(a) ? a.map((x, k) => lerp(x, b[k], u)) : lerp(a, b, u); }
  }
  return keys[keys.length - 1][1];
}

// ------------------------------------------------------------------ textures
const texCache = new Map();
export function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.anisotropy = 4;
  if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1] ?? o.repeat[0]);
  return t;
}
// greyscale-ish albedo variation texture (multiplies material colour)
export function grain(kind = 'soft', o = {}) {
  const key = 'g:' + kind + JSON.stringify(o); if (texCache.has(key)) { const t = texCache.get(key).clone(); if (o.repeat) t.repeat.set(o.repeat, o.repeat); t.needsUpdate = true; return t; }
  const size = o.size || 256, sc = o.scale || 6;
  const t = canvasTex(size, size, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = x / w, ny = y / h; let v;
      const n = fbm(nx * sc, ny * sc, 5), n2 = fbm(nx * sc * 4 + 9, ny * sc * 4 + 3, 3);
      if (kind === 'soil') v = 0.62 + n * 0.55 + (n2 - 0.5) * 0.45 + (hash2(x, y) - 0.5) * 0.18;
      else if (kind === 'wood') v = 0.80 + 0.16 * Math.sin((ny * 26 + n * 5) * Math.PI) + (n2 - 0.5) * 0.12;
      else if (kind === 'plaster') v = 0.9 + (n - 0.5) * 0.14 + (n2 - 0.5) * 0.08;
      else if (kind === 'leafy') v = 0.75 + n * 0.4 + (n2 - 0.5) * 0.3;
      else if (kind === 'fabric') v = 0.9 + (n2 - 0.5) * 0.14 + (((x ^ y) & 2) ? 0.025 : -0.025);
      else if (kind === 'skin') v = 0.96 + (n - 0.5) * 0.07 + (n2 - 0.5) * 0.04;
      else if (kind === 'steel') v = 0.92 + (n2 - 0.5) * 0.08 + Math.sin(nx * 700 + n * 3) * 0.015;
      else v = 0.9 + (n - 0.5) * 0.18;
      v = clamp(v, 0, 1.2) * 212; const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.min(255, v); d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  texCache.set(key, t); const out = t.clone(); if (o.repeat) out.repeat.set(o.repeat, o.repeat); out.needsUpdate = true; return out;
}
// CC0 normal maps (pmndrs/assets, from ambientCG/Poly Haven) — loaded once
const NORMAL_IDS = { soil: '0001', rock: '0003', woodgrain: '0004', diamond: '0008', clay: '0009', planks: '0012', cloth: '0014', plaster: '0015', skin: '0021', cracked: '0024', tiles: '0025', cobble: '0026', knit: '0027' };
const normalImgs = {};
export async function loadNormals(names) {
  await Promise.all(names.map(async n => {
    if (normalImgs[n]) return; const mod = await import(`./assets/normals/${NORMAL_IDS[n]}.webp.js`);
    const img = new Image(); img.src = mod.default; await img.decode(); normalImgs[n] = img;
  }));
}
export function normalTex(name, repeat = 1) {
  const img = normalImgs[name]; if (!img) { console.warn('normal not loaded', name); return null; }
  const t = new THREE.Texture(img); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
  t.repeat.set(repeat, repeat); t.needsUpdate = true; return t;
}

// ------------------------------------------------------------------ materials
export function mat(color, o = {}) {
  const P = o.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial; delete o.physical;
  const m = new P(Object.assign({ color, roughness: 0.75, metalness: 0 }, o));
  return m;
}
export function clayMat(color, o = {}) {      // tactile, hand-made surface used for people and food
  const nm = normalTex(o.normal || 'clay', o.nrep || 2);
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: o.roughness ?? 0.62, metalness: 0, normalMap: nm, normalScale: new THREE.Vector2(o.ns ?? 0.25, o.ns ?? 0.25),
    sheen: o.sheen ?? 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(o.sheenColor || '#ffd9c4'), clearcoat: o.clearcoat ?? 0, clearcoatRoughness: 0.35 });
  if (o.map) m.map = o.map; if (o.side) m.side = o.side; if (o.vertexColors) m.vertexColors = true;
  return m;
}
// ------------------------------------------------------------------ wood
// Procedural wood at physical scale: one texture spans WOOD_SPAN metres (u along the grain, v across). Flat-sawn
// planks show stretched growth rings; 'edge' is edge-grain strips (butcher block). Albedo is a light tint the material
// colour multiplies; the height (rings worn soft, pores sunk) gives the normal map; pores and latewood read rougher.
export const WOOD_SPAN = [0.9, 0.3];
const woodCache = {};
export function woodMaps(kind = 'plank', o = {}) {
  const key = kind + JSON.stringify(o); if (woodCache[key]) return woodCache[key];
  const W = o.w || 1536, H = o.h || 512, Lu = WOOD_SPAN[0], Lv = WOOD_SPAN[1], seed = o.seed || 3;
  const col = new Uint8ClampedArray(W * H * 4), hgt = new Float32Array(W * H), rou = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const u = x / W * Lu, v = y / H * Lv;
    let ring, strip = 0;
    if (kind === 'edge') { const sw = 0.025, si = Math.floor(v / sw); strip = (hash2(si, seed) - 0.5) * 0.16; ring = v * 160 + (fbm(u * 2 + si * 7.3, si * 3.1, 3) - 0.5) * 1.2 + si * 0.37; }
    else ring = v * 40 + (fbm(u * 1.6 + seed, v * 4.2, 4) - 0.5) * 5 + 0.7 * Math.sin(u * 3.3 + v * 9 + seed);
    const f = ring - Math.floor(ring), late = smooth((f - 0.6) / 0.28) * (1 - smooth((f - 0.93) / 0.07));
    const pore = Math.max(0, noise2(u * 9 + seed, v * 420) - 0.78) * 4.5 * 0.7 + Math.max(0, noise2(u * 23 + 5, v * 900 + seed) - 0.86) * 7 * 0.3;
    const tone = 0.9 + (fbm(u * 0.9 + 11, v * 5 + seed, 3) - 0.5) * 0.22 + strip + (noise2(u * 40, v * 160) - 0.5) * 0.05;
    const L = clamp(tone * (1 - late * (kind === 'edge' ? 0.32 : 0.2)) * (1 - Math.min(1, pore) * 0.22), 0, 1.2), i = (y * W + x) * 4;   // (flat-sawn figure kept quiet: strong latewood reads as tiger stripes)
    col[i] = clamp(L * 238, 0, 255); col[i + 1] = clamp(L * 232, 0, 255); col[i + 2] = clamp(L * 222, 0, 255); col[i + 3] = 255;
    hgt[y * W + x] = -late * 0.35 - Math.min(1, pore) * 0.6 + (noise2(u * 60, v * 200) - 0.5) * 0.1;
    rou[i] = 0; rou[i + 1] = clamp(255 * ((o.rough ?? 0.5) + Math.min(1, pore) * 0.18 + late * 0.06), 0, 255); rou[i + 2] = 0; rou[i + 3] = 255; }
  if (o.scratches) { const r = prng(o.scratches); for (let k = 0; k < 900; k++) { const cx = (0.15 + 0.7 * r()) * W, cy = (0.1 + 0.8 * r()) * H, a = (r() - 0.5) * 0.7 + (r() < 0.5 ? 0 : Math.PI / 2), len = 8 + r() * 60, dep = 0.3 + r() * 0.6;
    for (let s2 = 0; s2 < len; s2++) { const x = Math.round(cx + Math.cos(a) * s2), y = Math.round(cy + Math.sin(a) * s2); if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x; hgt[i] -= dep; col[i * 4] = Math.min(255, col[i * 4] + 14); col[i * 4 + 1] = Math.min(255, col[i * 4 + 1] + 12); col[i * 4 + 2] = Math.min(255, col[i * 4 + 2] + 10); rou[i * 4 + 1] = Math.min(255, rou[i * 4 + 1] + 50); } } }
  const mk = (data, linear) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(new ImageData(data, W, H), 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const nrm = new Uint8ClampedArray(W * H * 4), Hh = (x, y) => hgt[((y + H) % H) * W + ((x + W) % W)], st = o.relief ?? 1.6;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (Hh(x + 1, y) - Hh(x - 1, y)) * st, dy = (Hh(x, y + 1) - Hh(x, y - 1)) * st, l = Math.hypot(dx, dy, 1), i = (y * W + x) * 4;
    nrm[i] = (-dx / l * 0.5 + 0.5) * 255; nrm[i + 1] = (dy / l * 0.5 + 0.5) * 255; nrm[i + 2] = (1 / l * 0.5 + 0.5) * 255; nrm[i + 3] = 255; }
  return (woodCache[key] = { map: mk(col, false), normalMap: mk(nrm, true), roughnessMap: mk(rou, true) });
}
export function woodMat(color = '#b0865a', o = {}) {
  const M = woodMaps(o.kind || 'plank', o.maps || {});
  const m = new THREE.MeshPhysicalMaterial({ color, map: M.map, normalMap: M.normalMap, normalScale: new THREE.Vector2(o.ns ?? 0.6, o.ns ?? 0.6), roughnessMap: M.roughnessMap, roughness: o.roughness ?? 1.0,
    clearcoat: o.clearcoat ?? 0.12, clearcoatRoughness: 0.4, sheen: 0.15, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).offsetHSL(0, -0.1, 0.15) });
  m.userData.physUV = true; return m;
}
// physical UVs for wood: u runs along the box's longest axis (the grain), at WOOD_SPAN metres per texture tile
export function physUV(geo) {
  geo.computeBoundingBox(); const s = geo.boundingBox.getSize(new THREE.Vector3()); const long = s.x >= s.y && s.x >= s.z ? 'x' : s.y >= s.z ? 'y' : 'z';
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv; const off = (hash2(s.x * 31, s.z * 17) * 7) % 1;
  for (let i = 0; i < p.count; i++) { const P = [p.getX(i), p.getY(i), p.getZ(i)], N = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))]; const ax = { x: 0, y: 1, z: 2 }[long];
    const face = N[0] >= N[1] && N[0] >= N[2] ? 0 : N[1] >= N[2] ? 1 : 2; const other = [0, 1, 2].find(k => k !== ax && k !== face) ?? (ax === 0 ? 1 : 0);
    uv.setXY(i, P[ax] / WOOD_SPAN[0] + off, (face === ax ? P[(ax + 1) % 3] : P[other]) / WOOD_SPAN[1] + off * 3.7); }
  uv.needsUpdate = true; return geo;
}
export const MAT = {
  steel: () => mat('#cfd3d8', { roughness: 0.28, metalness: 1.0, map: grain('steel', { repeat: 2 }) }),
  brushed: () => mat('#c4c8cd', { roughness: 0.42, metalness: 0.95, map: grain('steel', { repeat: 3 }) }),
  darkMetal: () => mat('#3a3d42', { roughness: 0.45, metalness: 0.8 }),
  rubber: () => mat('#1c1c1e', { roughness: 0.92 }),
  plastic: (c) => mat(c, { roughness: 0.48 }),
  glass: (o = {}) => new THREE.MeshPhysicalMaterial({ color: o.color || '#eef6fa', roughness: o.roughness ?? 0.06, metalness: 0, transparent: true, opacity: o.opacity ?? 0.18, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4 }),
  wood: (c = '#b0865a', rep = 1) => woodMat(c),
  plaster: (c = '#e3d5bd', rep = 2) => mat(c, { map: grain('plaster', { repeat: rep }), normalMap: normalTex('plaster', rep), normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.92 }),
  emissive: (c, i = 1) => new THREE.MeshStandardMaterial({ color: '#000', emissive: c, emissiveIntensity: i }),
};

// ------------------------------------------------------------------ geometry helpers
export function at(o, x, y, z) { o.position.set(x, y, z); return o; }
export function rot(o, x = 0, y = 0, z = 0) { o.rotation.set(x, y, z); return o; }
export function shadow(o, cast = true, recv = true) { o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); return o; }
export function mesh(geo, material, o = {}) { const m = new THREE.Mesh(geo, material); m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false; return m; }
export function box(w, h, d, material, o = {}) { const g = o.r ? new RoundedBoxGeometry(w, h, d, o.seg || 2, o.r) : new THREE.BoxGeometry(w, h, d); if (material && material.userData && material.userData.physUV) physUV(g); return mesh(g, material, o); }
export function cyl(rt, rb, h, material, seg = 24, o = {}) { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open); if (material && material.userData && material.userData.physUV) physUV(g); return mesh(g, material, o); }
export function sphere(r, material, o = {}) { const m = mesh(new THREE.SphereGeometry(r, o.w || 24, o.h || 16), material, o); if (o.s) m.scale.set(...o.s); return m; }
// merge many (geometry, matrix, colour) parts into one vertex-coloured geometry
const tmpM = new THREE.Matrix4();
export function M4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy, sz) {
  return new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy ?? sx, sz ?? sx));
}
export function merged(parts) {
  const geos = parts.map(p => {
    let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (p.m) g.applyMatrix4(p.m);
    const c = new THREE.Color(p.color || '#ffffff'), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    const jit = p.jitter || 0;
    for (let i = 0; i < n; i++) { const k = 1 + (jit ? (hash2(i * 0.37, n) - 0.5) * jit : 0); arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    return g;
  });
  return BGU.mergeGeometries(geos, false);
}
// leaves let light through: sun behind a leaf (or behind a crown of cards) adds a transmitted, yellow-green diffuse,
// so backlit foliage glows at the edges instead of reading as black cut-outs
export function translucent(m, tint = '#d8f08a', amount = 0.6) {
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey ? m.customProgramCacheKey() : ''; const c = new THREE.Color(tint).multiplyScalar(amount);
  m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); sh.uniforms.leafTrans = { value: c };
    sh.fragmentShader = 'uniform vec3 leafTrans;\n' + sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
      'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n\treflectedLight.directDiffuse += directLight.color * saturate( -dot( geometryNormal, directLight.direction ) ) * leafTrans * BRDF_Lambert( material.diffuseColor );')); };
  m.customProgramCacheKey = () => key + '|leafTrans'; return m;
}
// two-sided cloth lit from its outer side on both faces: where an inner layer pokes through (a collar's stand through
// its fall, a placket, a pocket) its back face would otherwise take the flipped normal, face away from the light and
// show as a black triangle. Back faces are only dimmed a little (the inside of a cuff or a neckline).
export function frontLit(m, dim = 0.85) {
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
  m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;'))
      .replace('#include <map_fragment>', `#include <map_fragment>\n diffuseColor.rgb *= gl_FrontFacing ? 1.0 : ${dim.toFixed(3)};`); };
  m.customProgramCacheKey = () => key + '|frontLit' + dim; return m;
}
export function vmat(o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.8, metalness: 0 }, o)); }
export function instanced(scene, geo, material, list, o = {}) {
  const im = new THREE.InstancedMesh(geo, material, list.length); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((p, i) => { e.set(p.rx || 0, p.ry || 0, p.rz || 0); q.setFromEuler(e); const s = p.s || 1; m.compose(V(p.x, p.y || 0, p.z), q, V(s * (p.sx || 1), s * (p.sy || 1), s * (p.sz || 1))); im.setMatrixAt(i, m); if (p.color) im.setColorAt(i, new THREE.Color(p.color)); });
  im.castShadow = o.cast !== false; im.receiveShadow = o.recv !== false; im.frustumCulled = false; scene.add(im); return im;
}

// merge every static mesh under `root` that shares a material into one draw call (huge speed-up for sets)
export function bake(root, o = {}) {
  root.updateMatrixWorld(true); const inv = root.matrixWorld.clone().invert(); const groups = new Map(); const kill = [];
  root.traverse(m => {
    if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || m.userData.keep || (o.skip && o.skip(m))) return;
    if (Array.isArray(m.material)) return;
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const sig = m.material.uuid + '|' + Object.keys(g.attributes).sort().join(',') + '|' + m.castShadow + m.receiveShadow;
    if (!groups.has(sig)) groups.set(sig, { mat: m.material, geos: [], cast: m.castShadow, recv: m.receiveShadow, order: m.renderOrder });
    groups.get(sig).geos.push(g); kill.push(m);
  });
  for (const m of kill) m.parent.remove(m);
  for (const { mat, geos, cast, recv, order } of groups.values()) { const mg = BGU.mergeGeometries(geos, false); if (!mg) continue; const mesh = new THREE.Mesh(mg, mat); mesh.castShadow = cast; mesh.receiveShadow = recv; mesh.renderOrder = order; mesh.frustumCulled = false; root.add(mesh); }
  return root;
}

// ------------------------------------------------------------------ grade / finishing pass
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.32 }, grain: { value: 0.035 }, warmth: { value: 1.0 }, sat: { value: 1.04 }, contrast: { value: 1.0 }, lift: { value: 0.0 },
    fade: { value: 1.0 }, tint: { value: new THREE.Color(1, 1, 1) }, res: { value: new THREE.Vector2(1920, 1080) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, vignette, grain, warmth, sat, contrast, lift, fade; uniform vec3 tint; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ p += floor(time * 24.0 + 0.5) * vec2(37.0, 17.0); vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }   // a new grain every frame
    void main(){
      vec2 c = vUv - 0.5; float r2 = dot(c,c);
      vec2 off = c * r2 * 0.008;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float lum = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(vec3(lum), col, sat);
      col = (col - 0.5) * contrast + 0.5 + lift;
      vec3 shadowTint = vec3(0.95, 0.985, 1.04); vec3 highTint = vec3(1.035, 1.0, 0.955);
      col *= mix(shadowTint, highTint, smoothstep(0.1, 0.9, lum)) * warmth * tint;
      col *= 1.0 - vignette * smoothstep(0.18, 0.9, r2 * 2.0);
      float g = hash(vUv * res) - 0.5; col += g * grain * (0.5 + 0.5 * (1.0 - lum));
      gl_FragColor = vec4(clamp(col, 0.0, 1.0) * fade, 1.0);
    }`
};

// ------------------------------------------------------------------ depth of field
// BokehPass draws the whole scene a second time with a depth material on every frame. This variant reads the depth
// buffer the scene pass has just written instead: one render fewer (about a fifth of a frame in the software renderer),
// and the depth also follows cut-out leaves and back-facing strands, which the depth material cannot see.
// It also gathers differently. BokehShader blurs every pixel by its own circle of confusion, so a blurred wall pulls in
// the colours of the sharp figure in front of it (a glowing outline round everyone in focus). Here each sample on a
// spiral counts only if its own circle of confusion reaches the pixel (sharp foreground stays put; blurred foreground
// still spreads over what is behind it), and a sample behind the pixel may not blur over it more than the pixel itself
// is blurred (no background bleeding over sharp edges). Same lens model and uniforms as BokehShader.
// Needs the pass straight after the RenderPass, on composer buffers that carry depth textures.
const GatherDofShader = {
  defines: { NS: 160, RAD_SCALE: 1.6 },
  uniforms: { tColor: { value: null }, tDepth: { value: null }, focus: { value: 1 }, aspect: { value: 1 }, aperture: { value: 0.025 }, maxblur: { value: 0.01 }, nearClip: { value: 1 }, farClip: { value: 1000 }, res: { value: new THREE.Vector2(1920, 1080) } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `#include <common>
    #include <packing>
    varying vec2 vUv; uniform sampler2D tColor, tDepth; uniform float focus, aperture, maxblur, nearClip, farClip; uniform vec2 res;
    float dist(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, nearClip, farClip); }
    float coc(float z) { return min(abs(focus - z) * aperture, maxblur) * res.x; }   // radius in pixels
    void main() {
      float zc = dist(vUv), cc = coc(zc); vec3 sum = texture2D(tColor, vUv).rgb; float tot = 1.0, r = RAD_SCALE, ang = 0.0, maxR = maxblur * res.x;
      for (int i = 0; i < NS; i++) {
        if (r > maxR) break;
        vec2 uv = vUv + vec2(cos(ang), sin(ang)) * r / res; vec3 sc = texture2D(tColor, uv).rgb; float zs = dist(uv), cs = coc(zs);
        if (zs > zc) cs = min(cs, cc * 2.0);
        float m = smoothstep(r - 0.5, r + 0.5, cs);
        sum += mix(sum / tot, sc, m); tot += 1.0; ang += 2.39996323; r += RAD_SCALE / r;
      }
      gl_FragColor = vec4(sum / tot, 1.0);
    }`,
};
class SceneDepthBokehPass extends BokehPass {
  constructor(scene, camera, params) { super(scene, camera, params);
    const W = params.width || 1920, maxR = (params.maxblur ?? 0.01) * W, rs = 1.6;
    this.uniforms = THREE.UniformsUtils.clone(GatherDofShader.uniforms); for (const k of ['focus', 'aperture', 'maxblur']) if (params[k] !== undefined) this.uniforms[k].value = params[k];
    this.uniforms.res.value.set(W, params.height || 1080);
    this.materialBokeh = new THREE.ShaderMaterial({ defines: { NS: Math.ceil(maxR * maxR / (2 * rs)) + 8, RAD_SCALE: rs.toFixed(2) }, uniforms: this.uniforms, vertexShader: GatherDofShader.vertexShader, fragmentShader: GatherDofShader.fragmentShader });
    this.fsQuad.material = this.materialBokeh; }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.uniforms; u.tColor.value = readBuffer.texture; u.tDepth.value = readBuffer.depthTexture;
    u.nearClip.value = this.camera.near; u.farClip.value = this.camera.far;
    const oldAutoClear = renderer.autoClear; renderer.autoClear = false;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); if (!this.renderToScreen) renderer.clear();
    this.fsQuad.render(renderer); renderer.autoClear = oldAutoClear;
  }
}

// ------------------------------------------------------------------ app
export class App {
  constructor(o = {}) {
    const QP = new URLSearchParams(location.search); if (QP.has('ao')) o.ao = +QP.get('ao') || false;   // ?ao=0.9 / ?ao=0 overrides a scene's ambient-occlusion setting (look tests)
    this.o = o; this.duration = o.duration || 8; window.__duration = this.duration; window.__app = this;
    const W = this.w = innerWidth, H = this.h = innerHeight;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    r.setSize(W, H); r.setPixelRatio(1);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = o.exposure ?? 1.0; r.outputColorSpace = THREE.SRGBColorSpace;
    document.body.style.margin = '0'; document.body.style.background = '#000'; document.body.style.overflow = 'hidden'; document.body.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(o.fov || 30, W / H, o.near || 0.03, o.far || 600);
    // anti-aliasing: SMAA on the display image by default (MSAA costs about half the frame time in the software renderer
    // and, under depth of field, bloom and grain, looks the same); ?msaa=4 or o.msaa restores multisampling
    const msaa = QP.has('msaa') ? +QP.get('msaa') : (o.msaa ?? 0);
    // depth of field reads the scene pass's depth (?dofpass=1 restores BokehPass's own depth render, for comparison)
    const dof = o.dof && !QP.has('nodof'), sceneDepth = dof && !msaa && !o.ao && !QP.has('dofpass');
    const rt = new THREE.WebGLRenderTarget(W, H, { samples: msaa, type: THREE.HalfFloatType, depthTexture: sceneDepth ? new THREE.DepthTexture(W, H) : null });
    this.composer = new EffectComposer(r, rt); this.composer.setPixelRatio(1);
    if (sceneDepth) this.composer.renderTarget2.depthTexture = new THREE.DepthTexture(W, H);   // clone() would share the first one's texture
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const scale = Math.min(W / 1920, H / 1080) || 1;
    if (o.ao) { this.ao = new GTAOPass(this.scene, this.camera, W, H); this.ao.output = GTAOPass.OUTPUT.Default; this.ao.blendIntensity = o.ao === true ? 0.9 : o.ao;
      this.ao.updateGtaoMaterial({ radius: o.aoRadius ?? 0.35, distanceExponent: 1, thickness: 1, scale: 1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
      this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); this.composer.addPass(this.ao); }
    if (dof) { this.dof = new (sceneDepth ? SceneDepthBokehPass : BokehPass)(this.scene, this.camera, { focus: 3.0, aperture: o.dof.aperture ?? 0.004, maxblur: (o.dof.maxblur ?? 0.008), width: W, height: H }); this.composer.addPass(this.dof); }
    if (o.bloom !== false && !QP.has('nobloom')) { this.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), o.bloomStrength ?? 0.16, o.bloomRadius ?? 0.55, o.bloomThreshold ?? 0.88); this.composer.addPass(this.bloom); }
    this.composer.addPass(new OutputPass());
    if (!msaa) this.composer.addPass(new SMAAPass(W, H));
    this.grade = new ShaderPass(GradeShader); this.grade.uniforms.res.value.set(W, H);
    for (const k of ['vignette', 'grain', 'warmth', 'sat', 'contrast', 'lift']) if (o[k] != null) this.grade.uniforms[k].value = o[k];
    if (o.tint) this.grade.uniforms.tint.value.set(o.tint);
    this.composer.addPass(this.grade);
    this.updaters = []; this.late = []; this.puppets = []; this.t = 0; this.fadeKeys = o.fadeKeys || null;
  }
  add(...objs) { for (const x of objs) this.scene.add(x.root || x); return objs[0]; }
  on(fn) { this.updaters.push(fn); return this; }
  after(fn) { this.late.push(fn); return this; }
  cast(...ps) { for (const p of ps) { this.puppets.push(p); this.scene.add(p.root); p.root.traverse(o => { if (o.userData.lod) (this.lods || (this.lods = [])).push(o.userData.lod); }); } return ps[0]; }
  // pose everything at t without drawing (scenes use it once at load to measure, e.g. a prop's grip at a hand-off)
  evaluate(t) { this.t = t;
    for (let pass = 0; pass < 6; pass++) { for (const u of this.updaters) u(t); for (const p of this.puppets) p.pose(t); this.scene.updateMatrixWorld(true);
      for (const p of this.puppets) p.solve(t); this.scene.updateMatrixWorld(true); for (const u of this.late) u(t); this.scene.updateMatrixWorld(true); } }
  // everything at time t (people, props, camera, focus, fade, hair detail), without drawing
  poseAt(t) {
    this.t = t;
    // repeated passes resolve cross-object targets (props that follow hands, hands that follow heads); six settle the
    // pose from any previous state (from rest, two leave a wrist ~4 cm off), so a frame never depends on the one before
    for (let pass = 0; pass < 6; pass++) {
      for (const u of this.updaters) u(t);
      for (const p of this.puppets) p.pose(t);
      this.scene.updateMatrixWorld(true);
      for (const p of this.puppets) p.solve(t);
      this.scene.updateMatrixWorld(true);
      for (const u of this.late) u(t);
      this.scene.updateMatrixWorld(true);
    }
    if (this.rig) this.rig.apply(this, t);
    DBGCAM(this);
    if (this.fadeKeys) this.grade.uniforms.fade.value = keyed(this.fadeKeys, t, smooth);
    this.grade.uniforms.time.value = t;
    this.camera.updateMatrixWorld(); for (const f of this.lods || []) f(this.camera, this.h);
  }
  renderAt(t) { this.poseAt(t); this.composer.render(); }
  // A frame as a film camera exposes it: K sub-frames spread over the shutter (half a frame at 24 fps), each with the
  // camera nudged by a different sub-pixel offset, averaged in linear light before tone mapping. That is motion blur
  // and anti-aliasing in one (fine hair and thin stems stop sparkling). Shadow maps are drawn once per frame and depth
  // of field, bloom and the grade run once on the average (with the last sub-frame's depth, a 1/200 s away); a shutter
  // never reaches across a cut. ?sub=K, or o.sub; 1 = a plain frame.
  renderFrame(t) {
    const K = this.sub ?? (+new URLSearchParams(location.search).get('sub') || this.o.sub || 1); this.sub = K;
    if (K <= 1) return this.renderAt(t);
    const r = this.renderer, C = this.composer, rp = C.passes[0], W = this.w, H = this.h, sh = (this.o.shutter ?? 0.5) / 24, cuts = this.rig ? this.rig.keys.filter(k => k.cut).map(k => k.t) : [];
    if (!this._acc) { const quad = (frag, blend) => { const m = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, w: { value: 1 } }, vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: frag, depthTest: false, depthWrite: false, blending: blend ? THREE.CustomBlending : THREE.NoBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
        const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); return { m, sc }; };
      const frag = 'uniform sampler2D src; uniform float w; varying vec2 vUv; void main() { gl_FragColor = texture2D(src, vUv) * w; }';
      this._acc = { rt: new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false }), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), add: quad(frag, true), put: quad(frag, false) }; }
    const A = this._acc, halton = (i, b) => { let f = 1, x = 0; while (i > 0) { f /= b; x += f * (i % b); i = Math.floor(i / b); } return x; };
    const inShot = (tk) => { for (const c of cuts) { if (tk < c && c <= t) tk = c; if (t < c && c <= tk) tk = c - 1e-4; } return clamp(tk, 0, this.duration); };   // stay inside this frame's shot
    // how far things move on screen while the shutter is open (everything in frame near the focus distance: objects, and
    // the bones of the people); more sub-frames where that would otherwise show as separate copies (about 3 px apart at most)
    const Kf = this.o.subMax === 1 ? K : clamp(Math.ceil(this.motionPx(inShot(t - sh / 2), inShot(t + sh / 2)) / 3), K, this.o.subMax || 16); window.__lastK = Kf;
    const quadTo = (q, target, src, w) => { q.m.uniforms.src.value = src; q.m.uniforms.w.value = w; r.setRenderTarget(target); const ac = r.autoClear; r.autoClear = false; r.render(q.sc, A.cam); r.autoClear = ac; };
    const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha(); r.setRenderTarget(A.rt); r.setClearColor(0x000000, 0); r.clear(); r.setClearColor(cc, ca);
    const order = Array.from({ length: Kf }, (_, k) => k).sort((a, b) => Math.abs(b + 0.5 - Kf / 2) - Math.abs(a + 0.5 - Kf / 2));   // the sub-frame nearest the middle last (its depth feeds the depth of field)
    const autoShadow = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false;
    order.forEach((k, j) => {
      const tk = inShot(t + ((k + 0.5) / Kf - 0.5) * sh);
      this.camera.setViewOffset(W, H, halton(j + 1, 2) - 0.5, halton(j + 1, 3) - 0.5, W, H);
      this.poseAt(tk); r.shadowMap.needsUpdate = j === 0;
      rp.render(r, null, C.readBuffer);                       // the scene, linear HDR, with its depth
      quadTo(A.add, A.rt, C.readBuffer.texture, 1 / Kf);
    });
    r.shadowMap.autoUpdate = autoShadow; this.camera.clearViewOffset();
    quadTo(A.put, C.readBuffer, A.rt.texture, 1);            // the average replaces the colour; the depth stays
    rp.enabled = false; C.render(); rp.enabled = true;
  }
  // largest on-screen movement (px) between t0 and t1 of anything in frame within a factor of two of the focus distance
  // (nearer or further it is blurred by the depth of field anyway): object origins, and every bone of the people
  motionPx(t0, t1) {
    if (!this._probes) { const set = new Set(); this.scene.traverse(o => { if (o.isSkinnedMesh) o.skeleton.bones.forEach(b => set.add(b)); else if ((o.isMesh || o.isPoints) && o.visible) set.add(o); }); this._probes = [...set].slice(0, 6000); }
    const P = this._probes, cam = this.camera, v = V(), snap = (tt) => { this.poseAt(tt); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const view = cam.matrixWorldInverse.clone(), proj = cam.projectionMatrix.clone(), f = this.dof ? this.dof.uniforms.focus.value : null;
      return P.map(o => { o.getWorldPosition(v).applyMatrix4(view); const z = -v.z; if (z < cam.near) return null; if (f && (z < f * 0.5 || z > f * 2)) return null; v.applyMatrix4(proj); return Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1 ? null : [v.x * this.w / 2, v.y * this.h / 2]; }); };
    const a = snap(t0), b = snap(t1); let m = 0; for (let i = 0; i < P.length; i++) if (a[i] && b[i]) m = Math.max(m, Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]));
    return m;
  }
  ready() { _ready(); return this; }
  // environment from a CC0 HDRI (Poly Haven via pmndrs/assets); used for light + reflections, not as backdrop
  async hdri(name, o = {}) {
    const QP = new URLSearchParams(location.search); if (QP.has('hdri')) { const [n, r] = QP.get('hdri').split(':'); name = n; if (r) o = Object.assign({}, o, { rotation: +r }); }   // (look tests)
    const mod = await import(`./assets/hdri/${name}.exr.js`);
    const tex = await new EXRLoader().loadAsync(mod.default); tex.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.environment = tex; this.scene.environmentIntensity = o.intensity ?? 1.0;
    if (o.rotation) this.scene.environmentRotation = new THREE.Euler(0, o.rotation, 0);
    if (o.background) { this.scene.background = tex; this.scene.backgroundBlurriness = o.blur ?? 0.0; this.scene.backgroundIntensity = o.bgIntensity ?? 1; if (o.rotation) this.scene.backgroundRotation = new THREE.Euler(0, o.rotation, 0); }
    return tex;
  }
}

// ------------------------------------------------------------------ camera rig with in-shot cuts, handheld feel and focus pulls
// keys: { t, pos:[x,y,z], look:[x,y,z], fov, focus: number | [x,y,z] | Object3D | fn(t), cut: true, roll }
export class Rig {
  constructor(keys, o = {}) { this.keys = keys; this.hand = o.handheld ?? 0.6; this.ease = o.ease || easeInOut; }
  segment(t) {
    const k = this.keys; let i = 0; while (i < k.length - 1 && t >= k[i + 1].t) i++;
    const a = k[i], b = k[Math.min(i + 1, k.length - 1)];
    if (a === b || b.cut) return { a, b: a, u: 0 };
    const u = (b.ease || this.ease)(clamp((t - a.t) / Math.max(1e-4, b.t - a.t)));
    return { a, b, u };
  }
  apply(app, t) {
    const { a, b, u } = this.segment(t), cam = app.camera;
    const ev = (x) => typeof x === 'function' ? x(t) : (x.isVector3 ? x.clone() : V(...x));
    const pos = ev(a.pos).lerp(ev(b.pos), u), look = ev(a.look).lerp(ev(b.look), u);
    const h = (a.hand ?? this.hand);
    const n = (s, o) => (noise2(t * s, o) - 0.5);
    pos.x += (n(0.55, 1.3) * 0.014 + n(1.7, 2.1) * 0.003) * h; pos.y += (n(0.6, 4.1) * 0.010 + n(1.9, 5.2) * 0.002) * h;
    look.x += (n(0.5, 7.7) * 0.016) * h; look.y += (n(0.45, 9.2) * 0.012) * h;
    cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look);
    const roll = lerp(a.roll || 0, b.roll || 0, u) + n(0.4, 3.3) * 0.004 * h; cam.rotateZ(roll);
    const fov = lerp(a.fov ?? 30, b.fov ?? a.fov ?? 30, u); if (Math.abs(cam.fov - fov) > 1e-4) { cam.fov = fov; cam.updateProjectionMatrix(); }
    if (app.dof) {
      const fa = this.focusDist(a, cam, t), fb = this.focusDist(b, cam, t); const f = (fa != null && fb != null) ? lerp(fa, fb, u) : (fa ?? fb ?? 3);
      app.dof.uniforms.focus.value = f;
      const ap = lerp(a.aperture ?? app.o.dof.aperture ?? 0.004, b.aperture ?? a.aperture ?? app.o.dof.aperture ?? 0.004, u);
      app.dof.uniforms.aperture.value = ap;
    }
  }
  focusDist(k, cam, t) {
    let f = k.focus; if (f == null) return null; if (typeof f === 'function') f = f(t);
    if (typeof f === 'number') return f;
    const p = Array.isArray(f) ? V(...f) : f.isVector3 ? f.clone() : f.getWorldPosition(V());
    const d = p.sub(cam.position); const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); return Math.max(0.05, d.dot(fwd));
  }
}

// ------------------------------------------------------------------ sky dome, sun, ground
export function skyDome(app, o = {}) {
  const sunDir = (o.sunDir || V(0.4, 0.3, -1)).clone().normalize();
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(o.top || '#6f9fd6') }, mid: { value: new THREE.Color(o.mid || o.horizon || '#cfd9e0') }, hor: { value: new THREE.Color(o.horizon || '#e7d8c3') }, ground: { value: new THREE.Color(o.ground || '#8d8270') },
      sunCol: { value: new THREE.Color(o.sunColor || '#fff1d6') }, sunDir: { value: sunDir }, sunSize: { value: o.sunSize ?? 0.99965 }, glow: { value: o.glow ?? 1.0 }, sunI: { value: o.sunIntensity ?? 6.0 } },
    vertexShader: `varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz - cameraPosition; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top, mid, hor, ground, sunCol, sunDir; uniform float sunSize, glow, sunI; varying vec3 vW;
      void main(){ vec3 d = normalize(vW); float h = d.y;
        vec3 c = h > 0.0 ? mix(hor, mid, smoothstep(0.0, 0.18, h)) : mix(hor, ground, smoothstep(0.0, -0.06, h));
        c = h > 0.18 ? mix(mid, top, smoothstep(0.18, 0.75, h)) : c;
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * (pow(s, 8.0) * 0.28 + pow(s, 64.0) * 0.5) * glow;
        c += sunCol * smoothstep(sunSize - 0.00012, sunSize + 0.00012, s) * sunI;
        gl_FragColor = vec4(c, 1.0); }`
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), m); dome.frustumCulled = false; dome.renderOrder = -10; app.scene.add(dome);
  // o.env: light the scene with this sky (prefiltered) instead of a photographed HDRI, so the fill and the reflections
  // match the sky in frame (a blue-sky HDRI under a sunset turned shadowed wood purple and put magenta rims on tomatoes)
  if (o.env) { const es = new THREE.Scene(), em = m.clone(); em.depthTest = false; es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), em));
    const pm = new THREE.PMREMGenerator(app.renderer); app.scene.environment = pm.fromScene(es, 0.015, 0.1, 100).texture; pm.dispose();
    if (typeof o.env === 'number') app.scene.environmentIntensity = o.env; app.scene.environmentRotation = new THREE.Euler(); }
  if (o.fog !== false) app.scene.fog = new THREE.Fog(new THREE.Color(o.fogColor || o.horizon || '#e7d8c3'), o.fogNear ?? 40, o.fogFar ?? 260);
  return dome;
}
let cloudTexP = null;
export async function clouds(app, o = {}) {
  if (!cloudTexP) cloudTexP = import('./assets/textures/cloud.webp.js').then(m => new THREE.TextureLoader().loadAsync(m.default));
  const tex = await cloudTexP; tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group(); const n = o.count || 10; const yaw0 = o.yaw || 0, spread = o.spread || 1.6;
  for (let i = 0; i < n; i++) {
    const mtl = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: (o.opacity ?? 0.75) * R(0.6, 1), depthWrite: false, fog: false, color: o.color || '#ffffff' });
    const sp = new THREE.Sprite(mtl); let a = yaw0 + R(-spread, spread); if (o.avoid != null) { let d = Math.atan2(Math.sin(a - o.avoid), Math.cos(a - o.avoid)); if (Math.abs(d) < 0.5) a += Math.sign(d || 1) * 0.7; } const dist = o.dist || 380;
    sp.position.set(Math.sin(a) * dist, R(o.minY ?? 25, o.maxY ?? 90), -Math.cos(a) * dist); const s = R(110, 220) * (o.scale || 1); sp.scale.set(s, s * R(0.3, 0.45), 1); g.add(sp);
  }
  app.scene.add(g); return g;
}
export function sunLight(app, o = {}) {
  const dir = (o.dir || V(0.4, 0.3, -1)).clone().normalize();
  const l = new THREE.DirectionalLight(o.color || '#ffe6c4', o.intensity ?? 3.0);
  const target = o.target || V(0, 0, 0); l.position.copy(target).add(dir.clone().multiplyScalar(80)); l.target.position.copy(target);
  l.castShadow = o.shadow !== false; const s = o.size || 14;
  l.shadow.mapSize.set(o.mapSize || 2048, o.mapSize || 2048); Object.assign(l.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 220 });
  l.shadow.bias = o.bias ?? -0.0004; l.shadow.normalBias = o.normalBias ?? 0.02; l.shadow.radius = o.softness ?? 4; l.shadow.blurSamples = 16;
  app.scene.add(l, l.target); return l;
}
export function fillLights(app, o = {}) {
  const hemi = new THREE.HemisphereLight(o.sky || '#c4d6ee', o.ground || '#6e5c46', o.hemi ?? 0.5); app.scene.add(hemi);
  if (o.rim) { const r = new THREE.DirectionalLight(o.rimColor || '#ffe0b8', o.rim); r.position.copy((o.rimDir || V(-0.5, 0.6, -1)).normalize().multiplyScalar(40)); app.scene.add(r); }
  return hemi;
}
// a plank floor at physical scale: 14 cm boards in 1.2 m lengths with staggered joints, each board its own cut of the
// log (ring pattern and tone), hairline gaps and softened edges between them. One tile spans FLOOR_SPAN metres.
export const FLOOR_SPAN = [2.4, 1.68];
export function plankFloorMaps(o = {}) {
  const key = 'floor' + JSON.stringify(o); if (woodCache[key]) return woodCache[key];
  const W = o.w || 2048, H = Math.round(W * FLOOR_SPAN[1] / FLOOR_SPAN[0]), pw = 0.14, PL = 1.2;
  const col = new Uint8ClampedArray(W * H * 4), hgt = new Float32Array(W * H), rou = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) { const Y = y / H * FLOOR_SPAN[1], row = Math.floor(Y / pw), vy = Y - row * pw, off = hash2(row, 7.7) * PL;
    for (let x = 0; x < W; x++) { const X = x / W * FLOOR_SPAN[0], xx = ((X - off) % FLOOR_SPAN[0] + FLOOR_SPAN[0]) % FLOOR_SPAN[0], seg = Math.floor(xx / PL), ux = xx - seg * PL;
      const sd = hash2(row * 3.1 + seg, 13.3), u = ux + sd * 5, v = vy + sd * 0.7;
      const ring = v * 58 + (fbm(u * 1.4 + sd * 20, v * 4.2, 4) - 0.5) * 5 + 0.6 * Math.sin(u * 3.3 + v * 9 + sd * 40), f = ring - Math.floor(ring);
      const late = (smooth((f - 0.6) / 0.28) * (1 - smooth((f - 0.93) / 0.07))) * 0.4;   // oak under an oiled finish: the figure is quiet
      const pore = Math.max(0, noise2(u * 9 + sd * 30, v * 420) - 0.78) * 2.2 + Math.max(0, noise2(u * 23 + 5, v * 900 + sd * 9) - 0.86) * 1.4;
      const edge = Math.min(vy, pw - vy, ux, PL - ux), gap = 1 - smooth((edge - 0.0004) / 0.0011), bevel = 1 - smooth(edge / 0.0035);
      const tone = (0.8 + hash2(row * 3.1 + seg, 2.9) * 0.32) * (1 + (fbm(u * 0.9 + 11, v * 5 + sd * 3, 3) - 0.5) * 0.2) * (1 + (noise2(X * 1.7, Y * 1.7) - 0.5) * 0.1);   // boards differ; a little wear across the room
      const L = clamp(tone * (1 - late * 0.3) * (1 - Math.min(1, pore) * 0.2) * (1 - gap * 0.65) * (1 - bevel * 0.12), 0, 1.2), i = (y * W + x) * 4;
      col[i] = clamp(L * 238, 0, 255); col[i + 1] = clamp(L * 230, 0, 255); col[i + 2] = clamp(L * 218, 0, 255); col[i + 3] = 255;
      hgt[y * W + x] = -late * 0.3 - Math.min(1, pore) * 0.5 - bevel * 1.2 - gap * 1.5;
      rou[i] = 0; rou[i + 1] = clamp(255 * ((o.rough ?? 0.55) + Math.min(1, pore) * 0.15 + gap * 0.3 + (noise2(X * 3, Y * 3) - 0.5) * 0.12), 0, 255); rou[i + 2] = 0; rou[i + 3] = 255; } }
  const mk = (data, linear) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(new ImageData(data, W, H), 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; return t; };
  const nrm = new Uint8ClampedArray(W * H * 4), Hh = (x, y) => hgt[((y + H) % H) * W + ((x + W) % W)], st = o.relief ?? 1.4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (Hh(x + 1, y) - Hh(x - 1, y)) * st, dy = (Hh(x, y + 1) - Hh(x, y - 1)) * st, l = Math.hypot(dx, dy, 1), i = (y * W + x) * 4;
    nrm[i] = (-dx / l * 0.5 + 0.5) * 255; nrm[i + 1] = (dy / l * 0.5 + 0.5) * 255; nrm[i + 2] = (1 / l * 0.5 + 0.5) * 255; nrm[i + 3] = 255; }
  return (woodCache[key] = { map: mk(col, false), normalMap: mk(nrm, true), roughnessMap: mk(rou, true) });
}
export function groundPlane(app, o = {}) {
  const size = o.size || 400; const g = new THREE.PlaneGeometry(size, size, 1, 1);
  if (o.kind === 'planks') { const M = plankFloorMaps(o.maps || {}); for (const t of Object.values(M)) t.repeat.set(size / FLOOR_SPAN[0], size / FLOOR_SPAN[1]);
    const m = new THREE.MeshPhysicalMaterial({ color: o.color || '#9c7650', map: M.map, normalMap: M.normalMap, normalScale: new THREE.Vector2(o.ns ?? 0.7, o.ns ?? 0.7), roughnessMap: M.roughnessMap, roughness: 1.0,
      clearcoat: o.clearcoat ?? 0.25, clearcoatRoughness: 0.35, sheen: 0.1, sheenRoughness: 0.6, sheenColor: new THREE.Color(o.color || '#9c7650').offsetHSL(0, -0.1, 0.15) });
    const p = mesh(g, m, { cast: false }); p.rotation.x = -Math.PI / 2; p.position.y = o.y || 0; app.scene.add(p); return p; }
  const rep = o.repeat || size / 6;
  const m = mat(o.color || '#6a5a40', { map: grain(o.kind || 'soil', { repeat: rep, scale: o.scale || 6 }), roughness: 0.96 });
  if (o.normal) { m.normalMap = normalTex(o.normal, rep); m.normalScale = new THREE.Vector2(o.ns ?? 0.8, o.ns ?? 0.8); }
  const p = mesh(g, m, { cast: false }); p.rotation.x = -Math.PI / 2; p.position.y = o.y || 0; app.scene.add(p); return p;
}

// ------------------------------------------------------------------ particles (dust motes, steam, pollinators) — positions are pure functions of t
export function motes(app, o = {}) {
  const n = o.count || 200; const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3); const sd = [];
  const c = o.center || V(0, 1, 0), sz = o.size || V(6, 3, 6);
  for (let i = 0; i < n; i++) sd.push([R(-0.5, 0.5), R(-0.5, 0.5), R(-0.5, 0.5), R(0, 100), R(0.6, 1.4)]);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, { clamp: true });
  const m = new THREE.PointsMaterial({ size: o.pointSize || 0.03, map: tex, transparent: true, opacity: o.opacity ?? 0.5, color: o.color || '#fff2d6', depthWrite: false, blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending, sizeAttenuation: true, fog: o.fog ?? true });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false; app.scene.add(pts);
  const rise = o.rise || 0, drift = o.drift ?? 0.12, speed = o.speed ?? 0.3;
  app.on(t => {
    const p = geo.attributes.position;
    for (let i = 0; i < n; i++) {
      const [a, b, cz, s, k] = sd[i];
      let y = b * sz.y; if (rise) { y = ((b + 0.5 + (t * rise * k) / sz.y + s) % 1) - 0.5; y *= sz.y; }
      const sp = speed * k;
      p.setXYZ(i, c.x + a * sz.x + Math.sin(t * sp + s) * drift + (o.wind || 0) * t, c.y + y + Math.sin(t * sp * 1.3 + s * 2) * drift * 0.5, c.z + cz * sz.z + Math.cos(t * sp * 0.8 + s * 1.7) * drift);
    }
    p.needsUpdate = true;
    if (rise && o.fadeTop) { /* opacity handled globally */ }
  });
  return pts;
}
// soft steam / mist billboards rising from a point (kitchen pots, compost windrows)
export function steam(app, o = {}) {
  const tex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }, { clamp: true });
  const n = o.count || 14, base = o.at || V(0, 1, 0), life = o.life || 3.0, hgt = o.height || 0.6; const sprites = [];
  for (let i = 0; i < n; i++) { const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, color: o.color || '#ffffff', fog: true }); const s = new THREE.Sprite(m); app.scene.add(s); sprites.push([s, R(0, life), R(-1, 1), R(-1, 1), R(0.7, 1.3)]); }
  app.on(t => { for (const [s, off, dx, dz, k] of sprites) { const a = ((t + off) % life) / life; s.position.set(base.x + dx * (o.spread || 0.08) + Math.sin(t * 0.9 + off) * 0.03 * a, base.y + a * hgt * k, base.z + dz * (o.spread || 0.08)); const sc = (o.size || 0.12) * (0.6 + a * 1.8); s.scale.set(sc, sc, 1); s.material.opacity = (o.opacity ?? 0.22) * Math.sin(a * Math.PI) ; s.material.rotation = off + a; } });
  return sprites;
}

// dialogue timing + per-frame loudness envelopes (written by audio/build_dialogue.py)
export async function dialogue(shotId) {
  const r = await fetch('../audio/dialogue/timing.json'); const j = await r.json(); return j[shotId] || [];
}
