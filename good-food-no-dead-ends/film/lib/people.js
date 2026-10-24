// GOOD FOOD. NO DEAD ENDS. — recurring cast as hand-sculpted-looking 3D puppets.
// One build per character → identical in every shot (continuity). All motion is a pure function of t.
import { THREE, V, clamp, lerp, smooth, prng, M4, clayMat, canvasTex, noise2, BGU, RoundedBoxGeometry } from './core.js';
import { loadKit, buildHuman } from './humans.js';
import { strandHair, scalpLayer, scalpTint, strandBrows } from './hair.js';
import { vest, labCoat, apron, scarf, cap, headwrap } from './wardrobe.js';
const KIT = await loadKit();                       // MakeHuman (CC0) assets for the realistic cast
const CLAY = typeof location !== 'undefined' && new URLSearchParams(location.search).has('clay');   // ?clay renders the original puppets

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ cast bible (wardrobe locked here)
export const CAST = {
  ASHA:      { build: 'f', height: 1.68, skin: '#7a4b30', hair: '#1d1511', hairStyle: 'bun', streak: '#9a918a', iris: '#3b2414', top: '#d9c8a4', outer: 'overshirt', outerColor: '#5d6a3a', sleeves: 'rolled', pants: '#3e3932', shoes: '#4b3526', boots: true, scarf: '#cf5f2a' },
  NOOR:      { build: 'child', height: 1.38, skin: '#9c6744', hair: '#15100c', hairStyle: 'curly', iris: '#2b1a10', top: '#f1c33a', outer: 'hoodie', sleeves: 'long', pants: '#3d5f94', shoes: '#f2efe8' },
  LUIS:      { build: 'm', height: 1.78, skin: '#c08a64', hair: '#2a1f17', hairStyle: 'short', beard: true, iris: '#3a2618', top: '#a8c0d8', outer: 'puffer', outerColor: '#26364f', sleeves: 'long', pants: '#2d2f36', shoes: '#2a2a2a' },
  MAYA:      { build: 'f', height: 1.64, skin: '#eec8a6', hair: '#5a321c', hairStyle: 'ponytail', iris: '#56693a', glasses: true, top: '#7b5ea8', outer: 'labcoat', outerColor: '#f2f2ec', sleeves: 'long', sleeveColor: '#f2f2ec', pants: '#39414f', shoes: '#e6e6e6' },
  COLLEAGUE: { build: 'm', height: 1.82, skin: '#3e2a20', hair: '#0f0c0b', hairStyle: 'short', beard: false, iris: '#1d120c', top: '#5a8a72', outer: 'labcoat', outerColor: '#f2f2ec', sleeves: 'long', sleeveColor: '#f2f2ec', pants: '#2a2f3a', shoes: '#333333' },
  WORKER:    { build: 'm', height: 1.73, skin: '#d9ab86', hair: '#6a4428', hairStyle: 'cap', capColor: '#2f4a63', iris: '#3a2a1a', top: '#6b7884', outer: 'hivis', outerColor: '#d2ea3c', sleeves: 'short', pants: '#34373c', shoes: '#222222' },
  VENDOR:    { build: 'm', height: 1.69, skin: '#6b4633', hair: '#a29d96', hairStyle: 'flatcap', capColor: '#5a4a3a', beard: 'grey', iris: '#24160e', top: '#a9553a', outer: 'apron', outerColor: '#d8ceb6', sleeves: 'rolled', pants: '#3b3b3b', shoes: '#3b2f27' },
  COOK:      { build: 'f', height: 1.62, skin: '#b07650', hair: '#1b1b1b', hairStyle: 'wrap', wrapColor: '#b8322a', iris: '#2a1a10', top: '#5b3e7b', outer: 'apron', outerColor: '#efe6d2', sleeves: 'rolled', pants: '#2f2f2f', shoes: '#222222' },
};
const EXTRA_SKINS = ['#f1d0b0', '#e2b48e', '#c99a76', '#a9744f', '#8a5a3c', '#5e3c2b', '#40291f', '#d9ab86'];
const EXTRA_TOPS = ['#8c6f5a', '#5e7f8c', '#b65a3a', '#6e8d5a', '#9a7fb0', '#c8b48a', '#4a6b8a', '#d1a054', '#7a8c5e', '#a04a5a', '#3f6f6a', '#c7c2b8'];
const EXTRA_PANTS = ['#3b3b3b', '#2b3a55', '#5a4a3a', '#6d6d6d', '#3a4a3a', '#22252b'];
const EXTRA_HAIR = ['#111111', '#2a1b14', '#5a3b22', '#7a7570', '#b58a5a', '#c9c4bc', '#3a2418'];
export function extraSpec(i, o = {}) {
  const r = prng(1000 + i * 97);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const build = o.build || (o.child ? 'child' : (r() < 0.5 ? 'f' : 'm'));
  const styles = build === 'm' ? ['short', 'short', 'cap', 'flatcap', 'bald'] : build === 'child' ? ['curly', 'ponytail', 'short'] : ['bun', 'ponytail', 'wrap', 'curly', 'short'];
  const elder = o.elder ?? (build !== 'child' && r() < 0.22);
  return Object.assign({ build, height: build === 'child' ? 1.2 + r() * 0.25 : (build === 'm' ? 1.68 + r() * 0.16 : 1.56 + r() * 0.14), skin: pick(EXTRA_SKINS), hair: elder ? pick(['#c9c4bc', '#a29d96', '#e0dcd5']) : pick(EXTRA_HAIR),
    hairStyle: pick(styles), iris: '#2a1a10', top: pick(EXTRA_TOPS), outer: r() < 0.35 ? pick(['overshirt', 'puffer', 'apron']) : 'none', outerColor: pick(EXTRA_TOPS), sleeves: pick(['long', 'short', 'rolled']),
    pants: pick(EXTRA_PANTS), shoes: pick(['#222222', '#4b3526', '#e8e4dc', '#5a4a3a']), capColor: pick(EXTRA_TOPS), wrapColor: pick(['#b8322a', '#2f6b5a', '#d1a054', '#5a3d7a']), stoop: elder ? 0.12 : 0, beard: build === 'm' && r() < 0.3 ? (elder ? 'grey' : true) : false }, o);
}

// ------------------------------------------------------------------ proportions
const DIMS = {
  m: { thigh: 0.43, shin: 0.39, ankle: 0.075, torso: 0.54, neck: 0.065, headR: 0.122, shoulder: 0.19, hipW: 0.088, upper: 0.29, fore: 0.255, girth: 1.0, waist: 1.0, hipG: 1.0, eye: 0.165 },
  f: { thigh: 0.42, shin: 0.38, ankle: 0.07, torso: 0.52, neck: 0.065, headR: 0.12, shoulder: 0.175, hipW: 0.09, upper: 0.28, fore: 0.245, girth: 0.93, waist: 0.9, hipG: 1.07, eye: 0.17 },
  child: { thigh: 0.33, shin: 0.30, ankle: 0.06, torso: 0.41, neck: 0.05, headR: 0.13, shoulder: 0.14, hipW: 0.07, upper: 0.22, fore: 0.19, girth: 0.78, waist: 0.95, hipG: 0.95, eye: 0.195 },
};
const TORSO = [[0.00, 0.150], [0.08, 0.146], [0.20, 0.138], [0.32, 0.140], [0.46, 0.150], [0.60, 0.160], [0.74, 0.166], [0.84, 0.162], [0.91, 0.140], [0.96, 0.095], [1.00, 0.058]];
const DEPTH = 0.70; // front-back flattening of the torso

// skull deformation: unit-sphere direction → stylised head shape (units of head radius)
function skullPoint(x, y, z, child) {
  let X = x * (child ? 0.88 : 0.84), Y = y, Z = z * 0.92;
  if (y < 0) { const k = 1 - 0.2 * Math.pow(-y, 1.5); X *= k; Z *= 1 - 0.06 * y * y; }
  if (y < -0.45 && z > 0) Z += 0.07 * (-y - 0.45) * z;
  if (z > 0.55) Z -= (z - 0.55) * 0.1;
  if (z < -0.2 && y > -0.4) Z *= 1.04;
  const ch = Math.exp(-((y + 0.22) ** 2) / 0.03) * Math.max(0, z - 0.25) * Math.max(0, Math.abs(x) - 0.25);
  X += Math.sign(x) * ch * 0.25; Z += ch * 0.1;
  if (child) { Y *= 0.97; }
  return [X, Y, Z];
}
function skullGeometry(r, o = {}) {
  const g = new THREE.SphereGeometry(1, o.w || 44, o.h || 32, o.phiStart ?? 0, o.phiLength ?? TAU, o.thetaStart ?? 0, o.thetaLength ?? Math.PI);
  g.rotateY(-Math.PI / 2);                       // UV seam to the back of the head
  if (o.edge) {                                  // hair caps: arched hairline — coverage limit varies with azimuth
    const q = g.attributes.position;
    for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), z = q.getZ(i); const th = Math.acos(clamp(y, -1, 1)), ph = Math.atan2(x, z); const lim = o.edge(ph); if (th > lim) { const st = Math.sin(lim); q.setXYZ(i, st * Math.sin(ph), Math.cos(lim), st * Math.cos(ph)); } }
  }
  if (o.tilt) g.rotateX(o.tilt);                 // hair caps: tilt the coverage back to make a hairline
  const p = g.attributes.position, sc = o.scale || 1;
  for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)).normalize(); const [X, Y, Z] = skullPoint(v.x, v.y, v.z, o.child); p.setXYZ(i, X * r * sc, Y * r * sc, Z * r * sc); }
  g.computeVertexNormals(); return g;
}
// frontmost point on the skull surface near (x, y) in head-radius units
function skullFront(x, y, child) {
  let best = null, bd = 1e9;
  for (let i = 0; i <= 60; i++) for (let j = 0; j <= 60; j++) {
    const th = (i / 60) * Math.PI, ph = (j / 60) * Math.PI - Math.PI / 2;
    const ux = Math.sin(th) * Math.sin(ph), uy = Math.cos(th), uz = Math.sin(th) * Math.cos(ph);
    if (uz < 0) continue; const [X, Y, Z] = skullPoint(ux, uy, uz, child); const d = (X - x) ** 2 + (Y - y) ** 2;
    if (d < bd) { bd = d; best = Z; }
  }
  return best;
}

function eyeTexture(iris) {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f3ede4'; g.fillRect(0, 0, w, h);
    const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(160,110,100,0.25)'); sh.addColorStop(0.35, 'rgba(0,0,0,0)'); sh.addColorStop(0.65, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(160,110,100,0.25)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    const cx = 64, cy = 64, R = 22;
    const gr = g.createRadialGradient(cx, cy, 2, cx, cy, R); const c = new THREE.Color(iris);
    const lighter = c.clone().offsetHSL(0, 0.05, 0.12).getStyle(), darker = c.clone().offsetHSL(0, 0, -0.12).getStyle();
    gr.addColorStop(0, lighter); gr.addColorStop(0.7, c.getStyle()); gr.addColorStop(0.92, darker); gr.addColorStop(1, '#120a06');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, R, R, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; for (let a = 0; a < TAU; a += 0.35) { g.beginPath(); g.moveTo(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11); g.lineTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20); g.stroke(); }
    g.fillStyle = '#050302'; g.beginPath(); g.ellipse(cx, cy, 9.5, 9.5, 0, 0, TAU); g.fill();
  }, { clamp: false });
}

