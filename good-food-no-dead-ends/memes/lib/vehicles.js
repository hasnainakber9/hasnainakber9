// Road vehicles for the turtle panels: cars (sedan, hatch, SUV) and box trucks. Bodies are signed-distance shells
// (one smooth skin: hood, cabin with raked glass and tumblehome, wheel arches cut out) with the glass, trim and
// grille painted in as vertex colours; wheels, lamps, mirrors and plates are real parts. Front is +x, ground y = 0.
import { K, THREE, V, sdfGeometry, sd, printTex } from './meme.js';

const geoCache = {};
const TYPES = {
  sedan: { L: 4.7, W: 1.84, belt: 0.98, roof: 1.44, rw: 0.33, wb: 2.8, cab: [-0.25, 1.08, 0.95], rakeF: 1.55, rakeR: 1.25, hood: 0.92 },
  hatch: { L: 4.1, W: 1.78, belt: 0.98, roof: 1.48, rw: 0.32, wb: 2.6, cab: [-0.35, 1.2, 1.05], rakeF: 1.5, rakeR: 0.35, hood: 0.9 },
  suv:   { L: 4.8, W: 1.94, belt: 1.12, roof: 1.74, rw: 0.38, wb: 2.85, cab: [-0.35, 1.45, 1.1], rakeF: 1.2, rakeR: 0.35, hood: 1.06 },
};
// the shell of a car of a type, with colours: 1 = paint, dark = glass, grey = trim
function carGeo(type) {
  if (geoCache[type]) return geoCache[type];
  const T = TYPES[type], hL = T.L / 2, hW = T.W / 2, wells = [[T.wb / 2 - 0.05, 1], [-T.wb / 2 - 0.05, 1]];
  const sill = T.rw * 0.95, bodyTop = T.hood, cabCx = T.cab[0], cabBack = T.cab[1], cabFront = T.cab[2];
  const f = (x, y, z) => {
    const az = Math.abs(z);
    // the lower body: a long rounded box from sill to shoulder, its nose and tail rounded down
    let d = sd.box(x, y, z, [0, (sill + bodyTop) / 2, 0], [hL, (bodyTop - sill) / 2, hW], 0.17);
    d = sd.smax(d, (x - hL + 0.25) * 0.5 + (y - bodyTop) * 0.9, 0.12);          // the nose falls away to the bumper
    // the cabin: the glasshouse narrows as it rises (tumblehome) and leans back at the windscreen and forward at the rear glass
    const u = Math.max(0, y - T.belt), hx = x > cabCx ? cabFront - u * T.rakeF : cabBack - u * T.rakeR, hz = hW - 0.05 - u * 0.28;
    const q = [Math.abs(x - cabCx) - hx, y - T.roof, az - hz];
    const cab = Math.hypot(Math.max(q[0] + 0.12, 0), Math.max(q[1] + 0.12, 0), Math.max(q[2] + 0.12, 0)) + Math.min(Math.max(q[0] + 0.12, q[1] + 0.12, q[2] + 0.12), 0) - 0.12;
    d = sd.smin(d, Math.max(cab, T.belt - 0.1 - y), 0.07);
    // wheel arches
    for (const [wx] of wells) { const r = Math.hypot(x - wx, y - T.rw) - (T.rw + 0.07); d = sd.smax(d, -Math.max(r, hW - 0.32 - az), 0.025); }
    return d;
  };
  const geo = sdfGeometry(f, [-hL - 0.1, sill - 0.12, -hW - 0.1, hL + 0.1, T.roof + 0.1, hW + 0.1], 0.03, {
    color: (x, y, z) => {
      const u = y - T.belt, hx = x > cabCx ? cabFront - Math.max(0, u) * T.rakeF : cabBack - Math.max(0, u) * T.rakeR;
      const inCab = u > 0.03 && y < T.roof - 0.07 && Math.abs(x - cabCx) < hx + 0.2;
      const pillarB = Math.abs(x - (cabCx + 0.05)) < 0.06 && Math.abs(z) > hW * 0.6;
      if (inCab && !pillarB) return [0.035, 0.04, 0.045];                 // glass
      if (y < sill + 0.12) return [0.12, 0.12, 0.13];                      // sills and lower bumpers, unpainted plastic
      if (x > hL - 0.12 && y > sill + 0.18 && y < sill + 0.42 && Math.abs(z) < hW * 0.55) return [0.05, 0.05, 0.055];   // grille
      return [1, 1, 1]; } });
  geo.userData = T; return (geoCache[type] = geo);
}
const wheelGeos = {}, rimDark = K.mat('#2a2c2f', { roughness: 0.5, metalness: 0.6 });
function wheel(r, tyreM, rimM) {
  const g = new THREE.Group(), w = r * 0.66;
  if (!wheelGeos[r]) { const tyre = new THREE.LatheGeometry([[r * 0.6, -w / 2], [r * 0.92, -w / 2], [r, -w * 0.35], [r, w * 0.35], [r * 0.92, w / 2], [r * 0.6, w / 2]].map(([a, b]) => new THREE.Vector2(a, b)), 36);
    const rim = new THREE.CylinderGeometry(r * 0.62, r * 0.62, w * 0.9, 32); wheelGeos[r] = { tyre, rim, lip: new THREE.TorusGeometry(r * 0.6, r * 0.035, 8, 40), spoke: new THREE.BoxGeometry(r * 0.13, r * 0.6, w * 0.1).translate(0, r * 0.3, 0) }; }
  const G = wheelGeos[r], tyre = new THREE.Mesh(G.tyre, tyreM); tyre.rotation.x = Math.PI / 2; g.add(tyre);
  const rim = new THREE.Mesh(G.rim, rimDark); rim.rotation.x = Math.PI / 2; g.add(rim);
  const lip = new THREE.Mesh(G.lip, rimM); lip.position.z = w * 0.42; g.add(lip);
  const hub = new THREE.Group(); hub.position.z = w * 0.42; g.add(hub);
  for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(G.spoke, rimM); s.rotation.z = k / 5 * Math.PI * 2; hub.add(s); }
  hub.add(K.cyl(r * 0.14, r * 0.14, 0.02, rimM, 20)); hub.children[hub.children.length - 1].rotation.x = Math.PI / 2;
  return g;
}
const lampM = (c, i) => new THREE.MeshStandardMaterial({ color: '#000000', emissive: c, emissiveIntensity: i, roughness: 0.2 });
const plateTex = (txt) => printTex(0.52, 0.12, (g, w, h) => { g.fillStyle = '#f2f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2a2a'; g.lineWidth = h * 0.06; g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
  g.fillStyle = '#1d2026'; g.font = `700 ${h * 0.62}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h * 0.54); }, 1400);

export function car(o = {}) {
  const type = o.type || 'sedan', geo = carGeo(type), T = geo.userData, g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: o.color || '#8a8f96', vertexColors: true, roughness: 0.32, metalness: o.metal ?? 0.45, clearcoat: 1, clearcoatRoughness: 0.08 });
  const body = new THREE.Mesh(geo, paint); g.add(body);
  const tyreM = K.mat('#1b1b1c', { roughness: 0.85 }), rimM = K.mat(o.rim || '#b9bcc0', { roughness: 0.3, metalness: 0.9 });
  for (const x of [T.wb / 2 - 0.05, -T.wb / 2 - 0.05]) for (const s of [1, -1]) { const w = wheel(T.rw, tyreM, rimM); w.position.set(x, T.rw, s * (T.W / 2 - 0.2)); if (s < 0) w.rotation.y = Math.PI; g.add(w); }
  // lamps: headlamps (lit, in daylight running mode or on), tail lamps
  const hlM = lampM('#fff3dc', o.lights ?? 1.6), tlM = lampM('#ff2a1a', o.tail ?? 0.9);
  for (const s of [1, -1]) {
    const hl = K.sphere(1, hlM, { w: 20, h: 12 }); hl.scale.set(0.05, 0.065, 0.2); hl.position.set(T.L / 2 - 0.13, T.hood - 0.12, s * (T.W / 2 - 0.3)); hl.rotation.y = s * 0.25; g.add(hl);
    const tl = K.sphere(1, tlM, { w: 16, h: 10 }); tl.scale.set(0.04, 0.07, 0.22); tl.position.set(-T.L / 2 + 0.06, T.hood - 0.08, s * (T.W / 2 - 0.25)); g.add(tl);
    const mir = K.box(0.16, 0.12, 0.2, paint, { r: 0.04 }); mir.position.set(T.cab[0] + T.cab[2] - 0.2, T.belt + 0.05, s * (T.W / 2 + 0.06)); g.add(mir);
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), K.mat('#ffffff', { map: plateTex(o.plate || 'TRT 204'), roughness: 0.5 }));
  plate.rotation.y = Math.PI / 2; plate.position.set(T.L / 2 + 0.02, T.rw * 1.05 + 0.08, 0); g.add(plate);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

// a box truck: a cab with a raked screen and a short bonnet, a box body behind, dual rear wheels
let cabGeo = null;
export function truck(o = {}) {
  const g = new THREE.Group(), W = 2.4, rw = 0.48;
  if (!cabGeo) cabGeo = sdfGeometry((x, y, z) => { let d = sd.box(x, y, z, [0, 1.65, 0], [1.05, 1.05, W / 2], 0.18);
      d = sd.smax(d, (x - 0.55) * 0.95 + (y - 2.25) * 0.3, 0.08);           // the windscreen leans back
      d = sd.smin(d, sd.box(x, y, z, [1.05, 1.0, 0], [0.38, 0.42, W / 2 - 0.02], 0.14), 0.12);   // a short bonnet
      for (const s of [1, -1]) d = sd.smax(d, -Math.max(Math.hypot(x - 0.75, y - rw) - rw - 0.08, W / 2 - 0.35 - s * z), 0.03);
      return d; }, [-1.2, 0.5, -W / 2 - 0.1, 1.6, 2.8, W / 2 + 0.1], 0.035, {
      color: (x, y, z) => { if (y > 1.75 && y < 2.55 && ((x > 0.25 && Math.abs(z) < W / 2 - 0.12) || (Math.abs(z) > W / 2 - 0.1 && x > -0.35 && x < 0.75))) return [0.035, 0.04, 0.045];
        if (x > 1.25 && y > 0.75 && y < 1.25 && Math.abs(z) < 0.85) return [0.06, 0.06, 0.065]; if (y < 0.72) return [0.14, 0.14, 0.15]; return [1, 1, 1]; } });
  const paint = new THREE.MeshPhysicalMaterial({ color: o.color || '#e8e8e4', vertexColors: true, roughness: 0.35, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  g.add(new THREE.Mesh(cabGeo, paint));
  const boxM = K.mat(o.box || '#d9dbdc', { roughness: 0.55, metalness: 0.1 }), dark = K.mat('#2a2c30', { roughness: 0.6, metalness: 0.4 });
  const L = o.len || 5.6; const bx = K.box(L, 2.6, W + 0.06, boxM, { r: 0.05 }); bx.position.set(-1.25 - L / 2, 2.05, 0); g.add(bx);
  for (let i = 1; i < 8; i++) g.add(K.at(K.box(0.04, 2.5, W + 0.08, boxM), -1.25 - L * i / 8, 2.05, 0));   // the box's ribbed panels
  if (o.stripe) g.add(K.at(K.box(L - 0.4, 0.28, W + 0.1, K.mat(o.stripe, { roughness: 0.5 })), -1.25 - L / 2, 1.2, 0));
  g.add(K.at(K.box(L + 2.2, 0.25, 1.0, dark), -L / 2, 0.62, 0));   // chassis
  const tyreM = K.mat('#1b1b1c', { roughness: 0.85 }), rimM = K.mat('#8d9196', { roughness: 0.35, metalness: 0.85 });
  for (const [x, dual] of [[0.75, 0], [-1.25 - L * 0.72, 1]]) for (const s of [1, -1]) for (let k = 0; k <= dual; k++) { const w = wheel(rw, tyreM, rimM); w.position.set(x, rw, s * (W / 2 - 0.25 - k * 0.34)); if (s < 0) w.rotation.y = Math.PI; g.add(w); }
  const hlM = lampM('#fff3dc', o.lights ?? 1.8);
  for (const s of [1, -1]) { const hl = K.box(0.06, 0.18, 0.34, hlM); hl.position.set(1.43, 1.12, s * (W / 2 - 0.3)); g.add(hl);
    const mir = K.box(0.08, 0.36, 0.08, dark); mir.position.set(0.45, 2.15, s * (W / 2 + 0.22)); g.add(mir); g.add(K.at(K.box(0.04, 0.04, 0.24, dark), 0.45, 2.3, s * (W / 2 + 0.1))); }
  g.add(K.at(K.box(0.08, 0.22, W - 0.3, K.mat('#3a3c40', { roughness: 0.4, metalness: 0.6 })), 1.46, 0.72, 0));   // bumper
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
export { TYPES };
