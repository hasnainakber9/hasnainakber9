"""Version 2 search for the APFSD scoping review (run 13 Nov 2026): more databases, newer records.

Databases: Crossref, Europe PMC (covers PubMed/MEDLINE, PMC and preprints), DOAJ, DataCite (Zenodo and
other repositories). Same screening rule as v1: a gender term AND a hazard/displacement term AND a
Pakistan location term in title or abstract; then manual screening.
Usage: python3 search_v2.py <outdir>
"""
import html, json, re, sys, time
import requests
H = {"User-Agent": "evidence-review/2.0"}
OUT = sys.argv[1]

QUERIES = [
    "Pakistan flood gender-based violence women displacement", "Pakistan floods menstrual hygiene management women",
    "climate displacement sexual harassment women Pakistan", "Pakistan flood relief camps women safety privacy",
    "Gilgit-Baltistan women climate change", "glacial lake outburst flood women Pakistan", "Chitral women flood",
    "Pakistan flood child marriage", "Pakistan floods transgender", "Pakistan floods pregnant women maternal health",
    "climate-induced migration women Pakistan", "Pakistan 2025 floods women", "Pakistan flood sexual exploitation abuse aid",
    "Pakistan winter cold women menstrual", "Pakistan flood open defecation women safety", "Pakistan heatwave women pregnancy",
    "Pakistan drought women migration Sindh Balochistan", "Pakistan floods mental health women", "Pakistan flood girls education early marriage",
    "Pakistan disaster women disability",
]


def get(url, params=None, tries=4):
    for k in range(tries):
        try:
            r = requests.get(url, params=params, headers=H, timeout=60)
            if r.ok and r.text.lstrip().startswith(("{", "[")):
                return r.json()
        except Exception:
            pass
        time.sleep(4 * (k + 1))
    return None


def clean(t):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t or ""))).strip()


recs, counts = [], {}
for q in QUERIES:
    # Crossref
    j = get("https://api.crossref.org/works", {"query.bibliographic": q, "rows": 60, "filter": "from-pub-date:2010-01-01",
                                                "select": "DOI,title,container-title,published,type,abstract"})
    for w in (j or {}).get("message", {}).get("items", []):
        recs.append({"db": "crossref", "id": w["DOI"].lower(), "title": clean((w.get("title") or [""])[0]),
                     "venue": (w.get("container-title") or [""])[0], "type": w.get("type"),
                     "year": (w.get("published", {}).get("date-parts") or [[None]])[0][0], "abstract": clean(w.get("abstract"))})
    # Europe PMC
    j = get("https://www.ebi.ac.uk/europepmc/webservices/rest/search",
            {"query": q + " AND PUB_YEAR:[2010 TO 2026]", "format": "json", "pageSize": 100, "resultType": "core"})
    for w in (j or {}).get("resultList", {}).get("result", []):
        recs.append({"db": "europepmc", "id": (w.get("doi") or ("pmid:" + str(w.get("pmid") or w.get("id")))).lower(),
                     "title": clean(w.get("title")), "venue": (w.get("journalInfo", {}).get("journal", {}) or {}).get("title", "") or w.get("bookOrReportDetails", {}).get("publisher", ""),
                     "type": (w.get("pubTypeList", {}).get("pubType") or [""])[0], "year": int(w["pubYear"]) if w.get("pubYear") else None,
                     "abstract": clean(w.get("abstractText"))})
    # DOAJ
    j = get("https://doaj.org/api/search/articles/" + requests.utils.quote(q), {"pageSize": 100})
    for w in (j or {}).get("results", []):
        b = w.get("bibjson", {})
        doi = next((i["id"] for i in b.get("identifier", []) if i.get("type") == "doi"), None)
        recs.append({"db": "doaj", "id": (doi or "doaj:" + w["id"]).lower(), "title": clean(b.get("title")),
                     "venue": b.get("journal", {}).get("title", ""), "type": "journal-article",
                     "year": int(b["year"]) if str(b.get("year", "")).isdigit() else None, "abstract": clean(b.get("abstract"))})
    # DataCite
    j = get("https://api.datacite.org/dois", {"query": q, "page[size]": 60})
    for w in (j or {}).get("data", []):
        a = w["attributes"]
        recs.append({"db": "datacite", "id": w["id"].lower(), "title": clean((a.get("titles") or [{}])[0].get("title")),
                     "venue": a.get("publisher") if isinstance(a.get("publisher"), str) else (a.get("publisher") or {}).get("name", ""),
                     "type": (a.get("types") or {}).get("resourceTypeGeneral", ""), "year": a.get("publicationYear"),
                     "abstract": clean(" ".join(d.get("description", "") for d in a.get("descriptions") or []))})
    print(q, len(recs), flush=True)
    time.sleep(0.5)

for r in recs:
    counts[r["db"]] = counts.get(r["db"], 0) + 1
uniq = {}
for r in recs:
    k = r["id"]
    if k not in uniq or len(r["abstract"]) > len(uniq[k]["abstract"]):
        uniq[k] = {**r, "dbs": sorted(set(uniq.get(k, {}).get("dbs", [])) | {r["db"]})}
    else:
        uniq[k]["dbs"] = sorted(set(uniq[k]["dbs"]) | {r["db"]})
G = r"women|woman|girl|gender|female|menstru|sexual|harass|violence|GBV|maternal|pregnan|transgender|marriage"
C = r"flood|climate|disaster|displace|migra|cyclone|drought|heat|winter|cold|camp|relief|GLOF|glaci|monsoon"
P = r"Pakistan|Sindh|Punjab|Balochistan|Khyber|Gilgit|Chitral|Hunza|Rajanpur|Swat|Karachi|Indus"
scr = [r for r in uniq.values() if re.search(G, r["title"] + " " + r["abstract"], re.I) and re.search(C, r["title"] + " " + r["abstract"], re.I)
       and re.search(P, r["title"] + " " + r["abstract"])]
json.dump({"queries": QUERIES, "records_by_db": counts, "records_total": len(recs), "unique": len(uniq), "passed_auto_screen": len(scr)},
          open(OUT + "/search_v2_counts.json", "w"), indent=1)
json.dump(scr, open(OUT + "/search_v2_screened.json", "w"), indent=1)
print(counts, len(recs), len(uniq), len(scr))
