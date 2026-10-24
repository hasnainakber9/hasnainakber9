// GOOD FOOD. NO DEAD ENDS. — realistic cast built from MakeHuman's CC0 base mesh, shape targets and skeleton
// (assets/mh, made by tools/mh_prepare.py; provenance and licences in assets/mh/LICENSES.md).
// A body is shaped once per character from macro targets (ethnicity, sex, age, muscle, weight, height), skinned to
// MakeHuman's 163-bone skeleton, dressed with fitted proxies (eyes, brows, lashes, teeth, hair, clothes) and given
// facial expression morphs. people.js drives the bones from its puppet rig, so scenes keep their authoring API.
import { THREE, V, clamp, lerp, loadNormals, normalTex, canvasTex, noise2, prng } from './core.js';

const ROOT = new URL('../assets/mh/', import.meta.url);
const get = (n) => fetch(new URL(n, ROOT)).then(r => { if (!r.ok) throw new Error('mh asset ' + n + ': ' + r.status); return r; });
const REC = 38;                 // proxy vertex record: 3 x u16 refs, 3 x f32 weights, 3 x f32 offsets, 2 x f32 uv
export const UNITS = ['eye-left-closure', 'eye-right-closure', 'eye-left-slit', 'eye-right-slit', 'eye-left-opened-up', 'eye-right-opened-up',
  'eyebrows-left-up', 'eyebrows-right-up', 'eyebrows-left-inner-up', 'eyebrows-right-inner-up', 'eyebrows-left-down', 'eyebrows-right-down',
  'mouth-open', 'mouth-corner-puller', 'mouth-depression', 'mouth-pursing', 'mouth-retraction', 'mouth-compression', 'mouth-elevation', 'mouth-upward-retraction', 'mouth-protusion'];
let KIT = null;

export async function loadKit() {
  if (KIT) return KIT;
  const meta = await (await get('base.json')).json();
  const buf = (n) => get(n).then(r => r.arrayBuffer());
  const [pos, bmap, buv, bidx, sw, tg] = await Promise.all(['base_pos.f32', 'body_map.u16', 'body_uv.f32', 'body_idx.u32', 'skin_w.bin', 'targets.bin'].map(buf));
  const N = meta.verts;
  const proxies = {};
  await Promise.all(Object.entries(meta.proxies).map(async ([k, p]) => { proxies[k] = Object.assign({ buf: await buf('proxies/' + k + '.bin') }, p); }));
  const tl = new THREE.TextureLoader(); const tex = {};
  const load = async (key, path, srgb = true) => { const t = await tl.loadAsync(new URL(path, ROOT).href); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; tex[key] = t; };
  const jobs = [];
  for (const [k, f] of Object.entries(meta.skins)) jobs.push(load('skin:' + k, 'skins/' + f));
  for (const [k, p] of Object.entries(meta.proxies)) for (const [slot, f] of Object.entries(p.tex || {})) jobs.push(load(k + ':' + slot, 'proxies/' + f, slot === 'diffuse'));
  await Promise.all(jobs);
  for (const k of Object.keys(tex)) if (/^(teeth|eyelashes|brow_[a-z0-9]+):diffuse$/.test(k)) tex[k] = bleed(tex[k]);
  await loadNormals(['skin', 'cloth', 'knit']);
  KIT = { meta, N, pos: new Float32Array(pos), bmap: new Uint16Array(bmap), buv: new Float32Array(buv), bidx: new Uint32Array(bidx),
    swI: new Uint8Array(sw, 0, N * 4), swW: new Float32Array(sw, N * 4, N * 4), tgU: new Uint16Array(tg), tgI: new Int16Array(tg), proxies, tex };
  return KIT;
}

// spread colour into a texture's empty (transparent or black) texels, so mipmaps don't pull dark fringes into the islands
function bleed(t) {
  const img = t.image, w = img.width, h = img.height; const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0); const id = g.getImageData(0, 0, w, h), d = id.data; const ok = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ok[i] = d[i * 4 + 3] > 24 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] > 30 ? 1 : 0;
  for (let pass = 0; pass < 24; pass++) { const nxt = ok.slice(); let changed = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (ok[i]) continue; let r = 0, gg = 0, b = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = yy * w + xx; if (!ok[j]) continue; r += d[j * 4]; gg += d[j * 4 + 1]; b += d[j * 4 + 2]; n++; }
      if (n) { d[i * 4] = r / n; d[i * 4 + 1] = gg / n; d[i * 4 + 2] = b / n; nxt[i] = 1; changed++; } }
    ok.set(nxt); if (!changed) break; }
  g.putImageData(id, 0, 0); const o = new THREE.CanvasTexture(cv); o.colorSpace = t.colorSpace; o.anisotropy = t.anisotropy; o.flipY = t.flipY; return o;
}

