// GOOD FOOD. NO DEAD ENDS. — the hero tomato: one misshapen heirloom (ribbed and cat-faced, green-gold shoulders,
// healed growth cracks round the stem) built once and shared by every shot it appears in: whole in Noor's and Asha's
// hands (s01), cut in half at the counter (s08) and as a chunk on Noor's fork (s10). "This one's ugly." has to be true.
import { THREE, V, clamp, lerp, smooth, noise2, fbm, prng } from './core.js';
import { heightToNormal } from './foliage.js';
const TAU = Math.PI * 2;
export const HERO_R = 0.05;
const SQUASH = 0.7;

// ------------------------------------------------------------------ shape
// radius (units of R) at polar angle th (0 = stem end) and azimuth ph. Seven uneven creases run from the shoulder
// towards the middle, one side bulges (cat-facing), the stem sits in a dished cavity, the blossom end is flattened.
const CREASES = (() => { const r = prng(41), n = 7; return Array.from({ length: n }, (_, j) => ({ ph: (j + (r() - 0.5) * 0.55) / n * TAU, depth: 0.05 + r() * 0.09, w: 0.15 + r() * 0.12, reach: 1.6 + r() * 0.7 })); })();
const angDist = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const along = (th, k) => smooth((th - 0.15) / 0.35) * (1 - smooth((th - k.reach) / 0.6));
export function creaseAt(th, ph) { let c = 0; for (const k of CREASES) c = Math.max(c, (k.depth / 0.14) * Math.exp(-((angDist(ph, k.ph) / k.w) ** 2)) * along(th, k)); return c; }
export function heroRadius(th, ph) {
  let r = 1;
  for (const k of CREASES) r -= k.depth * Math.exp(-((angDist(ph, k.ph) / k.w) ** 2)) * along(th, k);
  r += 0.12 * Math.exp(-((angDist(ph, 1.1) / 0.9) ** 2)) * Math.sin(th) ** 1.5;        // the cat-faced bulge
  r += 0.05 * Math.exp(-((angDist(ph, 3.9) / 0.7) ** 2)) * Math.sin(th);               // a smaller one opposite
  r += (fbm(Math.cos(ph) * 2.2 + 3.1, Math.sin(ph) * 2.2 + th * 1.3, 3) - 0.5) * 0.05;    // lumpy
  if (th < 0.42) r *= 1 - 0.32 * (1 - th / 0.42) ** 2;                                 // dished stem cavity
  if (th > 2.75) r *= 1 - 0.06 * smooth((th - 2.75) / 0.39);                           // flattened blossom end
  return r;
}
export function heroPoint(th, ph, R = HERO_R, grow = 1) { const r = heroRadius(th, ph) * R * grow; return V(Math.sin(th) * Math.cos(ph) * r, Math.cos(th) * r * SQUASH, Math.sin(th) * Math.sin(ph) * r); }
const surfN = (th, ph, R) => { const e = 2e-3; const a = heroPoint(clamp(th + e, 0, Math.PI), ph, R).sub(heroPoint(clamp(th - e, 0, Math.PI), ph, R)), b = heroPoint(th, ph + e, R).sub(heroPoint(th, ph - e, R));
  const n = new THREE.Vector3().crossVectors(b, a); if (n.lengthSq() < 1e-28) return V(0, Math.cos(th) >= 0 ? 1 : -1, 0); n.normalize(); if (n.dot(heroPoint(th, ph, R)) < 0) n.negate(); return n; };   // (only the poles are degenerate)

