// Fossil skeletons for the museum panel, built from parts: vertebrae (centrum, neural spine, transverse processes),
// ribs, a pelvis, limb bones with joint heads, toes and claws, skulls carved from signed distance fields (fenestrae cut
// out, teeth set in the jaws), and the steel armature a real museum mount stands on.
import { K, THREE, V, sdfGeometry, sd, taperTube } from './meme.js';
const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');

// fossil bone: brown-grey, darker in the crevices (vertex AO from noise), a dusty matte surface
export function boneMat(o = {}) {
  return new THREE.MeshStandardMaterial({ color: o.color || '#8b7660', roughness: 0.82, metalness: 0, vertexColors: true, normalMap: K.normalTex('rock', 6), normalScale: new THREE.Vector2(0.9, 0.9) });
}
const tint = (geo, base, k = 6, amt = 0.28, seed = 0) => { const p = geo.attributes.position, c = new Float32Array(p.count * 3), b = new THREE.Color(base);
  for (let i = 0; i < p.count; i++) { const n = K.fbm(p.getX(i) * k + seed, p.getY(i) * k + p.getZ(i) * k * 0.7 + seed * 1.3, 3), f = 1 - amt + amt * 2 * n; c[i * 3] = b.r * f; c[i * 3 + 1] = b.g * f * 0.98; c[i * 3 + 2] = b.b * f * 0.95; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo; };
const clean = (g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal'].includes(k)) n.deleteAttribute(k); return n; };
const place = (geo, pos, quat, scale = V(1, 1, 1)) => geo.applyMatrix4(new THREE.Matrix4().compose(pos, quat, scale));

// a vertebra at p, its body along `along`, neural spine towards `up`
export function vertebra(p, along, up, s, o = {}) {
  const parts = [], a = along.clone().normalize(), u = up.clone().sub(a.clone().multiplyScalar(up.dot(a))).normalize(), side = u.clone().cross(a).normalize();   // (x = y × z: a right-handed basis, so it is a rotation)
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, u, a));
  // centrum: a spool, waisted, with rims
  const cen = new THREE.LatheGeometry([[0.001, -0.5], [0.42, -0.5], [0.5, -0.42], [0.36, 0], [0.5, 0.42], [0.42, 0.5], [0.001, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  cen.rotateX(Math.PI / 2); parts.push(place(clean(cen), p, q, V(s * (o.cw || 0.95), s * (o.ch || 0.95), s * (o.cl || 0.9))));
  // neural arch and spine (a tapered blade), leaning back a little
  const sp = new THREE.BoxGeometry(1, 1, 1, 1, 3, 1); sp.translate(0, 0.5, 0); const P = sp.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i), t = 1 - y * 0.55; P.setX(i, P.getX(i) * t); P.setZ(i, P.getZ(i) * (1 - y * 0.25) - y * (o.lean ?? 0.25)); }
  parts.push(place(clean(sp), p.clone().addScaledVector(u, s * 0.22), q, V(s * 0.2, s * (o.spine ?? 0.9), s * (o.spineW ?? 0.5))));
  // transverse processes
  if (o.tp !== false) for (const sg of [1, -1]) { const tp = new THREE.CylinderGeometry(s * 0.07, s * 0.12, s * (o.tpl ?? 0.62), 7); tp.rotateZ(sg * (Math.PI / 2 - 0.35)); parts.push(place(clean(tp), p.clone().addScaledVector(u, s * 0.28).addScaledVector(side, sg * s * (o.tpl ?? 0.62) * 0.45), q)); }
  return parts;
}
// a spine: vertebrae along a curve, sizes per point, spine heights per point
export function spine(points, sizes, n, up = V(0, 1, 0), o = {}) {
  const c = new THREE.CatmullRomCurve3(points), parts = [], tops = [];
  const at = (arr, u) => { const f = u * (arr.length - 1), i = Math.min(arr.length - 2, Math.floor(f)); return K.lerp(arr[i], arr[i + 1], f - i); };
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, p = c.getPointAt(u), t = c.getTangentAt(u), s = at(sizes, u);
    parts.push(...vertebra(p, t, up, s, { spine: o.spine ? at(o.spine, u) : 0.9, lean: o.lean, tp: o.tp ? o.tp(u) : true, tpl: o.tpl, spineW: o.spineW, cl: o.cl ? o.cl(u) : 0.9 }));
    tops.push({ p, t, s, u }); }
  return { parts, tops, curve: c };
}
// a rib: from a vertebra out, down and round to near the midline
export function rib(root, side, down, fwd, len, w, bulge = 1) {
  const pts = [root.clone(), root.clone().addScaledVector(side, len * 0.22 * bulge).addScaledVector(down, len * 0.08), root.clone().addScaledVector(side, len * 0.36 * bulge).addScaledVector(down, len * 0.36).addScaledVector(fwd, len * 0.04),
    root.clone().addScaledVector(side, len * 0.32 * bulge).addScaledVector(down, len * 0.68).addScaledVector(fwd, len * 0.08), root.clone().addScaledVector(side, len * 0.16 * bulge).addScaledVector(down, len * 0.9).addScaledVector(fwd, len * 0.12)];
  return clean(taperTube(pts, [w, w * 1.05, w * 0.9, w * 0.7, w * 0.45], 7, { flat: 1.9, n: 26 }));
}
// a limb bone between two joints with swollen ends
export function longBone(a, b, r, o = {}) {
  const d = b.clone().sub(a), L = d.length(), parts = [], mid = a.clone().lerp(b, 0.5);
  const lat = new THREE.LatheGeometry([[0.001, -0.5], [0.7, -0.49], [1.0, -0.45], [0.95, -0.38], [0.55, -0.25], [0.45, 0], [0.5, 0.25], [0.95, 0.4], [1.05, 0.46], [0.75, 0.5], [0.001, 0.5]].map(([x, y]) => new THREE.Vector2(x * r, y * L)), 14);
  parts.push(place(clean(lat), mid, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, o.flat || 1)));
  return parts;
}
export function claw(base, dir, len, r) { const g = new THREE.ConeGeometry(r, len, 8); g.translate(0, len / 2, 0); const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()); return [place(clean(g), base, q)]; }
export function digit(points, r) { return [clean(taperTube(points, points.map((_, i) => r * (1 - i / points.length * 0.5)), 7, { n: points.length * 5 }))]; }

// a flat bone blade from a 2D outline (x along the body, y up), extruded to thickness t with rounded edges, placed at c
export function blade(outline, t, c, side = 0) {
  const sh = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: t * 0.6, bevelSize: t * 0.6, bevelSegments: 3, curveSegments: 24 });
  g.translate(c.x, c.y, c.z + side - t / 2); return clean(g);
}
// the steel armature: a vertical post from the floor and a curved bar under a spine
export function armature(posts, bars) {
  const m = new THREE.MeshStandardMaterial({ color: '#2b2d30', roughness: 0.45, metalness: 0.85 }), g = new THREE.Group();
  for (const [x, z, y] of posts) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, y, 10), m); c.position.set(x, y / 2, z); g.add(c);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 24), m); base.position.set(x, 0.015, z); g.add(base); }
  for (const pts of bars) g.add(new THREE.Mesh(taperTube(pts, pts.map(() => 0.016), 8), m));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g;
}
export function bake(parts, material, color, seed = 0) {
  const g = mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)), false); g.computeVertexNormals(); tint(g, color, 5, 0.42, seed);
  const m = new THREE.Mesh(g, material); m.castShadow = true; m.receiveShadow = true; return m;
}
export { tint };
