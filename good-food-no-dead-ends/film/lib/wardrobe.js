// GOOD FOOD. NO DEAD ENDS. — signature garments for the realistic cast, grown from the body so they deform with the same
// skeleton. Each outer layer is fitted over what the character already wears: it starts just outside the clothes
// underneath (an "envelope" measured from the fitted MakeHuman garments), then relaxes under Laplacian smoothing that
// may not pass back inside, which bridges hollows the way fabric under tension does. Vests and coats come from the torso
// and arm skin, coat skirts and aprons from MakeHuman's skirt helper; the scarf, collar, caps and headwrap are shaped on
// the fitted neck and head. Edges get a real thickness, and fabric detail is in metres (UVs are physical).
import { THREE, V, clamp, lerp, noise2, normalTex } from './core.js';
import { headModel } from './hair.js';

const TAU = Math.PI * 2;
const DBG = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('coatdbg') || '' : '';   // look-dev switches (test pages only)
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const boneIdx = (K, names) => new Set(names.map(n => K.meta.bones.findIndex(b => b.name === n)).filter(i => i >= 0));
const TORSO = ['root', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'pelvis.L', 'pelvis.R', 'clavicle.L', 'clavicle.R', 'shoulder01.L', 'shoulder01.R', 'breast.L', 'breast.R'];
const ARM = { L: ['upperarm01.L', 'upperarm02.L', 'lowerarm01.L', 'lowerarm02.L'], R: ['upperarm01.R', 'upperarm02.R', 'lowerarm01.R', 'lowerarm02.R'] };

// reference points of this body (rest pose)
function frame(h) {
  if (h._frame) return h._frame; const J = (n) => h.joint(n);
  const hip = J('upperleg01.L').add(J('upperleg01.R')).multiplyScalar(0.5);
  return (h._frame = { hip, waist: lerp(J('spine05').y, J('spine04').y, 0.5), chest: J('spine02').y, neck: J('neck01'), midX: hip.x, midZ: (J('spine03').z + hip.z) / 2,
    knee: (J('lowerleg01.L').y + J('lowerleg01.R').y) / 2, sh: { L: J('upperarm01.L'), R: J('upperarm01.R') }, el: { L: J('lowerarm01.L'), R: J('lowerarm01.R') }, wr: { L: J('wrist.L'), R: J('wrist.R') } });
}

// the front-most point of each breast (both sexes), where fitted fabric would otherwise show a point
function nipples(h, K) {
  if (h._nip) return h._nip; const out = [];
  for (const s of ['L', 'R']) { const bi = K.meta.bones.findIndex(b => b.name === 'breast.' + s); let best = null;
    for (let i = 0; i < K.bmap.length; i++) { const v = K.bmap[i]; if (K.swI[v * 4] !== bi) continue; if (!best || h.P[v * 3 + 2] > best.z) best = V().fromArray(h.P, v * 3); }
    if (best) out.push(best); }
  return (h._nip = out);
}
// per-base-vertex unit normals of the skin, plus the skirt helper's (each face turned away from the hip axis)
function bodyNormals(h, K) {
  if (h._bn) return h._bn; const N = new Float32Array(K.N * 3), P = h.P, F = frame(h); const a = V(), b = V(), c = V();
  const add = (i, j, k, orient) => { a.fromArray(P, i * 3); b.fromArray(P, j * 3); c.fromArray(P, k * 3); const n = b.sub(a).cross(c.sub(a));
    if (orient && n.x * (a.x - F.hip.x) + n.z * (a.z - F.hip.z) < 0) n.negate(); for (const v of [i, j, k]) { N[v * 3] += n.x; N[v * 3 + 1] += n.y; N[v * 3 + 2] += n.z; } };
  for (let f = 0; f < K.bidx.length; f += 3) add(K.bmap[K.bidx[f]], K.bmap[K.bidx[f + 1]], K.bmap[K.bidx[f + 2]], false);
  const sk = K.meta.skirt; for (let f = 0; f < sk.length; f += 3) add(sk[f], sk[f + 1], sk[f + 2], true);
  for (let v = 0; v < K.N; v++) { const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1; N[v * 3] /= l; N[v * 3 + 1] /= l; N[v * 3 + 2] /= l; }
  return (h._bn = N);
}

// limb class of a bone: 1 left arm or hand, 2 right arm or hand, 0 anything else
function limbClass(K) {
  if (K._limb) return K._limb; const c = new Uint8Array(K.meta.bones.length);
  K.meta.bones.forEach((b, i) => { if (/^(upperarm|lowerarm|wrist|finger|metacarpal|hand)/.test(b.name)) c[i] = b.name.endsWith('.L') ? 1 : 2; });
  return (K._limb = c);
}
// how far the clothes already worn stand off the skin, along each vertex normal (0 where nothing is worn); arms only
// see sleeves and the torso only sees the body of a garment, so hanging sleeves don't inflate the sides of a coat
function envelope(h, K) {
  if (h._env) return h._env; const P = h.P, N = bodyNormals(h, K), E = new Float32Array(K.N), LC = limbClass(K); const cs = 0.03, grid = new Map();
  const key = (x, y, z) => (x + 512) * 1048576 + (y + 512) * 1024 + (z + 512);
  const add = (x, y, z, lc) => { const k = key(Math.floor(x / cs), Math.floor(y / cs), Math.floor(z / cs)); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(x, y, z, lc); };
  for (const c of h.clothes || []) { if (/^shoes/.test(c.key)) continue; const p = c.pos, ix = c.idx, used = ix ? new Uint8Array(p.length / 3) : null; if (ix) for (const i of ix) used[i] = 1;   // (what an outer layer hides is left out)
    for (let i = 0, j = 0; i < p.length; i += 3, j += 4) if (!used || used[i / 3]) add(p[i], p[i + 1], p[i + 2], LC[c.bone[j]]);
    if (ix) for (let f = 0; f < ix.length; f += 3) { const a = ix[f] * 3, b = ix[f + 1] * 3, d = ix[f + 2] * 3, lc = LC[c.bone[ix[f] * 4]];
      add((p[a] + p[b] + p[d]) / 3, (p[a + 1] + p[b + 1] + p[d + 1]) / 3, (p[a + 2] + p[b + 2] + p[d + 2]) / 3, lc);
      for (const [u, w] of [[a, b], [b, d], [d, a]]) add((p[u] + p[w]) / 2, (p[u + 1] + p[w + 1]) / 2, (p[u + 2] + p[w + 2]) / 2, lc); } }
  for (let v = 0; v < K.N; v++) { const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], nx = N[v * 3], ny = N[v * 3 + 1], nz = N[v * 3 + 2]; if (!nx && !ny && !nz) continue;
    const cx = Math.floor(x / cs), cy = Math.floor(y / cs), cz = Math.floor(z / cs), lc = LC[K.swI[v * 4]]; let best = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { const l = grid.get(key(cx + dx, cy + dy, cz + dz)); if (!l) continue;
      for (let i = 0; i < l.length; i += 4) { if (l[i + 3] !== lc) continue; const ex = l[i] - x, ey = l[i + 1] - y, ez = l[i + 2] - z; const d = ex * nx + ey * ny + ez * nz; if (d <= best || d > 0.06) continue;
        if (ex * ex + ey * ey + ez * ez - d * d < 0.022 * 0.022) best = d; } }
    E[v] = best; }
  return (h._env = E);
}
// radial extent (about a vertical axis through C) of skin and clothes, per angle bin and height row, arms left out
function extentGrid(h, K, C, y0, y1, NA, DY, rmax = 0.3, extra = null) {
  const NY = Math.ceil((y1 - y0) / DY), ext = new Float32Array(NA * NY), P = h.P, LC = limbClass(K), hb = K.meta.bones.findIndex(b => b.name === 'head');
  const put = (x, y, z) => { if (y < y0 || y >= y1) return; const dx = x - C.x, dz = z - C.z, r = Math.hypot(dx, dz); if (r > rmax) return; const a = Math.floor((Math.atan2(dx, dz) + Math.PI) / TAU * NA) % NA; const j = Math.floor((y - y0) / DY) * NA + a; if (r > ext[j]) ext[j] = r; };
  for (let i = 0; i < K.bmap.length; i++) { const v = K.bmap[i], b = K.swI[v * 4]; if (b === hb || LC[b]) continue; put(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); }
  for (const c of h.clothes || []) { if (/^shoes/.test(c.key)) continue; const p = c.pos; for (let i = 0, j = 0; i < p.length; i += 3, j += 4) if (!LC[c.bone[j]]) put(p[i], p[i + 1], p[i + 2]); }
  if (extra) for (let i = 0; i < extra.length; i += 3) put(extra[i], extra[i + 1], extra[i + 2]);
  return { at: (k, y) => { const j = clamp(Math.floor((y - y0) / DY), 0, NY - 1); let m = 0; for (let d = -1; d <= 1; d++) m = Math.max(m, ext[j * NA + (k + d + NA) % NA]); return m; }, NY };
}

// base-mesh triangles (skin, or the skirt helper) whose three vertices pass keep(v, p)
function pick(h, K, keep, src = 'body') {
  const out = [], P = h.P, p = V(); const ok = (v) => keep(v, p.fromArray(P, v * 3));
  if (src === 'skirt') { const sk = K.meta.skirt; for (let f = 0; f < sk.length; f += 3) if (ok(sk[f]) && ok(sk[f + 1]) && ok(sk[f + 2])) out.push(sk[f], sk[f + 1], sk[f + 2]); }
  else for (let f = 0; f < K.bidx.length; f += 3) { const a = K.bmap[K.bidx[f]], b = K.bmap[K.bidx[f + 1]], c = K.bmap[K.bidx[f + 2]]; if (ok(a) && ok(b) && ok(c)) out.push(a, b, c); }
  return out;
}
function setSkin(g, n, src) {   // src(i) -> [[bone, weight] x <=4]
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) src(i).forEach(([b, w], k) => { si[i * 4 + k] = b; sw[i * 4 + k] = w; });
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
}
const baseSkin = (K, v) => [0, 1, 2, 3].map(k => [K.swI[v * 4 + k], K.swW[v * 4 + k]]);
// weights for a point near the body: blended from the three nearest skin vertices of the same limb as vertex v
function skinNear(h, K) {
  if (h._skinNear) return h._skinNear; const P = h.P, LC = limbClass(K), cs = 0.02, grid = new Map(); const key = (x, y, z) => (x + 512) * 1048576 + (y + 512) * 1024 + (z + 512);
  for (let i = 0; i < K.bmap.length; i++) { const v = K.bmap[i]; const k = key(Math.floor(P[v * 3] / cs), Math.floor(P[v * 3 + 1] / cs), Math.floor(P[v * 3 + 2] / cs)); let l = grid.get(k); if (!l) grid.set(k, l = []); if (l[l.length - 1] !== v) l.push(v); }
  return (h._skinNear = (x, y, z, v0) => { const lc = LC[K.swI[v0 * 4]], cx = Math.floor(x / cs), cy = Math.floor(y / cs), cz = Math.floor(z / cs); const best = [];
    for (let r = 1; r <= 3 && best.length < 3; r++) { best.length = 0;
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) { const l = grid.get(key(cx + dx, cy + dy, cz + dz)); if (!l) continue;
        for (const v of l) { if (LC[K.swI[v * 4]] !== lc) continue; const d = (P[v * 3] - x) ** 2 + (P[v * 3 + 1] - y) ** 2 + (P[v * 3 + 2] - z) ** 2; best.push([d, v]); } }
      best.sort((a, b) => a[0] - b[0]); best.length = Math.min(best.length, 3); }
    if (!best.length) return baseSkin(K, v0);
    const acc = new Map(); let tw = 0; for (const [d, v] of best) { const w = 1 / (Math.sqrt(d) + 0.004); tw += w; for (let k = 0; k < 4; k++) { const b = K.swI[v * 4 + k], ww = K.swW[v * 4 + k] * w; if (ww > 0) acc.set(b, (acc.get(b) || 0) + ww); } }
    const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4); const sum = top.reduce((q, e) => q + e[1], 0) || 1; return top.map(([b, w]) => [b, w / sum]); });
}
function skinnedMesh(h, g, mat, name) {
  const m = new THREE.SkinnedMesh(g, mat); m.name = name; m.bind(h.skeleton, new THREE.Matrix4()); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  h.group.add(m); h.meshes.push(m); return m;
}

// ------------------------------------------------------------------ the fitted surface
// o: gap (m beyond the envelope, number or fn(v,p)), loose (max extra standoff), iters, lambda, puff(p) -> extra outward,
//    wrinkle (amplitude), island(v) -> 0 body/skirt | 1 left sleeve | 2 right sleeve (UV islands), rim (edge thickness), mat, name
// drop small disconnected islands a cut can leave behind (a few stray triangles at the corner of a V, say)
function dropIslands(tris, minShare = 0.02) {
  const par = new Map(), find = (x) => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
  for (const v of tris) if (!par.has(v)) par.set(v, v);
  for (let f = 0; f < tris.length; f += 3) { const a = find(tris[f]), b = find(tris[f + 1]), c = find(tris[f + 2]); par.set(b, a); par.set(find(c), a); }
  const size = new Map(); for (let f = 0; f < tris.length; f += 3) { const r = find(tris[f]); size.set(r, (size.get(r) || 0) + 1); }
  const n = tris.length / 3, out = []; for (let f = 0; f < tris.length; f += 3) if (size.get(find(tris[f])) >= Math.max(12, n * minShare)) out.push(tris[f], tris[f + 1], tris[f + 2]);
  return out;
}
// ------------------------------------------------------------------ drape: fabric hanging from where it rests
// open (boundary) edges of a triangle mesh: a flag per vertex, and each edge with the vertex opposite it
function openEdges(idx, n) {
  const ec = new Map(); for (let f = 0; f < idx.length; f += 3) for (let k = 0; k < 3; k++) { const a = idx[f + k], b = idx[f + (k + 1) % 3], key = Math.min(a, b) * n + Math.max(a, b); const e = ec.get(key); if (e) e.c++; else ec.set(key, { c: 1, a, b, o: idx[f + (k + 2) % 3] }); }
  const isB = new Uint8Array(n), bEdges = []; for (const e of ec.values()) if (e.c === 1) { isB[e.a] = isB[e.b] = 1; bEdges.push(e); }
  return { isB, bEdges };
}
// points spread over triangles about `step` apart (to rasterize a surface into a grid)
function sampleTris(q, idx, keep, step, cb) {
  for (let f = 0; f < idx.length; f += 3) { if (keep && !keep(idx[f], idx[f + 1], idx[f + 2])) continue; const a = idx[f] * 3, b = idx[f + 1] * 3, c = idx[f + 2] * 3;
    const L = Math.max(Math.hypot(q[a] - q[b], q[a + 1] - q[b + 1], q[a + 2] - q[b + 2]), Math.hypot(q[a] - q[c], q[a + 1] - q[c + 1], q[a + 2] - q[c + 2]), Math.hypot(q[b] - q[c], q[b + 1] - q[c + 1], q[b + 2] - q[c + 2]));
    const m = Math.max(1, Math.ceil(L / step));
    for (let i = 0; i <= m; i++) for (let j = 0; j <= m - i; j++) { const u = i / m, v = j / m, w = 1 - u - v; cb(q[a] * w + q[b] * u + q[c] * v, q[a + 1] * w + q[b + 1] * u + q[c + 1] * v, q[a + 2] * w + q[b + 2] * u + q[c + 2] * v); } }
}
// small forms skimmed: a gaussian blur over the occupied cells of a grid (NY rows of NA cells, the angle wraps round),
// never more than `amt` inside a cell's own value
function skim(G, NA, NY, amt, ra, ry) {
  const out = Float32Array.from(G), wk = [];
  for (let dj = -2 * ry; dj <= 2 * ry; dj++) for (let dk = -2 * ra; dk <= 2 * ra; dk++) wk.push([dj, dk, Math.exp(-0.5 * (dk * dk / (ra * ra) + dj * dj / (ry * ry)))]);
  for (let j = 0; j < NY; j++) for (let k = 0; k < NA; k++) { const c = G[j * NA + k]; if (c <= 0) continue; let s = 0, w = 0;
    for (const [dj, dk, g] of wk) { const jj = j + dj; if (jj < 0 || jj >= NY) continue; const v = G[jj * NA + (k + dk + NA) % NA]; if (v > 0) { s += v * g; w += g; } }
    out[j * NA + k] = Math.max(s / w, c - amt); }
  return out;
}
// along each bin's ray from the axis, the radius of the convex hull of a ring of points given as a radius per angle bin
// (0 = empty), never less than the bin's own; a ring that doesn't surround the axis (an empty arc of half a turn or
// more) comes back as it is
function ringHull(r, NA) {
  const occ = []; for (let k = 0; k < NA; k++) if (r[k] > 0) occ.push(k);
  if (occ.length < 3) return Float32Array.from(r);
  let gap = 0; for (let i = 0; i < occ.length; i++) gap = Math.max(gap, (occ[(i + 1) % occ.length] - occ[i] + NA) % NA || NA); if (gap >= NA / 2) return Float32Array.from(r);
  const pts = occ.map(k => { const a = (k + 0.5) / NA * TAU - Math.PI; return [Math.sin(a) * r[k], Math.cos(a) * r[k]]; }).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const H = lo.slice(0, -1).concat(up.slice(0, -1)), out = Float32Array.from(r);
  for (let k = 0; k < NA; k++) { const a = (k + 0.5) / NA * TAU - Math.PI, dx = Math.sin(a), dz = Math.cos(a);
    for (let i = 0; i < H.length; i++) { const A = H[i], B = H[(i + 1) % H.length], ex = B[0] - A[0], ez = B[1] - A[1], den = dx * ez - dz * ex; if (Math.abs(den) < 1e-12) continue;
      const s = (A[0] * dz - A[1] * dx) / den; if (s < -1e-6 || s > 1 + 1e-6) continue; const t = (A[0] * ez - A[1] * ex) / den; if (t > out[k]) out[k] = t; } }
  return out;
}
// bilinear lookup in a grid of NY rows (y0 + j*DY) by NA angle bins (bin centres, wrapping)
const gridAt = (R, NA, NY, y0, DY) => (y, a) => { const fy = clamp((y - y0) / DY, 0, NY - 1.001), j = Math.floor(fy), u = fy - j, fk = ((a + Math.PI) / TAU * NA - 0.5 + NA) % NA, k = Math.floor(fk) % NA, v = fk - Math.floor(fk), k1 = (k + 1) % NA;
  return lerp(lerp(R[j * NA + k], R[j * NA + k1], v), lerp(R[(j + 1) * NA + k], R[(j + 1) * NA + k1], v), u); };