// skin patch over th0..th1 x ph0..ph1 (uv = the skin texture's equirectangular layout), outward-facing
function skinGeo(th0, th1, ph0, ph1, nT, nP, R) {
  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= nT; i++) { const th = lerp(th0, th1, i / nT); for (let j = 0; j <= nP; j++) { const ph = lerp(ph0, ph1, j / nP), p = heroPoint(th, ph, R), n = surfN(th, ph, R);
    pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uv.push(ph / TAU, 1 - th / Math.PI); } }   // u unwrapped: the maps repeat in u
  for (let i = 0; i < nT; i++) for (let j = 0; j < nP; j++) { const a = i * (nP + 1) + j, b = a + nP + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  fixWinding(g); return g;
}
// make triangles face along their vertex normals
function fixWinding(g) { const p = g.attributes.position, n = g.attributes.normal, ix = g.index.array; const a = V(), b = V(), c = V(), nn = V();
  for (let f = 0; f < ix.length; f += 3) { a.fromBufferAttribute(p, ix[f]); b.fromBufferAttribute(p, ix[f + 1]); c.fromBufferAttribute(p, ix[f + 2]); const fn = b.sub(a).cross(c.sub(a)); if (fn.lengthSq() < 1e-16) continue;
    nn.fromBufferAttribute(n, ix[f]); if (fn.dot(nn) < 0) { const t = ix[f + 1]; ix[f + 1] = ix[f + 2]; ix[f + 2] = t; } } }

