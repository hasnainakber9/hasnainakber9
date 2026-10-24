// GOOD FOOD. NO DEAD ENDS. — realistic foliage: trees and shrubs as crowns of alpha-cut leaf-cluster cards.
// Leaf clusters are painted procedurally (gradient, mottling, midribs, darker margins) with a matching normal map
// derived from a painted height field. Crown cards carry "volume" normals (pointing out of the crown) and
// depth-based occlusion in their vertex colours, which is what makes a cloud of cards read as a leafy mass.
import { THREE, V, clamp, lerp, prng, merged, M4, normalTex, translucent } from './core.js';
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ painted leaf clusters (+ normal maps)
export function heightToNormal(hd, w, h, strength) {
  const out = new ImageData(w, h), d = out.data, H = (x, y) => hd[((clamp(y, 0, h - 1)) * w + clamp(x, 0, w - 1)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * strength;
    const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4; d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255; }
  return out;
}
function leafShape(x, y, len, wid, ang, round = 0) {
  const p = new Path2D(), c = Math.cos(ang), s = Math.sin(ang), P = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  p.moveTo(...P(0, 0)); p.bezierCurveTo(...P(len * 0.25, wid * (0.6 + round * 0.2)), ...P(len * (0.75 + round * 0.15), wid * (0.55 + round * 0.3)), ...P(len, 0));
  p.bezierCurveTo(...P(len * (0.75 + round * 0.15), -wid * (0.55 + round * 0.3)), ...P(len * 0.25, -wid * (0.6 + round * 0.2)), ...P(0, 0)); return p;
}
const atlasCache = {};
export function leafAtlas(kind = 'cluster') {
  if (atlasCache[kind]) return atlasCache[kind];
  const S = 512, r = prng({ cluster: 11, shrub: 23, herb: 37, conifer: 41 }[kind] || 5);
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const hv = document.createElement('canvas'); hv.width = hv.height = S; const hg = hv.getContext('2d'); hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S);
  const greens = { cluster: ['#2f5a22', '#3d6b2a', '#4c7a31', '#5f8c3a', '#6e9a42'], shrub: ['#2a4f1f', '#355f26', '#43702d', '#54803a'], herb: ['#3a6e2a', '#4d8434', '#5f9640'], conifer: ['#1f3d22', '#29492a', '#355834'] }[kind] || ['#3d6b2a'];
  // twigs
  const twigs = []; const nT = kind === 'shrub' ? 7 : 5;
  for (let i = 0; i < nT; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.2, L = S * (0.28 + r() * 0.2); const x0 = S / 2 + (r() - 0.5) * S * 0.2, y0 = S * 0.9 - r() * S * 0.15; twigs.push([x0, y0, a, L]);
    g.strokeStyle = 'rgba(70,60,40,0.9)'; g.lineWidth = 3 + r() * 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L); g.stroke(); }
  const n = { cluster: 95, shrub: 160, herb: 60, conifer: 260 }[kind] || 90;
  for (let i = 0; i < n; i++) {
    const [x0, y0, a, L] = twigs[i % twigs.length]; const f = 0.15 + r() * 0.85; const x = x0 + Math.cos(a) * L * f, y = y0 + Math.sin(a) * L * f;
    const side = r() < 0.5 ? -1 : 1, ang = a + side * (0.5 + r() * 0.7), len = { cluster: 70, shrub: 38, herb: 60, conifer: 46 }[kind] * (0.7 + r() * 0.5), wid = len * ({ cluster: 0.42, shrub: 0.6, herb: 0.55, conifer: 0.12 }[kind] || 0.4);
    const p = leafShape(x, y, len, wid, ang, kind === 'shrub' ? 0.6 : 0);
    const base = new THREE.Color(greens[Math.floor(r() * greens.length)]).offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.1, (r() - 0.5) * 0.06);
    const gr = g.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len); gr.addColorStop(0, base.clone().multiplyScalar(0.78).getStyle()); gr.addColorStop(1, base.clone().offsetHSL(0.01, 0, 0.06).getStyle());
    g.fillStyle = gr; g.fill(p);
    g.save(); g.clip(p); for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,40,10' : '150,180,90'},${0.06 + r() * 0.08})`; g.beginPath(); g.arc(x + (r() - 0.5) * len * 1.4, y + (r() - 0.5) * len * 1.4, len * (0.1 + r() * 0.25), 0, TAU); g.fill(); } g.restore();
    g.strokeStyle = 'rgba(15,30,8,0.35)'; g.lineWidth = 1.2; g.stroke(p);
    g.strokeStyle = 'rgba(190,215,140,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * len * 0.92, y + Math.sin(ang) * len * 0.92); g.stroke();
    // height: a dome per leaf with a sunken midrib
    const hgr = hg.createRadialGradient(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5, 1, x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5, len * 0.6);
    hgr.addColorStop(0, '#d0d0d0'); hgr.addColorStop(1, '#707070'); hg.fillStyle = hgr; hg.fill(p);
    hg.strokeStyle = '#606060'; hg.lineWidth = 2; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + Math.cos(ang) * len * 0.92, y + Math.sin(ang) * len * 0.92); hg.stroke();
  }
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const nimg = heightToNormal(hg.getImageData(0, 0, S, S).data, S, S, 2.2); const nc = document.createElement('canvas'); nc.width = nc.height = S; nc.getContext('2d').putImageData(nimg, 0, 0);
  const normalMap = new THREE.CanvasTexture(nc); normalMap.colorSpace = THREE.NoColorSpace;
  return (atlasCache[kind] = { map, normalMap });
}
// leaves lit from either side without the back face flipping its (volume) normal
export function foliageMat(kind = 'cluster', o = {}) {
  const { map, normalMap } = leafAtlas(kind);
  const m = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(0.7, 0.7), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: o.roughness ?? 0.72, color: o.color || '#ffffff' });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace(/\n\s*normal \*= faceDirection;/g, '\n')); };
  m.customProgramCacheKey = () => 'foliage'; return translucent(m, '#d8f08a', o.translucency ?? 0.55);
}