// below o.top the body of a garment hangs from where it rests: every row is the convex hull of itself and of the row
// above, flaring a little, so the fabric falls straight down and bridges hollows (the cleavage, the small of the back);
// small forms (nipples, shoulder blades) are skimmed first. Only the body island moves.
function drapeHang(ctx, o) {
  const top = typeof o.top === 'function' ? o.top : () => o.top, topMax = Math.max(top(0), top(Math.PI), top(Math.PI / 2));
  const { q, n, idx, vIsl } = ctx, C = o.C, NA = 128, DY = 0.005, y0 = o.bottom, NY = Math.ceil((topMax - y0) / DY) + 1, G = new Float32Array(NA * NY);
  const topK = Float32Array.from({ length: NA }, (_, k) => top((k + 0.5) / NA * TAU - Math.PI));
  sampleTris(q, idx, (a, b, c) => !vIsl[a] && !vIsl[b] && !vIsl[c], 0.003, (x, y, z) => { const j = Math.round((y - y0) / DY); if (j < 0 || j >= NY) return;
    const k = Math.min(NA - 1, Math.floor((Math.atan2(x - C.x, z - C.z) + Math.PI) / TAU * NA)), r = Math.hypot(x - C.x, z - C.z); if (r > G[j * NA + k]) G[j * NA + k] = r; });
  const S = skim(G, NA, NY, o.skim ?? 0.006, 2, 3), R = new Float32Array(NA * NY);
  for (let j = NY - 1; j >= 0; j--) { const y = y0 + j * DY, row = S.slice(j * NA, j * NA + NA);
    if (j < NY - 1) for (let k = 0; k < NA; k++) if (y <= topK[k]) row[k] = Math.max(row[k], R[(j + 1) * NA + k] * (1 + (o.flare ?? 0.08) * DY));
    const hl = ringHull(row, NA); for (let k = 0; k < NA; k++) R[j * NA + k] = y <= topK[k] ? hl[k] : row[k]; }
  const at = gridAt(R, NA, NY, y0, DY);
  for (let i = 0; i < n; i++) { if (vIsl[i]) continue; const y = q[i * 3 + 1], x = q[i * 3], z = q[i * 3 + 2], a = Math.atan2(x - C.x, z - C.z), ty = top(a); if (y > ty || y < y0) continue;
    const r = Math.hypot(x - C.x, z - C.z), want = at(y, a); if (r < 1e-4) continue;   // onto the drape: out over hollows, in by at most the skim over small forms
    const f = lerp(r, want, smoothstep(ty, ty - (o.blend ?? 0.04), y)) / r; q[i * 3] = C.x + (x - C.x) * f; q[i * 3 + 2] = C.z + (z - C.z) * f; }
}
// a loose sleeve: below the armpit each sleeve is a round tube about the arm's axis, as wide as the upper arm with some
// ease, narrowing evenly to a cuff that clears the wrist; it also clears anything the arm itself pushes out (the elbow),
// with convex cross-sections there. Above, it blends into the fitted cap. Only that sleeve's island moves, only outwards.
function sleeveTube(ctx, s, isl, o) {
  const { q, n, idx, vIsl, F } = ctx, sh = F.sh[s], el = F.el[s], wr = F.wr[s];
  const curve = new THREE.CatmullRomCurve3([sh.clone().add(sh.clone().sub(el).setLength(0.06)), sh, el, wr, wr.clone().add(wr.clone().sub(el).setLength(0.12))], false, 'centripetal');
  const M = 400, Pc = curve.getSpacedPoints(M), ds = curve.getLength() / M, T = Pc.map((_, m) => curve.getTangentAt(m / M)), E1 = [], E2 = [];
  const e1 = V(0, 0, 1).addScaledVector(T[0], -T[0].z).normalize();   // frames by parallel transport, starting from the front
  for (let m = 0; m <= M; m++) { if (m) { e1.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(T[m - 1], T[m])); e1.addScaledVector(T[m], -e1.dot(T[m])).normalize(); } E1.push(e1.clone()); E2.push(T[m].clone().cross(e1)); }
  let m0 = 0; Pc.forEach((p, m) => { if (p.distanceToSquared(sh) < Pc[m0].distanceToSquared(sh)) m0 = m; });
  const proj = (x, y, z) => { let b = 0, bd = 1e9; for (let m = 0; m <= M; m++) { const p = Pc[m], d = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; b = m; } }
    const p = Pc[b], t = T[b], dx = x - p.x, dy = y - p.y, dz = z - p.z, al = dx * t.x + dy * t.y + dz * t.z, rx = dx - t.x * al, ry = dy - t.y * al, rz = dz - t.z * al;
    return { t: (b - m0) * ds + al, phi: Math.atan2(rx * E2[b].x + ry * E2[b].y + rz * E2[b].z, rx * E1[b].x + ry * E1[b].y + rz * E1[b].z), r: Math.hypot(rx, ry, rz), bx: p.x + t.x * al, by: p.y + t.y * al, bz: p.z + t.z * al }; };
  const DT = 0.005, tMin = -m0 * ds, NT = Math.ceil(M * ds / DT) + 1, NP = 48, G = new Float32Array(NT * NP);
  sampleTris(q, idx, (a, b, c) => vIsl[a] === isl && vIsl[b] === isl && vIsl[c] === isl, 0.003, (x, y, z) => { const r = proj(x, y, z), j = Math.round((r.t - tMin) / DT); if (j < 0 || j >= NT) return;
    const k = Math.min(NP - 1, Math.floor((r.phi + Math.PI) / TAU * NP)); if (r.r > G[j * NP + k]) G[j * NP + k] = r.r; });
  const S = skim(G, NP, NT, o.skim ?? 0.004, 2, 3), jOf = (t) => clamp(Math.round((t - tMin) / DT), 0, NT - 1);
  // the tube: radius at the upper arm (a high percentile of the rings just below the armpit) and at the cuff
  const ringsIn = (t0, t1) => { const v = []; for (let j = jOf(t0); j <= jOf(t1); j++) for (let k = 0; k < NP; k++) if (S[j * NP + k] > 0) v.push(S[j * NP + k]); return v.sort((x, y) => x - y); };
  let tEnd = 0; for (let j = 0; j < NT; j++) if (S.subarray(j * NP, j * NP + NP).some(v => v > 0)) tEnd = tMin + j * DT;
  const tb = o.top ?? 0.17, up = ringsIn(tb, tb + 0.05), Rb = (up[Math.floor(up.length * 0.6)] || 0.05) + (o.ease ?? 0.005);
  const cuff = ringsIn(tEnd - 0.03, tEnd), Rc = Math.max((cuff[Math.floor(cuff.length * 0.9)] || 0.035) + (o.cuffEase ?? 0.012), Rb - (o.taper ?? 0.045) * (tEnd - tb));
  const tubeR = (t) => lerp(Rb, Rc, clamp((t - tb) / Math.max(0.05, tEnd - tb), 0, 1));
  const R = new Float32Array(NT * NP);
  for (let j = 0; j < NT; j++) { const t = tMin + j * DT, row = S.slice(j * NP, j * NP + NP);
    if (t >= tb) { const hl = ringHull(row, NP); for (let k = 0; k < NP; k++) R[j * NP + k] = Math.max(hl[k], tubeR(t)); } else R.fill(tubeR(t), j * NP, j * NP + NP); }
  const at = gridAt(R, NP, NT, tMin, DT), cap = o.cap ?? 0.03;
  for (let i = 0; i < n; i++) { if (vIsl[i] !== isl) continue; const r = proj(q[i * 3], q[i * 3 + 1], q[i * 3 + 2]), w = smoothstep(cap, tb, r.t); if (w <= 0 || r.r < 1e-5) continue;
    const want = at(r.t, r.phi); if (want <= r.r) continue; const f = lerp(r.r, want, w) / r.r;
    q[i * 3] = r.bx + (q[i * 3] - r.bx) * f; q[i * 3 + 1] = r.by + (q[i * 3 + 1] - r.by) * f; q[i * 3 + 2] = r.bz + (q[i * 3 + 2] - r.bz) * f; }
}
// two sets of skin weights mixed (t = share of b), the four strongest kept
function mixW(a, b, t) {
  const acc = new Map(); for (const [bn, w] of a) acc.set(bn, (acc.get(bn) || 0) + w * (1 - t)); for (const [bn, w] of b) acc.set(bn, (acc.get(bn) || 0) + w * t);
  const top = [...acc.entries()].filter(e => e[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 4), s = top.reduce((q, e) => q + e[1], 0) || 1; return top.map(([bn, w]) => [bn, w / s]);
}
// a skirt carried straight down from the lowest open edge of the body island to o.bottom: round the legs and never
// inside them, flaring a little, with soft vertical folds; weighted to the hips, and towards the thighs lower down
function hemSkirt(ctx, o) {
  const { h, K, q, n, vIsl, bEdges, verts } = ctx, C = o.C;
  const bn = new Map(); for (const e of bEdges) for (const [u, v] of [[e.a, e.b], [e.b, e.a]]) { if (!bn.has(u)) bn.set(u, []); bn.get(u).push(v); }
  const seen = new Set(), loops = [];
  for (const s0 of bn.keys()) { if (seen.has(s0)) continue; const L = [s0]; seen.add(s0); let prev = -1, cur = s0;
    for (;;) { const nx = bn.get(cur).find(v => v !== prev && !seen.has(v)); if (nx === undefined) break; L.push(nx); seen.add(nx); prev = cur; cur = nx; } loops.push(L); }
  let L = null, ly = 1e9; for (const lp of loops) { if (lp.length < 16 || lp.some(i => vIsl[i])) continue; const my = lp.reduce((s, i) => s + q[i * 3 + 1], 0) / lp.length; if (my < ly) { ly = my; L = lp; } }
  if (!L) return null;
  const ang = (i) => Math.atan2(q[i * 3] - C.x, q[i * 3 + 2] - C.z), rad = (i) => Math.hypot(q[i * 3] - C.x, q[i * 3 + 2] - C.z);
  { let turn = 0; for (let i = 0; i < L.length; i++) { let d = ang(L[(i + 1) % L.length]) - ang(L[i]); d -= TAU * Math.round(d / TAU); turn += d; } if (turn < 0) L.reverse(); }
  // the hem's radius by angle, then rows below it: hanging, flaring, pushed out by the legs, convex
  const NA = 128, DY = 0.01, ytop = Math.max(...L.map(i => q[i * 3 + 1])), NY = Math.ceil((ytop - o.bottom) / DY) + 2, ext = extentGrid(h, K, C, o.bottom - 0.03, ytop + 0.03, NA, 0.006, 0.45);
  const ring = new Float32Array(NA), byA = L.map(i => [ang(i), rad(i)]).sort((x, y) => x[0] - y[0]);   // the hem's radius by angle (the loop may zigzag)
  for (let k = 0, i = 0; k < NA; k++) { const a = (k + 0.5) / NA * TAU - Math.PI; while (i < byA.length && byA[i][0] < a) i++;
    const A = byA[(i + byA.length - 1) % byA.length], B = byA[i % byA.length], a0 = A[0] - (i === 0 ? TAU : 0), a1 = B[0] + (i === byA.length ? TAU : 0); ring[k] = lerp(A[1], B[1], clamp((a - a0) / Math.max(1e-6, a1 - a0), 0, 1)); }
  const R = new Float32Array(NA * NY); R.set(ringHull(ring, NA), (NY - 1) * NA);
  for (let j = NY - 2; j >= 0; j--) { const y = ytop - (NY - 1 - j) * DY, row = new Float32Array(NA);
    for (let k = 0; k < NA; k++) row[k] = Math.max(R[(j + 1) * NA + k] * (1 + (o.flare ?? 0.1) * DY), ext.at(k, y) + (o.clear ?? 0.02));
    const sm = row.map((v, k) => (row[(k + NA - 1) % NA] + 2 * v + row[(k + 1) % NA]) / 4); for (let k = 0; k < NA; k++) row[k] = Math.max(row[k], sm[k]);
    R.set(ringHull(row, NA), j * NA); }
  const at = gridAt(R, NA, NY, ytop - (NY - 1) * DY, DY);
  const m = L.length, NR = Math.max(4, Math.round((ly - o.bottom) / 0.012)), pos = new Float32Array(NR * m * 3), w = [], tris = [];
  const near = skinNear(h, K), bi = (nm) => K.meta.bones.findIndex(b => b.name === nm), rootB = bi('root'), lL = bi('upperleg01.L'), lR = bi('upperleg01.R');
  const hw = L.map(i => near(q[i * 3], q[i * 3 + 1], q[i * 3 + 2], verts[i]));
  for (let j = 1; j <= NR; j++) for (let c = 0; c < m; c++) { const i = L[c], a = ang(i), yh = q[i * 3 + 1], y = lerp(yh, o.bottom, j / NR), down = (yh - y) / Math.max(1e-3, yh - o.bottom);
    const fold = (o.folds ?? 0.008) * Math.pow(down, 1.3) * (Math.sin(a * 9 + 1.3) * 0.6 + (noise2(a * 2.4 + 3, 7.1) - 0.5) * 1.2);
    const r = at(y, a) + fold, p = ((j - 1) * m + c) * 3; pos[p] = C.x + Math.sin(a) * r; pos[p + 1] = y; pos[p + 2] = C.z + Math.cos(a) * r;
    const legW = 0.8 * smoothstep(0.15, 1, down), side = clamp(Math.sin(a) * r / 0.09, -1, 1);
    w.push(mixW(hw[c], [[rootB, 1 - legW], [lL, legW * (0.5 + 0.5 * side)], [lR, legW * (0.5 - 0.5 * side)]], smoothstep(0, 0.3, down))); }
  const id = (j, c) => (j ? n + (j - 1) * m + (c % m) : L[c % m]), P = (i) => (i < n ? V().fromArray(q, i * 3) : V().fromArray(pos, (i - n) * 3));
  for (let j = 0; j < NR; j++) for (let c = 0; c < m; c++) { const a = id(j, c), b = id(j, c + 1), d = id(j + 1, c), e = id(j + 1, c + 1); tris.push(a, d, b, b, d, e); }
  { const A = P(tris[0]), B = P(tris[1]), D = P(tris[2]), fn = B.clone().sub(A).cross(D.clone().sub(A)), out = A.clone().sub(V(C.x, A.y, C.z)); if (fn.dot(out) < 0) for (let f = 0; f < tris.length; f += 3) { const t = tris[f + 1]; tris[f + 1] = tris[f + 2]; tris[f + 2] = t; } }
  return { pos, tris, w };
}
// skin weights for points on (or just off) a skinned mesh: blended from its three nearest vertices, so whatever is
// attached to a garment moves exactly as the garment does
function weightsFrom(mesh) {
  const g = mesh.geometry, p = g.attributes.position.array, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array, cs = 0.02, grid = new Map();
  const key = (x, y, z) => (x + 512) * 1048576 + (y + 512) * 1024 + (z + 512);
  for (let i = 0; i < p.length / 3; i++) { const k = key(Math.floor(p[i * 3] / cs), Math.floor(p[i * 3 + 1] / cs), Math.floor(p[i * 3 + 2] / cs)); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); }
  return (x, y, z) => { const cx = Math.floor(x / cs), cy = Math.floor(y / cs), cz = Math.floor(z / cs), best = [];
    for (let r = 1; r <= 5 && best.length < 3; r++) { best.length = 0; for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) { const l = grid.get(key(cx + dx, cy + dy, cz + dz)); if (l) for (const i of l) best.push([(p[i * 3] - x) ** 2 + (p[i * 3 + 1] - y) ** 2 + (p[i * 3 + 2] - z) ** 2, i]); } }
    best.sort((a, b) => a[0] - b[0]); best.length = Math.min(3, best.length);
    const acc = []; for (const [d, i] of best) { const wd = 1 / (Math.sqrt(d) + 0.002); for (let k = 0; k < 4; k++) acc.push([si[i * 4 + k], sw[i * 4 + k] * wd]); }
    return mixW(acc.filter(e => e[1] > 0), [], 0); };
}
// the outside of a garment's body as a radius per (angle round the axis C, height), openings filled in smoothly from
// their edges: points and normals on it, and the angle at which its front passes a given x
function radialField(gar, C, y0, y1) {
  const NA = 360, DY = 0.0025, NY = Math.ceil((y1 - y0) / DY) + 1, R = new Float32Array(NA * NY), nb4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  sampleTris(gar.q, gar.idx, (a, b, c) => !gar.vIsl[a] && !gar.vIsl[b] && !gar.vIsl[c], 0.002, (x, y, z) => { const j = Math.round((y - y0) / DY); if (j < 0 || j >= NY) return;
    const k = Math.min(NA - 1, Math.floor((Math.atan2(x - C.x, z - C.z) + Math.PI) / TAU * NA)), r = Math.hypot(x - C.x, z - C.z); if (r > R[j * NA + k]) R[j * NA + k] = r; });
  const known = Uint8Array.from(R, v => (v > 0 ? 1 : 0));
  for (let pass = 0; pass < 4000; pass++) { let empty = 0; const nx = R.slice();
    for (let j = 0; j < NY; j++) for (let k = 0; k < NA; k++) { const c = j * NA + k; if (R[c] > 0) continue; empty++; let s = 0, w = 0;
      for (const [dj, dk] of nb4) { const jj = j + dj; if (jj < 0 || jj >= NY) continue; const v = R[jj * NA + (k + dk + NA) % NA]; if (v > 0) { s += v; w++; } } if (w) nx[c] = s / w; }
    R.set(nx); if (!empty) break; }
  for (let it = 0; it < 200; it++) for (let j = 0; j < NY; j++) for (let k = 0; k < NA; k++) { const c = j * NA + k; if (known[c]) continue; let s = 0, w = 0;
    for (const [dj, dk] of nb4) { const jj = j + dj; if (jj < 0 || jj >= NY) continue; s += R[jj * NA + (k + dk + NA) % NA]; w++; } R[c] = s / w; }
  const at = gridAt(R, NA, NY, y0, DY);
  const point = (a, y) => { const r = at(y, a); return V(C.x + Math.sin(a) * r, y, C.z + Math.cos(a) * r); };
  const normal = (a, y) => { const e = 0.004, da = e / Math.max(0.05, at(y, a)), pa = point(a + da, y).sub(point(a - da, y)), py = point(a, y + e).sub(point(a, y - e)), nn = pa.cross(py).normalize();
    return nn.dot(V(Math.sin(a), 0, Math.cos(a))) < 0 ? nn.negate() : nn; };
  const angleAtX = (x, y) => { let a = 0; for (let it = 0; it < 8; it++) a = Math.asin(clamp((x - C.x) / at(y, a), -1, 1)); return a; };
  const onFront = (x, y, off = 0) => { const a = angleAtX(x, y); return point(a, y).addScaledVector(normal(a, y), off); };
  return { at, point, normal, angleAtX, onFront, C };
}
// the same about a point O inside the upper chest: distance of the coat's outside per (azimuth, elevation), for the yoke
// round the neck, where the shoulders are too flat for a field about a vertical axis
function sphereField(gar, O) {
  const NA = 180, NE = 150, e0 = -0.5, de = 0.01, R = new Float32Array(NA * NE);
  sampleTris(gar.q, gar.idx, (a, b, c) => !gar.vIsl[a] && !gar.vIsl[b] && !gar.vIsl[c], 0.002, (x, y, z) => { const dx = x - O.x, dy = y - O.y, dz = z - O.z, hz = Math.hypot(dx, dz), j = Math.round((Math.atan2(dy, hz) - e0) / de); if (j < 0 || j >= NE) return;
    const k = Math.min(NA - 1, Math.floor((Math.atan2(dx, dz) + Math.PI) / TAU * NA)), r = Math.hypot(hz, dy); if (r > R[j * NA + k]) R[j * NA + k] = r; });
  for (let pass = 0; pass < 400; pass++) { let empty = 0; const nx = R.slice();
    for (let j = 0; j < NE; j++) for (let k = 0; k < NA; k++) { const c = j * NA + k; if (R[c] > 0) continue; empty++; let s = 0, w = 0;
      for (const [dj, dk] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const jj = j + dj; if (jj < 0 || jj >= NE) continue; const v = R[jj * NA + (k + dk + NA) % NA]; if (v > 0) { s += v; w++; } } if (w) nx[c] = s / w; }
    R.set(nx); if (!empty) break; }
  const at = gridAt(R, NA, NE, e0, de), dir = (a, e) => V(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  const point = (a, e) => O.clone().addScaledVector(dir(a, e), at(e, a));
  const normal = (a, e) => { const h = 0.004, pa = point(a + h, e).sub(point(a - h, e)), pe = point(a, e + h).sub(point(a, e - h)), nn = pa.cross(pe).normalize(); return nn.dot(dir(a, e)) < 0 ? nn.negate() : nn; };
  const elev = (p) => Math.atan2(p.y - O.y, Math.hypot(p.x - O.x, p.z - O.z));
  // walk down the surface from elevation e by a length along it
  const down = (a, e, len) => { let p = point(a, e), acc = 0; for (let k = 0; k < 400 && acc < len; k++) { e -= 0.004; const p2 = point(a, e); acc += p2.distanceTo(p); p = p2; } return { p, e }; };
  return { at, point, normal, elev, down, O };
}
function garment(h, K, tris, o) {
  tris = dropIslands(tris);
  const P = h.P, E = envelope(h, K), F = frame(h); let NB = bodyNormals(h, K);
  const loc = new Map(), verts = []; let idx = Uint32Array.from(tris, (v) => { let i = loc.get(v); if (i === undefined) { i = verts.length; loc.set(v, i); verts.push(v); } return i; });
  let n = verts.length; if (!n) return null;
  // faces wound outward (the skirt helper's winding is not)
  { const a = V(), b = V(), c = V(); for (let f = 0; f < idx.length; f += 3) { a.fromArray(P, verts[idx[f]] * 3); b.fromArray(P, verts[idx[f + 1]] * 3); c.fromArray(P, verts[idx[f + 2]] * 3);
    const fn = b.sub(a).cross(c.sub(a)); let s = 0; for (let k = 0; k < 3; k++) { const v = verts[idx[f + k]]; s += fn.x * NB[v * 3] + fn.y * NB[v * 3 + 1] + fn.z * NB[v * 3 + 2]; } if (s < 0) { const t = idx[f + 1]; idx[f + 1] = idx[f + 2]; idx[f + 2] = t; } } }
  const nb = Array.from({ length: n }, () => new Set()), ec = new Map();
  for (let f = 0; f < idx.length; f += 3) for (let k = 0; k < 3; k++) { const a = idx[f + k], b = idx[f + (k + 1) % 3]; nb[a].add(b); nb[b].add(a); const key = Math.min(a, b) * n + Math.max(a, b); const e = ec.get(key); if (e) e.c++; else ec.set(key, { c: 1, a, b, o: idx[f + (k + 2) % 3] }); }
  let isB = new Uint8Array(n), bEdges = []; const bnb = Array.from({ length: n }, () => []);
  for (const e of ec.values()) if (e.c === 1) { isB[e.a] = isB[e.b] = 1; bnb[e.a].push(e.b); bnb[e.b].push(e.a); bEdges.push(e); }
  const nbA = nb.map(s => [...s]);
  // reference surface: the skin, optionally softened first (cloth skims small forms such as nipples instead of following them)
  let Pr = P; if (o.soften) { Pr = Float32Array.from(P); const t2 = new Float32Array(n * 3);
    for (let it = 0; it < o.soften * 2; it++) { const f = it % 2 ? -0.53 : 0.5;   // Taubin: removes small bumps without shrinking limbs
      for (let i = 0; i < n; i++) { const v = verts[i] * 3, L = nb[i]; let x = 0, y = 0, z = 0; for (const j of L) { const u = verts[j] * 3; x += Pr[u]; y += Pr[u + 1]; z += Pr[u + 2]; }
        const m = L.size || 1; t2[i * 3] = Pr[v] + f * (x / m - Pr[v]); t2[i * 3 + 1] = Pr[v + 1] + f * (y / m - Pr[v + 1]); t2[i * 3 + 2] = Pr[v + 2] + f * (z / m - Pr[v + 2]); }
      for (let i = 0; i < n; i++) if (!isB[i]) { const v = verts[i] * 3; Pr[v] = t2[i * 3]; Pr[v + 1] = t2[i * 3 + 1]; Pr[v + 2] = t2[i * 3 + 2]; } }
    for (let i = 0; i < n; i++) { const v = verts[i] * 3, d = (Pr[v] - P[v]) * NB[v] + (Pr[v + 1] - P[v + 1]) * NB[v + 1] + (Pr[v + 2] - P[v + 2]) * NB[v + 2];   // never more than 5 mm inside the skin
      if (d < -0.005) { const w = -0.005 - d; Pr[v] += NB[v] * w; Pr[v + 1] += NB[v + 1] * w; Pr[v + 2] += NB[v + 2] * w; } } }
  // fabric bridges the chest instead of picking out the nipples: sink the reference surface there and stand a little further off
  // under a loose layer the reference surface round each nipple is smoothed away (the fabric bridges it)
  const Eg = Float32Array.from(verts, v => E[v]);   // standoff of the clothes underneath, per garment vertex
  if (o.nipSmooth) { const cs = nipples(h, K), R = o.nipSmooth; if (cs.length) { if (Pr === P) Pr = Float32Array.from(P); const wv = new Float32Array(n);
    for (const c of cs) {   // a quadric fitted to the skin in a ring round the nipple stands in for the skin inside it
      let nn = V(); for (let i = 0; i < n; i++) { const v = verts[i] * 3, d = Math.hypot(P[v] - c.x, P[v + 1] - c.y, P[v + 2] - c.z); if (d < R * 0.6) nn.add(V(NB[v], NB[v + 1], NB[v + 2])); }
      if (nn.lengthSq() < 1e-9) continue; nn.normalize(); const u = V(0, 1, 0).cross(nn).normalize(), w2 = nn.clone().cross(u);
      const rows = [], rhs = [], loc = (v) => { const p = V(P[v] - c.x, P[v + 1] - c.y, P[v + 2] - c.z); return [p.dot(u), p.dot(w2), p.dot(nn)]; };
      for (let i = 0; i < n; i++) { const v = verts[i] * 3, d = Math.hypot(P[v] - c.x, P[v + 1] - c.y, P[v + 2] - c.z); if (d < R * 0.4 || d > R * 0.9) continue; const [s1, t1, h1] = loc(v); rows.push([1, s1, t1, s1 * s1, s1 * t1, t1 * t1]); rhs.push(h1); }
      if (rows.length < 12) continue;
      const A = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, k) => rows.reduce((t, x) => t + x[r] * x[k], 0))), bb = Array.from({ length: 6 }, (_, r) => rows.reduce((t, x, j) => t + x[r] * rhs[j], 0));
      for (let col = 0; col < 6; col++) { let piv = col; for (let r = col + 1; r < 6; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r; [A[col], A[piv]] = [A[piv], A[col]]; [bb[col], bb[piv]] = [bb[piv], bb[col]];
        for (let r = 0; r < 6; r++) { if (r === col) continue; const f = A[r][col] / A[col][col]; for (let k = col; k < 6; k++) A[r][k] -= f * A[col][k]; bb[r] -= f * bb[col]; } }
      const co = bb.map((x, r) => x / A[r][r]), hf = (s1, t1) => co[0] + co[1] * s1 + co[2] * t1 + co[3] * s1 * s1 + co[4] * s1 * t1 + co[5] * t1 * t1;
      for (let i = 0; i < n; i++) { const v = verts[i] * 3, d = Math.hypot(P[v] - c.x, P[v + 1] - c.y, P[v + 2] - c.z); if (d > R) continue; const wt = 1 - smoothstep(R * 0.45, R, d); if (wt <= 0) continue;
        const [s1, t1, h1] = loc(v), q3 = V(c.x, c.y, c.z).addScaledVector(u, s1).addScaledVector(w2, t1).addScaledVector(nn, clamp(hf(s1, t1), h1 - 0.01, h1 + 0.004));
        Pr[v] = lerp(Pr[v], q3.x, wt); Pr[v + 1] = lerp(Pr[v + 1], q3.y, wt); Pr[v + 2] = lerp(Pr[v + 2], q3.z, wt); wv[i] = Math.max(wv[i], wt); } }
    // and is offset along its own normals there (the skin's fan out round the nipple and would raise it again)
    NB = Float32Array.from(NB); const acc = new Float32Array(n * 3), a = V(), b = V(), c = V();
    for (let f = 0; f < idx.length; f += 3) { const i0 = idx[f], i1 = idx[f + 1], i2 = idx[f + 2]; if (!wv[i0] && !wv[i1] && !wv[i2]) continue; a.fromArray(Pr, verts[i0] * 3); b.fromArray(Pr, verts[i1] * 3); c.fromArray(Pr, verts[i2] * 3); const fn = b.sub(a).cross(c.sub(a));
      for (const i of [i0, i1, i2]) { acc[i * 3] += fn.x; acc[i * 3 + 1] += fn.y; acc[i * 3 + 2] += fn.z; } }
    for (let i = 0; i < n; i++) if (wv[i]) Eg[i] *= 1 - wv[i];   // (measured along the fanned-out normals too)
    for (let i = 0; i < n; i++) { if (!wv[i]) continue; const v = verts[i] * 3; let x = acc[i * 3], y = acc[i * 3 + 1], z = acc[i * 3 + 2]; if (x * NB[v] + y * NB[v + 1] + z * NB[v + 2] < 0) { x = -x; y = -y; z = -z; }
      const l = Math.hypot(x, y, z) || 1; for (const [k, val] of [[0, x / l], [1, y / l], [2, z / l]]) NB[v + k] = lerp(NB[v + k], val, wv[i]); const l2 = Math.hypot(NB[v], NB[v + 1], NB[v + 2]) || 1; NB[v] /= l2; NB[v + 1] /= l2; NB[v + 2] /= l2; } } }
  const fl = o.flatten ? nipples(h, K) : [], bump = new Float32Array(n);
  if (fl.length) { if (Pr === P) Pr = Float32Array.from(P);
    for (let i = 0; i < n; i++) { const v = verts[i] * 3; for (const c of fl) { const d = Math.hypot(P[v] - c.x, P[v + 1] - c.y, P[v + 2] - c.z); if (d >= 0.04) continue; const w = 0.5 + 0.5 * Math.cos(Math.PI * d / 0.04);
      Pr[v] -= NB[v] * o.flatten * w; Pr[v + 1] -= NB[v + 1] * o.flatten * w; Pr[v + 2] -= NB[v + 2] * o.flatten * w; bump[i] = Math.max(bump[i], o.flatten * 0.6 * w); } } }
  // offset beyond what is worn underneath, then relax without passing back inside
  let q = new Float32Array(n * 3); const lo = new Float32Array(n), hi = new Float32Array(n), tol = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = verts[i], p = V().fromArray(P, v * 3); const g = (typeof o.gap === 'function' ? o.gap(v, p) : (o.gap ?? 0.01)) + bump[i];
    lo[i] = Eg[i] + g; hi[i] = lo[i] + (o.loose ?? 0.05); tol[i] = g * (o.give ?? 0.6); for (let c = 0; c < 3; c++) q[i * 3 + c] = Pr[v * 3 + c] + NB[v * 3 + c] * lo[i]; }
  // fabric doesn't follow small bumps: spread each vertex's standoff to its neighbours, falling off at the drape slope
  const slope = o.drape ?? 0.3;
  for (let it = 0; it < (o.tent ?? 24); it++) for (let i = 0; i < n; i++) { const v = verts[i] * 3; for (const j of nbA[i]) { const u = verts[j] * 3;
    const d = Math.hypot(P[v] - P[u], P[v + 1] - P[u + 1], P[v + 2] - P[u + 2]); const w = lo[j] - slope * d; if (w > lo[i]) { lo[i] = w; hi[i] = Math.max(hi[i], w + 0.01); } } }
  for (let i = 0; i < n; i++) { const v = verts[i]; for (let c = 0; c < 3; c++) q[i * 3 + c] = Pr[v * 3 + c] + NB[v * 3 + c] * lo[i]; }
  const tmp = new Float32Array(n * 3), lam = o.lambda ?? 0.55;
  // (open edges only move along their normal, so hems and necklines keep their cut instead of shrinking)
  for (let it = 0; it < (o.iters ?? 30); it++) {
    for (let i = 0; i < n; i++) { const L = nbA[i]; const m = L.length; if (!m) { tmp[i * 3] = q[i * 3]; tmp[i * 3 + 1] = q[i * 3 + 1]; tmp[i * 3 + 2] = q[i * 3 + 2]; continue; }
      let x = 0, y = 0, z = 0; for (const j of L) { x += q[j * 3]; y += q[j * 3 + 1]; z += q[j * 3 + 2]; }
      let dx = lam * (x / m - q[i * 3]), dy = lam * (y / m - q[i * 3 + 1]), dz = lam * (z / m - q[i * 3 + 2]);
      if (isB[i]) { const v = verts[i] * 3, k = dx * NB[v] + dy * NB[v + 1] + dz * NB[v + 2]; dx = NB[v] * k; dy = NB[v + 1] * k; dz = NB[v + 2] * k; }
      tmp[i * 3] = q[i * 3] + dx; tmp[i * 3 + 1] = q[i * 3 + 1] + dy; tmp[i * 3 + 2] = q[i * 3 + 2] + dz; }
    for (let i = 0; i < n; i++) { const v = verts[i] * 3; const d = (tmp[i * 3] - Pr[v]) * NB[v] + (tmp[i * 3 + 1] - Pr[v + 1]) * NB[v + 1] + (tmp[i * 3 + 2] - Pr[v + 2]) * NB[v + 2];
      const w = clamp(d, lo[i] - tol[i], hi[i]) - d; tmp[i * 3] += NB[v] * w; tmp[i * 3 + 1] += NB[v + 1] * w; tmp[i * 3 + 2] += NB[v + 2] * w; }
    q.set(tmp);
  }
  // cut edges follow triangle edges, so they zigzag: smooth them along the edge (Taubin, which doesn't shrink the cut) and refit
  for (let it = 0; it < (o.edgeIters ?? 16); it++) { const f = it % 2 ? -0.53 : 0.5; tmp.set(q);
    for (let i = 0; i < n; i++) { const L = bnb[i]; if (!isB[i] || L.length < 2) continue; for (let c = 0; c < 3; c++) { let m = 0; for (const j of L) m += q[j * 3 + c]; tmp[i * 3 + c] = q[i * 3 + c] + f * (m / L.length - q[i * 3 + c]); } }
    q.set(tmp); }
  for (let i = 0; i < n; i++) { if (!isB[i]) continue; const v = verts[i] * 3; const d = (q[i * 3] - Pr[v]) * NB[v] + (q[i * 3 + 1] - Pr[v + 1]) * NB[v + 1] + (q[i * 3 + 2] - Pr[v + 2]) * NB[v + 2];
    const w = Math.max(d, lo[i] - tol[i]) - d; q[i * 3] += NB[v] * w; q[i * 3 + 1] += NB[v + 1] * w; q[i * 3 + 2] += NB[v + 2] * w; }
  // loose garments hang: below o.hang (a height) the body of the garment falls straight down at every angle round the
  // hip axis until something pushes it out, instead of following the waist in
  const island = o.island || (() => 0), vIsl = verts.map(v => island(v));
  if (o.hang !== undefined) { const C = F.hip, NA = 96, DY = 0.01, y0 = F.knee, NYr = Math.ceil((o.hang - y0) / DY) + 1, R = new Float32Array(NA * NYr);
    const bin = (i) => { const dx = q[i * 3] - C.x, dz = q[i * 3 + 2] - C.z; return [Math.floor((Math.atan2(dx, dz) + Math.PI) / TAU * NA) % NA, Math.hypot(dx, dz)]; };
    for (let i = 0; i < n; i++) { if (vIsl[i]) continue; const y = q[i * 3 + 1]; if (y > o.hang || y < y0) continue; const [k, r] = bin(i), j = Math.floor((o.hang - y) / DY); R[j * NA + k] = Math.max(R[j * NA + k], r); }
    for (let j = 1; j < NYr; j++) for (let k = 0; k < NA; k++) R[j * NA + k] = Math.max(R[j * NA + k], R[(j - 1) * NA + k]);
    for (let j = 0; j < NYr; j++) { const row = R.slice(j * NA, j * NA + NA); for (let k = 0; k < NA; k++) R[j * NA + k] = Math.max(row[k], (row[(k + NA - 1) % NA] + row[(k + 1) % NA]) * 0.5 * 0.995); }
    for (let i = 0; i < n; i++) { if (vIsl[i]) continue; const y = q[i * 3 + 1]; if (y > o.hang || y < y0) continue; const [k, r] = bin(i), j = Math.floor((o.hang - y) / DY); const want = R[j * NA + k] - (o.hangSlack ?? 0.004);
      if (r < want && r > 1e-4) { const f = want / r; q[i * 3] = C.x + (q[i * 3] - C.x) * f; q[i * 3 + 2] = C.z + (q[i * 3 + 2] - C.z) * f; } } }
  // shaping passes (a drape, loose sleeves) and extensions (a skirt carried down from the hem) supplied by the garment;
  // added vertices have no base vertex (verts = -1) and carry their own skin weights
  if (o.shape) o.shape({ h, K, F, q, n, idx, verts, isB, vIsl, bEdges });
  const wfix = new Map();
  if (o.extend) { const ex = o.extend({ h, K, F, q, n, idx, verts, isB, vIsl, bEdges });
    if (ex) { const m = ex.pos.length / 3, q2 = new Float32Array((n + m) * 3); q2.set(q); q2.set(ex.pos, n * 3); q = q2; idx = Uint32Array.from([...idx, ...ex.tris]);
      for (let i = 0; i < m; i++) { verts.push(-1); vIsl.push(ex.isl ? ex.isl[i] : 0); wfix.set(n + i, ex.w[i]); }
      n += m; ({ isB, bEdges } = openEdges(idx, n)); } }
  const normals = () => { const gn = new Float32Array(n * 3); const a = V(), b = V(), c = V();
    for (let f = 0; f < idx.length; f += 3) { a.fromArray(q, idx[f] * 3); b.fromArray(q, idx[f + 1] * 3); c.fromArray(q, idx[f + 2] * 3); const fn = b.sub(a).cross(c.sub(a));
      for (let k = 0; k < 3; k++) { const j = idx[f + k] * 3; gn[j] += fn.x; gn[j + 1] += fn.y; gn[j + 2] += fn.z; } }
    for (let i = 0; i < n; i++) { const l = Math.hypot(gn[i * 3], gn[i * 3 + 1], gn[i * 3 + 2]) || 1; gn[i * 3] /= l; gn[i * 3 + 1] /= l; gn[i * 3 + 2] /= l; } return gn; };
  let gn = normals();
  if (o.puff || o.wrinkle) { for (let i = 0; i < n; i++) { const p = V().fromArray(q, i * 3); let d = o.puff ? o.puff(p, verts[i]) : 0;
      if (o.wrinkle) d += o.wrinkle * (noise2(p.x * 23 + p.z * 31, p.y * 17) - 0.5) * (1 - isB[i] * 0.6);
      q[i * 3] += gn[i * 3] * d; q[i * 3 + 1] += gn[i * 3 + 1] * d; q[i * 3 + 2] += gn[i * 3 + 2] * d; } gn = normals(); }
  // UV islands in metres: the body as a cylinder round the hip axis, each sleeve round its arm (seams at the back)
  const armAx = {}; for (const s of ['L', 'R']) { const ax = F.wr[s].clone().sub(F.sh[s]).normalize(); const e1 = V(0, 0, 1).sub(ax.clone().multiplyScalar(ax.z)).normalize(); armAx[s] = { ax, e1, e2: ax.clone().cross(e1) }; }
  const R0 = 0.16, R1 = 0.05, circ = (isl) => TAU * (isl ? R1 : R0);
  const uvOf = (isl, i) => { const p = V().fromArray(q, i * 3); if (!isl) return [Math.atan2(p.x - F.hip.x, p.z - F.hip.z) * R0, p.y];
    const s = isl === 1 ? 'L' : 'R', A = armAx[s]; const d = p.sub(F.sh[s]); const t = d.dot(A.ax); d.sub(A.ax.clone().multiplyScalar(t)); return [Math.atan2(d.dot(A.e2), d.dot(A.e1)) * R1, -t]; };
  const pos = [], nrm = [], uv = [], src = [], out = [], vkey = new Map();
  const emit = (i, isl, u, w, nx, ny, nz, k) => { let j = vkey.get(k); if (j === undefined || k === null) { j = src.length; if (k !== null) vkey.set(k, j); pos.push(q[i * 3], q[i * 3 + 1], q[i * 3 + 2]); nrm.push(nx, ny, nz); uv.push(u, w); src.push(i); } return j; };
  for (let f = 0; f < idx.length; f += 3) {
    const t = [idx[f], idx[f + 1], idx[f + 2]], [ia, ib] = [vIsl[t[0]], vIsl[t[1]]]; const isl = (ia === ib || ia === vIsl[t[2]]) ? ia : ib;
    const uvs = t.map(i => uvOf(isl, i)); const us = uvs.map(x => x[0]); const wrap = Math.max(...us) - Math.min(...us) > circ(isl) / 2;
    for (let k = 0; k < 3; k++) { const wr = wrap && uvs[k][0] < 0 ? 1 : 0; out.push(emit(t[k], isl, uvs[k][0] + wr * circ(isl), uvs[k][1], gn[t[k] * 3], gn[t[k] * 3 + 1], gn[t[k] * 3 + 2], t[k] * 8 + isl * 2 + wr)); }
  }
  // edge thickness: a narrow band turned in from every open edge
  const th = o.rim ?? 0.003;
  if (th > 0) for (const e of bEdges) {
    const A = V().fromArray(q, e.a * 3), B = V().fromArray(q, e.b * 3), na = V().fromArray(gn, e.a * 3), nb2 = V().fromArray(gn, e.b * 3), Ot = V().fromArray(q, e.o * 3);
    const A2 = A.clone().addScaledVector(na, -th), B2 = B.clone().addScaledVector(nb2, -th);
    const fn = B.clone().sub(A).cross(A2.clone().sub(A)).normalize(); const inward = Ot.sub(A.clone().add(B).multiplyScalar(0.5)); const flip = fn.dot(inward) > 0; if (flip) fn.negate();
    const [ua] = uvOf(vIsl[e.a], e.a), base = src.length;
    for (const [P3, i] of [[A, e.a], [B, e.b], [B2, e.b], [A2, e.a]]) { pos.push(P3.x, P3.y, P3.z); nrm.push(fn.x, fn.y, fn.z); uv.push(ua, P3.y); src.push(i); }
    if (flip) out.push(base, base + 3, base + 2, base, base + 2, base + 1); else out.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('gpos', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(out);
  const near = skinNear(h, K), vw = Array.from({ length: n }, (_, i) => { const w = wfix.get(i) || near(q[i * 3], q[i * 3 + 1], q[i * 3 + 2], verts[i]); return o.boneMap ? mixW(w.map(([b, x]) => [o.boneMap(b), x]), [], 0) : w; });
  if (o.smoothW) { const { centres, radius, iters } = o.smoothW, adj = Array.from({ length: n }, () => new Set()), fw = new Float32Array(n);
    for (let f = 0; f < idx.length; f += 3) for (let k = 0; k < 3; k++) { adj[idx[f + k]].add(idx[f + (k + 1) % 3]); adj[idx[f + (k + 1) % 3]].add(idx[f + k]); }
    for (let i = 0; i < n; i++) { if (wfix.has(i)) continue; for (const c of centres) { const d = Math.hypot(q[i * 3] - c.x, q[i * 3 + 1] - c.y, q[i * 3 + 2] - c.z); if (d < radius) fw[i] = Math.max(fw[i], 0.5 + 0.5 * Math.cos(Math.PI * d / radius)); } }
    for (let it = 0; it < iters; it++) { const nxt = vw.slice(); for (let i = 0; i < n; i++) { if (!fw[i]) continue; const acc = []; for (const j of adj[i]) for (const e of vw[j]) acc.push([e[0], e[1] / adj[i].size]); nxt[i] = mixW(vw[i], mixW(acc, [], 0), 0.5 * fw[i]); } for (let i = 0; i < n; i++) vw[i] = nxt[i]; } }
  setSkin(g, src.length, (k) => vw[src[k]]);
  const mesh = skinnedMesh(h, g, o.mat, o.name || 'garment');
  const body = []; for (let i = 0; i < n; i++) if (!vIsl[i]) body.push(q[i * 3], q[i * 3 + 1], q[i * 3 + 2]);   // positions off the sleeves
  return { mesh, q, gn, verts, idx, isB, vIsl, n, body: Float32Array.from(body) };
}

// ------------------------------------------------------------------ fabrics
// pattern: GLSL run after the roughness/metalness setup, with vGpos = the garment's rest position (m) and the given uniforms
function fabric(color, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: o.roughness ?? 0.85, sheen: o.sheen ?? 0.5, sheenRoughness: o.sheenRoughness ?? 0.6, sheenColor: new THREE.Color(color).offsetHSL(0, -0.05, 0.12),
    normalMap: normalTex(o.normal || 'cloth', 1 / (o.tile || 0.05)), normalScale: new THREE.Vector2(o.ns ?? 0.4, o.ns ?? 0.4), side: THREE.DoubleSide,
    clearcoat: o.clearcoat || 0, clearcoatRoughness: o.clearcoatRoughness ?? 0.5, specularIntensity: o.spec ?? 0.5 });
  if (o.pattern) { const U = o.uniforms || {};
    m.onBeforeCompile = (sh) => { for (const k in U) sh.uniforms[k] = { value: U[k] };
      sh.vertexShader = 'attribute vec3 gpos;\nvarying vec3 vGpos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGpos = gpos;');
      sh.fragmentShader = 'varying vec3 vGpos;\n' + Object.keys(U).map(k => `uniform float ${k};`).join('\n') + '\n' + sh.fragmentShader.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + o.pattern); };
    const key = 'fab:' + o.pattern.length + ':' + Object.keys(U).join(','); m.customProgramCacheKey = () => key; }
  return m;
}
const BAND = (c, w, x) => `(1.0 - smoothstep(${w} - 0.0012, ${w} + 0.0012, abs(${x} - ${c})))`;
// cloth with a pattern (GLSL run once roughness is set: it may darken diffuseColor) and a bump (GLSL that adds to `hgt`, a
// height in metres, from which the normal is tilted per pixel, so folds and seams read without the geometry for them).
// In both: vGpos = rest position, vUv0 = uv, vEdge = the edgeD attribute (distances to edges, for topstitching), and
// lineAA(d, w), a line of width w where d = 0, filtered to the pixel. Uniforms may be numbers or Vector3s.
function clothMat(color, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: o.roughness ?? 0.85, sheen: o.sheen ?? 0.4, sheenRoughness: o.sheenRoughness ?? 0.6, sheenColor: new THREE.Color(color).offsetHSL(0, -0.05, 0.1),
    normalMap: normalTex(o.normal || 'cloth', 1 / (o.tile || 0.03)), normalScale: new THREE.Vector2(o.ns ?? 0.35, o.ns ?? 0.35), side: THREE.DoubleSide, specularIntensity: o.spec ?? 0.45 });
  const U = o.uniforms || {}, decl = Object.entries(U).map(([k, v]) => `uniform ${v && v.isVector3 ? 'vec3' : 'float'} ${k};`).join('\n');
  const lib = 'float lineAA(float d, float w) { float aa = max(fwidth(d), 1e-6); return clamp((0.5 * w + aa - abs(d)) / (2.0 * aa), 0.0, 1.0) * min(1.0, w / aa); }';
  m.onBeforeCompile = (sh) => { for (const k in U) sh.uniforms[k] = { value: U[k] };
    sh.vertexShader = 'attribute vec3 gpos;\nattribute vec2 edgeD;\nvarying vec3 vGpos;\nvarying vec2 vUv0;\nvarying vec2 vEdge;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGpos = gpos; vUv0 = uv; vEdge = edgeD;');
    sh.fragmentShader = 'varying vec3 vGpos;\nvarying vec2 vUv0;\nvarying vec2 vEdge;\n' + decl + '\n' + lib + '\n' + sh.fragmentShader
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n{\n' + (o.pattern || '') + '\n}')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ float hgt = 0.0;\n' + (o.bump || '') +
        '\n vec3 sp = -vViewPosition, sx = dFdx(sp), sy = dFdy(sp), R1 = cross(sy, normal), R2 = cross(normal, sx); float det = dot(sx, R1) * faceDirection;\n vec3 grad = sign(det) * (dFdx(hgt) * R1 + dFdy(hgt) * R2); normal = normalize(abs(det) * normal - grad); }'); };
  const key = 'cloth:' + (o.bump || '').length + ':' + (o.pattern || '').length + ':' + Object.keys(U).join(','); m.customProgramCacheKey = () => key;
  return m;
}

