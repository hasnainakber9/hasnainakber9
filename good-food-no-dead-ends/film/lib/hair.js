// GOOD FOOD. NO DEAD ENDS. — strand hair for the realistic cast.
// Roots are sampled on MakeHuman's scalp cap (and on the face for beards); every strand is grown along a per-style
// combing field, kept off the skull by a fitted head ellipsoid, with gravity, curl and clumping, then rendered as a
// tapered ribbon skinned to the head bone. A matte scalp layer underneath stops skin showing between strands.
import { THREE, V, clamp, lerp, prng, noise2 } from './core.js';
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const TAU = Math.PI * 2;

// head frame + a radial map of the head surface (max skull radius per direction from the head centre)
const GA = 72, GP = 36;
export function headModel(h, K) {
  const hb = K.meta.bones.findIndex(b => b.name === 'head');
  const onHead = (i) => K.swI[i * 4] === hb && K.swW[i * 4] > 0.6;
  const body = new Uint8Array(K.N); for (let i = 0; i < K.bmap.length; i++) body[K.bmap[i]] = 1;   // skin surface only (no helper shells)
  const all = []; for (let i = 0; i < K.N; i++) if (body[i] && onHead(i)) all.push(V(h.P[i * 3], h.P[i * 3 + 1], h.P[i * 3 + 2]));
  const lo = V(1e9, 1e9, 1e9), hi = V(-1e9, -1e9, -1e9); for (const p of all) { lo.min(p); hi.max(p); }
  const eyeY = (h.joint('eye.L').y + h.joint('eye.R').y) / 2, midX = (lo.x + hi.x) / 2, halfX = (hi.x - lo.x) / 2;
  const pts = all.filter(p => !(Math.abs(p.x - midX) > 0.78 * halfX && p.y < eyeY + 0.035 && p.y > eyeY - 0.06));   // ears out
  const C = lo.clone().add(hi).multiplyScalar(0.5); C.y = lerp(lo.y, hi.y, 0.58); const R = hi.clone().sub(lo).multiplyScalar(0.5);
  const grid = new Float32Array(GA * GP), cnt = new Float32Array(GA * GP);   // mean skull radius per direction
  for (const p of pts) { const d = p.clone().sub(C); const [ia, ip] = cell(d); grid[ip * GA + ia] += d.length(); cnt[ip * GA + ia]++; }
  for (let i = 0; i < grid.length; i++) if (cnt[i]) grid[i] /= cnt[i];
  for (let pass = 0; pass < 8; pass++) { const nxt = grid.slice(); for (let ip = 0; ip < GP; ip++) for (let ia = 0; ia < GA; ia++) if (!grid[ip * GA + ia]) {   // fill holes with the neighbours' mean
    let m = 0, k = 0; for (const [da, dp] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = clamp(ip + dp, 0, GP - 1) * GA + ((ia + da + GA) % GA); if (grid[j]) { m += grid[j]; k++; } } if (k) nxt[ip * GA + ia] = m / k; } grid.set(nxt); }
  const eyeL = h.joint('eye.L'), eyeR = h.joint('eye.R'); const eyes = eyeL.clone().add(eyeR).multiplyScalar(0.5);
  // scalp = head skin above a natural hairline: forehead ~6.5 cm over the eyes, over the ears at the sides
  // (with sideburns in front of them), down to the nape at the back
  const sz = (hi.y - lo.y) / 0.235;   // head-size factor (1 for an adult head)
  const hairline = (x, z) => { const a = Math.abs(Math.atan2(x - C.x, z - C.z));
    let y = lerp(0.066, 0.026, smoothstep(0.7, 1.2, a));                                   // forehead -> temple
    if (a > 1.0 && a < 1.45) y -= 0.033 * Math.sin((a - 1.0) / 0.45 * Math.PI);            // sideburn in front of the ear
    y = lerp(y, 0.016, smoothstep(1.3, 1.5, a));                                           // just over the ear
    y = lerp(y, -0.072, smoothstep(1.55, 2.15, a));                                        // down behind the ear to the nape
    y += (noise2(a * 9 + 1.7, 3.1) - 0.5) * 0.007 + (noise2(a * 31 + 4.2, 7.7) - 0.5) * 0.004;   // an irregular edge, not a ruled line
    return eyes.y + y * sz; };
  const scalp = [], inner = [];
  for (let f = 0; f < K.bidx.length; f += 3) { const a = K.bmap[K.bidx[f]], b = K.bmap[K.bidx[f + 1]], c = K.bmap[K.bidx[f + 2]]; if (!(onHead(a) && onHead(b) && onHead(c))) continue;
    const x = (h.P[a * 3] + h.P[b * 3] + h.P[c * 3]) / 3, y = (h.P[a * 3 + 1] + h.P[b * 3 + 1] + h.P[c * 3 + 1]) / 3, z = (h.P[a * 3 + 2] + h.P[b * 3 + 2] + h.P[c * 3 + 2]) / 3;
    if (y > hairline(x, z)) scalp.push(a, b, c); if (y > hairline(x, z) + 0.032 * sz) inner.push(a, b, c); }   // the matte under-layer stops well inside, under full-density hair (its polygon edge must not show)
  return { hb, C, R, grid, eyes, scalp, inner, sz, hairline, onHead, top: hi.y, chin: h.joint('jaw', 't').y };
}
function cell(d) { const r = d.length() || 1; const a = Math.atan2(d.x, d.z), pl = Math.acos(clamp(d.y / r, -1, 1)); return [Math.min(GA - 1, Math.floor((a + Math.PI) / TAU * GA)), Math.min(GP - 1, Math.floor(pl / Math.PI * GP))]; }
const surfR = (d, M) => { const [ia, ip] = cell(d); return M.grid[ip * GA + ia]; };
const ell = (p, M) => { const d = p.clone().sub(M.C); return d.length() / (surfR(d, M) || 1); };
function pushOut(p, M, shell) { const d = p.clone().sub(M.C); const r = d.length(), R0 = surfR(d, M) * shell; if (r < R0) p.copy(M.C).add(d.multiplyScalar(R0 / r)); }

