"""Run the atlas layers for every administrative unit on Earth at one level.

Usage: python3 extract.py ADM1 stats    -> data/adm1_v2.csv            (provinces / states)
       python3 extract.py ADM2 stats    -> data/adm2_raw.csv           (districts / counties)
       python3 extract.py ADM2 shapes   -> data/shapes2/<ISO3>.json    (simplified outlines)
Everything is resumable: rerun the same command after a crash and it carries on.

Earth Engine answers interactive requests for at most five minutes, so units are sent in small batches.
A batch that fails is split in two; a single unit that still fails is cut into 10 x 5 degree tiles.
"""
import csv, json, os, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
import layers
ee = layers.ee
ee.data.setDeadline(290000)
HERE = layers.HERE
LEVEL, WHAT = sys.argv[1], sys.argv[2]
FC = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/" + LEVEL)
KEEP = ["shapeID", "shapeName", "shapeGroup"]
COLS = KEEP + layers.BANDS
OUT = os.path.join(HERE, "data", {"ADM1": "adm1_v2.csv", "ADM2": "adm2_raw.csv"}[LEVEL])
SHAPES = os.path.join(HERE, "data", {"ADM1": "shapes", "ADM2": "shapes2"}[LEVEL])
GIANTS = {"RUS", "CAN", "USA", "BRA", "AUS", "CHN", "GRL", "KAZ", "DZA", "ARG", "IND", "MNG", "SAU", "COD", "SDN", "LBY"}
SKIP = {"ATA"}
lock = threading.Lock()


def busy(e):
    m = str(e).lower()
    return "too many requests" in m or "concurrency" in m or "quota" in m or "rate limit" in m or "429" in m


def info(obj):
    """getInfo that waits out Earth Engine's rate limits instead of treating them as a failure."""
    for k in range(40):
        try:
            return obj.getInfo()
        except Exception as e:  # noqa: BLE001
            if not busy(e):
                raise
            time.sleep(min(60, 5 + 5 * k))
    raise RuntimeError("rate limited for too long")


def units():
    """[(iso, shapeID)] for the whole level, cached on disk."""
    path = os.path.join(HERE, "data", LEVEL.lower() + "_ids.json")
    if os.path.exists(path):
        return json.load(open(path))
    isos = sorted(FC.aggregate_histogram("shapeGroup").getInfo().keys())
    out = []
    def one(iso):
        return [(iso, s) for s in FC.filter(ee.Filter.eq("shapeGroup", iso)).aggregate_array("shapeID").getInfo()]
    with ThreadPoolExecutor(8) as ex:
        for part in ex.map(one, isos):
            out += part
    json.dump(out, open(path, "w"))
    return out


def sub(iso, ids):
    return FC.filter(ee.Filter.eq("shapeGroup", iso)).filter(ee.Filter.inList("shapeID", ids))


def tiles(feature):
    geom = feature.geometry()
    b = info(geom.bounds().coordinates())[0]
    xs, ys = [c[0] for c in b], [c[1] for c in b]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    if x1 - x0 > 180:                           # unit crosses the antimeridian
        x0, x1 = 0, 360
    r = {k: 0.0 for k in layers.BANDS}
    x = x0
    while x < x1:
        y = y0
        while y < y1:
            tile = ee.Geometry.Rectangle([x, y, min(x + 10, x1), min(y + 5, y1)], None, False)
            for k in range(3):
                try:
                    p = info(layers.stack.reduceRegion(ee.Reducer.sum(), geom.intersection(tile, 100), scale=927.66, maxPixels=1e13, tileScale=16))
                    for key in layers.BANDS:
                        r[key] += p.get(key) or 0
                    break
                except Exception as e:  # noqa: BLE001
                    if k == 2:
                        print("   tile failed", x, y, str(e)[:60], flush=True)
                    time.sleep(5)
            y += 5
        x += 10
    return r


def batch(iso, ids, w, fh, depth=0):
    try:
        feats = info(layers.stack.reduceRegions(sub(iso, ids), ee.Reducer.sum(), scale=927.66, tileScale=4 if depth == 0 else 16)
                     .select(COLS, retainGeometry=False))["features"]
        rows = [f["properties"] for f in feats]
    except Exception as e:  # noqa: BLE001
        if len(ids) > 1:
            h = len(ids) // 2
            batch(iso, ids[:h], w, fh, depth + 1); batch(iso, ids[h:], w, fh, depth + 1)
            return
        try:
            ft = sub(iso, ids).first()
            rows = [{**info(ft.toDictionary(KEEP)), **tiles(ft)}]
        except Exception as e2:  # noqa: BLE001
            print("  FAILED", iso, ids[0], str(e2)[:90], flush=True); return
    with lock:
        for r in rows:
            w.writerow({k: r.get(k) for k in COLS})
        fh.flush()


