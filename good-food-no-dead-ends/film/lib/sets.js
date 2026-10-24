// GOOD FOOD. NO DEAD ENDS. — shared locations. The same builder runs in every shot that visits a place,
// so geography, props and light direction stay continuous across cuts.
import { THREE, V, R, rnd, seed, pick, mat, clayMat, MAT, grain, normalTex, mesh, box, cyl, at, rot, instanced, groundPlane, sunLight, fillLights, skyDome, clouds, motes, steam, noise2, fbm, smooth, clamp, M4, merged, vmat, prng } from './core.js';
import * as P from './props.js';
import * as F from './foliage.js';
const TAU = Math.PI * 2;

// ================================================================== COMMUNITY KITCHEN (s01, s08, s09a, s10)
// Room: x ∈ [-4.5, 4.5], z ∈ [-3.2, 3.6], ceiling 3.1. Back wall (z=-3.2) has two tall windows. Long table at the origin.
export async function kitchen(app, o = {}) {
  seed(7);
  const evening = o.time === 'evening';
  const S = app.scene; const g = new THREE.Group(); S.add(g);
  groundPlane(app, { kind: 'planks', color: '#a07a52', size: 16 });
  const wallM = MAT.plaster(evening ? '#e2cba8' : '#ecd5ae', 3);
  const H = 3.1, zb = -3.2;
  // back wall with two window openings (sill 0.95, top 2.45)
  const wins = [[-1.9, 1.7], [1.5, 1.7]]; const sill = 0.95, top = 2.45;
  const piece = (x0, x1, y0, y1) => { const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return; g.add(at(box(w, h, 0.22, wallM, { cast: true }), (x0 + x1) / 2, (y0 + y1) / 2, zb)); };
  let x = -4.6; for (const [cx, w] of wins) { piece(x, cx - w / 2, 0, H); piece(cx - w / 2, cx + w / 2, 0, sill); piece(cx - w / 2, cx + w / 2, top, H); x = cx + w / 2; } piece(x, 4.6, 0, H);
  for (const [cx, w] of wins) { const f = P.windowFrame({ w, h: top - sill }); f.position.set(cx, (sill + top) / 2, zb + 0.02); g.add(f); const plant = F.shrub({ size: 0.22, seed: Math.round(cx * 10) + 9 }); plant.position.set(cx - 0.5, sill + 0.02, zb + 0.12); g.add(plant); g.add(at(cyl(0.09, 0.07, 0.14, clayMat('#b5643a', { normal: 'clay', ns: 0.2 }), 14), cx - 0.5, sill + 0.07, zb + 0.12)); }
  // side walls + ceiling
  g.add(at(box(0.22, H, 7.0, wallM), -4.5, H / 2, 0.3)); g.add(at(box(0.22, H, 7.0, wallM), 4.5, H / 2, 0.3));
  const ceil = box(9.2, 0.15, 7.0, mat('#efe6d6', { roughness: 0.95 }), { cast: false }); ceil.position.set(0, H + 0.07, 0.3); g.add(ceil);
  for (let i = -3; i <= 3; i++) g.add(at(box(0.16, 0.2, 7.0, MAT.wood('#7a5a3a', 2)), i * 1.3, H - 0.08, 0.3));
  // view outside: afternoon garden / dusk street
  P.backdrop(app, evening ? 'dusk' : 'garden', { pos: [0, 2.2, -14], w: 40, h: 18, brightness: evening ? 0.8 : 1.9, top: '#a9c6e6', horizon: '#fbe3c0', tree: '#7a9a55', ground: '#8aa060', trees: false });
  // the garden outside: a lawn, shrubs under the windows and trees behind (real geometry, so it has depth and parallax)
  { const lawn = mesh(new THREE.PlaneGeometry(40, 11), mat(evening ? '#2c3a2a' : '#6f8c47', { map: grain('leafy', { repeat: 40, scale: 6 }), roughness: 0.95 }), { cast: false }); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, -0.01, -8.8); g.add(lawn);
    const tint = evening ? '#6a7a8a' : '#ffffff';
    for (const [x, z, h, sd] of [[-6.5, -9.5, 7.5, 1], [-2.2, -11.5, 8.5, 2], [2.6, -9.0, 6.5, 3], [6.8, -10.5, 8, 4], [-9.5, -12, 7, 5]]) { const t = F.tree({ height: h, seed: sd, leafTint: tint }); t.position.set(x, 0, z); g.add(t); }
    for (const [x, z, s, sd] of [[-3.4, -4.4, 0.6, 11], [-0.4, -4.9, 0.8, 12], [2.3, -4.3, 0.55, 13], [3.9, -5.0, 0.75, 14], [-5.6, -5.2, 0.9, 15]]) { const b = F.shrub({ size: s, seed: sd, tint }); b.position.set(x, 0, z); g.add(b); } }
  // counter run along the right wall with stove, tiles and shelves
  const ctr = new THREE.Group(); ctr.position.set(4.12, 0, -0.4); ctr.rotation.y = -Math.PI / 2; g.add(ctr);
  ctr.add(at(box(4.2, 0.88, 0.62, MAT.wood('#6f5a44', 2)), 0, 0.44, 0));
  ctr.add(at(box(4.25, 0.05, 0.66, mat('#cfc9bd', { roughness: 0.35, map: grain('plaster', { repeat: 3 }) })), 0, 0.905, 0));
  const tiles = mesh(new THREE.PlaneGeometry(4.2, 0.75), mat('#e9e4d8', { roughness: 0.3, normalMap: normalTex('tiles', 6), normalScale: new THREE.Vector2(0.7, 0.7) }), { cast: false }); tiles.position.set(0, 1.31, -0.3); ctr.add(tiles);
  const stove = box(0.8, 0.04, 0.55, mat('#222326', { roughness: 0.3, metalness: 0.5 })); stove.position.set(0.9, 0.95, 0); ctr.add(stove);
  const pot1 = P.ware.pot(0.21, 0.24); pot1.position.set(0.75, 0.97, -0.02); ctr.add(pot1); const pot2 = P.ware.pot(0.15, 0.14); pot2.position.set(1.15, 0.97, 0.05); ctr.add(pot2);
  const stew = P.stewSurface(0.2); stew.position.set(0.75, 0.97 + 0.2, -0.02); ctr.add(stew);
  const shelf = P.jarShelf({ l: 3.6, levels: 2 }); shelf.position.set(0.1, 1.85, -0.18); ctr.add(shelf);
  for (let i = 0; i < 4; i++) { const b = P.ware.board(0.34, 0.24); b.position.set(-1.2 + i * 0.05, 0.95, 0.05); if (i) continue; ctr.add(b); }
  const herbs = F.shrub({ size: 0.17, kind: 'herb', seed: 5, cardScale: 0.5 }); herbs.position.set(-1.7, 0.93, -0.15); ctr.add(herbs);
  // left wall: open shelving with bowls, crates of produce on the floor
  const lsh = P.jarShelf({ l: 2.6, levels: 3 }); lsh.position.set(-4.3, 1.0, -1.2); lsh.rotation.y = Math.PI / 2; g.add(lsh);
  for (let i = 0; i < 3; i++) { const c = P.crate({ fill: ['tomato', 'greens', 'onion'][i], color: ['#2f8a57', '#2f6aa0', '#2f8a57'][i] }); c.position.set(-3.9, 0.0 + (i === 2 ? 0.3 : 0), 0.6 + (i % 2) * 0.45); c.rotation.y = Math.PI / 2 + R(-0.1, 0.1); g.add(c); }
  // the long table + seating
  const tbl = P.table({ l: 3.4, w: 1.05 }); g.add(tbl); const tableTop = tbl.userData.top;
  const chairs = [];
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const c = P.chair({ color: pick(['#9a7048', '#7e5a3a', '#a9805a']) }); c.position.set(-1.2 + i * 0.8, 0, sd * 0.78); c.rotation.y = sd > 0 ? Math.PI : 0; g.add(c); chairs.push(c); }
  // lights
  const lamps = [P.pendantLamp(app, { pos: [-0.8, 2.15, 0], intensity: evening ? 4.5 : 1.2, range: 6, shadow: evening }), P.pendantLamp(app, { pos: [0.8, 2.15, 0], intensity: evening ? 4.5 : 1.2, range: 6 })];
  if (!evening) {
    sunLight(app, { dir: V(0.5, 0.27, -1), color: '#ffc88e', intensity: 6.5, size: 7, target: V(0, 0.8, -0.5), softness: 5 });
    fillLights(app, { sky: '#d6e4f4', ground: '#a07a52', hemi: 0.55 });
    const bounce = new THREE.PointLight('#ffe7c6', 2.2, 9, 1.5); bounce.position.set(0.5, 1.4, 2.6); S.add(bounce);
  } else {
    fillLights(app, { sky: '#7a8ab8', ground: '#7a5a3a', hemi: 0.35 });
    const winFill = new THREE.DirectionalLight('#8fa6d8', 0.6); winFill.position.set(0, 2, -9); S.add(winFill);
    const warm = new THREE.PointLight('#ffc98a', 2.5, 8, 1.6); warm.position.set(2.5, 2.2, 1.5); S.add(warm);
    const stoveL = new THREE.PointLight('#ffb070', 1.5, 3, 2); stoveL.position.set(3.6, 1.6, -1.3); S.add(stoveL);
  }
  steam(app, { at: V(4.12, 1.25, -1.15), count: 12, height: 0.8, size: 0.22, opacity: 0.18, spread: 0.12 });
  motes(app, { count: 120, center: V(-0.5, 1.6, -1.5), size: V(4, 2, 3), pointSize: 0.012, opacity: evening ? 0.15 : 0.45, drift: 0.1 });
  return { group: g, tableTop, chairs, lamps, counter: ctr, stew, pot: pot1 };
}

