"""Write a one-page brief for one district from the atlas data.

Usage: python3 dossier.py PAK Jacobabad        -> dossier/PAK-Jacobabad.html
Needs the built page data (site/atlas.json, site/d/<ISO3>.json) and the outlines in data/shapes, data/shapes2.
"""
import html, json, os, sys
from shapely.geometry import shape
HERE = os.path.dirname(os.path.abspath(__file__))
ISO, NAME = sys.argv[1], " ".join(sys.argv[2:])
atlas = json.load(open(os.path.join(HERE, "site", "atlas.json")))
meta = atlas["meta"]
country = meta["names"][ISO]
dist = json.load(open(os.path.join(HERE, "site", "d", ISO + ".json")))["units"]
u = next(x for x in dist if x["n"].lower() == NAME.lower())
provs = [x for x in atlas["units"] if x["c"] == ISO]

# the province that holds the district (by outline)
geoms = {f["properties"]["id"]: shape(f["geometry"]).buffer(0) for f in json.load(open(os.path.join(HERE, "data", "shapes2", ISO + ".json")))["features"]}
pgeo = {}
for fn in os.listdir(os.path.join(HERE, "data", "shapes")):
    for f in json.load(open(os.path.join(HERE, "data", "shapes", fn)))["features"]:
        if any(p["id"] == f["properties"]["id"] for p in provs):
            pgeo[f["properties"]["id"]] = shape(f["geometry"]).buffer(0)
pt = geoms[u["id"]].representative_point() if u["id"] in geoms else None
prov = next((p for p in provs if pt is not None and p["id"] in pgeo and pgeo[p["id"]].contains(pt)), None)

LAYERS = [  # field, name, what it counts, read-with-care note
    ("p_hot90", "Extreme heat", "90 or more days a year at 35 °C or hotter", None),
    ("p_cold30", "Freezing nights", "30 or more freezing nights a year", None),
    ("p_flood", "Flooded land, 2000–2018", "on land satellites saw under water for three days or more", "The record ends in 2018 and misses floods under cloud."),
    ("p_flood22", "Flood of 2022", "on land radar saw under water, August–September 2022", "Where water stood, not everyone the flood affected."),
    ("p_drought", "Failed rains", "in rain-fed farming areas where the rains failed in 2+ of the last 10 years", None),
    ("p_far2h", "Far from care on foot", "two hours' walk or more from a health facility", "The source map of health facilities has gaps, so this can be overstated. Check against the district health office's facility list before quoting it."),
    ("p_motor1h", "Far from care by vehicle", "an hour or more from a health facility by motor vehicle", "Same facility map as above."),
    ("p_dark", "Dark at night", "in settled places where satellites see almost no light", "Measures light, not grid connections."),
    ("p_conf25", "Near heavy fighting", "within 50 km of a place where organised violence killed 25+ people, 2021–2025", None),
    ("p_far2h_exposed", "Exposed and far", "two hours' walk from care, with freezing nights, heat or flooding", "Inherits the gaps in the facility map."),
]
pool = [x for x in dist if x["fem"] >= 5000]
fem_c = sum(x["fem"] for x in dist)
esc = html.escape
pct = lambda v: "—" if v is None else (f"{v:.1f}%" if 0 < v < 10 else f"{v:.0f}%")
big = lambda v: f"{v / 1e6:.1f} million" if v >= 1e6 else f"{round(v, -3):,.0f}" if v >= 1e4 else f"{round(v, -2):,.0f}"
ordinal = lambda n: f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"

