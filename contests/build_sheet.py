# Builds contests/Opportunities_Tracker.xlsx from the 29 Oct list, the 2 Nov deep research and the 2 Nov fresh scan.
import datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule

TODAY = dt.date(2026, 11, 2)
def d(s):
    if not s: return None
    m, day = s.split()
    mon = {"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,"Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}[m]
    return dt.date(2026 if mon >= 10 else 2027, mon, int(day))

NJ, MD, FAM, FIB, CR = "Nobody's Job", "Motion Detected: 2100", "The Famine That Never Came", "The Future Is Buildable", "Co-Regulation"
# (deadline, contest, type, top prize, fee, free?, verified, pakistan, ai_rule, notes, list, fits, link)
R = []
def add(*a): R.append(a)
V, L, U = "✓ Organiser page", "~ Listing site only", "? Not verified"
# ---------- 29 Oct list ----------
add("Oct 31","International Landscape Photographer of the Year","Photo","$12,500 pool","$25/image","No",V,"Yes","No AI (photo)","Landscapes taken after 2021","29 Oct","","")
add("Oct 31","Insta360 Awards","Video","Cash + gear","Free","Yes",V,"Yes","—","Must be shot on Insta360","29 Oct","","")
add("Oct 31","Blender \"Speed\" challenge","3D / animation","~$5k value","Free","Yes",V,"Yes","—","","29 Oct","","")
add("Oct 31","True Story Award","Journalism","$20,000 × 3","Free","Yes",V,"Yes","—","Published reportage only","29 Oct","","")
add("Oct 31","PixLight (PixVerse)","AI film 3–20 min","$300k pool","Free","Yes",L,"Yes","Mainly PixVerse","","29 Oct","","")
add("Oct 31","Reedsy monthly contest","Short story","$1,500","~$5","No",V,"Yes","—","Weekly $250 too","29 Oct","","")
add("Oct 31","Anthology cover art","Illustration","€500","€18","No",L,"Yes","No AI","","29 Oct","","")
add("Oct 31","Joseph Binder Award (Design Fiction)","Design","€6k shared","€105","No",L,"Yes","AI allowed if disclosed","","29 Oct","","")
add("Nov 1","Existential Hope Meme Prize","Meme / video","$10,000","Free","Yes",V,"Yes","AI allowed","ENTERED","29 Oct",f"{NJ}, {MD}, {FAM}, {FIB}","")
add("Nov 1","Environmental Photography Award (Monaco)","Photo","€6,000","Free","Yes",V,"Yes","No AI (photo)","","29 Oct","","")
add("Nov 1","InScience festival","Science film","Festival awards","Check","?",V,"Yes","Check","","29 Oct","","")
add("Nov 2","Picsart × Kling","AI video","5 × $10,000","Free","Yes",V,"Yes","Kling","Last day","29 Oct",f"{NJ}, {MD}","")
add("Nov 3","Tampere Film Festival","Short film","€5,000","€20","No",V,"Yes","Check","Premiere rules","29 Oct",FAM,"")
add("Nov 10","AAP Magazine #62 \"Travels\"","Photo","$500 ($1k pool)","$35 / 3 images","No",V,"Yes","No AI (photo)","Every 1–2 months","29 Oct","","")
add("Nov 15","ITFS Stuttgart","Animation","€10,000","Free","Yes",V,"Yes","Check","","29 Oct","","")
add("Nov 15","Monochrome Awards","Photo (B&W)","$2,000","~$22","No",V,"Yes","No AI (photo)","","29 Oct","","")
add("Nov 15","WAIFF Cannes 2027 — €15 early fee ends","AI film","Non-cash (Cannes trip, screening)","€15 → €30 → €60","No",V,"Yes","AI film","Final deadline 15 Feb 2027; fee needs approval","2 Nov research",f"{NJ}, {MD}","https://worldaifilmfestival.com/cannes-2027/")
add("Nov 17","Hopper Prize","Any visual art","$4,500 × 2","$40","No",V,"Yes","Check","","29 Oct","","")
add("Nov 17","iJungle Illustration Awards","Illustration","€2,500","€25","No",L,"Yes","No AI","","29 Oct","","")
add("Nov 18","IAPB World Sight Day","Photo","$1,000 × 2","Free","Yes",V,"Yes","No AI (photo)","Eye-health theme","29 Oct","","")
add("Nov 20","1 Billion Followers AI Film Award","AI film 5–7 min","$1,000,000","Free","Yes",V,"Yes","≥70% sponsor tool","Our films are too short (need 5–7 min)","29 Oct","","")
add("Nov 22","Talents Contemporains","Art (water)","€15,000 × 4–7","Probably free","?",L,"Yes","Check","","29 Oct","","")
add("Nov 27","Montreal Smartphone Film Festival","Phone film","$500","$5","No",V,"Yes","Shot on phone","","29 Oct","","")
add("Nov 28","Cine Prague AI Film Festival","AI film","$1,000","Check","?",V,"Yes","AI film","","29 Oct",f"{NJ}, {MD}","")
add("Nov 30","AI ZONE","AI film","$500","Check","?",V,"Yes","AI film","","29 Oct",f"{NJ}, {MD}","")
add("Nov 30","Vital Impacts Fellowship","Photo project","$20k; $5k × 6","$25 (waived for developing countries)","Waived",V,"Yes","No AI (photo)","Environmental story","29 Oct","","")
add("Nov 30","Prix Roger Pic","Photo portfolio","€4,000","Free","Yes",V,"Yes","No AI (photo)","Application in French","29 Oct","","")
add("Nov 30","reEarth Art Prize","Art incl. AI","$1,000 × 4","$30","No",L,"Yes","AI allowed","Ages 4–25","29 Oct","","")
add("Dec 1","FilmFest Dresden","Short film","€7,500","Check","?",V,"Yes","Check","Premiere rules; films already online may be refused","29 Oct",FAM,"")
add("Dec 1","Chicago Latino Film Festival poster","Poster","$1,000","Free","Yes",V,"Yes","No AI","","29 Oct","","")
add("Dec 1","Fumetto comic contest","Comic (4 pages)","CHF 1,111","Free","Yes",L,"Yes","No AI","","29 Oct","","")
add("Dec 2","Artefact AI Film Festival","AI short ≤314 s","€10,000 + cinema run","Free","Yes",V,"Yes","AI film","Theme: (Dis)Connection","29 Oct",f"{MD} (best theme fit), {NJ}","")
add("Dec 2","Science in Shorts","Science film","€5,000 × 10","Free","Yes",V,"Researchers only","Check","RESEARCHERS ONLY — probably not eligible","29 Oct","","")
add("Dec 3","Wildlife Photographer of the Year","Photo","£15,000","£35 (free 18–26)","Age-based",V,"Yes","No AI (photo)","","29 Oct","","")
add("Dec 4","GCCA Concrete in Life","Photo (phone OK)","$10,000","Free","Yes",V,"Yes","No AI (photo)","Narrow theme","29 Oct","","")
add("Dec 6","Material Works Art Award","Art portfolio","$2,500","Check","?",L,"Yes","Check","","29 Oct","","")
add("Dec 13","Bird Photographer of the Year","Photo","£3,000","~£35","No",L,"Yes","No AI (photo)","","29 Oct","","")
add("Dec 13","Annual Photography Awards","Photo","$2,500","$30","No",V,"Yes","No AI (photo)","","29 Oct","","")
add("Dec 14","NEXTALE","AI film","$2,000","Check","?",V,"Yes","AI film","","29 Oct",f"{MD}, {NJ}","")
add("Dec 15","Flick AI Film Festival","AI film (many categories)","$10,000 Best Film; $2–5k others","Free","Yes",V,"Yes","AI must play a real role","Watermark + public post + English subs; winners 20 Jan","2 Nov research",f"{NJ}, {MD} ({FIB} backup)","https://flick.art/festival/rules")
add("Dec 15","Gossip Goblin × Showrunner","AI film","$15–20k pool","Free","Yes",V,"Yes","Must use Showrunner","","29 Oct","","")
add("Dec 18","Mobile Photography Awards","Phone photo","$3,000","From $15","No",V,"Yes","No AI (photo)","","29 Oct","","")
add("Dec 20","AKOOL AI Film Challenge","AI trailer / short","Up to $500k rewards (sources differ)","Free","Yes",V,"Yes","AKOOL account + logo","Ask about payout to Pakistan","29 Oct","","")
add("Dec 30","MetaMorph × TapNow","AI short","£500 + credits","Free","Yes",V,"Yes","≥50% TapNow","","29 Oct","","")
add("Dec 31","OPPO Photography Awards","Phone photo","$20,000","Free","Yes",V,"Pakistan named","OPPO/OnePlus/realme only","","29 Oct","","")
add("Dec 31","Illustrators of the Future","Sci-fi illustration","$500 × 3 / quarter + $5k","Free","Yes",V,"Yes","No AI","","29 Oct","","")
add("Dec 31","Writers of the Future","Sci-fi story","$1,000 / quarter + $5k","Free","Yes",V,"Yes","No AI","","29 Oct","","")
add("Dec 31","Animayo poster","Poster","€500","Free","Yes",L,"Yes","No AI","","29 Oct","","")
add("Jan 1","IA Play Madrid","AI film","€500","€6","No",V,"Yes","AI film","","29 Oct",f"{NJ}, {MD}","")
add("Jan 1","Global AI Music Video Awards","AI music video","$1,000 pool","$40","No",V,"Yes","AI","","29 Oct","","")
add("Jan 4","Post Wave illustration prize","Children's book illustration","£3,000","Free","Yes",L,"Yes","Check","","29 Oct","","")
add("Jan 5","Sony World Photography Awards (single image; series 12 Jan)","Photo","$5k single / $25k series","Free","Yes",V,"Yes","No AI (photo)","","29 Oct","","")
add("Jan 7","Chroma Awards Season 2","AI film, music video, ad","$450,000+","Free","Yes",V,"Pakistan named","AI","Strong: free and big","29 Oct",f"{NJ}, {MD}, {FIB}","")
add("Jan 11","Busan International Short Film Festival","Short film","KRW 10M (~$7k)","€11 until 8 Nov","No",V,"Yes","Check","Must not have screened in Korea","29 Oct",FAM,"")
add("Jan 11","Hollywood AI Short Film Awards","AI short","$750–2,750","$25–55","No",V,"Yes","AI","","29 Oct",f"{MD}, {NJ}","")
add("Jan 12","ANIMATOR","Animation","€11,000","Free","Yes",V,"Yes","Check","","29 Oct","","")
add("Jan 15","Short Shorts Film Festival & Asia","Short film","¥600k (~$4k)","Varies","?",V,"Pakistan named","Check","Must not have screened in Japan","29 Oct",FAM,"")
add("Jan 15","Super South poster","Poster","$2,500","$25","No",L,"Yes","Check","Theme: future of the South","29 Oct","","")
add("Jan 17","Flatpack","Short film","£1,000","Check","?",V,"Yes","Check","","29 Oct",FAM,"")
add("Jan 22","Whickers Funding Award","Doc feature pitch","£120,000","Free","Yes",V,"Yes","—","Opens 24 Nov","29 Oct","","")
add("Feb 3","iF Design Student Award","Design (SDG)","€50k pool","Free","Yes",L,"Yes","Check","Students / recent grads","29 Oct","","")
add("Feb 7","World Food Photography Awards","Photo","£5,000","£35","No",V,"Yes","No AI (photo)","","29 Oct","","")
add("Feb 10","IDFA Bertha Fund","Doc funding","Up to €25,000","Free","Yes",V,"Check list","—","","29 Oct","","")
add("Feb 14","Fine Art Photography Awards","Photo","$3,000","From $24","No",V,"Yes","No AI (photo)","","29 Oct","","")
add("Feb 15","WAIFF Cannes 2027 (final deadline)","AI film","Non-cash","€60 from 1 Feb","No",V,"Yes","AI film","Enter by 15 Nov for €15","2 Nov research",f"{NJ}, {MD}","https://worldaifilmfestival.com/cannes-2027/")
add("Feb 28","GIJN Global Shining Light","Investigative journalism","$2,500","Free","Yes",V,"Yes","—","Global South journalists","29 Oct","","")
add("Mar 1","Science Without Borders","Ocean art","$500","Free","Yes",V,"Yes","Check","Ages 11–19","29 Oct","","")
add("Apr 30","Jing-Shan Creative Art Awards","Design","~$4.7k","Check","?",L,"Yes","Check","","29 Oct","","")
add("May 1","ITU AI for Good Film Festival 2027 (opens 15 Jan)","AI film 1–10 min","Non-cash (Geneva pass, screening)","Free","Yes",V,"Yes","AI central","ONE entry per team; finalists 24 May","2 Nov research",f"{MD} (pick one)","https://aiforgood.itu.int/ai-for-good-film-festival/")
add("Jun 25","One Earth Young Filmmakers","Film","$1,000","Check","?",V,"Yes","Check","Age 25 or under","29 Oct",f"{MD} (if ≤25)","")
# ---------- 2 Nov fresh scan (not verified) ----------
add("Nov 22","Jingrui AI Creation Contest","AI creation","Check","Check","?",U,"Check","AI","Seen on a listing only","2 Nov fresh scan","","https://aifilmcontests.com/")
add("Dec 5","World AI Cinema & Creativity Festival (India)","AI film","Up to ₹25 lakh claimed","Check","?",U,"Check","AI","Deadline not confirmed on organiser page","2 Nov fresh scan",f"{NJ}, {MD}","https://gasptv.com/ai-film-festivals/")
add("Dec 5","SVAIFF Korea 2026","AI short / animation / doc","30M KRW total claimed","Check","?",U,"Check","AI","Listing only","2 Nov fresh scan",f"{NJ}, {MD}","https://gasptv.com/ai-film-festivals/")
add("Dec 6","Curious Refuge holiday contest","AI short","Check","Check","?",U,"Check","AI","Listing only; CR runs regular contests","2 Nov fresh scan","","https://aifilmcontests.com/contests/cash-prizes")
add("Dec 31","Berlin AI Film Festival (2nd)","AI film","Awards; cash unconfirmed","$10–40 (FilmFreeway)","No",U,"Check","AI / mixed AI","Festival 9–11 Feb 2027","2 Nov fresh scan",f"{NJ}, {MD}","https://aifilmcontests.com/topics/berlin-ai-film-festival-2026")
add("Dec 31","Busan International AI Film Festival","AI film","$1k screening grant per selected film; $3k audience award","Check","?",U,"Check","AI","Deadline may be a placeholder","2 Nov fresh scan",f"{NJ}, {MD}","https://gasptv.com/ai-film-festivals/")