let _strands = null;
function strandNormal() {
  if (_strands) return _strands;
  _strands = canvasTex(512, 256, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data; const H = (x, y) => Math.sin(x / w * TAU * 70 + noise2(x / 18, y / 40) * 5 + noise2(x / 60, y / 90) * 9) * 0.5 + 0.5;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2, dy = (H(x, y + 1) - H(x, y - 1)) * 0.6; const n = V(-dx, -dy, 1).normalize(); const i = (y * w + x) * 4; d[i] = (n.x * 0.5 + 0.5) * 255; d[i + 1] = (n.y * 0.5 + 0.5) * 255; d[i + 2] = (n.z * 0.5 + 0.5) * 255; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
  }, { linear: true });
  return _strands;
}
// ------------------------------------------------------------------ the puppet
export class Puppet {
  constructor(name, spec) {
    this.name = name; this.spec = spec = Object.assign({}, spec);
    const D = this.D = DIMS[spec.build] || DIMS.m;
    const child = this.child = spec.build === 'child';
    const r = D.headR;
    const ref = D.thigh + D.shin + D.ankle + 0.04 + D.torso + D.neck + 0.92 * r + 1.0 * r;
    const s = this.s = spec.height / ref;
    this.hipY = (D.thigh + D.shin + D.ankle) * s;
    this.seed = [...name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0; this.rand = prng(this.seed);
    this.phase = this.rand() * 10;
    const mats = this.mats = {
      skin: clayMat(spec.skin, { normal: 'skin', nrep: 3, ns: 0.12, roughness: 0.55, sheen: 0.45, sheenColor: new THREE.Color(spec.skin).offsetHSL(0.0, 0.1, 0.2).getStyle() }),
      top: clayMat(spec.top, { normal: 'cloth', nrep: 2, ns: 0.45, roughness: 0.86, sheen: 0.6, sheenColor: new THREE.Color(spec.top).offsetHSL(0, 0, 0.18).getStyle() }),
      sleeve: clayMat(spec.sleeveColor || (spec.outer === 'overshirt' || spec.outer === 'labcoat' ? spec.outerColor : spec.top), { normal: 'cloth', nrep: 2, ns: 0.45, roughness: 0.86, sheen: 0.5 }),
      outer: clayMat(spec.outerColor || '#888', { normal: spec.outer === 'puffer' ? 'clay' : 'cloth', nrep: 2, ns: 0.5, roughness: spec.outer === 'puffer' ? 0.55 : 0.85, sheen: 0.5, side: THREE.DoubleSide }),
      pants: clayMat(spec.pants, { normal: 'cloth', nrep: 2, ns: 0.4, roughness: 0.9, sheen: 0.4 }),
      shoes: clayMat(spec.shoes, { normal: 'clay', ns: 0.2, roughness: 0.5 }),
      hair: (() => { const m = clayMat(spec.hair, { normal: spec.hairStyle === 'curly' ? 'rock' : 'clay', nrep: 2, ns: 0.6, roughness: 0.55, sheen: 0.35, sheenColor: new THREE.Color(spec.hair).offsetHSL(0, 0, 0.18).getStyle() }); if (spec.hairStyle !== 'curly') { m.normalMap = strandNormal(); m.normalScale.set(0.7, 0.7); } return m; })(),
      dark: new THREE.MeshStandardMaterial({ color: '#2a0e0c', roughness: 0.9 }),
      lip: clayMat(new THREE.Color(spec.skin).offsetHSL(0.0, 0.08, -0.12).getStyle(), { normal: 'skin', ns: 0.1, roughness: 0.5 }),
      mouthLine: new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.skin).offsetHSL(0.0, 0.1, -0.3).getStyle(), roughness: 0.6 }),
      teeth: new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.4 }),
      eye: new THREE.MeshPhysicalMaterial({ map: eyeTexture(spec.iris || '#3a2618'), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
      accent: clayMat(spec.scarf || spec.capColor || spec.wrapColor || '#888', { normal: 'cloth', ns: 0.45, roughness: 0.85, sheen: 0.5 }),
    };
    this.parts = new Map();
    this.build();
    this.k = { act: [], look: [], face: [], walk: [], handL: [], handR: [] };
    this.lines = [];
    this.blinks = []; let bt = this.rand() * 2; while (bt < 200) { this.blinks.push(bt); bt += 1.8 + this.rand() * 3.2; }
  }
  // ---------------------------------------------------------------- construction
  part(bone, matKey, geo, m) { const key = bone.uuid + '|' + matKey; if (!this.parts.has(key)) this.parts.set(key, { bone, matKey, geos: [] }); const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (m) g.applyMatrix4(m); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); this.parts.get(key).geos.push(g); }
  finalize() { for (const { bone, matKey, geos } of this.parts.values()) { const g = BGU.mergeGeometries(geos, false); const m = new THREE.Mesh(g, this.mats[matKey]); m.castShadow = true; m.receiveShadow = true; bone.add(m); } this.parts.clear(); }
  build() {
    const { D, s, spec, child } = this; const g = D.girth;
    const root = this.root = new THREE.Group(); root.name = this.name;
    const hips = this.hips = new THREE.Group(); hips.position.y = this.hipY; root.add(hips);
    // pelvis + legs
    this.part(hips, 'pants', new THREE.SphereGeometry(1, 22, 16), M4(0, 0.02 * s, 0, 0, 0, 0, 0.152 * g * D.hipG * s, 0.13 * s, 0.112 * g * D.hipG * s));
    this.legs = {};
    for (const side of ['L', 'R']) {
      const sg = side === 'L' ? -1 : 1;
      const leg = new THREE.Group(); leg.position.set(sg * D.hipW * s, 0, 0); hips.add(leg);
      this.part(leg, 'pants', new THREE.SphereGeometry(0.074 * g * s, 16, 12));
      this.part(leg, 'pants', new THREE.CylinderGeometry(0.074 * g * s, 0.056 * g * s, D.thigh * s, 16), M4(0, -D.thigh * s / 2, 0));
      const knee = new THREE.Group(); knee.position.y = -D.thigh * s; leg.add(knee);
      this.part(knee, 'pants', new THREE.SphereGeometry(0.057 * g * s, 14, 10));
      this.part(knee, 'pants', new THREE.CylinderGeometry(0.055 * g * s, 0.046 * g * s, D.shin * s, 14), M4(0, -D.shin * s / 2, 0));
      const ankle = new THREE.Group(); ankle.position.y = -D.shin * s; knee.add(ankle);
      if (spec.boots) this.part(ankle, 'shoes', new THREE.CylinderGeometry(0.056 * g * s, 0.058 * g * s, 0.13 * s, 14), M4(0, 0.0, 0));
      this.part(ankle, 'shoes', new RoundedBoxGeometry(0.105 * s * (child ? 0.95 : 1), 0.08 * s, 0.26 * s * (child ? 0.9 : 1), 3, 0.035 * s), M4(0, -D.ankle * s + 0.04 * s, 0.045 * s));
      this.legs[side] = { leg, knee, ankle };
    }
    // spine + torso
    const spine = this.spine = new THREE.Group(); spine.position.y = 0.04 * s; hips.add(spine);
    const L = D.torso * s;
    const prof = (scale = 1, y0 = 0, y1 = 1, extra = null) => TORSO.filter(([f]) => f >= y0 - 1e-6 && f <= y1 + 1e-6).map(([f, rr]) => {
      let k = scale * g; if (spec.build === 'f') { if (f > 0.15 && f < 0.42) k *= D.waist; if (f > 0.7 && f < 0.88) k *= 0.96; }
      if (extra) k *= extra(f); return new THREE.Vector2(rr * k * s, f * L);
    });
    this.part(spine, 'top', new THREE.LatheGeometry(prof(1), 28), M4(0, 0, 0, 0, 0, 0, 1, 1, DEPTH));
    this.part(spine, 'top', new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI / 2), M4(0, L * 0.995, 0, 0, 0, 0, 0.06 * s, 0.02 * s, 0.06 * s * DEPTH));
    this.buildOuter(spine, L, prof);
    // arms
    this.arms = {};
    const shY = L * 0.8;
    for (const side of ['L', 'R']) {
      const sg = side === 'L' ? -1 : 1;
      const arm = new THREE.Group(); arm.position.set(sg * D.shoulder * s, shY, 0); spine.add(arm);
      const up = D.upper * s, fo = D.fore * s, ra = 0.05 * g * s;
      const sleeveTop = spec.outer === 'puffer' || spec.outer === 'hivis' ? 'sleeve' : (spec.outer === 'overshirt' || spec.outer === 'labcoat' ? 'outer' : 'sleeve');
      this.part(arm, sleeveTop === 'outer' ? 'outer' : 'sleeve', new THREE.SphereGeometry(ra * 1.12, 16, 12), M4(0, -0.005 * s, 0, 0, 0, 0, 1, 1, 0.95));
      const shortSleeve = spec.sleeves === 'short';
      const upMat = sleeveTop === 'outer' ? 'outer' : 'sleeve';
      if (shortSleeve) {
        this.part(arm, upMat, new THREE.CylinderGeometry(ra * 1.12, ra * 1.05, up * 0.45, 16), M4(0, -up * 0.22, 0));
        this.part(arm, 'skin', new THREE.CylinderGeometry(ra * 0.92, ra * 0.85, up * 0.6, 14), M4(0, -up * 0.66, 0));
      } else this.part(arm, upMat, new THREE.CylinderGeometry(ra, ra * 0.86, up, 16), M4(0, -up / 2, 0));
      const elbow = new THREE.Group(); elbow.position.y = -up; arm.add(elbow);
      const foreSkin = spec.sleeves === 'rolled' || shortSleeve;
      this.part(elbow, foreSkin ? 'skin' : upMat, new THREE.SphereGeometry(ra * 0.86, 14, 10));
      this.part(elbow, foreSkin ? 'skin' : upMat, new THREE.CylinderGeometry(ra * 0.84, ra * 0.66, fo, 14), M4(0, -fo / 2, 0));
      if (spec.sleeves === 'rolled') this.part(elbow, upMat, new THREE.TorusGeometry(ra * 0.92, ra * 0.28, 8, 18), M4(0, -0.01 * s, 0, Math.PI / 2, 0, 0));
      if (!foreSkin) this.part(elbow, upMat, new THREE.TorusGeometry(ra * 0.66, ra * 0.16, 8, 16), M4(0, -fo + 0.012 * s, 0, Math.PI / 2, 0, 0));
      const wrist = new THREE.Group(); wrist.position.y = -fo; elbow.add(wrist);
      const hand = new THREE.Group(); hand.rotation.y = -sg * Math.PI / 2; wrist.add(hand);
      const hs = child ? 0.85 : 1;
      this.part(hand, 'skin', new THREE.SphereGeometry(1, 14, 10), M4(0, -0.048 * s * hs, 0, 0, 0, 0, 0.040 * s * hs, 0.052 * s * hs, 0.021 * s * hs));
      this.part(hand, 'skin', new THREE.SphereGeometry(1, 14, 10), M4(0, -0.092 * s * hs, 0.006 * s, 0.25, 0, 0, 0.037 * s * hs, 0.042 * s * hs, 0.019 * s * hs));
      this.part(hand, 'skin', new THREE.CapsuleGeometry(0.011 * s * hs, 0.032 * s * hs, 4, 8), M4(sg * 0.033 * s * hs, -0.05 * s * hs, 0.012 * s, 0.3, 0, sg * 0.55));
      const grip = new THREE.Group(); grip.position.set(0, -0.08 * s * hs, 0.03 * s); hand.add(grip);
      this.arms[side] = { arm, elbow, wrist, hand, grip, up, fo: fo + 0.075 * s * hs, sg };
    }
    // neck + head
    const neck = this.neck = new THREE.Group(); neck.position.y = L * 0.985; spine.add(neck);
    this.part(neck, 'skin', new THREE.CylinderGeometry(0.05 * s * g, 0.056 * s * g, D.neck * s + 0.03 * s, 14), M4(0, D.neck * s / 2, 0));
    const head = this.head = this.hd = new THREE.Group(); head.position.y = D.neck * s; head.rotation.order = 'YXZ'; neck.add(head);
    this.buildHead(head);
    this.finalize();
  }
  buildOuter(spine, L, prof) {
    const { s, spec, D } = this; const o = spec.outer || 'none'; const g = D.girth;
    if (o === 'overshirt' || o === 'labcoat' || o === 'puffer' || o === 'hivis') {
      const gap = o === 'labcoat' ? 0.42 : o === 'overshirt' ? 0.38 : o === 'hivis' ? 0.3 : 0.12;
      const scale = o === 'puffer' ? 1.13 : 1.075;
      // shirts and coats flare a little at the hem so the trouser line never pokes through the cloth (it did by ~1 mm)
      const ridge = o === 'puffer' ? (f) => 1 + 0.035 * Math.abs(Math.sin(f * Math.PI * 6)) : (o === 'overshirt' || o === 'labcoat') ? (f) => (f < 0.1 ? 1.04 : 1) : null;
      let pts = prof(scale, 0, 0.97, ridge);
      if (o === 'labcoat') { const ext = [[-0.85, 0.205], [-0.55, 0.188], [-0.3, 0.172], [-0.1, 0.16]].map(([f, rr]) => new THREE.Vector2(rr * g * s * (spec.build === 'f' ? 1.04 : 1), f * L)); pts = ext.concat(pts); }
      if (o === 'overshirt') pts.unshift(new THREE.Vector2(0.165 * g * s * (spec.build === 'f' ? D.hipG : 1), -0.08 * L));
      const deep = o === 'overshirt' || o === 'labcoat' ? 1.12 : 1.04;   // front-back clearance over the pelvis
      this.part(spine, 'outer', new THREE.LatheGeometry(pts, 30, gap / 2, TAU - gap), M4(0, 0, 0, 0, 0, 0, 1, 1, DEPTH * deep));
      // collar
      if (o !== 'hivis') this.part(spine, 'outer', new THREE.TorusGeometry(0.068 * s * g, 0.018 * s, 8, 20, TAU * 0.78), M4(0, L * 0.965, -0.004 * s, Math.PI / 2 + 0.25, 0, Math.PI / 2 + TAU * 0.11, 1, 1, DEPTH * 1.3));
      if (o === 'hivis') for (const f of [0.38, 0.62]) this.part(spine, 'teethBand', new THREE.LatheGeometry([new THREE.Vector2(0.152 * g * s * 1.09, f * L - 0.012 * s), new THREE.Vector2(0.155 * g * s * 1.09, f * L + 0.012 * s)], 30, gap / 2, TAU - gap), M4(0, 0, 0, 0, 0, 0, 1, 1, DEPTH * 1.05));
      if (o === 'hivis') this.mats.teethBand = new THREE.MeshStandardMaterial({ color: '#d9dde0', roughness: 0.25, metalness: 0.6, emissive: '#4a4c4e', emissiveIntensity: 0.4 });
      if (o === 'labcoat') { for (const sg of [-1, 1]) this.part(spine, 'outer', new THREE.BoxGeometry(0.075 * s, 0.07 * s, 0.01 * s), M4(sg * 0.1 * s, -0.12 * L, 0.152 * s * DEPTH * 1.04 + 0.004 * s, 0, sg * 0.35, 0)); }
    }
    if (o === 'apron') {
      const top = 0.72 * L, bot = -0.95 * L; const h = top - bot;
      this.part(spine, 'outer', new THREE.CylinderGeometry(0.168 * g * s, 0.2 * g * s, h, 18, 1, true, -0.92, 1.84), M4(0, (top + bot) / 2, 0, 0, 0, 0, 1, 1, 0.82));
      this.part(spine, 'outer', new THREE.TorusGeometry(0.075 * s, 0.006 * s, 6, 20), M4(0, L * 0.95, 0.01 * s, Math.PI / 2 + 0.5, 0, 0, 1, 1, 0.8));
      this.part(spine, 'outer', new RoundedBoxGeometry(0.17 * s, 0.09 * s, 0.012 * s, 2, 0.005 * s), M4(0, 0.05 * L, 0.168 * s * 0.82 + 0.004 * s));
    }
    if (o === 'hoodie') {
      this.part(spine, 'top', new THREE.SphereGeometry(1, 16, 10), M4(0, L * 0.9, -0.085 * s, 0.3, 0, 0, 0.1 * s, 0.07 * s, 0.05 * s));
      this.part(spine, 'top', new RoundedBoxGeometry(0.2 * s, 0.1 * s, 0.03 * s, 2, 0.012 * s), M4(0, 0.2 * L, 0.142 * s * DEPTH + 0.01 * s));
      for (const sg of [-1, 1]) this.part(spine, 'teeth', new THREE.CylinderGeometry(0.004 * s, 0.004 * s, 0.12 * s, 6), M4(sg * 0.03 * s, 0.82 * L, 0.11 * s * DEPTH + 0.02 * s, 0.15, 0, 0));
    }
    if (spec.scarf) {
      this.part(spine, 'accent', new THREE.TorusGeometry(0.072 * s, 0.03 * s, 10, 22), M4(0, L * 0.965, 0, Math.PI / 2 + 0.12, 0, 0, 1, 1, 0.85));
      this.part(spine, 'accent', new THREE.CapsuleGeometry(0.026 * s, 0.17 * s, 4, 10), M4(0.035 * s, L * 0.83, 0.098 * s, 0.12, 0, 0.12, 1, 1, 0.6));
      this.part(spine, 'accent', new THREE.CapsuleGeometry(0.024 * s, 0.12 * s, 4, 10), M4(-0.02 * s, L * 0.86, 0.1 * s, 0.1, 0, -0.18, 1, 1, 0.6));
    }
  }
  buildHead(head) {
    const { D, s, spec, child, mats } = this; const r = D.headR * s;
    const c = this.skullC = V(0, 0.92 * r, 0.02 * r);
    const skull = new THREE.Group(); skull.position.copy(c); head.add(skull); this.skull = skull;
    this.part(skull, 'skin', skullGeometry(r, { child }));
    // ears
    for (const sg of [-1, 1]) this.part(skull, 'skin', new THREE.SphereGeometry(1, 12, 10), M4(sg * 0.83 * r, -0.04 * r, -0.02 * r, 0, sg * 0.3, 0, 0.1 * r, 0.2 * r, 0.14 * r));
    // nose
    const nz = skullFront(0, -0.12, child);
    this.part(skull, 'skin', new THREE.SphereGeometry(1, 16, 12), M4(0, -0.12 * r, (nz - 0.04) * r, 0, 0, 0, (child ? 0.09 : 0.1) * r, (child ? 0.1 : 0.12) * r, 0.12 * r));
    this.part(skull, 'skin', new THREE.SphereGeometry(1, 12, 10), M4(0, -0.02 * r, (nz - 0.07) * r, 0.25, 0, 0, 0.055 * r, 0.12 * r, 0.07 * r));
    // eyes
    const re = D.eye * r, ex = child ? 0.37 : 0.355, ey = 0.06;
    const ez = skullFront(ex, ey, child);
    this.eyes = [];
    for (const sg of [-1, 1]) {
      const eg = new THREE.Group(); eg.position.set(sg * ex * r, ey * r, (ez - 0.8 * D.eye) * r); eg.rotation.order = 'YXZ'; skull.add(eg);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(re, 28, 20), mats.eye); eg.add(ball);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(re * 0.11, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); glint.position.set(sg * -0.18 * re + 0.22 * re, 0.32 * re, 0.93 * re); eg.add(glint);
      const lidU = new THREE.Mesh(new THREE.SphereGeometry(re * 1.09, 22, 12, 0, TAU, 0, Math.PI / 2), mats.skin); lidU.castShadow = false;
      const lidUp = new THREE.Group(); lidUp.position.copy(eg.position); skull.add(lidUp); lidUp.add(lidU);
      const lidL = new THREE.Mesh(new THREE.SphereGeometry(re * 1.075, 22, 10, 0, TAU, Math.PI / 2, Math.PI / 2), mats.skin); lidL.castShadow = false;
      const lidLo = new THREE.Group(); lidLo.position.copy(eg.position); skull.add(lidLo); lidLo.add(lidL);
      // lash line: thin dark rim on the upper lid edge
      const lash = new THREE.Mesh(new THREE.TorusGeometry(re * 1.1, re * 0.06, 6, 24, Math.PI), new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.hair).offsetHSL(0, 0, -0.05), roughness: 0.8 })); lash.rotation.set(0, 0, 0); lash.rotation.x = 0; lidU.add(lash);
      lash.rotation.y = 0; lash.position.set(0, 0, 0);
      // brow
      const brow = new THREE.Group(); const bz = skullFront(ex, 0.3, child); brow.position.set(sg * ex * r, 0.3 * r, (bz + 0.02) * r); skull.add(brow);
      const bm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042 * r, 0.26 * r, 4, 8), mats.hair); bm.rotation.z = Math.PI / 2 + sg * 0.06; bm.scale.set(1, 1, 0.7); brow.add(bm);
      this.eyes.push({ eg, lidUp, lidLo, brow, sg, baseBrowY: brow.position.y });
    }
    // mouth: closed line (arc) + cavity + teeth
    const my = -0.42, mz = skullFront(0, my, child);
    const mouth = this.mouth = new THREE.Group(); mouth.position.set(0, my * r, (mz - 0.025) * r); skull.add(mouth);
    const arcR = 0.42 * r, arc = 0.82;
    const line = new THREE.Mesh(new THREE.TorusGeometry(arcR, 0.02 * r, 6, 18, arc), mats.mouthLine); line.rotation.z = -Math.PI / 2 - arc / 2; const lineG = new THREE.Group(); lineG.add(line); line.position.y = arcR; mouth.add(lineG); this.mouthLine = lineG;
    const cav = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), mats.dark); cav.scale.set(0.17 * r, 0.1 * r, 0.06 * r); mouth.add(cav); this.cavity = cav;
    const teeth = new THREE.Mesh(new RoundedBoxGeometry(0.2 * r, 0.05 * r, 0.04 * r, 2, 0.015 * r), mats.teeth); teeth.position.set(0, 0.035 * r, 0.02 * r); mouth.add(teeth); this.teeth = teeth;
    const lip = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mats.lip); lip.scale.set(0.16 * r, 0.035 * r, 0.04 * r); lip.position.set(0, -0.06 * r, 0.02 * r); mouth.add(lip); this.lowerLip = lip;
    // cheeks (subtle) and hair
    this.buildHair(skull, r);
    if (spec.glasses) this.buildGlasses(skull, r, ex, ey, ez, re);
  }
  buildHair(skull, r) {
    const { spec, child } = this; const hs = spec.hairStyle;
    const cap = (o) => skullGeometry(r, Object.assign({ child, w: 40, h: 28 }, o));
    const rr = this.rand;
    if (hs === 'bald') { this.part(skull, 'hair', cap({ scale: 1.02, thetaStart: 1.2, thetaLength: 0.6, tilt: -0.5 })); }
    if (['bun', 'short', 'ponytail', 'curly', 'flatcap'].includes(hs)) {
      const tilt = hs === 'short' ? -0.62 : hs === 'curly' ? -0.5 : -0.56;
      const base = hs === 'short' ? 1.62 : hs === 'curly' ? 1.7 : 1.68, arch = hs === 'curly' ? 0.22 : 0.3;
      this.part(skull, 'hair', cap({ scale: hs === 'curly' ? 1.06 : 1.04, thetaLength: Math.PI, edge: (ph) => base - arch * Math.pow(Math.max(0, Math.cos(ph)), 2) - 0.06 * Math.max(0, Math.cos(ph * 2 + 0.6)), tilt: tilt * 0.8 }));
      // side volume down to the ears
      for (const sg of [-1, 1]) this.part(skull, 'hair', new THREE.SphereGeometry(1, 14, 10), M4(sg * 0.76 * r, 0.22 * r, -0.28 * r, 0, 0, 0, 0.14 * r, 0.32 * r, 0.42 * r));
    }
    if (hs === 'bun') {
      this.part(skull, 'hair', new THREE.SphereGeometry(0.33 * r, 18, 14), M4(0, 0.25 * r, -0.98 * r));
      this.part(skull, 'hair', new THREE.TorusGeometry(0.22 * r, 0.06 * r, 8, 16), M4(0, 0.25 * r, -0.86 * r));
      if (spec.streak) { this.mats.streak = this.mats.streak || clayMat(spec.streak, { normal: 'knit', ns: 0.5, roughness: 0.6 }); this.part(skull, 'streak', new THREE.CapsuleGeometry(0.05 * r, 0.75 * r, 4, 8), M4(0.32 * r, 0.82 * r, 0.12 * r, -1.25, 0, -0.35, 1, 1, 0.45)); }
    }
    if (hs === 'ponytail') {
      this.part(skull, 'hair', new THREE.CapsuleGeometry(0.12 * r, 0.65 * r, 4, 10), M4(0, -0.25 * r, -1.08 * r, 0.25, 0, 0));
      this.part(skull, 'accent', new THREE.TorusGeometry(0.11 * r, 0.035 * r, 6, 14), M4(0, 0.18 * r, -1.0 * r, Math.PI / 2 - 0.4, 0, 0));
      this.part(skull, 'hair', cap({ scale: 1.055, thetaStart: 0.45, thetaLength: 0.42, phiStart: Math.PI * 0.62, phiLength: Math.PI * 0.42, tilt: -0.1, w: 20, h: 8 }));
    }
    if (hs === 'curly') {
      const pts = cap({ scale: 1.08, thetaLength: 1.42, tilt: -0.5, w: 26, h: 14 }).attributes.position;
      for (let i = 0; i < pts.count; i += 2) { if (rr() < 0.45) continue; const p = V(pts.getX(i), pts.getY(i), pts.getZ(i)); const sz = (0.075 + rr() * 0.05) * r; this.part(skull, 'hair', new THREE.IcosahedronGeometry(sz, 1), M4(p.x, p.y, p.z, rr() * 3, rr() * 3, 0)); }
      // a high puff of curls held by a band
      for (let i = 0; i < 46; i++) { const a = rr() * TAU, b = Math.sqrt(rr()), c = rr() * 2 - 1; this.part(skull, 'hair', new THREE.IcosahedronGeometry((0.08 + rr() * 0.06) * r, 1), M4(Math.cos(a) * 0.36 * b * r, 1.12 * r + c * 0.22 * r, -0.42 * r + Math.sin(a) * 0.32 * b * r)); }
      this.part(skull, 'accent', new THREE.TorusGeometry(0.24 * r, 0.045 * r, 6, 16), M4(0, 0.95 * r, -0.36 * r, Math.PI / 2 - 0.35, 0, 0));
    }
    if (hs === 'cap' || hs === 'flatcap') {
      this.mats.cap = this.mats.cap || clayMat(spec.capColor || '#334455', { normal: 'cloth', ns: 0.45, roughness: 0.85, sheen: 0.4 });
      if (hs === 'cap') { this.part(skull, 'hair', cap({ scale: 1.03, thetaLength: 1.45, tilt: -0.7 }));
        this.part(skull, 'cap', cap({ scale: 1.085, thetaLength: 1.12, tilt: -0.12 }));
        this.part(skull, 'cap', new THREE.CylinderGeometry(0.62 * r, 0.62 * r, 0.03 * r, 24, 1, false, -0.85, 1.7), M4(0, 0.36 * r, 0.42 * r, 0.12, 0, 0, 1, 1, 1.05)); }
      else { this.part(skull, 'hair', cap({ scale: 1.035, thetaLength: 1.5, tilt: -0.75 })); this.part(skull, 'cap', cap({ scale: 1.1, thetaLength: 1.0, tilt: -0.15 })); this.part(skull, 'cap', new THREE.SphereGeometry(1, 20, 10), M4(0, 0.62 * r, 0.25 * r, -0.2, 0, 0, 0.9 * r, 0.2 * r, 0.95 * r));
        this.part(skull, 'cap', new THREE.CylinderGeometry(0.5 * r, 0.52 * r, 0.03 * r, 20, 1, false, -0.8, 1.6), M4(0, 0.5 * r, 0.62 * r, 0.2, 0, 0)); }
    }
    if (hs === 'wrap') {
      this.mats.wrap = this.mats.wrap || clayMat(spec.wrapColor || '#b8322a', { normal: 'cloth', ns: 0.6, roughness: 0.85, sheen: 0.5 });
      this.part(skull, 'wrap', cap({ scale: 1.1, thetaLength: 1.45, tilt: -0.42 }));
      this.part(skull, 'wrap', new THREE.SphereGeometry(1, 20, 14), M4(0, 0.78 * r, -0.28 * r, -0.4, 0, 0, 0.82 * r, 0.62 * r, 0.82 * r));
      this.part(skull, 'wrap', new THREE.TorusGeometry(0.2 * r, 0.09 * r, 8, 14), M4(0.12 * r, 1.12 * r, 0.18 * r, 0.6, 0.4, 0.3));
      this.part(skull, 'hair', new THREE.SphereGeometry(1, 12, 8), M4(0, -0.05 * r, -0.86 * r, 0, 0, 0, 0.5 * r, 0.32 * r, 0.25 * r));
    }
    if (spec.beard) {
      this.mats.beard = this.mats.beard || clayMat(spec.beard === 'grey' ? '#b9b3aa' : spec.hair, { normal: 'knit', ns: 0.6, roughness: 0.7 });
      this.part(skull, 'beard', cap({ scale: 1.03, thetaStart: Math.PI * 0.69, thetaLength: Math.PI * 0.27, phiStart: Math.PI * 0.5 + 0.1, phiLength: Math.PI - 0.2, w: 30, h: 12 }));
      for (const sg of [-1, 1]) this.part(skull, 'beard', new THREE.CapsuleGeometry(0.026 * r, 0.13 * r, 4, 8), M4(sg * 0.085 * r, -0.3 * r - 0.012 * r, skullFront(0.08, -0.3, false) * r - 0.004 * r, 0, -sg * 0.25, Math.PI / 2 + sg * 0.32, 1, 1, 0.55));
    }
  }
  buildGlasses(skull, r, ex, ey, ez, re) {
    const gm = new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.35, metalness: 0.4 });
    const z = (ez + 0.08) * r;
    for (const sg of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(re * 1.25, re * 0.11, 8, 28), gm); ring.position.set(sg * ex * r, ey * r, z); ring.scale.set(1.1, 0.9, 1); skull.add(ring);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(re * 1.23, 24), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false })); lens.position.copy(ring.position); lens.scale.copy(ring.scale); skull.add(lens);
      const temple = new THREE.Mesh(new THREE.CylinderGeometry(re * 0.08, re * 0.08, 0.75 * r, 6), gm); temple.rotation.x = Math.PI / 2; temple.position.set(sg * (ex * r + re * 1.4), ey * r + re * 0.2, z - 0.36 * r); skull.add(temple); }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(re * 0.09, re * 0.09, (ex * 2 * r - re * 2.8), 6), gm); bridge.rotation.z = Math.PI / 2; bridge.position.set(0, ey * r + re * 0.25, z); skull.add(bridge);
  }
  // ---------------------------------------------------------------- authoring API
  act(keys) { this.k.act = keys.slice().sort((a, b) => a.t - b.t); return this; }
  look(keys) { this.k.look = keys.slice().sort((a, b) => a.t - b.t); return this; }
  face(keys) { this.k.face = keys.slice().sort((a, b) => a.t - b.t); return this; }
  walk(keys) { this.k.walk = keys.slice().sort((a, b) => a.t - b.t); return this; }
  hand(side, keys) { this.k['hand' + side] = keys.slice().sort((a, b) => a.t - b.t); return this; }
  place(x, z, yaw = 0) { this.k.walk = [{ t: 0, x, z, yaw }]; this.root.position.set(x, 0, z); this.root.rotation.y = yaw; return this; }
  speak(lines) { this.lines = lines.filter(l => l.char === this.name); return this; }
  // ---------------------------------------------------------------- evaluation helpers
  static seg(keys, t) {
    if (!keys || !keys.length) return null;
    let i = -1; for (let k = 0; k < keys.length; k++) if (keys[k].t <= t) i = k;
    if (i < 0) return { prev: null, cur: keys[0], u: 1 };
    const cur = keys[i], prev = i > 0 ? keys[i - 1] : null;
    return { prev, cur, u: prev ? smooth((t - cur.t) / (cur.blend ?? 0.45)) : 1 };
  }
  speech(t) { // 0..1 loudness of this character's own dialogue at t
    for (const l of this.lines) if (t >= l.start - 0.02 && t <= l.end + 0.02) { if (!l.env) return 0.5; const f = (t - l.start) * (l.fps || 48); const i = Math.floor(f), u = f - i; const a = l.env[clamp(i, 0, l.env.length - 1)] || 0, b = l.env[clamp(i + 1, 0, l.env.length - 1)] || 0; return lerp(a, b, u); }
    return 0;
  }
  speaking(t, pad = 0.15) { return this.lines.some(l => t >= l.start - pad && t <= l.end + pad); }
  rootAt(t) {
    const w = this.k.walk; if (!w.length) return { x: this.root.position.x, z: this.root.position.z, yaw: this.root.rotation.y, moving: 0, dist: 0 };
    if (t <= w[0].t) return { x: w[0].x, z: w[0].z, yaw: w[0].yaw ?? 0, moving: 0, dist: 0 };
    let dist = 0;
    for (let i = 0; i < w.length - 1; i++) {
      const a = w[i], b = w[i + 1]; const segLen = Math.hypot(b.x - a.x, b.z - a.z);
      if (t <= b.t) {
        const raw = (t - a.t) / Math.max(1e-4, b.t - a.t); const e = b.ease === 'linear' ? raw : (raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2);
        let yawA = a.yaw ?? 0, yawB = b.yaw ?? yawA; let dy = yawB - yawA; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU;
        const yaw = yawA + dy * smooth(raw * (b.turnFast ? 3 : 1.4));
        const moving = segLen > 0.05 ? Math.sin(Math.PI * clamp(raw)) ** 0.5 : 0;
        return { x: lerp(a.x, b.x, e), z: lerp(a.z, b.z, e), yaw, moving, dist: dist + segLen * e };
      }
      dist += segLen;
    }
    const l = w[w.length - 1]; return { x: l.x, z: l.z, yaw: l.yaw ?? 0, moving: 0, dist };
  }
  // ---------------------------------------------------------------- per-frame: body
  pose(t) {
    const rt = this.rootAt(t); this.root.position.set(rt.x, this.root.position.y, rt.z); this.root.rotation.y = rt.yaw; this.root.updateMatrixWorld(true);
    const sg = Puppet.seg(this.k.act, t);
    const pa = sg && sg.prev ? evalPose(sg.prev, t, this) : null; const pb = sg ? evalPose(sg.cur, t, this) : evalPose({ pose: 'stand' }, t, this);
    const P = pa ? mixPose(pa, pb, sg.u) : pb;
    // walking overlay (stride locked to distance travelled → no foot sliding)
    if (rt.moving > 0.01) { const W = walkPose(rt.dist, this, P.carry); const m = rt.moving; for (const k of WALK_KEYS) P[k] = lerp(P[k], W[k], m * (P.carry && k.startsWith('a') ? 0 : 1)); P.hy += W.hy * m; }
    // idle life: breathing, weight shift, speech gestures
    const ph = this.phase, br = Math.sin(t * 1.45 + ph);
    P.spX += br * 0.012 + (this.spec.stoop || 0); P.hx += Math.sin(t * 0.37 + ph) * 0.006 * this.s;
    const sp = this.speech(t), talking = this.speaking(t);
    if (talking && P.talk) { const e = sp; const g1 = Math.sin(t * 2.6 + ph) * 0.5 + 0.5; P.eR += (0.35 + 0.35 * e) * P.talk * (1 - (P.ikR ? 1 : 0)); P.aRx -= (0.18 + 0.15 * g1) * P.talk * (1 - (P.ikR ? 1 : 0)); P.wRx -= 0.2 * e * P.talk; P.spY += Math.sin(t * 1.3 + ph) * 0.03 * P.talk; }
    this.P = P;
    const { s } = this;
    this.hips.position.set(P.hx, this.hipY - P.drop * s + P.hy, 0); this.hips.rotation.set(P.hpX, P.hpY, P.hpZ);
    this.spine.rotation.set(P.spX, P.spY, P.spZ);
    this.neck.rotation.set(P.nkX, P.nkY, P.nkZ);
    const A = this.arms, Lg = this.legs;
    A.L.arm.rotation.set(P.aLx, -P.aLy, -P.aLz); A.R.arm.rotation.set(P.aRx, P.aRy, P.aRz);
    A.L.elbow.rotation.set(-P.eL, 0, 0); A.R.elbow.rotation.set(-P.eR, 0, 0);
    A.L.wrist.rotation.set(P.wLx, -P.wLy, -P.wLz); A.R.wrist.rotation.set(P.wRx, P.wRy, P.wRz);
    Lg.L.leg.rotation.set(P.lLx, -P.lLy, -P.lLz); Lg.R.leg.rotation.set(P.lRx, P.lRy, P.lRz);
    Lg.L.knee.rotation.set(P.kL, 0, 0); Lg.R.knee.rotation.set(P.kR, 0, 0);
    Lg.L.ankle.rotation.set(P.fL, 0, 0); Lg.R.ankle.rotation.set(P.fR, 0, 0);
  }
  // ---------------------------------------------------------------- per-frame: IK, gaze, face
  solve(t) {
    const P = this.P;
    for (const side of ['L', 'R']) {
      const hk = Puppet.seg(this.k['hand' + side], t);
      let target = null, w = 0, pole = null;
      const poseIK = P['ik' + side];
      if (poseIK) { target = poseIK.p; w = poseIK.w; pole = poseIK.pole; }
      if (hk) {
        const ta = hk.prev ? resolveTarget(hk.prev.at, t, this) : null, tb = resolveTarget(hk.cur.at, t, this);
        const wa = hk.prev ? (ta ? (hk.prev.w ?? 1) : 0) : 0, wb = tb ? (hk.cur.w ?? 1) : 0;
        const hw = hk.prev ? lerp(wa, wb, hk.u) : wb;
        let ht = tb && ta ? ta.clone().lerp(tb, hk.u) : (tb || ta);
        if (ht && hw > 0) { target = target ? target.clone().lerp(ht, hw) : ht; w = Math.max(w, hw); pole = hk.cur.pole ? this.dirToWorld(hk.cur.pole) : pole; }
      }
      if (target && w > 0.001) this.ik(side, target, pole || this.dirToWorld([side === 'L' ? -0.5 : 0.5, -0.6, -0.6]), w);
    }
    this.root.updateMatrixWorld(true);
    // gaze
    const lk = Puppet.seg(this.k.look, t);
    const neutral = this.neck.localToWorld(V(0, 0.2 * this.s, 2));
    const tA = lk && lk.prev ? (resolveTarget(lk.prev.at, t, this) || neutral) : null; const tB = lk ? (resolveTarget(lk.cur.at, t, this) || neutral) : neutral;
    const wA = lk && lk.prev ? (lk.prev.w ?? 1) : 1, wB = lk ? (lk.cur.w ?? 1) : 1;
    const angA = tA ? this.aim(tA) : null, angB = this.aim(tB);
    let yaw = angB[0] * wB, pitch = angB[1] * wB;
    if (angA) { const u = lk.u; yaw = lerp(angA[0] * wA, yaw, u); pitch = lerp(angA[1] * wA, pitch, u); }
    const talking = this.speaking(t), e = this.speech(t), ph = this.phase;
    const nod = talking ? (Math.sin(t * 4.7 + ph) * 0.025 + e * 0.035) : 0;
    const drift = (noise2(t * 0.35, this.seed % 97) - 0.5) * 0.06;
    this.hd.rotation.set(clamp(pitch, -0.55, 0.5) + nod + drift * 0.4, clamp(yaw, -1.15, 1.15) + drift, Math.sin(t * 0.5 + ph) * 0.025 + (talking ? Math.sin(t * 1.7 + ph) * 0.02 : 0));
    this.hd.updateMatrixWorld(true);
    // eyes aim at the exact (blended) target, with tiny saccades
    const tgt = this.gazeTarget = tA ? tA.clone().lerp(tB, lk.u) : tB;
    const sacc = [(noise2(Math.floor(t * 1.6) * 3.1, this.seed % 31) - 0.5) * 0.06, (noise2(Math.floor(t * 1.6) * 2.3, this.seed % 17) - 0.5) * 0.04];
    for (const ey of this.eyes) { const lp = ey.eg.parent.worldToLocal(tgt.clone()).sub(ey.eg.position); const yw = Math.atan2(lp.x, lp.z), pt = -Math.atan2(lp.y, Math.hypot(lp.x, lp.z)); ey.eg.rotation.set(clamp(pt, -0.35, 0.35) + sacc[1], clamp(yw, -0.45, 0.45) + sacc[0], 0); }
    // expressions
    const fk = Puppet.seg(this.k.face, t); const F = { smile: 0.15, brow: 0, tilt: 0, squint: 0, jaw: 0, chew: 0 };
    if (fk) { const a = fk.prev || {}, b = fk.cur; for (const k of Object.keys(F)) F[k] = fk.prev ? lerp(a[k] ?? F[k], b[k] ?? F[k], fk.u) : (b[k] ?? F[k]); }
    // blink
    let bl = 0; for (const b of this.blinks) { const d = t - b; if (d > -0.1 && d < 0.2) bl = Math.max(bl, Math.sin(clamp(d / 0.17) * Math.PI)); }
    const lidOpen = this.child ? -0.5 : -0.42, lidClosed = 0.62;
    const upper = lerp(lidOpen + F.squint * 0.25, lidClosed, bl);
    const lower = 0.55 - F.squint * 0.2 - F.smile * 0.12;
    const browUp = F.brow * 0.045 + (talking ? e * 0.02 : 0);
    for (const ey of this.eyes) {
      ey.lidUp.rotation.set(upper, 0, 0); ey.lidLo.rotation.set(lower, 0, 0);
      ey.brow.position.y = ey.baseBrowY + browUp * this.D.headR * this.s * 2.2 + (ey.sg * F.tilt) * 0.02 * this.s;
      ey.brow.rotation.z = -ey.sg * F.brow * 0.12 + ey.sg * F.tilt * -0.1;
    }
    // mouth: loudness-driven opening + chewing + smile curvature
    let open = 0; if (talking) open = clamp(Math.pow(e * 1.35, 0.75)) * 0.95;
    if (F.chew > 0 && !talking) open = Math.max(open, F.chew * (0.25 + 0.25 * Math.sin(t * 9.0)) );
    if (F.chew > 0 && talking) open = open * 0.75 + F.chew * 0.12 * (1 + Math.sin(t * 9));
    open = Math.max(open, F.jaw);
    const sm = clamp(F.smile, -1, 1);
    this.faceState = { F, bl, open, sm, e, talking, t };
    this.mouthLine.scale.set(1 + sm * 0.08 - open * 0.15, 0.12 + Math.abs(sm) * 0.55, 1); this.mouthLine.rotation.z = sm < 0 ? Math.PI : 0; this.mouthLine.position.y = sm < 0 ? -0.06 * this.D.headR * this.s : 0;
    this.cavity.scale.y = (0.012 + open * 0.13) * this.D.headR * this.s; this.cavity.scale.x = (0.15 - open * 0.03 + sm * 0.03) * this.D.headR * this.s;
    this.cavity.position.y = -open * 0.05 * this.D.headR * this.s; this.cavity.visible = open > 0.02;
    this.teeth.visible = open > 0.25; this.lowerLip.position.y = (-0.04 - open * 0.17) * this.D.headR * this.s;
  }
  dirToWorld(d) { return V(...d).applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion())).normalize(); }
  offsetToWorld(d) { return V(...d).applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion())); }
  aim(target) { // yaw/pitch of the head pivot toward a world target, in the neck frame
    const lp = this.neck.worldToLocal(target.clone()); const eye = V(0, this.hd.position.y + this.skullC.y + 0.06 * this.D.headR * this.s, 0);
    const d = lp.sub(eye); return [Math.atan2(d.x, d.z), -Math.atan2(d.y, Math.hypot(d.x, d.z))];
  }
  // analytic two-bone IK: places this hand's grip on a world target (elbow bends toward the pole)
  ik(side, targetW, poleW, w = 1) {
    const A = this.arms[side]; const parent = A.arm.parent; parent.updateMatrixWorld(true);
    const inv = parent.matrixWorld.clone().invert(); const T = targetW.clone().applyMatrix4(inv); const S = A.arm.position.clone();
    const ps = new THREE.Vector3(); parent.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), ps);
    const poleL = poleW.clone().applyQuaternion(parent.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
    const L1 = A.up, L2 = A.fo; const Dv = T.sub(S); let d = Dv.length(); const dir = Dv.clone().normalize();
    d = clamp(d, Math.abs(L1 - L2) + 1e-3, (L1 + L2) * 0.999);
    const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const bend = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    let k = new THREE.Vector3().crossVectors(dir, poleL); if (k.lengthSq() < 1e-6) k.crossVectors(dir, V(0, 0, 1)); k.normalize();
    const U = dir.clone().applyAxisAngle(k, a);
    const Yl = U.clone().negate(); const Zl = dir.clone().sub(U.clone().multiplyScalar(dir.dot(U))).normalize(); const Xl = new THREE.Vector3().crossVectors(Yl, Zl).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xl, Yl, Zl));
    A.arm.quaternion.slerp(q, w); A.elbow.rotation.x = lerp(A.elbow.rotation.x, -bend, w);
    A.wrist.rotation.x = lerp(A.wrist.rotation.x, 0, w * 0.5);
  }
}