def run_stats():
    done = {r["shapeID"] for r in csv.DictReader(open(OUT))} if os.path.exists(OUT) else set()
    todo = {}
    for iso, sid in units():
        if sid not in done and iso not in SKIP:
            todo.setdefault(iso, []).append(sid)
    jobs = []
    for iso, ids in todo.items():
        n = {"ADM1": 8, "ADM2": 40}[LEVEL]
        if iso in GIANTS:
            n = {"ADM1": 1, "ADM2": 8}[LEVEL]
        jobs += [(iso, ids[i:i + n]) for i in range(0, len(ids), n)]
    only = [x for x in os.environ.get("ONLY", "").split(",") if x]     # e.g. ONLY=PAK to run a single country
    if only:
        jobs = [j for j in jobs if j[0] in only]
    first = os.environ.get("FIRST", "").split(",")          # countries to run before the rest, e.g. FIRST=PAK,IND,BGD
    jobs.sort(key=lambda j: first.index(j[0]) if j[0] in first else len(first))
    print(LEVEL, sum(len(v) for v in todo.values()), "units to do in", len(jobs), "batches;", len(done), "done", flush=True)
    new = not os.path.exists(OUT)
    count = [0]
    with open(OUT, "a", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLS)
        if new:
            w.writeheader()
        def go(j):
            batch(j[0], j[1], w, fh)
            with lock:
                count[0] += 1
                if count[0] % 25 == 0:
                    print(count[0], "/", len(jobs), j[0], flush=True)
        with ThreadPoolExecutor(int(os.environ.get("THREADS", 6))) as ex:
            list(ex.map(go, jobs))
    print("DONE", flush=True)


def rnd(c, nd):
    if not c:
        return c
    if isinstance(c[0], (int, float)):
        return [round(c[0], nd), round(c[1], nd)]
    return [y for y in (rnd(x, nd) for x in c) if y]


def clean(g, nd):
    """GeoJSON features -> polygons only, rounded, consecutive duplicate points removed."""
    feats = []
    for f in g:
        geom = f.get("geometry")
        if not geom or geom["type"] not in ("Polygon", "MultiPolygon", "GeometryCollection"):
            continue
        if geom["type"] == "GeometryCollection":
            polys = [x["coordinates"] for x in geom["geometries"] if x["type"] == "Polygon"]
            polys += [p for x in geom["geometries"] if x["type"] == "MultiPolygon" for p in x["coordinates"]]
        else:
            polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        out = []
        for poly in rnd(polys, nd):
            rings = []
            for ring in poly:
                r2 = [p for i, p in enumerate(ring) if i == 0 or p != ring[i - 1]]
                if len(r2) >= 4:
                    rings.append(r2)
            if rings:
                out.append(rings)
        if out:
            feats.append({"type": "Feature", "properties": {"id": f["properties"]["shapeID"]}, "geometry": {"type": "MultiPolygon", "coordinates": out}})
    return feats


def shapes_country(iso, ids):
    path = os.path.join(SHAPES, iso + ".json")
    if os.path.exists(path):
        return
    tol, nd = (4000, 2) if LEVEL == "ADM1" else (1500, 3)
    got = []
    def fetch(part):
        fc = sub(iso, part).select(["shapeID"]).map(lambda f: ee.Feature(f).setGeometry(ee.Feature(f).geometry().simplify(tol)))
        try:
            return info(fc)["features"]
        except Exception as e:  # noqa: BLE001
            if len(part) == 1:
                print("  SHAPE FAILED", iso, part[0], str(e)[:80], flush=True); return []
            h = len(part) // 2
            return fetch(part[:h]) + fetch(part[h:])
    for i in range(0, len(ids), 150):
        got += fetch(ids[i:i + 150])
    feats = clean(got, nd)
    json.dump({"type": "FeatureCollection", "features": feats}, open(path, "w"), separators=(",", ":"))
    print("shapes", iso, len(feats), "of", len(ids), os.path.getsize(path) // 1024, "KB", flush=True)


def run_shapes():
    os.makedirs(SHAPES, exist_ok=True)
    by = {}
    for iso, sid in units():
        if iso not in SKIP:
            by.setdefault(iso, []).append(sid)
    def safe(item):
        try:
            shapes_country(*item)
        except Exception as e:  # noqa: BLE001
            print("  SHAPES ERROR", item[0], type(e).__name__, str(e)[:100], flush=True)
    only = [x for x in os.environ.get("ONLY", "").split(",") if x]
    items = [kv for kv in sorted(by.items(), key=lambda kv: len(kv[1])) if not only or kv[0] in only]
    with ThreadPoolExecutor(int(os.environ.get("THREADS", 2))) as ex:
        list(ex.map(safe, items))
    print("DONE", flush=True)


if __name__ == "__main__":
    {"stats": run_stats, "shapes": run_shapes}[WHAT]()
