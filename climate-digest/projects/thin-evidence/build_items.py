"""Build the question set: one item per (DHS survey, region, indicator), with ground truth and a measure of how much
has been published about the region.

Ground truth  the latest DHS survey since 2010 that reports each indicator by region (DHS Program API; responses cached
              by ../atlas/asked.py in ../atlas/data/asked_cache). Value, weighted denominator, and the national value from
              the same survey (the naive baseline).
Coverage      Europe PMC hit counts, 2010-2026, for studies whose title or abstract names the region and whose record
              names the country: n_all (any topic) and n_women (also mentioning women, girls, gender, pregnancy ...).
              Uses the place-name query builder from ../atlas/research.py (preexisting). Regions with generic names
              ("North", "Central", "Region 2") are marked not searchable instead of being given a false zero.

  -> items.csv, items_national.csv (the same indicators for each country as a whole)
"""
import csv, glob, json, os, re, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
ATLAS = os.path.join(HERE, "..", "atlas")
sys.path.insert(0, ATLAS)
import research  # noqa: E402  (preexisting: Europe PMC query helpers and cache)
CACHE = os.path.join(ATLAS, "data", "asked_cache")
IND = {"MA_MBAY_W_B18": "cm", "RH_DELP_C_HOM": "hb", "AN_ANEM_W_ANY": "an", "DV_SPV1_W_POS": "pv", "WS_MHYG_W_PRA": "mh"}
BYVAR = {"hb": ["Five years preceding the survey", "Three years preceding the survey", "Two years preceding the survey"]}
MIN_YEAR, MIN_DENOM = 2010, 50


def pages(prefix):
    out = []
    for fn in sorted(glob.glob(os.path.join(CACHE, prefix + "_*.json"))):
        out += json.load(open(fn))["Data"]
    return out


iso3 = {c["DHS_CountryCode"]: c["ISO3_CountryCode"] for c in pages("countries")}
cname = {c["DHS_CountryCode"]: c["CountryName"] for c in pages("countries")}
surveys = {s["SurveyId"]: s for s in pages("surveys")}
atlas_names = json.load(open(os.path.join(ATLAS, "data", "countries.json")))
FIX = {"Congo Democratic Republic": "Democratic Republic of the Congo", "Cote d'Ivoire": "Côte d'Ivoire", "Kyrgyz Republic": "Kyrgyzstan",
       "Gambia": "The Gambia", "Timor-Leste": "Timor-Leste", "Eswatini": "Eswatini", "Turkey": "Türkiye"}


def pick(rows, key):
    """One row per region: for births, the longest reference period reported; otherwise the largest denominator."""
    best = {}
    for r in rows:
        rid = r.get("RegionId") or "national"
        rank = (-BYVAR[key].index(r["ByVariableLabel"]) if key in BYVAR and r["ByVariableLabel"] in BYVAR[key] else 0, r["DenominatorWeighted"] or 0)
        if rid not in best or rank > best[rid][0]:
            best[rid] = (rank, r)
    return {rid: r for rid, (rank, r) in best.items()}


def clean(label):
    s = label.lstrip(". ").strip()
    s = re.sub(r"\s*\((?:excl|incl|excluding|including)[^)]*\)", "", s, flags=re.I)
    s = re.sub(r"\s+(?:excluding|including|excl\.|incl\.)\s+.*$", "", s, flags=re.I)
    return s.strip()


# Names that are ordinary words or cover no single place: a search for them counts unrelated papers ("Meta" finds
# every meta-analysis from Colombia), so they get no coverage figure.
AMBIG = set("""aegean mediterranean free state meta lake mountain mountains hill savannah sahel niger somali valle gulf pool mono kara mara
diana basse chin oriental orientale centrale metropolitana midlands northeast northwest highlands region lacs cascades montagnes
lagunes atlantique atlántica pacífica region viii territorios nacionales urban governorates frontier governorates central ethiopia
south ethiopia south west ethiopia zaire gaza maryland bong bono enga hela lori sila tanga est nord sud ouest""".replace("\n", " ").split(" "))
AMBIG |= {"free state", "highlands region", "region viii", "territorios nacionales", "urban governorates", "frontier governorates", "central ethiopia",
          "south ethiopia", "south west ethiopia", "rest of west", "south eastern a", "south eastern b"}
REMAINDER = re.compile(r"\bsin\b|\bresto\b|rest of|región natural| - rural| - urban|outer java-bali|, inc ", re.I)
ANNOTATED = re.compile(r"\b(pre|post|since|before|after)\b|[<>]=?|\(\d{4}\)|\b(19|20)\d{2}\b|^(zone|region) \d+$", re.I)