// ------------------------------------------------------------------ targets
function resolveTarget(at, t, P) {
  if (at == null) return null;
  if (typeof at === 'function') at = at(t, P);
  if (at == null) return null;
  if (at.isVector3) return at.clone();
  if (Array.isArray(at)) return V(...at);
  if (at.isObject3D) return at.getWorldPosition(V());
  return null;
}

// ------------------------------------------------------------------ pose library (FK + body-space IK)
const BASE = { drop: 0, hx: 0, hy: 0, hpX: 0, hpY: 0, hpZ: 0, spX: 0.03, spY: 0, spZ: 0, nkX: 0, nkY: 0, nkZ: 0,
  aLx: 0.06, aLy: 0, aLz: 0.1, aRx: 0.06, aRy: 0, aRz: 0.1, eL: 0.18, eR: 0.18, wLx: 0, wLy: 0, wLz: 0, wRx: 0, wRy: 0, wRz: 0,
  lLx: 0, lLy: 0, lLz: 0.02, lRx: 0, lRy: 0, lRz: 0.02, kL: 0.03, kR: 0.03, fL: 0, fR: 0, talk: 1, ikL: null, ikR: null, carry: 0 };
const NUM_KEYS = Object.keys(BASE).filter(k => typeof BASE[k] === 'number');
const WALK_KEYS = ['lLx', 'lRx', 'kL', 'kR', 'fL', 'fR', 'aLx', 'aRx', 'eL', 'eR', 'spY', 'hpY', 'spX'];
function bodyIK(P, xyz, t) { const v = V(xyz[0] * P.s, xyz[1] * P.s, xyz[2] * P.s); return P.root.localToWorld(v); }
function mk(o) { return Object.assign({}, BASE, o); }
export const POSES = {
  stand: () => mk({}),
  relaxed: (t, P) => mk({ hx: 0.02 * P.s, hpZ: 0.04, spZ: -0.03, lLz: 0.06, kR: 0.12, lRx: -0.06, aLz: 0.12, aRz: 0.08 }),
  hipsHands: (t, P) => mk({ aLx: 0.2, aLz: 0.62, eL: 1.75, aRx: 0.2, aRz: 0.62, eR: 1.75, wLz: -0.3, wRz: -0.3, talk: 0.3, hpZ: 0.03, kR: 0.08 }),
  armsCrossed: (t, P) => mk({ aLx: -0.5, aLy: 0.55, aLz: 0.22, eL: 1.95, aRx: -0.38, aRy: 0.6, aRz: 0.18, eR: 2.05, talk: 0 }),
  shrug: (t, P) => mk({ aLx: -0.35, aLz: 0.35, eL: 1.35, aRx: -0.35, aRz: 0.35, eR: 1.35, wLz: 0.4, wRz: 0.4, nkZ: 0.08, talk: 0 }),
  point: (t, P) => mk({ aRx: -1.25, aRz: 0.25, eR: 0.12, talk: 0 }),
  wave: (t, P) => mk({ aRx: -0.4, aRz: 1.25, eR: 1.6 + Math.sin(t * 9) * 0.25, talk: 0 }),
  crouch: (t, P) => mk({ drop: 0.40, lLx: -1.55, lLz: 0.12, kL: 1.85, fL: -0.3, lRx: -0.15, lRz: 0.1, kR: 1.72, fR: 0.55, spX: 0.42, talk: 0.4 }),
  kneel: (t, P) => mk({ drop: 0.36, lLx: -0.1, kL: 1.66, fL: 0.55, lRx: -0.1, kR: 1.66, fR: 0.55, spX: 0.35, lLz: 0.08, lRz: 0.08, talk: 0.4 }),
  sit: (t, P, p = {}) => { const seat = p.seat ?? 0.46; const drop = (P.hipY - (seat + 0.07 * P.s)) / P.s; return mk({ drop, lLx: -1.52, lRx: -1.52, kL: 1.5, kR: 1.5, lLz: 0.1, lRz: 0.1, spX: p.lean ?? 0.12, aLx: -0.5, aRx: -0.5, eL: 0.9, eR: 0.9, aLz: 0.12, aRz: 0.12 }); },
  bend: (t, P, p = {}) => mk({ spX: p.amount ?? 0.6, kL: 0.15, kR: 0.15, lLx: -0.1, lRx: -0.1, hx: 0, drop: 0.03 }),
  lean: (t, P, p = {}) => mk({ spX: 0.28, aLx: -0.6, aRx: -0.6, eL: 0.4, eR: 0.4, drop: 0.02, kL: 0.1, kR: 0.1 }),
  tablet: (t, P) => mk({ ikL: { p: bodyIK(P, [-0.05, 1.08, 0.3], t), w: 1, pole: P.dirToWorld([-0.6, -0.8, -0.2]) }, ikR: { p: bodyIK(P, [0.05 + Math.sin(t * 1.3) * 0.02, 1.1, 0.3], t), w: 1, pole: P.dirToWorld([0.6, -0.8, -0.2]) }, spX: 0.1, wLx: -0.4, talk: 0 }),
  chop: (t, P, p = {}) => { const k = Math.max(0, Math.sin(t * (p.rate || 7.5))); const h = p.h ?? 0.95; return mk({ spX: 0.22, ikR: { p: bodyIK(P, [0.12, h + 0.12 * k, 0.36], t), w: 1, pole: P.dirToWorld([0.8, -0.4, -0.5]) }, ikL: { p: bodyIK(P, [-0.08, h + 0.02, 0.36], t), w: 1, pole: P.dirToWorld([-0.8, -0.4, -0.4]) }, talk: 0 }); },
  stir: (t, P, p = {}) => { const a = t * 2.6; const h = p.h ?? 1.0; return mk({ spX: 0.12, ikR: { p: bodyIK(P, [0.08 + Math.cos(a) * 0.06, h, 0.4 + Math.sin(a) * 0.05], t), w: 1, pole: P.dirToWorld([0.8, -0.5, -0.4]) }, talk: 0.3 }); },
  carry: (t, P, p = {}) => mk({ carry: 1, ikL: { p: bodyIK(P, [-0.2, p.h ?? 0.92, 0.28], t), w: 1, pole: P.dirToWorld([-0.8, -0.5, -0.3]) }, ikR: { p: bodyIK(P, [0.2, p.h ?? 0.92, 0.28], t), w: 1, pole: P.dirToWorld([0.8, -0.5, -0.3]) }, spX: -0.04, talk: 0 }),
  holdFront: (t, P, p = {}) => mk({ ikL: { p: bodyIK(P, [-0.07, p.h ?? 1.05, p.z ?? 0.3], t), w: 1, pole: P.dirToWorld([-0.8, -0.6, -0.2]) }, ikR: { p: bodyIK(P, [0.07, p.h ?? 1.05, p.z ?? 0.3], t), w: 1, pole: P.dirToWorld([0.8, -0.6, -0.2]) }, talk: 0 }),
  pick: (t, P, p = {}) => { const k = Math.sin(t * 2.2) * 0.5 + 0.5; return mk({ spX: 0.55, drop: 0.06, kL: 0.25, kR: 0.25, lLx: -0.18, lRx: -0.18, ikR: { p: bodyIK(P, [0.18, 0.62 + 0.1 * k, 0.45], t), w: 1, pole: P.dirToWorld([0.8, -0.2, -0.4]) }, ikL: { p: bodyIK(P, [-0.15, 0.58, 0.42], t), w: 1, pole: P.dirToWorld([-0.8, -0.2, -0.4]) }, talk: 0 }); },
  eat: (t, P, p = {}) => mk({}),
};
function evalPose(key, t, P) { const f = POSES[key.pose || 'stand'] || POSES.stand; const o = f(t, P, key.p || {}); if (key.mod) Object.assign(o, typeof key.mod === 'function' ? key.mod(t, P) : key.mod); if (key.ikL !== undefined) o.ikL = key.ikL; if (key.ikR !== undefined) o.ikR = key.ikR; if (key.talk !== undefined) o.talk = key.talk; return o; }
function mixPose(a, b, u) {
  const o = {}; for (const k of NUM_KEYS) o[k] = lerp(a[k], b[k], u);
  for (const s of ['ikL', 'ikR']) { const A = a[s], B = b[s]; if (A && B) o[s] = { p: A.p.clone().lerp(B.p, u), w: lerp(A.w, B.w, u), pole: A.pole.clone().lerp(B.pole, u).normalize() }; else if (A) o[s] = { p: A.p, w: A.w * (1 - u), pole: A.pole }; else if (B) o[s] = { p: B.p, w: B.w * u, pole: B.pole }; else o[s] = null; }
  return o;
}
function walkPose(dist, P, carrying) {
  const stride = 0.66 * P.s; const ph = (dist / stride) * Math.PI; const sw = Math.sin(ph);
  return { lLx: sw * 0.42, lRx: -sw * 0.42, kL: Math.max(0, -Math.sin(ph - 0.6)) * 0.85 + 0.05, kR: Math.max(0, Math.sin(ph - 0.6)) * 0.85 + 0.05, fL: 0.1, fR: 0.1,
    aLx: -sw * 0.32 + 0.05, aRx: sw * 0.32 + 0.05, eL: 0.3, eR: 0.3, spY: sw * 0.06, hpY: -sw * 0.08, spX: 0.06, hy: Math.abs(Math.cos(ph)) * 0.022 * P.s - 0.01 * P.s };
}