// area-weighted random point on a triangle list over the body positions
function sampler(h, tris) {
  const P = h.P; const area = []; let tot = 0; const a = V(), b = V(), c = V();
  for (let i = 0; i < tris.length; i += 3) { a.fromArray(P, tris[i] * 3); b.fromArray(P, tris[i + 1] * 3); c.fromArray(P, tris[i + 2] * 3); tot += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2; area.push(tot); }
  return (r) => { const x = r() * tot; let lo2 = 0, hi2 = area.length - 1; while (lo2 < hi2) { const m = (lo2 + hi2) >> 1; if (area[m] < x) lo2 = m + 1; else hi2 = m; }
    const i = lo2 * 3; a.fromArray(P, tris[i] * 3); b.fromArray(P, tris[i + 1] * 3); c.fromArray(P, tris[i + 2] * 3);
    let u = r(), v = r(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const p = a.clone().multiplyScalar(1 - u - v).add(b.clone().multiplyScalar(u)).add(c.clone().multiplyScalar(v));
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize(); return { p, n, root: [tris[i], tris[i + 1], tris[i + 2], 1 - u - v, u, v] }; };
}

// ------------------------------------------------------------------ styles: each returns strands [{ pts: [V], w0, col }]
function grow(root, n0, M, o, r) {
  // o: { len, segs, dir(p, n) -> V, lift, liftEnd, gravity, curl, curlF, phase, attract: V|null, attractK }
  const pts = [root.clone().add(n0.clone().multiplyScalar(0.0012))]; let d = o.dir(root, n0).clone();
  d.add(n0.clone().multiplyScalar(o.lift ?? 0.15)).normalize();
  const step = o.len / o.segs; const ph = o.phase ?? r() * TAU;
  let p = pts[0].clone();
  for (let k = 1; k <= o.segs; k++) {
    const f = k / o.segs;
    if (o.gravity) d.y -= o.gravity * step * 3; if (o.attract) { const to = o.attract.clone().sub(p).normalize(); d.lerp(to, o.attractK ?? 0.25); }
    if (o.hug) { const nr = p.clone().sub(M.C).normalize(); d.sub(nr.multiplyScalar(d.dot(nr) * o.hug * (1 - f * (o.release ?? 0)))); }
    d.normalize(); p = p.clone().add(d.clone().multiplyScalar(step));
    pushOut(p, M, 1.0 + (o.shell0 ?? 0.03) + (o.shell1 ?? 0.06) * f);
    const q = p.clone();
    if (o.curl) { const b1 = new THREE.Vector3().crossVectors(d, V(0, 1, 0.3)).normalize(), b2 = new THREE.Vector3().crossVectors(d, b1).normalize(); const a = ph + f * o.len * (o.curlF || 120);
      const cr = o.curl * Math.min(1, f * 4); q.add(b1.multiplyScalar(Math.cos(a) * cr)).add(b2.multiplyScalar(Math.sin(a) * cr)); }
    pts.push(q);
  }
  return pts;
}

export function strandHair(h, K, style, o = {}) {
  const M = h._head || (h._head = headModel(h, K)); const r = prng(o.seed || 7);
  const scalp = sampler(h, M.scalp); const strands = [];
  const base = new THREE.Color(o.color || '#1a1411'), tipC = new THREE.Color(o.tip || o.color || '#1a1411').offsetHSL(0, 0, 0.06);
  const col = (k) => { const c = base.clone().lerp(tipC, k); c.offsetHSL(0, 0, (r() - 0.5) * 0.05); return c; };
  const back = V(M.C.x, M.C.y + M.R.y * 0.15, M.C.z - M.R.z * 1.05);
  // a soft hairline: within ~1.2 cm of the edge strands thin out and get finer, so skin shows through gradually
  const edge = (p) => smoothstep(-0.002 * M.sz, 0.02 * M.sz, p.y - M.hairline(p.x, p.z));
  const ok = (p) => r() < 0.3 + 0.7 * edge(p);
  const add = (pts, w0, c, streak) => strands.push({ pts, w0: w0 * (0.5 + 0.5 * edge(pts[0])), c, streak });
  if (style === 'bun' || style === 'ponytail') {
    const tie = style === 'bun' ? V(M.C.x, M.C.y + M.R.y * 0.38, M.C.z - M.R.z * 1.02) : V(M.C.x, M.C.y + M.R.y * 0.12, M.C.z - M.R.z * 1.04);
    for (let i = 0; i < (o.count || 9000); i++) {
      const { p, n } = scalp(r); if (!ok(p)) continue;
      const dist = p.distanceTo(tie);
      const pts = grow(p, n, M, { len: dist * 1.12, segs: 14, dir: (q) => tie.clone().sub(q).normalize(), lift: 0.0, hug: 0.9, attract: tie, attractK: 0.2, shell0: 0.018, shell1: 0.02 }, r);
      const sx = (p.x - M.C.x) / M.R.x; const streak = o.streak && sx > 0.24 && sx < 0.36 && (p.z - M.C.z) / M.R.z > 0.05 && r() < 0.75;
      add(pts, 0.00034, col(r() * 0.4), streak);
    }
    if (style === 'bun') {   // a coil of strands wound around the tie point
      const ax = tie.clone().sub(M.C).normalize(); const u = new THREE.Vector3().crossVectors(ax, V(1, 0, 0)).normalize(), w = new THREE.Vector3().crossVectors(ax, u).normalize();
      for (let i = 0; i < (o.bun || 2600); i++) {
        const R0 = 0.022 + r() * 0.03, a0 = r() * TAU, turns = 1.4 + r() * 1.2, segs = 30, lift = (r() - 0.5) * 0.03; const pts = [];
        for (let k = 0; k <= segs; k++) { const f = k / segs, a = a0 + f * turns * TAU; const rr = R0 * (1 - 0.25 * f) + 0.004 * Math.sin(f * 9 + i);
          pts.push(tie.clone().add(ax.clone().multiplyScalar(0.012 + lift * (1 - Math.abs(2 * f - 1)) + 0.018 * Math.sin(a * 0.5))).add(u.clone().multiplyScalar(Math.cos(a) * rr)).add(w.clone().multiplyScalar(Math.sin(a) * rr))); }
        add(pts, 0.0004, col(0.3 + r() * 0.5), o.streak && r() < 0.12);
      }
    } else {   // ponytail: falls from the tie with gravity and a soft wave
      for (let i = 0; i < (o.tail || 4200); i++) {
        const a = r() * TAU, rad = Math.sqrt(r()) * 0.017; const start = tie.clone().add(V(Math.cos(a) * rad, Math.sin(a) * rad * 0.8, -0.004)); const L = (o.tailLen || 0.24) * (0.75 + r() * 0.3), segs = 22; const pts = [start];
        let p = start.clone(); const d = V(Math.cos(a) * 0.08, -0.15, -0.98).normalize();
        for (let k = 1; k <= segs; k++) { const f = k / segs; d.y -= 0.16; d.z += 0.06; d.normalize(); p = p.clone().add(d.clone().multiplyScalar(L / segs)); const q = p.clone(); q.x += Math.sin(f * 7 + i * 0.01) * 0.004 * f + Math.cos(a) * rad * f * 1.6; q.z -= Math.sin(a) * rad * f * 0.8;
          const back2 = M.C.z - M.R.z * 0.95; if (q.z > back2 && q.y > M.chin) q.z = back2; pts.push(q); }
        add(pts, 0.00034, col(0.2 + r() * 0.7));
      }
    }
  }
  if (style === 'short') {   // a man's cut: short back and sides tapering to the hairline, longer on top and combed back from a side parting, rising off the forehead (one length all round hangs over the ears like a bowl)
    const whorl = V(M.C.x + M.R.x * 0.1, M.top, M.C.z - M.R.z * 0.35), xp = M.C.x + M.R.x * 0.36, Lt = o.len || 0.042;
    for (let i = 0; i < (o.count || 15000); i++) {
      const { p, n } = scalp(r); if (!ok(p)) continue;
      const top = smoothstep(M.C.y, M.C.y + M.R.y * 0.42, p.y), zf = (p.z - M.C.z) / M.R.z, back = smoothstep(-0.25, -0.7, zf), hh = (p.y - M.hairline(p.x, p.z)) / M.sz;
      const away = p.clone().sub(whorl); away.y = Math.min(away.y, 0) - 0.03; away.normalize();
      const d0 = V(0, -0.4, -1).normalize().lerp(V(p.x < xp ? -0.42 : 0.55, -0.05, -1).normalize(), top).lerp(away, back * (1 - 0.6 * top)).normalize();
      const front = smoothstep(0.35, 0.8, zf) * top, len = lerp(0.009, Lt, top * (1 - 0.5 * back)) * (0.75 + r() * 0.4) * lerp(0.55, 1, smoothstep(0, 0.025, hh));
      const pts = grow(p, n, M, { len, segs: len > 0.02 ? 8 : 4, dir: () => d0, lift: 0.06 + 0.4 * front, hug: 0.9, release: 0.15, gravity: 0.03, shell0: 0.01, shell1: lerp(0.015, 0.06, top) }, r);
      add(pts, 0.00034, col(r() * 0.6));
    }
  }
  if (style === 'cropped' || style === 'capped') {
    const whorl = V(M.C.x + M.R.x * 0.1, M.top, M.C.z - M.R.z * 0.35); const L = style === 'cropped' ? 0.008 : style === 'capped' ? 0.02 : (o.len || 0.035);
    for (let i = 0; i < (o.count || 12000); i++) {
      const { p, n } = scalp(r); if (!ok(p)) continue;
      if (style === 'capped') { const d = p.clone().sub(M.C); if (Math.acos(clamp((d.y * 0.9856 - d.z * 0.1692) / d.length(), -1, 1)) < 1.3) continue; }   // hidden under the cap
      const away = p.clone().sub(whorl); away.y = Math.min(away.y, 0) - 0.02; const front = (p.z - M.C.z) / M.R.z > 0.2;
      const dir = (q) => { const d = away.clone(); if (front) d.add(V(0.35, 0, 0.15)); return d.normalize(); };
      const pts = grow(p, n, M, { len: L * (0.7 + r() * 0.5), segs: style === 'cropped' ? 3 : 7, dir, lift: style === 'cropped' ? 0.35 : 0.1, hug: style === 'cropped' ? 0.5 : 0.8, release: 0.4, gravity: 0.08, shell0: 0.012, shell1: style === 'cropped' ? 0.02 : 0.035 }, r);
      if (style === 'capped') for (const q of pts) {   // under the cap's crown (wardrobe.js cap: tilted 0.17 back, down to 1.66 rad) the hair is pressed flat
        const d = q.clone().sub(M.C), l = d.length(); if (Math.acos(clamp((d.y * 0.9856 - d.z * 0.1692) / l, -1, 1)) > 1.7) continue; const R = surfR(d, M) * 1.02 + 0.004; if (l > R) q.copy(M.C).add(d.multiplyScalar(R / l)); }
      add(pts, style === 'cropped' ? 0.0003 : 0.00036, col(r() * 0.6));
    }
  }
  if (style === 'puff') {
    const B = V(M.C.x, M.top - 0.004 * M.sz, M.C.z - M.R.z * 0.42);          // the band, high on the crown
    for (let i = 0; i < (o.count || 11000); i++) {                         // drawn-up hair: hugs the skull, faint coil texture
      const { p, n } = scalp(r); if (!ok(p)) continue; const dist = p.distanceTo(B);
      const pts = grow(p, n, M, { len: dist * 1.05, segs: 14, dir: (q) => B.clone().sub(q).normalize(), lift: 0, hug: 0.92, attract: B, attractK: 0.22, curl: 0.0009, curlF: 900, shell0: 0.022, shell1: 0.03 }, r);
      add(pts, 0.00038, col(r() * 0.3));
    }
    const P0 = B.clone().add(V(0, 0.055 * M.sz, -0.012 * M.sz)), RP = (o.puff || 0.075) * M.sz;   // puff: coils radiating from the band to a fuzzy sphere
    for (let g = 0; g < (o.coils || 3600); g++) {
      const dir = V(r() - 0.5, r() * 1.1 - 0.1, r() - 0.55).normalize(); const L = RP * (0.75 + r() * 0.45); const segs = 26; const ph = r() * TAU; const cr = 0.0022 + r() * 0.0012, per = 0.006 + r() * 0.003;
      const b1 = new THREE.Vector3().crossVectors(dir, V(0.3, 1, 0.2)).normalize(), b2 = new THREE.Vector3().crossVectors(dir, b1);
      const start = B.clone().add(dir.clone().multiplyScalar(0.01)); const pts = [];
      for (let k = 0; k <= segs; k++) { const f = k / segs, a = ph + f * L / per * TAU; const q = start.clone().add(dir.clone().multiplyScalar(f * L)).add(b1.clone().multiplyScalar(Math.cos(a) * cr)).add(b2.clone().multiplyScalar(Math.sin(a) * cr));
        const d2 = q.clone().sub(P0); if (d2.length() > RP) q.copy(P0).add(d2.setLength(RP + (d2.length() - RP) * 0.25)); pushOut(q, M, 1.03); pts.push(q); }
      const c0 = col(0.2 + r() * 0.7); for (let k = 0; k < 3; k++) { const off = V((r() - 0.5) * 0.0014, (r() - 0.5) * 0.0014, (r() - 0.5) * 0.0014); add(pts.map(q => q.clone().add(off)), 0.00045, c0); }
    }
    strands.band = B;
  }
  if (style === 'beard' || style === 'stubble') {
    // face vertices of the head below the cheekbones, in front of the ears, around (not on) the lips
    const tris = []; const ey = M.eyes.y; const my = lerp(ey, M.chin, 0.62); let mz = -1e9;
    for (let i = 0; i < K.N; i++) if (Math.abs(h.P[i * 3] - M.C.x) < 0.006 && Math.abs(h.P[i * 3 + 1] - my) < 0.008) mz = Math.max(mz, h.P[i * 3 + 2]);
    const mouth = V(M.C.x, my, mz);
    for (let i = 0; i < K.bidx.length; i += 3) { const a = K.bmap[K.bidx[i]], b = K.bmap[K.bidx[i + 1]], c = K.bmap[K.bidx[i + 2]]; const y = (h.P[a * 3 + 1] + h.P[b * 3 + 1] + h.P[c * 3 + 1]) / 3, z = (h.P[a * 3 + 2] + h.P[b * 3 + 2] + h.P[c * 3 + 2]) / 3, x = (h.P[a * 3] + h.P[b * 3] + h.P[c * 3]) / 3;
      const rel = V(x, y, z); if (y > ey - 0.045 || y < M.chin - 0.035 || z < M.C.z - M.R.z * 0.25) continue;
      if (Math.abs(x - mouth.x) < 0.028 && Math.abs(y - mouth.y) < 0.011 && z > mouth.z - 0.02) continue;   // lips stay clear
      tris.push(a, b, c); }
    // under a full beard the skin takes the hair's colour (the root colour: darker for a dark beard, grey for a white one),
    // so the strands read as a dense mass instead of single hairs glinting against bare skin
    // (a grey beard needs the grey underneath even more: single white hairs over dark skin read as sugar sprinkles)
    const bc = new THREE.Color(o.color || '#2a1d14'), lum = bc.r * 0.3 + bc.g * 0.59 + bc.b * 0.11, dark = lum < 0.3 ? 1 : 1.2;
    if (h.body.geometry.attributes.hairMask) {   // full strength inside, fading over two rings of neighbours
      const w = new Float32Array(K.N); for (const v of tris) w[v] = 1;
      for (let ring = 0; ring < 3; ring++) { const nx = w.slice(); for (let f = 0; f < K.bidx.length; f += 3) { const t = [K.bmap[K.bidx[f]], K.bmap[K.bidx[f + 1]], K.bmap[K.bidx[f + 2]]]; const m = Math.max(w[t[0]], w[t[1]], w[t[2]]) * 0.55; for (const v of t) if (nx[v] < m) nx[v] = m; } w.set(nx); }
      const a = h.body.geometry.attributes.hairMask; for (let i = 0; i < K.bmap.length; i++) { const v = K.bmap[i]; if (w[v] > 0) a.setX(i, Math.max(a.getX(i), Math.min(0.92, (o.shadow ?? 0.7) * dark * w[v]))); } a.needsUpdate = true; }
    const s = sampler(h, tris); const L = style === 'stubble' ? 0.0025 : (o.len || 0.012);
    for (let i = 0; i < (o.count || 7000); i++) { const { p, n, root } = s(r); const pts = grow(p, n, M, { len: L * (0.6 + r() * 0.7), segs: style === 'stubble' ? 2 : 5, dir: () => V(0, -1, 0.25).normalize(), lift: 0.35, gravity: 0.05, curl: style === 'stubble' ? 0 : 0.0012, curlF: 500, shell0: -0.2, shell1: 0 }, r);
      strands.push({ pts, w0: o.w || 0.00026, c: col(r()), root }); }
    // (matte: a glossy beard sparkles; a light beard casts no shadow on its own grey under-layer, which would
    // otherwise go dark between the hairs and turn every strand into a white speck)
    return buildRibbons(h, M, strands, Object.assign({ roughness: 0.8, sheen: 0.06, castShadow: lum < 0.3, dim: lum < 0.3 ? 1 : 0.8, rootShade: lum < 0.3 ? 0.62 : 0.86 }, o));   // (dark roots under light tips read as specks)
  }
  return buildRibbons(h, M, strands, o);
}

// Level of detail: the strands are shuffled, so any leading run of them is an even thinning of the whole head; where a
// strand would be under about half a pixel wide, fewer strands are drawn, each widened to keep the coverage (the same
// look, a fraction of the triangles: a wide shot of eight people otherwise draws 2.5 million hair triangles).
function buildRibbons(h, M, strands, o) {
  const rs = prng(o.seed ? o.seed + 91 : 91); for (let i = strands.length - 1; i > 0; i--) { const j = Math.floor(rs() * (i + 1)); [strands[i], strands[j]] = [strands[j], strands[i]]; }
  let nv = 0, ni = 0; const cum = new Uint32Array(strands.length + 1); strands.forEach((s, i) => { nv += s.pts.length * 2; ni += (s.pts.length - 1) * 6; cum[i + 1] = ni; });
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), colr = new Float32Array(nv * 3), idx = new Uint32Array(ni), ofs = new Float32Array(nv * 3);
  const streakC = new THREE.Color(o.streakColor || '#7d746c');
  let v = 0, f = 0; const t = V(), side = V(), nn = V(), radial = V();
  const rr = prng(o.seed ? o.seed + 77 : 77);
  for (const s of strands) {
    const n = s.pts.length; const c = s.streak ? streakC : s.c;
    // where each strand reaches full width varies (a fixed point would line up into a hard edge parallel to the hairline)
    s.ramp = s.pts.length > 8 ? 0.06 + rr() * 0.3 : 0.2;
    for (let k = 0; k < n; k++) {
      const p = s.pts[k]; t.subVectors(s.pts[Math.min(n - 1, k + 1)], s.pts[Math.max(0, k - 1)]).normalize();
      radial.subVectors(p, M.C).normalize(); side.crossVectors(t, radial); if (side.lengthSq() < 1e-8) side.set(1, 0, 0); side.normalize(); nn.crossVectors(side, t).normalize();
      const w = s.w0 * Math.min(1, 0.35 + (k / (n - 1)) / s.ramp) * (1 - 0.7 * (k / (n - 1))); const tipFade = k / (n - 1);   // fine at the root, full, then tapering
      for (const sg of [-1, 1]) { pos[v * 3] = p.x + side.x * w * sg; pos[v * 3 + 1] = p.y + side.y * w * sg; pos[v * 3 + 2] = p.z + side.z * w * sg; nor[v * 3] = nn.x; nor[v * 3 + 1] = nn.y; nor[v * 3 + 2] = nn.z;
        ofs[v * 3] = side.x * w * sg; ofs[v * 3 + 1] = side.y * w * sg; ofs[v * 3 + 2] = side.z * w * sg;
        uv[v * 2] = k / (n - 1); uv[v * 2 + 1] = sg < 0 ? 0 : 1; const r0 = o.rootShade ?? 0.62, sh = (r0 + (1 - r0) * Math.min(1, tipFade / (s.ramp * 1.6))) * (o.dim ?? 1);   // darker towards the root (self-shadowing)
        colr[v * 3] = c.r * sh; colr[v * 3 + 1] = c.g * sh; colr[v * 3 + 2] = c.b * sh; v++; }
      if (k < n - 1) { const a = v - 2; idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], f); f += 6; }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(colr, 3)); g.setAttribute('ofs', new THREE.BufferAttribute(ofs, 3));
  if (strands.some(s => s.root) && h.UD) {
    g.morphAttributes.position = h.UD.map(D => { const a = new Float32Array(nv * 3); let q = 0;
      for (const s of strands) { const n2 = s.pts.length * 2; if (s.root) { const [i0, i1, i2, w0, w1, w2] = s.root; const dx = w0 * D[i0 * 3] + w1 * D[i1 * 3] + w2 * D[i2 * 3], dy = w0 * D[i0 * 3 + 1] + w1 * D[i1 * 3 + 1] + w2 * D[i2 * 3 + 1], dz = w0 * D[i0 * 3 + 2] + w1 * D[i1 * 3 + 2] + w2 * D[i2 * 3 + 2];
        for (let k = 0; k < n2; k++) { a[(q + k) * 3] = dx; a[(q + k) * 3 + 1] = dy; a[(q + k) * 3 + 2] = dz; } } q += n2; }
      return new THREE.BufferAttribute(a, 3); });
    g.morphTargetsRelative = true;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(nv * 4).map((_, i) => (i % 4 === 0 ? M.hb : 0)), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(nv * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: o.roughness ?? 0.6, metalness: 0, side: THREE.DoubleSide,
    sheen: o.sheen ?? 0.16, sheenRoughness: 0.45, sheenColor: new THREE.Color(o.color || '#1a1411').offsetHSL(0, -0.05, 0.13), specularIntensity: 0.26 });
  const widen = { value: 1 }; m.onBeforeCompile = (sh) => { sh.uniforms.hairWiden = widen;
    sh.vertexShader = 'attribute vec3 ofs;\nuniform float hairWiden;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += ofs * ( hairWiden - 1.0 );'); };
  m.customProgramCacheKey = () => 'hair-lod';
  const mesh = new THREE.SkinnedMesh(g, m); mesh.name = 'hair-strands'; mesh.bind(h.skeleton, new THREE.Matrix4()); mesh.castShadow = o.castShadow ?? true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const wRef = strands.reduce((a, s) => a + s.w0, 0) / Math.max(1, strands.length) * 2, head = h.skeleton.bones[M.hb], hp = V(), n = strands.length;
  mesh.userData.lod = (cam, H) => { const d = Math.max(0.05, head.getWorldPosition(hp).distanceTo(cam.position)), pxPerM = H / (2 * d * Math.tan(cam.fov * Math.PI / 360));
    const f = clamp(wRef * pxPerM / (o.lodPx ?? 0.5), o.lodMin ?? 0.08, 1); g.setDrawRange(0, cum[Math.max(1, Math.round(f * n))]); widen.value = 1 / f; };
  h.group.add(mesh); h.meshes.push(mesh);
  return { mesh, count: strands.length, tris: ni / 3 };
}

