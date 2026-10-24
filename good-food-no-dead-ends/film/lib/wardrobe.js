// GOOD FOOD. NO DEAD ENDS. — signature garments for the realistic cast, grown from the body so they deform with the same
// skeleton. Each outer layer is fitted over what the character already wears: it starts just outside the clothes
// underneath (an "envelope" measured from the fitted MakeHuman garments), then relaxes under Laplacian smoothing that
// may not pass back inside, which bridges hollows the way fabric under tension does. Vests and coats come from the torso
// and arm skin, coat skirts and aprons from MakeHuman's skirt helper; the scarf, collar, caps and headwrap are shaped on
// the fitted neck and head. Edges get a real thickness, and fabric detail is in metres (UVs are physical).
import { THREE, V, clamp, lerp, noise2, normalTex } from './core.js';
import { headModel } from './hair.js';

const TAU = Math.PI * 2;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const boneIdx = (K, names) => new Set(names.map(n => K.meta.bones.findIndex(b => b.name === n)).filter(i => i >= 0));
const TORSO = ['root', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'pelvis.L', 'pelvis.R', 'clavicle.L', 'clavicle.R', 'shoulder01.L', 'shoulder01.R', 'breast.L', 'breast.R'];
const ARM = { L: ['upperarm01.L', 'upperarm02.L', 'lowerarm01.L', 'lowerarm02.L'], R: ['upperarm01.R', 'upperarm02.R', 'lowerarm01.R', 'lowerarm02.R'] };

