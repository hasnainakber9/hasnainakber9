#!/usr/bin/env python3
"""Build the compact MakeHuman asset set the film's realistic cast is made from (film/assets/mh/).

  python3 -I tools/mh_prepare.py <makehuman-data npm package dir> <download cache dir>

Sources
  * Base mesh, shape and expression targets, skeleton and skin weights: the official MakeHuman repository on GitHub
    (github.com/makehumancommunity/makehuman, data/), released as CC0 in September 2020. Each file keeps that notice.
  * Eyes, eyebrows, eyelashes, teeth, hair, clothes and skin textures: the `makehuman-data` npm package (0.0.2), a
    2016 three.js conversion of MakeHuman's assets. Only assets made by the MakeHuman team (relicensed CC0 in 2020)
    or released CC BY / CC0 by their authors are used; each one's author and licence is written to assets/mh/LICENSES.md.

Output (all little-endian; positions in metres, MakeHuman's decimetre units x 0.1)
  base.json      manifest: counts, bones (name, parent, head/tail joint vertex lists), targets index, proxies, skins
  base_pos.f32   rest positions of all 19158 base vertices (body, helpers and joint cubes)
  body_*.bin     render mesh of the 'body' group, split at UV seams: map.u16 (render -> base vertex), uv.f32, idx.u32
  skin_w.bin     4 bone indices (u8) + 4 weights (f32) per base vertex
  targets.bin    sparse targets: u16 vertex index + 3 x i16 delta (units of 0.1 mm), concatenated
  proxies/*.bin  per proxy render vertex: 3 x u16 base refs, 3 x f32 weights, 3 x f32 offsets, 2 x f32 uv; then u32 indices
"""
import json, os, sys, struct, shutil, urllib.request, re
import numpy as np

PKG, CACHE = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'mh')
GH = 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/'
os.makedirs(OUT, exist_ok=True); os.makedirs(os.path.join(OUT, 'proxies'), exist_ok=True); os.makedirs(CACHE, exist_ok=True)
DM = 0.1   # MakeHuman decimetres -> metres

def fetch(rel):
    p = os.path.join(CACHE, rel.replace('/', '__'))
    if not os.path.exists(p):
        with urllib.request.urlopen(GH + rel, timeout=60) as r: data = r.read()
        open(p, 'wb').write(data)
    return open(p, encoding='utf-8').read()

# ------------------------------------------------------------------ base mesh
obj = fetch('3dobjs/base.obj')
V, VT, faces, scalp, skirt, group = [], [], [], [], [], None
for line in obj.splitlines():
    if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('vt '): VT.append([float(x) for x in line.split()[1:3]])
    elif line.startswith('g '): group = line.split()[1]
    elif line.startswith('f ') and group == 'body':
        faces.append([tuple(int(a) - 1 for a in c.split('/')[:2]) for c in line.split()[1:]])
    elif line.startswith('f ') and group == 'helper-hair':
        f = [int(c.split('/')[0]) - 1 for c in line.split()[1:]]; scalp += [x for i in range(1, len(f) - 1) for x in (f[0], f[i], f[i + 1])]
    elif line.startswith('f ') and group == 'helper-skirt':   # skirt-shaped helper surface (waist to knees) for coat skirts and aprons
        f = [int(c.split('/')[0]) - 1 for c in line.split()[1:]]; skirt += [x for i in range(1, len(f) - 1) for x in (f[0], f[i], f[i + 1])]
V = np.array(V, np.float32) * DM; VT = np.array(VT, np.float32)
assert len(V) == 19158, len(V)

def split_seams(faces, uvs):
    """faces of (vertex, uv) corners -> render vertices (one per distinct pair) and triangle indices"""
    key, mp, uv, idx = {}, [], [], []
    for f in faces:
        ids = []
        for v, t in f:
            k = (v, t)
            if k not in key: key[k] = len(mp); mp.append(v); uv.append(uvs[t])
            ids.append(key[k])
        for i in range(1, len(ids) - 1): idx += [ids[0], ids[i], ids[i + 1]]
    return np.array(mp, np.uint16), np.array(uv, np.float32), np.array(idx, np.uint32)