export function strandBrows(h, K, o = {}) {
  const M = h._head || (h._head = headModel(h, K)); const r = prng(o.seed || 21); const strands = [];
  const col = new THREE.Color(o.color || '#1a1411');
  const archAt = (u) => 0.019 + 0.004 * Math.cos((u - 0.004) / 0.028 * Math.PI) - 0.0035 * Math.max(0, u - 0.012) / 0.014;   // brow centre line above the eye
  const thAt = (u) => (o.thick || 0.0034) * (u < 0 ? 1.1 : 1 - 0.55 * Math.max(0, u) / 0.026);                          // thicker at the inner end, tapering out
  for (const side of ['L', 'R']) {
    const e = h.joint('eye.' + side); const out = Math.sign(e.x - M.C.x) || 1; const sz = M.sz;
    const tris = [];
    for (let f = 0; f < K.bidx.length; f += 3) { const a = K.bmap[K.bidx[f]], b = K.bmap[K.bidx[f + 1]], c = K.bmap[K.bidx[f + 2]];
      const x = (h.P[a * 3] + h.P[b * 3] + h.P[c * 3]) / 3, y = (h.P[a * 3 + 1] + h.P[b * 3 + 1] + h.P[c * 3 + 1]) / 3, z = (h.P[a * 3 + 2] + h.P[b * 3 + 2] + h.P[c * 3 + 2]) / 3;
      const u = (x - e.x) * out / sz;                                       // -inner (nose side) .. +outer
      if (u < -0.017 || u > 0.026 || z < e.z - 0.006) continue;
      if (Math.abs((y - e.y) / sz - archAt(u)) > thAt(u)) continue; tris.push(a, b, c); }
    const s = sampler(h, tris);
    // a soft shadow of the brow on the skin under the hairs, so the brow reads as a shape and not as hatching
    if (h.body.geometry.attributes.hairMask) { const a = h.body.geometry.attributes.hairMask, inB = new Set(tris);
      for (let i = 0; i < K.bmap.length; i++) if (inB.has(K.bmap[i])) a.setX(i, Math.max(a.getX(i), o.shadow ?? 0.45)); a.needsUpdate = true; }
    // the hairs lie flat and run out towards the temple, those along the top edge angled a little down and those along the
    // bottom a little up, so they meet along the middle (a herringbone) and the edges stay smooth; at the inner end they
    // stand up. Shorter towards the edges: hairs all pointing up and out make a bristling, spiky top edge
    for (let i = 0; i < Math.round((o.count || 380) * 2.1); i++) { const { p, n, root } = s(r); const u = (p.x - e.x) * out / sz, vy = clamp(((p.y - e.y) / sz - archAt(u)) / thAt(u), -1, 1);
      const inner = smoothstep(-0.004, -0.012, u), dir = V(out * (0.55 + 0.45 * Math.min(1, (u + 0.017) / 0.02)) * (1 - 0.45 * inner), lerp(0.14 - 0.5 * vy, 0.8 - 0.25 * vy, inner) + (r() - 0.5) * 0.16, 0.12).normalize();
      const pts = grow(p, n, M, { len: (o.len || 0.006) * (0.55 + r() * 0.5) * (1 - 0.4 * vy * vy), segs: 4, dir: () => dir, lift: 0.02, hug: 0.98, shell0: -1, shell1: 0 }, r);
      const c = col.clone().offsetHSL(0, (r() - 0.5) * 0.1, (r() - 0.35) * 0.14); strands.push({ pts, w0: (o.w || 0.00014) * 0.5, c, root }); }
  }
  return buildRibbons(h, M, strands, o);
}