// ------------------------------------------------------------------ crowns of cards
// cards in an ellipsoid (centre C, radii R), biased to the shell, facing outwards; volume normals and occlusion in colours
function crownGeo(C, R, n, size, r, o = {}) {
  const pos = [], nor = [], uv = [], col = [], idx = []; const tint = new THREE.Color(o.color || '#ffffff');
  for (let i = 0; i < n; i++) {
    const d = V(); do { d.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); } while (d.lengthSq() > 1 || d.lengthSq() < 0.02);
    if (o.flatBottom && d.y < -0.35) d.y = -0.35 + (d.y + 0.35) * 0.3;
    const k = 0.5 + 0.5 * Math.pow(r(), 0.45); d.normalize().multiplyScalar(k); const c = C.clone().add(V(d.x * R.x, d.y * R.y, d.z * R.z));
    const s = size * (0.75 + r() * 0.5); const nrm = d.clone().normalize().add(V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(1.1)).normalize();
    const t1 = V(0, 1, 0).cross(nrm); if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0); t1.normalize(); const t2 = nrm.clone().cross(t1).normalize();
    const rot = (r() - 0.5) * 1.2; const a1 = t1.clone().multiplyScalar(Math.cos(rot)).addScaledVector(t2, Math.sin(rot)), a2 = nrm.clone().cross(a1).normalize();
    const base = pos.length / 3;
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const p = c.clone().addScaledVector(a1, (u - 0.5) * s).addScaledVector(a2, (v - 0.5) * s); pos.push(p.x, p.y, p.z);
      const sn = p.clone().sub(C); sn.set(sn.x / R.x, sn.y / R.y, sn.z / R.z).normalize(); const nn = sn.multiplyScalar(0.7).addScaledVector(nrm, 0.3).normalize(); nor.push(nn.x, nn.y, nn.z); uv.push(u, v); }
    const ao = (0.42 + 0.58 * k * k) * (0.82 + 0.18 * clamp((d.y + 1) / 2, 0, 1)) * (0.9 + r() * 0.2); const cc = tint.clone().multiplyScalar(ao).offsetHSL((r() - 0.5) * 0.02, 0, 0);
    for (let q = 0; q < 4; q++) col.push(cc.r, cc.g, cc.b);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
}
const geoCache = {};
// { trunk, crown } for a broadleaf tree of the given height (ground at y = 0)
export function treeGeos(o = {}) {
  const key = 'tree' + JSON.stringify(o); if (geoCache[key]) return geoCache[key];
  const h = o.height || 7, r = prng(o.seed || 3), parts = [];
  parts.push({ geo: new THREE.CylinderGeometry(h * 0.02, h * 0.038, h * 0.6, 10, 4), m: M4(0, h * 0.3, 0), color: o.bark || '#4f4031' });
  const fork = V(0, h * 0.5, 0);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + r() * 0.6, tilt = 0.45 + r() * 0.5, L = h * (0.24 + r() * 0.12); const dir = V(Math.sin(tilt) * Math.cos(a), Math.cos(tilt), Math.sin(tilt) * Math.sin(a));
    const m = new THREE.Matrix4().compose(fork.clone().addScaledVector(dir, L / 2), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), V(1, 1, 1)); parts.push({ geo: new THREE.CylinderGeometry(h * 0.005, h * 0.014, L, 6), m, color: o.bark || '#4f4031' }); }
  const C = V(0, h * 0.66, 0), R = V(h * 0.3, h * 0.26, h * 0.3);
  const out = { trunk: merged(parts), crown: crownGeo(C, R, o.cards || 260, h * 0.16, r, { color: o.leafTint }) };
  return (geoCache[key] = out);
}
export function tree(o = {}) {
  const g = new THREE.Group(), T = treeGeos(o);
  const bark = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, normalMap: normalTex('rock', 3), normalScale: new THREE.Vector2(0.8, 0.8) });
  const t = new THREE.Mesh(T.trunk, bark), c = new THREE.Mesh(T.crown, o.material || foliageMat('cluster'));
  for (const m of [t, c]) { m.castShadow = true; m.receiveShadow = true; g.add(m); } return g;
}
// a shrub or potted plant: a low crown of small-leaved cards (size = radius in metres)
export function shrubGeo(o = {}) {
  const key = 'shrub' + JSON.stringify(o); if (geoCache[key]) return geoCache[key];
  const s = o.size || 0.5, r = prng(o.seed || 7);
  const g = crownGeo(V(0, s * 0.62, 0), V(s, s * 0.7, s), o.cards || Math.round(60 + s * 120), s * (o.cardScale || 0.42), r, { color: o.tint, flatBottom: true });
  return (geoCache[key] = g);
}
export function shrub(o = {}) { const m = new THREE.Mesh(shrubGeo(o), o.material || foliageMat(o.kind || 'shrub')); m.castShadow = true; m.receiveShadow = true; return m; }