bmap, buv, bidx = split_seams(faces, VT)
V.tofile(os.path.join(OUT, 'base_pos.f32')); bmap.tofile(os.path.join(OUT, 'body_map.u16')); buv.tofile(os.path.join(OUT, 'body_uv.f32')); bidx.tofile(os.path.join(OUT, 'body_idx.u32'))
print(f'body: {len(bmap)} render vertices, {len(bidx) // 3} triangles')

# ------------------------------------------------------------------ skeleton + weights
skel = json.loads(fetch('rigs/default.mhskel')); assert skel['license'] == 'CC0'
names = list(skel['bones'].keys())
# parents must come first
order, seen = [], set()
def visit(n):
    if n in seen: return
    p = skel['bones'][n]['parent']
    if p: visit(p)
    seen.add(n); order.append(n)
for n in names: visit(n)
bones = [{'name': n, 'parent': order.index(skel['bones'][n]['parent']) if skel['bones'][n]['parent'] else -1,
          'head': skel['joints'][skel['bones'][n]['head']], 'tail': skel['joints'][skel['bones'][n]['tail']]} for n in order]
W = json.loads(fetch('rigs/default_weights.mhw'))['weights']
per = [[] for _ in range(len(V))]
for bn, lst in W.items():
    bi = order.index(bn)
    for v, w in lst: per[v].append((w, bi))
sw_i = np.zeros((len(V), 4), np.uint8); sw_w = np.zeros((len(V), 4), np.float32)
for v, lst in enumerate(per):
    lst.sort(reverse=True); lst = lst[:4]; s = sum(w for w, _ in lst) or 1
    for k, (w, bi) in enumerate(lst): sw_i[v, k] = bi; sw_w[v, k] = w / s
with open(os.path.join(OUT, 'skin_w.bin'), 'wb') as f: f.write(sw_i.tobytes()); f.write(sw_w.tobytes())
print(f'skeleton: {len(bones)} bones, weights for {sum(1 for p in per if p)} vertices')

# ------------------------------------------------------------------ targets
ETH, SEX, AGE = ['african', 'asian', 'caucasian'], ['female', 'male'], ['child', 'young', 'old']
want = [f'macrodetails/{e}-{s}-{a}' for e in ETH for s in SEX for a in AGE]
want += [f'macrodetails/universal-{s}-{a}-{m}muscle-{w}weight' for s in SEX for a in AGE for m in ('min', 'average', 'max') for w in ('min', 'average', 'max')]
want += [f'macrodetails/height/{s}-{a}-averagemuscle-averageweight-{h}height' for s in SEX for a in AGE for h in ('min', 'max')]
want += [f'macrodetails/proportions/{s}-{a}-averagemuscle-averageweight-{p}proportions' for s in SEX for a in AGE for p in ('ideal', 'uncommon')]
UNITS = ['eye-left-closure', 'eye-left-opened-up', 'eye-left-slit', 'eye-right-closure', 'eye-right-opened-up', 'eye-right-slit', 'eyebrows-left-down', 'eyebrows-left-extern-up',
         'eyebrows-left-inner-up', 'eyebrows-left-up', 'eyebrows-right-down', 'eyebrows-right-extern-up', 'eyebrows-right-inner-up', 'eyebrows-right-up', 'mouth-compression', 'mouth-corner-puller',
         'mouth-depression', 'mouth-depression-retraction', 'mouth-elevation', 'mouth-eversion', 'mouth-open', 'mouth-parling', 'mouth-part-later', 'mouth-protusion', 'mouth-pursing', 'mouth-retraction',
         'mouth-upward-retraction', 'neck-platysma', 'nose-compression', 'nose-depression', 'nose-left-dilatation', 'nose-left-elevation', 'nose-right-dilatation', 'nose-right-elevation']
