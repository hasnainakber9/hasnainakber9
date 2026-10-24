// Bake a finished shot to glTF for the Unity project.
// Loaded on demand by export_unity.py:  const m = await import('../lib/export.js'); await m.exportShot(window.__app)
// Samples every node's local transform at `fps`, keeps only the channels that move, drops keys that linear
// interpolation reproduces, and writes one GLB (geometry + materials + textures + the shot's performance).
// Camera, lights, fog and environment go to a JSON sidecar: Unity builds those natively (see unity/.../Editor).
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export function updateAt(app, t) {            // renderAt() without the render
  app.t = t;
  for (let pass = 0; pass < 2; pass++) {
    for (const u of app.updaters) u(t);
    for (const p of app.puppets) p.pose(t);
    app.scene.updateMatrixWorld(true);
    for (const p of app.puppets) p.solve(t);
    app.scene.updateMatrixWorld(true);
    for (const u of app.late) u(t);
    app.scene.updateMatrixWorld(true);
  }
  if (app.rig) app.rig.apply(app, t);
  app.camera.updateMatrixWorld(true);
}

const skipObj = (o) => o.isSprite || o.isPoints || o.isLine || o.isLight || o.isCamera || o.userData.noExport ||
  (o.material && !Array.isArray(o.material) && (o.material.isShaderMaterial || o.material.isRawShaderMaterial || o.material.isPointsMaterial));

// greedy linear key reduction: keep a key only if dropping it would move the curve by more than `tol`
function reduce(times, vals, k, tol) {
  const n = times.length; if (n <= 2) return { times, vals };
  const keep = [0]; let a = 0;
  for (let b = 2; b <= n; b++) {
    let ok = b < n;
    if (ok) {
      for (let i = a + 1; i < b && ok; i++) {
        const u = (times[i] - times[a]) / (times[b] - times[a]);
        for (let c = 0; c < k; c++) { const v = vals[a * k + c] + (vals[b * k + c] - vals[a * k + c]) * u; if (Math.abs(v - vals[i * k + c]) > tol) { ok = false; break; } }
      }
    }
    if (!ok) { keep.push(b - 1); a = b - 1; }
  }
  if (keep[keep.length - 1] !== n - 1) keep.push(n - 1);
  const T = new Float32Array(keep.length), V = new Float32Array(keep.length * k);
  keep.forEach((i, j) => { T[j] = times[i]; for (let c = 0; c < k; c++) V[j * k + c] = vals[i * k + c]; });
  return { times: T, vals: V };
}
const constant = (vals, k, tol) => { for (let i = k; i < vals.length; i++) if (Math.abs(vals[i] - vals[i % k]) > tol) return false; return true; };