// ------------------------------------------------------------------ skin maps (equirectangular: u = ph, v = th)
let _skin = null;
function skinMaps() {
  if (_skin) return _skin;
  const W = 1536, H = 768, r = prng(77);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const hv = document.createElement('canvas'); hv.width = W; hv.height = H; const hg = hv.getContext('2d');
  const rv = document.createElement('canvas'); rv.width = W; rv.height = H; const rg = rv.getContext('2d');
  const img = g.createImageData(W, H), d = img.data, him = hg.createImageData(W, H), hd = him.data, rim = rg.createImageData(W, H), rd = rim.data;
  const red = [196, 40, 24], deep = [140, 18, 14], orange = [214, 104, 36], gold = [176, 150, 58];
  for (let y = 0; y < H; y++) { const th = (y + 0.5) / H * Math.PI;
    const shoulder = smooth((1.0 - th) / 0.6), greenSh = smooth((0.6 - th) / 0.32), blossom = smooth((th - 3.0) / 0.1);
    for (let x = 0; x < W; x++) { const ph = (x + 0.5) / W * TAU, cx = Math.cos(ph), sx = Math.sin(ph);
      const cr = creaseAt(th, ph), mott = fbm(cx * 3.5 + 7.1, sx * 3.5 + th * 2.4, 4), fine = noise2(cx * 40 + sx * 3, sx * 40 + th * 25);
      const k = 0.9 + 0.2 * mott + 0.04 * (fine - 0.5), i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) { let v = lerp(red[c], orange[c], shoulder * 0.62); v = lerp(v, gold[c], greenSh * 0.6); v = lerp(v, deep[c], Math.min(1, cr) * 0.55); v = lerp(v, [150, 110, 60][c], blossom * 0.6); d[i + c] = clamp(v * k, 0, 255); }
      d[i + 3] = 255;
      const hgt = 128 + (fine - 0.5) * 18 + (mott - 0.5) * 20; hd[i] = hd[i + 1] = hd[i + 2] = clamp(hgt, 0, 255); hd[i + 3] = 255;
      rd[i] = 0; rd[i + 1] = clamp(78 + (1 - mott) * 26 + cr * -10, 0, 255); rd[i + 2] = 0; rd[i + 3] = 255; } }
  g.putImageData(img, 0, 0); hg.putImageData(him, 0, 0); rg.putImageData(rim, 0, 0);
  // fine pale speckles (lenticels) and a few darker pin marks
  for (let n = 0; n < 1700; n++) { const x = r() * W, y = H * (0.12 + r() * 0.8), s = 0.45 + r() * 0.8, pale = r() < 0.8;
    g.fillStyle = pale ? `rgba(255,205,150,${0.1 + r() * 0.22})` : `rgba(90,20,10,${0.12 + r() * 0.16})`; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
  // healed growth cracks: concentric arcs round the stem (constant th = horizontal runs) and a few radial ones
  const crack = (pts, w) => { for (const [ctx, style, lw] of [[g, 'rgba(214,150,92,0.55)', w * 4.2], [g, 'rgba(168,118,66,0.95)', w * 2.6], [g, 'rgba(96,60,30,0.9)', w * 0.9], [hg, 'rgb(150,150,150)', w * 4.0], [hg, 'rgb(50,50,50)', w * 1.6], [rg, 'rgb(0,225,0)', w * 3.2]]) {
    ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (const shift of [-W, 0, W]) { ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x + shift, y) : ctx.moveTo(x + shift, y))); ctx.stroke(); } } };
  for (const [th, a0, len] of [[0.27, 0.4, 1.7], [0.31, 2.6, 2.1], [0.36, 4.7, 1.2], [0.33, 5.6, 1.4], [0.42, 1.2, 0.9], [0.47, 3.4, 0.8]]) {
    const pts = []; for (let k = 0; k <= 60; k++) { const ph = a0 + len * k / 60; pts.push([ph / TAU * W, (th + (noise2(ph * 5, th * 9) - 0.5) * 0.06 + (noise2(ph * 23, th * 4) - 0.5) * 0.015) / Math.PI * H]); } crack(pts, 1.8 + r() * 1.0); }
  for (const [ph, t1] of [[0.9, 0.62], [3.0, 0.55], [4.4, 0.7]]) { const pts = []; for (let k = 0; k <= 20; k++) { const th = lerp(0.2, t1, k / 20); pts.push([(ph + (noise2(th * 9, ph) - 0.5) * 0.06) / TAU * W, th / Math.PI * H]); } crack(pts, 1.4); }
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const nc = document.createElement('canvas'); nc.width = W; nc.height = H; nc.getContext('2d').putImageData(heightToNormal(hg.getImageData(0, 0, W, H).data, W, H, 1.6), 0, 0);
  return (_skin = { map: tex(cv, true), normalMap: tex(nc, false), roughnessMap: tex(rv, false) });
}
// glossy skin over a softly scattering flesh (light wraps past the terminator, reddened)
function scatter(m, tint = [0.9, 0.28, 0.16], wrap = 0.5) {
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
    `float wrapW = saturate( ( dot( geometryNormal, directLight.direction ) + ${wrap.toFixed(2)} ) / ${(1 + wrap).toFixed(2)} );
     vec3 scatter = ( vec3( dotNL ) + vec3( ${tint.map(x => x.toFixed(2)).join(', ')} ) * max( wrapW - dotNL, 0.0 ) ) * directLight.color;
     reflectedLight.directDiffuse += scatter * BRDF_Lambert( material.diffuseColor );`)); };
  m.customProgramCacheKey = () => 'hero-scatter-' + tint.join(',') + '|' + wrap; return m;
}
let _skinMat = null;
export function heroSkinMat() {
  if (_skinMat) return _skinMat; const M = skinMaps();
  return (_skinMat = scatter(new THREE.MeshPhysicalMaterial({ map: M.map, normalMap: M.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughnessMap: M.roughnessMap, roughness: 1,
    clearcoat: 0.55, clearcoatRoughness: 0.14, specularIntensity: 0.6, envMapIntensity: 0.9 })));
}

