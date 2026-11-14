"""Fill the official Apart template with the text in report.md and write report/confident_where_nobody_looked.docx.

Usage: python3 report/build_report.py ["Author Name" "Affiliation"]
report.md uses a small markup:
  TITLE: ...            first line
  ABSTRACT: ...         one paragraph
  ## Heading            template "Heading 2"          ### Heading   template "Heading 3"
  - item                bullet                         1. item       numbered item (typed number)
  ![caption](file.png)  figure from results/ with the caption underneath
  [[table: file.csv | caption | col=Header,col=Header | digits]]   a table from results/ (rows as in the CSV)
  ---pagebreak---
  anything else         a paragraph; **bold** and *italic* work inline
The author line is passed on the command line so that no personal detail sits in the repository text.
"""
import copy, csv, os, re, sys
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml.ns import qn
from docx.shared import Inches, Pt
HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, "..", "results")
FONT = "Old Standard TT"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
author = sys.argv[1] if len(sys.argv) > 1 else "[Author name]"
affil = sys.argv[2] if len(sys.argv) > 2 else "[Affiliation]"

doc = Document(os.path.join(HERE, "apart_template_original.docx"))
body = doc.element.body
lines = open(os.path.join(HERE, "report.md"), encoding="utf-8").read().split("\n")
title = lines[0].replace("TITLE:", "").strip()
abstract = next(l for l in lines if l.startswith("ABSTRACT:")).replace("ABSTRACT:", "").strip()
content = lines[lines.index(next(l for l in lines if l.startswith("ABSTRACT:"))) + 1:]


def runs(par, text, size=None, italic=False, bold=False):
    """Add text with **bold** and *italic* spans to a paragraph."""
    for part in re.split(r"(\*\*[^*]+\*\*|\*[^*]+\*)", text):
        if not part:
            continue
        b, i = part.startswith("**"), part.startswith("*") and not part.startswith("**")
        r = par.add_run(part.strip("*") if (b or i) else part)
        r.font.name = FONT; r._r.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), FONT)
        r.bold = True if (b or bold) else None; r.italic = True if (i or italic) else None
        if size:
            r.font.size = Pt(size)
    return par


# ---- header box: title, author, abstract
head = doc.tables[0]
for t in head._tbl.iter(W + "t"):
    if t.text == "PROJECT TITLE":
        t.text = title
inner = next(head._tbl.iter(W + "tbl"), None) if False else [x for x in head._tbl.iter(W + "tbl") if x is not head._tbl]
if inner:                                            # the row of author cells: keep one, centred
    tbl = inner[0]; cells = list(tbl.iter(W + "tc"))
    for extra in cells[1:]:
        extra.getparent().remove(extra)
    ts = list(cells[0].iter(W + "t")); ts[0].text = author; ts[1].text = affil
    for g in tbl.iter(W + "gridCol"):
        g.set(W + "w", "5200")
    for wd in tbl.iter(W + "tblW"):
        wd.set(W + "w", "5200")
    for chg in list(tbl.iter(W + "tblGridChange")):
        chg.getparent().remove(chg)
    grid = next(tbl.iter(W + "tblGrid"))
    for g in list(grid)[1:]:
        grid.remove(g)
from docx.text.paragraph import Paragraph
done = False
for pel in list(body.iter(W + "p")):                 # the abstract goes where the template's guidance sentence sits
    if "Summarize your project" in "".join(t.text or "" for t in pel.iter(W + "t")):
        for r in list(pel.iter(W + "r")) + list(pel.iter(W + "hyperlink")):
            if r.getparent() is not None:
                r.getparent().remove(r)
        runs(Paragraph(pel, None), abstract); done = True
assert done, "abstract slot not found in the template"

# ---- drop the guidance box and all guidance text, keeping the final section properties
h2 = copy.deepcopy(next(x for x in doc.paragraphs if x.style.name == "Heading 2")._p)
keep = {head._tbl, body[-1]}
for el in list(body):
    if el not in keep:
        body.remove(el)


def para(style="normal"):
    p = doc.add_paragraph(style=style)
    return p


def table(spec):
    fn, caption, cols, digits = [s.strip() for s in spec.split("|")]
    cols = [c.split("=") for c in cols.split(",")]
    rows = list(csv.DictReader(open(os.path.join(RES, fn), encoding="utf-8")))
    cap = para(); runs(cap, caption, size=9.5); cap.paragraph_format.space_after = Pt(3); cap.paragraph_format.keep_with_next = True
    t = doc.add_table(rows=1, cols=len(cols)); t.style = "Table Grid" if "Table Grid" in [s.name for s in doc.styles] else t.style
    t.alignment = 1
    for c, (k, h) in zip(t.rows[0].cells, cols):
        c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER; runs(c.paragraphs[0], h.strip(), size=9, bold=True)
    for r in rows:
        cells = t.add_row().cells
        for j, (c, (k, h)) in enumerate(zip(cells, cols)):
            v = r[k.strip()]
            try:
                if re.fullmatch(r"-?\d+\.\d+", v):
                    v = f"{float(v):,.0f}" if float(v) == int(float(v)) and abs(float(v)) >= 20 else f"{float(v):.{int(digits)}f}"
            except ValueError:
                pass
            c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.LEFT if j == 0 else WD_ALIGN_PARAGRAPH.CENTER
            runs(c.paragraphs[0], v, size=9)
    for row in t.rows:
        for c in row.cells:
            c.paragraphs[0].paragraph_format.space_after = Pt(0)
    para().paragraph_format.space_after = Pt(2)


num = 0
for line in content:
    s = line.rstrip()
    if not s.strip():
        continue
    if s.startswith("### "):
        runs(para("Heading 3"), s[4:])
    elif s.startswith("## "):
        runs(para("Heading 2"), s[3:])
    elif s.startswith("---pagebreak---"):
        para().add_run().add_break(WD_BREAK.PAGE)
    elif s.startswith("!["):
        m = re.match(r"!\[(.*)\]\((.*?)(?:\s*\|\s*([\d.]+))?\)", s)
        p = para(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.keep_with_next = True
        p.add_run().add_picture(os.path.join(RES, m.group(2)), width=Inches(float(m.group(3) or 6.5)))
        c = para(); runs(c, m.group(1), size=9.5); c.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    elif s.startswith("[[table:"):
        table(s[8:-2])
    elif s.startswith("- "):
        p = para(); p.paragraph_format.left_indent = Inches(0.3); p.paragraph_format.first_line_indent = Inches(-0.18)
        p.paragraph_format.space_after = Pt(3); runs(p, "•  " + s[2:]); p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    elif re.match(r"\d+\. ", s) and not s.startswith(("1. Intro", "2. Rel", "3. Meth", "4. Res", "5. Disc", "6. Conc")):
        p = para(); p.paragraph_format.left_indent = Inches(0.3); p.paragraph_format.first_line_indent = Inches(-0.22)
        p.paragraph_format.space_after = Pt(3); runs(p, s); p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    elif s.startswith("REF: "):
        p = para(); p.paragraph_format.left_indent = Inches(0.3); p.paragraph_format.first_line_indent = Inches(-0.3)
        p.paragraph_format.space_after = Pt(4); runs(p, s[5:], size=10)
    else:
        p = para(); runs(p, s); p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY; p.paragraph_format.space_after = Pt(7)

# python-docx appends after the section properties' predecessor; make sure sectPr stays last
sect = [e for e in body if e.tag == W + "sectPr"][0]
body.remove(sect); body.append(sect)
out = os.path.join(HERE, "confident_where_nobody_looked.docx")
doc.save(out)
print("wrote", out)