WATCH = [
 ("CAIS AI-futures fiction competition","Fiction","Up to $25k total (considering)","Free","Interest sign-up only. Sign up now.","https://safe.ai/fiction"),
 ("WHO Health for All Film Festival (6th call)","Health short film","Awards","Free (past calls)",f"Past calls ~1 Nov → 31 Jan. Fits {FAM}, {CR}.","https://www.who.int/initiatives/health-for-all-film-festival"),
 ("Commonwealth Short Story Prize 2027","Short story","£5,000","Free","Reopens Jan 2027; AI likely banned","https://commonwealthfoundation.com/short-story-prize/"),
 ("pixiv × Clip Studio Global Comic Awards (8th)","Comic","Check","Free","Last ran 14 Jan–31 Mar 2026","https://www.celsys.com/en/topic/20260114"),
 ("Runway AIF 2027","AI film 3–15 min (+ design, ads, new media)","2026: $50k Grand Prix, $135k+ total","Free (2026)","Annual, summer screenings. Our current films are under 3 min, so too short.","https://aif.runwayml.com/"),
 ("Curious Refuge Feel-Good AI Film Competition 2027","AI film ≤3 min","2026: $10k cash ($5k/$3k/$2k)","Free (2026)","2026 closed 10 Mar; AI in every shot; Epidemic Sound music required","https://curiousrefuge.com/2026-ai-feel-good-film-competition"),
 ("World Press Photo 2027","Photo","€1k × 42 + €10k","Free","Opens 1 Dec",""),
 ("Istanbul Photo Awards 2027","Photo","$6k","Free","Expected mid-November",""),
 ("Berggruen Prize Essay Competition","Essay","$50,000","Free","2026 closed; next cycle not announced","https://berggruen.org/essay-competition-open"),
 ("Protopian Fiction Prize (Metagov)","Fiction","$5,000 per category (2026)","Free","2026 closed","https://metagov.org/projects/protopian"),
 ("Future Vision XPRIZE","Film","Large","Free","Closed 15 Aug 2026; no new round",""),
]
ROLLING = [
 ("Superteam Earn (content)","$125–5,000 per bounty (USDC)","Threads, videos, memes; Solana wallet; global listings open to Pakistan"),
 ("Freelancer.com contests","$30–300","Logo, illustration, motion; open to Pakistan"),
 ("DesignCrowd","$150–300","Many guaranteed"),
 ("Reedsy Prompts","$250/week","Short fiction"),
 ("The Independent Photographer","$3k/month","10 free entries via newsletter"),
 ("AAP Magazine","$1k every 1–2 months","Paid entry"),
 ("ViewBug","Mostly gear","~20 contests/month"),
 ("YouTube Shorts revenue share","45% of creator pool share","Pakistan eligible for YPP"),
 ("Civitai challenges","Credits + monthly cash pool","AI art"),
 ("Runway Gen:48","Cash + credits","Watch for next round"),
]
SITES = [("Contest Watchers","contestwatchers.com","Best single feed; Free filter"),("Graphic Competitions","graphiccompetitions.com","Weekly newsletter"),
 ("FilmFreeway","filmfreeway.com/festivals","Most film festivals"),("Opportunities Circle / Corners","—","Pakistan & South Asia, daily"),
 ("Opportunity Desk","opportunitydesk.org","NGO and UN media awards"),("aifilmcontests.com","aifilmcontests.com","AI film contests"),
 ("GaspTV AI festivals list","gasptv.com/ai-film-festivals","AI festival deadlines")]