// ------------------------------------------------------------------ calyx and stem
let _calyxMat = null;
function calyxMat() { return _calyxMat || (_calyxMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.72, sheen: 0.8, sheenRoughness: 0.55, sheenColor: new THREE.Color('#b8d890'), side: THREE.DoubleSide, envMapIntensity: 0.6 })); }
function calyxGeo(R, phKeep = null) {
  const r = prng(55), pos = [], nor = [], col = [], idx = []; const dark = new THREE.Color('#2f5a1c'), tip = new THREE.Color('#7a9a3a');
  const push = (p, n, c) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
  for (let k = 0; k < 6; k++) {
    const ph0 = k / 6 * TAU + (r() - 0.5) * 0.5; if (phKeep && !phKeep(ph0)) continue;
    const L = 0.62 + r() * 0.3, W0 = R * (0.1 + r() * 0.03), twist = (r() - 0.5) * 0.5, curl = 0.5 + r() * 0.5, segs = 14; const base = pos.length / 3;
    for (let s = 0; s <= segs; s++) { const f = s / segs, th = 0.03 + f * L, ph = ph0 + twist * f * f; const lift = R * (0.012 + 0.22 * curl * f ** 3);
      const n = surfN(th, ph, R), c = heroPoint(th, ph, R).add(n.clone().multiplyScalar(lift)); const side = heroPoint(th, ph + 0.02, R).sub(heroPoint(th, ph - 0.02, R)).normalize();
      const w = W0 * Math.pow(1 - f, 0.75) * (0.6 + 0.4 * Math.min(1, f * 6)); const cc = dark.clone().lerp(tip, f * f);
      push(c.clone().add(n.clone().multiplyScalar(R * 0.006)), n, cc); push(c.clone().add(side.clone().multiplyScalar(w)), n, cc.clone().multiplyScalar(0.9)); push(c.clone().sub(side.clone().multiplyScalar(w)), n, cc.clone().multiplyScalar(0.9)); }
    for (let s = 0; s < segs; s++) { const a = base + s * 3, b = a + 3; idx.push(a, a + 1, b, a + 1, b + 1, b, a, b, a + 2, a + 2, b, b + 2); }
  }
  // stem: short bent stalk with the knuckle where it broke from the truss, and a cut end
  if (!phKeep) { const top = heroPoint(0, 0, R); const segs = 10, rad = R * 0.075, ring = 10; const base = pos.length / 3;
    for (let s = 0; s <= segs; s++) { const f = s / segs; const c = top.clone().add(V(R * 0.06 * f * f, R * 0.42 * f, R * 0.02 * f)); const rr = rad * (1 + 0.25 * Math.exp(-((f - 0.45) ** 2) / 0.01)) * (1 - 0.1 * f);
      for (let j = 0; j < ring; j++) { const a = j / ring * TAU, n = V(Math.cos(a), 0, Math.sin(a)); push(c.clone().add(n.clone().multiplyScalar(rr)), n, dark.clone().lerp(tip, 0.25 + 0.2 * f)); } }
    for (let s = 0; s < segs; s++) for (let j = 0; j < ring; j++) { const a = base + s * ring + j, b = base + s * ring + (j + 1) % ring; idx.push(a, b, a + ring, b, b + ring, a + ring); }
    const cap = push(top.clone().add(V(R * 0.06, R * 0.42, R * 0.02)), V(0, 1, 0), new THREE.Color('#a8b870')); for (let j = 0; j < ring; j++) idx.push(cap, base + segs * ring + (j + 1) % ring, base + segs * ring + j); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}

// ------------------------------------------------------------------ whole
export function heroTomato(o = {}) {
  const R = o.r || HERO_R, g = new THREE.Group(); g.name = 'hero-tomato';
  const body = new THREE.Mesh(skinGeo(0, Math.PI, 0, TAU, 96, 192, R), heroSkinMat()); body.castShadow = body.receiveShadow = true; g.add(body);
  const cal = new THREE.Mesh(calyxGeo(R), calyxMat()); cal.castShadow = true; g.add(cal);
  g.userData = { R, bottom: heroPoint(Math.PI, 0, R).y, top: heroPoint(0, 0, R).y }; return g;
}

// ------------------------------------------------------------------ cut faces (meridian plane through the stem)
// outline of the cut in the plane containing the stem axis and direction ph: [s (signed distance from the axis), y]
function meridian(ph, R, n = 96) { const out = []; for (let i = 0; i <= n; i++) { const th = i / n * Math.PI, p = heroPoint(th, ph, R); out.push([Math.hypot(p.x, p.z), p.y]); }
  for (let i = n - 1; i > 0; i--) { const th = i / n * Math.PI, p = heroPoint(th, ph + Math.PI, R); out.push([-Math.hypot(p.x, p.z), p.y]); } return out; }
// painted flesh of a cut through the stem: wall, pale core with the stem scar, locules of jelly with seeds, septa
const _faces = {};
function cutFaceTex(ph, R) {
  const key = ph.toFixed(3); if (_faces[key]) return _faces[key];
  const S = 1024, E = R * 1.25, r = prng(91 + Math.round(ph * 100)), out = meridian(ph, R); const X = (s) => (s / E * 0.5 + 0.5) * S, Y = (y) => (0.5 - y / E * 0.5) * S;
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); const rv = document.createElement('canvas'); rv.width = rv.height = S; const rg = rv.getContext('2d');
  const poly = (scale, dy = 0) => { const p = new Path2D(); out.forEach(([s, y], i) => { const xx = X(s * scale), yy = Y(y * scale + dy); i ? p.lineTo(xx, yy) : p.moveTo(xx, yy); }); p.closePath(); return p; };
  g.fillStyle = '#7a1a10'; g.fillRect(0, 0, S, S); rg.fillStyle = 'rgb(0,120,0)'; rg.fillRect(0, 0, S, S);
  const outer = poly(1); const wall = g.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.42); wall.addColorStop(0, '#de4a2c'); wall.addColorStop(0.8, '#cc321e'); wall.addColorStop(1, '#a82316');
  g.fillStyle = wall; g.fill(outer); g.save(); g.clip(outer);
  // vascular dots in the wall
  for (let i = 0; i < 260; i++) { const t = r(), k = Math.floor(t * (out.length - 1)), [s, y] = out[k], f = 0.86 + r() * 0.08; g.fillStyle = `rgba(250,190,150,${0.2 + r() * 0.3})`; g.beginPath(); g.arc(X(s * f), Y(y * f), 1.2 + r() * 1.6, 0, TAU); g.fill(); }
  // locules: two or three per side, stacked between the wall and the core
  const top = heroPoint(0, ph, R).y, bot = heroPoint(Math.PI, ph, R).y;
  for (const side of [-1, 1]) { const n = 2 + (r() < 0.6 ? 1 : 0); const yA = top - R * 0.12, yB = bot + R * 0.1;
    for (let k = 0; k < n; k++) { const y0 = lerp(yA, yB, k / n) - R * 0.03, y1 = lerp(yA, yB, (k + 1) / n) + R * 0.03, ym = (y0 + y1) / 2;
      const sIn = R * 0.16, sOut = side * 0; let sMax = 0; for (const [s, y] of out) if (Math.sign(s) === side && Math.abs(y - ym) < R * 0.06) sMax = Math.max(sMax, Math.abs(s)); sMax = sMax * 0.8 || R * 0.7;
      const p = new Path2D(); const steps = 30; for (let i = 0; i <= steps; i++) { const a = i / steps * TAU; const rx = (sMax - sIn) / 2 * (1 + 0.08 * Math.sin(a * 3 + k)), ry = (y1 - y0) / 2 * 0.86 * (1 + 0.06 * Math.cos(a * 2 + side));
        const cxs = side * (sIn + (sMax - sIn) / 2), xx = X(cxs + Math.cos(a) * rx), yy = Y(ym + Math.sin(a) * ry); i ? p.lineTo(xx, yy) : p.moveTo(xx, yy); } p.closePath();
      const jc = g.createRadialGradient(X(side * (sIn + R * 0.05)), Y(ym), 4, X(side * (sIn + (sMax - sIn) / 2)), Y(ym), S * 0.12); jc.addColorStop(0, 'rgba(244,168,84,0.98)'); jc.addColorStop(0.6, 'rgba(230,112,52,0.98)'); jc.addColorStop(1, 'rgba(206,64,34,0.98)');
      g.fillStyle = jc; g.fill(p); rg.fillStyle = 'rgb(0,40,0)'; rg.fill(p);   // jelly is wet and glossy
      g.save(); g.clip(p); for (let sd = 0; sd < 16; sd++) { const sx = side * (sIn + R * (0.03 + r() * 0.18)), sy = lerp(y0, y1, 0.15 + r() * 0.7), ang = r() * Math.PI;
        g.fillStyle = 'rgba(255,214,160,0.32)'; g.beginPath(); g.ellipse(X(sx), Y(sy), 11, 8, ang, 0, TAU); g.fill(); g.fillStyle = r() < 0.5 ? '#f1dca2' : '#e6cf92'; g.beginPath(); g.ellipse(X(sx), Y(sy), 6.2, 4, ang, 0, TAU); g.fill(); } g.restore();
      g.strokeStyle = 'rgba(214,70,44,0.9)'; g.lineWidth = 9; g.stroke(p); } }
  // core (columella) with the white stem scar cone at the top
  const core = new Path2D(); core.ellipse(X(0), Y((top + bot) / 2 + R * 0.04), S * 0.055, (Y(bot) - Y(top)) * 0.36, 0, 0, TAU); const cg = g.createLinearGradient(X(-R * 0.15), 0, X(R * 0.15), 0); cg.addColorStop(0, '#e98a6c'); cg.addColorStop(0.5, '#f6cdb4'); cg.addColorStop(1, '#e98a6c'); g.fillStyle = cg; g.fill(core);
  g.fillStyle = 'rgba(246,236,214,0.95)'; g.beginPath(); g.moveTo(X(-R * 0.09), Y(top + R * 0.01)); g.quadraticCurveTo(X(0), Y(top - R * 0.38), X(R * 0.09), Y(top + R * 0.01)); g.closePath(); g.fill();
  for (let i = 0; i < 90; i++) { const yy = lerp(top - R * 0.1, bot + R * 0.15, r()), ss = (r() - 0.5) * R * 0.18; g.strokeStyle = 'rgba(250,215,190,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(ss), Y(yy)); g.lineTo(X(ss * 1.6), Y(yy - R * 0.04)); g.stroke(); }
  g.restore();
  // skin line: a thin darker rim right at the edge
  g.strokeStyle = 'rgba(120,20,10,0.9)'; g.lineWidth = 4; g.stroke(outer);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; const tr = new THREE.CanvasTexture(rv); tr.colorSpace = THREE.NoColorSpace;
  return (_faces[key] = { map: t, roughnessMap: tr, E, out });
}
function faceMat(ph, R) { const F = cutFaceTex(ph, R); return { mat: scatter(new THREE.MeshPhysicalMaterial({ map: F.map, roughnessMap: F.roughnessMap, roughness: 1, clearcoat: 0.7, clearcoatRoughness: 0.1, specularIntensity: 0.7, envMapIntensity: 0.9 }), [0.95, 0.45, 0.25], 0.6), F }; }
// flat cut face in the meridian plane at azimuth ph (normal = -/+ the plane's normal), fan from the axis
function faceGeo(ph, R, F, normalSign) {
  const nrm = V(-Math.sin(ph), 0, Math.cos(ph)).multiplyScalar(normalSign), ax = V(Math.cos(ph), 0, Math.sin(ph)); const pos = [0, 0, 0], uv = [0.5, 0.5], idx = [];
  for (const [s, y] of F.out) { const p = ax.clone().multiplyScalar(s).add(V(0, y, 0)); pos.push(p.x, p.y, p.z); uv.push(s / F.E * 0.5 + 0.5, 0.5 + y / F.E * 0.5); }
  const n = F.out.length; for (let i = 1; i <= n; i++) idx.push(0, i, i % n + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(n + 1).fill(0).flatMap(() => [nrm.x, nrm.y, nrm.z]), 3)); fixWinding(g); return g;
}