// a garment's neck opening: a ring round the base of the neck (the top of the shoulders is level with it, so only points
// close to the neck go), plus a scoop at the front of the given depth
function inNeck(F, p, o = {}) {
  const nk = F.neck, dx = p.x - nk.x, dz = p.z - nk.z;
  if (p.y > nk.y + 0.03) return true;
  if (p.y > nk.y - 0.025 && Math.hypot(dx, dz) < (o.r ?? 0.064)) return true;
  const depth = o.depth ?? 0.04, w = o.w ?? 0.075;
  return dz > 0 && Math.abs(dx) < w && p.y > nk.y - depth * (1 - (dx / w) ** 2);
}

// ------------------------------------------------------------------ vests
export function vest(h, K, kind, color) {
  const F = frame(h), tb = boneIdx(K, [...TORSO, 'neck01']), puffer = kind === 'puffer';
  const hem = F.hip.y + (puffer ? -0.03 : 0.0);
  // an oval round the arm root: from a strap about 4 cm in from the shoulder joint down to well below the armpit
  const armhole = (p) => ['L', 'R'].some(s => { const d = p.clone().sub(F.sh[s]); d.x -= Math.sign(F.sh[s].x - F.midX) * 0.04; d.y += 0.05; return (d.x / 0.05) ** 2 + (d.y / 0.115) ** 2 + (d.z / 0.105) ** 2 < 1; });
  const tris = pick(h, K, (v, p) => tb.has(K.swI[v * 4]) && p.y > hem && !inNeck(F, p, puffer ? { depth: 0.03 } : { depth: 0.075, w: 0.09 }) && !armhole(p));
  const ch = 0.072;   // quilted channels
  const U = { midX: F.midX, midZ: F.midZ, b1: F.chest - 0.03, b2: F.waist - 0.03, brace: 0.072, hem, ch };
  const mat = puffer
    ? fabric(color, { roughness: 0.4, sheen: 0.6, sheenRoughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.35, ns: 0.15, tile: 0.03, uniforms: U,
        pattern: `float zp = ${BAND('midX', 0.0035, 'vGpos.x')} * step(midZ, vGpos.z); float sp = abs(fract((vGpos.y - hem) / ch + 0.5) - 0.5) * ch;
          diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(0.0005, 0.006, sp));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03), zp); roughnessFactor = mix(roughnessFactor, 0.3, zp); metalnessFactor = mix(metalnessFactor, 0.7, zp);` })
    : fabric(color, { roughness: 0.62, sheen: 0.25, ns: 0.35, tile: 0.02, uniforms: U,
        pattern: `float side = abs(vGpos.x - midX); float hb = max(${BAND('b1', 0.022, 'vGpos.y')}, ${BAND('b2', 0.022, 'vGpos.y')});
          float vb = ${BAND('brace', 0.02, 'side')} * step(b1, vGpos.y); float r = max(hb, vb);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.6, 0.62, 0.64), r); roughnessFactor = mix(roughnessFactor, 0.3, r); metalnessFactor = mix(metalnessFactor, 0.5, r);` });
  if (!puffer) { mat.emissive = new THREE.Color(color).multiplyScalar(0.1); }
  const body = garment(h, K, tris, { soften: puffer ? 12 : 6, flatten: 0.007, gap: puffer ? 0.02 : 0.009, loose: puffer ? 0.07 : 0.04, iters: puffer ? 70 : 35, hang: puffer ? undefined : F.chest, mat, name: kind, rim: puffer ? 0.006 : 0.002, wrinkle: puffer ? 0 : 0.003,
    puff: puffer ? (p) => 0.016 * Math.pow(Math.abs(Math.sin((p.y - hem) * Math.PI / ch)), 0.38) + 0.003 : null });
  const parts = [body.mesh];
  if (puffer) parts.push(collar(h, K, body, mat, { height: 0.055, thick: 0.013, open: 0.012 }));
  return parts;
}

