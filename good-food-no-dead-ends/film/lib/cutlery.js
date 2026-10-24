// GOOD FOOD. NO DEAD ENDS. — cutlery modelled from outlines (extruded, bevelled, bent) in brushed steel, plus how a
// hand holds each piece. Local axes: length along +z (tines / blade tip at +z), flat faces towards +y, origin where
// the index finger rests, so a prop can be attached to a hand frame (people.js attach) with one offset per grip.
import { THREE, V, clamp, lerp, smooth, canvasTex, noise2 } from './core.js';
const TAU = Math.PI * 2;

let _steel = null, _brushed = null;
function brushedTex() {   // fine lengthwise brushing (roughness variation) so reflections streak instead of mirroring the window
  if (_brushed) return _brushed;
  _brushed = canvasTex(64, 512, (g, w, h) => { const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 150 + (noise2(x * 0.9, y * 0.02) - 0.5) * 70 + (noise2(x * 3.1, y * 0.05) - 0.5) * 30; const i = (y * w + x) * 4; d[i] = 0; d[i + 1] = v; d[i + 2] = 0; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); }, { linear: true });
  _brushed.wrapS = _brushed.wrapT = THREE.RepeatWrapping; return _brushed;
}
export function steel() {
  return _steel || (_steel = new THREE.MeshPhysicalMaterial({ color: '#c9cdd1', metalness: 1, roughness: 0.42, roughnessMap: brushedTex(), envMapIntensity: 0.75, specularIntensity: 1 }));
}
// outline -> extruded slab (thickness t, small bevel), centred on y = 0
function slab(shape, t, bevel = 0.0006, curveSegments = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments });
  g.translate(0, 0, -(t - 2 * bevel) / 2); g.rotateX(Math.PI / 2);   // shape x -> x, shape y -> +z, thickness along y (no mirroring: winding stays outward)
  g.computeVertexNormals(); return g;
}
// bend a slab along z: y += f(z)
function bend(g, f) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + f(p.getZ(i))); g.computeVertexNormals(); return g; }

// table fork, 19 cm: handle end at z = -0.062, tine tips at z = +0.128
export function fork() {
  const s = new THREE.Shape(); const hw = (z) => z < 0.02 ? lerp(0.0058, 0.0105, smooth((z + 0.06) / 0.07)) * (1 - 0.35 * smooth((z - 0.0) / 0.03)) : 0;
  // handle: from the rounded end up to the neck
  s.moveTo(0, -0.062); s.absarc(0, -0.056, 0.0062, -Math.PI / 2, 0, false);
  const pts = []; for (let k = 0; k <= 20; k++) { const z = lerp(-0.056, 0.052, k / 20); const w = z < 0.035 ? lerp(0.0062, 0.0105, smooth((z + 0.056) / 0.06)) * (1 - 0.55 * smooth((z - 0.02) / 0.03)) : lerp(0.0045, 0.0118, smooth((z - 0.035) / 0.03)); pts.push([w, z]); }
  for (const [x, z] of pts) s.lineTo(x, z);
  // head: 4 tines with rounded slots between them
  const head = 0.052, tip = 0.128, W = 0.0118, tw = W * 2 / 7;   // tine width; slot width = (2W - 4 tw) / 3
  const slotW = (2 * W - 4 * tw) / 3;
  s.lineTo(W, tip - 0.003); s.quadraticCurveTo(W, tip, W - tw / 2, tip); s.quadraticCurveTo(W - tw, tip, W - tw, tip - 0.003);
  for (let k = 1; k <= 3; k++) { const xr = W - k * tw - (k - 1) * slotW; s.lineTo(xr, 0.085); s.absarc(xr - slotW / 2, 0.085, slotW / 2, 0, Math.PI, true);
    const xl = xr - slotW; s.lineTo(xl, tip - 0.003); s.quadraticCurveTo(xl, tip, xl - tw / 2, tip); s.quadraticCurveTo(xl - tw, tip, xl - tw, tip - 0.003); }
  for (const [x, z] of pts.slice().reverse()) s.lineTo(-x, z);
  s.absarc(0, -0.056, 0.0062, Math.PI, Math.PI * 1.5, false);
  const g = bend(slab(s, 0.0024), (z) => 0.012 * smooth((z - 0.03) / 0.06) * (z > 0.03 ? 1 : 0) - 0.004 * smooth((-z - 0.02) / 0.04) + 0.006 * Math.max(0, (z - 0.09) / 0.04) ** 2);
  const m = new THREE.Mesh(g, steel()); m.castShadow = true; m.receiveShadow = true; m.name = 'fork';
  const o = new THREE.Group(); o.add(m); o.userData.tip = V(0, 0.016, 0.12); return o;
}