want += [f'expression/units/{e}/{u}' for e in ETH for u in UNITS]
tindex, chunks, off = {}, [], 0
for name in want:
    txt = fetch(f'targets/{name}.target')
    if 'CC0' not in txt[:600]: raise SystemExit(f'{name}: no CC0 notice')
    rows = [l.split() for l in txt.splitlines() if l and not l.startswith('#')]
    if not rows: continue          # an "average" target with no change
    a = np.array([[int(r[0])] + [round(float(x) * DM * 1e4) for x in r[1:4]] for r in rows], np.int64)
    assert np.abs(a[:, 1:]).max() < 32767, name
    rec = np.zeros(len(a), dtype=[('v', '<u2'), ('d', '<i2', 3)]); rec['v'] = a[:, 0]; rec['d'] = a[:, 1:]
    chunks.append(rec.tobytes()); tindex[name] = [off, len(a)]; off += len(a)
open(os.path.join(OUT, 'targets.bin'), 'wb').write(b''.join(chunks))
print(f'targets: {len(tindex)} with data, {off} vertex deltas')

# ------------------------------------------------------------------ proxies (legacy three.js JSON from the npm package)
PROXIES = {   # name -> folder in the package
    'eyes': 'eyes/HighPolyEyes', 'eyelashes': 'eyelashes/Eyelashes01', 'teeth': 'teeth/Teeth_Base', 'tongue': 'tongue/tongue01',
    'brow_f': 'eyebrows/eyebrow006', 'brow_m': 'eyebrows/eyebrow001', 'brow_m2': 'eyebrows/eyebrow010', 'brow_child': 'eyebrows/eyebrow009',
    'hair_afro': 'hair/afro01', 'hair_ponytail': 'hair/ponytail01', 'hair_short02': 'hair/short02', 'hair_short03': 'hair/short03', 'hair_short01': 'hair/short01', 'hair_short04': 'hair/short04', 'hair_bob02': 'hair/bob02', 'hair_braid': 'hair/Braid01',
    'shirt_m01': 'clothes/male_casualsuit01', 'suit_m03': 'clothes/male_casualsuit03', 'suit_m06': 'clothes/male_casualsuit06', 'worksuit': 'clothes/male_worksuit01', 'suit_f01': 'clothes/female_casualsuit01', 'suit_f02': 'clothes/female_casualsuit02',
    'tightjeans': 'clothes/Tightjeans', 'shoes01': 'clothes/shoes01', 'shoes02': 'clothes/shoes02', 'shoes03': 'clothes/shoes03', 'shoes04': 'clothes/shoes04', 'shoes06': 'clothes/shoes06', 'glasses': 'clothes/glasses',
}
OK_AUTHORS = ('Manuel Bastioni', 'Jonas Hauquier', 'Thomas Larsson', 'Manuel bastioni')   # MakeHuman team: relicensed CC0 (2020)

def decode_faces(fa, nuv_layers):
    out, i = [], 0
    while i < len(fa):
        t = fa[i]; i += 1; quad = t & 1; n = 4 if quad else 3
        vs = fa[i:i + n]; i += n
        if t & 2: i += 1
        if t & 4: i += nuv_layers
        uvs = None
        if t & 8: uvs = fa[i:i + n]; i += n * nuv_layers
        if t & 16: i += 1
        if t & 32: i += n
        if t & 64: i += 1
        if t & 128: i += n
        out.append(list(zip(vs, uvs if uvs else vs)))
    return out

