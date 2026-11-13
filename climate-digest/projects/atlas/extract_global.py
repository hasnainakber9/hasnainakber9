"""Run the atlas layers for every first-level administrative unit (province/state) on Earth.

Usage: python3 extract_global.py stats     -> data/adm1_raw.csv     (resumable)
       python3 extract_global.py shapes    -> data/shapes/<ISO3>.json (simplified outlines, resumable)
"""
import csv, json, os, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
import layers
ee = layers.ee
HERE = layers.HERE
adm1 = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM1")
KEEP = ["shapeID", "shapeName", "shapeGroup", "shapeISO"]
lock = threading.Lock()


def retry(fn, n=4):
    for k in range(n):
        try:
            return fn(k)
        except Exception as e:  # noqa: BLE001
            if k == n - 1:
                raise
            time.sleep(8 * (k + 1))


def stats_country(iso, w, done_ids):
    fc = adm1.filter(ee.Filter.eq("shapeGroup", iso))
    try:
        feats = retry(lambda k: layers.stack.reduceRegions(fc, ee.Reducer.sum(), scale=927.66, tileScale=[4, 8, 16, 16][k])
                      .select(KEEP + layers.BANDS, retainGeometry=False).getInfo()["features"], n=3)
        rows = [f["properties"] for f in feats]
    except Exception as e:  # noqa: BLE001  -> fall back to one unit at a time
        rows = []
        ids = fc.aggregate_array("shapeID").getInfo()
        for sid in ids:
            if sid in done_ids:
                continue
            one = fc.filter(ee.Filter.eq("shapeID", sid)).first()
            try:
                r = retry(lambda k: layers.stack.reduceRegion(ee.Reducer.sum(), one.geometry(), scale=927.66, maxPixels=1e12,
                                                              tileScale=16, bestEffort=False).getInfo(), n=3)
                p = one.toDictionary(KEEP).getInfo()
                rows.append({**p, **r})
            except Exception as e2:  # noqa: BLE001
                print("  FAILED unit", iso, sid, str(e2)[:80], flush=True)
    with lock:
        for r in rows:
            w.writerow({k: r.get(k) for k in KEEP + layers.BANDS})
    print(iso, len(rows), flush=True)


def run_stats():
    out = os.path.join(HERE, "data", "adm1_raw.csv")
    done_iso, done_ids = set(), set()
    if os.path.exists(out):
        for r in csv.DictReader(open(out)):
            done_iso.add(r["shapeGroup"]); done_ids.add(r["shapeID"])
    isos = sorted(adm1.aggregate_histogram("shapeGroup").getInfo().keys())
    todo = [i for i in isos if i not in done_iso]
    print(len(isos), "countries,", len(todo), "to do", flush=True)
    new = not os.path.exists(out)
    with open(out, "a", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=KEEP + layers.BANDS)
        if new:
            w.writeheader()
        with ThreadPoolExecutor(8) as ex:
            list(ex.map(lambda i: stats_country(i, w, done_ids) or fh.flush(), todo))


def rnd(c):
    if not c:
        return c
    if isinstance(c[0], (int, float)):
        return [round(c[0], 2), round(c[1], 2)]
    return [y for y in (rnd(x) for x in c) if y]


def shapes_country(iso):
    path = os.path.join(HERE, "data", "shapes", iso + ".json")
    if os.path.exists(path):
        return
    fc = adm1.filter(ee.Filter.eq("shapeGroup", iso)).select(["shapeID"]).map(lambda f: ee.Feature(f).setGeometry(ee.Feature(f).geometry().simplify(4000)))
    try:
        g = retry(lambda k: fc.getInfo(), n=3)
    except Exception as e:  # noqa: BLE001
        print("  SHAPES FAILED", iso, str(e)[:100], flush=True); return
    feats = []
    for f in g["features"]:
        geom = f.get("geometry")
        if not geom or geom["type"] not in ("Polygon", "MultiPolygon", "GeometryCollection"):
            continue
        if geom["type"] == "GeometryCollection":
            polys = [x["coordinates"] for x in geom["geometries"] if x["type"] == "Polygon"]
            polys += [p for x in geom["geometries"] if x["type"] == "MultiPolygon" for p in x["coordinates"]]
            geom = {"type": "MultiPolygon", "coordinates": polys}
        geom["coordinates"] = rnd(geom["coordinates"])
        if not geom["coordinates"]:
            continue
        feats.append({"type": "Feature", "properties": {"id": f["properties"]["shapeID"]}, "geometry": geom})
    json.dump({"type": "FeatureCollection", "features": feats}, open(path, "w"), separators=(",", ":"))
    print("shapes", iso, len(feats), flush=True)


def run_shapes():
    os.makedirs(os.path.join(HERE, "data", "shapes"), exist_ok=True)
    isos = sorted(adm1.aggregate_histogram("shapeGroup").getInfo().keys())
    def safe(iso):
        try:
            shapes_country(iso)
        except Exception as e:  # noqa: BLE001
            print("  SHAPES ERROR", iso, type(e).__name__, str(e)[:100], flush=True)
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(safe, isos))


if __name__ == "__main__":
    {"stats": run_stats, "shapes": run_shapes}[sys.argv[1]]()