FILMS = [
 (NJ,"1:50","AI; space debris","Flick; Chroma S2; Artefact; Cine Prague AI; AI ZONE; NEXTALE; IA Play; Hollywood AI; WAIFF (fee)","Fix YouTube title to NOBODY'S JOB"),
 (MD,"1:40","AI hyperreal; biodiversity","ITU AI for Good (our one entry); Flick; Artefact (theme fit); Chroma S2; NEXTALE; Hollywood AI; One Earth (if ≤25)",""),
 (FAM,"1:40","Public-domain archive + NASA; food security","WHO Health for All (when open); FilmFest Dresden; Flatpack; Short Shorts; Busan","Not AI-made: keep out of AI-only festivals unless AI was used. Check premiere rules (it is public on YouTube)."),
 (FIB,"1:54","Probably AI; slogan-led","Chroma S2 / Flick as backup only","Weakest concept; free entries only"),
 (CR,"1:58","AI re-cut; neurodivergence","WHO Health for All (when open); Flick","Not on the channel yet"),
]

wb = Workbook()
HEAD = PatternFill("solid", fgColor="1F3A5F"); HF = Font(bold=True, color="FFFFFF")
thin = Side(style="thin", color="D0D7E2"); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
def sheet(ws, headers, rows, widths):
    ws.append(headers)
    for c in ws[1]: c.fill, c.font, c.alignment = HEAD, HF, Alignment(wrap_text=True, vertical="center")
    for r in rows: ws.append(list(r))
    for row in ws.iter_rows(min_row=1, max_row=ws.max_row):
        for c in row:
            c.border = BOX
            if c.row > 1: c.alignment = Alignment(wrap_text=True, vertical="top")
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"; ws.auto_filter.ref = ws.dimensions

