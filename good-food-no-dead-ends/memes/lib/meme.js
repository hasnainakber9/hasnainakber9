// Shared kit for the meme panels: the film's three.js toolkit plus render layers for compositing by hand.
// A panel is rendered as separate layers, the way a Photoshop composite is built from separate plates:
//   ?layer=bg          everything not tagged as a foreground subject (the plate)
//   ?layer=fg:<name>   only that subject, over black, lit by its own lights (fog, depth of field, grain off)
//   ?layer=mask:<name> that subject flat white over black (its matte; transparent parts keep their opacity)
//   ?layer=full        everything (look checks)
import * as K from '../../film/lib/core.js';
const { THREE, V } = K;
export const QP = new URLSearchParams(location.search);
export const LAYER = QP.get('layer') || 'full';

// objects: userData.layer = 'fg:<name>' marks a subject (default: part of the plate)
// lights: userData.only = 'bg' | 'fg:<name>' limits a light to that layer (default: every layer)
export function subject(obj, name) { obj.traverse(o => { o.userData.layer = 'fg:' + name; }); return obj; }
export function lightFor(light, layer) { light.userData.only = layer; if (light.target) light.target.userData.only = layer; return light; }

// call once the scene is complete
export function applyLayer(app) {
  const S = app.scene, mode = LAYER;
  if (mode === 'full') return;
  const fgName = mode.includes(':') ? 'fg:' + mode.split(':')[1] : null, isBg = mode === 'bg';
  const inLayer = (o) => { const l = o.userData.layer || 'bg'; return isBg ? l === 'bg' : l === fgName; };
  // userData.occluder: a plate object (the sea) kept in a subject's layer as depth only, so it still cuts the subject
  const occ = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
  S.traverse(o => {
    if (o.isLight) { const only = o.userData.only; if (only && only !== (isBg ? 'bg' : fgName)) o.visible = false; return; }
    if ((o.isMesh || o.isPoints || o.isSprite || o.isLine) && !inLayer(o)) { if (!isBg && o.isMesh && o.userData.occluder) { o.material = occ; o.renderOrder = -1; o.castShadow = false; o.receiveShadow = false; o.userData.layer = fgName; } else o.visible = false; }
  });
  // puppets re-show their meshes on pose? keep them hidden by forcing every frame
  const hidden = []; S.traverse(o => { if ((o.isMesh || o.isPoints || o.isSprite) && !o.visible) hidden.push(o); });
  app.after(() => { for (const o of hidden) o.visible = false; });
  if (isBg) return;
  S.background = new THREE.Color(0x000000); S.fog = null;
  if (app.dof) app.dof.enabled = false;
  app.grade.uniforms.grain.value = 0; app.grade.uniforms.vignette.value = 0;
  if (mode.startsWith('mask:')) {
    // a matte keeps a see-through surface's own opacity (a wing's membrane, a leaf card's cut-out)
    const white = (op, src) => (src && src.map && (src.transparent || src.alphaTest))
      ? new THREE.ShaderMaterial({ uniforms: { map: { value: src.map }, op: { value: op }, cut: { value: src.alphaTest || 0 } }, transparent: true, depthWrite: !src.transparent, side: THREE.DoubleSide,
          vertexShader: '#include <common>\n#include <skinning_pars_vertex>\nvarying vec2 vUv; void main() { vUv = uv;\n#include <skinbase_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\n#include <project_vertex>\n}',
          fragmentShader: 'uniform sampler2D map; uniform float op, cut; varying vec2 vUv; void main() { float a = texture2D(map, vUv).a; if (cut > 0.0) { if (a < cut) discard; a = 1.0; } gl_FragColor = vec4(1.0, 1.0, 1.0, a * op); }' })
      : new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: op < 1, opacity: op, side: THREE.DoubleSide, depthWrite: op >= 1, fog: false, toneMapped: false });
    S.traverse(o => { if (!(o.isMesh || o.isPoints || o.isSprite) || !inLayer(o) || o.material === occ) return; const op = o.userData.maskOpacity ?? 1;
      o.material = Array.isArray(o.material) ? o.material.map(m => white(op, m)) : white(op, o.material); });
    S.environment = null;
    app.renderFrame = (t) => { app.poseAt(t); const r = app.renderer; r.toneMapping = THREE.NoToneMapping; r.setRenderTarget(null); r.setClearColor(0x000000, 1); r.clear(); r.render(S, app.camera); };
  }
}