// ------------------------------------------------------------------ realistic cast (MakeHuman bodies driven by the puppet rig)
// Each character: a MakeHuman description (ancestry mix, sex, age, build), skin texture, iris, strand hair and brows, clothes.
const HUMANS = {
  ASHA: { eth: { african: 0.85, caucasian: 0.15 }, sex: 0, age: 44, muscle: 0.62, weight: 0.5, skin: 'middleage_african_female', iris: '#5a3a22',
    hair: { style: 'bun', color: '#1b1512', tip: '#2a211b' }, brows: { color: '#241a14' }, wear: { scarf: '#b4532a' },
    clothes: [{ key: 'shirt_m01', top: { color: '#55633a' }, bottom: { color: '#4a443b' } }, { key: 'shoes04', color: '#4b3526', recolor: 0.6 }] },
  NOOR: { eth: { african: 0.75, asian: 0.1, caucasian: 0.15 }, sex: 0, age: 11, muscle: 0.45, weight: 0.45, skin: 'young_african_female', iris: '#4e321e',
    hair: { style: 'puff', color: '#16100c', tip: '#2b1d14' }, brows: { color: '#1f1610', thick: 0.003, count: 300 },
    clothes: [{ key: 'suit_f01', bottomUV: [0, 0, 0.78, 0.57], top: { plain: true, color: '#e8b52e' }, bottom: { color: '#3d5f94', recolor: 0.35 } }, { key: 'shoes06', color: '#e9e5dc', recolor: 0.8 }] },
  LUIS: { eth: { caucasian: 0.55, african: 0.2, asian: 0.25 }, sex: 1, age: 36, muscle: 0.6, weight: 0.55, skin: 'young_caucasian_male', skinTint: '#d2ab8c', iris: '#4d3320',
    hair: { style: 'short', color: '#251b14', tip: '#3a2a1e' }, beard: { style: 'beard', color: '#231912', count: 13000, len: 0.009 }, brows: { color: '#2e2219', thick: 0.0042, count: 480, w: 0.00017 }, wear: { puffer: '#26364f' },
    clothes: [{ key: 'shirt_m01', top: { color: '#8eaacb' }, bottom: { color: '#2d2f36' } }, { key: 'shoes01' }] },
  MAYA: { eth: { caucasian: 0.75, asian: 0.25 }, sex: 0, age: 34, muscle: 0.42, weight: 0.45, skin: 'young_caucasian_female', iris: '#56693a', glasses: true,
    hair: { style: 'ponytail', color: '#5a321c', tip: '#7a4a2c' }, brows: { color: '#4a2a18', thick: 0.0032 }, wear: { labcoat: '#f2f2ec' },
    clothes: [{ key: 'suit_f01', bottomUV: [0, 0, 0.78, 0.57], top: { plain: true, color: '#7b5ea8' }, bottom: { color: '#39414f' } }, { key: 'shoes02', color: '#d9d6cf' }] },
  COLLEAGUE: { eth: { african: 0.9, caucasian: 0.1 }, sex: 1, age: 32, muscle: 0.55, weight: 0.5, skin: 'young_african_male', iris: '#2a1a10',
    hair: { style: 'cropped', color: '#0f0c0b', tip: '#1a1411' }, brows: { color: '#120e0c', thick: 0.004 }, wear: { labcoat: '#f2f2ec' },
    clothes: [{ key: 'suit_m06', top: { plain: true, color: '#4f7f68' }, bottom: { color: '#2a2f3a' } }, { key: 'shoes03' }] },
  WORKER: { eth: { caucasian: 0.7, asian: 0.3 }, sex: 1, age: 28, muscle: 0.65, weight: 0.55, skin: 'young_caucasian_male', skinTint: '#efd5bd', iris: '#3a2a1a',
    hair: { style: 'capped', color: '#6a4428', tip: '#7a5434' }, brows: { color: '#5a3a22', thick: 0.0038 }, wear: { hivis: '#d2ea3c', cap: '#2f4a63' },
    clothes: [{ key: 'suit_m06', top: { plain: true, color: '#5d6a77' }, bottom: { color: '#34373c' } }, { key: 'shoes03' }] },
  VENDOR: { eth: { african: 0.9, caucasian: 0.1 }, sex: 1, age: 62, muscle: 0.5, weight: 0.62, skin: 'old_african_male', iris: '#24160e',
    hair: { style: 'capped', color: '#a29d96', tip: '#c4bfb8' }, beard: { style: 'beard', color: '#b9b3aa', len: 0.016 }, brows: { color: '#8f8a84', thick: 0.0042 }, wear: { apron: '#d8ceb6', flatcap: '#5a4a3a' },
    clothes: [{ key: 'suit_m03', top: { color: '#7e3f2c' }, bottom: { color: '#3b3b3b' } }, { key: 'shoes04' }] },
  COOK: { eth: { asian: 0.5, african: 0.3, caucasian: 0.2 }, sex: 0, age: 52, muscle: 0.5, weight: 0.6, skin: 'middleage_asian_female', skinTint: '#caa184', iris: '#2a1a10',
    hair: { style: 'capped', color: '#1b1b1b', tip: '#2b2b2b' }, brows: { color: '#1b1b1b', thick: 0.0032 }, wear: { apron: '#efe6d2', headwrap: '#b8322a' },
    clothes: [{ key: 'suit_f01', bottomUV: [0, 0, 0.78, 0.57], top: { plain: true, color: '#5b3e7b' }, bottom: { color: '#2f2f2f' } }, { key: 'shoes03' }] },
};
// background people: a realistic description derived from the clay extra's random spec
function extraHuman(spec, seed) {
  const r = prng(seed); const c = new THREE.Color(spec.skin); const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  const eth = lum < 0.35 ? { african: 0.9, caucasian: 0.1 } : lum < 0.55 ? { african: 0.35, asian: 0.35, caucasian: 0.3 } : r() < 0.5 ? { caucasian: 0.8, asian: 0.2 } : { asian: 0.7, caucasian: 0.3 };
  const sex = spec.build === 'm' ? 1 : 0, child = spec.build === 'child', elder = (spec.stoop || 0) > 0;
  const age = child ? 9 + r() * 4 : elder ? 66 + r() * 10 : 22 + r() * 30;
  const e = Object.entries(eth).sort((a, b) => b[1] - a[1])[0][0]; const band = age < 35 ? 'young' : age < 60 ? 'middleage' : 'old';
  const skins = Object.keys(KIT.meta.skins); let skin = `${band}_${e}_${sex ? 'male' : 'female'}`; if (!skins.includes(skin)) skin = `young_${e}_${sex ? 'male' : 'female'}`; if (!skins.includes(skin)) skin = sex ? 'young_caucasian_male' : 'young_caucasian_female';
  const hs = spec.hairStyle; const style = { bun: 'bun', ponytail: 'ponytail', curly: 'puff', short: 'short', cap: 'capped', flatcap: 'capped', bald: 'cropped', wrap: 'bun' }[hs] || 'short';
  const suit = sex ? (r() < 0.5 ? 'shirt_m01' : r() < 0.5 ? 'suit_m03' : 'suit_m06') : 'suit_f01';
  const top = suit === 'suit_f01' || suit === 'suit_m06' ? { plain: true, color: spec.top } : { color: spec.top };
  const wear = {}; if (spec.outer === 'puffer') wear.puffer = spec.outerColor; if (spec.outer === 'apron') wear.apron = spec.outerColor; if (spec.outer === 'labcoat') wear.labcoat = '#f2f2ec'; if (spec.outer === 'hivis') wear.hivis = '#d2ea3c';
  if (hs === 'cap') wear.cap = spec.capColor; if (hs === 'flatcap') wear.flatcap = spec.capColor; if (hs === 'wrap') wear.headwrap = spec.wrapColor;
  return { eth, sex, age, muscle: 0.35 + r() * 0.4, weight: 0.3 + r() * 0.45, skin, iris: '#3a2616', extra: true, wear,
    hair: { style, color: spec.hair, tip: new THREE.Color(spec.hair).offsetHSL(0, 0, 0.06).getStyle(), count: 3500 }, beard: spec.beard ? { style: 'beard', color: spec.beard === 'grey' ? '#b9b3aa' : spec.hair, count: 3000 } : null,
    brows: { color: new THREE.Color(spec.hair).multiplyScalar(0.8).getStyle(), count: 220 },
    clothes: [{ key: suit, ...(suit === 'suit_f01' ? { bottomUV: [0, 0, 0.78, 0.57] } : {}), top, bottom: { color: spec.pants } }, { key: ['shoes01', 'shoes03', 'shoes04', 'shoes06'][Math.floor(r() * 4)] }] };
}
function buildCastHuman(name, spec, seed) {
  const H = HUMANS[name] || extraHuman(spec, seed);
  const h = buildHuman(Object.assign({ height: spec.height }, H, { brows: false, hair: null }));   // strand hair and brows are added below
  const hair = H.hair || {}; const q = (H.extra ? 0.45 : 1) * (typeof location !== 'undefined' && new URLSearchParams(location.search).has('hairq') ? +new URLSearchParams(location.search).get('hairq') : 1);
  scalpLayer(h, KIT, hair.color || '#1a1411'); scalpTint(h, KIT, hair.color || '#1a1411');
  strandHair(h, KIT, hair.style || 'short', Object.assign({ seed: seed % 997 }, hair, { count: Math.round((hair.count || ({ bun: 9000, ponytail: 9000, puff: 11000, short: 12000, cropped: 12000, capped: 9000 }[hair.style] || 9000)) * q) }));
  if (H.beard) strandHair(h, KIT, H.beard.style, Object.assign({ seed: seed % 991 + 1 }, H.beard, { count: Math.round((H.beard.count || 7000) * q) }));
  strandBrows(h, KIT, Object.assign({ seed: seed % 983 + 2 }, H.brows || {}, { count: Math.round(((H.brows || {}).count || 380) * q) }));
  const W = (typeof location !== 'undefined' && new URLSearchParams(location.search).has('nowear')) ? {} : Object.fromEntries(Object.entries(H.wear || {}).filter(([k]) => { const only = typeof location !== 'undefined' && new URLSearchParams(location.search).get('wear'); return !only || only === k; }));
  if (W.puffer) vest(h, KIT, 'puffer', W.puffer); if (W.hivis) vest(h, KIT, 'hivis', W.hivis); if (W.labcoat) labCoat(h, KIT, W.labcoat); if (W.apron) apron(h, KIT, W.apron);
  if (W.scarf) scarf(h, KIT, W.scarf); if (W.cap) cap(h, KIT, W.cap, 'cap'); if (W.flatcap) cap(h, KIT, W.flatcap, 'flatcap'); if (W.headwrap) headwrap(h, KIT, W.headwrap);
  return h;
}

