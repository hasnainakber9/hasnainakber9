"""Research-coverage layer: how many published studies on women and girls, and on women and girls AND climate
hazards, name each country and each province in their title or abstract (2010-2026).

Source: Europe PMC (covers PubMed, PubMed Central, preprints, Agricola): a health and life-science index, so
social-science and local-language research is undercounted. Matching is by place name, not by reading the
papers: a study counts when the place name appears in its title or abstract (and, for provinces, the country
name appears anywhere in the record). Provinces whose names are too generic to search ("Central", "Northern",
three letters or fewer) are marked not searchable rather than given a false zero.

Usage: python3 research.py     -> data/research.csv   (resumable through data/research_cache.json)
"""
import csv, json, os, re, threading, time, unicodedata, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
YEARS = "PUB_YEAR:[2010 TO 2026]"
W = ('TITLE_ABS:(women OR woman OR girls OR girl OR gender OR gendered OR maternal OR pregnancy OR pregnant OR menstrual '
     'OR menstruation OR "reproductive health" OR "gender-based violence" OR "child marriage")')
C = ('TITLE_ABS:("climate change" OR "climate variability" OR "climate crisis" OR climatic OR flood OR floods OR flooding '
     'OR drought OR droughts OR heatwave OR heatwaves OR "heat wave" OR "heat waves" OR "extreme heat" OR "heat stress" '
     'OR "heat exposure" OR "high temperature" OR "ambient temperature" OR "cold wave" OR "extreme cold" OR cyclone OR cyclones '
     'OR hurricane OR typhoon OR "extreme weather" OR "natural disaster" OR "natural disasters" OR "sea level rise")')

ALIASES = {
    "PRK": ["North Korea", "DPRK", "Democratic People's Republic of Korea"], "KOR": ["South Korea", "Republic of Korea"],
    "COD": ["Democratic Republic of the Congo", "Democratic Republic of Congo", "DR Congo", "DRC"],
    "COG": ["Republic of the Congo", "Republic of Congo", "Congo-Brazzaville", "Congo Brazzaville"],
    "CIV": ["Cote d'Ivoire", "Côte d'Ivoire", "Ivory Coast"], "CAF": ["Central African Republic"], "GMB": ["Gambia"],
    "MKD": ["North Macedonia", "Macedonia"], "SWZ": ["Eswatini", "Swaziland"], "MMR": ["Myanmar", "Burma"],
    "TUR": ["Turkey", "Türkiye", "Turkiye"], "CZE": ["Czechia", "Czech Republic"], "BIH": ["Bosnia and Herzegovina", "Bosnia"],
    "STP": ["Sao Tome", "São Tomé"], "TTO": ["Trinidad and Tobago", "Trinidad"], "KNA": ["Saint Kitts", "St Kitts"],
    "LCA": ["Saint Lucia", "St Lucia"], "VCT": ["Saint Vincent", "St Vincent"], "ATG": ["Antigua"], "BHS": ["Bahamas"],
    "FSM": ["Micronesia"], "MHL": ["Marshall Islands"], "SLB": ["Solomon Islands"], "USA": ["United States", "USA"],
    "GBR": ["United Kingdom", "UK", "England", "Scotland", "Wales", "Northern Ireland", "Britain"], "CPV": ["Cabo Verde", "Cape Verde"],
    "TLS": ["Timor-Leste", "East Timor"], "LAO": ["Laos", "Lao PDR", "Lao People's Democratic Republic"], "VNM": ["Vietnam", "Viet Nam"],
    "RUS": ["Russia", "Russian Federation"], "SYR": ["Syria", "Syrian Arab Republic"], "118": ["Gaza"],
    "129": ["West Bank", "Palestine", "Palestinian"], "VAT": ["Vatican"],
}
# Country names that also mean something else: extra terms the title or abstract must not contain.
NOT = {
    "GIN": ["Papua New Guinea", "Guinea-Bissau", "Guinea Bissau", "Equatorial Guinea", "New Guinea", "guinea pig", "guinea pigs", "Gulf of Guinea"],
    "NER": ["Niger Delta", "Niger State", "River Niger", "Niger River"], "SDN": ["South Sudan"], "DMA": ["Dominican"],
    "GEO": ["United States", "USA", "Atlanta", "U.S."], "IRL": ["Northern Ireland"], "WSM": ["American Samoa"],
}
SKIP_ISO = {"111", "112", "113", "114", "115", "116", "117", "119", "120", "121", "122", "123", "124", "125", "126", "127", "128", "ATA"}
GENERIC = set("""north south east west central centre center northern southern eastern western upper lower middle coast coastal
capital littoral plateau plateaux maritime lakes unity union rivers river delta savanes est sud nord ouest centro norte sur oeste este
region province state district area zone territory division department county city municipality governorate prefecture oblast
national federal metropolitan special administrative autonomous greater new old island islands and of the de la del le du al el
ovest isole contiguous insular noord zuid oost nordeste sudeste sul centro-oeste rural urban""".split())
ADMIN = re.compile(r"(región metropolitana de|región del?|région de|département de l'|département d[eu]|district autonome d'|provincia de|"
                   r"departamento del?|estado de|região autónoma d[aeo]s?|autonomous region|special administrative region|capital region|"
                   r"\b(province|region|state|district|governorate|governate|department|county|prefecture|oblast|krai|division|territory|"
                   r"municipality|autonomous|republic|voivodeship|parish|canton|city|capital|federal|administrative|special|area|"
                   r"provincia|departamento|región|région|gewest|wilaya|okrug|rayon|raion|atoll|uyghur|hui|zhuang)\b)", re.I)