// a stand-up collar on a garment's neckline: a rounded band round the neck, open at the front
function collar(h, K, gar, mat, o) {
  const F = frame(h), nk = F.neck; const NA = 72, rad = new Float32Array(NA), yb = new Float32Array(NA).fill(-1e9);
  for (let i = 0; i < gar.verts.length; i++) { if (!gar.isB[i]) continue; const x = gar.q[i * 3] - nk.x, y = gar.q[i * 3 + 1], z = gar.q[i * 3 + 2] - nk.z; if (y < nk.y - 0.06 || Math.hypot(x, z) > 0.1) continue;
    const a = Math.atan2(x, z), k = Math.floor((a + Math.PI) / TAU * NA) % NA; rad[k] = Math.max(rad[k], Math.hypot(x, z)); yb[k] = Math.max(yb[k], y); }
  for (let pass = 0; pass < NA; pass++) for (let k = 0; k < NA; k++) if (!rad[k]) { const a = rad[(k + 1) % NA], b = rad[(k + NA - 1) % NA]; if (a || b) { rad[k] = Math.max(a, b); yb[k] = Math.max(yb[(k + 1) % NA], yb[(k + NA - 1) % NA]); } }
  const sm = (arr) => { const c = arr.slice(); for (let k = 0; k < NA; k++) arr[k] = (c[(k + NA - 2) % NA] + c[(k + NA - 1) % NA] + c[k] + c[(k + 1) % NA] + c[(k + 2) % NA]) / 5; };
  const med = [...rad].sort((x, y) => x - y)[NA >> 1]; for (let k = 0; k < NA; k++) { rad[k] = clamp(rad[k], med * 0.8, med * 1.25); }
  const ymed = [...yb].sort((x, y) => x - y)[NA >> 1]; for (let k = 0; k < NA; k++) yb[k] = clamp(yb[k], ymed - 0.03, ymed + 0.02);
  for (let s = 0; s < 3; s++) { sm(rad); sm(yb); }
  const at = (a) => { const f = ((a + Math.PI) / TAU * NA) % NA, k = Math.floor(f), u = f - k; return [lerp(rad[k], rad[(k + 1) % NA], u), lerp(yb[k], yb[(k + 1) % NA], u)]; };
  const NS = 64, PR = 14, pos = [], idx = [], wts = [];
  const nb = K.meta.bones.findIndex(b => b.name === 'neck01'), sb = K.meta.bones.findIndex(b => b.name === 'spine01');
  const gap = o.open / (at(0)[0] || 0.08);
  for (let i = 0; i <= NS; i++) { const a = gap + (i / NS) * (TAU - 2 * gap); const [r0, y0] = at(a); const dir = V(Math.sin(a), 0, Math.cos(a));
    for (let j = 0; j <= PR; j++) { const t = j / PR * TAU, c = Math.cos(t), sn = Math.sin(t);
      const ry = y0 - 0.012 + o.height * 0.5 * (1 + Math.sign(sn) * Math.pow(Math.abs(sn), 0.6));          // a rounded band (superellipse profile)
      const lean = clamp((ry - y0) / o.height, 0, 1) * 0.008;                                               // hugs the neck towards the top
      const rr = r0 - 0.002 + o.thick * 0.5 * (1 + Math.sign(c) * Math.pow(Math.abs(c), 0.6)) - lean;
      const p = V(nk.x, ry, nk.z).addScaledVector(dir, rr); pos.push(p.x, p.y, p.z); const up = clamp((ry - y0) / o.height, 0, 1) * 0.6; wts.push([[sb, 1 - up], [nb, up]]); } }
  for (let i = 0; i < NS; i++) for (let j = 0; j < PR; j++) { const a = i * (PR + 1) + j, b = a + PR + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const uv = []; for (let i = 0; i <= NS; i++) for (let j = 0; j <= PR; j++) uv.push(i / NS * TAU * 0.09, j / PR * 0.14); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('gpos', new THREE.Float32BufferAttribute(pos, 3)); setSkin(g, pos.length / 3, (i) => wts[i]);
  return skinnedMesh(h, g, mat, 'collar');
}

// ------------------------------------------------------------------ a skirt hung from the hips: at every angle it falls straight down
// (flaring a little) unless the legs push it out. o: top, bottom, a0/a1 (angular span, 0 = front; omit for a full loop),
// clear, flare, rTop(a) -> minimum radius at the top, folds, mat, name, rim
function hangSkirt(h, K, o) {
  const F = frame(h), C = F.hip, NA = 96, full = o.a0 === undefined; const G = extentGrid(h, K, C, o.bottom - 0.03, o.top + 0.03, NA, 0.006, 0.4);
  const G2 = o.over ? extentGrid({ P: new Float32Array(0), clothes: [] }, { bmap: [], swI: [], meta: K.meta, _limb: limbClass(K) }, C, o.bottom - 0.03, o.top + 0.03, NA, 0.006, 0.4, o.over) : null;   // a garment worn under this one
  const ext = (k, y) => Math.max(G.at(k, y) + o.clear, G2 ? G2.at(k, y) + (o.overClear ?? 0.003) : 0);
  const ring = (r, n) => { for (let s = 0; s < n; s++) { const c = r.slice(); for (let k = 0; k < NA; k++) r[k] = (c[(k + NA - 1) % NA] + 2 * c[k] + c[(k + 1) % NA]) / 4; } };
  const ang = (k) => (k + 0.5) / NA * TAU - Math.PI, rows = Math.max(6, Math.round((o.top - o.bottom) / 0.01)), R = [];
  let prev = new Float32Array(NA); for (let k = 0; k < NA; k++) prev[k] = Math.max(ext(k, o.top), o.rTop ? o.rTop(ang(k)) : 0); ring(prev, 3);
  for (let j = 0; j <= rows; j++) { const y = o.top - (o.top - o.bottom) * j / rows, r = new Float32Array(NA);
    for (let k = 0; k < NA; k++) r[k] = Math.max(prev[k] * (1 + (o.flare ?? 0.06) / rows), ext(k, y)); ring(r, 2); R.push(r); prev = r; }
  const radAt = (r, a) => { const f = ((a + Math.PI) / TAU * NA - 0.5 + NA) % NA, k = Math.floor(f), u = f - k; return lerp(r[k], r[(k + 1) % NA], u); };
  const NC = full ? NA : Math.max(8, Math.round((o.a1 - o.a0) / TAU * NA)); const aOf = (c) => full ? -Math.PI + c / NC * TAU : o.a0 + (o.a1 - o.a0) * c / NC;
  const bi = (n) => K.meta.bones.findIndex(b => b.name === n), rootB = bi('root'), lL = bi('upperleg01.L'), lR = bi('upperleg01.R');
  const pos = [], uv = [], wts = [], idx = [], W = (o.cols || 1);
  for (let j = 0; j <= rows; j++) { const y = o.top - (o.top - o.bottom) * j / rows, down = j / rows;
    for (let c = 0; c <= NC; c++) { const a = aOf(c); const fold = (o.folds ?? 0.007) * down * (Math.sin(a * 9 + 1.3) * 0.6 + (noise2(a * 2.4 + 3, 7.1) - 0.5) * 1.2);
      const rr = radAt(R[j], a) + fold; pos.push(C.x + Math.sin(a) * rr, y, C.z + Math.cos(a) * rr); uv.push(a * 0.16, y);
      const legW = 0.8 * smoothstep(0.15, 1, down), side = clamp(Math.sin(a) * rr / 0.09, -1, 1);
      wts.push([[rootB, 1 - legW], [lL, legW * (0.5 + 0.5 * side)], [lR, legW * (0.5 - 0.5 * side)]]); } }
  for (let j = 0; j < rows; j++) for (let c = 0; c < NC; c++) { const a = j * (NC + 1) + c, b = a + NC + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  // thickness along the open edges (the hem, and the sides of a partial panel)
  const th = o.rim ?? 0.003, edges = []; for (let c = 0; c < NC; c++) edges.push([rows * (NC + 1) + c, rows * (NC + 1) + c + 1]);
  if (!full) for (let j = 0; j < rows; j++) { edges.push([(j + 1) * (NC + 1), j * (NC + 1)]); edges.push([j * (NC + 1) + NC, (j + 1) * (NC + 1) + NC]); }
  for (const [a, b] of edges) { const A = V().fromArray(pos, a * 3), B = V().fromArray(pos, b * 3); const ra = V(A.x - C.x, 0, A.z - C.z).normalize(), rb = V(B.x - C.x, 0, B.z - C.z).normalize();
    const base = pos.length / 3; for (const [Pt, src, n] of [[A, a, null], [B, b, null], [B.clone().addScaledVector(rb, -th), b, 1], [A.clone().addScaledVector(ra, -th), a, 1]]) { pos.push(Pt.x, Pt.y, Pt.z); uv.push(uv[src * 2], uv[src * 2 + 1]); wts.push(wts[src]); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  if (full) { const nr = g.attributes.normal; for (let j = 0; j <= rows; j++) { const a = j * (NC + 1), b = a + NC; const m = V(nr.getX(a) + nr.getX(b), nr.getY(a) + nr.getY(b), nr.getZ(a) + nr.getZ(b)).normalize(); nr.setXYZ(a, m.x, m.y, m.z); nr.setXYZ(b, m.x, m.y, m.z); } }
  g.setAttribute('gpos', new THREE.Float32BufferAttribute(pos, 3)); setSkin(g, pos.length / 3, (i) => wts[i]);
  return skinnedMesh(h, g, o.mat, o.name || 'skirt');
}
// rest positions of a skinned mesh (for fitting another layer over it)
const skirtTop = (m) => Array.from(m.geometry.attributes.gpos.array);
// radius per angle (about the hip axis) of a set of positions between two heights
function bandRadius(h, pts, y0, y1) {
  const C = frame(h).hip, NA = 96, r = new Float32Array(NA);
  for (let i = 0; i < pts.length; i += 3) { const y = pts[i + 1]; if (y < y0 || y > y1) continue; const dx = pts[i] - C.x, dz = pts[i + 2] - C.z; const k = Math.floor((Math.atan2(dx, dz) + Math.PI) / TAU * NA) % NA; r[k] = Math.max(r[k], Math.hypot(dx, dz)); }
  for (let pass = 0; pass < NA; pass++) for (let k = 0; k < NA; k++) if (!r[k]) r[k] = Math.max(r[(k + 1) % NA], r[(k + NA - 1) % NA]);
  return (a) => { const f = ((a + Math.PI) / TAU * NA - 0.5 + NA) % NA, k = Math.floor(f), u = f - k; return lerp(r[k], r[(k + 1) % NA], u); };
}

// ------------------------------------------------------------------ lab coat: notched lapels and collar, buttoned to the thigh, long loose sleeves, skirt to the knee
// The body rests on the shoulders and upper chest and hangs straight from the bust and the shoulder blades; past the cap
// the sleeves are loose tubes; the skirt is the hem carried down (one surface, no waist seam). Lapels, collar, patch
// pockets, buttons and pens lie on the coat and take its skin weights, so they move with it; the shirt underneath is
// hidden wherever the coat covers it.
export function labCoat(h, K, color = '#f2f2ec') {
  const F = frame(h), sc = F.hip.y / 0.84, tb = boneIdx(K, [...TORSO, 'neck01']), aL = boneIdx(K, ARM.L), aR = boneIdx(K, ARM.R), thigh = boneIdx(K, ['upperleg01.L', 'upperleg01.R', 'upperleg02.L', 'upperleg02.R']);
  const yBtn = F.chest - 0.03, yT = F.neck.y - 0.028, xt = 0.064, hemY = F.hip.y - 0.016, bottom = F.knee + 0.07;
  const vRoll = (y) => lerp(0.004, xt, clamp((y - yBtn) / (yT - yBtn), 0, 1.3)), vCut = (y) => vRoll(y) + 0.012 * smoothstep(yBtn, yBtn + 0.03, y);
  const sleeveOK = (p, s) => p.clone().sub(F.sh[s]).dot(F.wr[s].clone().sub(F.sh[s]).normalize()) < F.wr[s].distanceTo(F.sh[s]) - 0.012;
  const side = (v) => aL.has(K.swI[v * 4]) ? 1 : aR.has(K.swI[v * 4]) ? 2 : 0;
  const upper = pick(h, K, (v, p) => { const s = side(v), b = K.swI[v * 4]; if (!s && !tb.has(b) && !thigh.has(b)) return false; if (s && !sleeveOK(p, s === 1 ? 'L' : 'R')) return false;
    return p.y > (s ? F.hip.y - 0.3 : hemY) && !inNeck(F, p, { depth: 0.02, r: 0.072 }) && !(p.z > F.midZ && p.y > yBtn - 0.004 && Math.abs(p.x - F.midX) < vCut(p.y)); });
  // it hangs from the bust (or chest) in front and from the shoulder blades behind
  // the shirt underneath only shows through the opening, round the neck and at the cuffs
  hideUnder(h, (x, y, z) => { if (y < hemY - 0.01) return false;
    if (z > F.midZ && y > yBtn - 0.012 && Math.abs(x - F.midX) < vRoll(y) + 0.009) return false;
    if (y > yT - 0.012 && Math.hypot(x - F.neck.x, z - F.neck.z) < 0.085) return false;
    for (const s of ['L', 'R']) if (Math.hypot(x - F.wr[s].x, y - F.wr[s].y, z - F.wr[s].z) < 0.085) return false;
    return true; });
  const nip = nipples(h, K), yFront = (nip.length ? Math.max(...nip.map(p => p.y)) : F.chest + 0.1) + 0.06, yBack = F.chest + 0.19 * sc, yHang = (a) => lerp(yFront, yBack, smoothstep(1.2, 2.2, Math.abs(a)));
  // cotton twill: drape folds from where it hangs, folds at the elbows and cuffs, seams and topstitching
  const ax = { L: F.wr.L.clone().sub(F.sh.L).normalize(), R: F.wr.R.clone().sub(F.sh.R).normalize() }, tEnd = F.wr.L.distanceTo(F.sh.L) - 0.012;
  const U = { midX: F.midX, cx: F.hip.x, cz: F.hip.z, yBtn, hem: bottom, hipY: F.hip.y, yTopF: yFront, yTopB: yBack, shY: F.sh.L.y, shZ: F.sh.L.z, shX: Math.abs(F.sh.L.x - F.midX),
    armY: F.sh.L.y - 0.1 * sc, neckY: F.neck.y, tE: F.el.L.clone().sub(F.sh.L).dot(ax.L), tEnd, shL: F.sh.L.clone(), shR: F.sh.R.clone(), axL: ax.L, axR: ax.R };
  const COMMON = `bool sleeve = vUv0.y < 0.3; vec3 g = vGpos; float dxm = g.x - midX; vec2 rc = g.xz - vec2(cx, cz); float a = atan(rc.x, rc.y), r = length(rc);
    vec3 eL = g - shL, eR = g - shR; float ah = lineAA(dot(eL, axL) - 0.012, 0.0011) * step(length(eL - axL * dot(eL, axL)), 0.075) + lineAA(dot(eR, axR) - 0.012, 0.0011) * step(length(eR - axR * dot(eR, axR)), 0.075);`;
  const mat = clothMat(color, { roughness: 0.84, sheen: 0.4, ns: 0.3, tile: 0.025, uniforms: U,
    pattern: COMMON + `
    float dash = step(0.45, fract((g.x + g.y + g.z) * 230.0)), dark = ah * 0.5, st = 0.0;
    if (!sleeve) { float front = step(cz + 0.02, g.z);
      dark = max(dark, lineAA(dxm + 0.014, 0.0012) * step(g.y, yBtn - 0.006) * front * 0.6);                    // the top panel's front edge
      st = max(st, lineAA(dxm + 0.0075, 0.00045) * step(g.y, yBtn - 0.012) * front);                              // its topstitching
      st = max(st, lineAA(g.y - (hem + 0.022), 0.00045));                                                         // hem topstitching
      dark = max(dark, lineAA((abs(a) - 1.64) * r, 0.0011) * step(g.y, armY) * 0.45);                               // side seams
      dark = max(dark, lineAA((3.14159 - abs(a)) * r, 0.0011) * step(g.y, neckY - 0.03) * 0.4);                     // centre back seam
      dark = max(dark, lineAA((3.14159 - abs(a)) * r - 0.003, 0.0016) * step(g.y, hem + 0.24) * 0.75);              // the back vent
      dark = max(dark, lineAA(g.z - shZ - 0.004, 0.001) * step(shY - 0.03, g.y) * step(0.05, abs(dxm)) * step(abs(dxm), shX + 0.03) * 0.45);   // shoulder seams
    } else { float t = -vUv0.y, ph = vUv0.x / 0.05, sd = dxm > 0.0 ? 1.0 : -1.0;
      dark = max(dark, lineAA((ph - sd * 1.5708) * 0.055, 0.0011) * 0.45);                                        // underarm seam
      st = max(st, lineAA(t - (tEnd - 0.022), 0.00045)); }                                                        // cuff topstitching
    diffuseColor.rgb *= 1.0 - 0.35 * dark - 0.14 * st * dash;`,
    bump: COMMON + `
    if (!sleeve) { float yTop = mix(yTopF, yTopB, smoothstep(1.2, 2.2, abs(a))), hangW = smoothstep(yTop, yTop - 0.22, g.y), skW = smoothstep(hipY, hem, g.y);
      float f = 0.55 * sin(a * 7.0 + 1.3 + 0.9 * sin(g.y * 6.0 + a * 2.0)) + 0.25 * sin(a * 13.0 + 2.1 + g.y * 4.0) + 0.35 * sin(a * 4.0 + 0.4 - g.y * 2.5);
      hgt += (0.0026 * hangW + 0.0024 * skW) * f;
      hgt += 0.0012 * smoothstep(-0.0152, -0.0128, dxm) * (1.0 - smoothstep(0.01, 0.04, dxm)) * smoothstep(yBtn - 0.004, yBtn - 0.02, g.y) * smoothstep(cz, cz + 0.04, g.z);   // the top panel stands proud of the one under it (faded, never stepped: a step in hgt draws a line)
    } else { float t = -vUv0.y, ph = vUv0.x / 0.05, inner = 0.5 + 0.5 * cos(ph);
      float ew = exp(-pow((t - tE) / 0.045, 2.0)) * inner * inner;                                                // the inside of the elbow
      hgt += 0.0019 * ew * sin(t * 165.0 + 3.0 * sin(ph * 1.7 + t * 23.0) + 1.3 * sin(ph * 4.3)) * (0.6 + 0.4 * sin(ph * 2.9 + t * 40.0));
      hgt += 0.0011 * smoothstep(0.08, 0.2, t) * (sin(ph * 3.0 + t * 11.0 + 0.7) + 0.5 * sin(ph * 2.0 - t * 17.0 + 2.3));   // drape spiralling down the sleeve
      hgt += 0.0012 * exp(-pow((t - tEnd + 0.045) / 0.035, 2.0)) * sin(ph * 5.0 + 1.0 + t * 30.0) * (0.5 + 0.5 * cos(ph * 2.0 + 0.6)); }   // bunching at the cuff
    hgt += 0.0005 * ah;` });
  // lapels, collar and pockets: topstitched a little in from their edges
  const trim = clothMat(color, { roughness: 0.84, sheen: 0.4, ns: 0.3, tile: 0.025,
    pattern: `float dash = step(0.45, fract((vGpos.x + vGpos.y + vGpos.z) * 230.0)); diffuseColor.rgb *= 1.0 - 0.14 * dash * max(lineAA(vEdge.x - 0.0055, 0.00045), lineAA(vEdge.y - 0.016, 0.00045));`,
    bump: `hgt += 0.0006 * smoothstep(0.0, 0.005, vEdge.x);` });
  const armpits = ['L', 'R'].map(s => F.sh[s].clone().add(V(Math.sign(F.midX - F.sh[s].x) * 0.02, -0.05, 0)));
  const coat = garment(h, K, upper, { gap: (v) => (side(v) ? 0.009 : 0.009), give: 0.5, loose: 0.008, iters: 40, soften: 10, nipSmooth: 0.05, mat, name: 'labcoat', island: side, rim: 0.0022,
    smoothW: { centres: armpits, radius: 0.14 * sc, iters: 12 }, boneMap: (() => { const nb = boneIdx(K, ['neck01', 'neck02', 'neck03', 'head']), sp = K.meta.bones.findIndex(b => b.name === 'spine01'); return (b) => (nb.has(b) ? sp : b); })(),
    shape: (ctx) => { if (!DBG.includes('nodrape')) drapeHang(ctx, { C: F.hip, bottom: hemY - 0.03, top: yHang, blend: 0.06, flare: 0.1, skim: 0.008 }); if (!DBG.includes('notube')) { sleeveTube(ctx, 'L', 1, { top: 0.17 * sc }); sleeveTube(ctx, 'R', 2, { top: 0.17 * sc }); } },
    extend: (ctx) => DBG.includes('noskirt') ? null : hemSkirt(ctx, { C: F.hip, bottom, clear: 0.022, flare: 0.12, folds: 0.009 }) });
  if (DBG.includes('wire')) mat.wireframe = true;
  if (DBG.includes('normals')) coat.mesh.material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
  const parts = [coat.mesh], W = weightsFrom(coat.mesh), RF = radialField(coat, F.hip, bottom - 0.01, F.neck.y + 0.05);
  const attach = (pos, idx, uv, name, ed = null, m = trim) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('edgeD', new THREE.Float32BufferAttribute(ed || new Array(pos.length / 3 * 2).fill(1), 2)); g.setIndex(idx); g.computeVertexNormals(); g.setAttribute('gpos', new THREE.Float32BufferAttribute(pos, 3)); setSkin(g, pos.length / 3, (i) => W(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])); parts.push(skinnedMesh(h, g, m, name)); };
  const grid = (rows, cols, idx, base = 0, closeCols = false) => { const nc = cols; for (let j = 0; j < rows - 1; j++) for (let i = 0; i < (closeCols ? nc : nc - 1); i++) { const a = base + j * nc + i, b = base + j * nc + (i + 1) % nc, c = a + nc, d = base + (j + 1) * nc + (i + 1) % nc; idx.push(a, b, d, a, d, c); } };

  // lapels: each folds back along a straight roll line from the top button to the side of the neck and lies on the coat,
  // widening to the lapel point, after which the gorge runs back up to the roll line. A fold at the roll line; under it the
  // facing reaches back beneath the coat's cut edge; a thin edge all round.
  { const pos = [], uv = [], idx = [], ed = [];
    for (const sg of [1, -1]) {
      const B = [F.midX + sg * 0.004, yBtn - 0.004], T = [F.midX + sg * xt, yT], Lr = Math.hypot(T[0] - B[0], T[1] - B[1]), d = [(T[0] - B[0]) / Lr, (T[1] - B[1]) / Lr], nn = [sg * d[1], -sg * d[0]];
      const up = 0.8, wl = (u) => Math.max(0.004, 0.072 * sc * (u < up ? u / up : (1 - u) / (1 - up)));
      const NU = 44, sec = (w, u) => { const fw = 0.004 + 0.032 * (1 - smoothstep(0.7, 0.97, u)), c = [[fw, -0.0018], [Math.min(0.02, fw * 0.6), -0.0015], [Math.min(0.008, fw * 0.3), -0.0012]]; for (let k = 0; k <= 6; k++) { const ph = k / 6 * Math.PI; c.push([0.0015 - Math.sin(ph) * 0.0017, 0.0009 - Math.cos(ph) * 0.0017]); }
        for (let k = 1; k <= 9; k++) c.push([0.0015 + (w - 0.0015) * k / 9, 0.0026]); c.push([w, 0.0003]); return c; };
      const base = pos.length / 3, NC = sec(0.05, 0).length;
      for (let i = 0; i <= NU; i++) { const u = i / NU, rx = B[0] + d[0] * u * Lr, ry = B[1] + d[1] * u * Lr, w = wl(u);
        for (const [dist, off] of sec(w, u)) { const p = RF.onFront(rx + nn[0] * dist, ry + nn[1] * dist, off); pos.push(p.x, p.y, p.z); uv.push(u * Lr, dist + off); ed.push(off > 0.002 ? w - dist : 1, 1); } }
      grid(NU + 1, NC, idx, base);
    }
    attach(pos, idx, uv, 'labcoat-lapels', ed); }

  // collar: a stand round the back of the neck from one lapel's top to the other's, rolling over into a fall that lies on
  // the coat's yoke a little below the neckline; the notch is the gap between the fall's end and the lapel's gorge
  { const nk = F.neck, NB = 120, rad = new Float32Array(NB), yb = new Float32Array(NB).fill(-1e9);
    for (let i = 0; i < coat.n; i++) { if (!coat.isB[i] || coat.vIsl[i]) continue; const x = coat.q[i * 3] - nk.x, y = coat.q[i * 3 + 1], z = coat.q[i * 3 + 2] - nk.z, r = Math.hypot(x, z); if (y < nk.y - 0.08 || r > 0.11) continue;
      const k = Math.min(NB - 1, Math.floor((Math.atan2(x, z) + Math.PI) / TAU * NB)); if (y > yb[k]) { yb[k] = y; rad[k] = r; } }
    for (let pass = 0; pass < NB; pass++) for (let k = 0; k < NB; k++) if (!rad[k]) { const a = (k + 1) % NB, b = (k + NB - 1) % NB; if (rad[a] || rad[b]) { const s = [a, b].filter(j => rad[j]); rad[k] = s.reduce((t, j) => t + rad[j], 0) / s.length; yb[k] = s.reduce((t, j) => t + yb[j], 0) / s.length; } }
    for (let k = 0; k < NB; k++) yb[k] = Math.min(yb[k], nk.y + 0.004);
    for (let s = 0; s < 4; s++) for (const A of [rad, yb]) { const c = A.slice(); for (let k = 0; k < NB; k++) A[k] = (c[(k + NB - 2) % NB] + c[(k + NB - 1) % NB] + c[k] + c[(k + 1) % NB] + c[(k + 2) % NB]) / 5; }
    const ring = (A, a) => { const f = ((a + Math.PI) / TAU * NB - 0.5 + 2 * NB) % NB, k = Math.floor(f), u = f - k; return lerp(A[k], A[(k + 1) % NB], u); };
    const SF = sphereField(coat, V(nk.x, nk.y - 0.14 * sc, nk.z)), polar = (a, r, y) => V(nk.x + Math.sin(a) * r, y, nk.z + Math.cos(a) * r);
    const TL = RF.onFront(F.midX + xt, yT, 0.0026), TR = RF.onFront(F.midX - xt, yT, 0.0026), aLt = Math.atan2(TL.x - nk.x, TL.z - nk.z), aRt = Math.atan2(TR.x - nk.x, TR.z - nk.z) + TAU;
    const NS = 72, pos = [], uv = [], idx = [], ed = []; let NC = 0;
    for (let i = 0; i <= NS; i++) { const a = lerp(aLt, aRt, i / NS), e = Math.min(a - aLt, aRt - a), be = 1 - smoothstep(0, 0.95, e), b2 = be * be, T3 = a < Math.PI ? TL : TR;
      const ra = ring(rad, a), ya = ring(yb, a), hs = lerp(0.025, 0.005, be) * sc, rT = Math.hypot(T3.x - nk.x, T3.z - nk.z);
      const rr = lerp(ra - 0.006, rT, b2), yr = lerp(ya + hs, T3.y + 0.002, b2), Nn = polar(a, lerp(ra, rT, b2), lerp(ya, T3.y - 0.004, b2));
      const fall = SF.down(a, SF.elev(Nn), lerp(0.017, 0.03, be) * sc), E = fall.p.addScaledVector(SF.normal(a, fall.e), 0.0026), En = SF.normal(a, fall.e);
      const c0 = polar(a, lerp(ra - 0.002, rT, b2), lerp(ya - 0.006, T3.y - 0.004, b2)), c2 = polar(a, rr, yr), c4 = polar(a, rr + 0.0055, yr + 0.0016);
      const Q = polar(a, lerp(ra + 0.011, rT + 0.012, b2), lerp(ya + hs * 0.55, T3.y, b2));
      const sec = [c0, c0.clone().lerp(c2, 0.5), c2, polar(a, rr + 0.0024, yr + 0.0028), c4];
      for (let k = 1; k <= 8; k++) { const t = k / 8; sec.push(c4.clone().multiplyScalar((1 - t) ** 2).addScaledVector(Q, 2 * t * (1 - t)).addScaledVector(E, t * t)); }
      sec.push(E.clone().addScaledVector(En, -0.0022));
      NC = sec.length; let acc = 0; const toE = sec.map((p, k) => (k >= 4 ? sec.slice(k, -1).reduce((t, q, j, arr) => t + (j ? q.distanceTo(arr[j - 1]) : 0), 0) : 1));
      sec.forEach((p, k) => { if (k) acc += p.distanceTo(sec[k - 1]); pos.push(p.x, p.y, p.z); uv.push(a * 0.07, acc); ed.push(toE[k], 1); }); }
    grid(NS + 1, NC, idx);
    for (const r0i of [0, NS]) { const base = r0i * NC, cap = pos.length / 3; let cx = 0, cy = 0, cz = 0; for (let k = 0; k < NC; k++) { cx += pos[(base + k) * 3] / NC; cy += pos[(base + k) * 3 + 1] / NC; cz += pos[(base + k) * 3 + 2] / NC; }
      pos.push(cx, cy, cz); uv.push(0, 0); ed.push(1, 1); for (let k = 0; k < NC - 1; k++) idx.push(cap, base + k, base + k + 1); }
    if (!DBG.includes('nocollar')) attach(pos, idx, uv, 'labcoat-collar', ed); }

  // patch pockets: a panel lying on the coat, rounded at the bottom corners, its mouth gaping a little, edges with thickness
  const pocket = (aC, yb, yt, hw, gapeAmt, name, full = false) => { const NI = 16, NJ = 18, cr = 0.012, pos = [], uv = [], idx = [], ed = [], H = yt - yb;
    for (let j = 0; j <= NJ; j++) for (let i = 0; i <= NI; i++) { let su = (i / NI * 2 - 1) * hw, sv = j / NJ * H; const cx = hw - cr, ax = Math.abs(su);
      if (ax > cx && sv < cr) { const dx = ax - cx, dy = sv - cr, dl = Math.hypot(dx, dy); if (dl > cr) { su = Math.sign(su) * (cx + dx * cr / dl); sv = cr + dy * cr / dl; } }
      const y = yb + sv, a = aC + su / RF.at(y, aC), gape = gapeAmt * (1 - (su / hw) ** 2) * (full ? 0.55 + 0.45 * smoothstep(0.3, 1, sv / H) : smoothstep(0.7, 1, sv / H));
      const p = RF.point(a, y).addScaledVector(RF.normal(a, y), 0.0022 + gape); pos.push(p.x, p.y, p.z); uv.push(su, sv); ed.push(Math.min(hw - Math.abs(su), sv), H - sv); }
    grid(NJ + 1, NI + 1, idx);
    const loop = []; for (let j = NJ; j > 0; j--) loop.push(j * (NI + 1)); for (let i = 0; i < NI; i++) loop.push(i); for (let j = 0; j < NJ; j++) loop.push(j * (NI + 1) + NI); for (let i = NI; i > 0; i--) loop.push(NJ * (NI + 1) + i);
    const nv = pos.length / 3; for (const i of loop) { const y = pos[i * 3 + 1], a = Math.atan2(pos[i * 3] - F.hip.x, pos[i * 3 + 2] - F.hip.z), nr = RF.normal(a, y); pos.push(pos[i * 3] - nr.x * 0.002, y - nr.y * 0.002, pos[i * 3 + 2] - nr.z * 0.002); uv.push(uv[i * 2], uv[i * 2 + 1]); ed.push(0, 1); }
    for (let k = 0; k < loop.length; k++) { const a = loop[k], b = loop[(k + 1) % loop.length], a2 = nv + k, b2 = nv + (k + 1) % loop.length; idx.push(a, a2, b2, a, b2, b); }
    attach(pos, idx, uv, name, ed); };
  const yP = hemY - 0.035 * sc; for (const sg of [1, -1]) pocket(RF.angleAtX(F.midX + sg * 0.112 * sc, yP - 0.1 * sc), yP - 0.19 * sc, yP, 0.08 * sc, 0.004, 'labcoat-pocket');
  const bpX = F.midX + 0.115 * sc, bpTop = yBtn + 0.1 * sc, bpA = RF.angleAtX(bpX, bpTop - 0.06 * sc); pocket(bpA, yBtn - 0.025 * sc, bpTop, 0.05 * sc, 0.011, 'labcoat-pocket', true);

  // two pens in the breast pocket, clipped over its edge
  { const penM = [new THREE.MeshPhysicalMaterial({ color: '#1d2a4a', roughness: 0.35, clearcoat: 0.6 }), new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.3, clearcoat: 0.5 })];
    const clipM = new THREE.MeshPhysicalMaterial({ color: '#c9ccd0', metalness: 1, roughness: 0.3 });
    [[-0.019, 0, 0.034], [0.006, 1, 0.026]].forEach(([dx, kind, out]) => { const a = bpA + dx * sc / RF.at(bpTop, bpA), p0 = RF.point(a, bpTop), nr = RF.normal(a, bpTop), upv = RF.point(a, bpTop + 0.01).sub(RF.point(a, bpTop - 0.01)).normalize();
      const at = (s, off) => p0.clone().addScaledVector(upv, s).addScaledVector(nr, off);
      const body = new THREE.CylinderGeometry(0.0037, 0.0037, out + 0.012, 18, 1); body.translate(0, (out - 0.012) / 2, 0); const capG = new THREE.CylinderGeometry(0.0042, 0.0042, 0.032, 18, 1); capG.translate(0, out - 0.016 + 0.002, 0);
      const tip = new THREE.SphereGeometry(0.0042, 16, 8, 0, TAU, 0, Math.PI / 2); tip.translate(0, out + 0.002, 0);
      const clip = new THREE.BoxGeometry(0.0022, 0.034, 0.0009); clip.translate(0, out - 0.017, 0.0053);
      const M4 = new THREE.Matrix4().makeBasis(upv.clone().cross(nr).normalize(), upv, nr).setPosition(at(0, 0.0052));
      for (const [g, m, nm] of [[body, penM[kind], 'pen'], [capG, penM[1], 'pen-cap'], [tip, penM[1], 'pen-cap'], [clip, clipM, 'pen-clip']]) { g.applyMatrix4(M4); const pp = Array.from(g.attributes.position.array);
        const gg = g.toNonIndexed ? g : g; gg.setAttribute('gpos', gg.attributes.position.clone()); setSkin(gg, pp.length / 3, (i) => W(pp[i * 3], pp[i * 3 + 1], pp[i * 3 + 2])); parts.push(skinnedMesh(h, gg, m, nm)); } }); }

  // buttons down the top panel, just in from its edge
  { const bm = new THREE.MeshPhysicalMaterial({ color: '#e6e2d6', roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    const prof = [[0, 0.0016], [0.004, 0.0015], [0.0062, 0.0011], [0.0072, 0.0004], [0.0072, -0.0006], [0.0, -0.0006]].map(([r, y]) => new THREE.Vector2(r, y));
    for (let k = 0; k < 6; k++) { const y = yBtn - 0.012 - k * 0.1 * sc; if (y < hemY - 0.22 * sc) break; const a = RF.angleAtX(F.midX - 0.002, y), p = RF.point(a, y), nr = RF.normal(a, y);
      const g = new THREE.LatheGeometry(prof, 20); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), nr)); g.translate(p.x + nr.x * 0.0012, p.y + nr.y * 0.0012, p.z + nr.z * 0.0012);
      const pp = Array.from(g.attributes.position.array); g.setAttribute('gpos', g.attributes.position.clone()); setSkin(g, pp.length / 3, (i) => W(pp[i * 3], pp[i * 3 + 1], pp[i * 3 + 2])); parts.push(skinnedMesh(h, g, bm, 'button')); } }

  return parts;
}
// hide whatever a garment covers of the clothes worn under it (those triangles could only ever poke through it)
function hideUnder(h, covered) {
  for (const m of h.meshes) { if (!(h.clothes || []).some(c => c.key === m.name) || /^shoes/.test(m.name)) continue;
    const g = m.geometry, ce = h.clothes.find(c => c.key === m.name), p = ce ? ce.pos : g.attributes.position.array, ix = g.index.array, groups = g.groups.length ? g.groups.map(x => ({ ...x })) : null, out = [], ng = [];
    const cov = new Uint8Array(p.length / 3); for (let i = 0; i < cov.length; i++) cov[i] = covered(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]) ? 1 : 0;
    for (const gr of groups || [{ start: 0, count: ix.length, materialIndex: 0 }]) { const s0 = out.length;
      for (let f = gr.start; f < gr.start + gr.count; f += 3) if (!(cov[ix[f]] && cov[ix[f + 1]] && cov[ix[f + 2]])) out.push(ix[f], ix[f + 1], ix[f + 2]);
      ng.push({ start: s0, count: out.length - s0, materialIndex: gr.materialIndex }); }
    g.setIndex(out); if (groups) { g.clearGroups(); for (const gr of ng) g.addGroup(gr.start, gr.count, gr.materialIndex); }
    if (ce) ce.idx = g.index.array; }
  h._env = null;
}

