"""Assemble the atlas page data from the Earth Engine and Europe PMC outputs.

  data/adm1_v2.csv (falls back to adm1_raw.csv for units not yet rerun) + data/shapes/*.json  -> site/atlas.json, site/adm1.json
  data/adm2_raw.csv + data/shapes2/<ISO>.json                                                -> site/d/<ISO>.json (one per finished country)
  data/research.csv                                                                           -> research counts on provinces and countries
  data/adm1_s2.csv, data/adm2_s2.csv (second set of layers), data/flood22_pak.csv                -> more fields on the same units
  data/asked_countries.csv, data/asked_provinces.csv                                           -> survey coverage and DHS results
"""
import csv, datetime, glob, gzip, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
D = lambda *p: os.path.join(HERE, "data", *p)
names = json.load(open(D("countries.json")))
names.update({"PRK": "North Korea", "KOR": "South Korea", "COD": "DR Congo", "COG": "Republic of the Congo", "GMB": "The Gambia",
              "BHS": "The Bahamas", "FSM": "Micronesia", "CAF": "Central African Republic", "MKD": "North Macedonia", "SWZ": "Eswatini",
              "MMR": "Myanmar", "CIV": "Côte d'Ivoire", "MHL": "Marshall Islands", "SLB": "Solomon Islands", "STP": "São Tomé and Príncipe",
              "BIH": "Bosnia and Herzegovina", "TTO": "Trinidad and Tobago", "ATG": "Antigua and Barbuda", "KNA": "St Kitts and Nevis",
              "VCT": "St Vincent and the Grenadines"})
# geoBoundaries' Earth Engine copy lost accented letters in some names ("Bih?r"); province names are repaired by hand.
fixes = json.load(open(D("name_fixes.json")))
SHARES = ["cold30", "hot30", "hot90", "far1h", "far2h", "flood", "any", "far2h_exposed"]
SHARES2 = ["conf", "conf25", "farm", "drought", "drought3", "settled", "dark", "motor1h", "motor2h"]     # second set: share of all women and girls


def tidy(name):
    """Repair names that were stored as UTF-8 but read as Latin-1 ("RegiÃ³n" -> "Región")."""
    if "Ã" in name or "Â" in name:
        try:
            return name.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            try:
                return name.encode("cp1252").decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                return name
    return name


def read(path):
    if os.path.exists(path):
        return list(csv.DictReader(open(path)))
    if os.path.exists(path + ".gz"):
        return list(csv.DictReader(gzip.open(path + ".gz", "rt")))
    return []


def unit(r, name):
    """One row of sums -> the record the page uses. Shares are measured on pixels where every layer has data."""
    f = lambda k: float(r.get(k) or 0)
    fem, v = f("fem"), f("fem_valid")
    if fem < 1:
        return None
    u = {"id": r["shapeID"], "n": name, "fem": round(fem), "women": round(f("women")), "girls": round(f("girls")),
         "cov": round(100 * v / fem, 1),
         "frost": round(f("fem_x_frost") / v, 1) if v else None, "hot": round(f("fem_x_hot") / v, 1) if v else None}
    for key in SHARES:
        has = r.get("fem_" + key) not in (None, "")
        u["p_" + key] = round(100 * f("fem_" + key) / v, 1 if key != "flood" else 2) if (v and has) else None
    return u


def more(u, r2, f22):
    """Add the second set of layers (r2) and the 2022 flood (f22) to a unit record. Returns the sums for the totals."""
    sums = {}
    f = lambda k: float(r2.get(k) or 0)
    fem2 = f("fem") if r2 else 0
    for key in SHARES2:                      # fields are left out when there is nothing to say, to keep the files small
        if fem2 >= 1:
            sums[key] = f("fem_" + key)
            if key not in ("settled", "drought3"):
                u["p_" + key] = round(100 * f("fem_" + key) / fem2, 1)
    farm = f("fem_farm") if r2 else 0
    if farm >= 1000 and farm >= 0.05 * fem2:
        u["nino"] = round(f("fem_farm_x_nino") / farm)          # % rain vs normal in El Nino years, where women in farming areas live
    if f22:
        fem22 = float(f22["fem"] or 0)
        u["p_flood22"] = round(100 * float(f22["fem_flood22"] or 0) / fem22, 2) if fem22 >= 1 else None
        u["a_flood22"] = round(100 * float(f22["km2_flood22"] or 0) / float(f22["km2"]), 1) if float(f22["km2"] or 0) > 0 else None
        if fem22 >= 1:
            sums["flood22"] = float(f22["fem_flood22"] or 0)
    return sums


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


