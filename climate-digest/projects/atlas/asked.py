"""Who has been asked: household-survey coverage of women's lives, by country and province.

Country level (every country):
  child marriage      UNICEF global database, women 20-24 married or in union before 18: latest year, value, source
  place of birth      UNICEF global database, births in a health facility: latest year, value, source
  partner violence    WHO estimates for SDG 5.2.1 (UN SDG database, series VC_VAW_MARR, women 15-49): a country has an
                      estimate only if at least one eligible survey ran between 2000 and 2023
  menstruation        UNICEF / WHO-UNICEF JMP, girls 15-19 who missed school, work or social life during their last
                      period: latest year, value (any data at all means the question was asked)
  income group        World Bank

Province level (countries with a DHS survey that reports by region):
  latest DHS value for child marriage, births at home, anaemia, partner violence in the last 12 months and
  menstrual hygiene, given to each province from the DHS region that contains it.

  -> data/asked_countries.csv, data/asked_provinces.csv        (downloads cached in data/asked_cache/)
"""
import csv, glob, json, os, sys, time, urllib.parse, urllib.request
import pycountry
from shapely import wkt
from shapely.geometry import shape
HERE = os.path.dirname(os.path.abspath(__file__))
D = lambda *p: os.path.join(HERE, "data", *p)
CACHE = D("asked_cache")
os.makedirs(CACHE, exist_ok=True)
DHS = "https://api.dhsprogram.com/rest/dhs/"
UNICEF = "https://sdmx.data.unicef.org/ws/public/sdmxapi/rest/data/UNICEF,GLOBAL_DATAFLOW,1.0/.{}..?format=csv&startPeriod=1990"
IND = {"cm": "MA_MBAY_W_B18", "hb": "RH_DELP_C_HOM", "an": "AN_ANEM_W_ANY", "pv": "DV_SPV1_W_POS", "mh": "WS_MHYG_W_PRA"}
KEY = {v: k for k, v in IND.items()}


def get(name, url, tries=4):
    path = os.path.join(CACHE, name)
    if os.path.exists(path):
        return open(path, encoding="utf-8-sig").read()
    for i in range(tries):
        try:
            txt = urllib.request.urlopen(url, timeout=180).read().decode("utf-8-sig")
            open(path, "w", encoding="utf-8").write(txt)
            return txt
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                raise
            time.sleep(5 * (i + 1))


def dhs(name, query):
    out, page = [], 1
    while True:
        d = json.loads(get(f"{name}_{page}.json", DHS + query + f"&perpage=5000&page={page}&f=json"))
        out += d["Data"]
        if page >= d.get("TotalPages", 1):
            return out
        page += 1


# ---------------------------------------------------------------- countries
def unicef_latest(code):
    rows = csv.DictReader(get(code + ".csv", UNICEF.format(urllib.parse.quote(code))).splitlines())
    last = {}
    for r in rows:
        a, y = r["REF_AREA"], int(r["TIME_PERIOD"][:4])
        if len(a) == 3 and r["OBS_VALUE"] and (a not in last or y > last[a][0]):
            last[a] = (y, round(float(r["OBS_VALUE"]), 1), r["DATA_SOURCE"].strip()[:60])
    return last


cm, birth, mens = unicef_latest("PT_F_20-24_MRD_U18"), unicef_latest("MNCH_INSTDEL"), unicef_latest("WS_PPL_M-NPART_AGE_15_19")
vaw = {}
for r in json.loads(get("vaw.json", "https://unstats.un.org/sdgapi/v1/sdg/Series/Data?seriesCode=VC_VAW_MARR&pageSize=20000"))["data"]:
    c = pycountry.countries.get(numeric=str(r["geoAreaCode"]).zfill(3))
    if c and r["attributes"].get("Nature") == "E" and r["dimensions"].get("Age") == "15-49" and r["value"] not in ("", "NaN", None):
        vaw[c.alpha_3] = round(float(r["value"]), 1)
income = {c["id"]: c["incomeLevel"]["id"] for c in json.loads(get("wb.json", "https://api.worldbank.org/v2/country?format=json&per_page=400"))[1]
          if c["incomeLevel"]["id"] in ("HIC", "UMC", "LMC", "LIC")}
income.setdefault("VEN", "UMC")            # unclassified by the World Bank since 2021; last classified upper-middle
income.setdefault("XKX", "UMC")

# ---------------------------------------------------------------- DHS: surveys, then values by region
iso3 = {c["DHS_CountryCode"]: c["ISO3_CountryCode"] for c in dhs("countries", "countries?x=1")}
surveys = {s["SurveyId"]: s for s in dhs("surveys", "surveys?x=1")}
last_dhs = {}
for s in surveys.values():
    if s["SurveyType"] == "DHS":
        iso = iso3.get(s["DHS_CountryCode"])
        if iso and int(s["SurveyYear"]) > last_dhs.get(iso, (0, ""))[0]:
            last_dhs[iso] = (int(s["SurveyYear"]), s["SurveyYearLabel"])

points = {}                                 # province id -> its outline
for fn in glob.glob(D("shapes", "*.json")):
    for ft in json.load(open(fn))["features"]:
        try:
            points[ft["properties"]["id"]] = shape(ft["geometry"]).buffer(0)
        except Exception:  # noqa: BLE001
            pass