// chef's knife: 20 cm blade (curved belly, spine at +x), black handle with three rivets; edge towards -x
let _handleMat = null;
export function chefKnife() {
  const o = new THREE.Group(); o.name = 'chef-knife';
  const b = new THREE.Shape(); const L = 0.2, H = 0.044;
  b.moveTo(0.004, 0.0); b.lineTo(0.004, L * 0.55); b.quadraticCurveTo(0.004, L * 0.9, -0.002, L);   // spine
  b.quadraticCurveTo(-H * 0.45, L * 0.93, -H, L * 0.62); b.lineTo(-H, 0.012); b.quadraticCurveTo(-H, 0.0, -H + 0.01, 0.0); b.lineTo(0.004, 0.0);   // edge with a belly, heel
  const bg = slab(b, 0.0022, 0.0004);
  // the blade thins to the edge: squeeze y with distance from the spine
  { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const k = clamp((0.004 - p.getX(i)) / H, 0, 1); p.setY(i, p.getY(i) * (1 - 0.75 * k)); } bg.computeVertexNormals(); }
  const blade = new THREE.Mesh(bg, steel()); blade.castShadow = true; o.add(blade);
  const h = new THREE.Shape(); h.moveTo(0.006, 0); h.lineTo(0.006, -0.11); h.quadraticCurveTo(0.006, -0.124, -0.008, -0.124); h.quadraticCurveTo(-0.026, -0.124, -0.026, -0.11); h.lineTo(-0.024, 0); h.lineTo(0.006, 0);
  const hg = slab(h, 0.016, 0.003, 16);
  _handleMat = _handleMat || new THREE.MeshPhysicalMaterial({ color: '#1d1a18', roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const handle = new THREE.Mesh(hg, _handleMat); handle.castShadow = true; o.add(handle);
  for (const z of [-0.022, -0.06, -0.098]) for (const sy of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.001, 16), steel()); r.position.set(-0.009, sy * 0.008, z); o.add(r); }
  o.userData.tip = V(-0.002, 0, 0.2); o.userData.edge = V(-0.044, 0, 0.1); return o;
}

// small paring / table knife for the kitchen scraps (s09a)
export function paringKnife() {
  const o = new THREE.Group(); const b = new THREE.Shape(); const L = 0.09, H = 0.018;
  b.moveTo(0.003, 0); b.lineTo(0.003, L * 0.7); b.quadraticCurveTo(0.003, L, -0.002, L); b.quadraticCurveTo(-H * 0.6, L * 0.85, -H, L * 0.4); b.lineTo(-H, 0.006); b.quadraticCurveTo(-H, 0, -H + 0.005, 0); b.lineTo(0.003, 0);
  const bg = slab(b, 0.0016, 0.0003); const blade = new THREE.Mesh(bg, steel()); blade.castShadow = true; o.add(blade);
  const h = new THREE.Shape(); h.moveTo(0.004, 0); h.lineTo(0.004, -0.085); h.quadraticCurveTo(0.004, -0.095, -0.007, -0.095); h.quadraticCurveTo(-0.018, -0.095, -0.018, -0.085); h.lineTo(-0.016, 0); h.lineTo(0.004, 0);
  const handle = new THREE.Mesh(slab(h, 0.013, 0.0025, 12), new THREE.MeshPhysicalMaterial({ color: '#6b4a2e', roughness: 0.55, clearcoat: 0.2 })); handle.castShadow = true; o.add(handle);
  o.userData.tip = V(-0.002, 0, L); return o;
}

// grips (hand frame: Y along the fingers, Z out of the palm; driver side 'L' has the thumb towards +X, 'R' towards -X)
const thumbSign = (s) => (s === 'L' ? 1 : -1);
const basis = (x, y, z) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
// fork held to eat: along the index finger at ~30 deg towards the thumb, pinched between thumb and index, the scoop of
// the tines facing away from the palm, handle end resting in the thumb web
export function forkGrip(s) { const ts = thumbSign(s), sn = 0.5 * ts, cs = 0.866;
  return { pos: [ts * 0.02, 0.028, 0.011], q: basis(V(cs, -sn, 0), V(0, 0, -1), V(sn, cs, 0)) }; }
// knife held to cut: handle across the palm inside the fist, blade out past the thumb side, edge towards the fingers
export function knifeGrip(s) { const ts = thumbSign(s);
  return { pos: [ts * 0.06, 0.011, 0.021], q: basis(V(0, -1, 0), V(0, 0, -ts), V(ts, 0, 0)) }; }