// table dressing used by the shared-meal shots (s08, s10): plates, stew, bread, salad, rice, cups
export function mealSpread(app, top, o = {}) {
  seed(o.seed || 11); const g = new THREE.Group(); app.scene.add(g);
  const seats = o.seats || [];
  for (const [sx, sz] of seats) { const pl = P.ware.plate(0.13); pl.position.set(sx, top, sz); g.add(pl); const portion = P.stewSurface(0.075, { count: 8 }); portion.position.set(sx, top + 0.018, sz); g.add(portion); const f = P.ware.fork(); f.position.set(sx + 0.17, top + 0.004, sz); g.add(f); const c = P.ware.glass(); c.position.set(sx + 0.15, top, sz - Math.sign(sz) * 0.18); g.add(c); }
  const bigPot = P.ware.pot(0.17, 0.16); bigPot.position.set(0.95, top, 0.05); g.add(bigPot); const st = P.stewSurface(0.165); st.position.set(0.95, top + 0.155, 0.05); g.add(st);
  steam(app, { at: V(0.95, top + 0.2, 0.05), count: 8, height: 0.45, size: 0.12, opacity: 0.08, spread: 0.08 });
  const breadP = P.ware.plate(0.16, '#d8cab0'); breadP.position.set(-0.75, top, 0.1); g.add(breadP); const bg = P.produceGeo('bread'); for (let i = 0; i < 4; i++) { const b = mesh(bg, P.produceMat({ roughness: 0.7, clearcoat: 0 })); b.position.set(-0.75 + R(-0.02, 0.02), top + 0.02 + i * 0.012, 0.1 + R(-0.02, 0.02)); b.rotation.y = rnd(); g.add(b); }
  const salad = P.ware.bowl(0.15, '#5a7a8a'); salad.position.set(0.05, top, 0.05); g.add(salad);
  const lg = P.lettuceGeo(1); const lm = P.leafMat('lettuce'); for (let i = 0; i < 5; i++) { const l = mesh(lg, lm); l.scale.setScalar(0.55); l.position.set(0.05 + R(-0.05, 0.05), top + 0.05, 0.05 + R(-0.05, 0.05)); l.rotation.y = rnd() * 6; g.add(l); }
  const tg = P.tomatoGeo({ r: 0.022, seg: 14 }); const tm = P.tomatoMat(); for (let i = 0; i < 6; i++) { const t = mesh(tg, tm); t.position.set(0.05 + R(-0.07, 0.07), top + 0.075, 0.05 + R(-0.07, 0.07)); g.add(t); }
  const rice = P.ware.bowl(0.12, '#c9b48a'); rice.position.set(-0.3, top, 0.22); g.add(rice); const rs = mesh(new THREE.SphereGeometry(0.1, 20, 10, 0, TAU, 0, Math.PI / 2), mat('#f3efe4', { roughness: 0.8, normalMap: normalTex('rock', 3), normalScale: new THREE.Vector2(0.4, 0.4) })); rs.scale.set(1, 0.45, 1); rs.position.set(-0.3, top + 0.045, 0.22); g.add(rs);
  const jug = P.ware.cup(0.06, '#2f6aa0'); jug.position.set(0.45, top, -0.3); g.add(jug);
  return g;
}

