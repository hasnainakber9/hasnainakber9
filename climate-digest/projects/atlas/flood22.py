"""Pakistan's 2022 flood from Sentinel-1 radar, to fill the gap after the Global Flood Database ends in 2018.

Open water is dark to radar. A 100 m pixel counts as flooded in 2022 if
  - its lowest VV backscatter between 20 August and 15 September 2022 was below -17 dB (open water), and
  - in the same weeks of 2021 its lowest VV was at least 3 dB higher (so rice paddies and other water that is there
    every August do not count), and
  - it is not permanent or seasonal water (JRC Global Surface Water: water in fewer than 3 months of the year),
    lies on a slope under 5 degrees and within 15 m of height above the nearest drainage (radar shadow in
    mountains looks like water).
Each 1 km cell gets the share of its 100 m pixels that pass; women and girls are counted in proportion.

Usage: python3 flood22.py            -> data/flood22_pak.csv  (provinces and districts of Pakistan)
Limits: radar misses water under crops, trees and between buildings, and water that came and went between
satellite passes (6-12 days apart), so this is a low estimate. Smooth dry sand can look like water.
"""
import csv, os, sys, time
import layers
ee = layers.ee
ee.data.setDeadline(290000)
HERE = layers.HERE
ISO = "PAK"

s1 = ee.ImageCollection("COPERNICUS/S1_GRD").filter(ee.Filter.eq("instrumentMode", "IW")) \
    .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV")).select("VV")
P100 = dict(crs="EPSG:4326", scale=92.766)


def low(a, b):
    """Lowest VV in the window, read from the 100 m pyramid level (averaging there removes most speckle)."""
    return s1.filterDate(a, b).map(lambda i: i.updateMask(i.gt(-40))).min().reproject(**P100)


wet22, wet21 = low("2022-08-20", "2022-09-16"), low("2021-08-20", "2021-09-16")
gsw = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("seasonality").unmask(0)
slope = ee.Terrain.slope(ee.Image("USGS/SRTMGL1_003"))
water22 = wet22.lt(-17).And(wet21.subtract(wet22).gte(3)).And(gsw.lt(3)).And(slope.lt(5)).And(layers.hand.lt(15))
flood22 = water22.unmask(0).reduceResolution(ee.Reducer.mean(), maxPixels=256).reproject(crs="EPSG:4326", scale=927.66).unmask(0).rename("flood22")
km2 = ee.Image.pixelArea().divide(1e6)
stack = ee.Image.cat([layers.fem.unmask(0).rename("fem"), layers.fem.multiply(flood22).unmask(0).rename("fem_flood22"),
                      km2.rename("km2"), km2.multiply(flood22).rename("km2_flood22")])
BANDS = ["fem", "fem_flood22", "km2", "km2_flood22"]


def info(obj):
    for k in range(40):
        try:
            return obj.getInfo()
        except Exception as e:  # noqa: BLE001
            m = str(e).lower()
            if "too many requests" in m or "concurrency" in m or "429" in m:
                time.sleep(min(60, 5 + 5 * k)); continue
            raise


def run(level, ids, out):
    fc = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/" + level).filter(ee.Filter.eq("shapeGroup", ISO))
    for i in range(0, len(ids), 4):
        part = ids[i:i + 4]
        todo = [part]
        while todo:
            p = todo.pop()
            try:
                fs = info(stack.reduceRegions(fc.filter(ee.Filter.inList("shapeID", p)), ee.Reducer.sum(), scale=927.66, tileScale=8)
                          .select(["shapeID", "shapeName"] + BANDS, retainGeometry=False))["features"]
                for f in fs:
                    out.writerow([level, f["properties"]["shapeID"], f["properties"]["shapeName"]] + [round(f["properties"][b] or 0, 2) for b in BANDS])
            except Exception as e:  # noqa: BLE001
                if len(p) == 1:
                    print("FAILED", level, p[0], str(e)[:100], flush=True)
                else:
                    todo += [p[:len(p) // 2], p[len(p) // 2:]]
        print(level, min(i + 4, len(ids)), "/", len(ids), flush=True)


if __name__ == "__main__":
    path = os.path.join(HERE, "data", "flood22_pak.csv")
    done = {r["id"] for r in csv.DictReader(open(path))} if os.path.exists(path) else set()
    new = not os.path.exists(path)
    with open(path, "a", newline="") as fh:
        w = csv.writer(fh)
        if new:
            w.writerow(["level", "id", "name"] + BANDS)
        for level in ("ADM1", "ADM2"):
            ids = info(ee.FeatureCollection("WM/geoLab/geoBoundaries/600/" + level).filter(ee.Filter.eq("shapeGroup", ISO)).aggregate_array("shapeID"))
            run(level, [i for i in ids if i not in done], w)
            fh.flush()
    print("DONE", flush=True)
