"""Assemble the atlas page data from the Earth Engine outputs.
  data/adm1_raw.csv + data/shapes/*.json + data/countries.json -> site/atlas.json, site/adm1.json
"""
import csv, glob, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
names = json.load(open(os.path.join(HERE, "data", "countries.json")))
rows = {}
for r in csv.DictReader(open(os.path.join(HERE, "data", "adm1_raw.csv"))):
    rows[r["shapeID"]] = r
units, tot = [], {k: 0.0 for k in ["fem", "women", "girls", "cold30", "hot30", "hot90", "far1h", "far2h", "far2h_exposed"]}
for sid, r in rows.items():
    f = lambda k: float(r[k] or 0)
    fem, v = f("fem"), f("fem_valid")
    if fem < 1:
        continue
    k = fem / v if v > 0 else 0            # scale shares measured on valid pixels up to the whole unit
    u = {"id": sid, "n": r["shapeName"], "c": r["shapeGroup"], "cn": names.get(r["shapeGroup"], r["shapeGroup"]),
         "fem": round(fem), "women": round(f("women")), "girls": round(f("girls")),
         "cov": round(100 * v / fem, 1),
         "frost": round(f("fem_x_frost") / v, 1) if v else None, "hot": round(f("fem_x_hot") / v, 1) if v else None}
    for key in ["cold30", "hot30", "hot90", "far1h", "far2h", "far2h_exposed"]:
        u["p_" + key] = round(100 * f("fem_" + key) / v, 1) if v else None
        tot[key] += f("fem_" + key) * k
    tot["fem"] += fem; tot["women"] += f("women"); tot["girls"] += f("girls")
    units.append(u)
def area(ring):                      # shoelace; positive = counter-clockwise in lon/lat
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1])) / 2


def rewind(geom):
    """d3-geo wants exterior rings clockwise and holes counter-clockwise (the reverse of RFC 7946)."""
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    out = []
    for poly in polys:
        rings = [r for r in poly if len(r) >= 4]
        if not rings:
            continue
        fixed = []
        for i, r in enumerate(rings):
            ccw = area(r) > 0
            fixed.append(r[::-1] if (ccw if i == 0 else not ccw) else r)
        out.append(fixed)
    return {"type": "MultiPolygon", "coordinates": out}


feats = []
have = {u["id"] for u in units}
for fn in sorted(glob.glob(os.path.join(HERE, "data", "shapes", "*.json"))):
    for ft in json.load(open(fn))["features"]:
        if ft["properties"]["id"] in have:
            ft["geometry"] = rewind(ft["geometry"])
            if ft["geometry"]["coordinates"]:
                feats.append(ft)
os.makedirs(os.path.join(HERE, "site"), exist_ok=True)
meta = {"units": len(units), "countries": len({u["c"] for u in units}), "totals": {k: round(v) for k, v in tot.items()},
        "built": __import__("datetime").date.today().isoformat()}
json.dump({"meta": meta, "units": units}, open(os.path.join(HERE, "site", "atlas.json"), "w"), separators=(",", ":"), ensure_ascii=False)
json.dump({"type": "FeatureCollection", "features": feats}, open(os.path.join(HERE, "site", "adm1.json"), "w"), separators=(",", ":"))
print(meta, "| shapes:", len(feats), "| sizes:", {f: os.path.getsize(os.path.join(HERE, "site", f)) for f in ("atlas.json", "adm1.json")})
