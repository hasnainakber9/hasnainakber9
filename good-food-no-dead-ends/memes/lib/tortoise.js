// A tortoise, about 1.1 m over the shell: a high domed carapace whose scutes (five vertebrals, four costals a side,
// a ring of marginals) are found by nearest-centre on the dome, so each plate has its own outline; seams are cut
// into the shell and growth rings run parallel to each plate's border. Columnar scaly legs with claws, a wrinkled
// neck, a hooked beak and wet eyes. Head towards +x, standing on y = 0.
import { K, THREE, V, sdfGeometry, sd } from './meme.js';

const lin = (c) => c.map(v => Math.pow(Math.max(0, v), 2.2));
const SH = { c: [0, 0.25, 0], r: [0.56, 0.47, 0.43], base: 0.27 };
// a point on the dome straight above (x, z)
const onDome = (x, z, lift = 0) => { const k = 1 - (x / SH.r[0]) ** 2 - (z / SH.r[2]) ** 2; return [x, SH.c[1] + SH.r[1] * Math.sqrt(Math.max(0, k)) + lift, z]; };
const CENTRES = [];
for (const x of [0.33, 0.165, 0, -0.165, -0.33]) CENTRES.push({ p: onDome(x, 0), w: 0, kind: 'v' });
for (const s of [1, -1]) for (const x of [0.25, 0.08, -0.1, -0.27]) CENTRES.push({ p: onDome(x * 0.98, s * 0.25), w: 0, kind: 'c' });
{ const n = 24; for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; CENTRES.push({ p: [Math.cos(a) * SH.r[0] * 0.98, SH.base + 0.05, Math.sin(a) * SH.r[2] * 0.98], w: 0.075, kind: 'm' }); } }
// nearest and second-nearest plate (weighted, so the marginals stay a narrow band round the rim)
function scute(x, y, z) {
  let d1 = 1e9, d2 = 1e9, i1 = 0;
  for (let i = 0; i < CENTRES.length; i++) { const c = CENTRES[i], d = Math.hypot(x - c.p[0], y - c.p[1], z - c.p[2]) + c.w; if (d < d1) { d2 = d1; d1 = d; i1 = i; } else if (d < d2) d2 = d; }
  return { e: d2 - d1, i: i1, d1 };
}
function shellSDF(x, y, z) {
  // the dome, flaring a little at the rim, open over the neck and the tail
  const flare = 1 + 0.05 * K.smooth((SH.base + 0.1 - y) / 0.1);
  let d = sd.ellipsoid(x / flare, y, z / flare, SH.c, SH.r);
  d = sd.smax(d, SH.base - y, 0.015);
  d = sd.smax(d, -sd.ellipsoid(x, y, z, [0.6, SH.base, 0], [0.12, 0.1, 0.16]), 0.03);
  d = sd.smax(d, -sd.ellipsoid(x, y, z, [-0.6, SH.base, 0], [0.08, 0.07, 0.12]), 0.03);
  if (d > 0.03) return d;
  const s = scute(x, y, z);
  d += 0.009 * (1 - K.smooth(s.e / 0.02));                                               // the seams between plates
  d -= 0.004 * K.smooth((s.e - 0.02) / 0.06);   // each plate bulges a little from its seams (growth rings are painted: finer relief would alias)
  return d;
}
export function tortoise(o = {}) {
  const g = new THREE.Group(), seed = o.seed || 3;
  // ---- carapace
  const shell = sdfGeometry(shellSDF, [-0.66, SH.base - 0.02, -0.52, 0.66, SH.c[1] + SH.r[1] + 0.03, 0.52], o.res || 0.0065, {
    color: (x, y, z) => { const s = scute(x, y, z), c = CENTRES[s.i], n = K.fbm(x * 9 + seed, z * 9 + y * 5, 3), nn = K.fbm(x * 40, z * 40 + y * 30, 2);
      // olive-brown plates, darker and greener at the centre (the areola), horn-coloured towards the border, dark seams
      const t = K.smooth(s.e / 0.07), rim = c.kind === 'm' ? 0.15 : 0;
      let r = K.lerp(0.26, 0.47, t * 0.75 + rim) * (0.85 + 0.3 * n), gg = K.lerp(0.21, 0.37, t * 0.75 + rim) * (0.85 + 0.3 * n), b = K.lerp(0.12, 0.2, t * 0.75) * (0.85 + 0.3 * n);
      const ring = 0.5 + 0.5 * Math.sin(s.e / 0.016 * Math.PI * 2); const rw = 1 - K.smooth((s.e - 0.03) / 0.04); r *= 1 + (ring - 0.5) * 0.1 * rw; gg *= 1 + (ring - 0.5) * 0.1 * rw;
      const seam = 1 - K.smooth(s.e / 0.016); r = K.lerp(r, 0.1, seam); gg = K.lerp(gg, 0.08, seam); b = K.lerp(b, 0.05, seam);
      const wear = K.smooth((y - 0.62) / 0.12) * 0.25; r += wear * 0.25; gg += wear * 0.22; b += wear * 0.16;      // the top of the dome is scuffed paler
      const k = 0.9 + 0.2 * nn; return lin([r * k, gg * k, b * k]); } });
  const shellM = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5 });   // (no normal map: the field has no UVs; the plates' relief is in the geometry)
  g.add(new THREE.Mesh(shell, shellM));
  // ---- plastron and the bridge (pale horn), just under the rim
  const pl = sdfGeometry((x, y, z) => sd.ellipsoid(x, y, z, [0, SH.base - 0.005, 0], [0.48, 0.05, 0.36]),
    [-0.55, SH.base - 0.08, -0.45, 0.55, SH.base + 0.06, 0.45], 0.012, { color: () => lin([0.5, 0.42, 0.28]) });
  g.add(new THREE.Mesh(pl, K.mat('#ffffff', { vertexColors: true, roughness: 0.7 })));

  // ---- skin: neck and head, legs, tail — one wrinkled, scaled surface
  const yaw = o.headYaw ?? 0.25, pitch = o.headPitch ?? 0.05, ext = o.neck ?? 1;
  const nb = V(0.5, SH.base + 0.05, 0), dir = V(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch) + 0.28, -Math.cos(pitch) * Math.sin(yaw)).normalize();
  const hp = nb.clone().addScaledVector(dir, 0.2 * ext), fwd = V(Math.cos(yaw), -0.12, -Math.sin(yaw)).normalize();   // head centre, and where the snout points
  const side = V(0, 1, 0).cross(fwd).normalize(), up = fwd.clone().cross(side).normalize();
  const H = (a, b, c) => hp.clone().addScaledVector(fwd, a).addScaledVector(up, b).addScaledVector(side, c);
  const legs = o.legs || [   // shoulders and hips tucked under the rim, the elbows out, the feet planted
    { hip: [0.27, 0.31, 0.19], knee: [0.4, 0.18, 0.4], foot: [0.47, 0.035, 0.37], r: 0.078 },     // left fore, reaching forward
    { hip: [0.27, 0.31, -0.19], knee: [0.3, 0.18, -0.42], foot: [0.21, 0.035, -0.4], r: 0.078 },   // right fore, pushing back
    { hip: [-0.3, 0.31, 0.19], knee: [-0.37, 0.17, 0.36], foot: [-0.39, 0.04, 0.33], r: 0.088 },    // left hind
    { hip: [-0.3, 0.31, -0.19], knee: [-0.25, 0.17, -0.37], foot: [-0.19, 0.04, -0.34], r: 0.088 },
  ];
  const A = (v) => v instanceof THREE.Vector3 ? [v.x, v.y, v.z] : v;
  const skin = (x, y, z) => {
    // neck: a thick, folded tube out of the shell to the head
    let d = sd.capsule(x, y, z, A(nb.clone().addScaledVector(dir, -0.08)), A(hp.clone().addScaledVector(fwd, -0.04)), 0.1, 0.062);
    // head: a blunt wedge, the beak hooked, the jaw line below
    let h = sd.ellipsoid(x, y, z, A(H(0, 0, 0)), [0.088, 0.07, 0.078]);
    h = sd.smin(h, sd.ellipsoid(x, y, z, A(H(0.065, -0.01, 0)), [0.055, 0.052, 0.052]), 0.03);
    h = sd.smin(h, sd.ellipsoid(x, y, z, A(H(0.108, -0.026, 0)), [0.024, 0.032, 0.032]), 0.012);   // the beak's tip
    for (const s of [1, -1]) h = sd.smax(h, -sd.capsule(x, y, z, A(H(0.128, -0.03, 0)), A(H(0.02, -0.042, s * 0.07)), 0.0035), 0.005);   // the mouth line, beak tip back to the jaw hinge
    for (const s of [1, -1]) h = sd.smin(h, sd.ellipsoid(x, y, z, A(H(-0.035, 0.005, s * 0.04)), [0.04, 0.045, 0.035]), 0.02);   // cheeks behind the eyes
    for (const s of [1, -1]) h = sd.smax(h, -sd.sphere(x, y, z, A(H(0.13, 0.006, s * 0.011)), 0.0045), 0.003);   // nostrils
    h = sd.smax(h, (new THREE.Vector3(x, y, z).sub(hp).dot(up)) - 0.06, 0.02);                  // the crown is flat
    for (const s of [1, -1]) h = sd.smin(h, sd.ellipsoid(x, y, z, A(H(0.03, 0.04, s * 0.045)), [0.03, 0.012, 0.018]), 0.012);   // brow ridges
    for (const s of [1, -1]) h = sd.smax(h, -sd.sphere(x, y, z, A(H(0.028, 0.02, s * 0.06)), 0.024), 0.008);   // eye sockets
    d = sd.smin(d, h, 0.03);
    for (const L of legs) { const r = L.r; d = sd.smin(d, sd.capsule(x, y, z, L.hip, L.knee, r * 1.05, r), 0.04); d = sd.smin(d, sd.capsule(x, y, z, L.knee, L.foot, r, r * 1.05), 0.03);
      d = sd.smin(d, sd.ellipsoid(x, y, z, [L.foot[0] + 0.015, 0.035, L.foot[2]], [r * 1.25, 0.04, r * 1.2]), 0.03); }
    d = sd.smin(d, sd.capsule(x, y, z, [-0.5, SH.base + 0.02, 0], [-0.62, 0.2, 0], 0.045, 0.012), 0.03);   // tail
    d = Math.max(d, -y + 0.004);
    // wrinkles round the neck, scales on the legs
    const nk = Math.max(0, 1 - Math.abs(sd.capsule(x, y, z, A(nb), A(hp), 0) - 0.07) / 0.05);
    const along = new THREE.Vector3(x, y, z).sub(nb).dot(dir);
    d += nk * 0.003 * Math.sin(along / 0.028 * Math.PI * 2 + K.noise2(x * 18, z * 18 + y * 11) * 5) * (0.5 + K.noise2(x * 25 + 7, y * 25));
    const sc = Math.sin(x * 160 + Math.sin(y * 90) * 2) * Math.sin(y * 160 + Math.sin(z * 90) * 2) * Math.sin(z * 150);
    if (y < SH.base + 0.05 && Math.abs(x) > 0.15) d -= 0.0028 * Math.abs(sc);
    d += 0.0012 * (K.noise2(x * 140 + z * 60, y * 140 - z * 50) - 0.5);
    return d;
  };
  const skinGeo = sdfGeometry(skin, [-0.7, 0, -0.55, Math.max(0.9, hp.x + 0.2), Math.max(0.7, hp.y + 0.15), 0.55], o.skinRes || 0.007, {
    color: (x, y, z) => { const n = K.fbm(x * 14 + 3, z * 14 + y * 9, 3), sp = K.fbm(x * 55, z * 55 + y * 40, 2);
      const v = new THREE.Vector3(x, y, z), nrm = 1;   // top-down shading of the skin's own colour: dark grey-brown above, paler under the neck and legs
      const under = y < SH.base && Math.abs(x) < 0.55 ? 0 : 0; let r = 0.36 + 0.12 * n, gg = 0.32 + 0.1 * n, b = 0.25 + 0.07 * n;
      const hd = v.distanceTo(hp) < 0.12 ? 1 : 0, belly = K.smooth(-(v.clone().sub(hp).dot(up)) / 0.05) * hd; r *= 0.82 + 0.25 * belly; gg *= 0.82 + 0.25 * belly; b *= 0.82 + 0.22 * belly;
      const head = new THREE.Vector3(x, y, z).distanceTo(hp) < 0.13; if (head && sp > 0.64) { r += 0.16; gg += 0.12; b += 0.02; }   // pale yellow flecks on the head
      if (y < 0.05) { r *= 0.8; gg *= 0.8; b *= 0.8; } return lin([r, gg, b]); } });
  const skinM = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color('#8a8070') });
  g.add(new THREE.Mesh(skinGeo, skinM));
  // claws: five on each fore foot, four on each hind foot
  const clawM = K.mat('#2a2318', { roughness: 0.35 });
  for (const L of legs) { const n = L.r > 0.075 ? 4 : 5; for (let k = 0; k < n; k++) { const a = (k / (n - 1) - 0.5) * 1.6, c = K.cyl(0.0, 0.012, 0.045, clawM, 8);
    const dx = Math.cos(a), dz = Math.sin(a); c.position.set(L.foot[0] + dx * L.r * 1.25 + 0.01, 0.018, L.foot[2] + dz * L.r * 1.15); c.rotation.set(0, -a, -Math.PI / 2 + 0.35); g.add(c); } }
  // eyes: dark, wet, with a gold ring round the pupil
  const eyeTex = K.canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#1a120b'; c.fillRect(0, 0, w, h); const gr = c.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.3); gr.addColorStop(0, '#000000'); gr.addColorStop(0.45, '#000000'); gr.addColorStop(0.55, '#6a4a1c'); gr.addColorStop(1, '#1a120b'); c.fillStyle = gr; c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2); c.fill(); });
  eyeTex.colorSpace = THREE.SRGBColorSpace;
  const lidM = new THREE.MeshPhysicalMaterial({ color: '#4a4235', roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color('#8a8070') });
  const eyeM = new THREE.MeshPhysicalMaterial({ map: eyeTex, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
  // (a sphere's UV centre faces +x: turn that out of the socket, sideways and a little forward)
  for (const s of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.021, 24, 16), eyeM); e.position.copy(H(0.03, 0.02, s * 0.052));
    const look = side.clone().multiplyScalar(s).addScaledVector(fwd, 0.7).normalize(); e.quaternion.setFromUnitVectors(V(1, 0, 0), look); g.add(e);
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.0195, 0.0055, 10, 28), lidM); lid.position.copy(e.position).addScaledVector(look, 0.006); lid.quaternion.setFromUnitVectors(V(0, 0, 1), look); lid.scale.set(1, 0.82, 1); g.add(lid); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData.head = hp; return g;
}