rows, standout, cares = [], [], []
for key, name, what, care in LAYERS:
    v = u.get(key)
    if v is None:
        continue
    have = [x for x in pool if x.get(key) is not None]
    rank = 1 + sum(1 for x in have if x[key] > v)
    tied = sum(1 for x in have if x[key] == v) > 1
    nat = 100 * sum(x[key] * x["fem"] / 100 for x in dist if x.get(key) is not None) / fem_c
    rows.append((name, what, v, u["fem"] * v / 100, ("joint " if tied else "") + ordinal(rank), len(have), nat))
    if v >= 10 and rank <= max(3, len(have) // 5):
        standout.append((rank, name, v, ("joint " if tied else "") + ordinal(rank)))
        if care:
            cares.append((name, care))
standout.sort()

tr = "".join(f"""<tr><th scope="row">{esc(n)}<span class="what">{esc(w)}</span></th>
<td class="num">{pct(v)}<span class="bar"><i style="width:{min(100, v):.1f}%"></i><b style="left:{min(100, nat):.1f}%" title="{esc(country)}: {pct(nat)}"></b></span></td>
<td class="num">{big(c) if v > 0 else "0"}</td><td class="num">{pct(nat)}</td>
<td class="num">{"—" if v == 0 else f"{rk} of {tot}"}</td></tr>""" for n, w, v, c, rk, tot, nat in rows)

lead = (f"Of {country}'s {len(pool)} districts, {esc(u['n'])} ranks " +
        "; ".join(f"{o} for {n.lower()} ({pct(v)})" for r, n, v, o in standout[:4]) + ".") if standout else \
    f"{esc(u['n'])} does not rank near the top of {country}'s {len(pool)} districts on any layer."

DH = [("cm", "Women 20–24 married before 18"), ("hb", "Births at home"), ("an", "Women with anaemia"), ("pv", "Women reporting violence by a partner in the past year"), ("mh", "Clean materials and privacy during periods")]
a = (meta["asked"]["countries"] or {}).get(ISO, {})
survey = ""
if prov and prov.get("dh"):
    label = sorted({v[1] for v in prov["dh"].values()})[-1]
    survey = f"""<section><h2>What surveys found in {esc(prov['n'])}</h2>
<p class="note">The latest survey that reports by province (DHS {esc(label)}). There is no survey figure for the district itself.</p>
<dl>{"".join(f"<dt>{esc(n)}</dt><dd>{pct(prov['dh'][k][0])}</dd>" for k, n in DH if k in prov["dh"])}</dl></section>"""
gaps = a.get("gaps")
asked = f"""<section><h2>How much research and surveying reaches here</h2><dl>
<dt>Studies on women and girls naming {esc(prov['n']) if prov else esc(country)}</dt><dd>{prov.get('rw', '—') if prov else '—'}</dd>
<dt>Of those, also on a climate hazard</dt><dd>{prov.get('rc', '—') if prov else '—'}</dd>
<dt>Menstruation last asked nationally</dt><dd>{a['me'][0] if a.get('me') else 'no figure'}</dd>
<dt>Partner violence</dt><dd>{'WHO estimate ' + pct(a['pv']) if a.get('pv') is not None else 'no survey since 2000'}</dd>
</dl><p class="note">Research counts are for the province, from one health and life-science index (Europe PMC, 2010–2026), by name matching. No study or survey count exists for the district.</p></section>"""
care_html = "".join(f"<li><b>{esc(n)}.</b> {esc(c)}</li>" for n, c in cares)

page = f"""<title>{esc(u['n'])} District Brief</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  /* Layout: a single-column brief. Name and people first, one sentence of findings, the table of layers, then what
     surveys say and what nobody has measured. Same tokens as the Atlas of the Uncounted map. */
  :root {{
    --bg: #eef1ef; --panel: #fbfcfb; --ink: #17212a; --muted: #586671; --line: #cdd5d4; --accent: #0e5a68; --bar: #0e5a68; --track: #dfe5e4; --mark: #17212a;
    --display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif; --body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
  }}
  @media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
    --bg: #12181d; --panel: #1a2228; --ink: #e8eef0; --muted: #9aa9b1; --line: #33414a; --accent: #6fc3d1; --bar: #6fc3d1; --track: #2a343b; --mark: #e8eef0; color-scheme: dark; }} }}
  :root[data-theme="dark"] {{
    --bg: #12181d; --panel: #1a2228; --ink: #e8eef0; --muted: #9aa9b1; --line: #33414a; --accent: #6fc3d1; --bar: #6fc3d1; --track: #2a343b; --mark: #e8eef0; color-scheme: dark; }}
  body {{ background: var(--bg); color: var(--ink); font-family: var(--body); font-size: 15px; line-height: 1.5; }}
  .wrap {{ max-width: 860px; margin: 0 auto; padding-block: 28px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 22px; }}
  .eyebrow {{ font-family: var(--mono); font-size: 0.74rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0; }}
  h1 {{ font-family: var(--display); font-weight: 700; font-size: clamp(1.9rem, 5vw, 2.8rem); line-height: 1.05; margin: 0; }}
  h2 {{ font-family: var(--display); font-weight: 500; font-size: 1.15rem; margin: 0; text-wrap: balance; }}
  p {{ margin: 0; max-width: 68ch; }}
  header {{ display: grid; gap: 8px; }}
  .people {{ font-family: var(--mono); font-variant-numeric: tabular-nums; }}
  .lead {{ font-size: 1.1rem; }}
  section {{ background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 16px; display: grid; gap: 12px; min-width: 0; }}
  .scroll {{ overflow-x: auto; }}
  table {{ border-collapse: collapse; width: 100%; min-width: 560px; font-size: 0.92rem; }}
  th, td {{ text-align: left; padding: 9px 10px 9px 0; border-top: 1px solid var(--line); vertical-align: top; }}
  thead th {{ border-top: 0; font-family: var(--mono); font-size: 0.72rem; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }}
  tbody th {{ font-weight: 600; }}
  .what {{ display: block; font-weight: 400; color: var(--muted); font-size: 0.84rem; }}
  .num {{ font-family: var(--mono); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }}
  thead .num {{ text-align: right; }}
  .bar {{ display: block; position: relative; height: 6px; background: var(--track); border-radius: 3px; margin-top: 6px; min-width: 90px; }}
  .bar i {{ display: block; height: 100%; background: var(--bar); border-radius: 3px; }}
  .bar b {{ position: absolute; top: -3px; width: 2px; height: 12px; background: var(--mark); }}
  dl {{ margin: 0; display: grid; grid-template-columns: minmax(50%, 1fr) auto; gap: 6px 14px; font-size: 0.92rem; }}
  dt {{ color: var(--muted); }} dd {{ margin: 0; font-family: var(--mono); font-variant-numeric: tabular-nums; text-align: right; }}
  .note, li {{ color: var(--muted); font-size: 0.88rem; }}
  ul {{ margin: 0; padding-left: 1.2em; display: grid; gap: 6px; max-width: 72ch; }}
  li b {{ color: var(--ink); font-weight: 600; }}
  .key {{ display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.82rem; color: var(--muted); }}
  .key span {{ display: inline-flex; align-items: center; gap: 6px; }}
  .key i {{ width: 22px; height: 6px; background: var(--bar); border-radius: 3px; }} .key b {{ width: 2px; height: 12px; background: var(--mark); }}
</style>
<div class="wrap">
  <header>
    <p class="eyebrow">District brief · Atlas of the Uncounted · draft</p>
    <h1>{esc(u['n'])}</h1>
    <p>{esc(prov['n']) + ', ' if prov else ''}{esc(country)}</p>
    <p class="people">{u['women']:,} women aged 15–49 · {u['girls']:,} girls aged 10–14</p>
  </header>
  <p class="lead">{lead} About {u['hot']:.0f} days a year reach 35 °C or more{f", and radar saw {u['a_flood22']:.0f}% of the district's land under water in 2022" if u.get('a_flood22') else ""}.</p>
  <section>
    <h2>Where women and girls here stand, layer by layer</h2>
    <div class="key"><span><i></i>share in {esc(u['n'])}</span><span><b></b>share across {esc(country)}</span></div>
    <div class="scroll"><table>
      <thead><tr><th scope="col">Layer</th><th scope="col" class="num">Share here</th><th scope="col" class="num">Women and girls</th><th scope="col" class="num">{esc(country)}</th><th scope="col" class="num">Rank, worst first</th></tr></thead>
      <tbody>{tr}</tbody>
    </table></div>
    <p class="note">Shares are of women and girls aged 10–49 living in the district. Rank is among {len(pool)} districts of {esc(country)} with 5,000 or more. These are estimates of exposure from satellite and population data, not counts of people harmed.</p>
  </section>
  {survey}
  {asked}
  <section>
    <h2>Read with care</h2>
    <ul>{care_html}<li><b>People.</b> Population is LandScan 2024; the split by age and sex is from the 2010 census round.</li>
    <li><b>Boundaries.</b> geoBoundaries v6.0.0, which may not match the district's current official outline.</li></ul>
    <p class="note">Sources: LandScan, GPWv4, MODIS, ERA5-Land, Global Flood Database, Sentinel-1, CHIRPS, Malaria Atlas Project, VIIRS, UCDP, DHS, UNICEF, WHO, Europe PMC. Built {meta['built']}.</p>
  </section>
</div>
"""
out = os.path.join(HERE, "dossier")
os.makedirs(out, exist_ok=True)
path = os.path.join(out, f"{ISO}-{u['n'].replace(' ', '-')}.html")
open(path, "w", encoding="utf-8").write(page)
print(path, "| province:", prov["n"] if prov else None, "|", lead)