// ------------------------------------------------------------------ a tomato's compound leaf: rachis with serrated, veined leaflets
export function compoundLeaf() {
  if (atlasCache.compound) return atlasCache.compound;
  const S = 512, r = prng(19); const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const hv = document.createElement('canvas'); hv.width = hv.height = S; const hg = hv.getContext('2d'); hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S);
  const serr = (cx, cy, rx, ry, ang, teeth) => { const p = new Path2D(); for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU; const tooth = 1 - 0.13 * Math.pow(0.5 + 0.5 * Math.cos(a * teeth), 3) - 0.08 * Math.abs(Math.sin(a * 2.5)) * (0.5 + 0.5 * Math.sin(a * teeth * 0.5));
      const x = Math.cos(a) * rx * tooth * (a < Math.PI ? 1 : 0.92), y = Math.sin(a) * ry * tooth; p[i ? 'lineTo' : 'moveTo'](cx + x * Math.cos(ang) - y * Math.sin(ang), cy + x * Math.sin(ang) + y * Math.cos(ang)); } p.closePath(); return p; };
  // rachis: base at the bottom centre, bending a little
  const rach = []; for (let i = 0; i <= 20; i++) { const t = i / 20; rach.push([S / 2 + Math.sin(t * 2.2) * 14, S - 6 - t * (S - 40)]); }
  g.strokeStyle = '#4a6a2a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); rach.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke();
  hg.strokeStyle = '#b0b0b0'; hg.lineWidth = 6; hg.beginPath(); rach.forEach(([x, y], i) => hg[i ? 'lineTo' : 'moveTo'](x, y)); hg.stroke();
  const at = (t) => rach[Math.round(t * 20)];
  const leaflets = [[1.0, 0, 62, 34], [0.82, -1, 66, 30], [0.82, 1, 66, 30], [0.6, -1, 74, 33], [0.6, 1, 72, 32], [0.38, -1, 60, 27], [0.38, 1, 62, 27], [0.2, -1, 30, 15], [0.2, 1, 30, 15], [0.5, -1, 22, 11], [0.5, 1, 22, 11]];
  for (const [t, side, len, wid] of leaflets) {
    const [bx, by] = at(t), ang = side === 0 ? -Math.PI / 2 : -Math.PI / 2 + side * (1.05 + r() * 0.25); const cx = bx + Math.cos(ang) * len * 0.62, cy = by + Math.sin(ang) * len * 0.62;
    const p = serr(cx, cy, len * 0.62, wid * 0.62, ang, 9 + Math.round(r() * 3)); const base = new THREE.Color('#3b6626').offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.1, (r() - 0.5) * 0.05);
    const gr = g.createRadialGradient(cx, cy, 2, cx, cy, len * 0.7); gr.addColorStop(0, base.clone().offsetHSL(0.01, 0, 0.05).getStyle()); gr.addColorStop(1, base.clone().multiplyScalar(0.8).getStyle()); g.fillStyle = gr; g.fill(p);
    g.save(); g.clip(p); for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(${r() < 0.55 ? '20,38,10' : '140,170,80'},${0.05 + r() * 0.07})`; g.beginPath(); g.arc(cx + (r() - 0.5) * len, cy + (r() - 0.5) * len, len * (0.06 + r() * 0.16), 0, TAU); g.fill(); }
    // midrib and paired secondary veins (lighter on top, sunken in the height map)
    const tip = [cx + Math.cos(ang) * len * 0.58, cy + Math.sin(ang) * len * 0.58], st = [bx, by];
    g.strokeStyle = 'rgba(175,205,120,0.45)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(...st); g.lineTo(...tip); g.stroke();
    hg.save(); hg.clip(p); const hgr = hg.createRadialGradient(cx, cy, 1, cx, cy, len * 0.65); hgr.addColorStop(0, '#c8c8c8'); hgr.addColorStop(1, '#787878'); hg.fillStyle = hgr; hg.fillRect(0, 0, S, S);
    hg.strokeStyle = '#555'; hg.lineWidth = 2.2; hg.beginPath(); hg.moveTo(...st); hg.lineTo(...tip); hg.stroke();
    g.lineWidth = 0.9; hg.lineWidth = 1.4;
    for (let k = 1; k <= 5; k++) { const f = k / 6, mx = lerp(st[0], tip[0], f), my = lerp(st[1], tip[1], f); for (const sd of [-1, 1]) { const va = ang + sd * 0.95, vl = wid * 0.5 * (1 - f * 0.55);
      const ex = mx + Math.cos(va) * vl + Math.cos(ang) * vl * 0.45, ey = my + Math.sin(va) * vl + Math.sin(ang) * vl * 0.45;
      g.strokeStyle = 'rgba(160,195,110,0.3)'; g.beginPath(); g.moveTo(mx, my); g.lineTo(ex, ey); g.stroke(); hg.strokeStyle = '#666'; hg.beginPath(); hg.moveTo(mx, my); hg.lineTo(ex, ey); hg.stroke(); } }
    g.restore(); hg.restore();
    g.strokeStyle = 'rgba(15,30,8,0.4)'; g.lineWidth = 1.3; g.stroke(p);
  }
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  const nc = document.createElement('canvas'); nc.width = nc.height = S; nc.getContext('2d').putImageData(heightToNormal(hg.getImageData(0, 0, S, S).data, S, S, 2.6), 0, 0);
  const normalMap = new THREE.CanvasTexture(nc); normalMap.colorSpace = THREE.NoColorSpace;
  return (atlasCache.compound = { map, normalMap });
}

// ------------------------------------------------------------------ a tomato cut across: wall, septa, jelly-filled locules with seeds, pale core
export function tomatoFlesh(o = {}) {
  const key = 'flesh' + (o.locules || 5); if (atlasCache[key]) return atlasCache[key];
  const S = 512, c = S / 2, R = S / 2 - 2, r = prng(29), nL = o.locules || 5;
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const hv = document.createElement('canvas'); hv.width = hv.height = S; const hg = hv.getContext('2d'); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  // wall: deep red, slightly darker towards the skin, with fine radial fibres
  const wall = g.createRadialGradient(c, c, R * 0.55, c, c, R); wall.addColorStop(0, '#d83a22'); wall.addColorStop(0.85, '#c42a19'); wall.addColorStop(0.97, '#a81d12'); wall.addColorStop(1, '#7a140c');
  g.fillStyle = wall; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
  for (let i = 0; i < 900; i++) { const a = r() * TAU, d = R * (0.6 + r() * 0.38); g.strokeStyle = `rgba(${r() < 0.5 ? '255,120,90' : '120,20,10'},0.08)`; g.lineWidth = 1; g.beginPath(); g.moveTo(c + Math.cos(a) * d, c + Math.sin(a) * d); g.lineTo(c + Math.cos(a) * (d + 6), c + Math.sin(a) * (d + 6)); g.stroke(); }
  // locules: rounded wedges of translucent jelly between the septa, seeds along their inner side
  for (let k = 0; k < nL; k++) { const a0 = k / nL * TAU + 0.15, a1 = (k + 1) / nL * TAU - 0.15 + 0.15 * 0, am = (a0 + a1) / 2;
    const p = new Path2D(); const rin = R * 0.27, rout = R * 0.74; p.moveTo(c + Math.cos(a0 + 0.08) * rin, c + Math.sin(a0 + 0.08) * rin);
    for (let t = 0; t <= 1.0001; t += 0.05) { const a = lerp(a0 + 0.05, a1 - 0.05, t); const rr = rout * (0.92 + 0.08 * Math.sin(t * Math.PI)); p.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
    p.lineTo(c + Math.cos(a1 - 0.08) * rin, c + Math.sin(a1 - 0.08) * rin); p.closePath();
    const jel = g.createRadialGradient(c + Math.cos(am) * R * 0.5, c + Math.sin(am) * R * 0.5, 4, c + Math.cos(am) * R * 0.5, c + Math.sin(am) * R * 0.5, R * 0.32);
    jel.addColorStop(0, 'rgba(236,150,70,0.97)'); jel.addColorStop(0.7, 'rgba(224,104,52,0.97)'); jel.addColorStop(1, 'rgba(206,70,36,0.97)'); g.fillStyle = jel; g.fill(p);
    hg.fillStyle = '#9a9a9a'; hg.fill(p);
    // seeds: pale teardrops, each in a clear gel sac, clustered near the placenta (inner edge)
    for (let s = 0; s < 22; s++) { const t = r(), a = lerp(a0 + 0.12, a1 - 0.12, t), rr = R * (0.33 + r() * 0.3) * (1 - 0.25 * Math.abs(t - 0.5));
      const x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr, ang = a + (r() - 0.5) * 0.8;
      g.fillStyle = 'rgba(250,200,140,0.35)'; g.beginPath(); g.ellipse(x, y, 9, 6.5, ang, 0, TAU); g.fill();
      g.fillStyle = r() < 0.5 ? '#f3dfa8' : '#ead29a'; g.beginPath(); g.ellipse(x, y, 5.2, 3.4, ang, 0, TAU); g.fill();
      hg.fillStyle = '#d0d0d0'; hg.beginPath(); hg.ellipse(x, y, 5.2, 3.4, ang, 0, TAU); hg.fill(); } }
  // core (columella) and septa: pale pink-white flesh with radial striation
  const core = g.createRadialGradient(c, c, 2, c, c, R * 0.3); core.addColorStop(0, '#f6c9b0'); core.addColorStop(1, '#e8826a'); g.fillStyle = core; g.beginPath(); g.arc(c, c, R * 0.28, 0, TAU); g.fill();
  for (let k = 0; k < nL; k++) { const a = k / nL * TAU + 0.15 - 0.15 + 0; g.strokeStyle = 'rgba(240,150,120,0.55)'; g.lineWidth = 7; g.beginPath(); g.moveTo(c + Math.cos(a) * R * 0.26, c + Math.sin(a) * R * 0.26); g.lineTo(c + Math.cos(a) * R * 0.75, c + Math.sin(a) * R * 0.75); g.stroke(); }
  g.strokeStyle = 'rgba(255,215,190,0.35)'; g.lineWidth = 1.5; for (let i = 0; i < 40; i++) { const a = r() * TAU; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * R * 0.25, c + Math.sin(a) * R * 0.25); g.stroke(); }
  // wet sheen mottling
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,${180 + r() * 60},${150 + r() * 60},${0.04 + r() * 0.05})`; g.beginPath(); g.arc(c + (r() - 0.5) * R * 1.6, c + (r() - 0.5) * R * 1.6, 6 + r() * 26, 0, TAU); g.fill(); }
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const nc = document.createElement('canvas'); nc.width = nc.height = S; nc.getContext('2d').putImageData(heightToNormal(hg.getImageData(0, 0, S, S).data, S, S, 1.6), 0, 0);
  const normalMap = new THREE.CanvasTexture(nc); normalMap.colorSpace = THREE.NoColorSpace;
  return (atlasCache[key] = { map, normalMap });
}