// reference points of this body (rest pose)
function frame(h) {
  if (h._frame) return h._frame; const J = (n) => h.joint(n);
  const hip = J('upperleg01.L').add(J('upperleg01.R')).multiplyScalar(0.5);
  return (h._frame = { hip, waist: lerp(J('spine05').y, J('spine04').y, 0.5), chest: J('spine02').y, neck: J('neck01'), midX: hip.x, midZ: (J('spine03').z + hip.z) / 2,
    knee: (J('lowerleg01.L').y + J('lowerleg01.R').y) / 2, sh: { L: J('upperarm01.L'), R: J('upperarm01.R') }, wr: { L: J('wrist.L'), R: J('wrist.R') } });
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
  for (const c of h.clothes || []) { if (/^shoes/.test(c.key)) continue; const p = c.pos, ix = c.idx;
    for (let i = 0, j = 0; i < p.length; i += 3, j += 4) add(p[i], p[i + 1], p[i + 2], LC[c.bone[j]]);
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
function garment(h, K, tris, o) {
  tris = dropIslands(tris);
  const P = h.P, NB = bodyNormals(h, K), E = envelope(h, K), F = frame(h);
  const loc = new Map(), verts = []; const idx = Uint32Array.from(tris, (v) => { let i = loc.get(v); if (i === undefined) { i = verts.length; loc.set(v, i); verts.push(v); } return i; });
  const n = verts.length; if (!n) return null;
  // faces wound outward (the skirt helper's winding is not)
  { const a = V(), b = V(), c = V(); for (let f = 0; f < idx.length; f += 3) { a.fromArray(P, verts[idx[f]] * 3); b.fromArray(P, verts[idx[f + 1]] * 3); c.fromArray(P, verts[idx[f + 2]] * 3);
    const fn = b.sub(a).cross(c.sub(a)); let s = 0; for (let k = 0; k < 3; k++) { const v = verts[idx[f + k]]; s += fn.x * NB[v * 3] + fn.y * NB[v * 3 + 1] + fn.z * NB[v * 3 + 2]; } if (s < 0) { const t = idx[f + 1]; idx[f + 1] = idx[f + 2]; idx[f + 2] = t; } } }
  const nb = Array.from({ length: n }, () => new Set()), ec = new Map();
  for (let f = 0; f < idx.length; f += 3) for (let k = 0; k < 3; k++) { const a = idx[f + k], b = idx[f + (k + 1) % 3]; nb[a].add(b); nb[b].add(a); const key = Math.min(a, b) * n + Math.max(a, b); const e = ec.get(key); if (e) e.c++; else ec.set(key, { c: 1, a, b, o: idx[f + (k + 2) % 3] }); }
  const isB = new Uint8Array(n), bnb = Array.from({ length: n }, () => []), bEdges = [];
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
  const fl = o.flatten ? nipples(h, K) : [], bump = new Float32Array(n);
  if (fl.length) { if (Pr === P) Pr = Float32Array.from(P);
    for (let i = 0; i < n; i++) { const v = verts[i] * 3; for (const c of fl) { const d = Math.hypot(P[v] - c.x, P[v + 1] - c.y, P[v + 2] - c.z); if (d >= 0.04) continue; const w = 0.5 + 0.5 * Math.cos(Math.PI * d / 0.04);
      Pr[v] -= NB[v] * o.flatten * w; Pr[v + 1] -= NB[v + 1] * o.flatten * w; Pr[v + 2] -= NB[v + 2] * o.flatten * w; bump[i] = Math.max(bump[i], o.flatten * 0.6 * w); } } }
  // offset beyond what is worn underneath, then relax without passing back inside
  const q = new Float32Array(n * 3), lo = new Float32Array(n), hi = new Float32Array(n), tol = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = verts[i], p = V().fromArray(P, v * 3); const g = (typeof o.gap === 'function' ? o.gap(v, p) : (o.gap ?? 0.01)) + bump[i];
    lo[i] = E[v] + g; hi[i] = lo[i] + (o.loose ?? 0.05); tol[i] = g * (o.give ?? 0.6); for (let c = 0; c < 3; c++) q[i * 3 + c] = Pr[v * 3 + c] + NB[v * 3 + c] * lo[i]; }
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
  const emit = (i, isl, u, w, nx, ny, nz, k) => { let j = vkey.get(k); if (j === undefined || k === null) { j = src.length; if (k !== null) vkey.set(k, j); pos.push(q[i * 3], q[i * 3 + 1], q[i * 3 + 2]); nrm.push(nx, ny, nz); uv.push(u, w); src.push(verts[i]); } return j; };
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
    for (const [P3, i] of [[A, e.a], [B, e.b], [B2, e.b], [A2, e.a]]) { pos.push(P3.x, P3.y, P3.z); nrm.push(fn.x, fn.y, fn.z); uv.push(ua, P3.y); src.push(verts[i]); }
    if (flip) out.push(base, base + 3, base + 2, base, base + 2, base + 1); else out.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('gpos', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(out);
  const near = skinNear(h, K); setSkin(g, src.length, (i) => near(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], src[i]));
  const mesh = skinnedMesh(h, g, o.mat, o.name || 'garment');
  const body = []; for (let i = 0; i < n; i++) if (!vIsl[i]) body.push(q[i * 3], q[i * 3 + 1], q[i * 3 + 2]);   // positions off the sleeves
  return { mesh, q, gn, verts, idx, isB, body: Float32Array.from(body) };
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

// ------------------------------------------------------------------ lab coat: notched V front buttoned to the thigh, long sleeves, skirt to the knee
export function labCoat(h, K, color = '#f2f2ec') {
  const F = frame(h), tb = boneIdx(K, [...TORSO, 'neck01']), aL = boneIdx(K, ARM.L), aR = boneIdx(K, ARM.R);
  const neckY = F.neck.y - 0.018, yBtn = F.chest - 0.03;
  const vW = (y) => 0.004 + 0.072 * smoothstep(yBtn, neckY + 0.03, y);
  const sleeveOK = (p, s) => p.clone().sub(F.sh[s]).dot(F.wr[s].clone().sub(F.sh[s]).normalize()) < F.wr[s].distanceTo(F.sh[s]) - 0.012;
  const side = (v) => aL.has(K.swI[v * 4]) ? 1 : aR.has(K.swI[v * 4]) ? 2 : 0, thigh = boneIdx(K, ['upperleg01.L', 'upperleg01.R', 'upperleg02.L', 'upperleg02.R']);
  const upper = pick(h, K, (v, p) => { const s = side(v); if (!s && !tb.has(K.swI[v * 4]) && !(thigh.has(K.swI[v * 4]) && p.y > F.hip.y - 0.06)) return false; if (s && !sleeveOK(p, s === 1 ? 'L' : 'R')) return false;
    return p.y > (s ? F.hip.y - 0.3 : F.hip.y - 0.016) && !inNeck(F, p, { depth: 0.02 }) && !(p.z > F.midZ && p.y > yBtn - 0.004 && Math.abs(p.x - F.midX) < vW(p.y)); });
  const U = { midX: F.midX, midZ: F.midZ, yBtn, hip: F.hip.y, chest: F.chest };
  const mat = fabric(color, { roughness: 0.82, sheen: 0.3, ns: 0.3, tile: 0.03, uniforms: U,
    pattern: `float front = step(midZ, vGpos.z); float dx = vGpos.x - midX;
      float seam = ${BAND('0.014', 0.0007, 'dx')} * step(vGpos.y, yBtn) * front;                                   // the closing edge of the front panel
      float pk1 = max(${BAND('0.035', 0.0007, 'abs(dx - 0.095)')} * step(chest - 0.11, vGpos.y) * step(vGpos.y, chest), ${BAND('chest', 0.0008, 'vGpos.y')} * step(abs(dx - 0.095), 0.035)) * front;   // chest pocket
      float py = vGpos.y - (hip - 0.13); float pk2 = max(${BAND('0.075', 0.0008, 'abs(abs(dx) - 0.125)')} * step(abs(py), 0.08), ${BAND('0.08', 0.0009, 'abs(py)')} * step(abs(abs(dx) - 0.125), 0.075) * step(0.0, py)) * front;   // hip pockets (top edge open)
      diffuseColor.rgb *= 1.0 - 0.38 * max(seam, max(pk1, pk2));` });
  const top = garment(h, K, upper, { gap: (v) => side(v) ? 0.011 : 0.012, give: 0.5, loose: 0.06, iters: 60, soften: 10, flatten: 0.008, mat, name: 'labcoat', island: side, hang: F.chest + 0.02, wrinkle: 0.004, rim: 0.0025 });
  // the skirt hangs from the coat's hem, outside it, down to the knee
  const ys = F.hip.y + 0.01, hr = bandRadius(h, top.body, ys - 0.006, ys + 0.006);
  const skirt = hangSkirt(h, K, { top: ys, bottom: F.knee + 0.07, clear: 0.02, flare: 0.06, folds: 0.01, rTop: (a) => hr(a) + 0.0015, over: top.body, mat, name: 'labcoat-skirt', rim: 0.0025 });
  // half-belt across the back over the waist seam, with a button at each end
  const belt = hangSkirt(h, K, { top: ys + 0.024, bottom: ys - 0.034, a0: 1.95, a1: TAU - 1.95, clear: 0.024, overClear: 0.006, flare: 0, folds: 0, over: [...top.body, ...skirtTop(skirt)], mat, name: 'labcoat-belt', rim: 0.003 });
  const parts = [top.mesh, skirt, belt];
  // buttons down the closing edge
  const bm = new THREE.MeshPhysicalMaterial({ color: '#e9e6dc', roughness: 0.3, clearcoat: 0.6 });
  for (const y of [yBtn - 0.01, yBtn - 0.11, yBtn - 0.21].filter(y => y > F.hip.y - 0.02)) parts.push(button(h, K, top, V(F.midX + 0.026, y, 1), bm));
  return parts;
}
function button(h, K, gar, at, mat) {
  let best = -1, bd = 1e9; for (let i = 0; i < gar.verts.length; i++) { const z = gar.q[i * 3 + 2]; if (z < frame(h).midZ) continue; const d = (gar.q[i * 3] - at.x) ** 2 + (gar.q[i * 3 + 1] - at.y) ** 2; if (d < bd) { bd = d; best = i; } }
  const p = V().fromArray(gar.q, best * 3), n = V().fromArray(gar.gn, best * 3); const g = new THREE.CylinderGeometry(0.0068, 0.0068, 0.0028, 14);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n)); g.translate(p.x + n.x * 0.0016, p.y + n.y * 0.0016, p.z + n.z * 0.0016);
  const c = g.attributes.position.count; setSkin(g, c, () => baseSkin(K, gar.verts[best])); return skinnedMesh(h, g, mat, 'button');
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