// darken the skin under the hair toward the root colour, fading across the hairline (no bare scalp between strands)
export function scalpTint(h, K, color, o = {}) {
  const M = h._head || (h._head = headModel(h, K)); const a = h.body.geometry.attributes.hairMask; const soft = (o.soft || 0.007) * M.sz, amt = o.amount ?? 0.88;
  for (let i = 0; i < K.bmap.length; i++) { const v = K.bmap[i]; if (!M.onHead(v)) continue; const y = h.P[v * 3 + 1], hl = M.hairline(h.P[v * 3], h.P[v * 3 + 2]);
    a.setX(i, amt * smoothstep(hl - soft * 0.4, hl + soft + (o.band ?? 0.022) * M.sz, y)); }   // ramps up over the thinning hairline band
  const c = new THREE.Color(color), lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;   // (grey hair: a lighter root colour, also under a grey beard)
  a.needsUpdate = true; h.body.material.userData.hairRoot.value.copy(c).multiplyScalar(o.mul ?? (lum > 0.3 ? 0.88 : 0.7));
}

// matte under-layer on the scalp in the hair colour (hides skin between strands)
export function scalpLayer(h, K, color, o = {}) {
  const M = h._head || (h._head = headModel(h, K)); const tris = M.inner; const nv = tris.length; const pos = new Float32Array(nv * 3), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
  const hb = K.meta.bones.findIndex(b => b.name === 'head');
  // its outline runs along whole triangles, so it fades in over the outer 3 cm (an opaque edge shows as stair-steps at the temples)
  const rgba = new Float32Array(nv * 4);
  for (let i = 0; i < nv; i++) { const j = tris[i]; pos[i * 3] = h.P[j * 3]; pos[i * 3 + 1] = h.P[j * 3 + 1]; pos[i * 3 + 2] = h.P[j * 3 + 2]; si[i * 4] = hb; sw[i * 4] = 1;
    const d = (pos[i * 3 + 1] - M.hairline(pos[i * 3], pos[i * 3 + 2])) / M.sz - 0.03; rgba.set([1, 1, 1, smoothstep(0.0, 0.03, d)], i * 4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4)); g.setAttribute('color', new THREE.BufferAttribute(rgba, 4)); g.computeVertexNormals();
  const c = new THREE.Color(color), lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;   // (grey or fair hair over a near-black layer shows dark blotches)
  const m = new THREE.MeshLambertMaterial({ color: c.multiplyScalar(lerp(0.45, 0.85, smoothstep(0.08, 0.35, lum))), vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const mesh = new THREE.SkinnedMesh(g, m); mesh.bind(h.skeleton, new THREE.Matrix4()); mesh.frustumCulled = false; mesh.receiveShadow = true; h.group.add(mesh); h.meshes.push(mesh); return mesh;
}