# Places that English-language research calls by another name than the boundary file does.
EXONYMS = {
    "DEU|Bayern": ["Bavaria"], "DEU|Nordrhein-Westfalen": ["North Rhine-Westphalia"], "DEU|Hessen": ["Hesse"], "DEU|Sachsen": ["Saxony"],
    "DEU|Niedersachsen": ["Lower Saxony"], "DEU|Thüringen": ["Thuringia"], "DEU|Rheinland-Pfalz": ["Rhineland-Palatinate"],
    "DEU|Sachsen-Anhalt": ["Saxony-Anhalt"], "DEU|Mecklenburg-Vorpommern": ["Mecklenburg-Western Pomerania"],
    "MEX|Distrito Federal": ["Mexico City", "Ciudad de México"], "MEX|Veracruz de Ignacio de la Llave": ["Veracruz"],
    "MEX|Michoacán de Ocampo": ["Michoacán"], "MEX|Coahuila de Zaragoza": ["Coahuila"], "MEX|Querétaro de Arteaga": ["Querétaro"],
    "ESP|Cataluña/Catalunya": ["Catalonia", "Cataluña", "Catalunya"], "ESP|Andalucía": ["Andalusia", "Andalucía"],
    "ESP|País Vasco/Euskadi": ["Basque Country"], "ESP|Comunidad de Madrid": ["Madrid"], "ESP|Castilla y León": ["Castile and León", "Castilla y León"],
    "BEL|Vlaams Gewest": ["Flanders", "Flemish Region"], "BEL|Région Wallonne": ["Wallonia", "Walloon Region"],
    "NLD|Zuid-Holland": ["South Holland"], "NLD|Noord-Holland": ["North Holland"], "NLD|Noord-Brabant": ["North Brabant"],
    "CIV|District Autonome D'Abidjan": ["Abidjan"], "HTI|Département de l'Ouest": ["Port-au-Prince"],
    "EGY|Al Sharqia Governorate": ["Sharqia", "Sharkia"], "EGY|Gharbiyya Governorate": ["Gharbia", "Gharbiya"],
    "EGY|Monufia Governorate": ["Menoufia", "Monufia", "Menofia"], "EGY|Qalyubia Governorate": ["Qalyubia", "Qalubia", "Kalyoubia"],
    "EGY|Faiyum Governorate": ["Fayoum", "Faiyum", "Fayum"], "EGY|Asyut Governorate": ["Assiut", "Asyut"], "EGY|Minya Governorate": ["Minia", "Minya"],
    "UZB|Samarqand Region": ["Samarkand", "Samarqand"], "UZB|Fergana Region": ["Fergana", "Ferghana"], "IRQ|Ninawa": ["Nineveh", "Ninawa", "Mosul"],
    "IRQ|Babil": ["Babylon", "Babil"], "YEM|Hadhramaut": ["Hadramout", "Hadhramaut", "Hadramawt"], "YEM|Ta'izz Governorate": ["Taiz", "Taizz"],
    "SYR|Rural Damascus": ["Rural Damascus", "Rif Dimashq"], "PHL|ARMM": ["Bangsamoro", "Autonomous Region in Muslim Mindanao"],
    "PHL|Soccsksargen": ["SOCCSKSARGEN", "Central Mindanao"], "PHL|Bicol Region": ["Bicol"], "PHL|Ilocos Region": ["Ilocos"],
    "ETH|SNNPR": ["SNNPR", "Southern Nations, Nationalities"], "CHL|Región Metropolitana de Santiago": ["Santiago"],
    "COD|Central Kasai": ["Kasai Central", "Kasaï-Central", "Central Kasai"], "COD|Upper Uele": ["Haut-Uele", "Haut-Uélé"],
    "TJK|Sughd Region": ["Sughd", "Sogd"], "KOR|South Gyeongsang": ["Gyeongsangnam", "South Gyeongsang", "Gyeongnam"],
}


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def phrases(names):
    out = []
    for n in names:
        for v in (n, fold(n)):
            v = v.replace('"', " ").strip()
            if v and v not in out:
                out.append(v)
    return out


