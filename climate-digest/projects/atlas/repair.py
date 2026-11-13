"""Repair district names and fill missing district outlines from the original geoBoundaries files.

The Earth Engine copy of geoBoundaries lost accented letters ("Op?ina Mljet"), and the 1.5 km simplification in
extract.py drops districts smaller than that. For every country with either problem this downloads the country's
simplified ADM2 GeoJSON from geoBoundaries release 6.0.0 (same shapeIDs) and writes

  data/adm2_names.json            {shapeID: original name}, only where the Earth Engine name is garbled
  data/shapes2/<ISO3>.json        missing outlines appended (coordinates rounded to 4 decimals)

Run after `extract.py ADM2 stats` and `extract.py ADM2 shapes`, before build.py. Downloads are cached in data/gb_cache/.
"""
import collections, csv, gzip, json, os, sys, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
D = lambda *p: os.path.join(HERE, "data", *p)
API = "https://www.geoboundaries.org/api/current/gbOpen/{}/ADM2/"
V6 = "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/v6.0.0/releaseData/gbOpen/{iso}/ADM2/geoBoundaries-{iso}-ADM2_simplified.geojson"
os.makedirs(D("gb_cache"), exist_ok=True)


def garbled(name):
    return "?" in name or "Ã" in name or "�" in name


def get(url, tries=4):
    for i in range(tries):
        try:
            return urllib.request.urlopen(url, timeout=120).read()
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(3 * (i + 1))


def original(iso):
    """The country's simplified ADM2 GeoJSON as published by geoBoundaries."""
    path = D("gb_cache", iso + ".json.gz")
    if os.path.exists(path):
        return json.load(gzip.open(path, "rt"))
    # Earth Engine holds release 6.0.0, so that tag has the same shapeIDs; the files are in Git LFS, served from media.githubusercontent.com
    try:
        g = json.loads(get(V6.format(iso=iso), tries=2))
    except Exception:
        meta = json.loads(get(API.format(iso)))                 # country changed since: fall back to the current release
        url = meta.get("simplifiedGeometryGeoJSON") or meta["gjDownloadURL"]
        url = url.replace("https://github.com/wmgeolab/geoBoundaries/raw/", "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/")
        g = json.loads(get(url))
    json.dump(g, gzip.open(path, "wt"))
    return g


def rnd(c):
    return [round(c[0], 4), round(c[1], 4)] if isinstance(c[0], (int, float)) else [rnd(x) for x in c]


def dedupe(geom):
    """Drop repeated points left by rounding; keep rings that still have 4 points."""
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    out = []
    for poly in polys:
        rings = []
        for ring in poly:
            r = [p for i, p in enumerate(ring) if i == 0 or p != ring[i - 1]]
            if len(r) >= 4:
                rings.append(r)
        if rings:
            out.append(rings)
    return {"type": "MultiPolygon", "coordinates": out}


src = D("adm2_raw.csv")
rows = list(csv.DictReader(open(src) if os.path.exists(src) else gzip.open(src + ".gz", "rt")))
by = collections.defaultdict(list)
for r in rows:
    by[r["shapeGroup"]].append(r)

names_path = D("adm2_names.json")
names = json.load(open(names_path)) if os.path.exists(names_path) else {}
only = set(filter(None, os.environ.get("ONLY", "").split(",")))
fixed = added = 0
for iso, rs in sorted(by.items()):
    if only and iso not in only:
        continue
    bad = [r for r in rs if garbled(r["shapeName"]) and r["shapeID"] not in names]
    shp = D("shapes2", iso + ".json")
    fc = json.load(open(shp)) if os.path.exists(shp) else {"type": "FeatureCollection", "features": []}
    have = {f["properties"]["id"] for f in fc["features"] if f.get("geometry") and f["geometry"].get("coordinates")}
    missing = {r["shapeID"] for r in rs if float(r["fem"] or 0) >= 1} - have
    if not bad and not missing:
        continue
    try:
        g = original(iso)
    except Exception as e:
        print(iso, "download failed:", e, flush=True)
        continue
    feats = {f["properties"].get("shapeID"): f for f in g["features"]}
    n1 = n2 = 0
    for r in bad:
        f = feats.get(r["shapeID"])
        if f and f["properties"].get("shapeName") and not garbled(f["properties"]["shapeName"]):
            names[r["shapeID"]] = f["properties"]["shapeName"]; n1 += 1
    if missing:
        fc["features"] = [f for f in fc["features"] if f["properties"]["id"] not in missing]
        for sid in missing:
            f = feats.get(sid)
            if f and f.get("geometry"):
                geom = dedupe({"type": f["geometry"]["type"], "coordinates": rnd(f["geometry"]["coordinates"])})
                if geom["coordinates"]:
                    fc["features"].append({"type": "Feature", "properties": {"id": sid}, "geometry": geom}); n2 += 1
        json.dump(fc, open(shp, "w"), separators=(",", ":"))
    fixed += n1; added += n2
    print(f"{iso}: names {n1}/{len(bad)}, outlines {n2}/{len(missing)}", flush=True)
json.dump(names, open(names_path, "w"), ensure_ascii=False, indent=0, sort_keys=True)
print("names repaired:", fixed, "| outlines added:", added, "| names on file:", len(names))