// ------------------------------------------------------------------ a panel resting on the front of the body (bibs): a height field
// over x,y that sits outside the front-most skin or clothing, tented and smoothed so it lies flat across hollows.
// o: bottom, top, halfW(y), clear, slope, mat, name
function frontPanel(h, K, o) {
  const F = frame(h), P = h.P, LC = limbClass(K), hb = K.meta.bones.findIndex(b => b.name === 'head'); const D = 0.005;
  const x0 = F.midX - 0.3, nx = Math.ceil(0.6 / D) + 1, y0 = o.bottom - 0.03, ny = Math.ceil((o.top - o.bottom + 0.06) / D) + 1;
  const zf = new Float32Array(nx * ny).fill(-1e9), src = new Int32Array(nx * ny).fill(-1);
  const put = (x, y, z, v) => { const i = Math.round((x - x0) / D), j = Math.round((y - y0) / D); if (i < 0 || j < 0 || i >= nx || j >= ny || z < F.midZ) return; const k = j * nx + i; if (z > zf[k]) { zf[k] = z; if (v >= 0) src[k] = v; } };
  for (let i = 0; i < K.bmap.length; i++) { const v = K.bmap[i], b = K.swI[v * 4]; if (b === hb || LC[b]) continue; put(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], v); }
  const reach = Math.max(o.halfW(o.bottom), o.halfW(o.top)) + 0.03;
  for (const c of h.clothes || []) { if (/^shoes/.test(c.key)) continue; const p = c.pos; for (let i = 0; i < p.length; i += 3) if (Math.abs(p[i] - F.midX) < reach) put(p[i], p[i + 1], p[i + 2], -1); }
  for (let pass = 0; pass < 40; pass++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; if (zf[k] > -1e8) continue;   // fill holes from neighbours
    let m = -1e9, sv = -1; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const kk = jj * nx + ii; if (zf[kk] > m) { m = zf[kk]; sv = src[kk]; } } if (m > -1e8) { zf[k] = m; src[k] = sv; } }
  const lo = Float32Array.from(zf, z => z + o.clear), zz = lo.slice();
  for (let it = 0; it < 60; it++) { const c = zz.slice(); for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const k = j * nx + i;   // tent + relax, never inside
    const avg = (c[k - 1] + c[k + 1] + c[k - nx] + c[k + nx]) / 4, mx = Math.max(c[k - 1], c[k + 1], c[k - nx], c[k + nx]) - (o.slope ?? 0.25) * D; zz[k] = Math.max(lo[k], mx, lerp(c[k], avg, 0.6)); } }
  const zAt = (x, y) => { const fx = (x - x0) / D, fy = (y - y0) / D, i = clamp(Math.floor(fx), 0, nx - 2), j = clamp(Math.floor(fy), 0, ny - 2), u = fx - i, w = fy - j;
    return lerp(lerp(zz[j * nx + i], zz[j * nx + i + 1], u), lerp(zz[(j + 1) * nx + i], zz[(j + 1) * nx + i + 1], u), w); };
  const srcAt = (x, y) => { const i0 = Math.round((x - x0) / D), j0 = Math.round((y - y0) / D); for (let r = 0; r < 20; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue; if (src[j * nx + i] >= 0) return src[j * nx + i]; } return 0; };
  const NU = 28, NV = Math.max(10, Math.round((o.top - o.bottom) / 0.012)), pos = [], uv = [], ws = [], idx = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const y = lerp(o.bottom, o.top, j / NV), x = F.midX + (i / NU * 2 - 1) * o.halfW(y); pos.push(x, y, zAt(x, y)); uv.push(x, y); ws.push(baseSkin(K, srcAt(x, y))); }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  // edge thickness all round
  const ring = []; for (let i = 0; i < NU; i++) ring.push([i, i + 1]); for (let j = 0; j < NV; j++) ring.push([j * (NU + 1) + NU, (j + 1) * (NU + 1) + NU]);
  for (let i = NU; i > 0; i--) ring.push([NV * (NU + 1) + i, NV * (NU + 1) + i - 1]); for (let j = NV; j > 0; j--) ring.push([j * (NU + 1), (j - 1) * (NU + 1)]);
  const th = 0.0025; for (const [a, b] of ring) { const base = pos.length / 3; for (const [k, dz] of [[a, 0], [b, 0], [b, -th], [a, -th]]) { pos.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2] + dz); uv.push(uv[k * 2], uv[k * 2 + 1]); ws.push(ws[k]); } idx.push(base, base + 2, base + 1, base, base + 3, base + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('gpos', new THREE.Float32BufferAttribute(pos, 3)); setSkin(g, pos.length / 3, (i) => ws[i]);
  return { mesh: skinnedMesh(h, g, o.mat, o.name || 'panel'), corner: (sd) => { const k = NV * (NU + 1) + (sd > 0 ? NU : 0); return V(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); } };
}