// ------------------------------------------------------------------ shape
function ageWeights(years) {
  const a = years <= 11 ? 0.1875 : years <= 25 ? 0.1875 + (years - 11) / 14 * 0.3125 : Math.min(1, 0.5 + (years - 25) / 65 * 0.5);
  if (a <= 0.1875) return { child: 1, young: 0, old: 0 };
  if (a < 0.5) { const c = (0.5 - a) / 0.3125; return { child: c, young: 1 - c, old: 0 }; }
  const o = (a - 0.5) / 0.5; return { child: 0, young: 1 - o, old: o };
}
const tri = (x) => x < 0.5 ? { min: (0.5 - x) / 0.5, average: 1 - (0.5 - x) / 0.5, max: 0 } : { min: 0, average: 1 - (x - 0.5) / 0.5, max: (x - 0.5) / 0.5 };
function addTarget(K, P, name, w, s = 1) {
  if (!w) return; const t = K.meta.targets[name]; if (!t) return; const [o, c] = t; const k0 = w * s * 1e-4;
  for (let k = o; k < o + c; k++) { const v = K.tgU[k * 4] * 3; P[v] += K.tgI[k * 4 + 1] * k0; P[v + 1] += K.tgI[k * 4 + 2] * k0; P[v + 2] += K.tgI[k * 4 + 3] * k0; }
}
const mean = (P, ids) => { const v = V(); for (const i of ids) v.x += P[i * 3], v.y += P[i * 3 + 1], v.z += P[i * 3 + 2]; return v.multiplyScalar(1 / ids.length); };

// smooth normals that ignore UV seams (vertices split for texturing share a position)
function seamlessNormals(g) {
  const p = g.attributes.position, idx = g.index.array, n = new Float32Array(p.count * 3); const key = new Map(); const id = new Int32Array(p.count);
  for (let i = 0; i < p.count; i++) { const k = Math.round(p.getX(i) * 2e4) + ',' + Math.round(p.getY(i) * 2e4) + ',' + Math.round(p.getZ(i) * 2e4); if (!key.has(k)) key.set(k, key.size); id[i] = key.get(k); }
  const acc = new Float32Array(key.size * 3); const a = V(), b = V(), c = V(), e1 = V(), e2 = V();
  for (let f = 0; f < idx.length; f += 3) { a.fromBufferAttribute(p, idx[f]); b.fromBufferAttribute(p, idx[f + 1]); c.fromBufferAttribute(p, idx[f + 2]); e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
    for (const j of [idx[f], idx[f + 1], idx[f + 2]]) { acc[id[j] * 3] += e1.x; acc[id[j] * 3 + 1] += e1.y; acc[id[j] * 3 + 2] += e1.z; } }
  for (let i = 0; i < p.count; i++) { const q = id[i] * 3; const l = Math.hypot(acc[q], acc[q + 1], acc[q + 2]) || 1; n[i * 3] = acc[q] / l; n[i * 3 + 1] = acc[q + 1] / l; n[i * 3 + 2] = acc[q + 2] / l; }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
}