plist, lic_lines = {}, []
for key, folder in PROXIES.items():
    d = json.load(open(os.path.join(PKG, 'public/data/proxies', folder, os.path.basename(folder) + '.json')))
    L = d.get('metadata', {}).get('license') or d.get('license') or {}
    author, lic = L.get('author', ''), L.get('license', '')
    team = any(a in author for a in OK_AUTHORS) and 'AGPL' in lic
    if not (team or lic.startswith('CC BY') or lic.startswith('CC0')): raise SystemExit(f'{folder}: licence {lic!r} by {author!r} not usable')
    status = 'CC0 (MakeHuman team asset, relicensed September 2020)' if team else lic
    uvl = d['uvs'][0]; uvs = [(uvl[2 * k], uvl[2 * k + 1]) for k in range(len(uvl) // 2)]
    fs = decode_faces(d['faces'], len(d['uvs']))
    mp, uv, idx = split_seams(fs, uvs)
    ref = np.array(d['ref_vIdxs'], np.uint16)[mp]; w = np.array(d['weights'], np.float32)[mp]; o = np.array(d['offsets'], np.float32)[mp] * DM
    rec = np.zeros(len(mp), dtype=[('r', '<u2', 3), ('w', '<f4', 3), ('o', '<f4', 3), ('uv', '<f4', 2)])
    rec['r'] = ref; rec['w'] = w; rec['o'] = o; rec['uv'] = uv
    with open(os.path.join(OUT, 'proxies', key + '.bin'), 'wb') as f: f.write(rec.tobytes()); f.write(idx.tobytes())
    dv = d.get('metadata', {}).get('deleteVerts') or []
    dels = [i for i, x in enumerate(dv) if x] if len(dv) == len(V) else list(dv)   # a 0/1 mask over the base vertices, or a list of indices
    mat = d['materials'][0] if d.get('materials') else {}
    texdir = os.path.join(PKG, 'public/data/proxies', folder)
    tex = {}
    for slot in ('mapDiffuse', 'mapNormal', 'mapSpecular', 'mapBump', 'mapAlpha'):
        if mat.get(slot):
            src = os.path.join(texdir, mat[slot]); dst = f'{key}_{slot[3:].lower()}{os.path.splitext(src)[1]}'
            if os.path.exists(src): shutil.copy(src, os.path.join(OUT, 'proxies', dst)); tex[slot[3:].lower()] = dst
    plist[key] = {'verts': len(mp), 'tris': len(idx) // 3, 'delete': dels, 'tex': tex, 'transparent': bool(mat.get('transparent')), 'zdepth': d.get('metadata', {}).get('z_depth', 50)}
    lic_lines.append(f'| {key} | `{folder}` | {author} | {status} |')
    print(f'proxy {key:14s} {len(mp):6d} v {len(idx) // 3:6d} t  delete {len(dels):5d}  tex {list(tex)}  {status}')

# ------------------------------------------------------------------ skins
SKINS = ['young_african_female', 'middleage_african_female', 'young_african_male', 'middleage_african_male', 'old_african_male', 'young_caucasian_female', 'young_caucasian_male',
         'middleage_caucasian_male', 'young_asian_female', 'middleage_asian_female', 'young_asian_male']
os.makedirs(os.path.join(OUT, 'skins'), exist_ok=True); skins = {}
for s in SKINS:
    m = json.load(open(os.path.join(PKG, 'public/data/skins', s, s + '.json')))
    src = os.path.join(PKG, 'public/data/skins', s, m['mapDiffuse']); dst = s + os.path.splitext(src)[1]
    shutil.copy(src, os.path.join(OUT, 'skins', dst)); skins[s] = dst
    lic_lines.append(f'| skin {s} | `skins/{s}` | MakeHuman team | CC0 (MakeHuman team asset, relicensed September 2020) |')

json.dump({'verts': len(V), 'scalp': scalp, 'skirt': skirt, 'body': {'verts': len(bmap), 'tris': len(bidx) // 3}, 'bones': bones, 'targets': tindex, 'proxies': plist, 'skins': skins},
          open(os.path.join(OUT, 'base.json'), 'w'), separators=(',', ':'))
with open(os.path.join(OUT, 'LICENSES.md'), 'w') as f:
    f.write('# MakeHuman assets used by the realistic cast\n\nBase mesh, targets, skeleton and weights: official MakeHuman repository on GitHub, CC0 (released September 2020; notice kept in each source file).\n\n'
            'Proxies and skin textures below come from the `makehuman-data` npm package (2016 conversion). Assets by the MakeHuman team were relicensed CC0 in September 2020; '
            'CC BY assets are credited to their authors in the film\'s licence log.\n\n| Key | Source | Author | Licence |\n|---|---|---|---|\n' + '\n'.join(lic_lines) + '\n')
print('written to', os.path.abspath(OUT))