// ------------------------------------------------------------------ apron: bib panel, skirt panel, waist tie, neck strap round the back
export function apron(h, K, color, o = {}) {
  const F = frame(h); const mat = fabric(color, { roughness: 0.9, sheen: 0.3, normal: 'cloth', ns: 0.45, tile: 0.02 });
  const top = F.chest + 0.09, halfW = o.halfW || 0.13, yt = F.hip.y + 0.065;
  const bib = frontPanel(h, K, { bottom: yt - 0.02, top, halfW: (y) => halfW * lerp(1, 0.68, smoothstep(F.chest - 0.04, top, y)), clear: 0.007, mat, name: 'apron' });
  const parts = [bib.mesh];
  parts.push(hangSkirt(h, K, { top: yt + 0.005, bottom: F.knee - 0.03, a0: -1.2, a1: 1.2, clear: 0.016, flare: 0.05, folds: 0.006, mat, name: 'apron-skirt', rim: 0.002 }));
  parts.push(hangSkirt(h, K, { top: yt + 0.013, bottom: yt - 0.013, clear: 0.022, flare: 0, folds: 0, mat, name: 'apron-tie', rim: 0.002 }));
  // neck strap: from the bib's top corners up the sides of the neck and round the back
  const nk = F.neck, G = extentGrid(h, K, nk, nk.y - 0.08, nk.y + 0.04, 72, 0.004, 0.2), pts = [bib.corner(1)];
  for (const a of [0.42, 0.62, 0.8, 1.0, 1.2, 1.38, 1.58].map(t => t * Math.PI)) { const k = Math.floor(((a + Math.PI) % TAU) / TAU * 72) % 72, y = nk.y - 0.012 - 0.01 * Math.abs(Math.sin(a)); const r = G.at(k, y) + 0.008;
    pts.push(V(nk.x + Math.sin(a) * r, y, nk.z + Math.cos(a) * r)); }
  pts.push(bib.corner(-1));
  parts.push(tube(h, K, new THREE.CatmullRomCurve3(pts), 0.005, mat, 'spine01'));
  return parts;
}

