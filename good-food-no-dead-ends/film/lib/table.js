// GOOD FOOD. NO DEAD ENDS. — the shared evening meal (s08, s10): one seating plan, one place setting, for continuity.
import { THREE, V, R, seed, mesh, smooth, lerp, keyed } from './core.js';
import * as P from './props.js';
import { puppet, frameQ } from './people.js';
import { fork as makeFork, spoon as makeSpoon, forkGrip } from './cutlery.js';
import { mealSpread } from './sets.js';

// far side faces +z (towards the main camera), near side faces -z; the two ends face inward
export const SEATS = {
  MAYA: { x: -1.2, z: -0.74, yaw: 0 }, NOOR: { x: -0.4, z: -0.74, yaw: 0 }, ASHA: { x: 0.4, z: -0.74, yaw: 0 }, LUIS: { x: 1.2, z: -0.74, yaw: 0 },
  VENDOR: { x: -1.2, z: 0.74, yaw: Math.PI }, WORKER: { x: 1.2, z: 0.74, yaw: Math.PI },
  COLLEAGUE: { x: -2.0, z: 0.0, yaw: Math.PI / 2 }, COOK: { x: 2.0, z: 0.0, yaw: -Math.PI / 2 },
};
export function plateOf(name, top) { const s = SEATS[name]; const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw); return V(s.x + fx * 0.42, top + 0.02, s.z + fz * 0.42); }

export function setTable(app, K1, o = {}) {
  const top = K1.tableTop;
  // chairs: hide the two near-centre chairs (keeps sightlines to Noor & Asha), add the two end chairs
  for (const c of K1.chairs) if (c.position.z > 0 && Math.abs(c.position.x) < 0.5) c.visible = false;
  for (const sd of [-1, 1]) { const c = P.chair({ color: '#8a6440' }); c.position.set(sd * 2.0, 0, 0); c.rotation.y = sd < 0 ? Math.PI / 2 : -Math.PI / 2; app.scene.add(c); }
  const seats = Object.keys(SEATS).map(n => { const p = plateOf(n, top); return [p.x, p.z]; });
  const spread = mealSpread(app, top, { seats, seed: 11 });
  return { top, spread };
}

// cast everyone at their seats; returns map of puppets. `who` limits the cast.
export function seatCast(app, lines, who = Object.keys(SEATS), o = {}) {
  const cast = {};
  for (const n of who) {
    const s = SEATS[n]; const p = puppet(n, null, { off: o.off || ['apron'] }); p.place(s.x, s.z, s.yaw); app.cast(p); p.speak(lines || []);
    p.act([{ t: 0, pose: 'sit', p: { seat: 0.46, lean: 0.14 }, talk: 0.6 }]);
    cast[n] = p;
  }
  return cast;
}

// a fork held properly in the hand ('R' driver side), and where the palm has to be for its tines to reach a point
export function heldFork(app, p, side = 'R', kind = 'fork') {
  const F = kind === 'spoon' ? makeSpoon() : makeFork(); app.scene.add(F); const G = forkGrip(side); p.attach(side, F, { pos: G.pos, q: G.q });
  const tip = kind === 'spoon' ? V(0, -0.002, 0.06) : V(0, 0.016, 0.112), grip = V(...G.pos);
  const palmFor = (P, q) => P.clone().sub(grip.clone().add(tip.clone().applyQuaternion(G.q)).applyQuaternion(q));
  return { fork: F, tip, palmFor };
}
// periodic fork-to-mouth with per-person phase: the hand turns the tines down to the plate, then up to the lips
export function eating(app, p, top, o = {}) {
  const plate = plateOf(p.name, top); const rate = o.rate || 0.9, ph = o.phase || 0; const { fork, palmFor } = heldFork(app, p, 'R');
  const w = (t) => { if (o.from != null && t < o.from) return 0; if (o.until != null && t > o.until) return 0; const c = Math.sin(t * rate * Math.PI + ph); return smooth(Math.max(0, c) * 1.6); };
  const qPlate = () => frameQ(p.dirToWorld([-0.15, -0.6, 1]), p.dirToWorld([-0.5, -0.8, 0.1])), qMouth = () => frameQ(p.dirToWorld([-0.4, 0.3, -1]), p.dirToWorld([-0.5, -0.8, 0.2]));
  const q = (t) => qPlate().slerp(qMouth(), w(t));
  const point = (t) => plate.clone().add(V(0.06, 0.035, 0)).lerp(p.mouthWorld().add(p.offsetToWorld([0, -0.004, 0.03])), w(t));
  p.hand('R', [{ t: 0, at: (t) => palmFor(point(t), q(t)), aim: (t) => q(t), shape: 'fork', pole: [0.8, -0.6, -0.3] }]);
  p.hand('L', [{ t: 0, at: () => plate.clone().add(p.offsetToWorld([-0.18, 0.02, -0.05])), pole: [-0.8, -0.6, -0.3], shape: 'relaxed', aim: () => ({ fingers: p.dirToWorld([0.3, -0.2, 1]), palm: V(0, -1, 0) }) }]);
  if (o.chew !== false) p.face([{ t: 0, smile: o.smile ?? 0.35, chew: 0.0 }]);
  return { fork, w };
}

// laughing / chatting body language (pure functions of t)
export function chatter(p, o = {}) {
  const t0 = o.from ?? 0, t1 = o.until ?? 999, k = o.laugh ?? 0;
  p.act([{ t: 0, pose: 'sit', p: { seat: 0.46, lean: 0.14 }, talk: 0.8, mod: (t) => { const on = t > t0 && t < t1 ? 1 : 0; return { spX: 0.14 + on * k * (0.04 + Math.sin(t * 8.5 + (o.phase || 0)) * 0.035), spY: Math.sin(t * 0.7 + (o.phase || 0)) * 0.12, nkX: -on * k * 0.12 }; } }]);
  p.face([{ t: 0, smile: o.smile ?? 0.4, brow: 0.2 }, { t: t0, smile: k ? 0.95 : 0.5, jaw: k ? 0.35 : 0, brow: 0.35, squint: k ? 0.5 : 0.1, blend: 0.3 }, { t: t1, smile: 0.5, jaw: 0, squint: 0.1, blend: 0.4 }]);
}