// ------------------------------------------------------------------ kitchen scraps for the organics caddy: onion skins, tomato ends, carrot tops, peel curls
// carrot fronds: a finely divided leaf drawn as threads (a rachis, pinnae, pinnules), on a transparent card
let _frond = null;
function frondTex() {
  if (_frond) return _frond;
  const S = 256, r = prng(53), cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); g.lineCap = 'round';
  const seg = (x, y, a, len, w, depth) => { const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.strokeStyle = `rgb(${58 + r() * 22},${100 + r() * 32},${36 + r() * 16})`; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    if (depth > 0) for (let k = 1; k <= 4; k++) { const f = k / 5, px = x + (x2 - x) * f, py = y + (y2 - y) * f; for (const sd of [-1, 1]) seg(px, py, a + sd * (0.65 + r() * 0.35), len * (0.44 - f * 0.2), Math.max(0.9, w * 0.62), depth - 1); } };
  seg(S / 2, S - 4, -Math.PI / 2, S * 0.88, 3.2, 2);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (_frond = t);
}
// onion skin: veins running pole to pole over golden brown, lighter where thin, the edge torn ragged (alpha)
let _onion = null;
function onionSkinTex() {
  if (_onion) return _onion;
  const S = 256, r = prng(61), cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#b97a3a'); gr.addColorStop(0.5, '#dcae6c'); gr.addColorStop(1, '#c48a48'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let k = 0; k < 70; k++) { let x = r() * S; g.strokeStyle = r() < 0.6 ? `rgba(120,70,30,${0.25 + r() * 0.35})` : `rgba(245,215,160,${0.25 + r() * 0.3})`; g.lineWidth = 0.8 + r() * 1.6; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= S; y += 16) { x += (r() - 0.5) * 3; g.lineTo(x, y); } g.stroke(); }
  for (let k = 0; k < 30; k++) { const x = r() * S, y = r() * S, rad = 8 + r() * 24, gg = g.createRadialGradient(x, y, 0, x, y, rad); gg.addColorStop(0, 'rgba(250,225,175,0.35)'); gg.addColorStop(1, 'rgba(250,225,175,0)'); g.fillStyle = gg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  // torn edge: clear a ragged band round the border
  g.globalCompositeOperation = 'destination-in'; g.beginPath(); for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, rr = S * (0.44 + 0.05 * Math.sin(a * 7 + 1) + 0.03 * (r() - 0.5)); const x = S / 2 + Math.cos(a) * rr * 1.08, y = S / 2 + Math.sin(a) * rr * 1.08; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fillStyle = '#fff'; g.fill(); g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (_onion = t);
}
export function scrap(kind, seed = 1) {
  const r = prng(seed), g = new THREE.Group(); const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  if (kind === 'onion') {   // a curled papery shell: veined, translucent, torn at the edge, crinkled
    const geo = new THREE.SphereGeometry(0.028 + r() * 0.01, 22, 14, 0, 1.6 + r() * 1.2, 0.3, 1.4 + r() * 0.5); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + (r() - 0.5) * 0.05 + 0.03 * Math.sin(p.getY(i) * 400 + i * 0.7); p.setXYZ(i, p.getX(i) * k, p.getY(i) * 0.75 * k, p.getZ(i) * k); }
    geo.computeVertexNormals();
    add(geo, translucent(new THREE.MeshStandardMaterial({ map: onionSkinTex(), alphaTest: 0.5, roughness: 0.62, side: THREE.DoubleSide }), '#f0c070', 0.6));
  } else if (kind === 'tomato') {   // a cut end: a skin cap with the flesh showing
    const R = 0.022 + r() * 0.008, cap = new THREE.SphereGeometry(R, 20, 10, 0, TAU, 0, Math.PI * 0.32); const n = cap.attributes.position.count; cap.setAttribute('color', new THREE.Float32BufferAttribute(new Array(n).fill(0).flatMap(() => [0.78, 0.17, 0.1]), 3));
    add(cap, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.15 }));
    const TF = tomatoFlesh(); const face = add(new THREE.CircleGeometry(R * Math.sin(Math.PI * 0.32), 28), new THREE.MeshPhysicalMaterial({ map: TF.map, normalMap: TF.normalMap, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }));
    face.rotation.x = Math.PI / 2; face.position.y = R * Math.cos(Math.PI * 0.32) - 0.0005;
  } else if (kind === 'carrot') {   // the cut crown of a carrot: a tuft of thin stalks leaning one way, arching and wilting, fronds along their upper part
    add(new THREE.CylinderGeometry(0.011, 0.014, 0.024, 16), new THREE.MeshStandardMaterial({ color: '#d9661c', roughness: 0.55 })).position.y = 0.012;
    const cut = add(new THREE.CircleGeometry(0.0138, 18), new THREE.MeshStandardMaterial({ color: '#efa25e', roughness: 0.7 })); cut.rotation.x = Math.PI / 2; cut.position.y = -0.0002;   // the cut face, lighter core
    const fm = translucent(new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6 }), '#c8e07a', 0.5), sm = new THREE.MeshStandardMaterial({ color: '#6a9438', roughness: 0.55 });
    const lean = V((r() - 0.5) * 0.7, 1, (r() - 0.5) * 0.7).normalize(), up = V(0, 1, 0);
    for (let k = 0; k < 8; k++) { const a = r() * TAU, dir = lean.clone().applyAxisAngle(V(Math.cos(a), 0, Math.sin(a)), 0.12 + r() * 0.3), L = 0.08 + r() * 0.06, droop = 0.3 + r() * 0.7;
      const p0 = V(0, 0.024, 0), p1 = p0.clone().addScaledVector(dir, L * 0.55), p2 = p1.clone().addScaledVector(dir, L * 0.45).add(V(0, -droop * L * 0.5, 0)), curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      add(new THREE.TubeGeometry(curve, 10, 0.001, 5, false), sm);
      for (let j = 0; j < 4; j++) { const u = 0.38 + j * 0.18, P = curve.getPoint(u), T = curve.getTangent(u), side = new THREE.Vector3().crossVectors(T, up).normalize(); if (side.lengthSq() < 0.5) side.set(1, 0, 0);
        const Y = T.clone().multiplyScalar(0.55).addScaledVector(side, (j % 2 ? 1 : -1) * 0.85).normalize(), Z = up.clone().sub(Y.clone().multiplyScalar(up.dot(Y))).normalize(), X = new THREE.Vector3().crossVectors(Y, Z);
        const pg = new THREE.PlaneGeometry(0.026, 0.036); pg.translate(0, 0.017, 0); const f = add(pg, fm); f.position.copy(P); f.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); f.rotateY((r() - 0.5) * 0.8); } }
  } else {   // a curl of peel
    const col = kind === 'potato' ? '#b58a5a' : '#d97a2a', pts = []; const turns = 1.2 + r(), L = 0.08 + r() * 0.05;
    for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(V(Math.cos(t * turns * TAU) * 0.018, t * 0.012, Math.sin(t * turns * TAU) * 0.018 + t * L * 0.3)); }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.006, 6, false); tube.scale(1, 0.35, 1);
    add(tube, new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }));
  }
  return g;
}