def searchable_name(name):
    return name.lower() not in AMBIG and not REMAINDER.search(name)


items, nationals = [], []
for cc in sorted(iso3):
    sub, nat = pages("sub_" + cc), pages("nat_" + cc)
    if not sub:
        continue
    for ind, key in IND.items():
        rows = [r for r in sub if r["IndicatorId"] == ind and r["Value"] is not None and r["SurveyType"] == "DHS"]
        if not rows:
            continue
        sv = max(rows, key=lambda r: int(r["SurveyYear"]))["SurveyId"]
        if int(surveys[sv]["SurveyYear"]) < MIN_YEAR:
            continue
        regs = pick([r for r in rows if r["SurveyId"] == sv], key)
        natrow = pick([r for r in nat if r["IndicatorId"] == ind and r["SurveyId"] == sv and r["Value"] is not None], key).get("national")
        byvar = next(iter(regs.values()))["ByVariableLabel"]
        if natrow is not None and natrow["ByVariableLabel"] != byvar:           # national figure must use the same definition
            same = [r for r in nat if r["IndicatorId"] == ind and r["SurveyId"] == sv and r["ByVariableLabel"] == byvar and r["Value"] is not None]
            natrow = same[0] if same else None
        s = surveys[sv]
        if natrow is not None:              # the same question about the whole country, to separate "knows the country" from "knows the region"
            nationals.append({"item": f"{sv}|national|{key}", "iso": iso3[cc], "country": FIX.get(cname[cc], cname[cc]), "survey": sv, "survey_label": s["SurveyYearLabel"],
                              "year": int(s["SurveyYear"]), "fieldwork_end": s["FieldworkEnd"], "published": s["PublicationDate"], "indicator": key,
                              "byvar": natrow["ByVariableLabel"], "region": "", "region_clean": "", "level": 0, "truth": natrow["Value"],
                              "denominator": round(natrow["DenominatorWeighted"] or 0), "national": natrow["Value"], "searchable": 0, "n_all": "", "n_women": ""})
        for rid, r in regs.items():
            if (r["DenominatorWeighted"] or 0) < MIN_DENOM or ANNOTATED.search(r["CharacteristicLabel"].lstrip(". ").strip()):
                continue                    # too few respondents, or a label for an old or new boundary ("Northern (pre 2022)")
            items.append({"item": f"{sv}|{rid}|{key}", "iso": iso3[cc], "country": FIX.get(cname[cc], cname[cc]), "survey": sv, "survey_label": s["SurveyYearLabel"],
                          "year": int(s["SurveyYear"]), "fieldwork_end": s["FieldworkEnd"], "published": s["PublicationDate"], "indicator": key,
                          "byvar": r["ByVariableLabel"], "region": r["CharacteristicLabel"].lstrip(". ").strip(), "region_clean": clean(r["CharacteristicLabel"]),
                          "level": r["LevelRank"], "truth": r["Value"], "denominator": round(r["DenominatorWeighted"] or 0),
                          "national": natrow["Value"] if natrow else ""})

# ---------------------------------------------------------------- coverage, one lookup per distinct region
places = sorted({(i["iso"], i["country"], i["region_clean"]) for i in items})


def cover(p):
    iso, country, name = p
    q = research.place_province(iso, atlas_names.get(iso, country), name) if searchable_name(name) else None
    if q is None:
        return p, (0, "", "")
    return p, (1, research.hits(f"{q} AND {research.YEARS}"), research.hits(f"{q} AND {research.W} AND {research.YEARS}"))


with ThreadPoolExecutor(6) as ex:
    cov = dict(ex.map(cover, places))
json.dump(research.cache, open(research.cache_path, "w"))
for i in items:
    i["searchable"], i["n_all"], i["n_women"] = cov[(i["iso"], i["country"], i["region_clean"])]

with open(os.path.join(HERE, "items.csv"), "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=list(items[0].keys()))
    w.writeheader(); w.writerows(items)
with open(os.path.join(HERE, "items_national.csv"), "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=list(items[0].keys()))
    w.writeheader(); w.writerows(nationals)
import collections  # noqa: E402
print(len(nationals), "national questions")
print(len(items), "items |", len({i["iso"] for i in items}), "countries |", len(places), "regions | searchable regions", sum(1 for v in cov.values() if v[0]))
print("by indicator", dict(collections.Counter(i["indicator"] for i in items)))
print("by year", sorted(collections.Counter(i["year"] for i in items).items()))
print("failed lookups", sum(1 for v in cov.values() if v[0] and (v[1] is None or v[2] is None)))
