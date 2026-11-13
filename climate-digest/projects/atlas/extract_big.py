"""Compute one very large country unit by unit, splitting units that time out into 10 x 5 degree tiles.
Usage: python3 extract_big.py RUS    (appends to data/adm1_raw.csv)"""
import csv, os, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
import layers
ee = layers.ee
iso = sys.argv[1]
adm1 = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM1").filter(ee.Filter.eq("shapeGroup", iso))
KEEP = ["shapeID", "shapeName", "shapeGroup", "shapeISO"]
out = os.path.join(layers.HERE, "data", "adm1_raw.csv")
done = {r["shapeID"] for r in csv.DictReader(open(out))}
props = [f["properties"] for f in adm1.select(KEEP, retainGeometry=False).getInfo()["features"]]
todo = [p for p in props if p["shapeID"] not in done]
print(len(props), "units,", len(todo), "to do", flush=True)
lock = threading.Lock()


def reduce(geom):
    return layers.stack.reduceRegion(ee.Reducer.sum(), geom, scale=927.66, maxPixels=1e13, tileScale=16).getInfo()


def one(p):
    geom = adm1.filter(ee.Filter.eq("shapeID", p["shapeID"])).first().geometry()
    try:
        r = reduce(geom)
    except Exception as e:  # noqa: BLE001  -> split into tiles
        b = geom.bounds().coordinates().getInfo()[0]
        xs, ys = [c[0] for c in b], [c[1] for c in b]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        if x1 - x0 > 180:                       # unit crosses the antimeridian (Chukotka)
            x0, x1 = 0, 360
        r = {k: 0.0 for k in layers.BANDS}
        x = x0
        while x < x1:
            y = y0
            while y < y1:
                tile = ee.Geometry.Rectangle([x, y, min(x + 10, x1), min(y + 5, y1)], None, False)
                for k in range(3):
                    try:
                        part = reduce(geom.intersection(tile, 100))
                        for key in layers.BANDS:
                            r[key] += part.get(key) or 0
                        break
                    except Exception as e2:  # noqa: BLE001
                        if k == 2:
                            print("   tile failed", p["shapeName"], x, y, str(e2)[:60], flush=True)
                        time.sleep(5)
                y += 5
            x += 10
    with lock:
        with open(out, "a", newline="") as fh:
            csv.DictWriter(fh, fieldnames=KEEP + layers.BANDS).writerow({**{k: p.get(k) for k in KEEP}, **{k: r.get(k) for k in layers.BANDS}})
    print(p["shapeName"], round(r.get("fem") or 0), flush=True)


with ThreadPoolExecutor(8) as ex:
    list(ex.map(one, todo))
print("DONE", flush=True)