# ---------------------------------------------------------------- provinces
old = {r["shapeID"]: r for r in read(D("adm1_raw.csv"))}
new = {r["shapeID"]: r for r in read(D("adm1_v2.csv"))}
rows = {**old, **new}
s2 = {r["shapeID"]: r for r in read(D("adm1_s2.csv"))}
f22 = {r["id"]: r for r in read(D("flood22_pak.csv"))}
units, tot = [], {k: 0.0 for k in ["fem", "women", "girls"] + SHARES}
tot2 = {}
for sid, r in rows.items():
    u = unit(r, fixes.get(r["shapeGroup"] + "|" + r["shapeName"], tidy(r["shapeName"])))
    if not u:
        continue
    u["c"], u["cn"] = r["shapeGroup"], names.get(r["shapeGroup"], r["shapeGroup"])
    for key in SHARES:
        if u["p_" + key] is not None:
            tot[key] += float(r["fem_" + key]) * (float(r["fem"]) / float(r["fem_valid"]))
    tot["fem"] += float(r["fem"]); tot["women"] += float(r["women"]); tot["girls"] += float(r["girls"])
    for key, v in more(u, s2.get(sid), f22.get(sid)).items():
        tot2[key] = tot2.get(key, 0) + v
    units.append(u)
for u in units:                      # units not yet rerun still carry the old "exposed and far" definition: blank it
    if u["id"] not in new:
        u["p_far2h_exposed"] = None

# ---------------------------------------------------------------- research coverage
research = {"countries": {}}
res = read(D("research.csv"))
if res:
    by = {r["id"]: r for r in res if r["level"] == "province"}
    for u in units:
        r = by.get(u["id"])
        if r and r["searchable"] == "1" and r["n_women"] not in ("", "None") and r["n_women_climate"] not in ("", "None"):
            u["rw"], u["rc"] = int(r["n_women"]), int(r["n_women_climate"])
        else:
            u["rw"] = u["rc"] = None
    for r in res:
        if r["level"] == "country" and r["n_women"] not in ("", "None"):
            research["countries"][r["iso"]] = [int(r["n_women"]), int(r["n_women_climate"] or 0)]
    s = [u for u in units if u.get("rc") is not None]
    MIN_RW = 5       # fewer studies on women than this under a province's name: cannot tell unstudied from misspelt
    gap = [u for u in s if u["rc"] == 0 and u["rw"] >= MIN_RW]
    thin = [u for u in s if u["rc"] == 0 and u["rw"] < MIN_RW]
    research.update({"min_rw": MIN_RW, "searchable": len(s), "searchable_fem": sum(u["fem"] for u in s),
                     "none": len(gap), "none_fem": sum(u["fem"] for u in gap),
                     "thin": len(thin), "thin_fem": sum(u["fem"] for u in thin),
                     "some": len(s) - len(gap) - len(thin), "some_fem": sum(u["fem"] for u in s if u["rc"] > 0)})

# ---------------------------------------------------------------- who has been asked (survey coverage)
SINCE = datetime.date.today().year - 10          # "recent" = a data point in the last ten years
MENS_EXTRA = {"IND": 2021}                       # asked in a national survey that the two databases used here do not carry (NFHS-5)
asked, asked_tot = {}, {}
fem_iso = {}
for u in units:
    fem_iso[u["c"]] = fem_iso.get(u["c"], 0) + u["fem"]
num = lambda x: float(x) if x not in ("", None) else None
for r in read(D("asked_countries.csv")):
    iso = r["iso"]
    if iso not in fem_iso:
        continue
    yr = lambda k: int(r[k]) if r[k] else None
    mens_y = max([y for y in (yr("mens_year"), yr("mh_dhs_year"), MENS_EXTRA.get(iso)) if y] or [0]) or None
    a = {"inc": r["income"] or None,
         "cm": [yr("cm_year"), num(r["cm_value"])] if r["cm_year"] else None,
         "bi": [yr("birth_year"), num(r["birth_value"])] if r["birth_year"] else None,
         "pv": num(r["pv_who_estimate"]), "pvy": yr("pv_dhs_year"),
         "me": [mens_y, num(r["mens_value"])] if mens_y else None, "dhs": r["last_dhs"] or None}
    if a["inc"] in ("LIC", "LMC", "UMC"):        # the four questions are only scored where these surveys are the main source
        gaps = [k for k, miss in (("cm", not a["cm"] or a["cm"][0] < SINCE), ("bi", not a["bi"] or a["bi"][0] < SINCE),
                                  ("pv", a["pv"] is None), ("me", not a["me"])) if miss]
        a["gaps"] = gaps
        asked_tot[len(gaps)] = asked_tot.get(len(gaps), 0) + fem_iso[iso]
    asked[iso] = a
dh = {r["id"]: r for r in read(D("asked_provinces.csv"))}
for u in units:
    r = dh.get(u["id"])
    if r:
        u["dh"] = {k: [float(r[k + "_value"]), r[k + "_survey"]] for k in ("cm", "hb", "an", "pv", "mh") if r[k + "_value"] != ""}