// ------------------------------------------------------------------ materials
// skin: wrapped, red-shifted diffuse past the terminator (cheap subsurface look); specular stays physical
function skinPatch(m, wrap = 0.36, tint = [0.95, 0.52, 0.42]) {
  m.userData.hairRoot = { value: new THREE.Color('#000000') };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.hairRoot = m.userData.hairRoot;
    sh.vertexShader = 'attribute float hairMask;\nattribute float cavity;\nvarying float vHairMask;\nvarying float vCavity;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vHairMask = hairMask; vCavity = cavity;');
    sh.fragmentShader = 'uniform vec3 hairRoot;\nvarying float vHairMask;\nvarying float vCavity;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = mix( diffuseColor.rgb, hairRoot, vHairMask ) * mix( 1.0, 0.35, vCavity );' + (typeof location !== 'undefined' && location.search.includes('cavdbg') ? '\n diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.0, 1.0, 0.0 ), vCavity );' : ''))
      .replace('#include <opaque_fragment>', 'outgoingLight *= mix( 1.0, 0.22, vCavity );\n#include <opaque_fragment>');   // the inside of the mouth is in shadow: diffuse, sheen and reflections alike
    const chunk = THREE.ShaderChunk.lights_physical_pars_fragment.replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
      `float sssW = saturate( ( dot( geometryNormal, directLight.direction ) + ${wrap.toFixed(3)} ) / ${(1 + wrap).toFixed(3)} );
       vec3 sssIrr = ( vec3( dotNL ) + vec3( ${tint.map(x => x.toFixed(3)).join(', ')} ) * max( sssW - dotNL, 0.0 ) ) * directLight.color;
       reflectedLight.directDiffuse += sssIrr * BRDF_Lambert( material.diffuseColor );`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', chunk);
  };
  m.customProgramCacheKey = () => 'skin-sss-' + wrap;
  return m;
}
// hair and fabrics: optionally recolour a texture by its luminance (keeps the strand / weave detail, sets the hue)
function recolor(m, color, amount = 1, gain = 2.2) {
  if (!color || amount <= 0) return m;
  const c = new THREE.Color(color); const prev = m.onBeforeCompile; m.userData.recolGain = { value: gain };
  m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r);
    sh.uniforms.recol = { value: c }; sh.uniforms.recolAmt = { value: amount }; sh.uniforms.recolGain = m.userData.recolGain;
    sh.fragmentShader = 'uniform vec3 recol; uniform float recolAmt, recolGain;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      `#include <map_fragment>
       float lum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
       diffuseColor.rgb = mix( diffuseColor.rgb, recol * clamp( lum * recolGain, 0.0, 1.6 ), recolAmt );`); };
  const key = m.customProgramCacheKey(); m.customProgramCacheKey = () => key + '|recol';
  return m;
}
// linear luminance of a texture at a UV (or -1 where it is transparent), from a 128 px copy
function lumSampler(t) {
  if (t.userData.lum) return t.userData.lum;
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(t.image, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data, L = new Float32Array(S * S); const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  for (let i = 0; i < S * S; i++) L[i] = d[i * 4 + 3] > 128 ? 0.2126 * lin(d[i * 4]) + 0.7152 * lin(d[i * 4 + 1]) + 0.0722 * lin(d[i * 4 + 2]) : -1;
  return (t.userData.lum = (u, v) => L[clamp(Math.floor((t.flipY ? 1 - v : v) * S), 0, S - 1) * S + clamp(Math.floor(u * S), 0, S - 1)]);
}
// eyes: MakeHuman's iris is blue-green. Recolour it once per iris colour at full resolution (so distant, mip-mapped eyes
// keep their colour), keeping the fibre detail, limbal ring and pupil; the sclera is warmed slightly off pure white
const eyeMaps = {};
function eyeMap(K, color) {
  if (eyeMaps[color]) return eyeMaps[color];
  const t = K.tex['eyes:diffuse'], img = t.image, w = img.width, h = img.height; const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0); const id = g.getImageData(0, 0, w, h), d = id.data; const c = new THREE.Color(color); const ir = [c.r, c.g, c.b].map(x => Math.round(Math.pow(x, 1 / 2.2) * 255));
  const blue = (i) => { const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b); return mx ? (b - r) / mx : 0; };
  let sum = 0, n = 0; const cen = [[0, 0, 0], [0, 0, 0]];   // iris mean brightness, and the iris centre of each eyeball (the two sit either side of the diagonal)
  for (let i = 0; i < d.length; i += 4) if (blue(i) > 0.12) { sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++; const x = (i / 4) % w, y = Math.floor(i / 4 / w), e = cen[x * h > y * w ? 0 : 1]; e[0] += x; e[1] += y; e[2]++; }
  const mean = n ? sum / n : 120, C = cen.map(e => [e[0] / Math.max(1, e[2]), e[1] / Math.max(1, e[2])]), Rb = 0.27 * w;
  for (let i = 0; i < d.length; i += 4) { const bl = blue(i), lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2], wgt = clamp((bl - 0.02) / 0.1, 0, 1);
    if (wgt > 0) { const k = clamp(lum / mean, 0, 1.6); for (let j = 0; j < 3; j++) d[i + j] = lerp(d[i + j], clamp(ir[j] * k, 0, 255), wgt); }
    else { const x = (i / 4) % w, y = Math.floor(i / 4 / w), c = C[x * h > y * w ? 0 : 1], dist = Math.hypot(x - c[0], y - c[1]) / Rb;
      const shade = 0.88 * (1 - 0.4 * clamp((dist - 0.4) / 0.6, 0, 1));   // the sclera is never paper-white, and darker towards the lids
      d[i] *= shade; d[i + 1] *= shade * 0.97; d[i + 2] *= shade * 0.93; } }
  g.putImageData(id, 0, 0); const o = new THREE.CanvasTexture(cv); o.colorSpace = THREE.SRGBColorSpace; o.anisotropy = 8; o.flipY = t.flipY; return (eyeMaps[color] = o);
}
// (shader variant kept for reference) MakeHuman's iris is blue; re-tint the saturated (iris) texels, keep the sclera
function irisTint(m, color) {
  const c = new THREE.Color(color);
  m.onBeforeCompile = (sh) => { sh.uniforms.iris = { value: c };
    sh.fragmentShader = 'uniform vec3 iris;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      `#include <map_fragment>
       float mx = max( diffuseColor.r, max( diffuseColor.g, diffuseColor.b ) ), mn = min( diffuseColor.r, min( diffuseColor.g, diffuseColor.b ) );
       float blue = ( diffuseColor.b - diffuseColor.r ) / max( mx, 1e-3 ); float lum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
       diffuseColor.rgb = mix( diffuseColor.rgb, iris * clamp( lum / 0.075, 0.0, 1.8 ), smoothstep( -0.03, 0.05, blue ) );`); };
  m.customProgramCacheKey = () => 'iris';
  return m;
}
// plain woven fabric (replaces printed textures such as the logo tee): fine weave + soft mottling, tinted by material colour
let _weave = null;
export function weave() {
  if (_weave) return _weave;
  _weave = canvasTex(512, 512, (g, w, h) => { const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 0.86 + 0.06 * Math.sin(x * 1.9) * Math.sin(y * 1.9) + 0.07 * (noise2(x / 40, y / 40) - 0.5) + 0.04 * (noise2(x / 6, y / 6) - 0.5); const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v * 255)); d[i + 3] = 255; }
    g.putImageData(img, 0, 0); });
  _weave.wrapS = _weave.wrapT = THREE.RepeatWrapping; _weave.repeat.set(3, 3);
  return _weave;
}

// ------------------------------------------------------------------ the human
export function buildHuman(cfg) {
  const K = KIT; if (!K) throw new Error('call loadKit() first');
  const N = K.N, P = Float32Array.from(K.pos);
  // 1) shape: MakeHuman's macro system (ethnicity x sex x age, then muscle/weight, height, proportions)
  const eth = Object.assign({ african: 0, asian: 0, caucasian: 0 }, cfg.eth || { caucasian: 1 }); const es = eth.african + eth.asian + eth.caucasian; for (const k in eth) eth[k] /= es;
  const sexW = { female: 1 - (cfg.sex ?? 0), male: cfg.sex ?? 0 }; const ageW = ageWeights(cfg.age ?? 30);
  const muW = tri(cfg.muscle ?? 0.5), weW = tri(cfg.weight ?? 0.5);
  for (const e of ['african', 'asian', 'caucasian']) for (const s of ['female', 'male']) for (const a of ['child', 'young', 'old']) addTarget(K, P, `macrodetails/${e}-${s}-${a}`, eth[e] * sexW[s] * ageW[a]);
  for (const s of ['female', 'male']) for (const a of ['child', 'young', 'old']) {
    const sa = sexW[s] * ageW[a]; if (!sa) continue;
    for (const mu of ['min', 'average', 'max']) for (const we of ['min', 'average', 'max']) addTarget(K, P, `macrodetails/universal-${s}-${a}-${mu}muscle-${we}weight`, sa * muW[mu] * weW[we]);
    const h = cfg.tall ?? 0.5; addTarget(K, P, `macrodetails/height/${s}-${a}-averagemuscle-averageweight-${h < 0.5 ? 'min' : 'max'}height`, sa * Math.abs(h - 0.5) * 2);
    const pr = cfg.proportions ?? 0.5; addTarget(K, P, `macrodetails/proportions/${s}-${a}-averagemuscle-averageweight-${pr < 0.5 ? 'uncommon' : 'ideal'}proportions`, sa * Math.abs(pr - 0.5) * 2);
  }
  // 2) stand on y = 0 and scale to the cast height
  let lo = 1e9, hi = -1e9; for (let i = 0; i < K.bmap.length; i++) { const y = P[K.bmap[i] * 3 + 1]; lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const S = (cfg.height || (hi - lo)) / (hi - lo);
  for (let i = 0; i < N; i++) { P[i * 3] *= S; P[i * 3 + 1] = (P[i * 3 + 1] - lo) * S; P[i * 3 + 2] *= S; }
  const offScale = (cfg.height || 1.7) / 1.6945;       // proxy offsets were authored on the 1.69 m base body
  // 3) expression units, blended across ethnicities like the shape, dense per base vertex (scaled with the body)
  const units = cfg.units || UNITS; const UD = units.map(u => { const D = new Float32Array(N * 3); for (const e of ['african', 'asian', 'caucasian']) addTarget(K, D, `expression/units/${e}/${u}`, eth[e], S); return D; });
  // 4) skeleton fitted to this body (MakeHuman joints = averages of joint-cube vertices)
  const group = new THREE.Group(); group.name = 'human';
  const rest = new Map(), bones = new Map(), list = [];
  for (const b of K.meta.bones) {
    const h = mean(P, b.head), t = mean(P, b.tail); const o = new THREE.Bone(); o.name = b.name;
    if (b.parent >= 0) { const pb = K.meta.bones[b.parent]; list[b.parent].add(o); o.position.copy(h).sub(rest.get(pb.name).h); } else { group.add(o); o.position.copy(h); }
    rest.set(b.name, { h, t }); bones.set(b.name, o); list.push(o);
  }
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list);
  // 5) body: skin removed under clothes
  const hide = new Uint8Array(N); for (const c of cfg.clothes || []) for (const v of K.proxies[c.key].delete) hide[v] = 1;
  const nb = K.bmap.length; const bp = new Float32Array(nb * 3), bi = new Uint16Array(nb * 4), bw = new Float32Array(nb * 4);
  for (let i = 0; i < nb; i++) { const o = K.bmap[i]; bp.set(P.subarray(o * 3, o * 3 + 3), i * 3); for (let k = 0; k < 4; k++) { bi[i * 4 + k] = K.swI[o * 4 + k]; bw[i * 4 + k] = K.swW[o * 4 + k]; } }
  const idx = []; for (let f = 0; f < K.bidx.length; f += 3) { const a = K.bidx[f], b = K.bidx[f + 1], c = K.bidx[f + 2]; if (hide[K.bmap[a]] && hide[K.bmap[b]] && hide[K.bmap[c]]) continue; idx.push(a, b, c); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(K.buv, 2));
  bg.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(bi, 4)); bg.setAttribute('skinWeight', new THREE.BufferAttribute(bw, 4)); bg.setIndex(idx); seamlessNormals(bg);
  bg.setAttribute('hairMask', new THREE.BufferAttribute(new Float32Array(nb), 1)); bg.setAttribute('cavity', new THREE.BufferAttribute(new Float32Array(nb), 1));
  bg.morphAttributes.position = UD.map(D => { const a = new Float32Array(nb * 3); for (let i = 0; i < nb; i++) a.set(D.subarray(K.bmap[i] * 3, K.bmap[i] * 3 + 3), i * 3); return new THREE.BufferAttribute(a, 3); });
  bg.morphTargetsRelative = true;
  const skinTex = K.tex['skin:' + (cfg.skin || 'young_caucasian_female')];
  const skinMat = skinPatch(new THREE.MeshPhysicalMaterial({ map: skinTex, color: cfg.skinTint || '#ffffff', roughness: 0.47, normalMap: normalTex('skin', 14), normalScale: new THREE.Vector2(0.2, 0.2),
    sheen: 0.25, sheenRoughness: 0.8, sheenColor: new THREE.Color(cfg.sheen || '#b9907a'), specularIntensity: 0.5, clearcoat: 0.08, clearcoatRoughness: 0.42 }));
  const meshes = [];
  const skinned = (g, m, name) => { const s = new THREE.SkinnedMesh(g, m); s.name = name; s.bind(skeleton, new THREE.Matrix4()); s.castShadow = true; s.receiveShadow = true; s.frustumCulled = false; group.add(s); meshes.push(s); return s; };
  const body = skinned(bg, skinMat, 'body');
  // 6) proxies fitted to this body: position, skin weights and expression morphs all follow the base-mesh refs
  const proxy = (key, mat, o = {}) => {
    const p = K.proxies[key]; const dv = new DataView(p.buf); const n = p.verts;
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); const refs = [];
    const acc = new Map();
    for (let i = 0; i < n; i++) {
      const b0 = i * REC; const r = [dv.getUint16(b0, true), dv.getUint16(b0 + 2, true), dv.getUint16(b0 + 4, true)], w = [dv.getFloat32(b0 + 6, true), dv.getFloat32(b0 + 10, true), dv.getFloat32(b0 + 14, true)];
      const off = [dv.getFloat32(b0 + 18, true), dv.getFloat32(b0 + 22, true), dv.getFloat32(b0 + 26, true)].map(x => x * offScale * (o.inflate || 1));
      for (let a = 0; a < 3; a++) pos[i * 3 + a] = w[0] * P[r[0] * 3 + a] + w[1] * P[r[1] * 3 + a] + w[2] * P[r[2] * 3 + a] + off[a];
      uv[i * 2] = dv.getFloat32(b0 + 30, true); uv[i * 2 + 1] = dv.getFloat32(b0 + 34, true); refs.push(r, w);
      acc.clear(); for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) { const bw2 = K.swW[r[k] * 4 + j] * w[k]; if (bw2 > 0) acc.set(K.swI[r[k] * 4 + j], (acc.get(K.swI[r[k] * 4 + j]) || 0) + bw2); }
      const top = [...acc.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4); const s = top.reduce((q, e) => q + e[1], 0) || 1;
      top.forEach(([bn, ww], j) => { si[i * 4 + j] = bn; sw[i * 4 + j] = ww / s; });
    }
    let ib = new Uint32Array(p.buf.slice(n * REC));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    if (Array.isArray(mat) && o.group) {   // split triangles between materials, e.g. cornea vs eyeball, shirt vs trousers
      const buckets = mat.map(() => []); const c = V(), cu = new THREE.Vector2();
      for (let f = 0; f < ib.length; f += 3) { c.set(0, 0, 0); cu.set(0, 0); for (let k = 0; k < 3; k++) { const j = ib[f + k]; c.x += pos[j * 3] / 3; c.y += pos[j * 3 + 1] / 3; c.z += pos[j * 3 + 2] / 3; cu.x += uv[j * 2] / 3; cu.y += uv[j * 2 + 1] / 3; }
        buckets[clamp(o.group(c, cu), 0, mat.length - 1)].push(ib[f], ib[f + 1], ib[f + 2]); }
      ib = new Uint32Array(buckets.flat()); let s0 = 0; buckets.forEach((b, i) => { if (b.length) g.addGroup(s0, b.length, i); s0 += b.length; });
    }
    g.setIndex(new THREE.BufferAttribute(ib, 1)); seamlessNormals(g);
    // recoloured fabrics: normalise by the mean brightness of the texels this part actually uses, so the colour asked for is the colour seen
    (Array.isArray(mat) ? mat : [mat]).forEach((mm, mi) => { if (!mm.userData.autoGain || !mm.map) return; const f = lumSampler(mm.map); let sum = 0, cnt = 0;
      for (const gr of (g.groups.length ? g.groups.filter(x => x.materialIndex === mi) : [{ start: 0, count: ib.length }])) for (let k = gr.start; k < gr.start + gr.count; k++) { const l = f(uv[ib[k] * 2], uv[ib[k] * 2 + 1]); if (l >= 0) { sum += l; cnt++; } }
      if (cnt) mm.userData.recolGain.value /= Math.max(sum / cnt, 0.02); });
    if (o.morph !== false) {
      g.morphAttributes.position = UD.map(D => { const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = refs[i * 2], w = refs[i * 2 + 1]; for (let c = 0; c < 3; c++) a[i * 3 + c] = w[0] * D[r[0] * 3 + c] + w[1] * D[r[1] * 3 + c] + w[2] * D[r[2] * 3 + c]; } return new THREE.BufferAttribute(a, 3); });
      g.morphTargetsRelative = true;
    }
    const m = skinned(g, mat, key); if (o.shadow === false) m.castShadow = false; if (o.order) m.renderOrder = o.order; return m;
  };
  const T = (k, s = 'diffuse') => K.tex[k + ':' + s] || null;
  // eyes: eyeball (re-tinted iris) under a clear cornea that only adds reflections, which is what makes eyes look wet
  proxy('eyes', [new THREE.MeshStandardMaterial({ map: eyeMap(K, cfg.iris || '#4a2c17'), roughness: 0.35 }),
    new THREE.MeshPhysicalMaterial({ color: '#000000', roughness: 0.04, specularIntensity: 0.8, envMapIntensity: 0.035, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })],
    { shadow: false, group: (c, uv) => (uv.x > 0.85 && uv.y < 0.15 ? 1 : 0) });
  const strand = (key, color, o = {}) => recolor(new THREE.MeshPhysicalMaterial({ map: T(key), alphaTest: o.alphaTest ?? 0.12, alphaToCoverage: true, side: THREE.DoubleSide, roughness: o.roughness ?? 0.72,
    sheen: o.sheen ?? 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color(color || '#553322').offsetHSL(0, -0.1, 0.12), specularIntensity: o.spec ?? 0.35, color: '#ffffff',
    normalMap: o.strands ? normalTex('knit', 6) : null, normalScale: new THREE.Vector2(0.5, 0.5) }), color, o.recolor ?? 1, o.gain ?? 2.4);
  proxy('eyelashes', strand('eyelashes', cfg.lashColor || '#120d0b', { alphaTest: 0.35, sheen: 0 }), { shadow: false });
  if (cfg.brows !== false) proxy(cfg.brows || 'brow_f', strand(cfg.brows || 'brow_f', cfg.browColor || cfg.hairColor || '#1c1410', { alphaTest: 0.08, sheen: 0.1, gain: 2.0 }), { shadow: false });
  // mouth: teeth and tongue are only ever seen in the mouth's shadow, so they are toned down, and a dark oral cavity
  // (an ellipsoid that stretches down with the jaw) stops the open mouth showing through the head
  const teeth = proxy('teeth', new THREE.MeshStandardMaterial({ map: T('teeth'), roughness: 0.42, color: '#e2d8c6', envMapIntensity: 0.55 }), { shadow: false });
  // (no tongue: MakeHuman's expression units push it forward through the teeth when the jaw opens, and the dark cavity reads better)
  { const tp = teeth.geometry.attributes.position; const bb = new THREE.Box3().setFromBufferAttribute(tp); const c = bb.getCenter(V()), sz = bb.getSize(V());
    const r = V(sz.x * 0.4, sz.y * 0.72, sz.z * 0.42); const cav = new THREE.SphereGeometry(1, 24, 16); const cp = cav.attributes.position;
    for (let i = 0; i < cp.count; i++) cp.setXYZ(i, c.x + cp.getX(i) * r.x, c.y + cp.getY(i) * r.y, c.z - sz.z * 0.08 + cp.getZ(i) * r.z);
    const ui = units.indexOf('mouth-open'), dLow = V(); let nLow = 0;
    if (ui >= 0) { const md = teeth.geometry.morphAttributes.position[ui]; for (let i = 0; i < tp.count; i++) if (tp.getY(i) < c.y) { dLow.x += md.getX(i); dLow.y += md.getY(i); dLow.z += md.getZ(i); nLow++; } dLow.multiplyScalar(1 / Math.max(1, nLow)); }
    cav.morphAttributes.position = units.map((u, k) => { const a = new Float32Array(cp.count * 3); if (k === ui) for (let i = 0; i < cp.count; i++) { const w = clamp((c.y + 0.1 * r.y - cp.getY(i)) / (1.1 * r.y), 0, 1); a[i * 3] = dLow.x * w; a[i * 3 + 1] = dLow.y * w * 1.15; a[i * 3 + 2] = dLow.z * w; } return new THREE.BufferAttribute(a, 3); });
    cav.morphTargetsRelative = true; const n = cp.count, hb = K.meta.bones.findIndex(b => b.name === 'head');
    cav.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(n * 4).map((_, i) => (i % 4 === 0 ? hb : 0)), 4)); cav.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(n * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
    const cm = skinned(cav, new THREE.MeshStandardMaterial({ color: '#1c0b09', roughness: 1, envMapIntensity: 0, side: THREE.BackSide }), 'mouth-cavity'); cm.castShadow = false;
    // the inside of the lips and cheeks faces the mouth and lives in its shadow: darken skin near the teeth whose normal points inwards
    const ca = bg.attributes.cavity, bn = bg.attributes.normal, d = V(), nn = V();
    for (let i = 0; i < nb; i++) { d.set(c.x - bp[i * 3], c.y - bp[i * 3 + 1], c.z - bp[i * 3 + 2]); const dist = d.length(); if (dist > 0.05) continue; d.multiplyScalar(1 / dist);
      nn.fromBufferAttribute(bn, i); const inward = clamp((nn.dot(d) + 0.05) / 0.28, 0, 1); ca.setX(i, inward * (1 - clamp((dist - 0.034) / 0.016, 0, 1))); }
  }
  if (cfg.hair) proxy(cfg.hair, strand(cfg.hair, cfg.hairColor, { recolor: cfg.hairRecolor ?? 1, gain: cfg.hairGain ?? 2.4 }), { inflate: cfg.hairInflate || 1 });
  // clothes: one material, or `top`/`bottom` parts split at the waist (MakeHuman suits are shirt + trousers in one mesh)
  const cloth = (c, part) => { const o = Object.assign({}, c, part || {});
    const m = new THREE.MeshPhysicalMaterial({ map: o.plain ? weave() : (o.map === false ? null : T(c.key)), normalMap: T(c.key, 'normal'), normalScale: new THREE.Vector2(o.ns ?? 0.8, o.ns ?? 0.8),
      color: o.plain ? (o.color || '#888888') : (o.tint || '#ffffff'), roughness: o.roughness ?? 0.82, sheen: o.sheen ?? 0.45, sheenRoughness: 0.7, sheenColor: new THREE.Color(o.color || '#888888').offsetHSL(0, 0, 0.15), side: THREE.DoubleSide });
    if (o.color && !o.plain) { recolor(m, o.color, o.recolor ?? 1, o.bright ?? 1); m.userData.autoGain = true; }
    return m; };
  const waist = lerp(rest.get('spine05').h.y, rest.get('spine04').h.y, 0.35);
  const clothes = [];   // fitted rest positions of each garment, so outer layers (wardrobe.js) can be fitted over them
  for (const c of cfg.clothes || []) {
    const m = (c.top || c.bottom) ? proxy(c.key, [cloth(c, c.top), cloth(c, c.bottom)], { morph: false, inflate: c.inflate, group: c.bottomUV ? (p, uv) => (uv.x >= c.bottomUV[0] && uv.y >= c.bottomUV[1] && uv.x <= c.bottomUV[2] && uv.y <= c.bottomUV[3] && p.y < waist + 0.04 ? 1 : 0) : (p) => (p.y > (c.waist ?? waist) ? 0 : 1) })
      : proxy(c.key, cloth(c), { morph: false, inflate: c.inflate });
    clothes.push({ key: c.key, pos: m.geometry.attributes.position.array, bone: m.geometry.attributes.skinIndex.array, idx: m.geometry.index.array });
  }
  if (cfg.glasses) proxy('glasses', new THREE.MeshPhysicalMaterial({ map: T('glasses'), alphaTest: 0.2, transparent: true, opacity: 0.95, roughness: 0.2, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false }), { morph: false, shadow: false, order: 2 });

  const unitIndex = Object.fromEntries(units.map((u, i) => [u, i]));
  const human = {
    K, group, bones, rest, skeleton, meshes, body, height: cfg.height, units, P, UD, clothes,
    bone: (n) => bones.get(n),
    // expression weights by unit name (0..1); unspecified units relax to 0
    setFace(w) { for (const m of meshes) { const inf = m.morphTargetInfluences; if (!inf) continue; inf.fill(0); for (const k in w) { const i = unitIndex[k]; if (i !== undefined) inf[i] = clamp(w[k], 0, 1.2); } } },
    joint: (n, end = 'h') => rest.get(n)[end].clone(),
  };
  return human;
}