// ------------------------------------------------------------------ a bean's trifoliate leaf: three ovate, pointed leaflets on a petiole
export function beanLeaf() {
  if (atlasCache.bean) return atlasCache.bean;
  const S = 512, r = prng(31); const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const hv = document.createElement('canvas'); hv.width = hv.height = S; const hg = hv.getContext('2d'); hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S);
  const base = [S / 2, S - 8], fork = [S / 2 + 6, S * 0.58];
  for (const ctx of [g, hg]) { ctx.strokeStyle = ctx === g ? '#557a2c' : '#a0a0a0'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...base); ctx.quadraticCurveTo(S / 2 - 4, S * 0.78, ...fork); ctx.stroke(); }
  const leaflet = (x, y, ang, len, wid) => {   // ovate with a drawn-out tip and a rounded base
    const c = Math.cos(ang), s = Math.sin(ang), P = (u, v) => [x + u * c - v * s, y + u * s + v * c], p = new Path2D();
    p.moveTo(...P(0, 0)); p.bezierCurveTo(...P(len * 0.02, wid * 0.55), ...P(len * 0.45, wid * 0.62), ...P(len * 0.72, wid * 0.3)); p.quadraticCurveTo(...P(len * 0.88, wid * 0.08), ...P(len, 0));
    p.quadraticCurveTo(...P(len * 0.88, -wid * 0.08), ...P(len * 0.72, -wid * 0.3)); p.bezierCurveTo(...P(len * 0.45, -wid * 0.62), ...P(len * 0.02, -wid * 0.55), ...P(0, 0));
    const col = new THREE.Color('#3f6d28').offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * 0.04);
    const gr = g.createLinearGradient(...P(0, 0), ...P(len, 0)); gr.addColorStop(0, col.clone().multiplyScalar(0.85).getStyle()); gr.addColorStop(1, col.clone().offsetHSL(0.01, 0, 0.05).getStyle()); g.fillStyle = gr; g.fill(p);
    g.save(); g.clip(p); for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,40,12' : '150,185,95'},${0.04 + r() * 0.06})`; const [cx, cy] = P(len * r(), wid * (r() - 0.5)); g.beginPath(); g.arc(cx, cy, len * (0.05 + r() * 0.12), 0, TAU); g.fill(); }
    hg.save(); hg.clip(p); const hgr = hg.createRadialGradient(...P(len * 0.45, 0), 2, ...P(len * 0.45, 0), len * 0.6); hgr.addColorStop(0, '#c8c8c8'); hgr.addColorStop(1, '#787878'); hg.fillStyle = hgr; hg.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(170,200,120,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(...P(0, 0)); g.lineTo(...P(len * 0.95, 0)); g.stroke(); hg.strokeStyle = '#555'; hg.lineWidth = 2.5; hg.beginPath(); hg.moveTo(...P(0, 0)); hg.lineTo(...P(len * 0.95, 0)); hg.stroke();
    for (let k = 1; k <= 6; k++) { const f = k / 7.5; for (const sd of [-1, 1]) { const [ax, ay] = P(len * f, 0), [bx, by] = P(len * (f + 0.16), sd * wid * 0.42 * (1 - f * 0.6));
      g.strokeStyle = 'rgba(160,195,110,0.32)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(...P(len * (f + 0.05), sd * wid * 0.25), bx, by); g.stroke();
      hg.strokeStyle = '#666'; hg.lineWidth = 1.6; hg.beginPath(); hg.moveTo(ax, ay); hg.quadraticCurveTo(...P(len * (f + 0.05), sd * wid * 0.25), bx, by); hg.stroke(); } }
    g.restore(); hg.restore(); g.strokeStyle = 'rgba(15,30,8,0.4)'; g.lineWidth = 1.2; g.stroke(p); };
  leaflet(fork[0], fork[1] - 4, -Math.PI / 2 + (r() - 0.5) * 0.15, S * 0.52, S * 0.36);
  leaflet(fork[0] - 4, fork[1] + 2, Math.PI + 0.35, S * 0.4, S * 0.3);
  leaflet(fork[0] + 6, fork[1] + 2, -0.35, S * 0.4, S * 0.3);
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  const nc = document.createElement('canvas'); nc.width = nc.height = S; nc.getContext('2d').putImageData(heightToNormal(hg.getImageData(0, 0, S, S).data, S, S, 2.4), 0, 0);
  const normalMap = new THREE.CanvasTexture(nc); normalMap.colorSpace = THREE.NoColorSpace;
  return (atlasCache.bean = { map, normalMap });
}