def place_country(iso, name):
    names = phrases(ALIASES.get(iso, [name]))
    q = "(" + " OR ".join(f'TITLE_ABS:"{n}"' for n in names) + ")"
    if iso in NOT:
        q += " NOT (" + " OR ".join(f'TITLE_ABS:"{n}"' for n in NOT[iso]) + ")"
    return q


def core(name):
    c = ADMIN.sub(" ", name)
    c = re.sub(r"[\(\)\[\],/]", " ", c)
    return re.sub(r"\s+", " ", c).strip(" -'")


def place_province(iso, cname, name):
    """Query fragment, or None when the name cannot be searched honestly."""
    if "?" in name or "Ã" in name or re.search(r"\d", name) or iso in SKIP_ISO:
        return None
    if iso + "|" + name in EXONYMS:
        alts = EXONYMS[iso + "|" + name]
    else:
        alts = []
        m = re.match(r"^(.*?)\s*\((.*?)\)\s*(.*)$", name)      # "Sakha (Yakutia) Republic" -> "Sakha", "Yakutia"
        parts = [m.group(1) + " " + m.group(3), m.group(2)] if m else name.split("/")   # "Tahoua/Agadez" -> both
        for part in parts:
            c = core(part)
            toks = [t for t in re.split(r"[\s\-']+", fold(c).lower()) if t]
            if toks and not all(t in GENERIC for t in toks) and len(fold(c).replace(" ", "")) >= 4:
                alts.append(c)
        if not alts:
            return None
        if len(parts) == 1 and core(name) != name:
            alts.append(name)
    if any(fold(x).lower() == fold(cname).lower() for x in alts):     # a province named like its country would count the whole country
        return None
    q = "(" + " OR ".join(f'TITLE_ABS:"{n}"' for n in phrases(alts)) + ")"
    return q + " AND (" + " OR ".join(f'"{n}"' for n in phrases(ALIASES.get(iso, [cname]))) + ")"


cache_path = os.path.join(HERE, "data", "research_cache.json")
cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
lock = threading.Lock()


def hits(q):
    if q in cache:
        return cache[q]
    url = API + "?" + urllib.parse.urlencode({"query": q, "format": "json", "pageSize": 1, "resultType": "idlist"})
    for k in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "research-coverage-script/1.0"}), timeout=60) as r:
                n = json.load(r)["hitCount"]
            with lock:
                cache[q] = n
            return n
        except Exception as e:  # noqa: BLE001
            time.sleep(3 * (k + 1))
    return None


def main():
    atlas = json.load(open(os.path.join(HERE, "site", "atlas.json")))
    names = json.load(open(os.path.join(HERE, "data", "countries.json")))
    jobs = []
    for iso in sorted({u["c"] for u in atlas["units"]}):
        if iso not in SKIP_ISO:
            jobs.append(("country", iso, iso, names.get(iso, iso), place_country(iso, names.get(iso, iso))))
    for u in atlas["units"]:
        jobs.append(("province", u["id"], u["c"], u["n"], place_province(u["c"], names.get(u["c"], u["c"]), u["n"])))
    print(len(jobs), "places;", sum(j[4] is None for j in jobs), "not searchable", flush=True)
    done = [0]
    def run(j):
        level, pid, iso, name, q = j
        row = {"level": level, "id": pid, "iso": iso, "name": name, "searchable": int(q is not None), "n_women": "", "n_women_climate": ""}
        if q:
            row["n_women"] = hits(f"{q} AND {W} AND {YEARS}")
            row["n_women_climate"] = hits(f"{q} AND {W} AND {C} AND {YEARS}")
        with lock:
            done[0] += 1
            if done[0] % 300 == 0:
                json.dump(cache, open(cache_path, "w"))
                print(done[0], "/", len(jobs), flush=True)
        return row
    with ThreadPoolExecutor(5) as ex:
        rows = list(ex.map(run, jobs))
    json.dump(cache, open(cache_path, "w"))
    with open(os.path.join(HERE, "data", "research.csv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    bad = sum(1 for r in rows if r["searchable"] and (r["n_women"] is None or r["n_women_climate"] is None))
    print("DONE", len(rows), "rows;", bad, "failed lookups", flush=True)


if __name__ == "__main__":
    main()