// the tomato cut in half through the stem along azimuth ph: two groups, each pivoting about the cut plane
export function heroHalves(o = {}) {
  const R = o.r || HERO_R, ph = o.ph ?? 0.35; const { mat, F } = faceMat(ph, R); const halves = [];
  for (const k of [0, 1]) { const g = new THREE.Group(); const p0 = ph + k * Math.PI, p1 = p0 + Math.PI;
    const skin = new THREE.Mesh(skinGeo(0, Math.PI, p0, p1, 96, 96, R), heroSkinMat()); skin.castShadow = skin.receiveShadow = true; g.add(skin);
    const face = new THREE.Mesh(faceGeo(ph, R, F, k ? 1 : -1), mat); face.receiveShadow = true; g.add(face);
    const cal = new THREE.Mesh(calyxGeo(R, (a) => { const d = ((a - p0) % TAU + TAU) % TAU; return d > 0.15 && d < Math.PI - 0.15; }), calyxMat()); g.add(cal);
    g.userData = { R, normal: V(-Math.sin(ph), 0, Math.cos(ph)).multiplyScalar(k ? 1 : -1) }; halves.push(g); }
  return halves;
}

// a bite-sized chunk cut from the side of the same tomato: skin outside, flesh on the four cut faces
export function heroChunk(o = {}) {
  const R = o.r || HERO_R, ph0 = o.ph ?? 1.1, dph = o.dph ?? 0.62, th0 = o.th0 ?? 1.05, th1 = o.th1 ?? 1.8, inner = o.inner ?? 0.55; const g = new THREE.Group();
  const skin = new THREE.Mesh(skinGeo(th0, th1, ph0, ph0 + dph, 18, 18, R), heroSkinMat()); skin.castShadow = true; g.add(skin);
  // flesh faces: four ruled strips from the skin edge to a smaller inner copy (scaled towards the centre)
  const { mat } = faceMat(0.35, R); const pos = [], uv = [], idx = []; const P = (th, ph, k) => heroPoint(th, ph, R, k);
  const edge = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
  const rims = [edge(12, (u) => [th0, lerp(ph0, ph0 + dph, u)]), edge(12, (u) => [lerp(th0, th1, u), ph0 + dph]), edge(12, (u) => [th1, lerp(ph0 + dph, ph0, u)]), edge(12, (u) => [lerp(th1, th0, u), ph0])];
  for (const rim of rims) { const b = pos.length / 3; rim.forEach(([th, ph], i) => { for (const k of [1, inner]) { const p = P(th, ph, k); pos.push(p.x, p.y, p.z); uv.push(0.5 + 0.38 * (k - inner) / (1 - inner) * Math.cos(i * 0.3), 0.35 + 0.3 * i / rim.length); } });
    for (let i = 0; i < rim.length - 1; i++) { const a = b + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  { const b = pos.length / 3; for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) { const p = P(lerp(th0, th1, i / 12), lerp(ph0, ph0 + dph, j / 12), inner); pos.push(p.x, p.y, p.z); uv.push(0.45 + 0.1 * j / 12, 0.4 + 0.1 * i / 12); }
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) { const a = b + i * 13 + j; idx.push(a, a + 13, a + 1, a + 1, a + 13, a + 14); } }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx); fg.computeVertexNormals();
  const flesh = new THREE.Mesh(fg, mat.clone()); flesh.material.side = THREE.DoubleSide; g.add(flesh);
  const c = heroPoint((th0 + th1) / 2, ph0 + dph / 2, R, (1 + inner) / 2); g.children.forEach(m => m.position.sub(c)); g.userData = { R, outward: c.clone().normalize() }; return g;
}
export const heroMaps = () => skinMaps();