const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion(), va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), ma = new THREE.Matrix4();
const DOWN = new THREE.Vector3(0, -1, 0), FWD = new THREE.Vector3(0, 0, 1);
function setWorldQuat(bone, q) { bone.parent.updateWorldMatrix(true, false); bone.parent.getWorldQuaternion(qa); bone.quaternion.copy(qa.invert().multiply(q)); bone.updateMatrixWorld(true); }
// hand frame from a finger direction and a palm normal (world): Y along the fingers, Z out of the palm, X = Y x Z
function frameQ(fingers, palm) { const Y = fingers.clone().normalize(), Z = palm.clone().sub(Y.clone().multiplyScalar(palm.dot(Y))).normalize(), X = new THREE.Vector3().crossVectors(Y, Z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); }
// hand shapes: curl (rad) of joints 1..3 for thumb, index, middle, ring, little; opp = thumb swung across the palm; spread = fingers fanned
export const HAND = {
  relaxed: { f: [[0.12, 0.18, 0.12], [0.18, 0.3, 0.2], [0.22, 0.36, 0.22], [0.28, 0.42, 0.26], [0.34, 0.48, 0.3]], opp: 0.15 },
  flat:    { f: [[0.02, 0.04, 0.02], [0.04, 0.05, 0.03], [0.04, 0.05, 0.03], [0.05, 0.06, 0.04], [0.06, 0.07, 0.04]], opp: 0.0 },
  spread:  { f: [[0.05, 0.08, 0.05], [0.06, 0.08, 0.05], [0.08, 0.1, 0.06], [0.1, 0.12, 0.08], [0.12, 0.14, 0.08]], opp: -0.1, spread: 0.18 },
  hold:    { f: [[0.3, 0.4, 0.3], [0.7, 0.8, 0.5], [0.75, 0.85, 0.55], [0.8, 0.9, 0.55], [0.85, 0.95, 0.6]], opp: 0.45 },
  ball:    { f: [[0.25, 0.3, 0.25], [0.45, 0.5, 0.35], [0.5, 0.55, 0.38], [0.55, 0.6, 0.4], [0.6, 0.65, 0.42]], opp: 0.55, spread: 0.08 },
  power:   { f: [[0.5, 0.6, 0.45], [1.15, 1.25, 0.8], [1.2, 1.3, 0.85], [1.25, 1.3, 0.85], [1.3, 1.35, 0.85]], opp: 0.75 },
  knife:   { f: [[0.45, 0.5, 0.35], [0.35, 0.45, 0.3], [1.2, 1.3, 0.85], [1.25, 1.3, 0.85], [1.3, 1.35, 0.85]], opp: 0.65 },
  pinch:   { f: [[0.35, 0.45, 0.35], [0.55, 0.75, 0.45], [0.7, 0.85, 0.5], [0.95, 1.05, 0.6], [1.05, 1.15, 0.65]], opp: 0.85 },
  fork:    { f: [[0.4, 0.45, 0.3], [0.45, 0.6, 0.35], [0.85, 0.95, 0.55], [1.1, 1.2, 0.7], [1.2, 1.3, 0.75]], opp: 0.7 },
  claw:    { f: [[0.55, 0.6, 0.45], [0.55, 1.15, 0.85], [0.55, 1.15, 0.85], [0.6, 1.15, 0.85], [0.65, 1.15, 0.85]], opp: 0.7 },
  point:   { f: [[0.5, 0.55, 0.4], [0.04, 0.05, 0.03], [1.3, 1.35, 0.9], [1.35, 1.35, 0.9], [1.4, 1.4, 0.9]], opp: 0.7 },
  fist:    { f: [[0.6, 0.7, 0.5], [1.4, 1.4, 0.95], [1.4, 1.4, 0.95], [1.4, 1.4, 0.95], [1.4, 1.4, 0.95]], opp: 0.8 },
};
const shapeOf = (k) => (k && (typeof k.shape === 'object' ? k.shape : HAND[k.shape])) || (k && k.at ? HAND.hold : HAND.relaxed);