// a surface from a signed distance function (negative inside): naive surface nets over a grid, each vertex pulled onto the
// surface and given the field's gradient as its normal. b = [x0, y0, z0, x1, y1, z1], h = cell size
export function sdfGeometry(sdf, b, h, o = {}) {
  const nx = Math.ceil((b[3] - b[0]) / h), ny = Math.ceil((b[4] - b[1]) / h), nz = Math.ceil((b[5] - b[2]) / h);
  const sx = nx + 1, sy = ny + 1, F = new Float32Array(sx * sy * (nz + 1)), id = (i, j, k) => i + sx * (j + sy * k);
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[id(i, j, k)] = sdf(b[0] + i * h, b[1] + j * h, b[2] + k * h);
  const vid = new Int32Array(nx * ny * nz).fill(-1), cid = (i, j, k) => i + nx * (j + ny * k), pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const g = (x, y, z) => { const e = h * 0.5; return [sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)]; };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = corners.map(([a, c, d]) => F[id(i + a, j + c, k + d)]); let mask = 0; for (let q = 0; q < 8; q++) if (v[q] < 0) mask |= 1 << q;
    if (mask === 0 || mask === 255) continue;
    let px = 0, py = 0, pz = 0, n = 0;
    for (const [a, c] of edges) { if ((v[a] < 0) === (v[c] < 0)) continue; const t = v[a] / (v[a] - v[c]), A = corners[a], C = corners[c];
      px += A[0] + (C[0] - A[0]) * t; py += A[1] + (C[1] - A[1]) * t; pz += A[2] + (C[2] - A[2]) * t; n++; }
    let x = b[0] + (i + px / n) * h, y = b[1] + (j + py / n) * h, z = b[2] + (k + pz / n) * h;
    for (let it = 0; it < 2; it++) { const d = sdf(x, y, z), gr = g(x, y, z), l = Math.hypot(...gr) / h || 1; x -= d * gr[0] / h / l / l; y -= d * gr[1] / h / l / l; z -= d * gr[2] / h / l / l; }
    vid[cid(i, j, k)] = pos.length / 3; pos.push(x, y, z);
  }
  const idx = [];
  const quad = (a, b2, c, d, flip) => { if (a < 0 || b2 < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b2, a, d, c); else idx.push(a, b2, c, a, c, d); };
  for (let k = 1; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) {   // x edges
    const s0 = F[id(i, j, k)] < 0, s1 = F[id(i + 1, j, k)] < 0; if (s0 === s1) continue;
    quad(vid[cid(i, j - 1, k - 1)], vid[cid(i, j, k - 1)], vid[cid(i, j, k)], vid[cid(i, j - 1, k)], s1); }
  for (let k = 1; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++) {   // y edges
    const s0 = F[id(i, j, k)] < 0, s1 = F[id(i, j + 1, k)] < 0; if (s0 === s1) continue;
    quad(vid[cid(i - 1, j, k - 1)], vid[cid(i - 1, j, k)], vid[cid(i, j, k)], vid[cid(i, j, k - 1)], s1); }
  for (let k = 0; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) {   // z edges
    const s0 = F[id(i, j, k)] < 0, s1 = F[id(i, j, k + 1)] < 0; if (s0 === s1) continue;
    quad(vid[cid(i - 1, j - 1, k)], vid[cid(i, j - 1, k)], vid[cid(i, j, k)], vid[cid(i - 1, j, k)], s1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  const nor = new Float32Array(pos.length); for (let q = 0; q < pos.length; q += 3) { const gr = g(pos[q], pos[q + 1], pos[q + 2]), l = Math.hypot(...gr) || 1; nor[q] = gr[0] / l; nor[q + 1] = gr[1] / l; nor[q + 2] = gr[2] / l; }
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (o.color) { const c = new Float32Array(pos.length); for (let q = 0; q < pos.length; q += 3) { const cc = o.color(pos[q], pos[q + 1], pos[q + 2]); c[q] = cc[0]; c[q + 1] = cc[1]; c[q + 2] = cc[2]; } geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  return geo;
}
// SDF primitives and operators (p = [x, y, z])
export const sd = {
  sphere: (x, y, z, c, r) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r,
  ellipsoid: (x, y, z, c, r) => { const a = (x - c[0]) / r[0], b = (y - c[1]) / r[1], d = (z - c[2]) / r[2], k0 = Math.hypot(a, b, d), k1 = Math.hypot(a / r[0], b / r[1], d / r[2]); return k1 ? k0 * (k0 - 1) / k1 : -Math.min(...r); },
  capsule: (x, y, z, a, b, r0, r1 = r0) => { const pa = [x - a[0], y - a[1], z - a[2]], ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2;
    const t = K.clamp((pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / L, 0, 1); return Math.hypot(pa[0] - ba[0] * t, pa[1] - ba[1] * t, pa[2] - ba[2] * t) - (r0 + (r1 - r0) * t); },
  box: (x, y, z, c, hb, r = 0) => { const q = [Math.abs(x - c[0]) - hb[0] + r, Math.abs(y - c[1]) - hb[1] + r, Math.abs(z - c[2]) - hb[2] + r]; return Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)) + Math.min(Math.max(q[0], q[1], q[2]), 0) - r; },
  smin: (a, b, k) => { const h = K.clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); },
  smax: (a, b, k) => -sd.smin(-a, -b, k),
};
// a tube along points with a radius per point (rings of seg vertices), capped
export function taperTube(points, radii, seg = 10, o = {}) {
  const curve = new THREE.CatmullRomCurve3(points), N = o.n || Math.max(8, points.length * 6), fr = curve.computeFrenetFrames(N, false), pos = [], idx = [], uv = [];
  const rAt = (u) => { const f = u * (radii.length - 1), i = Math.min(radii.length - 2, Math.floor(f)); return K.lerp(radii[i], radii[i + 1], f - i); };
  for (let i = 0; i <= N; i++) { const u = i / N, p = curve.getPointAt(u), r = rAt(u), n = fr.normals[i], bn = fr.binormals[i];
    for (let j = 0; j < seg; j++) { const a = j / seg * Math.PI * 2, s = o.flat ? (1 + (o.flat - 1) * Math.abs(Math.sin(a))) : 1;
      pos.push(p.x + (n.x * Math.cos(a) + bn.x * Math.sin(a) * s) * r, p.y + (n.y * Math.cos(a) + bn.y * Math.sin(a) * s) * r, p.z + (n.z * Math.cos(a) + bn.z * Math.sin(a) * s) * r); uv.push(j / seg, u); } }
  for (let i = 0; i < N; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b2 = i * seg + (j + 1) % seg, c = a + seg, d = b2 + seg; idx.push(a, c, b2, b2, c, d); }
  for (const [ring, flip] of [[0, true], [N, false]]) { const cpt = curve.getPointAt(ring / N), base = pos.length / 3; pos.push(cpt.x, cpt.y, cpt.z); uv.push(0.5, ring / N);
    for (let j = 0; j < seg; j++) { const a = ring * seg + j, b2 = ring * seg + (j + 1) % seg; if (flip) idx.push(base, b2, a); else idx.push(base, a, b2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// crisp printed text / graphics on a board (canvas at a given pixels-per-metre)
export function printTex(wm, hm, draw, ppm = 900) { const w = Math.round(wm * ppm), h = Math.round(hm * ppm); const t = K.canvasTex(w, h, (g) => draw(g, w, h)); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t; }
export { K, THREE, V };