// a rigid tube skinned to one bone (straps)
function tube(h, K, curve, r, mat, bone, o = {}) {
  const g = new THREE.TubeGeometry(curve, o.seg || 48, r, o.radial || 8, !!o.closed); g.scale(1, 1, 1); const bi = K.meta.bones.findIndex(b => b.name === bone);
  g.setAttribute('gpos', g.attributes.position.clone()); setSkin(g, g.attributes.position.count, () => [[bi, 1]]); return skinnedMesh(h, g, mat, 'strap');
}

// ------------------------------------------------------------------ scarf: a chunky knitted loop worn doubled, resting where the body widens
export function scarf(h, K, color) {
  const F = frame(h), P = h.P, nk = F.neck; const mat = fabric(color, { normal: 'knit', tile: 0.03, ns: 0.9, roughness: 1, sheen: 1, sheenRoughness: 0.9, spec: 0.25 });
  // radial extent of skin + clothes round the neck axis, per angle and height
  const NA = 72, y0 = F.chest - 0.12, DY = 0.004; const G = extentGrid(h, K, nk, y0, nk.y + 0.05, NA, DY, 0.24); const extAt = G.at;
  // a ring of radius r(a) dropped over the head comes to rest where the body is first that wide
  const rest = (r, t) => { const ys = new Float32Array(NA); for (let k = 0; k < NA; k++) { let y = nk.y + 0.03; while (y > y0 + DY && extAt(k, y) < r[k] - t) y -= DY; ys[k] = y + t * 0.7; }
    for (let s = 0; s < 14; s++) { const c = ys.slice(); for (let k = 0; k < NA; k++) ys[k] = (c[(k + NA - 2) % NA] + 2 * c[(k + NA - 1) % NA] + 3 * c[k] + 2 * c[(k + 1) % NA] + c[(k + 2) % NA]) / 9; } return ys; };
  const neckR = new Float32Array(NA); for (let k = 0; k < NA; k++) neckR[k] = extAt(k, nk.y + 0.02);
  { const c = neckR.slice(); for (let k = 0; k < NA; k++) neckR[k] = (c[(k + NA - 2) % NA] + c[(k + NA - 1) % NA] + c[k] + c[(k + 1) % NA] + c[(k + 2) % NA]) / 5; }
  const ang = (k) => (k + 0.5) / NA * TAU - Math.PI;
  const r1 = neckR.map(r => r + 0.018), y1s = rest(r1, 0.012);
  const r2 = Float32Array.from(r1, (r, k) => r + 0.02 + 0.01 * Math.pow(Math.max(0, Math.cos(ang(k))), 2)), y2s = rest(r2, 0.012).map((y, k) => Math.max(y, y1s[k] - 0.055));
  const sb = K.meta.bones.findIndex(b => b.name === 'spine01'), nb = K.meta.bones.findIndex(b => b.name === 'neck01');
  const parts = [];
  for (const [rr, ys, wd, tk, seed, wn, lay] of [[r1, y1s, 0.062, 0.017, 1, 0.45, 0.25], [r2, y2s, 0.07, 0.015, 2, 0.1, 0.85]]) {   // wide knitted bands: the inner one stands like a cowl, the outer one lies over the shoulders
    const path = []; for (let k = 0; k < NA; k++) { const a = ang(k); path.push(V(nk.x + Math.sin(a) * rr[k], ys[k], nk.z + Math.cos(a) * rr[k])); }
    const curve = new THREE.CatmullRomCurve3(path, true, 'centripetal'); const NS = 260, PR = 24; const pos = [], uv = [], idx = [];
    const L = curve.getLength();
    for (let i = 0; i <= NS; i++) { const u = i / NS, c = curve.getPointAt(u % 1), T = curve.getTangentAt(u % 1); const O0 = V(c.x - nk.x, 0, c.z - nk.z).normalize(); const B0 = T.clone().cross(O0).normalize(); if (B0.y < 0) B0.negate(); const O = O0.clone().multiplyScalar(Math.cos(lay)).addScaledVector(B0, Math.sin(lay)), B = B0.clone().multiplyScalar(Math.cos(lay)).addScaledVector(O0, -Math.sin(lay));
      const n1 = noise2(u * 9 + seed * 5, seed), n2 = noise2(u * 17, seed * 3 + 1); const tw = (n1 - 0.5) * 0.5;
      const w = wd * (0.9 + 0.2 * n2), t = tk * (0.9 + 0.2 * n1);
      const row = 1 + 0.035 * Math.cos(u * L / 0.011 * TAU);                                         // knitted rows along the length
      for (let j = 0; j <= PR; j++) { const th = j / PR * TAU, rib = row * (1 + 0.05 * Math.cos(th * 6)); let x = Math.cos(th) * t * 0.5 * rib, y = Math.sin(th) * w * 0.5 * rib; const ct = Math.cos(tw), st = Math.sin(tw); const xr = x * ct - y * st * 0.25, yr = x * st * 0.25 + y * ct;
        const p = c.clone().addScaledVector(O, xr + t * 0.5).addScaledVector(B, yr); pos.push(p.x, p.y, p.z); uv.push(u * L / 1, th / TAU * (Math.PI * (w + t) * 0.5)); } }
    for (let i = 0; i < NS; i++) for (let j = 0; j < PR; j++) { const a = i * (PR + 1) + j, b = a + PR + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    // the seam where the ring closes gets averaged normals
    const nrm = g.attributes.normal; for (let j = 0; j <= PR; j++) { const a = j, b = NS * (PR + 1) + j; const m = V(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize(); nrm.setXYZ(a, m.x, m.y, m.z); nrm.setXYZ(b, m.x, m.y, m.z); }
    g.setAttribute('gpos', g.attributes.position.clone()); setSkin(g, pos.length / 3, () => [[sb, 1 - wn], [nb, wn]]);
    parts.push(skinnedMesh(h, g, mat, 'scarf'));
  }
  return parts;
}

// ------------------------------------------------------------------ headwear on the fitted head (dome = skull surface pushed out)
function rSurf(M, d) { const GA = 72, GP = 36; const a = Math.atan2(d.x, d.z), pl = Math.acos(clamp(d.y / (d.length() || 1), -1, 1)); const ia = Math.min(GA - 1, Math.floor((a + Math.PI) / TAU * GA)), ip = Math.min(GP - 1, Math.floor(pl / Math.PI * GP)); return M.grid[ip * GA + ia]; }
function dome(M, o) {
  const W = 48, Hs = 20, pos = [], idx = []; const tilt = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), o.tilt || 0);
  const point = (th, ph, j, i) => { const d = V(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)).applyQuaternion(tilt); let r = 0;
    for (const da of [-0.06, 0, 0.06]) for (const dp of [-0.06, 0, 0.06]) r = Math.max(r, rSurf(M, V(Math.sin(th + dp) * Math.sin(ph + da), Math.cos(th + dp), Math.sin(th + dp) * Math.cos(ph + da)).applyQuaternion(tilt)));
    const out = r * (o.scale || 1.02) + (o.add || 0.006) + (o.puff ? o.puff * (0.6 + 0.4 * noise2(i * 0.35, j * 0.5)) * Math.sin(Math.min(1, th / o.cover) * Math.PI * 0.9 + 0.2) : 0)
      + (o.folds ? o.folds * Math.pow(Math.abs(Math.sin(ph * 2.5 + th * 5.5 + 0.8 * Math.sin(ph * 4))), 0.7) * Math.min(1, th * 2) : 0);
    const q = M.C.clone().add(d.multiplyScalar(out));
    if (o.flatTop) { const f = 1 - th / o.cover; q.z += (o.forward || 0) * smoothstep(0.15, 0.9, f) * (0.6 + 0.4 * Math.cos(ph)); q.y = Math.min(q.y, M.top + o.flatTop - 0.012 * Math.max(0, Math.cos(ph)) * smoothstep(0.2, 0.8, f)); }
    return q; };
  for (let j = 0; j <= Hs; j++) for (let i = 0; i <= W; i++) { const q = point((j / Hs) * o.cover, (i / W) * TAU - Math.PI, j, i); pos.push(q.x, q.y, q.z); }
  for (let j = 0; j < Hs; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + W + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const uv = new Float32Array(pos.length / 3 * 2); for (let k = 0; k < uv.length / 2; k++) { uv[k * 2] = (k % (W + 1)) / W * 0.6 / 0.03; uv[k * 2 + 1] = Math.floor(k / (W + 1)) / Hs * 0.2 / 0.03; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.userData.front = point(o.cover, 0, Hs, W / 2);   // the crown's front edge (for a brim)
  return g;
}
function rigid(h, K, g, mat, bone, name) { const bi = K.meta.bones.findIndex(b => b.name === bone); setSkin(g, g.attributes.position.count, () => [[bi, 1]]); return skinnedMesh(h, g, mat, name); }

export function cap(h, K, color, kind = 'cap') {
  const M = h._head || (h._head = headModel(h, K)); const flat = kind === 'flatcap'; const mat = fabric(color, { roughness: flat ? 0.95 : 0.82, sheen: 0.45, ns: 0.6, tile: flat ? 0.015 : 0.02, normal: flat ? 'knit' : 'cloth' });
  // the band sits a finger above the brows at the front and drops to the occipital bone at the back
  const crown = dome(M, flat ? { cover: 1.62, tilt: -0.24, scale: 1.03, add: 0.008, flatTop: 0.002, forward: 0.03, puff: 0.004 } : { cover: 1.66, tilt: -0.17, scale: 1.02, add: 0.007 });
  const parts = [rigid(h, K, crown, mat, 'head', kind)];
  // brim: a curved sheet out from the front edge, angled down a little
  const f = crown.userData.front, L = flat ? 0.04 : 0.072, Wb = flat ? 0.08 : 0.088, droop = flat ? 0.45 : 0.2; const pos = [], idx = []; const nu = 20, nv = 6;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const u = i / nu * 2 - 1, v = j / nv; const half = Wb * (1 - 0.3 * v * v);
    const x = M.C.x + u * half, back = (1 - Math.sqrt(Math.max(0, 1 - u * u * 0.9))) * 0.05; pos.push(x, f.y - 0.002 - v * L * droop - Math.abs(u) * 0.01 * (1 - v), f.z - 0.006 - back + v * L); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.length / 3 * 2).map((_, k) => pos[Math.floor(k / 2) * 3 + (k % 2 ? 2 : 0)] / 0.02), 2)); parts.push(rigid(h, K, g, mat, 'head', kind + '-brim'));
  if (!flat) { const btn = new THREE.SphereGeometry(0.006, 10, 6); const top = M.C.clone().add(V(0, 1, 0).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -0.17)).multiplyScalar(rSurf(M, V(0, 1, -0.17)) * 1.02 + 0.007)); btn.scale(1, 0.5, 1); btn.translate(top.x, top.y, top.z); parts.push(rigid(h, K, btn, mat, 'head', 'cap-button')); }
  return parts;
}
export function headwrap(h, K, color) {
  const M = h._head || (h._head = headModel(h, K)); const mat = fabric(color, { roughness: 0.86, sheen: 0.7, sheenRoughness: 0.5, ns: 0.7, tile: 0.02 });
  const wrap = dome(M, { cover: 1.55, tilt: -0.32, scale: 1.04, add: 0.014, puff: 0.012, folds: 0.006 });
  const parts = [rigid(h, K, wrap, mat, 'head', 'headwrap')];
  // the knot: two lobes and a twist, front-top above the hairline
  const up = V(0, 1, 0).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), 0.75)); const r = rSurf(M, up) * 1.04 + 0.02; const c = M.C.clone().addScaledVector(up, r);
  for (const [sx, rot] of [[-1, 0.5], [1, -0.5]]) { const g = new THREE.SphereGeometry(0.026, 18, 12); g.scale(1.25, 0.8, 0.7); g.rotateZ(rot); g.rotateX(-0.6); g.translate(c.x + sx * 0.028, c.y + 0.004, c.z + 0.004); parts.push(rigid(h, K, g, mat, 'head', 'headwrap-lobe')); }
  const k = new THREE.TorusKnotGeometry(0.012, 0.007, 48, 8, 2, 3); k.rotateX(-0.6); k.translate(c.x, c.y + 0.006, c.z + 0.012); parts.push(rigid(h, K, k, mat, 'head', 'headwrap-knot'));
  return parts;
}

