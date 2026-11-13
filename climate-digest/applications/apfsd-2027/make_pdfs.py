"""Render each abstract_*.md to a one-page A4 PDF (needs Node + Playwright's Chromium)."""
import glob, html, json, os, re, subprocess
NAMES = {"abstract_1_evidence_review": "APFSD2027_Abstract1_EvidenceReview_Akber.pdf",
         "abstract_2_mountain_winters": "APFSD2027_Abstract2_MountainWinters_Akber.pdf",
         "abstract_3_flood_villages": "APFSD2027_Abstract3_FloodVillages_Akber.pdf"}
FOOT = {"abstract_1_evidence_review": "SDGs: 5, 3, 13, 10. Evidence table (55 coded items) available on request.",
        "abstract_2_mountain_winters": "SDGs: 5, 3, 13, 10. Data: WorldPop, NASA MODIS, geoBoundaries, via Google Earth Engine. Code and dashboard available on request.",
        "abstract_3_flood_villages": "SDGs: 5, 3, 10. Data: IOM Displacement Tracking Matrix, Community Needs Identification (Flood Response) Rounds 6 and 7, via the Humanitarian Data Exchange."}
jobs = []
for f in sorted(glob.glob("abstract_*.md")):
    key = f[:-3]
    out = []
    for ln in open(f).read().strip().split("\n"):
        if ln.startswith("# "):
            out.append(f"<h1>{html.escape(ln[2:])}</h1>")
        elif ln.startswith("## "):
            out.append(f"<h2>{html.escape(ln[3:])}</h2>")
        elif ln.strip():
            out.append("<p>" + re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html.escape(ln)) + "</p>")
    doc = f"""<!doctype html><html><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 22mm 20mm; }}
body {{ font-family: 'DejaVu Serif', Georgia, serif; font-size: 11pt; line-height: 1.45; color: #111; }}
h1 {{ font-size: 14.5pt; line-height: 1.3; margin: 0 0 10pt; }} h2 {{ font-size: 12pt; margin: 14pt 0 4pt; }}
p {{ margin: 0 0 6pt; text-align: justify; }} .foot {{ margin-top: 14pt; font-size: 9pt; color: #444; text-align: left; }}
</style></head><body>{''.join(out)}<p class="foot">{html.escape(FOOT[key])}</p></body></html>"""
    open(key + ".html", "w").write(doc)
    jobs.append((os.path.abspath(key + ".html"), NAMES[key]))
js = "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();for(const [h,o] of " + json.dumps(jobs) + "){await p.goto('file://'+h);await p.pdf({path:o,format:'A4',printBackground:true});}await b.close();})()"
subprocess.run(["node", "-e", js], check=True)
for h, _ in jobs:
    os.remove(h)