ws = wb.active; ws.title = "All opportunities"
rows = []
for (dl, name, typ, prize, fee, free, ver, pk, ai, notes, src, fits, link) in sorted(R, key=lambda r: d(r[0])):
    date = d(dl)
    status = "ENTERED" if "ENTERED" in notes else ("Closed" if date < TODAY else ("Last day" if date == TODAY else "Open"))
    rows.append((status, date, None, name, typ, prize, fee, free, ver, pk, ai, fits, notes, src, link, "", ""))
sheet(ws, ["Status","Deadline","Days left","Contest","Type","Top prize","Entry fee","Free?","Verified","Pakistan eligible","AI rule","Our best fit","Notes","Found in","Link","Decision","Owner"],
      rows, [10,12,9,38,20,26,18,8,18,14,20,34,40,16,34,12,12])
for r in range(2, ws.max_row + 1):
    ws.cell(r, 2).number_format = "DD MMM YYYY"
    ws.cell(r, 3).value = f'=IF(B{r}="","",B{r}-TODAY())'
    if ws.cell(r, 15).value: ws.cell(r, 15).hyperlink = ws.cell(r, 15).value; ws.cell(r, 15).font = Font(color="1155CC", underline="single")
dv = DataValidation(type="list", formula1='"Enter,Maybe,Skip,Entered"', allow_blank=True); ws.add_data_validation(dv); dv.add(f"P2:P{ws.max_row}")
rng = f"A2:Q{ws.max_row}"
ws.conditional_formatting.add(rng, FormulaRule(formula=['$A2="Closed"'], fill=PatternFill("solid", fgColor="EEEEEE"), font=Font(color="999999")))
ws.conditional_formatting.add(rng, FormulaRule(formula=['AND($A2="Open",$H2="Yes",$L2<>"")'], fill=PatternFill("solid", fgColor="E3F4E1")))
ws.conditional_formatting.add(rng, FormulaRule(formula=['LEFT($I2,1)="?"'], fill=PatternFill("solid", fgColor="FFF4D6")))