prov_iso = {}
for fn in ("adm1_raw.csv", "adm1_v2.csv"):
    for r in csv.DictReader(open(D(fn))):
        prov_iso[r["shapeID"]] = r["shapeGroup"]
by_iso = {}
for sid, iso in prov_iso.items():
    if sid in points:
        by_iso.setdefault(iso, []).append(sid)

prov = {}                                   # province id -> {key: (value, survey label)}
national = {}                               # iso -> {key: (year, value, label)}
ids = ",".join(IND.values())
for cc, iso in sorted(iso3.items()):
    try:
        nat = dhs(f"nat_{cc}", f"data?countryIds={cc}&indicatorIds={ids}&breakdown=national")
        sub = dhs(f"sub_{cc}", f"data?countryIds={cc}&indicatorIds={ids}&breakdown=subnational")
    except Exception as e:  # noqa: BLE001
        print(cc, "failed:", str(e)[:80], flush=True)
        continue
    for r in nat:
        k, y = KEY[r["IndicatorId"]], int(r["SurveyYear"])
        cur = national.setdefault(iso, {}).get(k)
        if r["Value"] is not None and (cur is None or y > cur[0] or (y == cur[0] and (r["DenominatorWeighted"] or 0) > cur[3])):
            national[iso][k] = (y, r["Value"], r["SurveyYearLabel"], r["DenominatorWeighted"] or 0)
    latest = {}                             # key -> survey id of the latest survey with regional values
    for r in sub:
        k = KEY[r["IndicatorId"]]
        if r["Value"] is not None and (k not in latest or int(r["SurveyYear"]) > int(surveys[latest[k]]["SurveyYear"])):
            latest[k] = r["SurveyId"]
    geoms = {}
    for sv in set(latest.values()):
        try:
            for g in dhs(f"geom_{sv}", f"geometry/{sv}?x=1"):
                try:
                    geoms[g["RegionID"]] = wkt.loads(g["Coordinates"]).buffer(0)
                except Exception:  # noqa: BLE001
                    pass
        except Exception as e:  # noqa: BLE001
            print(sv, "geometry failed:", str(e)[:80], flush=True)
    n = 0
    for k, sv in latest.items():
        vals = {}
        for r in sub:
            if r["SurveyId"] == sv and KEY[r["IndicatorId"]] == k and r["Value"] is not None and r["RegionId"] in geoms:
                if r["RegionId"] not in vals or (r["DenominatorWeighted"] or 0) > vals[r["RegionId"]][1]:
                    vals[r["RegionId"]] = (r["Value"], r["DenominatorWeighted"] or 0, r["CharacteristicLabel"].lstrip(". "))
        for sid in by_iso.get(iso, []):                                  # the region that shares most of the province's area;
            p, best = points[sid], None                                  # among those, the one closest to it in size
            for rid in vals:
                try:
                    inter = geoms[rid].intersection(p).area
                except Exception:  # noqa: BLE001
                    continue
                if p.area and inter / p.area >= 0.5:
                    score = inter / geoms[rid].union(p).area
                    if best is None or score > best[0]:
                        best = (score, rid)
            if best:
                rid = best[1]
                prov.setdefault(sid, {})[k] = (vals[rid][0], surveys[sv]["SurveyYearLabel"], vals[rid][2]); n += 1
    print(iso, "last DHS", last_dhs.get(iso), "| regional:", {k: surveys[v]["SurveyYear"] for k, v in latest.items()}, "| province values", n, flush=True)

mh_any = {}                                 # any menstrual-hygiene question in a DHS: iso -> latest survey year
for r in dhs("mh_any", "data?indicatorIds=WS_MHYG_W_DSP,WS_MHYG_W_CLT,WS_MHYG_W_PRA,WS_MHYG_W_NON&breakdown=national"):
    iso = iso3.get(r["DHS_CountryCode"])
    if iso and r["Value"] is not None:
        mh_any[iso] = max(mh_any.get(iso, 0), int(r["SurveyYear"]))

# ---------------------------------------------------------------- write
isos = sorted(set(prov_iso.values()) | set(income))
with open(D("asked_countries.csv"), "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["iso", "income", "cm_year", "cm_value", "cm_source", "birth_year", "birth_value", "birth_source", "pv_who_estimate", "pv_dhs_year", "pv_dhs_value",
                "mens_year", "mens_value", "mh_dhs_year", "last_dhs"])
    for iso in isos:
        n = national.get(iso, {})
        w.writerow([iso, income.get(iso, ""), *(cm.get(iso) or ("", "", "")), *(birth.get(iso) or ("", "", "")), vaw.get(iso, ""),
                    n["pv"][0] if "pv" in n else "", n["pv"][1] if "pv" in n else "", *((mens.get(iso) or ("", ""))[:2]),
                    mh_any.get(iso, ""), (last_dhs.get(iso) or ("", ""))[1]])
with open(D("asked_provinces.csv"), "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["id", "iso"] + [f"{k}_{x}" for k in IND for x in ("value", "survey", "region")])
    for sid in sorted(prov):
        w.writerow([sid, prov_iso[sid]] + [x for k in IND for x in (prov[sid].get(k) or ("", "", ""))])
print("countries:", len(isos), "| with child marriage", len(cm), "birth", len(birth), "violence", len(vaw), "menstruation", len(mens),
      "| provinces with a DHS value:", len(prov))