export class HumanPuppet extends Puppet {
  constructor(name, spec) {
    super(name, spec);
    this.root.traverse(o => { if (o.isMesh) o.visible = false; });           // the clay rig becomes an invisible driver
    const h = this.h = buildCastHuman(name, this.spec, this.seed);
    this.root.add(h.group); this.ikReq = { L: null, R: null };
    this.fit();
  }
  // driver proportions = this body's joints, so poses and IK targets mean the same on both.
  // The clay rig names sides as seen from the front (its 'L' limbs sit at -x); the body's are anatomical ('.L' at +x).
  fit() {
    const h = this.h, J = (n, e) => h.joint(n, e), MS = this.MS = { L: 'R', R: 'L' };
    const hip = { L: J('upperleg01.R'), R: J('upperleg01.L') }, knee = { L: J('lowerleg01.R'), R: J('lowerleg01.L') }, ank = { L: J('foot.R'), R: J('foot.L') };
    const thigh = (hip.L.distanceTo(knee.L) + hip.R.distanceTo(knee.R)) / 2, shin = (knee.L.distanceTo(ank.L) + knee.R.distanceTo(ank.R)) / 2;
    const hipJ = hip.L.clone().add(hip.R).multiplyScalar(0.5);
    this.hipY = (ank.L.y + ank.R.y) / 2 + thigh + shin; this.lift = this.hipY - hipJ.y;
    this.hips.position.set(0, this.hipY, 0);
    for (const s of ['L', 'R']) { const Lg = this.legs[s]; Lg.leg.position.set(hip[s].x, 0, hip[s].z); Lg.knee.position.set(0, -thigh, 0); Lg.ankle.position.set(0, -shin, 0); }
    const sp = J('spine05'), nk = J('neck01'), hd = J('head');
    this.spine.position.set(0, sp.y - hipJ.y, sp.z); this.neck.position.copy(nk).sub(sp); this.hd.position.copy(hd).sub(nk);
    for (const s of ['L', 'R']) { const A = this.arms[s], m = MS[s]; const sh = J('upperarm01.' + m), el = J('lowerarm01.' + m), wr = J('wrist.' + m), mid = J('finger3-1.' + m);
      A.arm.position.copy(sh).sub(sp); A.up = sh.distanceTo(el); const fore = el.distanceTo(wr), palm = wr.distanceTo(mid) * 0.7;
      A.elbow.position.set(0, -A.up, 0); A.wrist.position.set(0, -fore, 0); A.fo = fore + palm; A.grip.position.set(0, -palm, 0.015); A.palm = palm; }
    const eyes = J('eye.L').add(J('eye.R')).multiplyScalar(0.5); this.eyesRest = eyes;
    this.skullC.set(0, eyes.y - hd.y - 0.06 * this.D.headR * this.s, 0);
    const ref = new THREE.Object3D(); ref.position.copy(eyes).sub(hd).add(V(0, -0.105, -0.012)); h.bone('head').add(ref); this.head = ref;   // public: scenes aim at head + 0.09..0.12
    // retarget constants (root-local rest): driver group rest rotation^-1 x alignment of the body's rest segment to the driver's
    this.root.updateMatrixWorld(true); const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion()).invert();
    const restQ = (g) => rootQ.clone().multiply(g.getWorldQuaternion(new THREE.Quaternion()));
    const chord = (a, b) => J(b).sub(J(a)).normalize();
    const align = (c, to = DOWN) => new THREE.Quaternion().setFromUnitVectors(c, to);
    this.K = {};
    for (const s of ['L', 'R']) {
      const A = this.arms[s], Lg = this.legs[s], m = MS[s];
      // a hanging arm angles out a little at the shoulder and more at the elbow (carrying angle), so the hands clear the hips
      const abd = (deg) => new THREE.Quaternion().setFromAxisAngle(FWD, (m === 'L' ? 1 : -1) * deg * Math.PI / 180);
      const up = abd(6).multiply(align(chord('upperarm01.' + m, 'lowerarm01.' + m)));
      let fore = align(chord('lowerarm01.' + m, 'wrist.' + m));
      // twist the forearm so the hanging hand has its thumb side forward (palm towards the thigh)
      const side = J('finger2-1.' + m).sub(J('finger5-1.' + m)).applyQuaternion(fore); side.y = 0; side.normalize();
      const tw = new THREE.Quaternion().setFromUnitVectors(side, FWD); fore = abd(14).multiply(tw.multiply(fore));
      this.K['upperarm01.' + m] = { g: A.arm, k: restQ(A.arm).invert().multiply(up) };
      this.K['lowerarm01.' + m] = { g: A.elbow, k: restQ(A.elbow).invert().multiply(fore) };
      this.K['wrist.' + m] = { g: A.hand, k: restQ(A.hand).invert().multiply(fore.clone()) };
      this.K['upperleg01.' + m] = { g: Lg.leg, k: restQ(Lg.leg).invert().multiply(align(chord('upperleg01.' + m, 'lowerleg01.' + m))) };
      this.K['lowerleg01.' + m] = { g: Lg.knee, k: restQ(Lg.knee).invert().multiply(align(chord('lowerleg01.' + m, 'foot.' + m))) };
      this.K['foot.' + m] = { g: Lg.ankle, k: restQ(Lg.ankle).invert() };
      // finger curl axes (rest frame = bone frame): fingers bend towards the palm
      const wr = J('wrist.' + m), handDir = J('finger3-1.' + m).sub(wr).normalize(), sd = J('finger2-1.' + m).sub(J('finger5-1.' + m)).normalize();
      const palmN = new THREE.Vector3().crossVectors(handDir, sd).multiplyScalar(m === 'L' ? -1 : 1).normalize(); this['palmN' + s] = palmN;
      this['fingers' + s] = [];
      for (let f = 1; f <= 5; f++) for (let k = 1; k <= 3; k++) { const n = `finger${f}-${k}.${m}`; if (!h.bone(n)) continue; const d = J(n, 't').sub(J(n)).normalize();
        this['fingers' + s].push({ b: h.bone(n), axis: new THREE.Vector3().crossVectors(d, palmN).normalize(), f, k, fan: f - 3 }); }
      // the hand frame at rest (body space = every bone's rest-local space): Y along the fingers, Z out of the palm
      const Bq = frameQ(handDir, palmN), off = J('finger3-1.' + m).sub(wr).multiplyScalar(0.7).add(palmN.clone().multiplyScalar(0.018));
      this.HF = this.HF || {}; this.HF[s] = { B: Bq, Binv: Bq.clone().invert(), off, fore: J('lowerarm01.' + m).distanceTo(wr), foreAx: wr.clone().sub(J('lowerarm01.' + m)).normalize(), handDir, palmN };
    }
    // pelvis rigidly attached to the driver hips (lifted to the straight-leg stance)
    const hipsRest = new THREE.Matrix4().compose(V(0, this.hipY, 0), new THREE.Quaternion(), V(1, 1, 1));
    const rootRest = h.bone('root').matrix.clone(); rootRest.elements[13] += this.lift;
    this.pelvisOff = hipsRest.invert().multiply(rootRest);
  }
  ik(side, targetW, poleW, w = 1) { this.ikReq[side] = { t: targetW.clone(), p: poleW.clone(), w }; super.ik(side, targetW, poleW, w); }
  solve(t) { this.ikReq.L = this.ikReq.R = null; super.solve(t); this.cavity.visible = this.teeth.visible = false; this.retarget(t); }   // the clay mouth parts stay hidden
  retarget(t) {
    const h = this.h, B = (n) => h.bone(n);
    this.root.updateMatrixWorld(true);
    // pelvis
    const hm = new THREE.Matrix4().compose(this.hips.position, this.hips.quaternion, V(1, 1, 1)).multiply(this.pelvisOff);
    hm.decompose(B('root').position, B('root').quaternion, va);
    // spine and neck: spread the driver's single segments over the body's vertebrae
    const spread = (q, names, wts) => names.forEach((n, i) => B(n).quaternion.identity().slerp(q, wts[i]));
    spread(this.spine.quaternion, ['spine05', 'spine04', 'spine03', 'spine02', 'spine01'], [0.14, 0.2, 0.24, 0.24, 0.18]);
    spread(this.neck.quaternion, ['neck01', 'neck02', 'neck03'], [0.34, 0.33, 0.33]);
    h.group.updateMatrixWorld(true);
    setWorldQuat(B('head'), this.hd.getWorldQuaternion(qb));
    // limbs: driver world rotation x rest correction
    for (const n of ['upperleg01.L', 'upperleg01.R', 'lowerleg01.L', 'lowerleg01.R', 'foot.L', 'foot.R', 'upperarm01.L', 'upperarm01.R', 'lowerarm01.L', 'lowerarm01.R', 'wrist.L', 'wrist.R']) {
      const k = this.K[n]; k.g.getWorldQuaternion(qb); setWorldQuat(B(n), qb.multiply(k.k));
    }
    // arms reaching for something: exact two-bone IK on the real skeleton. With an aim (hand keys' `aim`), the wrist is
    // placed so the turned hand puts its palm centre on the target; without one the palm sits on the forearm line.
    for (const s of ['L', 'R']) { const r = this.ikReq[s], hk = Puppet.seg(this.k['hand' + s], t), aim = this.aimAt(hk, t); const L2b = B('lowerarm02.' + this.MS[s]); if (L2b) L2b.quaternion.identity();
      if (r && r.w > 0.001) { if (aim) this.armIK(s, r.t, r.p, r.w, aim); else this.bodyIK(s, r.t, r.p, r.w); }
      else if (aim) { h.group.updateMatrixWorld(true); this.orientHand(s, aim.q.clone().multiply(this.HF[s].Binv), aim.w); }
      this.applyShape(s, hk, r); }
    h.group.updateMatrixWorld(true);
    // eyes on the gaze target
    if (this.gazeTarget) for (const s of ['L', 'R']) { const e = B('eye.' + s); e.parent.updateWorldMatrix(true, false); const ep = e.getWorldPosition(va); const d = vb.copy(this.gazeTarget).sub(ep).normalize();
      B('head').getWorldQuaternion(qb); const dl = d.applyQuaternion(qc.copy(qb).invert()); const yw = clamp(Math.atan2(dl.x, dl.z), -0.45, 0.45), pt = clamp(-Math.atan2(dl.y, Math.hypot(dl.x, dl.z)), -0.24, 0.26);
      this.eyePitch = pt; qc.setFromEuler(new THREE.Euler(pt, yw, 0, 'YXZ')); setWorldQuat(e, qb.multiply(qc)); }
    // face
    const fs = this.faceState; if (fs) { const { F, bl, open, sm, e, talking } = fs; const tt = fs.t;
      const v1 = talking ? noise2(tt * 7.3, this.seed % 53) : 0.5, v2 = talking ? noise2(tt * 6.1 + 9, this.seed % 41) : 0.5;
      const lidUp = Math.max(0, -(this.eyePitch || 0)) * 2.2 * (1 - bl), lidDown = Math.max(0, this.eyePitch || 0) * 1.4;
      h.setFace({ 'eye-left-opened-up': lidUp, 'eye-right-opened-up': lidUp, 'eye-left-closure': Math.min(1, bl + lidDown), 'eye-right-closure': Math.min(1, bl + lidDown), 'eye-left-slit': F.squint * 0.6 + Math.max(0, sm) * 0.22, 'eye-right-slit': F.squint * 0.6 + Math.max(0, sm) * 0.22,
        'eyebrows-left-up': Math.max(0, F.brow) * 0.8 + Math.max(0, F.tilt) * 0.4 + (talking ? e * 0.15 : 0), 'eyebrows-right-up': Math.max(0, F.brow) * 0.8 + (talking ? e * 0.15 : 0),
        'eyebrows-left-down': Math.max(0, -F.brow) * 0.7, 'eyebrows-right-down': Math.max(0, -F.brow) * 0.7 + Math.max(0, F.tilt) * 0.3,
        'mouth-corner-puller': Math.max(0, sm) * 0.85, 'mouth-depression': Math.max(0, -sm) * 0.7, 'mouth-open': open * 0.5,
        'mouth-pursing': talking ? Math.max(0, v1 - 0.55) * 1.2 * e : 0, 'mouth-retraction': talking ? Math.max(0, v2 - 0.5) * 0.8 * e : 0, 'mouth-compression': talking ? Math.max(0, 0.25 - open) * 0.6 : 0 }); }
    // props held by the driver grips follow the real palms
    for (const s of ['L', 'R']) { const A = this.arms[s], f = this.handFrame(s);
      A.grip.parent.updateWorldMatrix(true, false); A.grip.position.copy(A.grip.parent.worldToLocal(f.pos)); A.grip.updateMatrixWorld(true); }
    // attached props ride in the hand frame
    for (const a of this.held || []) { if (t < a.from || t > a.until) continue; const f = this.handFrame(a.s);
      a.obj.position.copy(f.pos).add(a.pos.clone().applyQuaternion(f.quat)); a.obj.quaternion.copy(f.quat).multiply(a.q); a.obj.updateMatrixWorld(true); }
  }
  // palm centre and hand frame (Y along the fingers, Z out of the palm) in world space
  handFrame(s) { const H = this.HF[s], Wr = this.h.bone('wrist.' + this.MS[s]); Wr.updateWorldMatrix(true, false); const q = Wr.getWorldQuaternion(new THREE.Quaternion());
    return { pos: H.off.clone().applyQuaternion(q).add(Wr.getWorldPosition(new THREE.Vector3())), quat: q.clone().multiply(H.B) }; }
  // keep a prop in this hand: pos (m) and rot (Euler, rad) in the hand frame, optionally only between from..until
  attach(s, obj, o = {}) { (this.held = this.held || []).push({ s, obj, pos: V(...(o.pos || [0, 0, 0])), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.rot || [0, 0, 0]))), from: o.from ?? -1e9, until: o.until ?? 1e9 }); return obj; }
  // the blended aim of the current hand keys: { q: wanted hand frame (world), w }
  aimAt(hk, t) {
    if (!hk) return null; const qf = (k) => { if (!k || !k.aim) return null; const a = typeof k.aim === 'function' ? k.aim(t, this) : k.aim; if (!a) return null; return a.isQuaternion ? a.clone() : frameQ(a.fingers, a.palm); };
    const qa = hk.prev ? qf(hk.prev) : null, qb = qf(hk.cur); if (!qa && !qb) return null; const u = hk.prev ? hk.u : 1;
    if (qa && qb) return { q: qa.slerp(qb, u), w: 1 }; if (qb) return { q: qb, w: hk.prev ? u : 1 }; return { q: qa, w: 1 - u };
  }
  // two-bone IK to a palm target with the hand turned to an aim
  armIK(s, T, pole, w, aim) {
    const h = this.h, m = this.MS[s], H = this.HF[s], U = h.bone('upperarm01.' + m), Lw = h.bone('lowerarm01.' + m), Wr = h.bone('wrist.' + m);
    h.group.updateMatrixWorld(true);
    const qHand = Wr.getWorldQuaternion(new THREE.Quaternion()).slerp(aim.q.clone().multiply(H.Binv), aim.w);
    const Wt = T.clone().sub(H.off.clone().applyQuaternion(qHand));                       // wrist joint target
    const S = U.getWorldPosition(new THREE.Vector3()), E0 = Lw.getWorldPosition(new THREE.Vector3());
    const L1 = this.arms[s].up, L2 = H.fore; const Dv = Wt.clone().sub(S); const d = clamp(Dv.length(), Math.abs(L1 - L2) + 1e-3, (L1 + L2) * 0.999); const dir = Dv.normalize();
    const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    let k = new THREE.Vector3().crossVectors(dir, pole); if (k.lengthSq() < 1e-6) k.crossVectors(dir, FWD); k.normalize();
    const E = S.clone().add(dir.clone().applyAxisAngle(k, a).multiplyScalar(L1));
    const aimBone = (bone, from, tip, to) => { const cur = bone.getWorldQuaternion(new THREE.Quaternion()); const q = new THREE.Quaternion().setFromUnitVectors(tip.clone().sub(from).normalize(), to.clone().sub(from).normalize()).multiply(cur); setWorldQuat(bone, cur.slerp(q, w)); };
    aimBone(U, S, E0, E); h.group.updateMatrixWorld(true);
    aimBone(Lw, Lw.getWorldPosition(new THREE.Vector3()), Wr.getWorldPosition(new THREE.Vector3()), Wt); h.group.updateMatrixWorld(true);
    this.orientHand(s, qHand, w);
  }
  // turn the hand to a wrist world rotation; half the twist about the forearm goes into the forearm twist bone
  orientHand(s, qWrist, w = 1) {
    const h = this.h, m = this.MS[s], H = this.HF[s], L2b = h.bone('lowerarm02.' + m), Wr = h.bone('wrist.' + m);
    const want = Wr.getWorldQuaternion(new THREE.Quaternion()).slerp(qWrist, w);
    if (L2b) { const pq = L2b.getWorldQuaternion(new THREE.Quaternion()), rel = pq.invert().multiply(want), ax = H.foreAx, dt = rel.x * ax.x + rel.y * ax.y + rel.z * ax.z;
      const tw = new THREE.Quaternion(ax.x * dt, ax.y * dt, ax.z * dt, rel.w).normalize(); L2b.quaternion.multiply(new THREE.Quaternion().slerp(tw, 0.5)); L2b.updateMatrixWorld(true); }
    setWorldQuat(Wr, want);
  }
  // finger pose from the hand keys' shapes (blended between keys); reaching without a shape = hold, idle = relaxed
  applyShape(s, hk, r) {
    let A = null, Bs, u = 1;
    if (hk) { Bs = shapeOf(hk.cur); if (hk.prev) { A = shapeOf(hk.prev); u = hk.u; } if (!hk.cur.shape && !hk.cur.at && r && r.w > 0.001) Bs = HAND.hold; }
    else Bs = r && r.w > 0.001 ? HAND.hold : HAND.relaxed;
    const H = this.HF[s], sg = this.MS[s] === 'L' ? 1 : -1, mix = (key, d = 0) => lerp(A ? (A[key] ?? d) : (Bs[key] ?? d), Bs[key] ?? d, u);
    const opp = mix('opp'), spr = mix('spread');
    for (const F of this['fingers' + s]) { const ang = lerp(A ? A.f[F.f - 1][F.k - 1] : Bs.f[F.f - 1][F.k - 1], Bs.f[F.f - 1][F.k - 1], u);
      F.b.quaternion.setFromAxisAngle(F.axis, ang);
      if (F.k === 1 && F.f > 1 && spr) F.b.quaternion.premultiply(qc.setFromAxisAngle(H.palmN, -spr * F.fan * sg));
      if (F.k === 1 && F.f === 1 && opp) F.b.quaternion.premultiply(qc.setFromAxisAngle(H.handDir, -opp * sg)); }   // swings the thumb in front of the palm
  }
  // analytic two-bone IK on the body's own arm (shoulder from the posed spine), elbow toward the pole
  bodyIK(s, T, pole, w) {
    const h = this.h, m = this.MS[s], U = h.bone('upperarm01.' + m), Lw = h.bone('lowerarm01.' + m);
    h.group.updateMatrixWorld(true); const S = U.getWorldPosition(new THREE.Vector3()), E0 = Lw.getWorldPosition(new THREE.Vector3());
    const A = this.arms[s]; const L1 = A.up, L2 = A.fo; const Dv = T.clone().sub(S); let d = clamp(Dv.length(), Math.abs(L1 - L2) + 1e-3, (L1 + L2) * 0.999); const dir = Dv.normalize();
    const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    let k = new THREE.Vector3().crossVectors(dir, pole); if (k.lengthSq() < 1e-6) k.crossVectors(dir, FWD); k.normalize();
    const E = S.clone().add(dir.clone().applyAxisAngle(k, a).multiplyScalar(L1));
    const aimSeg = (bone, from, to, wt) => { bone.updateMatrixWorld(true); const cur = bone.getWorldQuaternion(new THREE.Quaternion()); const curDir = (bone === U ? E0.clone().sub(S) : bone.userData.tipW).normalize();
      const want = to.clone().sub(from).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(curDir, want).multiply(cur); setWorldQuat(bone, cur.slerp(q, wt)); };
    aimSeg(U, S, E, w);
    h.group.updateMatrixWorld(true); const E1 = Lw.getWorldPosition(new THREE.Vector3()); const W0 = h.bone('wrist.' + m).getWorldPosition(new THREE.Vector3());
    const grip = this.arms[s].palm; const tip = W0.clone().sub(E1).normalize().multiplyScalar(L2).add(E1);   // grip lies on the forearm line
    Lw.userData.tipW = tip.clone().sub(E1); aimSeg(Lw, E1, T, w);
  }
}

export function puppet(name, spec) { return CLAY ? new Puppet(name, spec || CAST[name]) : new HumanPuppet(name, spec || CAST[name]); }