export async function exportShot(app, o = {}) {
  const fps = o.fps || 24, n = Math.round(app.duration * fps), scene = app.scene;
  const nodes = []; const dropped = [];
  scene.traverse(x => { if (x === scene) return; (skipObj(x) ? dropped : nodes).push(x); });
  const P = nodes.map(() => []), Q = nodes.map(() => []), S = nodes.map(() => []), seen = nodes.map(() => false);
  const times = [], cam = [];
  for (let i = 0; i < n; i++) {
    const t = i / fps; updateAt(app, t); times.push(t);
    nodes.forEach((x, j) => {
      const v = x.visible ? 1 : 0; if (v) seen[j] = true;
      P[j].push(x.position.x, x.position.y, x.position.z);
      const q = x.quaternion, qa = Q[j], m = qa.length;   // keep quaternion signs continuous
      const flip = m >= 4 && (qa[m - 4] * q.x + qa[m - 3] * q.y + qa[m - 2] * q.z + qa[m - 1] * q.w) < 0 ? -1 : 1;
      qa.push(q.x * flip, q.y * flip, q.z * flip, q.w * flip);
      S[j].push(x.scale.x * v, x.scale.y * v, x.scale.z * v);
    });
    const c = app.camera;
    cam.push([+t.toFixed(4), ...c.position.toArray().map(v => +v.toFixed(5)), ...c.quaternion.toArray().map(v => +v.toFixed(6)), +c.fov.toFixed(4),
      app.dof ? +app.dof.uniforms.focus.value.toFixed(4) : null, app.dof ? +app.dof.uniforms.aperture.value.toFixed(5) : null]);
  }
  // performance → AnimationClip (only channels that move)
  const tracks = []; let keys = 0;
  nodes.forEach((x, j) => {
    if (!seen[j]) return;
    for (const [arr, k, tol, Track, prop] of [[P[j], 3, 4e-4, THREE.VectorKeyframeTrack, 'position'], [Q[j], 4, 2e-4, THREE.QuaternionKeyframeTrack, 'quaternion'], [S[j], 3, 2e-4, THREE.VectorKeyframeTrack, 'scale']]) {
      if (constant(arr, k, tol * 0.25)) continue;
      const r = reduce(times, arr, k, tol); keys += r.times.length;
      tracks.push(new Track(`${x.uuid}.${prop}`, r.times, r.vals));
    }
  });
  const clip = new THREE.AnimationClip(o.name || 'shot', app.duration, tracks);
  // export state = t 0; objects that are never visible stay out, effects/sky/lights are rebuilt in Unity
  updateAt(app, 0);
  const vis = new Map(); for (const x of [...nodes, ...dropped]) vis.set(x, x.visible);
  nodes.forEach((x, j) => { x.visible = seen[j]; });
  for (const x of dropped) x.visible = false;
  // glTF has no separate alpha map: bake three.js alphaMaps (green channel) into a white base-colour texture's alpha
  const alphaSwaps = new Map();
  scene.traverse(x => { const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; for (const m of ms) {
    if (!m.alphaMap || m.map || alphaSwaps.has(m) || !m.alphaMap.image) continue;
    const a = m.alphaMap, img = a.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) { d.data[i + 3] = d.data[i + 1]; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; }
    g.putImageData(d, 0, 0); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = a.wrapS; tex.wrapT = a.wrapT; tex.repeat.copy(a.repeat); tex.offset.copy(a.offset); tex.flipY = a.flipY;
    alphaSwaps.set(m, a); m.map = tex; m.alphaMap = null; if (!(m.alphaTest > 0)) m.alphaTest = 0.5; m.needsUpdate = true; } });
  // smaller files: JPEG for opaque colour and data maps, PNG only where alpha matters
  const texMime = new Map(), needAlpha = new Set();
  scene.traverse(x => { const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; for (const m of ms) for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'clearcoatNormalMap']) {
    const tx = m[key]; if (!tx || !tx.image) continue; if (!texMime.has(tx)) texMime.set(tx, tx.userData.mimeType);
    if (key === 'alphaMap' || (key === 'map' && (m.transparent || m.alphaTest > 0))) needAlpha.add(tx); } });
  for (const tx of texMime.keys()) tx.userData.mimeType = needAlpha.has(tx) ? 'image/png' : 'image/jpeg';
  // glTF needs colour factors in 0..1: clamp over-bright colours for the export, restore afterwards
  const colours = new Map(); scene.traverse(x => { const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; for (const m of ms) if (m.color && !colours.has(m) && Math.max(m.color.r, m.color.g, m.color.b) > 1) { colours.set(m, m.color.clone()); const k = Math.max(m.color.r, m.color.g, m.color.b); m.color.multiplyScalar(1 / k); } });
  // unique, readable node names: Unity binds animation by hierarchy path, so siblings must never share a name
  const names = new Map(); nodes.forEach((x, j) => { names.set(x, x.name); x.name = `${(x.name || (x.isMesh || x.isInstancedMesh ? 'mesh' : 'node')).replace(/[^\w-]/g, '_')}_${j}`; });
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true, animations: tracks.length ? [clip] : [], onlyVisible: true, maxTextureSize: o.maxTextureSize || 1024 });
  for (const [x, v] of vis) x.visible = v;
  for (const [x, nm] of names) x.name = nm;
  for (const [m, c] of colours) m.color.copy(c);
  for (const [m, a] of alphaSwaps) { m.map.dispose(); m.map = null; m.alphaMap = a; m.needsUpdate = true; }
  for (const [tx, m] of texMime) tx.userData.mimeType = m;
  // lights, fog, environment → sidecar
  const lights = [];
  scene.traverse(l => {
    if (!l.isLight || !l.visible) return; const p = l.getWorldPosition(new THREE.Vector3()); const col = '#' + l.color.getHexString();
    if (l.isDirectionalLight) { const d = l.target.getWorldPosition(new THREE.Vector3()).sub(p).normalize(); lights.push({ type: 'directional', dir: d.toArray(), color: col, intensity: l.intensity, shadows: l.castShadow }); }
    else if (l.isHemisphereLight) lights.push({ type: 'hemisphere', sky: col, ground: '#' + l.groundColor.getHexString(), intensity: l.intensity });
    else if (l.isAmbientLight) lights.push({ type: 'ambient', color: col, intensity: l.intensity });
    else if (l.isSpotLight) { const d = l.target.getWorldPosition(new THREE.Vector3()).sub(p).normalize(); lights.push({ type: 'spot', pos: p.toArray(), dir: d.toArray(), angle: l.angle, penumbra: l.penumbra, color: col, intensity: l.intensity, range: l.distance, shadows: l.castShadow }); }
    else if (l.isPointLight) lights.push({ type: 'point', pos: p.toArray(), color: col, intensity: l.intensity, range: l.distance, shadows: l.castShadow });
  });
  const fog = scene.fog ? { color: '#' + scene.fog.color.getHexString(), near: scene.fog.near, far: scene.fog.far } : null;
  const g = app.grade ? Object.fromEntries(['vignette', 'grain', 'warmth', 'sat', 'contrast', 'lift'].map(k => [k, app.grade.uniforms[k].value])) : {};
  const meta = { fps, duration: app.duration, frames: n, keys, tracks: tracks.length, nodes: nodes.length,
    camera: { columns: ['t', 'px', 'py', 'pz', 'qx', 'qy', 'qz', 'qw', 'fovV', 'focus', 'aperture'], near: app.camera.near, far: app.camera.far,
      cuts: app.rig ? app.rig.keys.filter(k => k.cut).map(k => +k.t.toFixed(4)) : [], frames: cam },
    lights, fog, exposure: app.renderer.toneMappingExposure, environmentIntensity: scene.environmentIntensity ?? 1,
    environmentRotationY: scene.environmentRotation ? scene.environmentRotation.y : 0,
    post: { bloom: app.bloom ? { strength: app.bloom.strength, radius: app.bloom.radius, threshold: app.bloom.threshold } : null, dof: !!app.dof, ao: !!app.ao, grade: g } };
  // ArrayBuffer → base64 in chunks (large files)
  const u8 = new Uint8Array(glb); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { glb: btoa(s), meta };
}
