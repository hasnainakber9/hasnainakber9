// Road surfaces for the turtle panels. Asphalt is a fine aggregate tile multiplied by a long macro map of the whole
// carriageway that never repeats (polish in the wheel paths, oil down each lane's centre, patches, sealed cracks), so
// the road has no visible tiling; paint is laid as separate worn stripes.
import { K, THREE } from './meme.js';

let aggregate = null;
function aggregateTex() {
  if (aggregate) return aggregate;
  aggregate = K.canvasTex(1024, 1024, (g, w, h) => { const r = K.prng(7); g.fillStyle = '#5a5957'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 52000; i++) { const v = 60 + r() * 90 | 0, s = 1 + r() * r() * 5; g.fillStyle = `rgba(${v},${v - 2},${v - 4},${0.35 + r() * 0.5})`; g.fillRect(r() * w, r() * h, s, s * (0.6 + r() * 0.8)); }
    for (let i = 0; i < 2600; i++) { const v = 150 + r() * 70 | 0; g.fillStyle = `rgba(${v},${v - 3},${v - 8},0.55)`; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 2.2, 0, Math.PI * 2); g.fill(); } }, { repeat: [1, 1] });
  aggregate.wrapS = aggregate.wrapT = THREE.RepeatWrapping; aggregate.anisotropy = 16; return aggregate;
}
function macroTex(seed, w0, len, lanes, o = {}) { const r = K.prng(seed), W = 512, H = 8192, mx = W / w0, my = H / len;
  return K.canvasTex(W, H, (g) => { const id = g.createImageData(W, H), d = id.data, base = o.base ?? 175;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = K.fbm(x / mx * 0.35 + seed, y / my * 0.12, 4), m2 = K.noise2(x / mx * 2.1, y / my * 1.3); const v = base + (n - 0.5) * 70 + (m2 - 0.5) * 18, i = (y * W + x) * 4; d[i] = d[i + 1] = v; d[i + 2] = v - 3; d[i + 3] = 255; }
    g.putImageData(id, 0, 0);
    for (const c of lanes) { for (const of of [-0.85, 0.85]) { const gr = g.createLinearGradient((c + of - 0.45) * mx, 0, (c + of + 0.45) * mx, 0); gr.addColorStop(0, 'rgba(40,40,42,0)'); gr.addColorStop(0.5, `rgba(40,40,42,${o.wear ?? 0.28})`); gr.addColorStop(1, 'rgba(40,40,42,0)'); g.fillStyle = gr; g.fillRect((c + of - 0.45) * mx, 0, 0.9 * mx, H); }
      for (let y = 0; y < H; y += 2) if (r() < (o.oil ?? 0.35)) { g.fillStyle = `rgba(20,18,16,${0.05 + r() * 0.12})`; g.beginPath(); g.ellipse((c + (r() - 0.5) * 0.5) * mx, y, (0.05 + r() * 0.2) * mx, (0.1 + r() * 0.5) * my, 0, 0, Math.PI * 2); g.fill(); } }
    for (let k = 0; k < (o.patches ?? 14); k++) { const x = r() * (w0 - 3), y = r() * len, pw = 1.2 + r() * 2.5, ph = 1.5 + r() * 6; g.fillStyle = `rgba(30,30,32,${0.18 + r() * 0.18})`; g.fillRect(x * mx, y * my, pw * mx, ph * my); }
    g.strokeStyle = 'rgba(15,15,16,0.55)'; g.lineCap = 'round'; for (let k = 0; k < (o.cracks ?? 60); k++) { let x = r() * w0, y = r() * len; g.lineWidth = (0.025 + r() * 0.03) * mx; g.beginPath(); g.moveTo(x * mx, y * my);
      const L = 2 + r() * 8, ang = r() < 0.6 ? 0 : Math.PI / 2; for (let s = 0; s < 12; s++) { x += Math.cos(ang) * L / 12 + (r() - 0.5) * 0.25; y += Math.sin(ang) * L / 12 + (r() - 0.5) * 0.2; g.lineTo(x * mx, y * my); } g.stroke(); } }); }
// a carriageway from x0 to x1, running from z0 back (-z) for len metres
export function road(S, x0, x1, z0, len, seed, lanes, o = {}) {
  const w = x1 - x0, mac = macroTex(seed, w, len, lanes.map(c => c - x0), o); mac.colorSpace = THREE.NoColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: aggregateTex().clone(), roughness: 0.92, normalMap: K.normalTex('rock', 1).clone(), normalScale: new THREE.Vector2(o.relief ?? 0.28, o.relief ?? 0.28) });
  m.map.repeat.set(w / 2.2, len / 2.2); m.map.needsUpdate = true; m.normalMap.repeat.set(w / 1.6, len / 1.6); m.normalMap.needsUpdate = true;
  m.onBeforeCompile = (sh) => { sh.uniforms.macro = { value: mac }; sh.uniforms.rep = { value: m.map.repeat };
    sh.fragmentShader = 'uniform sampler2D macro; uniform vec2 rep;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= texture2D(macro, vMapUv / rep).rgb * 1.25;'); };
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, len), m); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, 0, z0 - len / 2); p.receiveShadow = true; S.add(p); return p;
}
let paintM = null;
export function stripe(S, x, z0, z1, w = 0.15, col) {
  if (!paintM) { const paintTex = K.canvasTex(64, 512, (g, w2, h) => { const r = K.prng(4); g.fillStyle = '#ffffff'; g.fillRect(0, 0, w2, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.9})`; g.fillRect(r() * w2, r() * h, 1 + r() * 4, 1 + r() * 3); } });
    paintM = new THREE.MeshStandardMaterial({ color: '#e9e7e0', roughness: 0.62, alphaMap: paintTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, z1 - z0), col ? paintM.clone() : paintM); if (col) m.material.color.set(col); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.002, (z0 + z1) / 2); m.receiveShadow = true; S.add(m); return m;
}
// a soft dark contact patch under a vehicle (ambient occlusion it would have on the road)
let blobM = null;
export function park(S, v, x, z, heading, len, wid) {
  if (!blobM) { const contact = K.canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    blobM = new THREE.MeshBasicMaterial({ color: '#000000', alphaMap: contact, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }); }
  v.position.set(x, 0, z); v.rotation.y = heading; S.add(v);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(len * 1.1, wid * 1.25), blobM); b.rotation.set(-Math.PI / 2, 0, heading); b.position.set(x, 0.004, z); S.add(b); return v;
}