// ------------------------------------------------------------------ arms, and the pose garments are made in
// The upper arm is given world rotation q, the shoulder girdle first taking a share of its swing away from the bind pose
// as the shoulder blade does: bent all at the shoulder joint, linear blend skinning balloons the deltoid.
const setWorldQ = (b, q) => { b.parent.updateWorldMatrix(true, false); b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)); b.updateMatrixWorld(true); };
export function setArm(h, s, q, share = 0.3, maxA = 0.5) {
  const arm = h.bones.get('upperarm01.' + s), sho = h.bones.get('shoulder01.' + s), r = h.rest.get('upperarm01.' + s); if (!sho) return setWorldQ(arm, q);
  const dir = r.t.clone().sub(r.h).normalize(); sho.quaternion.identity(); sho.updateWorldMatrix(true, false); const qs = sho.getWorldQuaternion(new THREE.Quaternion());
  const sw = new THREE.Quaternion().setFromUnitVectors(dir.clone().applyQuaternion(qs), dir.clone().applyQuaternion(q)), ang = 2 * Math.acos(clamp(Math.abs(sw.w), 0, 1));
  setWorldQ(sho, new THREE.Quaternion().slerp(sw, ang > 1e-4 ? Math.min(share, maxA / ang) : 0).multiply(qs)); setWorldQ(arm, q);
}

// Garments are shaped and bound with the arms lowered from the A-pose the skeleton was bound in to `abd` (radians from
// the vertical): cloth bound in the A-pose bunches into pads at the shoulders when the arms come down, as they mostly
// are. `build(hp)` gets a view of the body in that pose (skin, clothes and joints posed; its own skeleton binding).
export function dressed(h, K, build, abd = 0.35) {
  const F0 = frame(h), turned = [];
  for (const s of ['L', 'R']) { const v = F0.el[s].clone().sub(F0.sh[s]), sg = Math.sign(F0.sh[s].x - F0.midX), ang = (Math.atan2(Math.abs(v.x), -v.y) - abd) * -sg;
    for (const n of ['upperarm01.' + s, 'shoulder01.' + s]) { const b = h.bones.get(n); if (b) turned.push([b, b.quaternion.clone()]); }
    setArm(h, s, new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), ang)); }
  h.group.updateMatrixWorld(true);
  const bones = h.skeleton.bones, BM = bones.map((b, i) => b.matrixWorld.clone().multiply(h.skeleton.boneInverses[i]));
  const lbs = (pos, si, sw, n) => { const out = new Float32Array(n * 3), p = V(), t = V(), acc = V();
    for (let i = 0; i < n; i++) { p.fromArray(pos, i * 3); acc.set(0, 0, 0); for (let k = 0; k < 4; k++) { const w = sw[i * 4 + k]; if (w > 0) acc.addScaledVector(t.copy(p).applyMatrix4(BM[si[i * 4 + k]]), w); } acc.toArray(out, i * 3); }
    return out; };
  const P2 = lbs(h.P, K.swI, K.swW, K.N);
  const cl2 = (h.clothes || []).map(c => { const m = h.meshes.find(x => x.name === c.key), g = m && m.geometry;
    return Object.assign({}, c, g ? { pos: lbs(g.attributes.position.array, g.attributes.skinIndex.array, g.attributes.skinWeight.array, g.attributes.position.count) } : {}); });
  const hp = Object.create(h);
  Object.assign(hp, { P: P2, clothes: cl2, joint: (n) => V().setFromMatrixPosition(h.bones.get(n).matrixWorld), skeleton: new THREE.Skeleton(bones), _frame: null, _bn: null, _env: null, _nip: null, _skinNear: null });
  try { return build(hp); }
  finally { for (const [b, q] of turned) b.quaternion.copy(q); h.group.updateMatrixWorld(true); for (const c of h.clothes || []) { const c2 = cl2.find(x => x.key === c.key); if (c2) c.idx = c2.idx; } }
}