asked_meta = {"since": SINCE, "countries": asked, "by_gaps": {str(k): round(v) for k, v in sorted(asked_tot.items())},
              "scored_fem": round(sum(asked_tot.values())), "two_plus_fem": round(sum(v for k, v in asked_tot.items() if k >= 2))}

# ---------------------------------------------------------------- province outlines
feats, have = [], {u["id"] for u in units}
for fn in sorted(glob.glob(D("shapes", "*.json"))):
    for ft in json.load(open(fn))["features"]:
        if ft["properties"]["id"] in have:
            ft["geometry"] = rewind(ft["geometry"])
            if ft["geometry"]["coordinates"]:
                feats.append(ft)

# ---------------------------------------------------------------- districts, one file per finished country
districts, d_units, d_fem, s2_ready = {}, 0, 0, []
os.makedirs(os.path.join(HERE, "site", "d"), exist_ok=True)
for stale in glob.glob(os.path.join(HERE, "site", "d", "*.json")):
    os.remove(stale)
load = lambda fn: json.load(open(D(fn))) if os.path.exists(D(fn)) else {}
d_names, d_fixes = load("adm2_names.json"), load("adm2_name_fixes.json")     # from repair.py, and by hand


def dname(r):
    n = d_names.get(r["shapeID"]) or d_fixes.get(r["shapeGroup"] + "|" + r["shapeName"]) or tidy(r["shapeName"])
    return n if n.strip("? -�") else "Name not available"


s2d = {r["shapeID"]: r for r in read(D("adm2_s2.csv"))}
adm2 = {}
for r in read(D("adm2_raw.csv")):
    adm2.setdefault(r["shapeGroup"], {})[r["shapeID"]] = r
ids = {}
if os.path.exists(D("adm2_ids.json")):
    for iso, sid in json.load(open(D("adm2_ids.json"))):
        ids.setdefault(iso, []).append(sid)
for iso, got in sorted(adm2.items()):
    shp = D("shapes2", iso + ".json")
    if not os.path.exists(shp) or len(got) < 0.97 * len(ids.get(iso, got)):
        continue                                   # country not finished yet
    us = []
    ready = sum(1 for sid in got if sid in s2d) >= 0.97 * len(got)      # second set of layers: only once the whole country is in
    for sid, r in got.items():
        u = unit(r, dname(r))
        if u:
            more(u, s2d.get(sid) if ready else None, f22.get(sid))
            us.append(u)
    s2_ready += [iso] if ready else []
    keep = {u["id"] for u in us}
    fs = []
    for ft in json.load(open(shp))["features"]:
        if ft["properties"]["id"] in keep:
            g = rewind(ft["geometry"])
            if g["coordinates"]:
                fs.append({"type": "Feature", "properties": ft["properties"], "geometry": g})
    if not us or len(us) < 2:
        continue
    json.dump({"iso": iso, "units": us, "features": fs}, open(os.path.join(HERE, "site", "d", iso + ".json"), "w"),
              separators=(",", ":"), ensure_ascii=False)
    districts[iso] = len(us); d_units += len(us); d_fem += sum(u["fem"] for u in us)

meta = {"units": len(units), "countries": len({u["c"] for u in units}), "totals": {k: round(v) for k, v in {**tot, **tot2}.items()},
        "s2_done": len(s2), "s2_districts": sorted(s2_ready), "asked": asked_meta,
        "names": {iso: names.get(iso, iso) for iso in {u["c"] for u in units}},
        "flood_done": sum(1 for u in units if u["p_flood"] is not None),
        "districts": districts, "district_units": d_units, "research": research,
        "built": datetime.date.today().isoformat()}
json.dump({"meta": meta, "units": units}, open(os.path.join(HERE, "site", "atlas.json"), "w"), separators=(",", ":"), ensure_ascii=False)
json.dump({"type": "FeatureCollection", "features": feats}, open(os.path.join(HERE, "site", "adm1.json"), "w"), separators=(",", ":"))
sizes = {f: os.path.getsize(os.path.join(HERE, "site", f)) for f in ("atlas.json", "adm1.json")}
dsz = sorted(((os.path.getsize(p), os.path.basename(p)) for p in glob.glob(os.path.join(HERE, "site", "d", "*.json"))), reverse=True)
print({k: v for k, v in meta.items() if k not in ("names", "districts", "research", "asked")})
print("asked:", {k: v for k, v in asked_meta.items() if k != "countries"})
print("research:", {k: v for k, v in research.items() if k != "countries"})
print("shapes:", len(feats), "| sizes:", sizes, "| district files:", len(dsz), "total MB", round(sum(s for s, _ in dsz) / 1e6, 1), "largest", dsz[:3])
