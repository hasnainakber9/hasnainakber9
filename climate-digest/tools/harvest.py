#!/usr/bin/env python3
"""Weekly candidate harvester for the Friday Climate Data Science Shortlist.

Collects *candidates* only. Every item still has to be opened and judged by
the weekly run before it goes into an issue.

Sources (all keyless):
  - Crossref: journal articles + Copernicus/EGUsphere preprints (posted-content)
  - DataCite: arXiv preprints (client arxiv.content) and Zenodo datasets/software
  - PyPI: release watch for the xarray/Pangeo/data-access stack (breaking-change alerts)
  - NASA CMR: product version watch (IMERG, SMAP, MODIS/VIIRS VI, GLDAS)
  - ECMWF forum: CDS/ERA5 announcements and access issues
  - NOAA CPC + NOAA PSL: ENSO status (alert, synopsis, weekly Nino SSTs, ONI/RONI) and IOD (DMI)

Usage:
  python3 climate-digest/tools/harvest.py [--date YYYY-MM-DD] [--days 7]

Writes:
  climate-digest/harvest/<date>.json   full candidate list
  climate-digest/harvest/<date>.md     ranked summary for the weekly run
  climate-digest/state/versions.json   last-seen package/product versions (updated)
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
CFG = json.loads((ROOT / "tools" / "config.json").read_text())
STATE = ROOT / "state" / "versions.json"
SEEN = ROOT / "state" / "seen.json"
OUT = ROOT / "harvest"

S = requests.Session()
S.headers["User-Agent"] = CFG["user_agent"]
ERRORS: list[str] = []


def get(url, params=None, timeout=40, tries=3, as_json=True):
    for i in range(tries):
        try:
            r = S.get(url, params=params, timeout=timeout)
            if r.status_code == 429:
                time.sleep(5 * (i + 1))
                continue
            r.raise_for_status()
            return r.json() if as_json else r.text
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                ERRORS.append(f"{url} -> {type(e).__name__}: {str(e)[:120]}")
            time.sleep(2 * (i + 1))
    return None


def clean(s):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s or ""))
    return re.sub(r"\s+", " ", s).strip()


def norm_title(t):
    return re.sub(r"[^a-z0-9]+", " ", (t or "").lower()).strip()


# ---------------------------------------------------------------- scoring
def score(text):
    t = text.lower()
    hits, total = {}, 0
    for name, spec in CFG["topics"].items():
        found = [w for w in spec["terms"] if w.lower() in t]
        if not found:
            continue
        if spec.get("require_any") and not any(w.lower() in t for w in spec["require_any"]):
            continue
        hits[name] = found
        total += spec["weight"] * min(len(found), 3)
    region = [w for w in CFG["region_boost"]["terms"] if w.lower() in t]
    if region and hits:
        total += CFG["region_boost"]["weight"] * min(len(region), 2)
    return total, hits, region


def item(source, kind, title, url, date, venue="", abstract="", ident=""):
    sc, hits, region = score(f"{title} {abstract}")
    return {
        "source": source, "kind": kind, "title": clean(title), "url": url, "date": date,
        "venue": venue, "id": ident or url, "abstract": clean(abstract)[:700],
        "score": sc, "topics": hits, "region": region,
    }


# ---------------------------------------------------------------- literature
def crossref(start, end):
    out = []
    for q in CFG["crossref_queries"]:
        d = get("https://api.crossref.org/works", {
            "query.bibliographic": q,
            "filter": f"from-created-date:{start},until-created-date:{end},"
                      "type:journal-article,type:posted-content,type:dataset",
            "rows": 40, "sort": "relevance",
            "select": "DOI,title,container-title,created,abstract,type,publisher,URL",
        })
        if not d:
            continue
        for w in d["message"]["items"]:
            if not w.get("title"):
                continue
            venue = (w.get("container-title") or [""])[0] or \
                    w.get("publisher", "")
            kind = {"posted-content": "preprint", "journal-article": "paper"}.get(w.get("type"), w.get("type"))
            out.append(item("crossref", kind, w["title"][0], f"https://doi.org/{w['DOI']}",
                            w["created"]["date-time"][:10], venue, w.get("abstract", ""), w["DOI"].lower()))
        time.sleep(0.5)
    return out


def datacite(start, end, client, queries, kind):
    out = []
    for q in queries:
        d = get("https://api.datacite.org/dois", {
            "client-id": client, "query": q,
            "created": f"{start[:4]}" if start[:4] == end[:4] else None,
            "page[size]": 100, "sort": "-created",
        })
        if not d:
            continue
        for rec in d.get("data", []):
            a = rec["attributes"]
            created = a.get("created", "")[:10]
            if not (start <= created <= end):
                continue
            title = (a.get("titles") or [{}])[0].get("title", "")
            desc = " ".join(x.get("description", "") for x in a.get("descriptions") or [])
            rtype = (a.get("types") or {}).get("resourceTypeGeneral", kind)
            if client == "cern.zenodo" and rtype not in ("Dataset", "Software"):
                continue
            url = a.get("url") or f"https://doi.org/{rec['id']}"
            if client == "arxiv.content":
                url = "https://arxiv.org/abs/" + rec["id"].split("arxiv.")[-1]
            out.append(item(f"datacite:{client}", kind if client == "arxiv.content" else rtype.lower(),
                            title, url, created, a.get("publisher", ""), desc, rec["id"].lower()))
        time.sleep(0.5)
    return out


# ---------------------------------------------------------------- watches
def pypi_watch(state):
    alerts = []
    for pkg in CFG["pypi_packages"]:
        d = get(f"https://pypi.org/pypi/{pkg}/json")
        if not d:
            continue
        ver = d["info"]["version"]
        files = d["releases"].get(ver) or []
        released = min((f["upload_time"][:10] for f in files), default="")
        prev = state.get("pypi", {}).get(pkg)
        change = None
        if prev and prev != ver:
            change = bump_kind(prev, ver)
        alerts.append({"package": pkg, "version": ver, "released": released, "previous": prev,
                       "change": change, "requires_python": d["info"].get("requires_python"),
                       "changelog": pick_changelog(d["info"].get("project_urls") or {}),
                       "url": f"https://pypi.org/project/{pkg}/{ver}/"})
        state.setdefault("pypi", {})[pkg] = ver
    return alerts


def bump_kind(old, new):
    o, n = re.findall(r"\d+", old), re.findall(r"\d+", new)
    if o[:1] != n[:1]:
        return "MAJOR"
    if o[:2] != n[:2]:
        return "minor"
    return "patch"


def pick_changelog(urls):
    for k, v in urls.items():
        if re.search(r"change|release|what.?s.?new|history", k, re.I):
            return v
    return urls.get("Documentation") or urls.get("Homepage") or ""


def xarray_breaking():
    """Pull the 'Breaking changes' / 'Deprecations' bullets of the newest xarray whats-new section."""
    page = get("https://docs.xarray.dev/en/stable/whats-new.html", as_json=False)
    if not page:
        return None
    sec = re.split(r'<section id="v\d', page)
    if len(sec) < 2:
        return None
    first = sec[1]
    head = clean(re.search(r"<h2>(.*?)</h2>", first, re.S).group(1)) if "<h2>" in first else ""
    parts = {}
    for name in ("breaking-changes", "deprecations"):
        m = re.search(rf'<section id="{name}[^"]*">(.*?)</section>', first, re.S)
        if m:
            parts[name] = [clean(li)[:300] for li in re.findall(r"<li>(.*?)</li>", m.group(1), re.S)][:8]
    return {"release": head, **parts}


def cmr_watch(state):
    out = []
    for p in CFG["cmr_products"]:
        d = get("https://cmr.earthdata.nasa.gov/search/collections.json",
                {"short_name": p["short_name"], "page_size": 20})
        if not d:
            continue
        entries = d["feed"]["entry"]
        versions = sorted({e.get("version_id", "") for e in entries})
        prev = state.get("cmr", {}).get(p["short_name"])
        new = sorted(set(versions) - set(prev or []))
        out.append({"product": p["short_name"], "label": p["label"], "versions": versions,
                    "new_versions": new if prev is not None else [],
                    "updated": max((e.get("updated", "") for e in entries), default="")[:10]})
        state.setdefault("cmr", {})[p["short_name"]] = versions
    return out


def ecmwf_forum(start):
    out = []
    kw = [k.lower() for k in CFG["ecmwf_forum_keywords"]]
    for cid, slug in CFG["ecmwf_forum_categories"].items():
        d = get(f"https://forum.ecmwf.int/c/{slug}/{cid}.json")
        if not d:
            continue
        for t in d["topic_list"]["topics"]:
            if t["created_at"][:10] < start and (t.get("last_posted_at") or "")[:10] < start:
                continue
            title = t["title"]
            if slug != "announcements" and not any(k in title.lower() for k in kw):
                continue
            out.append({"category": slug, "title": title, "created": t["created_at"][:10],
                        "last_post": (t.get("last_posted_at") or "")[:10], "replies": t.get("posts_count", 1) - 1,
                        "url": f"https://forum.ecmwf.int/t/{t['slug']}/{t['id']}"})
    return out


def enso_status():
    res = {}
    disc = get("https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml",
               as_json=False)
    if disc:
        txt = clean(disc)
        m = re.search(r"issued by CLIMATE PREDICTION CENTER/NCEP/NWS\s+(\d{1,2} \w+ \d{4})", txt)
        res["discussion_issued"] = m.group(1) if m else None
        m = re.search(r"ENSO Alert System Status:\s*(.*?)\s*Synopsis:", txt)
        res["alert_status"] = m.group(1).strip() if m else None
        m = re.search(r"Synopsis:\s*(.*?\.)\s", txt)
        res["synopsis"] = m.group(1).strip() if m else None
        m = re.search(r"Chances remain.*?(?:\.\s){1}.*?\.", txt)
        res["probability_sentence"] = m.group(0)[:500] if m else None
        res["discussion_url"] = ("https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/"
                                 "enso_advisory/ensodisc.shtml")
    wk = get("https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for", as_json=False)
    if wk:
        last = [ln for ln in wk.splitlines() if re.match(r"\s*\d{2}[A-Z]{3}\d{4}", ln)][-1].split()
        res["weekly_week_centered"] = last[0]
        res["weekly_anom"] = {"nino12": float(last[2]), "nino3": float(last[4]),
                              "nino34": float(last[6]), "nino4": float(last[8])}
    for name, url in (("oni", "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"),
                      ("roni", "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt")):
        t = get(url, as_json=False)
        if t:
            rows = [r.split() for r in t.strip().splitlines()[1:] if r.strip()]
            r = rows[-1]
            res[name] = {"season": f"{r[0]} {r[1]}", "anom": float(r[-1])}
    dmi = get("https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data", as_json=False)
    if dmi:
        vals = []
        for ln in dmi.splitlines()[1:]:
            p = ln.split()
            if len(p) == 13 and p[0].isdigit():
                for mi, v in enumerate(p[1:], 1):
                    if float(v) > -99:
                        vals.append((f"{p[0]}-{mi:02d}", float(v)))
        if vals:
            res["iod_dmi_hadisst_latest"] = {"month": vals[-1][0], "value": vals[-1][1],
                                             "note": "NOAA PSL HadISST DMI; lags ~1-2 months. "
                                                     "Cross-check BoM/JMA IOD outlook."}
    return res


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=dt.date.today().isoformat())
    ap.add_argument("--days", type=int, default=CFG["window_days"])
    a = ap.parse_args()
    end = a.date
    start = (dt.date.fromisoformat(end) - dt.timedelta(days=a.days)).isoformat()

    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    seen = json.loads(SEEN.read_text()) if SEEN.exists() else {"ids": [], "titles": []}
    seen_ids, seen_titles = set(seen["ids"]), set(seen["titles"])

    lit = crossref(start, end)
    lit += datacite(start, end, "arxiv.content", CFG["datacite_arxiv_queries"], "preprint")
    lit += datacite(start, end, "cern.zenodo", CFG["zenodo_queries"], "dataset")

    dedup, by_title = {}, {}
    for it in lit:
        nt = norm_title(it["title"])
        if it["id"] in seen_ids or nt in seen_titles or it["score"] <= 0:
            continue
        key = by_title.get(nt, it["id"])
        if key in dedup and dedup[key]["score"] >= it["score"]:
            continue
        dedup[key] = it
        by_title[nt] = key
    cands = sorted(dedup.values(), key=lambda x: (-x["score"], x["date"]), reverse=False)

    result = {
        "window": {"start": start, "end": end},
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "enso": enso_status(),
        "software": pypi_watch(state),
        "xarray_whats_new": xarray_breaking(),
        "products": cmr_watch(state),
        "ecmwf_forum": ecmwf_forum(start),
        "candidates": cands,
        "errors": ERRORS,
    }
    state["updated"] = end
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=1, sort_keys=True))
    OUT.mkdir(exist_ok=True)
    (OUT / f"{end}.json").write_text(json.dumps(result, indent=1, ensure_ascii=False))
    (OUT / f"{end}.md").write_text(render(result))
    print(f"{len(cands)} candidates, {len(ERRORS)} source errors -> harvest/{end}.md")


def render(r):
    w = r["window"]
    L = [f"# Harvest {w['end']} (window {w['start']} → {w['end']})", "",
         "Candidates only: open and verify each before it goes in an issue.", ""]
    e = r["enso"]
    L += ["## ENSO / IOD raw status", ""]
    L += [f"- CPC discussion issued: {e.get('discussion_issued')} · Alert: **{e.get('alert_status')}**",
          f"- Synopsis: {e.get('synopsis')}",
          f"- Probabilities: {e.get('probability_sentence')}",
          f"- Weekly SST anomalies (week of {e.get('weekly_week_centered')}): {e.get('weekly_anom')}",
          f"- ONI: {e.get('oni')} · RONI: {e.get('roni')}",
          f"- IOD (DMI): {e.get('iod_dmi_hadisst_latest')}", ""]
    L += ["## Software watch (PyPI)", "", "| package | version | released | change | changelog |", "|---|---|---|---|---|"]
    for s in sorted(r["software"], key=lambda s: s["released"], reverse=True):
        flag = f"**{s['change']}** (was {s['previous']})" if s["change"] else ("new baseline" if not s["previous"] else "")
        L.append(f"| {s['package']} | {s['version']} | {s['released']} | {flag} | {s['changelog']} |")
    x = r.get("xarray_whats_new")
    if x:
        L += ["", f"**xarray whats-new, top section:** {x.get('release')}"]
        for k in ("breaking-changes", "deprecations"):
            for b in x.get(k, []):
                L.append(f"- [{k}] {b}")
    L += ["", "## Data product versions (NASA CMR)", ""]
    for p in r["products"]:
        nv = f" **NEW: {p['new_versions']}**" if p["new_versions"] else ""
        L.append(f"- {p['label']} ({p['product']}): versions {p['versions']} · updated {p['updated']}{nv}")
    L += ["", "## ECMWF / CDS forum (announcements + access/data issues)", ""]
    for f in r["ecmwf_forum"]:
        L.append(f"- [{f['category']}] {f['title']} · created {f['created']} · last {f['last_post']} · {f['url']}")
    L += ["", f"## Literature candidates ({len(r['candidates'])})", ""]
    for c in r["candidates"][:80]:
        reg = f" · region: {', '.join(c['region'])}" if c["region"] else ""
        L.append(f"- **[{c['score']}]** {c['title']} · {c['kind']} · {c['venue']} · {c['date']} · "
                 f"{c['url']} · topics: {', '.join(c['topics'])}{reg}")
    if r["errors"]:
        L += ["", "## Source errors", ""] + [f"- {x}" for x in r["errors"]]
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    sys.exit(main())