ws2 = wb.create_sheet("Our films → contests")
sheet(ws2, ["Film","Length","What it is","Where it fits (in priority order)","Check first"], FILMS, [28,8,30,70,50])
ws3 = wb.create_sheet("Watch (not open yet)")
sheet(ws3, ["Contest","Type","Prize","Fee","Status / note","Link"], WATCH, [42,26,32,14,55,48])
for r in range(2, ws3.max_row + 1):
    if ws3.cell(r, 6).value: ws3.cell(r, 6).hyperlink = ws3.cell(r, 6).value; ws3.cell(r, 6).font = Font(color="1155CC", underline="single")
ws4 = wb.create_sheet("Rolling platforms"); sheet(ws4, ["Platform","Pay","Notes"], ROLLING, [32,30,60])
ws5 = wb.create_sheet("Listing sites"); sheet(ws5, ["Site","Address","Use"], SITES, [30,34,40])
ws6 = wb.create_sheet("Key")
for line in ["Green row: open, free, and one of our films fits.","Yellow row: lead from a listing site, not yet checked on the organiser's page.",
             "Grey row: deadline passed.","Days left updates automatically from today's date.","Fees, payouts to Pakistan, premiere rules and AI rules must be checked before entering.",
             f"Built {TODAY:%d %b %Y} from contests/open_contests_2026-10-29.md, contests/new_opportunities_2026-11-02.md and a fresh scan on 2 Nov."]:
    ws6.append([line])
ws6.column_dimensions["A"].width = 110
wb.save("/home/user/hasnainakber9/contests/Opportunities_Tracker.xlsx")
print("rows", len(rows), "open", sum(1 for r in rows if r[0] in ("Open","Last day")))