// ================================================================== DIVERSIFIED FARM (s02, s03, s09c)
// Raised beds run along -z (north). Tomatoes in the centre beds, greens east, beans west, hedgerows + flower strip on both edges.
export async function farm(app, o = {}) {
  seed(3);
  const S = app.scene;
  const sunDir = o.sunDir || V(0.75, 0.2, 0.62);
  skyDome(app, { top: o.top || '#5e86b8', mid: o.mid || '#a9bdd2', horizon: o.horizon || '#f0b27a', ground: '#7a6a50', sunColor: o.sunColor || '#ffb070', sunDir, glow: o.glow ?? 1.0, fogColor: o.fog || '#e7c49f', fogNear: o.fogNear ?? 30, fogFar: o.fogFar ?? 230, sunIntensity: o.sunDisc ?? 5, sunSize: o.sunSize ?? 0.99965, env: o.env ?? true });
  const sunAz = Math.atan2(sunDir.x, -sunDir.z);
  await clouds(app, { count: 14, yaw: o.cloudYaw ?? (sunAz + Math.PI), spread: 2.0, opacity: 0.6, color: o.cloudColor || '#ffe2c4', minY: 20, maxY: 70, avoid: sunAz });
  if (o.stormBank) await clouds(app, { count: 7, yaw: o.stormYaw ?? -0.9, spread: 0.35, opacity: 0.95, color: '#6f6a78', minY: 8, maxY: 22, scale: 1.4 });
  const sun = sunLight(app, { dir: sunDir, color: o.sunColor || '#ffc890', intensity: o.sunI ?? 3.4, size: o.shadowSize || 14, target: o.focus || V(0, 0, -3), softness: 3 });
  fillLights(app, { sky: o.hemiSky || '#a8c0de', ground: '#6a5236', hemi: o.hemi ?? 0.55 });
  // soil with raised beds (displaced plane)
  const W = 60, L = 120; const bedPitch = 1.5;
  const gg = new THREE.PlaneGeometry(W, L, 240, 240); const p = gg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const ph = ((x + 0.75) / bedPitch) % 1; const bed = Math.abs(x) < 14 ? Math.pow(Math.max(0, Math.cos((ph < 0 ? ph + 1 : ph) * TAU) ), 0.6) * 0.12 : 0; const n = (fbm(x * 0.3, y * 0.3, 3) - 0.5) * 0.12 + (noise2(x * 4, y * 4) - 0.5) * 0.02; p.setZ(i, bed + n); }
  gg.rotateX(-Math.PI / 2); gg.computeVertexNormals();
  const soilM = mat('#6b4c32', { map: grain('soil', { repeat: 20, scale: 8 }), roughness: 0.97, normalMap: normalTex('soil', 20), normalScale: new THREE.Vector2(0.9, 0.9) });
  const soil = mesh(gg, soilM, { cast: false }); soil.position.z = -L / 2 + 12; S.add(soil);
  // grass verges beyond the beds
  const grassM = mat('#6f8a3e', { map: grain('leafy', { repeat: 60, scale: 6 }), roughness: 0.95 });
  for (const sx of [-1, 1]) { const gv = mesh(new THREE.PlaneGeometry(200, 300), grassM, { cast: false }); gv.rotation.x = -Math.PI / 2; gv.position.set(sx * (14.5 + 100), 0.01, -100); S.add(gv); }
  // ground to the horizon in every direction (the opening of s02 looks south, past the end of the beds)
  const farGround = mesh(new THREE.PlaneGeometry(1600, 1600), mat('#7d8a48', { roughness: 1, map: grain('leafy', { repeat: 400, scale: 6 }) }), { cast: false }); farGround.rotation.x = -Math.PI / 2; farGround.position.set(0, -0.03, -100); S.add(farGround);
  const southGrass = mesh(new THREE.PlaneGeometry(29, 60), grassM, { cast: false }); southGrass.rotation.x = -Math.PI / 2; southGrass.position.set(0, -0.005, 42); S.add(southGrass);
  // crops (instanced; detailed near camera, simpler far away)
  const tp = [0, 1, 2].map(v => P.tomatoPlantGeos(v, { height: 0.95, leaves: 14, fruit: 5 })); const tpFar = P.tomatoPlantGeos(9, { height: 0.95, leaves: 7, fruit: 3 });
  const leafM = P.leafMat('tomato'), solidM = vmat({ roughness: 0.8 }), fruitM = P.tomatoMat();
  const lists = [[], [], []], far = [];
  const near = o.near || V(0, 0, 0);
  for (let b = -2; b <= 2; b++) for (let z = 4; z > -70; z -= 0.55) { if (o.clear && o.clear(b * bedPitch, z)) continue; const item = { x: b * bedPitch + R(-0.06, 0.06), y: 0.1, z: z + R(-0.08, 0.08), ry: R(0, TAU), s: R(0.85, 1.12) }; const d = Math.hypot(item.x - near.x, item.z - near.z); (d < 16 ? lists[Math.floor(rnd() * 3)] : far).push(item); }
  lists.forEach((l, i) => { if (!l.length) return; instanced(S, tp[i].leaves, leafM, l); instanced(S, tp[i].solid, solidM, l); instanced(S, tp[i].fruit, fruitM, l); });
  instanced(S, tpFar.leaves, leafM, far); instanced(S, tpFar.solid, solidM, far); instanced(S, tpFar.fruit, fruitM, far);
  // leafy greens (east beds) and climbing beans (west beds)
  const lettuce = [0, 1].map(v => P.lettuceGeo(v)); const lm = P.leafMat('lettuce'), lmr = P.leafMat('lettuceRed');
  const ll = [[], []]; for (let b = 3; b <= 8; b++) for (let z = 4; z > -60; z -= 0.35) for (const dx of [-0.25, 0.25]) ll[(b + Math.round(z * 3)) % 2 ? 0 : 1].push({ x: b * bedPitch + dx + R(-0.04, 0.04), y: 0.11, z: z + R(-0.05, 0.05), ry: R(0, TAU), s: R(1.3, 1.7) });
  instanced(S, lettuce[0], lm, ll[0]); instanced(S, lettuce[1], lmr, ll[1]);
  const beanGeo = P.tomatoPlantGeos(5, { height: 1.5, leaves: 30, fruit: 0 }); const bm = P.leafMat('broad');
  const bl = []; for (let b = -8; b <= -3; b++) for (let z = 4; z > -60; z -= 0.5) { const it = { x: b * bedPitch + R(-0.05, 0.05), y: 0.1, z: z + R(-0.06, 0.06), ry: R(0, TAU), s: R(0.9, 1.15) }; if (o.clear && o.clear(b * bedPitch, z)) continue; bl.push(it); }   // random draws happen before the skip, so clearing never reshuffles the rest of the farm
  instanced(S, beanGeo.leaves, bm, bl); instanced(S, beanGeo.solid, solidM, bl);
  // hedgerows, pollinator strip, trees
  const hedge = F.shrubGeo({ size: 1.6, seed: 4, cards: 220, cardScale: 0.32 }); const hm = F.foliageMat('shrub');
  const hl = []; for (let z = 8; z > -110; z -= 1.6) { hl.push({ x: -15.5 + R(-0.5, 0.5), z, ry: R(0, TAU), s: R(0.9, 1.4) }); hl.push({ x: 15.5 + R(-0.5, 0.5), z, ry: R(0, TAU), s: R(0.9, 1.4) }); }
  instanced(S, hedge, hm, hl);
  const flowers = P.flowerCardsGeo(); const fm = P.leafMat('flower'); const grass = P.grassGeo(); const gm = P.leafMat('blade');
  const fl = [], gl = []; for (let z = 6; z > -80; z -= 0.35) for (const sx of [-1, 1]) { fl.push({ x: sx * (13.4 + R(-0.6, 0.6)), z: z + R(-0.15, 0.15), ry: R(0, TAU), s: R(0.8, 1.3) }); gl.push({ x: sx * (13.6 + R(-0.9, 0.9)), z: z + R(-0.2, 0.2), ry: R(0, TAU), s: R(0.8, 1.4) }); }
  instanced(S, flowers, fm, fl, { cast: false }); instanced(S, grass, gm, gl, { cast: false });
  const TG = F.treeGeos({ height: 8, seed: 3 }); const tl = []; for (let i = 0; i < 40; i++) tl.push({ x: R(-140, 140), z: R(-230, -110), ry: R(0, TAU), s: R(0.7, 1.6) }); for (let i = 0; i < 12; i++) tl.push({ x: R(-60, -22), z: R(-90, -5), ry: R(0, TAU), s: R(0.8, 1.3) }); for (let i = 0; i < 8; i++) tl.push({ x: R(24, 70), z: R(-90, 0), ry: R(0, TAU), s: R(0.8, 1.3) });
  for (let i = 0; i < 30; i++) tl.push({ x: R(-220, 220), z: R(140, 280), ry: R(0, TAU), s: R(0.8, 1.5) });   // distant tree lines to the south
  // a distant crown is a dense mass: little sunlight gets through it, so far trees stand dark against a low sun
  // instead of glowing like the backlit leaves of a near one
  // and far away, trees stand in copses and along hedge lines rather than one by one (lollipops on the skyline): the far
  // ones are regrouped round a few centres (from their own stream, so the rest of the layout is unchanged)
  { const rr = prng(3141), far = tl.filter(p => Math.hypot(p.x, p.z) >= 100); let k = 0;
    while (k < far.length) { const n = Math.min(far.length - k, 4 + Math.floor(rr() * 4)), c = far[k], sp = 5 + rr() * 9, ax = rr() * TAU;
      for (let i = 0; i < n; i++, k++) { const u = (rr() - 0.5) * 2; far[k].x = c.x + Math.cos(ax) * u * sp * 1.6 + (rr() - 0.5) * sp * 0.5; far[k].z = c.z + Math.sin(ax) * u * sp * 1.6 + (rr() - 0.5) * sp * 0.5; far[k].s = 0.9 + rr() * 0.8; } } }
  const nearTrees = tl.filter(p => Math.hypot(p.x, p.z) < 100), farTrees = tl.filter(p => Math.hypot(p.x, p.z) >= 100), bark = vmat({ roughness: 0.92, normalMap: normalTex('rock', 3), normalScale: new THREE.Vector2(0.8, 0.8) });
  instanced(S, TG.trunk, bark, tl); instanced(S, TG.crown, F.foliageMat('cluster'), nearTrees); instanced(S, TG.crown, F.foliageMat('cluster', { translucency: 0.12, color: '#a8a8a8' }), farTrees);
  // drip lines along each tomato bed
  for (let b = -2; b <= 2; b++) { const dl = cyl(0.008, 0.008, 72, MAT.rubber(), 6); dl.rotation.x = Math.PI / 2; dl.position.set(b * bedPitch + 0.14, 0.13, -32); S.add(dl); }
  // barn with solar roof + small weather mast in the distance
  const barn = new THREE.Group(); barn.add(at(box(14, 5, 9, mat('#9a4a36', { roughness: 0.8, map: grain('wood', { repeat: 4 }) })), 0, 2.5, 0));
  const roof = mesh(new THREE.BoxGeometry(15, 0.3, 5.5), mat('#1d2b40', { roughness: 0.2, metalness: 0.6 })); roof.position.set(0, 6.0, -2.2); roof.rotation.x = 0.45; barn.add(roof); const roof2 = mesh(new THREE.BoxGeometry(15, 0.3, 5.5), mat('#5a5a5a', { roughness: 0.6 })); roof2.position.set(0, 6.0, 2.2); roof2.rotation.x = -0.45; barn.add(roof2);
  barn.position.set(-34, 0, -78); barn.rotation.y = 0.4; S.add(barn);
  const mast = new THREE.Group(); mast.add(at(cyl(0.04, 0.05, 3.2, MAT.brushed(), 8), 0, 1.6, 0)); const cups = new THREE.Group(); for (let i = 0; i < 3; i++) { const arm = at(box(0.3, 0.01, 0.01, MAT.brushed()), 0.15, 0, 0); const cg = new THREE.Group(); cg.rotation.y = i / 3 * TAU; cg.add(arm); cg.add(at(mesh(new THREE.SphereGeometry(0.045, 10, 6, 0, TAU, 0, Math.PI / 2), MAT.plastic('#f2f2f2')), 0.3, 0, 0)); cups.add(cg); } cups.position.y = 3.25; mast.add(cups); mast.add(at(box(0.4, 0.25, 0.02, mat('#20262e', { roughness: 0.35, metalness: 0.2 })), 0, 2.4, 0.1)); mast.position.set(o.mastPos?.[0] ?? 6.2, 0, o.mastPos?.[1] ?? -9); S.add(mast);
  app.on(t => { cups.rotation.y = t * 2.4; });
  motes(app, { count: 240, center: V(0.5, 1.2, -6), size: V(16, 2.4, 16), pointSize: 0.03, opacity: 0.32, drift: 0.25, color: '#ffe9c8' });
  return { sun, soil, mast, bedPitch, sunDir };
}
// soil-moisture stake with a small solar cell and status LED (a real, boring sensor)
export function sensorStake(app, x, z) {
  const g = new THREE.Group(); g.add(at(cyl(0.014, 0.014, 0.75, MAT.plastic('#d8d4c8'), 8), 0, 0.37, 0));
  g.add(at(box(0.09, 0.08, 0.055, MAT.plastic('#ece9e1'), { r: 0.01 }), 0, 0.76, 0));
  const led = mesh(new THREE.SphereGeometry(0.007, 8, 6), new THREE.MeshBasicMaterial({ color: '#3cd37a' })); led.position.set(0.03, 0.77, 0.029); g.add(led);
  const solar = box(0.1, 0.006, 0.075, mat('#1b2a44', { roughness: 0.15, metalness: 0.6 })); solar.position.set(0, 0.81, 0); solar.rotation.x = -0.35; g.add(solar);
  g.position.set(x, 0.1, z); app.scene.add(g); app.on(t => { led.material.color.setHex(Math.floor(t * 1.5) % 2 ? 0x3cd37a : 0x1f8a4c); }); return g;
}
